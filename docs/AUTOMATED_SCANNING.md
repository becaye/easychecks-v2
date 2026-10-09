# Automated Accessibility Scanning with axe-core

## Overview

EasyChecks now includes automated accessibility scanning powered by **axe-core**, a world-leading accessibility testing engine developed by Deque Labs.

### What is axe-core?

- **Open-source** accessibility testing library
- Detects **WCAG 2.1 Level A/AA violations** automatically
- Used by major organizations (Microsoft, IBM, Google, etc.)
- Fast, accurate, and regularly updated
- ~40+ accessibility rules covering:
  - Color contrast
  - Form labels
  - Image alt text
  - Keyboard navigation
  - ARIA attributes
  - Heading hierarchy
  - And more...

---

## How It Works

Two scan modes, chosen automatically from the audited URL:

| URL | Mode | Needs |
|-----|------|-------|
| Same origin as the app | Hidden iframe + locally installed axe-core | Nothing |
| Any other site | Scan service (`server/index.mjs`): headless Chromium (Playwright) + `@axe-core/playwright` | `npm run scan-server` |

```
EasyChecks (Vue)  --POST /api/scan {url}-->  Scan service  -->  Chromium + axe-core  -->  target site
        ^                                         |
        +------------ axe results (JSON) --------+
```

### Running the scan service

```sh
npx playwright install chromium   # once
npm run scan-server               # http://127.0.0.1:3001
npm run dev                       # Vite proxies /api to the service
```

Environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SCAN_PORT` | `3001` | Port of the service (also read by `vite.config.ts` for the proxy) |
| `SCAN_HOST` | `127.0.0.1` | Interface to listen on |
| `SCAN_ALLOW_PRIVATE` | unset | `1` allows scanning localhost / private networks. **Local development only** |
| `SCAN_ALLOWED_ORIGIN` | unset | Sets CORS when the app and the service are on different origins |
| `SCAN_MAX_CONCURRENT` | `2` | Parallel scans before answering HTTP 429 |
| `VITE_SCAN_API_URL` | empty (same origin) | Front-end: base URL of the service in production |

In production, serve the service behind the same host as the app (reverse proxy on `/api`) or set `VITE_SCAN_API_URL` and `SCAN_ALLOWED_ORIGIN`.

### Security

The service fetches arbitrary URLs on behalf of the user, so it refuses anything that is not public `http(s)`:
loopback, private ranges, link-local (cloud metadata `169.254.169.254`), CGNAT and their IPv6 equivalents
(`server/ssrf.mjs`). The check is applied to the target, to every redirect and to every sub-request made by the page.
Residual risk: DNS rebinding between our check and Chromium's own resolution. If the service is exposed publicly,
also run it in a network namespace/container without access to your internal network, and add authentication or rate limiting.

### Scan results

For each violation detected:
- **Impact level**: critical, serious, moderate, minor
- **Number of affected elements**
- **HTML snippets** of problematic elements
- **Helpful descriptions** for fixing

### Suggestions

Based on scan results, EasyChecks suggests **Non-conforme (nc)** for criteria with violations, with the axe rules
as the reason. It never suggests *conforme*: axe covers only part of each criterion, so "no violation" is not a verdict.

---

## Usage

### 1. Launch Scan in Audit Detail View

```
1. Go to any audit (or create a new one)
2. Click "Lancer le scan automatique" button
3. Wait 10-15 seconds for scan to complete
4. Review violations by impact level
5. Apply suggestions or dismiss individually
```

### 2. Apply Suggestions

**Option A: Apply single suggestion**
```
Click on a suggestion → Status updated in real-time
```

**Option B: Apply all suggestions**
```
Click "Appliquer toutes les suggestions" → All criteria updated at once
```

---

## Architecture & Files

### Main Components

| File | Purpose |
|------|---------|
| `src/utils/accessibilityScanner.ts` | Core scanning logic using axe-core |
| `src/components/audit/ScanButton.vue` | UI for launching scans & viewing results |
| `src/views/AuditDetailView.vue` | Integration point for scan suggestions |

### Key Functions

```typescript
// Scan a URL for accessibility violations
// noinspection JSAnnotator

async function scanAccessibility(url: string): Promise<AccessibilityScanResult>

// Generate audit criteria suggestions based on violations
function generateScanSuggestions(scan: AccessibilityScanResult): ScanSuggestions[]
```

### Data Structures

```typescript
// Scan result structure
interface AccessibilityScanResult {
  url: string
  timestamp: string
  violations: Violation[]
  violations_count: { critical, serious, moderate, minor }
  passes: number
  inapplicable: number
  incomplete: number
}

// Suggestion for a criterion
interface ScanSuggestions {
  criterionId: string
  suggestedStatus: 'c' | 'nc' | 'nt'
  reason: string
  violationIds: string[]
}
```

---

## Mapping: axe-core Rules → EasyChecks Criteria

| axe Rule ID | EasyChecks Criterion | Impact |
|-------------|---------------------|--------|
| `color-contrast` | Contrastes | serious+ |
| `image-alt` | Alternatives images | critical |
| `label` | Libellés formulaire | serious |
| `heading-order` | Hiérarchie titres | serious |
| `page-has-heading-one` | Titre page | critical |
| `document-title` | Titre page | critical |
| `button-name` | Libellés boutons | critical |
| `link-name` | Libellés liens | critical |
| `html-has-lang` | Langue principale | serious |
| `tabindex` | Navigation clavier | moderate |

---

## Limitations & Caveats

- Public pages only: no authentication, no pages behind a firewall.
- axe detects only a fraction of RGAA/WCAG issues; manual review of every criterion is still required.
- Pages that need user interaction (multi-step forms, modals) are scanned in their initial state.
- A page that answers HTTP 4xx/5xx, or does not load within 30 s, is reported as an error.
- The service must be running for non-same-origin URLs; otherwise the UI explains how to start it.
