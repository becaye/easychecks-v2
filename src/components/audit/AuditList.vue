<template>
  <section aria-labelledby="audits-list-heading">
    <h2 id="audits-list-heading" class="fr-h3">Audits existants</h2>

    <p v-if="!store.hasAudits" class="fr-text--lg fr-text--grey">
      Aucun audit pour l'instant. Créez votre premier audit.
    </p>

    <ul v-else class="fr-grid-row fr-grid-row--gutters fr-pl-0" style="list-style: none;">
      <li
        v-for="audit in store.audits"
        :key="audit.id"
        class="fr-col-12 fr-col-md-6 fr-col-lg-4"
      >
        <DsfrCard
          :title="audit.title"
          :description="cardDescription(audit)"
          :link="`/audits/${audit.id}`"
          size="sm"
          class="audit-card"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { DsfrCard } from '@gouvminint/vue-dsfr'
import { useAuditStore } from '@/stores/auditStore'
import type { Audit } from '@/types/audit'

const store = useAuditStore()

function cardDescription(audit: Audit): string {
  const date = new Date(audit.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const total = audit.criteriaResults.length
  const evaluated = audit.criteriaResults.filter((r) => r.status && r.status !== 'nt' && r.status !== 'na').length
  return `Audit du ${date} — ${evaluated}/${total} critères évalués — ${audit.auditor}`
}
</script>
