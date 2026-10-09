<template>
  <div v-if="isSameOrigin" class="scan-panel fr-p-3w fr-mb-3w" :class="{ 'scan-panel--active': isScanning }">
    <div class="scan-panel__header">
      <h3 class="fr-h5 fr-mb-1w">Scan d'accessibilité automatique (axe-core)</h3>
      <p class="fr-text--sm fr-text--grey fr-mb-0">
        Détecte les violations WCAG automatiquement sur l'URL cible.
      </p>
    </div>

    <!-- Scan not run yet -->
    <template v-if="!latestScan && !isScanning">
      <button
        class="fr-btn fr-btn--secondary fr-icon-search-line fr-mb-2w"
        @click="runScan"
        :disabled="isScanning"
      >
        Lancer le scan automatique
      </button>
    </template>

    <!-- Scanning in progress -->
    <div v-if="isScanning" class="fr-alert fr-alert--info fr-mb-2w">
      <p class="fr-text--sm">⏳ Scan en cours... Cela peut prendre 10-15 secondes.</p>
    </div>

    <!-- Scan error -->
    <div v-if="scanError" class="fr-alert fr-alert--error fr-mb-2w">
      <p class="fr-text--sm" style="white-space: pre-line">
        ❌ Erreur du scan : {{ scanError }}
      </p>
      <button class="fr-btn fr-btn--tertiary fr-btn--sm fr-mt-2w" @click="runScan">
        Réessayer
      </button>
    </div>

    <!-- Scan results -->
    <template v-if="latestScan && !isScanning">
      <div class="scan-results">
        <div class="scan-results__summary fr-mb-3w">
          <div class="fr-grid-row fr-grid-row--gutters">
            <div class="fr-col-12 fr-col-md-3">
              <div class="stat-card stat-card--critical">
                <div class="stat-card__value">{{ latestScan.violations_count.critical }}</div>
                <div class="stat-card__label">Critique</div>
              </div>
            </div>
            <div class="fr-col-12 fr-col-md-3">
              <div class="stat-card stat-card--serious">
                <div class="stat-card__value">{{ latestScan.violations_count.serious }}</div>
                <div class="stat-card__label">Sérieux</div>
              </div>
            </div>
            <div class="fr-col-12 fr-col-md-3">
              <div class="stat-card stat-card--moderate">
                <div class="stat-card__value">{{ latestScan.violations_count.moderate }}</div>
                <div class="stat-card__label">Modéré</div>
              </div>
            </div>
            <div class="fr-col-12 fr-col-md-3">
              <div class="stat-card stat-card--minor">
                <div class="stat-card__value">{{ latestScan.violations_count.minor }}</div>
                <div class="stat-card__label">Mineur</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Suggestions for audit criteria -->
        <div v-if="suggestions.length > 0" class="fr-mb-3w">
          <h4 class="fr-h6 fr-mb-2w">Suggestions de pré-remplissage</h4>
          <div class="suggestions-list">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion.criterionId"
              class="suggestion-item fr-mb-1w"
              :class="`suggestion-item--${suggestion.suggestedStatus}`"
              @click="applySuggestion(suggestion)"
              :title="`Appliquer: ${suggestion.reason}`"
            >
              <span class="suggestion-item__status">{{ suggestion.suggestedStatus === 'c' ? '✓' : '✗' }}</span>
              <span class="suggestion-item__id">{{ suggestion.criterionId }}</span>
              <span class="suggestion-item__reason">{{ suggestion.reason }}</span>
            </button>
          </div>
          <button class="fr-btn fr-btn--tertiary fr-btn--sm fr-mt-2w" @click="applyAllSuggestions">
            Appliquer toutes les suggestions
          </button>
        </div>

        <!-- Violations details -->
        <div v-if="latestScan.violations.length > 0">
          <h4 class="fr-h6 fr-mb-2w">Violations détectées ({{ latestScan.violations.length }})</h4>
          <details
            v-for="violation in latestScan.violations"
            :key="violation.id"
            class="violation-detail fr-mb-2w"
            :class="`violation-detail--${violation.impact}`"
          >
            <summary class="violation-detail__summary">
              <span class="violation-detail__badge">{{ violation.impact }}</span>
              <span class="violation-detail__title">{{ violation.title }}</span>
              <span class="violation-detail__count">({{ violation.nodes.length }} éléments)</span>
            </summary>
            <div class="violation-detail__content fr-p-2w">
              <p class="fr-text--sm fr-mb-1w">{{ violation.description }}</p>
              <div class="fr-text--xs fr-text--grey">
                <p v-for="(node, idx) in violation.nodes.slice(0, 3)" :key="idx" class="fr-mb-1w">
                  <code class="violation-code">{{ node.html.substring(0, 80) }}</code>
                  <br />
                  <em>{{ node.message }}</em>
                </p>
                <p v-if="violation.nodes.length > 3" class="fr-text--italic">
                  +{{ violation.nodes.length - 3 }} autre(s) violation(s)
                </p>
              </div>
            </div>
          </details>
        </div>

        <div class="fr-mt-3w">
          <button class="fr-btn fr-btn--secondary" @click="runScan">
            Relancer le scan
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  scanAccessibility,
  generateScanSuggestions,
  type AccessibilityScanResult,
  type ScanSuggestions,
} from '@/utils/accessibilityScanner'

