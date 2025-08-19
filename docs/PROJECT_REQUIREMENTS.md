Old Rectory Household OS — Functional Project Requirements

Stack: 11ty (UI) + Netlify Functions (API) + Supabase (DB + Storage) Security
model: Private app for Mark & Ann. No direct client → Supabase access. All
secrets stay in Netlify env vars. Audience: UK household context (North
Somerset).

0. Agent Instructions (read me first)

Agent: Treat this document as the source of truth. Implement phases in order:
Phase 0 → Phase 1 (MVP) → Phase 2 → Phase 3. Use TypeScript for Netlify
Functions. Keep secrets in env vars. No Supabase keys in the browser. Prioritise
small vertical slices: endpoint + minimal UI + tests + docs.

Deliverables per feature:

DB migration SQL (idempotent).

Netlify Function(s) with zod validation and JWT/cookie auth.

Minimal 11ty page(s) or widgets.

Unit tests for pure logic; integration smoke test for functions.

README snippet: how to run locally, env vars used.

1. Project Goals

A private household operating system for a large country house & 1-acre garden.

Capture rooms, assets, tasks, contacts, documents; schedule maintenance; garden
logging.

Voice capture → tasks (Whisper).

“How the house works” guide and (later) a printable/guest view.

2. Scope (v1–v3)

In scope (v1–v3):

Room & Asset register with photos.

Tasks with due dates, recurrence, completion.

Garden logs (simple first, richer later).

Contacts (trades) & service records.

Documents (manuals, warranties, certificates) with expiry reminders.

Daily summary page + scheduled email.

Auth (private) and secure file uploads.

Phase 3: Visual shopping for replacements (image-based lookup) — optional
feature switch.

Out of scope (for now):

Multi-tenant SaaS, public accounts, payments.

Complex role hierarchies.

Direct Supabase client SDK in browser.

3. Personas & Core User Stories

Mark (Owner/Admin)

“As Mark, I want to add a room with dimensions and photos so I can track assets
inside it.”

“As Mark, I want to record a task (‘paint south windows’) with a due date and
recurrence so I don’t forget.”

Ann (Owner/Admin)

“As Ann, I want a simple Today view listing due/overdue tasks and seasonal
jobs.”

“As Ann, I want to upload a PDF warranty and be reminded before expiry.”

Guest (read-only, future)

“As a guest, I want a short ‘How the house works’ guide.”

4. Non-Functional Requirements

Security: HTTP-only, SameSite=Lax, Secure cookie; input validation; upload type
& size limits; signed URLs ≤ 10 minutes.

Performance: API p95 < 400ms. Images lazily loaded.

Reliability: Scheduled jobs idempotent.

Accessibility: Semantic HTML; keyboard navigable; labels for inputs.

Auditability: Log mutating actions with user id + timestamp.

5. Environment Variables (Netlify) SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=... JWT_SECRET=long-random-string
   HOUSEHOLD_SLUG=old-rectory
   ALLOWED_EMAILS=dr.mark.oconnor@googlemail.com,ann@example.com

# Phase 1 voice

OPENAI_API_KEY=...

# Phase 3 visual shopping (feature-flagged)

FEATURE*VISUAL_SHOPPING=false AZURE_BING_VSEARCH_KEY=...
AZURE_BING_VSEARCH_ENDPOINT=... AZURE_CV_KEY=... # or GCP_VISION*\*

6. Data Model (Supabase) — Summary

Agent: create SQL migrations to define these tables with relevant FKs and
indexes.

households(id, slug, name, created_at)

app_users(id, email, display_name, role, created_at)

user_households(user_id, household_id)

rooms(id, household_id, name, floor, dimensions, notes, created_at)

assets(id, household_id, room_id, name, category, serial_no, purchase_date,
purchase_price, supplier, warranty_expiry, manual_url, notes, created_at)

asset_photos(id, household_id, asset_id, storage_path, caption, created_at)

tasks(id, household_id, room_id, asset_id, title, description, priority,
due_date, recurrence, status, created_by, created_at, completed_at)

