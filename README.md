# The Fertigation Binder

Independent **product clone** of a greenhouse-tablet fertigation binder. This repository is **not** the live pilot and must not be pointed at the pilot database.

v1 is a mobile-first PWA: owner onboarding, facility cards, floor PIN logging, flower cycles, and feed/runoff collections. It starts with **empty data** for any grow — no pre-seeded rooms, entries, or customer name.

## What this is vs the pilot

| | This app | Live pilot |
|---|---|---|
| Purpose | New product you can run for any grow | Existing in-use binder |
| Database | New empty Supabase project you create | Do not connect here |
| Branding | The Fertigation Binder (droplet) | Do not copy operator branding |
| First run | Owner sets up facilities; floor uses PIN | Already has production data |

v1 does **not** include Service/PM, Vitalite Cubes, Archive/CSV, calculators, charts, or live AROYA pulls.

## Auth model

Two sessions, one project:

1. **Owner (email magic link)** — Supabase Auth. Creates/edits facilities, rooms, floor PIN hash, and target bands. Settings never appear on the floor path.
2. **Floor (4-digit PIN)** — tablet unlock into Overview and logging only. `check_floor_pin(site_id, pin_hash)` compares a SHA-256 hash stored on `sites.pin_hash`. The anon key can read facility cards (not `pin_hash`) and read/write `cycles` + `entries`. Treat the anon key as a grow-local credential, not a public internet secret. One Supabase project per binder.

Floor techs do **not** need accounts.

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

On first launch the app asks for a Supabase URL and anon key and stores them in **localStorage only**. They are never committed. Enable Email auth (magic link) on that project.

## Create an empty Supabase project

1. In [Supabase](https://supabase.com), create a **new** project. Wait until it is ready.
2. Open **SQL Editor** and run both files, in order:
   - [`supabase/migrations/20260829143600_init.sql`](supabase/migrations/20260829143600_init.sql)
   - [`supabase/migrations/20260829160000_owner_onboarding.sql`](supabase/migrations/20260829160000_owner_onboarding.sql)
3. Authentication → Providers: Email enabled (magic link).
4. Project Settings → API: copy the project URL and the **anon public** key (never the service_role key).
5. Open the app, paste URL + anon key, save. Sign in as owner, then create a facility.

If you use the CLI against this new project:

```bash
supabase db query -f supabase/migrations/20260829143600_init.sql
supabase db query -f supabase/migrations/20260829160000_owner_onboarding.sql
```

The table shapes stay compatible with the pilot (`sites.id` is text; flower entries are filtered by `date >= cycle.start_date` and have **no** `cycle_id`). Compatibility is not a reason to share the pilot project.

## Using the binder

1. **Connect** — paste a new project URL + anon key.
2. **Owner** — magic link, then wizard: facility (name, location, floor PIN) → rooms (optional) → targets.
3. **SITES** — one card per facility (not a single hardcoded grow). Floor: tap card, enter PIN. Owner: Settings on the card.
4. **Join the Binder** — “Email to join the binder and start collections.” Button **Email the Fertigation Binder** copies that sentence; no `mailto:`.
5. Floor session lasts until **SITES**.
6. **Overview** — Flower and Mom/Veg groups. Room add/remove/reorder is owner settings, not the floor tablet.
7. **Flower rooms** — start a cycle. Stage: Early 1–21 (green), Mid Bulk 22–42 (blue), Late 43+ (purple).
8. **Room page** — active-cycle entries. Add/edit: date, zone, cultivar, feed mL/pH/EC, runoff mL/pH/EC, tech initials, notes. Target chips for substrate/irrigation when those ranges are set.

Default logging bands (editable per facility, never constants in the UI): feed pH 5.8–6.2, RO pH 5.3–6.3, feed mL Early 1800–2880 / Mid 2100–4680 / Late 2100–3800. RO% = runoff / feed × 100. Green in range, orange high, red low. Substrate defaults (typical, not a rule): field capacity 45–65% coco, dryback 15–25%.

Chrome: droplet + title + site name (no dropdown) · **SITES** · small clock. Footer: Overview only.

## AROYA (plan only)

v1 does **not** call `https://api.aroya.io`. Facility settings → Integrations stores an optional API key in localStorage and maps this facility / rooms to AROYA ids. Status is **Not connected** or **Key saved (not pulling yet)**. Copy: “Key from AROYA support. We only read. Live pull comes in a later release.”

Read-only endpoints we will use later (listed in unused `src/lib/aroyaClient.ts`):

- `GET /public_api/validate/`
- `GET /public_api/facilities/`
- `GET /public_api/rooms/`
- `GET /public_api/devices/`
- `GET /public_api/rooms/{id}/chart/` and `GET /public_api/devices/{id}/chart/`

Swagger: https://api.aroya.io/public_api/swagger/

## Stack

Vite + React + TypeScript, vanilla CSS, `@supabase/supabase-js`, PWA (manifest + service worker). Deployable on Netlify as an SPA.
