# Project Research Summary

**Project:** Utilities Tracker
**Domain:** Personal home utility management (heating oil + electricity, single-user, manual entry)
**Researched:** 2026-05-09
**Confidence:** HIGH

## Executive Summary

This is a single-user, mobile-first CRUD and visualisation app. The domain is simple in data volume (fewer than 1,000 rows lifetime) but non-trivial in calculation correctness — the oil depletion prediction is the core value feature and breaks silently if built naively. The recommended approach is a single Next.js 15 App Router container using Server Actions for all mutations, Drizzle ORM over the existing PostgreSQL instance, and iron-session for a simple password-gated session. No separate API layer, no third-party services in v1. The app fits cleanly into the existing VPS Docker Compose setup with one Cloudflare Tunnel ingress rule added.

The most dangerous design decisions are date handling and oil depletion calculation. Dates stored as TIMESTAMP instead of DATE, combined with UTC Docker containers and UK DST transitions, cause silently incorrect data that is painful to fix after the fact. The depletion prediction must work on reading segments between purchase events — a naive slope across the full reading history produces nonsensical predictions whenever the tank is refilled. Both decisions must be made correctly in Phase 1 (schema) before any data is entered; retrofitting them is expensive.

The feature scope is well-defined and constrained. The oil empty-date countdown is the unique differentiator — no commercial app covers this gap for manual-entry heating oil users. Build oil features first (immediate high-anxiety value), electricity second, then the unified dashboard as the polish step. Everything deferred to v2 (litres conversion, temperature correlation, bill import) has low urgency and clear extension paths.

---

## Key Findings

### Recommended Stack

