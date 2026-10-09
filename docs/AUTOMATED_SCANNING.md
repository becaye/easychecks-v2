# Automated Accessibility Scanning with axe-core

## Overview

EasyChecks includes automated accessibility scanning powered by **axe-core**, a world-leading accessibility testing engine developed by Deque Labs.

### What is axe-core?

- **Open-source** accessibility testing library
- Detects **WCAG 2.1 Level A/AA violations** automatically
- Used by major organizations (Microsoft, IBM, Google, etc.)
- Fast, accurate, and regularly updated
- Dozens of rules covering:
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

1. Ouvrir un audit (ou en créer un) : le panneau de scan est sous les informations générales.
2. Cliquer sur « Lancer le scan automatique » (jusqu'à 30 secondes).
3. Consulter les violations par niveau d'impact.
4. Appliquer une suggestion en cliquant dessus, ou « Appliquer toutes les suggestions ». Si des statuts déjà saisis vont être remplacés, une confirmation est demandée.

---

## Architecture & Files

| File | Purpose |
|------|---------|
| `src/utils/accessibilityScanner.ts` | `scanAccessibility` (iframe ou service), `generateScanSuggestions`, table `axeRuleToCriterion` |
| `src/components/audit/ScanButton.vue` | UI: lancement, progression, erreurs, résultats |
| `src/views/AuditDetailView.vue` | Applique les suggestions au store |
| `server/index.mjs` | Service de scan (Playwright + `@axe-core/playwright`) |
| `server/ssrf.mjs` | Garde contre l'accès aux réseaux privés |
| `tests/unit/scannerMapping.spec.ts`, `tests/unit/ssrf.spec.ts` | Tests du mapping, des suggestions et de la garde SSRF |

### Data Structures

```typescript
interface AccessibilityScanResult {
  url: string
  timestamp: string
  violations: Array<{ id; impact; title; description; nodes: Array<{ html; message }> }>
  violations_count: { critical; serious; moderate; minor }  // en nombre d'éléments
  passes: number
  inapplicable: number
  incomplete: number
}

interface ScanSuggestions {
  criterionId: string               // doit exister dans initialCriteria
  suggestedStatus: 'c' | 'nc' | 'nt' // en pratique 'nc'
  reason: string
  violationIds: string[]
}
```

Le service renvoie les résultats axe allégés (violations complètes, autres catégories réduites à leurs `id`) ; le front les transforme avec le même code que pour l'iframe.

---

## Mapping: axe-core Rules → EasyChecks Criteria

Défini dans `axeRuleToCriterion`. Les règles sans critère équivalent sont affichées dans la liste des violations mais ne produisent pas de suggestion.

| axe rule | Critère (`id`) |
|----------|----------------|
| `color-contrast` | `contrastes` |
| `image-alt`, `input-image-alt` | `alternatives-images` |
| `label`, `select-name` | `libelles-formulaire` |
| `link-name` | `liens-explicites` |
| `heading-order`, `page-has-heading-one` | `hierarchie-titres` |
| `document-title` | `titre-page` |
| `html-has-lang` | `langue-page` |
| `tabindex` | `navigation-clavier` |

Pour ajouter une règle : l'ajouter à `axeRuleToCriterion` avec l'`id` d'un critère existant (le test `scannerMapping.spec.ts` échoue sinon).

---

## Limitations & Caveats

- Public pages only: no authentication, no pages behind a firewall.
- axe detects only a fraction of RGAA/WCAG issues; manual review of every criterion is still required.
- Pages that need user interaction (multi-step forms, modals) are scanned in their initial state.
- A page that answers HTTP 4xx/5xx, or does not load within 30 s, is reported as an error.
- The service must be running for non-same-origin URLs; otherwise the UI explains how to start it.
