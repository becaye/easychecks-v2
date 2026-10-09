import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuditStore } from '@/stores/auditStore'

const BASE = {
  title: 'Test',
  url: 'https://example.com',
  date: '2024-01-01',
  auditor: 'Bob',
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('auditStore', () => {
  it('creates an audit with all criteria initialised to nt', () => {
    const store = useAuditStore()
    const id = store.createAudit(BASE)
    const audit = store.getAuditById(id)!
    expect(audit.title).toBe('Test')
    expect(audit.criteriaResults.length).toBeGreaterThan(0)
    expect(audit.criteriaResults.every((r) => r.status === 'nt')).toBe(true)
  })

  it('updates audit metadata', () => {
    const store = useAuditStore()
    const id = store.createAudit(BASE)
    store.updateAudit(id, { title: 'Updated' })
    expect(store.getAuditById(id)!.title).toBe('Updated')
  })

  it('deletes an audit', () => {
    const store = useAuditStore()
    const id = store.createAudit(BASE)
    expect(store.auditsCount).toBe(1)
    store.deleteAudit(id)
    expect(store.auditsCount).toBe(0)
    expect(store.getAuditById(id)).toBeUndefined()
  })

  it('clears currentAudit when the current audit is deleted', () => {
    const store = useAuditStore()
    const id = store.createAudit(BASE)
    store.setCurrentAudit(id)
    expect(store.currentAudit).not.toBeNull()
    store.deleteAudit(id)
    expect(store.currentAudit).toBeNull()
  })

  it('setCurrentAudit exposes auditSummary', () => {
    const store = useAuditStore()
    const id = store.createAudit(BASE)
    store.setCurrentAudit(id)
    const summary = store.auditSummary
    expect(summary).not.toBeNull()
    expect(summary!.total).toBeGreaterThan(0)
    expect(summary!.nt).toBe(summary!.total)
  })

  it('updateCriterionStatus changes a criterion and refreshes auditSummary', () => {
    const store = useAuditStore()
    const id = store.createAudit(BASE)
    store.setCurrentAudit(id)
    const criterionId = store.getAuditById(id)!.criteriaResults[0].criterionId

    store.updateCriterionStatus(id, criterionId, 'c')

    const result = store.getAuditById(id)!.criteriaResults.find(
      (r) => r.criterionId === criterionId,
    )
    expect(result!.status).toBe('c')
    expect(store.auditSummary!.c).toBe(1)
  })

  it('updateCriterionComment saves the comment', () => {
    const store = useAuditStore()
    const id = store.createAudit(BASE)
    const criterionId = store.getAuditById(id)!.criteriaResults[0].criterionId

    store.updateCriterionComment(id, criterionId, 'Mon commentaire')

    const result = store.getAuditById(id)!.criteriaResults.find(
      (r) => r.criterionId === criterionId,
    )
    expect(result!.comment).toBe('Mon commentaire')
  })

  it('hasAudits reflects store contents', () => {
    const store = useAuditStore()
    expect(store.hasAudits).toBe(false)
    const id = store.createAudit(BASE)
    expect(store.hasAudits).toBe(true)
    store.deleteAudit(id)
    expect(store.hasAudits).toBe(false)
  })
})