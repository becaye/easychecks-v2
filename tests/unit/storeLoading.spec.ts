import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initialCriteria } from '@/data/initialCriteria'
import type { Audit } from '@/types/audit'

const stored: Audit[] = []
vi.mock('@/utils/storage', () => ({
  loadAuditsFromStorage: vi.fn(async () => structuredClone(stored)),
  saveAuditsToStorage: vi.fn(async () => {}),
}))

import { loadAuditsFromStorage } from '@/utils/storage'
import { useAuditStore } from '@/stores/auditStore'

const oldAudit: Audit = {
  id: 'old',
  title: 'Old',
  url: 'https://example.com',
  date: '2024-01-01',
  auditor: 'Bob',
  criteriaResults: [{ criterionId: initialCriteria[0].id, status: 'c', comment: 'ok' }],
  createdAt: '',
  updatedAt: '',
}

beforeEach(() => {
  stored.length = 0
  stored.push(oldAudit)
  vi.mocked(loadAuditsFromStorage).mockClear()
  setActivePinia(createPinia())
})

describe('auditStore loading', () => {
  it('fills in criteria added after the audit was created', async () => {
    const store = useAuditStore()
    await store.loadAudits()
    const audit = store.getAuditById('old')!
    expect(audit.criteriaResults).toHaveLength(initialCriteria.length)
    expect(audit.criteriaResults[0].status).toBe('c')
    expect(audit.criteriaResults.at(-1)!.status).toBe('nt')
  })

  it('loads from storage only once unless forced', async () => {
    const store = useAuditStore()
    await store.loadAudits()
    store.updateAudit('old', { title: 'Edited' })
    await store.loadAudits()
    expect(loadAuditsFromStorage).toHaveBeenCalledTimes(1)
    expect(store.getAuditById('old')!.title).toBe('Edited')
    await store.loadAudits(true)
    expect(loadAuditsFromStorage).toHaveBeenCalledTimes(2)
  })

  it('openAudit switches the current audit', async () => {
    stored.push({ ...oldAudit, id: 'other', title: 'Other' })
    const store = useAuditStore()
    await store.openAudit('old')
    expect(store.currentAudit?.id).toBe('old')
    await store.openAudit('other')
    expect(store.currentAudit?.id).toBe('other')
  })

  it('ignores updates for unknown criteria', async () => {
    const store = useAuditStore()
    await store.loadAudits()
    store.updateCriterionStatus('old', 'does-not-exist', 'nc')
    expect(store.getAuditById('old')!.criteriaResults.some((r) => r.criterionId === 'does-not-exist')).toBe(false)
  })
})
