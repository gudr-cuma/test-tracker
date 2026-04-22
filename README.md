# Test Tracker

Petite app web pour suivre l'exécution de cahiers de test rédigés en markdown.

- Import de cahiers markdown rejouable (diff interactif)
- Statut par exécution (`à faire`, `en cours`, `fait`, `bug`, `en pause`, `clos`)
- Commentaires au niveau du cas **et** du run
- Ajout manuel de cas hors markdown
- Dashboards Recharts (donut statut, barres par famille, cumulatif)

## Stack

- Vite + React 18+ + Zustand + Tailwind + Recharts
- Cloudflare Pages + Pages Functions (serverless)
- Cloudflare D1 (SQLite serverless) comme base
- Auth : Cloudflare Access (OTP email)
- Tests : Vitest

## Commandes

```bash
npm install           # installe les deps
npm run dev           # Vite dev server (front uniquement)
npm run build         # build prod
npm run pages:dev     # Pages Functions + D1 local (après build)
npm test              # Vitest run
```

## Setup Cloudflare (à faire une fois)

Voir `docs/CLOUDFLARE_SETUP.md`.

## Structure

```
src/
  components/    # UI (layout, plans, import, cases, runs, comments, dashboard, shared)
  engine/        # Logique pure (parseMarkdown, diffCases, formatUtils)
  api/           # Wrappers fetch
  store/         # Zustand
functions/
  _middleware.js # Auth + D1 binding injection
  api/           # Routes serverless
migrations/      # Schémas D1
```
