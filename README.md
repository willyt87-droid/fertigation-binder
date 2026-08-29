# The Fertigation Binder

Independent **product clone** of a greenhouse-tablet fertigation binder. This repository is **not** the live pilot and must not be pointed at the pilot database.

v1 is a mobile-first PWA: owner onboarding, facility cards, floor PIN logging, flower cycles, and feed/runoff collections. It starts with **empty data** for any grow — no pre-seeded rooms, entries, or customer name. The product operator (WT) is a platform admin, not a facility owner.

## What this is vs the pilot

| | This app | Live pilot |
|---|---|---|
| Purpose | New product you can run for any grow | Existing in-use binder |
| Database | New empty Supabase project you create | Do not connect here |
| Branding | The Fertigation Binder (droplet) | Do not copy operator branding |
| First run | Owner sets up facilities; floor uses PIN after admin approval | Already has production data |

v1 does **not** include Service/PM, Vitalite Cubes, Archive/CSV, calculators, charts, live AROYA pulls, billing, or Curaleaf-specific flows.

## Auth model

Three roles, one project:

1. **Platform admin (email magic link, allowlist)** — WT, the product operator. Sign in at `/admin` (or owner sign-in with an allowlisted email). Lands on the newcomers dashboard. Never sent through facility onboarding and must not create a facility.
2. **Owner (email magic link)** — Creates/edits facilities, rooms, floor PIN hash, and target bands. New facilities start **pending**. Settings never appear on the floor path.
3. **Floor (4-digit PIN)** — Tablet unlock into Overview and logging only. Unlock works only while the facility status is **active**. `check_floor_pin(site_id, pin_hash)` compares a SHA-256 hash on `sites.pin_hash` and requires `status = 'active'`. Treat the anon key as a grow-local credential, not a public internet secret.

Floor techs do **not** need accounts.

### How WT logs in as admin

1. Connect the app to an empty project that has all migrations in `supabase/migrations/` applied (see below).
2. Open **`/admin`**.
3. Email a magic link from the operator sign-in screen. The first allowlisted address is **`willyt87@gmail.com`** (seeded in `platform_admins`). Extra operators: `INSERT` their email into `public.platform_admins` and/or set `VITE_PLATFORM_ADMIN_EMAILS` (comma-separated) so the client also routes them to `/admin`.
4. After the link, WT sees the newcomers queue (empty until an owner creates a facility). Approve / pause / remove from here. **View as owner** opens that grow’s owner dashboard on the operator session (rooms, cycles, targets, collections, settings) with a “Viewing as owner” banner. It is not the floor PIN path and does not write collections as a tech.

If WT uses **Owner sign-in** on `/app` with an allowlisted email, the app skips onboarding and redirects to `/admin`.

### How an owner signs up

1. Connect the same project (URL + anon key).
2. From the site gate, **Start owner signup** (or **Owner sign-in** if you already have an account) → magic link (any non-admin email).
3. Wizard: email → facility (name, location, floor PIN) → rooms (optional) → targets. The facility is created as **pending**.
4. Owner can finish setup in Settings. Floor PIN does **not** unlock until a platform admin sets status to **active**. Pause locks the PIN again without impersonating the owner.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm install
npm run build
```

Then `npm run preview` or deploy `dist/` (Netlify uses `netlify.toml`).

The public `/app` gate uses the Binder product project by default. Operators can point a local or staging copy at another empty project from **`/admin`** or **`/app#reconnect`** (URL + anon key stay in **localStorage** on that device). Enable Email auth (magic link) on that project.

Optional local stub (no Supabase project) for UI checks:

```bash
node scripts/local-api.mjs
```

Then paste `http://127.0.0.1:8787` and any anon key such as `local`. Use **Continue on local mock** on the sign-in screens (`willyt87@gmail.com` → `/admin` empty queue; any other email → owner wizard).

## Create an empty Supabase project

