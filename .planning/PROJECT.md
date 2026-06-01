# Utilities Tracker

## What This Is

A personal, mobile-first web app for tracking home energy usage — heating oil and electricity. The owner manually logs tank readings, meter readings, purchases, and bills; the app visualises consumption over time, predicts oil depletion in cm and litres, and alerts on contract expiry.

## Core Value

See at a glance how much oil and electricity you're using, know when the oil will run out, and never miss an electricity contract renewal — all from your phone.

## Requirements

### Validated

- ✓ Password-protected login (single user) — v1.0 (Phase 1)
- ✓ Mobile-first responsive UI with skeleton loading states — v1.0 (Phases 1+4)
- ✓ Hosted on VPS via reverse proxy — v1.0 (Phase 1)
- ✓ Navigate between Oil, Electricity, and Home sections — v1.0 (Phase 1+4, 3-tab BottomNav)
- ✓ Log oil tank height reading (cm + date) — v1.0 (Phase 2)
- ✓ Log oil purchase (date, litres, cost, supplier) — v1.0 (Phase 2 + quick task)
- ✓ Graph tank height over time with refill markers — v1.0 (Phase 2, TankChart dashed line)
- ✓ Segment-based oil depletion prediction — v1.0 (Phase 2)
- ✓ Oil readings show litre equivalent (10.5 L/cm) — v1.0 (Phase 5)
- ✓ Depletion card and dashboard show litres remaining + L/day rate — v1.0 (Phase 5)
- ✓ Log electricity meter reading (kWh + date) — v1.0 (Phase 3)
- ✓ Log electricity bill (billing period, cost, kWh) — v1.0 (Phase 3 + quick task)
- ✓ Graph electricity usage (kWh) and cost (£) over time — v1.0 (Phase 3)
- ✓ Manage electricity contract (provider, unit rate, standing charge, type, expiry) — v1.0 (Phase 3 + quick task)
- ✓ In-app contract expiry warning (3 tiers: amber 31–90d, red ≤30d) — v1.0 (Phase 3)
- ✓ Unified dashboard: oil + electricity stats at a glance — v1.0 (Phase 4)

### Active

**v1.1 — Analytics & Insights**

- ✓ Multi-year overlaid oil chart (one line per year, colour-coded) — v1.1 (Phase 6)
- ✓ Toggle between calendar year (Jan–Dec) and heating season (Oct–Sep) groupings — v1.1 (Phase 6)
- ✓ Monthly consumption view (L/month per year overlaid) — v1.1 (Phase 6)
- ✓ Annual consumption view (L/year or L/season bar chart) — v1.1 (Phase 6)
- ✓ Historical temperature overlay on the oil chart (Open-Meteo) — v1.1 (Phase 7)
- ✓ Heating Degree Days (HDD, base 15.5°C) calculated per period for normalised analytics — v1.1 (Phase 7)
- ✓ New Analytics tab (/analytics route, 4th tab in bottom nav) — v1.1 (Phase 8)
- ✓ Year-over-year comparison cards (total L, total £, L/day, and HDD-normalised L/HDD) — v1.1 (Phase 8)
- ✓ Projected annual spend at current L/day rate (litres + £) — v1.1 (Phase 8)
- ✓ Refill pattern analysis (avg days between purchases, trend over time) — v1.1 (Phase 8)
- ✓ Consumption anomaly detection (rolling 12-month median, 2×/0.5× thresholds, flagged on /analytics) — v1.1 (Phase 9)
- ✓ Paid p/L vs BEIS UK domestic heating oil market price per purchase (MarketBadge on /oil) — v1.1 (Phase 9)

### Out of Scope

- Multi-user / household sharing — only one user needed; avoids auth complexity
- Automated bill ingestion (email/photo parsing) — v2; v1 is manual entry only
- Full tank dimension input for volume conversion — v1.0 uses calibrated 10.5 L/cm constant; update the constant in oil-config.ts when tank is measured
- Electricity market comparison / deal switching — out of scope entirely
- Push notifications — in-app alert sufficient for contract expiry
- Electricity analytics (seasonal trends, YoY) — oil-first for v1.1; extend in v1.2 once oil analytics are proven

## Current Milestone: v1.1 Analytics & Insights

**Goal:** Surface meaningful patterns from accumulated oil consumption data — multi-year trends, temperature correlation, anomaly detection, and market price context.

**Target features:**
- Multi-year overlaid oil chart with calendar/heating-season toggle
- Historical temperature overlay + Heating Degree Days (Open-Meteo API)
- New Analytics tab with YoY comparison, anomaly flags, spend projection, refill patterns
- Paid p/L vs BEIS UK market price comparison per purchase

## Context

**Shipped v1.0** — 2026-05-28. 5 phases, 22 plans, ~4,050 LOC TypeScript/TSX.

**Stack:** Next.js 15 (App Router, standalone output), Drizzle ORM + postgres.js, iron-session auth, Recharts via shadcn ChartContainer, shadcn/ui v4 + Tailwind v4, Docker Compose on VPS.

**Heating oil** is measured in cm (tank height). Calibrated conversion: 10.5 L/cm — derived from refill event analysis. Constant lives in `src/lib/oil-config.ts`.

**Electricity** is read manually once a month from the meter; a bill arrives monthly with cost, kWh, and billing period dates. Contract has standing charge (p/day) + unit rate.



**Mobile-first**: Primary device is phone; 375px QA verified in Phase 4.

## Constraints

- **Stack**: Must fit existing VPS Docker Compose setup — containerised, env vars from shared `.env.production`
- **Auth**: Single-user password login; no need for OAuth or multi-user sessions
- **Data entry**: All user data is manually entered; external APIs (Open-Meteo, BEIS) are read-only enrichment only
- **Hosting**: Deploy behind a reverse proxy
- **Dates**: DATE columns only (never TIMESTAMP); TZ=Europe/London in Docker Compose

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| DATE columns only (not TIMESTAMP) | No TZ issues for daily readings | ✓ Good — no BST problems |
| TZ=Europe/London in Docker Compose | App observes BST | ✓ Good — BST handled correctly |
| iron-session for auth | No session table; simple encrypted cookie | ✓ Good |
| Segment-based oil depletion | Naive all-time slope breaks on refill events | ✓ Good — refill events handled correctly |
| Require 2+ readings before showing depletion | Avoid misleading 1-point prediction | ✓ Good |
| Separate meter readings + bills tables | No forced reconciliation between meter and bill | ✓ Good |
| 10.5 L/cm calibration constant in oil-config.ts | Single source, easily updated when tank measured | ✓ Good — constant updated without touching UI |
| Recharts via shadcn ChartContainer | Consistent theming with design system | ✓ Good |
| Next.js 15 + shadcn v4 + Tailwind v4 | Cutting-edge stack; tw-animate-css (not tailwindcss-animate) | ✓ Good |
| Dates appended with "T12:00:00" before Recharts | BST midnight offset shifts dates by -1d otherwise | ✓ Good |
| postgres.js singleton (max: 5 connections) | Prevent pool exhaustion in serverless-ish Next.js | ✓ Good |
| CookieStore adapter for iron-session v8 middleware | Middleware cookies are read-only; adapter wraps them | ✓ Good |
| Billing period start/end dates (not billing month) | Accurately represents period covered by bill | ✓ Good |
| Standing charge (p/day) on electricity contract | Real-world contract has standing charge + unit rate | ✓ Good |

## Evolution

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-30 — v1.1 complete (Phase 9: anomaly detection + BEIS market price comparison shipped)*
