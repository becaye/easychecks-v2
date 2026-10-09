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

### 1. Frontend Scanning (No Backend Required)

The scan happens entirely in the browser using an iframe:

```
┌─────────────────────────────────────┐
│   EasyChecks Vue App (Main Frame)   │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  Target URL     │ (in iframe)
        │  + axe-core     │
        └─────────────────┘
                 │
                 ▼
        Scan Results (JSON)
                 │
                 ▼
  Pre-fill audit criteria suggestions
```

### 2. Scan Results

For each violation detected:
- **Impact level**: critical, serious, moderate, minor
- **Number of affected elements**
- **HTML snippets** of problematic elements
- **Helpful descriptions** for fixing

### 3. Suggestions

Based on scan results, EasyChecks suggests:
- ✓ **Conforme (c)** for criteria with no violations
- ✗ **Non-conforme (nc)** for criteria with violations
- Reasons explaining which axe rules detected issues

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

### When Scans Work Best ✅
- **Public URLs** (no authentication required)
- **Static content** (no JavaScript-rendered UI)
- **No CORS restrictions**
- **Fast-loading pages** (< 15 seconds)

### When Scans May Fail ❌
- **Authentication required** (login walls)
- **CORS headers block iframe** (most common failure)
- **JavaScript-heavy apps** (need E2E testing instead)
- **Timeouts** on slow servers
- **Site behind firewall** (not accessible from browser)

### Error Handling

If scan fails:
```
Error messages explain possible causes:
- "CORS" → Server blocks iframe access
- "Timeout" → Page took too long to load
- "Site inaccessible" → DNS error, 404, etc.
```

---

## Phase 2: Backend Scanning (Optional Future Enhancement)

For more robust scanning of protected sites:

### Proposed Backend Solution

```typescript
// Node.js backend using Playwright + axe-core

import { chromium } from 'playwright'
import { axe, toHaveNoViolations } from 'jest-axe'

async function scanWithPlaywright(url: string) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  await page.goto(url, { waitUntil: 'networkidle' })
  
  // Inject axe-core and run scan
  const results = await page.evaluate(async () => {
    return await window.axe.run()
  })
  
  await browser.close()
  return results
}
```

### Advantages Over Frontend
- Works with **password-protected** sites
- Handles **complex JavaScript** apps
- **Longer timeout** (handles slow pages)
- Can run **parallel scans**
- Better **error handling** for network issues

### When to Implement
- When clients request scans of internal/protected sites
- For **automated CI/CD integration**
- For **batch scanning** of large site portfolios

---

## Development Notes

### Adding New Criterion Mapping

To map new axe rules to criteria:

1. Find axe rule ID in [axe-core Rule Index](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
2. Add mapping in `generateScanSuggestions()`:

```typescript
const violationMap = {
  'new-axe-rule-id': { criterion: 'your-criterion-id', status: 'nc' },
  // ...existing mappings...
}
```

3. Test mapping with test URL

### Testing Scans Locally

```bash
# Start dev server
npm run dev

# Create or open an audit
# Navigate to /audits/:id
# Click "Lancer le scan automatique"
# Use public test sites:
# - https://www.w3.org/
# - https://www.bbc.co.uk/ (complex site)
# - https://example.com (simple site)
```

### Performance Considerations

- Scan happens **in main thread** (blocks UI briefly)
- For production, consider:
  - Web Workers for background scanning
  - Debouncing multiple rapid scans
  - Caching results for same URL

---

## FAQ

**Q: Why isn't the scan finding all accessibility issues?**
A: axe-core is excellent but not 100% detection. It catches ~70-80% of automated-detectable issues. Manual testing still needed for context-dependent issues.

**Q: Can I scan localhost?**
A: Yes, if running EasyChecks on localhost too. Otherwise, localhost is not accessible from browser iframe.

**Q: Does the scan send data to external servers?**
A: No. axe-core library is bundled locally (from CDN on first load). Scan happens entirely in your browser.

**Q: How do I scan sites behind authentication?**
A: Use the planned Phase 2 backend solution with Playwright (not yet implemented).

---

## Resources

- [axe-core GitHub](https://github.com/dequelabs/axe-core)
- [axe DevTools](https://www.deque.com/axe/devtools/) (browser extension)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Deque Labs Blog](https://www.deque.com/blog/)

