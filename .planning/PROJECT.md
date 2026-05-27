# Utilities Tracker

## What This Is

A personal, mobile-first web app for tracking home energy usage — heating oil and electricity. The owner manually logs tank readings, meter readings, purchases, and bills; the app visualises consumption over time, predicts oil depletion, and alerts on contract expiry.

## Core Value

See at a glance how much oil and electricity you're using, know when the oil will run out, and never miss an electricity contract renewal — all from your phone.

## Requirements

### Validated

**Foundation (Phase 1):** Auth, DB schema, Docker deploy, Cloudflare Tunnel — all live at https://utilities.gsdlabs.dev/

**Heating Oil (Phase 2):** Tank readings, oil purchases, depletion chart, segment-based depletion prediction — verified E2E.

**Electricity (Phase 3):** Meter readings, monthly bills, usage/cost BarCharts, contract upsert, contract expiry banner (3 tiers: amber 31–90d, red ≤30d, hidden when rolling) — all 8 ELEC requirements verified E2E 2026-05-27.

### Active

**Heating Oil**
- [x] Log oil tank height reading in cm (dated, every 1–4 weeks)
- [x] Log oil purchases: date, total liters, total cost
- [x] Graph tank height over time (cm)
- [x] Predict estimated date tank will run empty (linear depletion rate)

**Electricity**
- [x] Log monthly electricity meter reading (kWh, date)
- [x] Log monthly electricity bill: month, total cost, total kWh consumed
- [x] Graph electricity usage and cost over time (monthly)
- [x] Track electricity contract: provider, tariff/unit rate, contract type (fixed vs variable), expiry date
- [x] Alert (in-app) when electricity contract is expiring (configurable lead time, e.g. 30/60/90 days)

**Foundation**
- [ ] Password-protected login (single user)
- [ ] Mobile-first responsive UI
- [ ] Hosted on personal VPS (Hetzner), accessible via Cloudflare Tunnel

### Out of Scope

- Multi-user / household sharing — only one user needed; avoids auth complexity
- Automated bill ingestion (email/photo parsing) — v2; v1 is manual entry only
- Heating oil → liters conversion — v2; tank dimensions/product code not yet known; v1 tracks cm only
- Temperature correlation and trend analysis — v2 future feature; Northern Ireland (Broughshane) weather data via Met Office or Open-Meteo API
- Electricity market comparison / deal switching — out of scope entirely; not the goal

## Context

- **Heating oil** is measured by reading the height of oil in a cylindrical/rectangular tank in cm. The owner will obtain tank dimensions or product code to enable volume conversion in v2.
- **Electricity** is read manually once a month from the meter; a bill also arrives monthly with cost and kWh.
- **Location**: Broughshane, Northern Ireland — relevant for future temperature correlation (Met Office historical data or Open-Meteo).
- **VPS infrastructure**: Hetzner VPS running Docker Compose, secrets in `/home/services/.env.production`, Cloudflare Tunnel for public access. Stack consistent with other projects on this server (Next.js + PostgreSQL typical pattern).
- **Mobile-first**: Primary device is phone; desktop is secondary.

## Constraints

- **Stack**: Must fit existing VPS Docker Compose setup — containerised, env vars from shared `.env.production`
- **Auth**: Single-user password login; no need for OAuth or multi-user sessions
- **Data entry**: All v1 data is manually entered by the owner; no external API dependencies in v1
- **Hosting**: Cloudflare Tunnel ingress required; add rule to `/home/services/hetzner-vps/config.yml`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Track oil in cm only (v1) | Tank dimensions unknown; conversion formula to come when owner measures | — Pending |
| Single-user with password auth | Only one user; keeps auth simple and avoids sessions complexity | — Pending |
| Manual entry for bills (v1) | Realistic for monthly cadence; email/photo parsing deferred to v2 | — Pending |
| Mobile-first layout | Primary use case is checking/logging from phone | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-27 — Phase 3 complete (electricity domain)*