const props = defineProps<{
  auditId: string
  auditUrl: string
}>()

const isSameOrigin = computed(() => {
  try {
    return new URL(props.auditUrl).origin === window.location.origin
  } catch {
    return false
  }
})

const emit = defineEmits<{
  'apply-suggestion': [suggestion: ScanSuggestions]
  'apply-all-suggestions': [suggestions: ScanSuggestions[]]
}>()

const isScanning = ref(false)
const scanError = ref<string | null>(null)
const latestScan = ref<AccessibilityScanResult | null>(null)

const suggestions = computed(() => {
  if (!latestScan.value) return []
  return generateScanSuggestions(latestScan.value)
})

async function runScan() {
  isScanning.value = true
  scanError.value = null

  try {
    latestScan.value = await scanAccessibility(props.auditUrl)
  } catch (error) {
    scanError.value =
      error instanceof Error
        ? error.message
        : 'Erreur inconnue lors du scan'
  } finally {
    isScanning.value = false
  }
}

function applySuggestion(suggestion: ScanSuggestions) {
  emit('apply-suggestion', suggestion)
}

function applyAllSuggestions() {
  emit('apply-all-suggestions', suggestions.value)
}
</script>

<style scoped>
.scan-panel {
  border: 2px solid var(--border-default-grey);
  border-radius: 4px;
  background: var(--background-alt-grey);
  transition: all 0.2s ease;
}

.scan-panel--active {
  border-color: #0a76f6;
  background: #f5f8ff;
}

.scan-panel__header {
  border-bottom: 1px solid var(--border-default-grey);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.scan-results__summary {
  margin-top: 1rem;
}

.stat-card {
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  background: white;
  border: 2px solid #ddd;
}

.stat-card__value {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-card__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

.stat-card--critical {
  border-color: #c9191e;
  background: #fff5f5;
}

.stat-card--critical .stat-card__value {
  color: #c9191e;
}

.stat-card--serious {
  border-color: #f59e00;
  background: #fffbf0;
}

.stat-card--serious .stat-card__value {
  color: #f59e00;
}

.stat-card--moderate {
  border-color: #0a76f6;
  background: #f5f8ff;
}

.stat-card--moderate .stat-card__value {
  color: #0a76f6;
}

.stat-card--minor {
  border-color: #666;
  background: #f5f5f5;
}

.stat-card--minor .stat-card__value {
  color: #666;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s ease;
  text-align: left;
}

.suggestion-item:hover {
  border-color: #0a76f6;
  background: #f5f8ff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.suggestion-item--c {
  border-left: 4px solid #18753c;
}

.suggestion-item--nc {
  border-left: 4px solid #c9191e;
}

.suggestion-item__status {
  font-weight: 700;
  font-size: 1rem;
}

.suggestion-item--c .suggestion-item__status {
  color: #18753c;
}

.suggestion-item--nc .suggestion-item__status {
  color: #c9191e;
}

.suggestion-item__id {
  font-weight: 600;
  min-width: 150px;
}

.suggestion-item__reason {
  color: #666;
  font-size: 0.8rem;
  flex: 1;
}

.violation-detail {
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  overflow: hidden;
}

.violation-detail--critical {
  border-left: 4px solid #c9191e;
}

.violation-detail--serious {
  border-left: 4px solid #f59e00;
}

.violation-detail--moderate {
  border-left: 4px solid #0a76f6;
}

.violation-detail--minor {
  border-left: 4px solid #999;
}

.violation-detail__summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  user-select: none;
}

.violation-detail__summary:hover {
  background: var(--background-alt-grey);
}

.violation-detail__badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  min-width: 70px;
  text-align: center;
}

.violation-detail--critical .violation-detail__badge {
  background: #c9191e;
  color: white;
}

.violation-detail--serious .violation-detail__badge {
  background: #f59e00;
  color: white;
}

.violation-detail--moderate .violation-detail__badge {
  background: #0a76f6;
  color: white;
}

.violation-detail--minor .violation-detail__badge {
  background: #999;
  color: white;
}

.violation-detail__title {
  flex: 1;
}

.violation-detail__count {
  color: #999;
  font-size: 0.875rem;
  font-weight: normal;
}

.violation-detail__content {
  background: var(--background-alt-grey);
  border-top: 1px solid #ddd;
}

.violation-code {
  display: block;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

