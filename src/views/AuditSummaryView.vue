<template>
  <AppLayout>
    <DsfrBreadcrumb :links="breadcrumb" />

    <div v-if="!audit">
      <DsfrAlert type="error" title="Audit introuvable" description="Cet audit n'existe pas ou a été supprimé." />
      <RouterLink to="/" class="fr-btn fr-mt-3w">Retour à l'accueil</RouterLink>
    </div>

    <template v-else>
      <div class="fr-mb-4w">
        <h1 class="fr-h2">Synthèse — {{ audit.title }}</h1>
        <div class="fr-btns-group fr-btns-group--inline">
          <RouterLink
            :to="`/audits/${audit.id}`"
            class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line"
          >
            Retour à l'audit
          </RouterLink>
          <RouterLink
            :to="`/audits/${audit.id}/report`"
            class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-file-text-line"
          >
            Voir le rapport
          </RouterLink>
        </div>
      </div>

      <SaveStatusAlert />

      <SummaryCards v-if="summary" :summary="summary" />
      <SummaryTable />
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { DsfrBreadcrumb, DsfrAlert } from '@gouvminint/vue-dsfr'
import AppLayout from '@/components/layout/AppLayout.vue'
import SaveStatusAlert from '@/components/layout/SaveStatusAlert.vue'
import SummaryCards from '@/components/summary/SummaryCards.vue'
import SummaryTable from '@/components/summary/SummaryTable.vue'
import { useAuditStore } from '@/stores/auditStore'

const route = useRoute()
const store = useAuditStore()

// Re-open the audit when navigating between audits without remounting the view
watch(
  () => route.params.id,
  (id) => store.openAudit(id as string),
  { immediate: true },
)

const audit = computed(() => store.currentAudit)
const summary = computed(() => store.auditSummary)

const breadcrumb = computed(() => [
  { text: 'Accueil', to: '/' },
  { text: audit.value?.title ?? 'Audit', to: `/audits/${route.params.id}` },
  { text: 'Synthèse', to: `/audits/${route.params.id}/summary` },
])
</script>