garden_areas(id, household_id, name, notes)

plantings(id, household_id, area_id, crop, variety, action, date, quantity,
success_rating, notes)

contacts(id, household_id, name, role, phone, email, notes)

service_records(id, household_id, asset_id, contact_id, date, cost, summary,
invoice_storage_path)

documents(id, household_id, title, doc_type, related_asset, storage_path,
expiry_date, notes, uploaded_at)

Phase 3 addition:

product_matches(id, household_id, asset_id, created_at, ocr_text,
detected_brand, detected_model, vision_confidence, best_title, best_image_url,
best_product_url, best_price, best_currency, offers jsonb, notes)

RLS: Not required initially (service-role in backend). If you later expose
Supabase to client, add strict RLS per household_id.

7. Storage Buckets (Supabase)

photos (private: false → No, keep private)

docs (private: true)

Use signed URLs (≤ 10 minutes) for upload/download via functions.

8. API (Netlify Functions) — Contracts

Agent: Use TypeScript; validate with zod. Always verify cookie → JWT using
JWT_SECRET. Derive household_id from session.

Auth

POST /.netlify/functions/login

Body: { email, passphrase } (for now: check ALLOWED_EMAILS + single passphrase
stored in env or hashed constant).

Resp: 204 + sets session HTTP-only cookie containing { user_id, household_id }.

POST /.netlify/functions/logout

Clears cookie.

Uploads

POST /.netlify/functions/upload.sign

Body: { bucket: 'photos'|'docs', path_hint?: string, contentType: string }

Resp: { signedUrl, storage_path }

Rooms

POST /.netlify/functions/rooms.upsert

Body: { id?, name, floor?, dimensions?, notes? }

Resp: room

GET /.netlify/functions/rooms.list

Resp: room[]

Assets

POST /.netlify/functions/assets.upsert

Body: { id?, room_id?, name, category?, serial_no?, purchase_date?,
purchase_price?, supplier?, warranty_expiry?, manual_url?, notes? }

GET /.netlify/functions/assets.list?room_id?&q?&category?

POST /.netlify/functions/asset.photos.add

Body: { asset_id, storage_path, caption? }

Tasks

POST /.netlify/functions/tasks.create

Body: { title, description?, priority?('low'|'normal'|'high'), due_date?,
recurrence?, room_id?, asset_id? }

POST /.netlify/functions/tasks.complete

Body: { id }

GET /.netlify/functions/tasks.list?status?&due_before?&q?

Garden

POST /.netlify/functions/garden.area.upsert { id?, name, notes? }

POST /.netlify/functions/garden.plantings.add { area_id?, crop, variety?,
action, date, quantity?, success_rating?, notes? }

GET /.netlify/functions/garden.calendar?from=&to=

Contacts & Service

POST /.netlify/functions/contacts.upsert

POST /.netlify/functions/service-records.create

GET /.netlify/functions/contacts.list

Documents

POST /.netlify/functions/documents.add { title, doc_type, related_asset?,
storage_path, expiry_date?, notes? }

GET /.netlify/functions/documents.list?doc_type?&expiring_within_days?

Search

GET /.netlify/functions/search?q= → federated search across rooms, assets,
tasks, contacts, documents.

Voice → Tasks (Phase 1)

POST /.netlify/functions/voice.to_tasks (multipart audio)

Resp: { tasks_created: number, items: [{ title, due_date?, notes? }] }

Scheduled (cron)

GET /.netlify/functions/schedule.daily-digest (invoked by Netlify Scheduled
Functions @ 07:00 Europe/London)

Generates Today page and sends optional email.

Phase 3 — Visual Shopping (Feature Flag)

POST /.netlify/functions/asset.identify { asset_id, photo_paths: string[] }

Resp: best match + offers; persists product_matches.

9. 11ty UI — Pages & Components

Minimal, clean, accessible. No client-side Supabase. Fetch via functions.

Dashboard (/)

