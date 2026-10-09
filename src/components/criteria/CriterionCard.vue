<template>
  <article
    :id="`criterion-${criterion.id}`"
    class="criterion-card fr-p-3w fr-mb-2w"
    :aria-label="`Critère : ${criterion.title}`"
  >
    <div class="criterion-card__header fr-mb-2w">
      <div class="criterion-card__title-row">
        <h3 class="fr-h5 fr-mb-0">{{ criterion.title }}</h3>
        <DsfrBadge
          v-if="criterion.priority"
          :label="priorityLabel(criterion.priority)"
          :type="priorityType(criterion.priority)"
          small
        />
      </div>
      <p class="fr-text--sm fr-text--grey fr-mt-1w fr-mb-0">{{ criterion.description }}</p>
    </div>

    <details class="criterion-card__help fr-mb-2w">
      <summary class="fr-text--sm fr-link">Aide à la vérification</summary>
      <p class="fr-text--sm fr-mt-1w fr-p-2w criterion-card__help-text">{{ criterion.help }}</p>
    </details>

    <StatusSelector
      :criterion-id="criterion.id"
      :criterion-title="criterion.title"
      :model-value="result.status"
      @update:model-value="onStatusChange"
    />

    <div class="fr-mt-2w">
      <DsfrInputGroup
        v-model="localComment"
        :label="`Commentaire pour « ${criterion.title} »`"
        label-visible
        :hint="result.status === 'nc' ? 'Recommandé pour les critères non conformes' : 'Optionnel'"
        is-textarea
        @blur="onCommentBlur"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DsfrBadge, DsfrInputGroup } from '@gouvminint/vue-dsfr'
import StatusSelector from './StatusSelector.vue'
import type { Criterion } from '@/types/criterion'
import type { CriterionResult } from '@/types/audit'

const props = defineProps<{
  criterion: Criterion
  result: CriterionResult
  auditId: string
}>()

const emit = defineEmits<{
  statusChange: [criterionId: string, status: CriterionResult['status']]
  commentChange: [criterionId: string, comment: string]
}>()

const localComment = ref(props.result.comment ?? '')

watch(
  () => props.result.comment,
  (v) => {
    localComment.value = v ?? ''
  },
)

function onStatusChange(status: CriterionResult['status']) {
  emit('statusChange', props.criterion.id, status)
}

function onCommentBlur() {
  if (localComment.value === (props.result.comment ?? '')) return
  emit('commentChange', props.criterion.id, localComment.value)
}

function priorityLabel(priority: string): string {
  switch (priority) {
    case 'bloquant': return 'Bloquant'
    case 'majeur': return 'Majeur'
    case 'mineur': return 'Mineur'
    default: return priority
  }
}

function priorityType(priority: string): 'error' | 'warning' | 'info' {
  switch (priority) {
    case 'bloquant': return 'error'
    case 'majeur': return 'warning'
    default: return 'info'
  }
}
</script>

<style scoped>
.criterion-card {
  background: var(--background-default-grey);
  border-left: 4px solid var(--border-default-grey);
  border-radius: 4px;
}

.criterion-card__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.criterion-card__help-text {
  background: var(--background-alt-blue-france);
  border-radius: 4px;
}
</style>
