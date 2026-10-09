<template>
  <AppLayout>
    <DsfrBreadcrumb :links="breadcrumb" />

    <div v-if="!audit">
      <DsfrAlert type="error" title="Audit introuvable" description="Cet audit n'existe pas ou a été supprimé." />
      <RouterLink to="/" class="fr-btn fr-mt-3w">Retour à l'accueil</RouterLink>
    </div>

    <template v-else>
      <div class="fr-mb-4w">
        <h1 class="fr-h2">Rapport — {{ audit.title }}</h1>
        <RouterLink
          :to="`/audits/${audit.id}`"
          class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line"
        >
          Retour à l'audit
        </RouterLink>
      </div>

      <SaveStatusAlert />

      <ExportActions
        @export-json="store.exportAuditAsJson(audit!.id)"
        @export-html="store.exportAuditAsHtml(audit!.id)"
      />

      <hr class="fr-my-4w" />

      <ReportPreview v-if="summary" :audit="audit" :summary="summary" />
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { DsfrBreadcrumb, DsfrAlert } from '@gouvminint/vue-dsfr'
import AppLayout from '@/components/layout/AppLayout.vue'
import SaveStatusAlert from '@/components/layout/SaveStatusAlert.vue'
import ExportActions from '@/components/report/ExportActions.vue'
import ReportPreview from '@/components/report/ReportPreview.vue'
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
  { text: 'Rapport', to: `/audits/${route.params.id}/report` },
])
</script>
