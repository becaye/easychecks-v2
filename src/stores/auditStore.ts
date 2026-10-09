import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Audit, CriterionResult } from '@/types/audit'
import { initialCriteria } from '@/data/initialCriteria'
import { loadAuditsFromStorage, saveAuditsToStorage } from '@/utils/storage'
import { calculateSummary } from '@/utils/calculateSummary'
import { exportAuditAsJson } from '@/utils/exportJson'
import { exportAuditAsHtml } from '@/utils/exportHtml'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const useAuditStore = defineStore('audits', () => {
  const audits = ref<Audit[]>([])
  const currentAudit = ref<Audit | null>(null)
  const saveStatus = ref<SaveStatus>('idle')

  // Getters
  const auditsCount = computed(() => audits.value.length)
  const hasAudits = computed(() => audits.value.length > 0)

  const auditSummary = computed(() => {
    if (!currentAudit.value) return null
    return calculateSummary(currentAudit.value)
  })

  const criteriaWithResults = computed(() => {
    if (!currentAudit.value) return []
    return initialCriteria.map((criterion) => {
      const result = currentAudit.value!.criteriaResults.find(
        (r) => r.criterionId === criterion.id,
      )
      return {
        criterion,
        result: result ?? { criterionId: criterion.id, status: 'nt' as const, comment: '' },
      }
    })
  })

  // Actions
  // Load once: later calls reuse the first load so views never overwrite
  // in-memory changes with a stale copy from storage. Use `force` to reload.
  let loadPromise: Promise<void> | null = null
  function loadAudits(force = false): Promise<void> {
    if (!loadPromise || force) {
      loadPromise = loadAuditsFromStorage().then((loaded) => {
        audits.value = loaded.map(normalizeAudit)
      })
    }
    return loadPromise
  }

  /** Load audits if needed, then make `id` the current audit. */
  async function openAudit(id: string) {
    await loadAudits()
    setCurrentAudit(id)
  }

  // Audits saved before criteria were added/changed lack some results: fill the gaps with 'nt'.
  function normalizeAudit(audit: Audit): Audit {
    const existing = Array.isArray(audit.criteriaResults) ? audit.criteriaResults : []
    const known = new Set(existing.map((r) => r.criterionId))
    const missing: CriterionResult[] = initialCriteria
      .filter((c) => !known.has(c.id))
      .map((c) => ({ criterionId: c.id, status: 'nt' as const, comment: '' }))
    if (missing.length === 0 && existing === audit.criteriaResults) return audit
    return { ...audit, criteriaResults: [...existing, ...missing] }
  }

  // Returns the audit's result for a known criterion, creating it if the audit predates it.
  function findOrCreateResult(audit: Audit, criterionId: string): CriterionResult | undefined {
    const found = audit.criteriaResults.find((r) => r.criterionId === criterionId)
    if (found) return found
    if (!initialCriteria.some((c) => c.id === criterionId)) return undefined
    const created: CriterionResult = { criterionId, status: 'nt', comment: '' }
    audit.criteriaResults.push(created)
    return created
  }

  function createAudit(data: {
    title: string
    url: string
    date: string
    auditor: string
    generalComment?: string
  }): string {
    const id = uuidv4()
    const criteriaResults: CriterionResult[] = initialCriteria.map((c) => ({
      criterionId: c.id,
      status: 'nt' as const,
      comment: '',
    }))
    const now = new Date().toISOString()
    const audit: Audit = {
      id,
      ...data,
      criteriaResults,
      createdAt: now,
      updatedAt: now,
    }
    audits.value.push(audit)
    persist()
    return id
  }

  function updateAudit(id: string, data: Partial<Omit<Audit, 'id' | 'criteriaResults' | 'createdAt'>>) {
    const index = audits.value.findIndex((a) => a.id === id)
    if (index === -1) return
    audits.value[index] = {
      ...audits.value[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    if (currentAudit.value?.id === id) {
      currentAudit.value = audits.value[index]
    }
    persist()
  }

  function deleteAudit(id: string) {
    audits.value = audits.value.filter((a) => a.id !== id)
    if (currentAudit.value?.id === id) {
      currentAudit.value = null
    }
    persist()
  }

  function getAuditById(id: string): Audit | undefined {
    return audits.value.find((a) => a.id === id)
  }

  function setCurrentAudit(id: string) {
    currentAudit.value = audits.value.find((a) => a.id === id) ?? null
  }

  function updateCriterionStatus(
    auditId: string,
    criterionId: string,
    status: CriterionResult['status'],
  ) {
    const audit = audits.value.find((a) => a.id === auditId)
    if (!audit) return
    const result = findOrCreateResult(audit, criterionId)
    if (!result) return
    result.status = status
    audit.updatedAt = new Date().toISOString()
    if (currentAudit.value?.id === auditId) {
      currentAudit.value = { ...audit }
    }
    persistWithStatus()
  }

  function updateCriterionComment(auditId: string, criterionId: string, comment: string) {
    const audit = audits.value.find((a) => a.id === auditId)
    if (!audit) return
    const result = findOrCreateResult(audit, criterionId)
    if (!result) return
    result.comment = comment
    audit.updatedAt = new Date().toISOString()
    if (currentAudit.value?.id === auditId) {
      currentAudit.value = { ...audit }
    }
    persistWithStatus()
  }

  function exportAuditAsJsonAction(id: string) {
    const audit = audits.value.find((a) => a.id === id)
    if (!audit) return
    exportAuditAsJson(audit)
  }

  function exportAuditAsHtmlAction(id: string) {
    const audit = audits.value.find((a) => a.id === id)
    if (!audit) return
    exportAuditAsHtml(audit)
  }

  function persist(): Promise<boolean> {
    // Save in background without awaiting (to keep callers responsive)
    return saveAuditsToStorage(audits.value).then(
      () => true,
      () => {
        saveStatus.value = 'error'
        return false
      },
    )
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let saveSeq = 0
  function persistWithStatus() {
    const seq = ++saveSeq
    saveStatus.value = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    const started = Date.now()
    persist().then((ok) => {
      // A newer save is in flight, or the save failed ('error' stays visible)
      if (seq !== saveSeq || !ok) return
      const remaining = Math.max(0, 300 - (Date.now() - started))
      saveTimer = setTimeout(() => {
        saveStatus.value = 'saved'
        saveTimer = setTimeout(() => {
          saveStatus.value = 'idle'
        }, 3000)
      }, remaining)
    })
  }

  return {
    audits,
    currentAudit,
    saveStatus,
    auditsCount,
    hasAudits,
    auditSummary,
    criteriaWithResults,
    loadAudits,
    openAudit,
    createAudit,
    updateAudit,
    deleteAudit,
    getAuditById,
    setCurrentAudit,
    updateCriterionStatus,
    updateCriterionComment,
    exportAuditAsJson: exportAuditAsJsonAction,
    exportAuditAsHtml: exportAuditAsHtmlAction,
  }
})
