<template>
  <div class="audit-meta fr-mb-4w">
    <h2 class="fr-h4">Informations générales</h2>
    <dl class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-6">
        <dt class="fr-text--bold">Site / Service</dt>
        <dd>{{ audit.title }}</dd>
      </div>
      <div class="fr-col-12 fr-col-md-6">
        <dt class="fr-text--bold">URL</dt>
        <dd>
          <a v-if="isHttpUrl(audit.url)" :href="audit.url" target="_blank" rel="noopener noreferrer">
            {{ audit.url }}
            <span class="sr-only">(ouvre dans un nouvel onglet)</span>
          </a>
          <template v-else>{{ audit.url }}</template>
        </dd>
      </div>
      <div class="fr-col-12 fr-col-md-6">
        <dt class="fr-text--bold">Date de l'audit</dt>
        <dd>{{ formattedDate }}</dd>
      </div>
      <div class="fr-col-12 fr-col-md-6">
        <dt class="fr-text--bold">Auditeur·rice</dt>
        <dd>{{ audit.auditor }}</dd>
      </div>
      <div v-if="audit.generalComment" class="fr-col-12">
        <dt class="fr-text--bold">Commentaire général</dt>
        <dd>{{ audit.generalComment }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Audit } from '@/types/audit'
import { isHttpUrl } from '@/utils/url'

const props = defineProps<{ audit: Audit }>()

const formattedDate = computed(() =>
  new Date(props.audit.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)
</script>
