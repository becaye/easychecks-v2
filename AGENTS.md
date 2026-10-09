# AGENTS.md - EasyChecks Accessibility Audit Tool

## Project Overview
**EasyChecks** is a Vue 3 SPA for conducting digital accessibility audits against French WCAG standards. Audits are stored locally using a **hybrid IndexedDB + localStorage** system for maximum reliability across browsers and scenarios (private browsing, quota exceeded, etc.).

**Stack**: Vue 3 + TypeScript + Vite + Pinia + Vue Router + DSFR (Design System Français)

---

## Architecture & Data Flow

### Core Domain Model
- **Audit**: Container for accessibility test results on a target URL
  - Contains metadata (title, url, auditor, date, comments)
  - Holds array of `CriterionResult` objects (one per tested criterion)
  - Timestamps: `createdAt`, `updatedAt` (ISO format)
  
- **Criterion**: Static accessibility criterion from `initialCriteria` (≈40+ French WCAG criteria)
  - Fields: id, title, description, help text, priority level (bloquant/majeur/mineur)
  - Never modified; acts as reference data
  
- **CriterionResult**: Audit-specific test result for a criterion
  - Status: `'c'` (conforme) | `'nc'` (non-conforme) | `'nt'` (non-testé) | `'na'` (non-applicable) | `null`
  - Optional comment field
  - **Critical**: Must preserve existing results when updating audits

### State Management (Pinia Store)
`useAuditStore` is the **single source of truth**:
- `audits`: Full list persisted to localStorage
- `currentAudit`: Currently viewed audit (set via `setCurrentAudit(id)`)
- `saveStatus`: 'idle' | 'saving' | 'saved' | 'error' (debounced with 300ms delay, 3s visual feedback)
- **Auto-persist** on all mutations via `persist()` or `persistWithStatus()`

Key derived state (computed):
- `criteriaWithResults`: Merges static criteria with current audit's results
- `auditSummary`: Calculates {c, nc, nt, na, okPercentage}

### Hybrid Storage System (IndexedDB + localStorage)
- **Primary**: IndexedDB (async, ~50MB quota, persists in private mode)
- **Fallback**: localStorage (~5-10MB quota, synchronous)
- **Behavior**:
  - Load: IndexedDB first, then localStorage fallback
  - Save: Both IndexedDB and localStorage (redundancy)
  - Auto-detect best backend on module init
- **Key functions** in `src/utils/storage.ts`:
  - `loadAuditsFromStorage()` → Promise<Audit[]>
  - `saveAuditsToStorage(audits)` → Promise<void>
  - Non-blocking saves (background execution for debounce responsiveness)
- **Result**: Audits persist reliably even if quota exceeded or in private browsing mode

---

## Critical Developer Patterns

