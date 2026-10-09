import type { AxeResults, Result } from 'axe-core'
import { calculateSummary } from '@/utils/calculateSummary'
import type { Audit } from '@/types/audit'

/**
 * Results from an automated accessibility scan using axe-core
 */
export interface AccessibilityScanResult {
  url: string
  timestamp: string
  violations: Array<{
    id: string
    impact: 'critical' | 'serious' | 'moderate' | 'minor'
    title: string
    description: string
    nodes: Array<{
      html: string
      message: string
    }>
  }>
  passes: number
  violations_count: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
  inapplicable: number
  incomplete: number
}

/**
 * Suggestions for pre-filling audit criteria based on scan results
 */
export interface ScanSuggestions {
  criterionId: string
  suggestedStatus: 'c' | 'nc' | 'nt'
  reason: string
  violationIds: string[]
}

const SCAN_API_URL: string = import.meta.env.VITE_SCAN_API_URL ?? ''

/**
 * Scan a URL for accessibility issues using axe-core.
 * - Same-origin URLs are scanned in a hidden iframe (no server needed).
 * - Any other URL goes through the scan service (`server/index.mjs`, Playwright + axe-core),
 *   because browsers forbid reading a cross-origin page.
 */
export async function scanAccessibility(url: string): Promise<AccessibilityScanResult> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`URL invalide : ${url}`)
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Seules les URLs http(s) peuvent être scannées.')
  }

  const results =
    parsedUrl.origin === window.location.origin
      ? await scanViaIframe(parsedUrl)
      : await scanViaApi(parsedUrl)

  return transformAxeResults(url, results)
}

async function scanViaApi(url: URL): Promise<AxeResults> {
  let response: Response
  try {
    response = await fetch(`${SCAN_API_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.toString() }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch {
    throw new Error(
      'Le service de scan est injoignable. Démarrez-le avec « npm run scan-server » puis réessayez.',
    )
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error ?? `Le service de scan a répondu avec le statut ${response.status}.`)
  }
  return body as AxeResults
}

async function scanViaIframe(url: URL): Promise<AxeResults> {
  const frame = document.createElement('iframe')
  frame.src = url.toString()
  frame.style.display = 'none'
  frame.setAttribute('title', 'Accessibility scan iframe')
  document.body.appendChild(frame)

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Délai dépassé au chargement de ${url}`)),
        15000,
      )
      frame.onload = () => {
        clearTimeout(timeout)
        resolve()
      }
    })

    const frameWindow = frame.contentWindow as (Window & { axe?: { run: (opts?: object) => Promise<AxeResults> } }) | null
    if (!frameWindow) throw new Error("Impossible d'accéder à la fenêtre de l'iframe")

    // Inject the locally installed axe-core (no CDN, same version as the app)
    const axeModule = await import('axe-core')
    const axe = axeModule.default ?? axeModule
    ;(frameWindow as unknown as { eval: (code: string) => void }).eval(axe.source)
    if (!frameWindow.axe) throw new Error('axe-core indisponible dans l\'iframe')

    return await frameWindow.axe.run({ runOnly: { type: 'tag', values: AXE_TAGS } })
  } finally {
    frame.remove()
  }
}

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

/**
 * Transform axe-core results to our scan format
 */
function transformAxeResults(
  url: string,
  axeResults: AxeResults,
): AccessibilityScanResult {
  const violations_count = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  }

  const violations = axeResults.violations.map((violation: Result) => {
    const impact = (violation.impact || 'minor') as 'critical' | 'serious' | 'moderate' | 'minor'
    violations_count[impact] += violation.nodes.length

    return {
      id: violation.id,
      impact,
      title: violation.description || 'Accessibility issue',
      description: violation.help || 'No description available',
      nodes: violation.nodes.map((node: any) => ({
        html: node.html || '',
        message: node.any?.[0]?.message || node.all?.[0]?.message || 'Issue detected',
      })),
    }
  })

  return {
    url,
    timestamp: new Date().toISOString(),
    violations,
    passes: axeResults.passes.length,
    violations_count,
    inapplicable: axeResults.inapplicable.length,
    incomplete: axeResults.incomplete.length,
  }
}

/**
 * Map axe rule ids to audit criteria ids (must exist in `initialCriteria`).
 */
export const axeRuleToCriterion: Record<string, { criterion: string; status: 'nc' | 'nt' }> = {
  'color-contrast': { criterion: 'contrastes', status: 'nc' },
  'image-alt': { criterion: 'alternatives-images', status: 'nc' },
  'input-image-alt': { criterion: 'alternatives-images', status: 'nc' },
  'label': { criterion: 'libelles-formulaire', status: 'nc' },
  'select-name': { criterion: 'libelles-formulaire', status: 'nc' },
  'link-name': { criterion: 'liens-explicites', status: 'nc' },
  'heading-order': { criterion: 'hierarchie-titres', status: 'nc' },
  'page-has-heading-one': { criterion: 'hierarchie-titres', status: 'nc' },
  'document-title': { criterion: 'titre-page', status: 'nc' },
  'html-has-lang': { criterion: 'langue-page', status: 'nc' },
  'tabindex': { criterion: 'navigation-clavier', status: 'nc' },
}

/**
 * Generate suggestions for audit criteria based on scan results.
 * Only violations are suggested: axe covers a small part of the criteria, so
 * "no violation found" must never be turned into "conforme".
 */
export function generateScanSuggestions(
  scan: AccessibilityScanResult,
): ScanSuggestions[] {
  const suggestions: ScanSuggestions[] = []

  // Group violations by criterion
  const violationsByCriterion: Record<string, string[]> = {}

  for (const violation of scan.violations) {
    const mapping = axeRuleToCriterion[violation.id]
    if (mapping) {
      if (!violationsByCriterion[mapping.criterion]) {
        violationsByCriterion[mapping.criterion] = []
      }
      violationsByCriterion[mapping.criterion].push(violation.id)
    }
  }

  // Create suggestions for affected criteria
  for (const [criterionId, violationIds] of Object.entries(violationsByCriterion)) {
    suggestions.push({
      criterionId,
      suggestedStatus: 'nc',
      reason: `Violations détectées : ${violationIds.join(', ')}`,
      violationIds,
    })
  }

  return suggestions
}

