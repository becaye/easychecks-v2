<template>
  <AppLayout>
    <DsfrBreadcrumb :links="breadcrumb" />

    <div v-if="!audit">
      <DsfrAlert type="error" title="Audit introuvable" description="Cet audit n'existe pas ou a été supprimé." />
      <RouterLink to="/" class="fr-btn fr-mt-3w">Retour à l'accueil</RouterLink>
    </div>

    <template v-else>
      <div class="audit-detail-header fr-mb-4w">
        <h1 class="fr-h2">{{ audit.title }}</h1>

        <div class="fr-btns-group fr-btns-group--inline fr-mb-2w">
          <DsfrButton
            label="Modifier"
            secondary
            icon="fr-icon-edit-line"
            icon-left
            @click="openEdit"
          />
          <RouterLink
            :to="`/audits/${audit.id}/summary`"
            class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-bar-chart-line"
          >
            Synthèse
          </RouterLink>
          <RouterLink
            :to="`/audits/${audit.id}/report`"
            class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-file-text-line"
          >
            Rapport
          </RouterLink>
         </div>

        <SaveStatusAlert />
       </div>

      <AuditMeta :audit="audit" />

      <ScanButton
        :audit-id="audit.id"
        :audit-url="audit.url"
        @apply-suggestion="applyScanSuggestion"
        @apply-all-suggestions="applyAllScanSuggestions"
      />

      <CriteriaList :audit-id="audit.id" />

      <DsfrModal
        v-if="auditToEdit"
        :opened="!!auditToEdit"
        title="Modifier l'audit"
        :actions="editModalActions"
        @close="auditToEdit = null"
      >
        <AuditForm
          ref="editFormRef"
          :initial="auditToEdit"
          hide-actions
          @submit="onEditSubmit"
          @cancel="auditToEdit = null"
        />
      </DsfrModal>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { DsfrBreadcrumb, DsfrAlert, DsfrButton, DsfrModal } from '@gouvminint/vue-dsfr'
import AppLayout from '@/components/layout/AppLayout.vue'
import SaveStatusAlert from '@/components/layout/SaveStatusAlert.vue'
import AuditMeta from '@/components/audit/AuditMeta.vue'
import AuditForm from '@/components/audit/AuditForm.vue'
import ScanButton from '@/components/audit/ScanButton.vue'
import CriteriaList from '@/components/criteria/CriteriaList.vue'
import { useAuditStore } from '@/stores/auditStore'
import type { Audit } from '@/types/audit'
import type { ScanSuggestions } from '@/utils/accessibilityScanner'

const route = useRoute()
const store = useAuditStore()

onMounted(async () => {
  await store.loadAudits()
  store.setCurrentAudit(route.params.id as string)
})

const audit = computed(() => store.currentAudit)

const breadcrumb = computed(() => [
  { text: 'Accueil', to: '/' },
  { text: audit.value?.title ?? 'Audit', to: `/audits/${route.params.id}` },
])

const auditToEdit = ref<Audit | null>(null)
const editFormRef = ref<InstanceType<typeof AuditForm> | null>(null)

function openEdit() {
  if (!audit.value) return
  auditToEdit.value = { ...audit.value }
}

function onEditSubmit(data: { title: string; url: string; date: string; auditor: string; generalComment?: string }) {
  if (!auditToEdit.value) return
  store.updateAudit(auditToEdit.value.id, data)
  auditToEdit.value = null
}

const editModalActions = [
  {
    label: 'Enregistrer',
    onClick: () => editFormRef.value?.submit(),
  },
  {
    label: 'Annuler',
    secondary: true,
    onClick: () => { auditToEdit.value = null },
  },
]

/**
 * Apply a single scan suggestion to update criterion status
 */
function applyScanSuggestion(suggestion: ScanSuggestions) {
  if (!audit.value) return
  store.updateCriterionStatus(
    audit.value.id,
    suggestion.criterionId,
    suggestion.suggestedStatus,
  )
}

/**
 * Apply all scan suggestions at once
 */
function applyAllScanSuggestions(suggestions: ScanSuggestions[]) {
  if (!audit.value) return
  for (const suggestion of suggestions) {
    store.updateCriterionStatus(
      audit.value.id,
      suggestion.criterionId,
      suggestion.suggestedStatus,
    )
  }
}
</script>
