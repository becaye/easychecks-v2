import { describe, it, expect } from 'vitest'
import { calculateSummary } from '@/utils/calculateSummary'
import type { Audit } from '@/types/audit'

function makeAudit(statuses: Array<'c' | 'nc' | 'nt' | 'na' | null>): Audit {
  return {
    id: '1',
    title: 'Test',
    url: 'https://example.com',
    date: '2024-01-01',
    auditor: 'Alice',
    criteriaResults: statuses.map((status, i) => ({
      criterionId: `c${i}`,
      status,
      comment: '',
    })),
    createdAt: '',
    updatedAt: '',
  }
}

describe('calculateSummary', () => {
  it('counts each status correctly', () => {
    const audit = makeAudit(['c', 'c', 'nc', 'nt', 'na'])
    const s = calculateSummary(audit)
    expect(s.total).toBe(5)
    expect(s.c).toBe(2)
    expect(s.nc).toBe(1)
    expect(s.nt).toBe(1)
    expect(s.na).toBe(1)
  })

  it('computes okPercentage from evaluated (c + nc) only', () => {
    const audit = makeAudit(['c', 'c', 'nc', 'nt'])
    const s = calculateSummary(audit)
    // 2 c out of 3 evaluated → 67%
    expect(s.okPercentage).toBe(67)
  })

  it('returns 0% when nothing is evaluated', () => {
    const audit = makeAudit(['nt', 'na', 'nt'])
    const s = calculateSummary(audit)
    expect(s.okPercentage).toBe(0)
  })

  it('returns 100% when all evaluated criteria are conformant', () => {
    const audit = makeAudit(['c', 'c', 'c'])
    const s = calculateSummary(audit)
    expect(s.okPercentage).toBe(100)
  })

  it('handles an empty criteria list', () => {
    const audit = makeAudit([])
    const s = calculateSummary(audit)
    expect(s.total).toBe(0)
    expect(s.okPercentage).toBe(0)
  })
})