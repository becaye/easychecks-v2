<template>
  <form @submit.prevent="handleSubmit" novalidate>
    <DsfrInputGroup
      v-model="form.title"
      label="Nom du site ou service *"
      label-visible
      hint="Exemple : Site de la mairie de Paris"
      placeholder="Nom du site ou service"
      :error-message="errors.title"
      required
    />

    <DsfrInputGroup
      v-model="form.url"
      label="URL du site ou service *"
      label-visible
      hint="Exemple : https://exemple.fr"
      placeholder="https://"
      type="url"
      :error-message="errors.url"
      required
    />

    <DsfrInputGroup
      v-model="form.date"
      label="Date de l'audit *"
      label-visible
      type="date"
      :error-message="errors.date"
      required
    />

    <DsfrInputGroup
      v-model="form.auditor"
      label="Nom de l'auditeur·rice *"
      label-visible
      placeholder="Prénom Nom"
      :error-message="errors.auditor"
      required
    />

    <DsfrInputGroup
      v-model="form.generalComment"
      label="Commentaire général"
      label-visible
      hint="Contexte, périmètre, remarques générales (optionnel)"
      is-textarea
    />

    <div v-if="!hideActions" class="fr-mt-3w">
      <DsfrButton
        type="submit"
        :label="submitLabel ?? 'Créer l\'audit'"
        icon="ri-check-line"
      />
      <DsfrButton
        type="button"
        label="Annuler"
        secondary
        class="fr-ml-2w"
        @click="$emit('cancel')"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { DsfrButton, DsfrInputGroup } from '@gouvminint/vue-dsfr'

const props = defineProps<{
  initial?: {
    title?: string
    url?: string
    date?: string
    auditor?: string
    generalComment?: string
  }
  submitLabel?: string
  hideActions?: boolean
}>()

const emit = defineEmits<{
  submit: [data: {
    title: string
    url: string
    date: string
    auditor: string
    generalComment?: string
  }]
  cancel: []
}>()

const form = reactive({
  title: props.initial?.title ?? '',
  url: props.initial?.url ?? '',
  date: props.initial?.date ?? new Date().toISOString().split('T')[0],
  auditor: props.initial?.auditor ?? '',
  generalComment: props.initial?.generalComment ?? '',
})

const errors = reactive({
  title: '',
  url: '',
  date: '',
  auditor: '',
})

function validate(): boolean {
  errors.title = form.title.trim() ? '' : 'Le nom du site ou service est requis.'
  errors.url = form.url.trim() ? '' : "L'URL est requise."
  errors.date = form.date ? '' : "La date de l'audit est requise."
  errors.auditor = form.auditor.trim() ? '' : "Le nom de l'auditeur·rice est requis."

  if (!errors.url && form.url.trim()) {
    try {
      new URL(form.url)
    } catch {
      errors.url = "L'URL n'est pas valide (exemple : https://exemple.fr)."
    }
  }

  return !Object.values(errors).some(Boolean)
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', {
    title: form.title.trim(),
    url: form.url.trim(),
    date: form.date,
    auditor: form.auditor.trim(),
    generalComment: form.generalComment.trim() || undefined,
  })
}

// Update form when `initial` prop changes (useful for modal editing)
import { watch } from 'vue'
watch(
  () => props.initial,
  (next) => {
    if (!next) return
    form.title = next.title ?? ''
    form.url = next.url ?? ''
    form.date = next.date ?? new Date().toISOString().split('T')[0]
    form.auditor = next.auditor ?? ''
    form.generalComment = next.generalComment ?? ''
  }
)

// Expose a programmatic submit method to parent components (used by modal footer)
import { defineExpose } from 'vue'
defineExpose({ submit: handleSubmit })
</script>
