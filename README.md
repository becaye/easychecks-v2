# EasyChecks v2

Application web d'audit d'accessibilité numérique (référentiel inspiré du RGAA / WCAG 2.1 AA) : on crée un audit pour un site, on évalue des critères, on obtient une synthèse et un rapport exportable.

Tout fonctionne côté navigateur, sans compte ni base de données : les audits sont enregistrés localement (IndexedDB, avec `localStorage` en secours). Seul le scan automatique de sites externes demande un petit service à part.

**Stack** : Vue 3 · TypeScript · Vite · Pinia · Vue Router · [Système de design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/) via `@gouvminint/vue-dsfr` · axe-core · Playwright (service de scan).

## Fonctionnalités

- Création et édition d'audits (site, URL `http(s)`, date, auditeur·rice, commentaire général).
- 15 critères d'accessibilité avec niveau de priorité (bloquant / majeur / mineur), aide à la vérification, statut (conforme, non conforme, non testé, non applicable) et commentaire.
- Enregistrement automatique avec retour visuel et vocal (`SaveStatusAlert`, `LiveRegion`).
- Synthèse chiffrée (taux de conformité calculé sur les critères évalués).
- Rapport imprimable et export **HTML** et **JSON**.
- **Scan automatique axe-core** : détecte des violations et suggère les critères à passer en « non conforme ». Il ne suggère jamais « conforme » (axe ne couvre qu'une partie de chaque critère).

## Démarrage

Prérequis : Node `^22.18.0` ou `>=24.12.0`.

```sh
npm install
npm run dev          # http://localhost:5173
```

### Scan de sites externes (optionnel)

Un navigateur ne peut pas lire une page d'un autre domaine. Pour scanner un site externe, lancez le service de scan dans un second terminal :

```sh
npx playwright install chromium   # une seule fois
npm run scan-server               # http://127.0.0.1:3001
```

Le serveur de développement redirige `/api` vers ce service. Sans lui, seules les URLs du même domaine que l'application sont scannables, et l'interface explique comment le démarrer. Variables d'environnement, déploiement et sécurité : [docs/AUTOMATED_SCANNING.md](docs/AUTOMATED_SCANNING.md).

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification des types (`vue-tsc`) puis build de production |
| `npm run preview` | Prévisualiser le build |
| `npm run type-check` | Vérification des types seule |
| `npm run test:unit` | Tests unitaires (Vitest, mode watch) ; `npx vitest run` pour une exécution unique |
| `npm run scan-server` | Service de scan (Playwright + axe-core) |
| `npm run dev:all` | Lance le front et le service de scan en parallèle |

## Structure

```
src/
  components/   audit/, criteria/, layout/, report/, summary/
  data/         initialCriteria.ts (liste des critères)
  router/       routes (vues chargées à la demande)
  stores/       auditStore.ts (Pinia, source de vérité)
  types/        Audit, CriterionResult, Criterion
  utils/        storage, indexedDbStorage, accessibilityScanner, exports, calculateSummary, url
  views/        Home, AuditCreate, AuditDetail, AuditSummary, AuditReport
server/         service de scan (index.mjs) et garde SSRF (ssrf.mjs)
tests/unit/     Vitest + @vue/test-utils
docs/           AUTOMATED_SCANNING.md
```

## Documentation

- [AGENTS.md](AGENTS.md) : architecture, conventions et pièges, destiné aux contributeurs et aux assistants de code.
- [docs/AUTOMATED_SCANNING.md](docs/AUTOMATED_SCANNING.md) : scan automatique (modes, service, variables, sécurité, limites).

## Ajouter ou modifier un critère

Éditer `src/data/initialCriteria.ts`. Les audits déjà enregistrés sont complétés automatiquement au chargement : les nouveaux critères y apparaissent en « non testé ». Si une règle axe correspond au critère, l'ajouter dans `axeRuleToCriterion` (`src/utils/accessibilityScanner.ts`) ; un test vérifie que chaque critère référencé existe.