### 1. Criterion Status Management
Status values are **single characters** used throughout:
- `c` = Conforme (accessible)
- `nc` = Non-conforme (inaccessible, blocks user)
- `nt` = Non-testé (not yet tested)
- `na` = Non-applicable (doesn't apply to this page)
- `null` = Unset (initial state)

✅ See: `types/audit.ts` line 15, usage in `auditStore.ts` lines 101-117, 119-131

### 2. Computed Properties for Criteria Merging
Views that display criteria must use `store.criteriaWithResults`:
```typescript
// Returns { criterion, result } pairs for all criteria
// Result defaults to null status + empty comment if not in audit
```
This ensures UI always shows **all criteria**, even untested ones.

### 3. Export Workflow
- JSON export: `exportJson.ts` → includes summary + full criterion details with labels
- HTML export: `exportHtml.ts` → styled report with tables, summary stats, breakable by page
- Both functions handle status-to-label conversion internally
- Use `calculateSummary()` before export to get stats

### 4. Routing & View Hierarchy
Routes use audit `id` param (UUID) to load current audit:
- `/audits/:id` → Detail view (edit criteria results)
- `/audits/:id/summary` → Summary stats view
- `/audits/:id/report` → Report preview (can export from here)
- Views call `store.setCurrentAudit(id)` in setup

### 5. DSFR Component Usage
Project uses `@gouvminint/vue-dsfr` (Vue 3 wrapper for French Design System):
- **Breadcrumbs**: `DsfrBreadcrumb` with `links` prop
- **Alerts**: `DsfrAlert` with `type` and `title` props
- CSS utilities: `fr-*` classes (e.g., `fr-h2`, `fr-mb-3w`, `fr-text--grey`)
- Layout structure: `AppLayout` wrapper provides header/footer/live-region

### 6. Accessibility-First Design
- Main content wrapped in `<main id="content" tabindex="-1">` for skip-to-content
- `LiveRegion` component (ARIA live region) for screen reader announcements
- `SaveStatusAlert` component displays DSFR alerts for auto-save feedback (saving/saved/error states)
- Focus management on route changes
- Semantic HTML throughout components

### 7. Automated Accessibility Scanning (axe-core)
- **Lightweight frontend scanning** using axe-core (no backend required)
- Runs in iframe to isolate scan from main app
- Detects ~70-80% of automated-detectable WCAG violations
- Maps axe violations to audit criteria automatically
- Suggests pre-filling criteria with status based on scan results
- **Limitations**: Requires public URLs (no auth), no CORS restrictions
- See `docs/AUTOMATED_SCANNING.md` for full documentation

---

## Essential Files to Know

| File | Purpose |
|------|---------|
| `src/stores/auditStore.ts` | Central Pinia store; all audit mutations must go here |
| `src/types/audit.ts` + `criterion.ts` | Domain interfaces; status enum logic lives here |
| `src/data/initialCriteria.ts` | Immutable list of ~40+ French accessibility criteria |
| `src/router/index.ts` | Route definitions; note lazy-loaded views |
| `src/components/layout/AppLayout.vue` | Layout shell for all views |
| `src/components/layout/SaveStatusAlert.vue` | DSFR alert component for auto-save feedback (saving/saved/error) |
| `src/utils/storage.ts` | Unified storage abstraction (IndexedDB + localStorage fallback) |
| `src/utils/indexedDbStorage.ts` | IndexedDB wrapper implementation |
| `src/utils/accessibilityScanner.ts` | axe-core integration for automated scanning |
| `src/components/audit/ScanButton.vue` | UI component for launching and viewing scan results |
| `src/utils/calculateSummary.ts` | Summary calculation (total, c, nc, nt, na, okPercentage %) |
| `src/utils/exportJson.ts` + `exportHtml.ts` | Export orchestration; handle status labels |
| `src/components/audit/AuditForm.vue` | New/edit audit form; emits submit with metadata |
| `docs/AUTOMATED_SCANNING.md` | Complete guide for automated accessibility scanning feature |

---

## Build & Development Workflow

```bash
npm install                    # Install dependencies (Pinia 3.0.4, Vue 3.5.38)
npm run dev                    # Start Vite dev server (localhost:5173)
npm run build                  # Prod build: vue-tsc type-check + Vite bundle
npm run type-check             # TypeScript validation (Vue 3.x strict mode)
```

- **Node requirement**: ^22.18.0 or >=24.12.0
- **Module system**: ES modules (`"type": "module"`)
- **Dev tools**: Vue DevTools recommended for Pinia inspection

---

## Conventions & Gotchas

1. **Always sync currentAudit with audits array** when mutating; use `currentAudit.value = { ...audit }` to trigger reactivity
2. **Storage is now async**: `loadAuditsFromStorage()` and `saveAuditsToStorage()` return Promises; use `await` in views (onMounted hooks)
3. **Save operations are non-blocking**: `persist()` and `persistWithStatus()` execute saves in background to keep debounce responsive
4. **Status null handling**: Some fields allow `null` status; treat as "untested"
5. **Timestamps are ISO strings**, not Dates (for JSON serialization)
6. **French language throughout** — all labels, validation messages, UI text in French
7. **UUID for audit IDs** — generated via `uuid` package; never hardcode
8. **Utility function pattern**: Export helpers (json/html) use inline helpers (sanitizeFilename, statusLabel, escHtml)
9. **No API calls** — this is fully client-side; persistence = hybrid IndexedDB/localStorage only
10. **Computed properties are eager** — avoid expensive calculations in templates

---

## Common Tasks

| Task | Where |
|------|-------|
| Add/remove criteria | `src/data/initialCriteria.ts` |
| Add export format | Create `src/utils/export[Format].ts` + wire action in store |
| Modify audit metadata fields | Update `Audit` interface in `types/audit.ts` + form in `AuditForm.vue` |
| Add status calculation | Enhance `calculateSummary()` |
| Change UI layout/header | Edit `AppLayout.vue`, `AppHeader.vue`, `AppFooter.vue` |
| Add new route | Edit `router/index.ts`, create view in `views/` |
| Map new axe rules to criteria | Update `violationMap` in `accessibilityScanner.ts` |
| Implement backend scanning (Phase 2) | Create Node.js service with Playwright + axe-core (see AUTOMATED_SCANNING.md) |