Today’s tasks (due/overdue), next 7 days, expiring documents (60 days), seasonal
garden hints.

Rooms (/rooms)

List → Add/Edit Modal → Room detail (dimensions, photos, assets, open tasks).

Assets (/assets)

Filter by category/warranty status; add asset; attach photos; link manual.

Tasks (/tasks)

Create; list; complete; filters (status, due_before, priority).

Garden (/garden)

Areas list; add planting; month view (from/to).

Contacts (/contacts)

Tradespeople list; add contact; reliability notes.

Documents (/documents)

Add doc (upload via signed URL); list; expiring soon tab.

Knowledge (/knowledge)

“How the house works” (editable markdown entries hosted in repo or DB; start
with repo).

Settings (/settings)

(Private) Show logged-in email; sign out; feature flags display.

Phase 2 UI add-ons

QR Labels: small page to generate QR for selected asset/room (server-side
generate PNG/SVG).

iCal feed: read-only ICS for tasks (next 60 days).

Phase 3 UI add-ons

Identify & Replace button on Asset detail (behind feature flag).

Results card with best match and UK offers.

10. Phase Plan & Acceptance Criteria Phase 0 — Project Setup (Foundations)

Netlify configured; env vars set; .env.example committed.

Supabase project; migrations runner script.

Auth: simple login with ALLOWED_EMAILS + passphrase → HTTP-only cookie.

AC: Can log in locally; 11ty renders a “Hello, Mark” protected page.

Phase 1 — MVP (Basics first)

Rooms & Assets

Create/list rooms; add assets to a room; upload photos using signed URLs.

AC: I can create a room “Study”, add “Smeg fridge” to Kitchen, attach a JPG, and
see it in the UI.

Tasks

Create/list/complete tasks; due date & priority; link to room/asset.

AC: “Paint south windows” appears on dashboard when due, then disappears on
completion.

Contacts & Service Records

Add trades; create a service record linked to an asset/contact with cost.

AC: I can see last service date & cost for a given boiler.

Documents

Upload doc; list; “expiring soon” filter.

AC: Docs expiring in less than 60 days appear in a special section.

Garden (Simple)

Areas; add plantings (action/date/notes).

AC: I can log “Runner beans — sowed 2 rows in Bed A on 2025-03-20”.

Voice → Tasks

Upload m4a/wav; Whisper transcribes; simple parser creates tasks.

AC: Saying “paint windows next month; call tree surgeon Friday” produces two
tasks with dates.

Daily digest

Scheduled function creates a “Today” page and (optional) emails summary.

AC: At 07:00 Europe/London a digest is generated; manual trigger works.

Phase 2 — Enhancements (Quality of life)

Garden Planner++: success ratings; month view; last-year comparisons.

QR Codes: generate QR for assets/rooms linking to detail.

Knowledge Base: “How the house works” (routing: /how-to/<slug>).

iCal Feed: read-only ICS for tasks (next 60 days).

Finance Lite: optional: add cost totals per year (repairs, gardening).

AC: Scanning a QR on the boiler opens the asset page; Calendar subscribes to
tasks; last year’s runner bean outcome visible.

Phase 3 — Visual Shopping (Feature Flag)

Identify & Find Replacements: upload item photos → OCR + Bing Visual Search → UK
offers.

AC: For a distinct brand/model lamp, return ≥1 UK retailer with price and link;
persist match.

11. Scheduled Jobs (Netlify)

Daily 07:00 Europe/London:

Build “Today” page; email summary; flag tasks due/overdue; docs expiring in 60
days.

Weekly Monday 08:00:

Garden seasonal tips for next 14 days (UK context).

Monthly 01:00:

Compact logs, rotate old signed URLs (security hygiene).

12. Security & Privacy

No Supabase keys in client bundle. Only functions use SERVICE_ROLE_KEY.

Session cookie: HTTP-only, Secure, 12h expiry; refresh on activity.

Upload: verify contentType; max 10MB; image/PDF only.

Signed URLs max 10 minutes; never store public URLs for private assets.

