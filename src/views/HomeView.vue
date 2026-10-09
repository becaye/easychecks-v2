<template>
  <AppLayout>
    <DsfrBreadcrumb :links="breadcrumb" />

    <section class="fr-mb-6w" aria-labelledby="home-heading">
      <h1 id="home-heading" class="fr-h1">Easy Checks</h1>
      <p class="fr-text--lg fr-mb-3w">
        Réalisez des audits <strong>rapides</strong> d'accessibilité inspirés des
        <a href="https://www.w3.org/WAI/test-evaluate/preliminary/" target="_blank" rel="noopener noreferrer">
          Easy Checks du W3C
          <span class="sr-only">(ouvre dans un nouvel onglet)</span>
        </a>.
        Évaluez 15 critères clés, générez une synthèse et exportez vos rapports.
      </p>
      <RouterLink to="/audits/new" class="fr-btn fr-btn--lg fr-btn--icon-left fr-icon-add-line">
        Créer un audit
      </RouterLink>
    </section>

    <AuditList />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { DsfrBreadcrumb } from '@gouvminint/vue-dsfr'
import { RouterLink } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AuditList from '@/components/audit/AuditList.vue'
import { useAuditStore } from '@/stores/auditStore'

const store = useAuditStore()

onMounted(async () => {
  await store.loadAudits()
})

const breadcrumb = [{ text: 'Accueil', to: '/' }]
</script>
