# Milestones

## v1.0 — MVP

**Shipped:** 2026-05-28
**Phases:** 1–5 (5 phases, 22 plans)
**Files:** 154 files changed, ~4,050 LOC TypeScript/TSX
**Timeline:** 19 days (2026-05-09 → 2026-05-28)
**Git commits:** 138

### Delivered

Personal home utilities tracker — heating oil and electricity — from zero to production. Iron-session auth, Drizzle/PostgreSQL, Docker Compose on VPS. Five phases: foundation, oil domain, electricity domain, unified dashboard, oil cm→litre conversion.

### Key Accomplishments

1. **Foundation**: Next.js 15 deployed to iron-session auth, Drizzle/Postgres, Docker + Cloudflare Tunnel — from blank repo in one phase
2. **Oil Domain**: Segment-based depletion prediction (readings since last purchase only), TankChart with refill markers, history + purchases CRUD
3. **Electricity Domain**: All 8 ELEC requirements — meter readings, bills, usage/cost BarCharts, contract management, 3-tier expiry banner (amber/red/hidden)
4. **Dashboard & Polish**: Unified home screen with parallel data fetch, OilStatCard + ElectricityStatCard grid, skeleton loading states, 375px mobile QA pass
5. **Oil Volume Conversion**: Calibrated 10.5 L/cm ratio wired through readings, chart tooltip, DepletionCard, and dashboard stat card
6. **Quick tasks**: Standing charge + billing period dates, supplier/payee field on purchases, visible form labels, dashed oil chart line

### Deferred Items

None.

### Archive

- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) — Full phase details
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) — All 22 requirements marked complete

---
