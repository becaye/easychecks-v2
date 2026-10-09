import { describe, it, expect } from 'vitest'
import { axeRuleToCriterion } from '@/utils/accessibilityScanner'
import { initialCriteria } from '@/data/initialCriteria'
import { isHttpUrl } from '@/utils/url'

describe('axeRuleToCriterion', () => {
  it('only references criteria that exist in initialCriteria', () => {
    const ids = new Set(initialCriteria.map((c) => c.id))
    for (const [rule, { criterion }] of Object.entries(axeRuleToCriterion)) {
      expect(ids.has(criterion), `${rule} -> ${criterion}`).toBe(true)
    }
  })
})

describe('isHttpUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isHttpUrl('https://exemple.fr')).toBe(true)
    expect(isHttpUrl('http://localhost:5173/a')).toBe(true)
  })
  it('rejects other schemes and garbage', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,x')).toBe(false)
    expect(isHttpUrl('exemple.fr')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
  })
})

import { generateScanSuggestions, type AccessibilityScanResult } from '@/utils/accessibilityScanner'

describe('generateScanSuggestions', () => {
  const scan = (ids: string[]): AccessibilityScanResult => ({
    url: 'https://x.fr',
    timestamp: '',
    violations: ids.map((id) => ({ id, impact: 'serious', title: id, description: id, nodes: [] })),
    passes: 0,
    violations_count: { critical: 0, serious: 0, moderate: 0, minor: 0 },
    inapplicable: 0,
    incomplete: 0,
  })

  it('suggests nc for detected violations only, never conforme', () => {
    const s = generateScanSuggestions(scan(['color-contrast', 'image-alt']))
    expect(s.map((x) => x.criterionId).sort()).toEqual(['alternatives-images', 'contrastes'])
    expect(s.every((x) => x.suggestedStatus === 'nc')).toBe(true)
  })

  it('returns nothing when there is no mapped violation', () => {
    expect(generateScanSuggestions(scan([]))).toEqual([])
  })
})
