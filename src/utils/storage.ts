import type { Audit } from '@/types/audit'
import { indexedDbStorage } from '@/utils/indexedDbStorage'

const STORAGE_KEY = 'easy-checks-audits'

/**
 * Unified storage abstraction that automatically selects the best backend:
 * - IndexedDB if available (better reliability, larger quota, works in private mode)
 * - localStorage as fallback (synchronous, works everywhere, but limited quota)
 *
 * This ensures audits are persisted reliably across different browser scenarios.
 */

// Resolved once IndexedDB is known to be open and usable (avoids racing the first load/save)
async function isIndexedDbAvailable(): Promise<boolean> {
  try {
    return await indexedDbStorage.isReady()
  } catch {
    return false
  }
}

/**
 * Load audits from the best available storage backend
 */
export async function loadAuditsFromStorage(): Promise<Audit[]> {
  try {
    // Try IndexedDB first if it appears to be supported
    if (await isIndexedDbAvailable()) {
      const audits = await indexedDbStorage.load()
      if (audits.length > 0) {
        return audits
      }
    }

    // Fall back to localStorage
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed as Audit[]
  } catch {
    return []
  }
}

/**
 * Save audits to both storage backends for redundancy
 * - Saves to IndexedDB if available (async, better quota)
 * - Saves to localStorage as backup (synchronous, immediate)
 */
export async function saveAuditsToStorage(audits: Audit[]): Promise<void> {
  let indexedDbSuccess = false
  let localStorageSuccess = false

  // Try IndexedDB first (non-blocking)
  if (await isIndexedDbAvailable()) {
    try {
      indexedDbSuccess = await indexedDbStorage.save(audits)
    } catch {
      indexedDbSuccess = false
    }
  }

  // Always try localStorage as backup (synchronous, immediate)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(audits))
    localStorageSuccess = true
  } catch {
    // Quota exceeded or private browsing — silently fail
    localStorageSuccess = false
  }

  // At least one storage backend succeeded
  if (!indexedDbSuccess && !localStorageSuccess) {
    throw new Error('Failed to persist audits to any storage backend')
  }
}

/**
 * Clear all audits from both storage backends
 */
export async function clearAuditsFromStorage(): Promise<void> {
  try {
    // Clear IndexedDB
    if (await isIndexedDbAvailable()) {
      await indexedDbStorage.clear()
    }

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently fail if clearing fails
  }
}

