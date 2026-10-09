import http from 'node:http'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { assertPublicHost } from './ssrf.mjs'

const PORT = Number(process.env.SCAN_PORT ?? 3001)
const HOST = process.env.SCAN_HOST ?? '127.0.0.1'
// Local development only: allow scanning localhost / private networks
const ALLOW_PRIVATE = process.env.SCAN_ALLOW_PRIVATE === '1'
// Only needed when the app and this service are on different origins
const ALLOWED_ORIGIN = process.env.SCAN_ALLOWED_ORIGIN
const MAX_CONCURRENT = Number(process.env.SCAN_MAX_CONCURRENT ?? 2)
const NAV_TIMEOUT_MS = 30_000
const MAX_BODY_BYTES = 4096

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

let browserPromise = null
let running = 0

function getBrowser() {
  browserPromise ??= chromium.launch()
  return browserPromise
}

class ScanError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

async function scanUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new ScanError('URL invalide.', 400)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ScanError('Seules les URLs http(s) sont acceptées.', 400)
  }
  try {
    await assertPublicHost(parsed.hostname, { allowPrivate: ALLOW_PRIVATE })
  } catch (error) {
    throw new ScanError(error.message, 400)
  }

  const browser = await getBrowser()
  const context = await browser.newContext({ serviceWorkers: 'block' })
  try {
    const page = await context.newPage()

    // Check every request (redirects and subresources included) against the same rule
    await page.route('**/*', async (route) => {
      try {
        const { protocol, hostname } = new URL(route.request().url())
        if (protocol === 'http:' || protocol === 'https:') {
          await assertPublicHost(hostname, { allowPrivate: ALLOW_PRIVATE })
        } else if (!['data:', 'blob:', 'about:'].includes(protocol)) {
          throw new Error('Protocole non autorisé.')
        }
        await route.continue()
      } catch {
        await route.abort('blockedbyclient')
      }
    })

    let response
    try {
      response = await page.goto(parsed.toString(), { waitUntil: 'load', timeout: NAV_TIMEOUT_MS })
    } catch (error) {
      throw new ScanError(`Impossible de charger la page : ${error.message.split('\n')[0]}`)
    }
    if (response && response.status() >= 400) {
      throw new ScanError(`La page a répondu avec le statut HTTP ${response.status()}.`)
    }
    // Let client-rendered pages settle, but don't fail on chatty sites
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

    // Same shape the front end expects from axe, trimmed to what it uses
    return {
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        nodes: v.nodes.map((n) => ({
          html: (n.html ?? '').slice(0, 500),
          any: n.any.slice(0, 1).map((c) => ({ message: c.message })),
          all: n.all.slice(0, 1).map((c) => ({ message: c.message })),
        })),
      })),
      passes: results.passes.map(({ id }) => ({ id })),
      inapplicable: results.inapplicable.map(({ id }) => ({ id })),
      incomplete: results.incomplete.map(({ id }) => ({ id })),
    }
  } finally {
    await context.close()
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new ScanError('Requête trop volumineuse.', 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new ScanError('Corps JSON invalide.', 400))
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  if (ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  if (req.method === 'GET' && pathname === '/api/health') {
    send(res, 200, { ok: true })
    return
  }
  if (req.method !== 'POST' || pathname !== '/api/scan') {
    send(res, 404, { error: 'Route inconnue.' })
    return
  }
  if (running >= MAX_CONCURRENT) {
    send(res, 429, { error: 'Trop de scans en cours, réessayez dans un instant.' })
    return
  }

  running++
  try {
    const body = await readJson(req)
    if (typeof body?.url !== 'string') throw new ScanError('Champ "url" manquant.', 400)
    send(res, 200, await scanUrl(body.url))
  } catch (error) {
    const status = error instanceof ScanError ? error.status : 500
    if (status === 500) console.error('Scan failed:', error)
    send(res, status, {
      error: error instanceof ScanError ? error.message : 'Erreur interne du service de scan.',
    })
  } finally {
    running--
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Service de scan à l'écoute sur http://${HOST}:${PORT}`)
})

async function shutdown() {
  server.close()
  if (browserPromise) await (await browserPromise).close().catch(() => {})
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
