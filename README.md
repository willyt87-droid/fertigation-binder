# The Fertigation Binder

Independent **product clone** of a greenhouse-tablet fertigation binder. This repository is **not** the live pilot and must not be pointed at the pilot database.

v1 is a mobile-first PWA: site gate, rooms, flower cycles, and feed/runoff collections. It starts with **empty data** for any grow — no pre-seeded rooms, entries, or customer name.

## What this is vs the pilot

| | This app | Live pilot |
|---|---|---|
| Purpose | New product you can run for any grow | Existing in-use binder |
| Database | New empty Supabase project you create | Do not connect here |
| Branding | The Fertigation Binder (droplet) | Do not copy operator branding |
| First run | You name the site, set a PIN, add rooms | Already has production data |

v1 does **not** include Service/PM, Vitalite Cubes, Archive/CSV, calculators, or charts.

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

On first launch the app asks for a Supabase URL and anon key and stores them in **localStorage only**. They are never committed.

## Create an empty Supabase project

1. In [Supabase](https://supabase.com), create a **new** project. Wait until it is ready.
2. Open **SQL Editor** and run [`supabase/migrations/20260829143600_init.sql`](supabase/migrations/20260829143600_init.sql). That creates `sites`, `rooms`, `cycles`, and `entries` and enables RLS so the **anon** key can read/write **only those four tables**.
3. Project Settings → API: copy the project URL and the **anon public** key (never the service_role key).
4. Open the app, paste URL + anon key, save.

If you use the CLI against this new project:

```bash
supabase db query -f supabase/migrations/20260829143600_init.sql
```

The schema is compatible with the pilot table shapes (`sites.id` is text; flower entries are filtered by `date >= cycle.start_date` and have **no** `cycle_id`). Compatibility is not a reason to share the pilot project.

## Using the binder

1. **Gate** — create a site (name, location, 4-digit PIN). No rooms exist until you add them.
2. **Join the Binder** — sheet copy: “Email to join the binder and start collections.” The button **Email the Fertigation Binder** copies that sentence; there is no `mailto:` link.
3. After PIN unlock, the session stays until you tap **SITES** (clears session).
4. **Overview** — Flower group and Mom/Veg group, plus Add room (`flower` \| `mom` \| `veg`, `max_zones`).
5. **Flower rooms** — start a cycle (date + confirm). Stage from cycle day: Early 1–21 (green), Mid Bulk 22–42 (blue), Late 43+ (purple).
6. **Room page** — entries for the active cycle only. Add/edit: date, zone, cultivar, feed mL/pH/EC, runoff mL/pH/EC, tech initials, notes.

Bands: feed pH 5.8–6.2, RO pH 5.3–6.3, feed mL Early 1800–2880 / Mid 2100–4680 / Late 2100–3800. RO% = runoff / feed × 100. Green in range, orange high, red low.

Chrome: droplet + title + site name (no dropdown) · **SITES** · small clock. Footer: Overview only.

## Stack

Vite + React + TypeScript, vanilla CSS, `@supabase/supabase-js`, PWA (manifest + service worker). Deployable on Netlify as an SPA.
