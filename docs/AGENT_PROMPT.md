Agent Kickoff Prompt — Old Rectory Household OS

Role: You are the coding agent. You will scaffold, build, and iteratively extend
the Old Rectory Household OS. Source of truth: /docs/PROJECT_REQUIREMENTS.md.
Phased approach: Implement in phases. Deliver small, vertical slices with
working code, migrations, functions, and minimal UI for each step.

🔑 Phase Order (follow strictly)

Phase 0 — Project Setup

Initialise project structure:

/src (11ty) /netlify (functions) /scripts (migrations, seeders) /docs

Add eleventy.config.js baseline.

Add .gitignore with node_modules/, .env.

Create .env.example with required vars.

Configure Prettier + ESLint + Vitest.

Scaffold migration runner (Node script).

Create netlify.toml with dev proxy.

Phase 1 — MVP Features

Implement auth (login/logout with cookie).

Implement upload.sign.

Implement rooms.upsert + list + 11ty UI.

Implement assets.upsert + list + asset.photos.add + 11ty UI.

Implement tasks.create/list/complete + dashboard view.

Implement documents.add/list with “expiring soon” filter.

Implement garden.area.upsert + garden.plantings.add/list.

Implement contacts.upsert/list + service-records.create.

Implement voice.to_tasks using Whisper.

Implement schedule.daily-digest (Netlify Scheduled Function).

Ensure migrations exist for all tables.

Phase 2 — Enhancements

Garden enhancements (success ratings, comparisons).

QR code generation for assets/rooms.

Knowledge base pages.

iCal feed for tasks.

Finance lite (optional).

UX polish.

Phase 3 — Visual Shopping (optional, feature-flagged)

Implement asset.identify (OCR + Bing Visual Search).

Add to asset detail UI.

Persist results in product_matches.

📋 General Rules

Use TypeScript in Netlify Functions.

Validate all inputs with zod.

Use Supabase JS client with SERVICE_ROLE_KEY (server-side only).

Do not expose Supabase keys to the client.

Always derive household_id from session cookie/JWT.

Write migrations idempotently.

Add unit tests for logic (Vitest).

Keep endpoints small and composable.

Update README.md with new endpoints, migrations, and usage instructions after
each phase.

🚦 First Tasks (Phase 0 Checklist)

Scaffold base repo with the folder structure.

Add .gitignore, .env.example, Prettier, ESLint.

Initialise 11ty with a simple landing page.

Add Netlify function auth.login.ts (stub) and auth.logout.ts.

Add Node migration runner + create 001_init.sql migration for households and
app_users.

Commit everything.

✅ Acceptance Criteria for Each Deliverable

Code compiles with no errors.

netlify dev runs with working endpoints.

New migrations apply cleanly without dropping data.

Endpoint contracts match those defined in /docs/PROJECT_REQUIREMENTS.md.

UI pages render in 11ty and fetch via Netlify Functions.

Tests for input validation and at least one integration smoke test.

Documentation updated (README.md + .env.example).

🧠 Tips for the Agent

Prefer vertical slice over horizontal plumbing: Example: build rooms.upsert
endpoint + DB migration + tiny UI page in one go before moving on.

Use server-side rendering (11ty), no heavy front-end frameworks.

For forms: vanilla HTML + small Alpine.js or htmx if needed, but keep minimal.

Use fetch → Netlify Functions → Supabase, never direct Supabase calls.

For images/docs: use signed URLs (expiry ≤ 10 min).

For audio transcription: accept multipart form, call OpenAI Whisper API with
OPENAI_API_KEY.

🔒 Security Checklist

Session cookie: HTTP-only, Secure, 12h expiry.

Validate MIME type and size on uploads.

Signed URLs: 10 min expiry.

No env vars hardcoded in repo.

Input validation everywhere.

Reject unauthenticated requests.

Rate-limit login attempts.

End of document.
