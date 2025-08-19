# Old Rectory Household OS

Private household OS built with 11ty (UI), Netlify Functions (API), and Supabase (DB/Storage).

Source of truth: `docs/PROJECT_REQUIREMENTS.md`.

## Phase 0

- Scaffolded project with 11ty, Netlify, TypeScript, ESLint, Prettier, Vitest.
- Minimal index page with login form.
- Auth login/logout function stubs.
- Migration runner and initial migration file.

## Run locally

1. Copy `.env.example` to `.env` and fill values.
2. Install deps and start dev server:

```sh
npm install
npm run dev
```

## Scripts

- `npm run build` – build 11ty site to `_site/`.
- `npm run dev` – run Netlify dev (proxies 11ty and functions).
- `npm run migrate` – apply SQL migrations from `scripts/migrations`.

## Env vars

See `.env.example` for required variables.

## Functions

Functions live in `netlify/functions`. Contracts follow `docs/PROJECT_REQUIREMENTS.md`.

## Migrations

SQL files in `scripts/migrations`. Apply via `npm run migrate`.