Log IP, route, user id for mutations (basic audit table optional).

Rate-limit sensitive endpoints (login, upload.sign).

13. Testing Strategy

Unit: Input validators (zod), date parsing, recurrence utility, text extraction
from Whisper output.

Integration (local): netlify dev + fake Supabase URL via test container or stub.

Contract tests: Ensure JSON schemas stable for front end.

Security tests: Reject unauthenticated; reject oversize uploads; reject
disallowed MIME.

14. Developer Experience

netlify dev to run functions; 11ty dev server proxied.

scripts/migrations/\*.sql with a small Node migration runner.

Prettier + ESLint. Lightweight Vitest for unit tests.

Minimal CI (Netlify) on PRs: build, run unit tests.

15. Folder Structure (proposed) /src # 11ty sources /\_data /components /styles
    index.njk rooms.njk assets.njk tasks.njk garden.njk contacts.njk
    documents.njk knowledge.njk /netlify /functions auth.login.ts auth.logout.ts
    upload.sign.ts rooms.upsert.ts rooms.list.ts assets.upsert.ts assets.list.ts
    asset.photos.add.ts tasks.create.ts tasks.complete.ts tasks.list.ts
    garden.area.upsert.ts garden.plantings.add.ts garden.calendar.ts
    contacts.upsert.ts contacts.list.ts service-records.create.ts
    documents.add.ts documents.list.ts search.ts voice.to_tasks.ts
    schedule.daily-digest.ts ical.feed.ts # Phase 2 qr.generate.ts # Phase 2
    asset.identify.ts # Phase 3 (guarded by FEATURE_VISUAL_SHOPPING) /scripts
    migrations/ seed/ docs/ PROJECT_REQUIREMENTS.md eleventy.config.js

16. Minimal JSON Contracts (examples)

tasks.create Request

{ "title": "Paint south windows", "priority": "high", "due_date": "2025-09-15",
"recurrence": "RRULE:FREQ=YEARLY;BYMONTH=9", "room_id": "uuid-or-null",
"asset_id": null }

Response → 200 OK returns full task row.

documents.list?expiring_within_days=60 Response

[ { "id": "uuid", "title": "Boiler Service Certificate", "doc_type":
"certificate", "expiry_date": "2025-10-31", "related_asset": "uuid",
"storage_path": "docs/....pdf" } ]

voice.to_tasks Response

{ "tasks_created": 2, "items": [ { "title": "Call tree surgeon", "due_date":
"2025-08-22" }, { "title": "Paint south windows", "due_date": "2025-09-30" } ] }

17. Knowledge Base (seed content)

Create /src/knowledge/\*.md with frontmatter:

---

title: Heating & Hot Water slug: heating

---

- Boiler model: ...
- Thermostat location: ...
- How to boost hot water: ...

18. Future Ideas Backlog (ordered)

Home Assistant integration (read-only status, optional control).

Weather hooks (Met Office DataHub) for frost/drought prompts.

OCR receipts → service records auto-extraction.

Image labelling to suggest asset categories from photos.

Finance dashboard (annual spend, trends).

Guest mode (read-only handbook; printable PDF).

iOS/Android wrapper (Capacitor) for better camera & offline.

19. First Milestone Checklist (Agent)

Migrations for households/users/rooms/assets/tasks/contacts/documents/storage
tables.

Auth: login/logout; session cookie.

upload.sign with content-type checking.

Rooms: upsert + list + UI.

Assets: upsert + list + add photo + UI.

Tasks: create/list/complete + dashboard view.

Documents: add/list + “expiring soon” filter.

Garden: areas + simple plantings + list.

Daily digest scheduled function + page render.

Voice → tasks function (basic Whisper) + tiny UI to upload audio.

README updates and .env.example.

20. Glossary

Household: Logical container (supports future second property).

Asset: Any physical item we want to track (appliance, furniture).

Document: PDFs/photos of manuals, warranties, certificates.

Planting: Garden event (sow, plant out, feed, prune, harvest).

End of document.
