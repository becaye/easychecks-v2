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

/**
 * Load axe-core dynamically to avoid bloating the bundle
 */
async function loadAxe() {
  // axe-core is already imported at the top level and available globally.
  // We just need to ensure it's loaded
  const axeModule = await import('axe-core')
  return axeModule.default || axeModule
}

/**
 * Scan a URL for accessibility issues using axe-core
 * Note: This scan happens in an iframe, so CORS headers must allow it
 */
export async function scanAccessibility(url: string): Promise<AccessibilityScanResult> {
  // Validate URL
  const parsedUrl = new URL(url)

  // Iframe-based scanning only works for same-origin URLs
  const appOrigin = window.location.origin
  const targetOrigin = parsedUrl.origin
  if (targetOrigin !== appOrigin) {
    throw new Error(
      `URL cross-origin détectée (${targetOrigin} ≠ ${appOrigin}).\n` +
      `Le scan par iframe ne peut pas accéder au contenu cross-origin par mesure de sécurité navigateur.\n` +
      `Pour scanner ce site, le serveur cible doit autoriser l'intégration en iframe (en-têtes X-Frame-Options / CSP).`,
    )
  }

  let iframe: HTMLIFrameElement | null = null
  try {
    // Create iframe to isolate the scan
    const frame = document.createElement('iframe')
    iframe = frame
    frame.src = parsedUrl.toString()
    frame.style.display = 'none'
    frame.setAttribute('title', 'Accessibility scan iframe')
    document.body.appendChild(iframe)

    // Wait for iframe to load
    await new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null
      frame.onload = () => {
        clearTimeout(timeout!)
        resolve(null)
      }
      frame.onerror = () => {
        clearTimeout(timeout!)
        reject(new Error(`Failed to load URL: ${url}`))
      }
      timeout = setTimeout(() => {
        reject(new Error(`Timeout loading URL: ${url}`))
      }, 15000)
    })

    // Inject axe-core into iframe via CDN
    const iframeDoc = frame.contentDocument
    if (!iframeDoc) {
      throw new Error('Cannot access iframe document')
    }

    const scriptEl = iframeDoc.createElement('script')
    scriptEl.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
    iframeDoc.head.appendChild(scriptEl)

    // Wait for axe to load
    await new Promise<void>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null
      scriptEl.onload = () => {
        clearTimeout(timeout!)
        resolve()
      }
      scriptEl.onerror = () => {
        clearTimeout(timeout!)
        reject(new Error('Failed to load axe-core library'))
      }
      timeout = setTimeout(() => {
        reject(new Error('Timeout loading axe-core'))
      }, 10000)
    })

    // Run axe scan in iframe
    const results: AxeResults = await new Promise((resolve, reject) => {
      const iframeWindow = frame.contentWindow
      if (!iframeWindow) {
        reject(new Error('Cannot access iframe window'))
        return
      }

      // Access axe from iframe window's global scope
      const axeGlobal = (iframeWindow as any).axe
      if (!axeGlobal || typeof axeGlobal.run !== 'function') {
        reject(new Error('axe-core not available in iframe'))
        return
      }

      axeGlobal
        .run({ runOnly: { type: 'all' } })
        .then(resolve)
        .catch(reject)
    })

    // Transform axe results to our format
    return transformAxeResults(url, results)
  } catch (error) {
    console.error('Accessibility scan failed:', error)
    if (error instanceof Error) throw error
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
  } finally {
    iframe?.remove()
  }
}

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