1. In [Supabase](https://supabase.com), create a **new** project. Wait until it is ready.
2. Open **SQL Editor** and run the files in `supabase/migrations/`, in order:
   - [`supabase/migrations/20260829143600_init.sql`](supabase/migrations/20260829143600_init.sql)
   - [`supabase/migrations/20260829160000_owner_onboarding.sql`](supabase/migrations/20260829160000_owner_onboarding.sql)
   - [`supabase/migrations/20260829180000_platform_admin.sql`](supabase/migrations/20260829180000_platform_admin.sql)
   - [`supabase/migrations/20260829210000_contact_requests.sql`](supabase/migrations/20260829210000_contact_requests.sql)
   - [`supabase/migrations/20260829233000_operator_view_as_owner.sql`](supabase/migrations/20260829233000_operator_view_as_owner.sql)
3. Authentication → Providers: Email enabled (magic link).
4. Project Settings → API: copy the project URL and the **anon public** key (never the service_role key).
5. Open **`/app#reconnect`** (operator only), paste URL + anon key, save. Admins go to `/admin`. Owners use **Start owner signup**, then create a facility.

If you use the CLI against this new project:

```bash
supabase db query -f supabase/migrations/20260829143600_init.sql
supabase db query -f supabase/migrations/20260829160000_owner_onboarding.sql
supabase db query -f supabase/migrations/20260829180000_platform_admin.sql
supabase db query -f supabase/migrations/20260829210000_contact_requests.sql
supabase db query -f supabase/migrations/20260829233000_operator_view_as_owner.sql
```

Do **not** apply these to the Ravena pilot project (`rbgzpwfozpuddtzlqkte`) or any other live database.

The table shapes stay compatible with the pilot (`sites.id` is text; flower entries are filtered by `date >= cycle.start_date` and have **no** `cycle_id`). Compatibility is not a reason to share the pilot project.

Row-level security: platform admins can `SELECT` every facility, room, cycle, and entry, and may edit facility/room settings. Owners only their own. Floor (anon) only **active** facility cards. A random owner cannot open another grow via view-as-owner. Status changes and kicks run as the admin session. Operators do not write floor collections.

## Using the binder

1. **Connect** — public visitors use the product project. Operators paste URL + anon key only at `/app#reconnect`.
2. **Owner** — **Start owner signup**, magic link, then wizard: facility (name, location, floor PIN) → rooms (optional) → targets. Status starts pending.
3. **Admin** — `/admin` newcomers queue: owner email, name/location, created at, room count, status, last collection. Approve so floor PIN works; pause to lock it; **View as owner** to inspect the same dashboard the owner sees after magic-link (pending grows included); remove to delete the grow.
4. **SITES** — one card per facility the current role can see. Floor: tap card, enter PIN (active only). Owner: Settings on the card (works while pending).
5. **Start owner signup** on the site gate opens the same owner-setup magic-link flow as `/app#signup`. **Owner sign-in** is for returning owners. The connection form and **Change connection** stay on `/admin` or `/app#reconnect` (operator only).
6. Floor session lasts until **SITES**.
7. **Overview** — Flower and Mom/Veg groups. Room add/remove/reorder is owner settings, not the floor tablet.
8. **Flower rooms** — start a cycle. Stage: Early 1–21 (green), Mid Bulk 22–42 (blue), Late 43+ (purple).
9. **Room page** — active-cycle entries. Add/edit: date, zone, cultivar, feed mL/pH/EC, runoff mL/pH/EC, tech initials, notes. Target chips for substrate/irrigation when those ranges are set.

Default logging bands (editable per facility, never constants in the UI): feed pH 5.8–6.2, RO pH 5.3–6.3, feed mL Early 1800–2880 / Mid 2100–4680 / Late 2100–3800. RO% = runoff / feed × 100. Green in range, orange high, red low. Substrate defaults (typical, not a rule): field capacity 45–65% coco, dryback 15–25%.

Chrome: droplet + title + site name (no dropdown) · **SITES** · small clock. Footer: Overview only. Admin chrome uses the same dark greenhouse tablet with neon-blue accents.

## AROYA (plan only)

v1 does **not** call `https://api.aroya.io`. Facility settings → Integrations stores an optional API key in localStorage and a boolean `sites.aroya_key_saved` so admins can see whether a key exists. Status is **Not connected** or **Key saved (not pulling yet)**. Copy: “Key from AROYA support. We only read. Live pull comes in a later release.”

Read-only endpoints we will use later (listed in unused `src/lib/aroyaClient.ts`):

- `GET /public_api/validate/`
- `GET /public_api/facilities/`
- `GET /public_api/rooms/`
- `GET /public_api/devices/`
- `GET /public_api/rooms/{id}/chart/` and `GET /public_api/devices/{id}/chart/`

Swagger: https://api.aroya.io/public_api/swagger/

## Public product pages

Indexable HTML (not the app shell). `robots.txt` and `sitemap.xml` list only these four URLs:

- `/` — marketing home. Title is **The Fertigation Binder | Log feed and runoff by room**. H1 is “The tablet on the greenhouse floor.” Binder promo (free through December 31, 2026) plus a short Binder / Floor / Link / House strip. CTA is **Start owner signup** at `/app#signup`.
- `/pricing` — product ladder. Binder is live and free through December 31, 2026, then **$49/facility/month**. Floor $149 and Link $249 are coming. House is a custom quote. No Stripe.
- `/privacy` — what the binder stores (fertigation logs, facility/room config, optional local keys, magic-link email). Grower data is not sold.
- `/terms` — owner / floor / operator rules and the per-facility subscription.

The binder app (connect, gate, owner wizard, floor tablet) lives at **`/app`**. First-run “Connect this binder” is not the public home. `/admin` is unchanged (platform operator only). Gate and connect screens still link Privacy, Terms, and Pricing.

## Stack

Vite + React + TypeScript, vanilla CSS, `@supabase/supabase-js`, PWA (manifest + service worker). Deployable on Netlify as an SPA.
