import type { Audit, AuditSummary } from '@/types/audit'

export function calculateSummary(audit: Audit): AuditSummary {
  const results = audit.criteriaResults
  const total = results.length
  const c = results.filter((r) => r.status === 'c').length
  const nc = results.filter((r) => r.status === 'nc').length
  const nt = results.filter((r) => r.status === 'nt' || r.status === null).length
  const na = results.filter((r) => r.status === 'na').length
  const evaluated = c + nc
  const okPercentage = evaluated > 0 ? Math.round((c / evaluated) * 100) : 0

  return { total, c, nc, nt, na, okPercentage }
}