Next.js 15 App Router is the right choice: Server Actions eliminate a separate API layer, `output: 'standalone'` produces a slim Docker image (~200-300 MB), and it is consistent with other VPS projects. PostgreSQL 16 is already running on the VPS — no new infrastructure. Drizzle ORM is preferred over Prisma (Prisma's binary engine adds ~50 MB to the image; the 5-table schema does not justify it). Authentication uses iron-session (encrypted cookie, no session table) with bcryptjs for password hashing. Auth.js/NextAuth would add unnecessary OAuth plumbing for a single hardcoded password. Recharts is bundled automatically via `shadcn add chart`.

**Core technologies:**
- Next.js 15 (App Router): full-stack framework — Server Actions give type-safe mutations without REST endpoints
- PostgreSQL 16: primary datastore — already on VPS, no new infrastructure
- Drizzle ORM 0.45 + postgres.js 3.4: schema, queries, migrations — Docker-friendly (no native bindings), lighter than Prisma
- iron-session 8: encrypted cookie sessions — purpose-built for single-password apps
- bcryptjs 2: password hashing — pure-JS, works in Docker without build tools
- Zod 4 + react-hook-form 7 + @hookform/resolvers: form validation — one schema, validated on both client and server
- Recharts 3.8 (via shadcn chart): time-series graphs — bundled with shadcn, mobile-responsive
- date-fns 4: date arithmetic — use instead of raw `setDate()` to avoid month-boundary bugs
- shadcn/ui + Tailwind CSS 4: UI and styling — mandated by global conventions

### Expected Features

**Must have (table stakes for v1):**
- Manual data entry: oil readings (cm + date), oil purchases (date, litres, cost), electricity meter readings (kWh + date), electricity bills (month, kWh, cost)
- List views with edit and delete — users need to correct mistakes; absence makes the app worse than a spreadsheet
- Oil level chart (cm over time)
- Oil depletion rate and empty-date prediction — highest-anxiety use case, the unique differentiator
- Electricity usage and cost charts (monthly)
- Contract details storage and expiry alert — missing a renewal window is a known pain point
- Password-protected login
- Mobile-first layout with large tap targets

**Should have (differentiators):**
- Oil empty-date countdown on dashboard — "47 days of oil left" is immediately actionable
- Consumption rate display — "3 cm/day" contextualises seasonal efficiency
- Electricity cost-per-kWh trend — shows whether a variable tariff is actually changing
- Unified dashboard — single screen answering "am I OK?" for both utilities
- Contract details page with provider, unit rate, tariff type, and dates

**Defer to v2+:**
- Heating oil litres conversion — tank dimensions not yet known
- Temperature correlation charts — Open-Meteo API integration
- Automated bill ingestion (email/photo OCR) — high failure rate, weeks of complexity
- CSV import, year-over-year comparison, annotations on entries, push notifications

### Architecture Approach

Single Next.js container, no microservices. Server Components fetch data from PostgreSQL via Drizzle and pass serialisable props to Client Components (charts, forms). All mutations go through Server Actions co-located with route groups (`app/(app)/oil/actions.ts`, `app/(app)/electricity/actions.ts`). Auth uses a Route Handler for login/logout; every other route is protected by middleware reading the iron-session cookie. Calculation logic lives in pure TypeScript functions in `lib/calculations/` — no DB calls inside them, keeping them unit-testable. Two route groups: `(auth)` for the login page, `(app)` for the protected app with bottom nav bar.

**Major components:**
1. `lib/db/` — Drizzle schema (5 tables) + postgres.js client singleton; migrations via `drizzle-kit migrate` as a pre-start Docker step
2. `lib/calculations/oil.ts` — segment-based depletion rate, empty-date prediction, chart data builder (pure functions, no DB)
3. `lib/calculations/electricity.ts` — cost-per-kWh, monthly consumption, contract expiry check (pure functions, no DB)
4. `app/(app)/oil/` — oil overview page, log forms, history table, Server Actions
5. `app/(app)/electricity/` — electricity overview page, log forms, bill entry, contract form, Server Actions
6. `app/(app)/page.tsx` (Dashboard) — summary cards combining both domains; built last
7. Chart components — Recharts wrappers as Client Components with fixed px height for mobile

**5-table schema (no cross-domain FKs, all reading dates as DATE not TIMESTAMP):**
- `oil_readings`: id, read_at DATE, level_cm NUMERIC, note TEXT, created_at TIMESTAMPTZ
- `oil_purchases`: id, purchased_at DATE, litres NUMERIC, cost_gbp NUMERIC, note TEXT, created_at TIMESTAMPTZ
- `electricity_readings`: id, read_at DATE, reading_kwh NUMERIC, note TEXT, created_at TIMESTAMPTZ
- `electricity_bills`: id, bill_month DATE (1st of month), kwh_consumed NUMERIC, cost_gbp NUMERIC, note TEXT, created_at TIMESTAMPTZ
- `electricity_contract`: id, provider, tariff_name, contract_type, unit_rate_gbp, standing_charge_gbp, start_date DATE, expiry_date DATE, alert_days INTEGER, updated_at TIMESTAMPTZ

### Critical Pitfalls

1. **DATE vs TIMESTAMP for reading dates** — Use `DATE` columns throughout. Never call `new Date("2026-03-29").toISOString()` before inserting; pass the ISO date string directly to the SQL query. UK BST/GMT transitions cause off-by-one-day errors that silently corrupt depletion calculations. Also set `TZ=Europe/London` in the Docker Compose environment. Must be addressed in Phase 1 — painful to migrate after data exists.

2. **Oil depletion calculation across refill events** — A naive slope from first to last reading treats refills as negative consumption, producing predictions like "847 days" when the real answer is 45. Query only readings since the last purchase (`WHERE read_at > (SELECT MAX(purchased_at) FROM oil_purchases)`), require at least 2 readings in the current segment before showing a prediction, and sanity-check for a positive rate (tank appears to fill). Address in Phase 2.

3. **No deduplication logic on same-day readings** — Do not add `UNIQUE(read_at)` to reading tables (prevents corrections). Instead use `SELECT DISTINCT ON (read_at) ... ORDER BY read_at, created_at DESC` in all queries. Always include `created_at TIMESTAMPTZ DEFAULT NOW()` on every table. Address in Phase 1 (schema) and every data query.

4. **Postgres connection pool created per-route-handler** — Create the postgres.js client once in `lib/db/client.ts` as a module singleton, attached to `global` in development to survive hot-reload. Set `max: 5`. Without this the app hangs after ~10 requests. Address in Phase 1.

5. **Recharts mobile layout on iOS** — Use `<ResponsiveContainer width="100%" height={250}>` with a fixed pixel height (never percentage). Set `<Tooltip trigger="click" />` for touch interaction. Wrap charts in `touch-action: pan-y` CSS. Test on an actual mobile viewport before marking any chart feature complete.

---

## Implications for Roadmap

The dependency graph is clear: auth before any protected route; schema before calculations; calculations before charts; both utility domains before the dashboard. This dictates a 4-phase structure.

### Phase 1: Foundation — Infrastructure, Auth, Schema

**Rationale:** Everything else depends on this phase. Auth guards all routes. The schema defines what can be stored and the date/deduplication decisions made here cannot be cheaply changed later. Docker and tunnel config enables continuous deployment from day one.

**Delivers:** Working login/logout, deployed container on Cloudflare Tunnel, all 5 DB tables migrated, app shell with bottom nav, loading skeletons scaffolded.

**Addresses:** Password-protected login (table stakes), mobile layout shell.

**Must get right:**
- `DATE` columns for all reading dates (not TIMESTAMP or TIMESTAMPTZ)
- `TZ=Europe/London` in docker-compose.yml environment block
- Postgres.js singleton in `lib/db/client.ts`
- `created_at TIMESTAMPTZ DEFAULT NOW()` on every table
- Cloudflare Access rule as outer brute-force protection (zero application code)
- `UTILITIES_SESSION_SECRET` generated and added to `/home/services/.env.production`

**Research flag:** Standard patterns, no deeper research needed.

### Phase 2: Oil Domain

**Rationale:** Oil empty-date prediction is the highest-value and highest-anxiety feature. It delivers immediate utility and validates the core concept before any electricity work begins. The segment-based depletion calculation is the most complex logic in the app — building it first sets the pattern for `lib/calculations/`.

**Delivers:** Oil readings entry form, oil purchases entry form, history list with edit/delete, oil level chart (cm over time with depletion projection and refill markers), depletion rate and empty-date display, consumption rate display.

**Addresses:** Oil log (table stakes), oil graph (table stakes), oil depletion prediction (table stakes and primary differentiator), consumption rate (differentiator).

**Must get right:**
- Segment-based depletion rate — query only post-last-purchase readings
- "Need 2 readings since last purchase" guard before showing prediction
- Chart breaks the line at refill events (insert null data point at each purchase date)
- `DISTINCT ON (read_at)` deduplication in all oil reading queries
- `inputMode="decimal"` on all numeric inputs
- Recharts fixed px height, `trigger="click"` tooltip

**Research flag:** CRUD and chart parts are standard. Validate the segment depletion algorithm with fixture data (2+ purchase events) before marking the prediction feature done — wrong predictions are the worst failure mode.

### Phase 3: Electricity Domain

**Rationale:** Natural second domain after oil patterns are established. Reuses Server Actions structure, Drizzle query patterns, Recharts chart components, and form patterns from Phase 2. The calculations module follows the same shape.

**Delivers:** Electricity meter readings entry and history, electricity bills entry and history, usage chart (monthly kWh bar), cost-per-kWh trend chart (line), contract form, contract expiry alert banner.

**Addresses:** Electricity meter readings (table stakes), electricity bills (table stakes), electricity charts (table stakes), contract details and expiry alert (table stakes and differentiator), cost-per-kWh trend (differentiator).

**Must get right:**
- Meter readings and bills are two independent data series — never join or reconcile automatically; label clearly in UI
- `bill_month` field defaults to previous calendar month in the form (bills arrive in arrears)
- Contract expiry alert uses PostgreSQL interval arithmetic (`expiry_date - INTERVAL '60 days' <= CURRENT_DATE`), not JavaScript `setDate()`
- Same `DISTINCT ON` deduplication pattern as oil domain

**Research flag:** Standard patterns following Phase 2. No additional research needed.

### Phase 4: Dashboard and Polish

**Rationale:** The dashboard is the product-feel moment — one screen answering "am I OK?" for both utilities. Build last because it aggregates from both domains. Polish (skeleton loading states, optimistic updates, mobile QA pass) is cheaper to do as a dedicated sweep than to retrofit piecemeal.

**Delivers:** Unified dashboard with oil level + days-to-empty stat card, electricity last-month stat card, contract expiry status badge; `loading.tsx` skeletons on all route segments; optimistic form submission on log entries; full mobile viewport QA.

**Addresses:** Dashboard summary (differentiator), perceived performance (global conventions — `loading.tsx` required on every route), mobile-first QA.

**Research flag:** Standard patterns. shadcn skeleton, Suspense boundaries, and `useTransition` for optimistic updates are all well-documented.

### Phase Ordering Rationale

- Auth before everything: middleware protects all `(app)` routes; building it last means retrofitting protection
- Schema before calculations: calculation functions take plain data arrays — need fixture data matching the real schema to validate
- Calculations before charts: chart component API is determined by what the calculation functions return
- Oil before electricity: more complex calculation logic (segment-based depletion) sets the `lib/calculations/` pattern that electricity follows
- Dashboard last: has no unique logic, only assembles outputs from both domains

### Research Flags

Standard patterns — no `/gsd-research-phase` needed:
- Phase 1: iron-session + Next.js middleware fully documented, Drizzle pg-core verified via Context7
- Phase 3: follows Phase 2 patterns exactly
- Phase 4: shadcn skeleton + Suspense + Recharts mobile config all verified

Validate during implementation (not external research, but internal QA):
- Phase 2: oil depletion segment algorithm — run against fixture data with 2+ purchase events before marking prediction feature done

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified via npm registry 2026-05-09; all integration patterns verified via Context7 official docs |
| Features | MEDIUM | Domain knowledge from training data; no WebSearch available. Core feature set directly matches PROJECT.md so risk is low. |
| Architecture | HIGH | Next.js App Router + Drizzle + Recharts + iron-session all verified via Context7; schema design from domain analysis |
| Pitfalls | HIGH | PostgreSQL DATE behaviour, UK DST transitions, Recharts SVG iOS bug, postgres.js pool patterns — all well-documented |

**Overall confidence:** HIGH

### Gaps to Address

- **Brute-force protection approach:** Decide before Phase 1 starts. Two options: (1) Cloudflare Access rule restricting to home IP or requiring email PIN — zero application code, recommended. (2) In-app rate limiting stored in PostgreSQL — 5 attempts / 15 min per IP. Either is acceptable; pick one and commit.

- **Session secret:** Generate `UTILITIES_SESSION_SECRET` with `openssl rand -base64 32` and add to `/home/services/.env.production` before first deploy.

- **Tank dimensions for litres conversion:** Not needed for v1. When available, add a nullable `volume_litres` column to `oil_readings` via a Drizzle migration. Schema is already structured to accommodate this cleanly.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js` — App Router, Server Actions, standalone Docker output, middleware
- Context7 `/vvo/iron-session` — iron-session App Router integration, session config
- Context7 `/replit/drizzle-orm` — Drizzle ORM PostgreSQL schema, pg-core, migration workflow
- Context7 `/recharts/recharts` — ResponsiveContainer, ReferenceLine, mobile chart configuration
- Context7 `/shadcn-ui/ui` — Chart component wrapping Recharts
- npm registry (2026-05-09) — all package versions

### Secondary (MEDIUM confidence)
- Home Assistant energy dashboard — feature reference for tracking app conventions
- OVO Energy / Octopus Energy app feature sets — commercial comparison
- Heating oil domain knowledge — Northern Ireland norms, cm dipstick readings, typical tank behaviour

### Tertiary (domain inference, needs validation)
- Oil depletion segment algorithm — derived from domain analysis of PROJECT.md requirements; validate with fixture data during Phase 2 implementation before shipping

---
*Research completed: 2026-05-09*
*Ready for roadmap: yes*
