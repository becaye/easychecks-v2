import type { Audit } from '@/types/audit'
import { initialCriteria } from '@/data/initialCriteria'
import { calculateSummary } from '@/utils/calculateSummary'
import { downloadBlob, sanitizeFilename, statusLabel } from '@/utils/exportCommon'

export function exportAuditAsJson(audit: Audit): void {
  const summary = calculateSummary(audit)

  const criteriaDetail = audit.criteriaResults.map((result) => {
    const criterion = initialCriteria.find((c) => c.id === result.criterionId)
    return {
      id: result.criterionId,
      title: criterion?.title ?? result.criterionId,
      description: criterion?.description ?? '',
      priority: criterion?.priority ?? null,
      status: result.status,
      statusLabel: statusLabel(result.status),
      comment: result.comment ?? '',
    }
  })

  const exportData = {
    exportDate: new Date().toISOString(),
    audit: {
      id: audit.id,
      title: audit.title,
      url: audit.url,
      date: audit.date,
      auditor: audit.auditor,
      generalComment: audit.generalComment ?? '',
    },
    summary,
    criteria: criteriaDetail,
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(blob, `audit-${sanitizeFilename(audit.title)}-${audit.date}.json`)
}
