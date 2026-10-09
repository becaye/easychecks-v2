import type { Audit } from '@/types/audit'
import { initialCriteria } from '@/data/initialCriteria'
import { calculateSummary } from '@/utils/calculateSummary'
import { isHttpUrl } from '@/utils/url'
import { downloadBlob, sanitizeFilename, statusLabel } from '@/utils/exportCommon'

export function exportAuditAsHtml(audit: Audit): void {
  const summary = calculateSummary(audit)
  const exportDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const criteriaRows = audit.criteriaResults
    .map((result) => {
      const criterion = initialCriteria.find((c) => c.id === result.criterionId)
      const label = statusLabel(result.status)
      const priorityLabel = criterion?.priority ? priorityText(criterion.priority) : ''
      return `
        <tr>
          <td>${escHtml(criterion?.title ?? result.criterionId)}</td>
          <td>${priorityLabel}</td>
          <td>${label}</td>
          <td>${escHtml(result.comment ?? '')}</td>
        </tr>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rapport d'accessibilité — ${escHtml(audit.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: Marianne, Arial, sans-serif; color: #1e1e1e; max-width: 900px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.75rem; border-bottom: 3px solid #000091; padding-bottom: .5rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #ddd; padding: .5rem .75rem; text-align: left; vertical-align: top; white-space: pre-wrap; }
    th { background: #f0f0f0; font-weight: 700; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat { border: 2px solid #ddd; border-radius: 4px; padding: 1rem; text-align: center; }
    .stat strong { display: block; font-size: 2rem; }
    .stat.ok { border-color: #18753c; }
    .stat.nc { border-color: #c9191e; }
    .stat.nt { border-color: #666; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: .25rem 1rem; }
    dt { font-weight: 700; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Rapport d'audit d'accessibilité</h1>
    <p>Exporté le ${exportDate}</p>

    <h2>Informations générales</h2>
    <dl>
      <dt>Site / Service</dt><dd>${escHtml(audit.title)}</dd>
      <dt>URL</dt><dd>${isHttpUrl(audit.url) ? `<a href="${escHtml(audit.url)}">${escHtml(audit.url)}</a>` : escHtml(audit.url)}</dd>
      <dt>Date de l'audit</dt><dd>${escHtml(audit.date)}</dd>
      <dt>Auditeur·rice</dt><dd>${escHtml(audit.auditor)}</dd>
      ${audit.generalComment ? `<dt>Commentaire général</dt><dd>${escHtml(audit.generalComment)}</dd>` : ''}
    </dl>

    <h2>Synthèse</h2>
    <div class="summary-grid">
      <div class="stat"><strong>${summary.total}</strong>Critères au total</div>
      <div class="stat ok"><strong>${summary.c}</strong>Conformes</div>
      <div class="stat nc"><strong>${summary.nc}</strong>Non conformes</div>
      <div class="stat nt"><strong>${summary.nt}</strong>Non testés</div>
      <div class="stat"><strong>${summary.na}</strong>Non applicables</div>
      <div class="stat ok"><strong>${summary.okPercentage}&nbsp;%</strong>Taux de conformité</div>
    </div>

    <h2>Détail des critères</h2>
    <table>
      <thead>
        <tr>
          <th scope="col">Critère</th>
          <th scope="col">Priorité</th>
          <th scope="col">Statut</th>
          <th scope="col">Commentaire</th>
        </tr>
      </thead>
      <tbody>
        ${criteriaRows}
      </tbody>
    </table>
  </main>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  downloadBlob(blob, `rapport-${sanitizeFilename(audit.title)}-${audit.date}.html`)
}

function priorityText(priority: string): string {
  switch (priority) {
    case 'bloquant':
      return 'Bloquant'
    case 'majeur':
      return 'Majeur'
    case 'mineur':
      return 'Mineur'
    default:
      return ''
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
