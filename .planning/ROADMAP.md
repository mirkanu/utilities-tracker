# Roadmap: Utilities Tracker

## Overview

Four phases from blank repo to shipped app. Foundation establishes auth, database schema, and the Docker/Cloudflare deployment so every subsequent phase can ship immediately. Oil domain delivers the highest-anxiety feature — knowing when the tank runs out — before any electricity work begins. Electricity domain follows the same patterns established in Phase 2. The dashboard assembles both domains into the single "am I OK?" screen that is the product's core value.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, database schema, Docker deploy, mobile shell, navigation
- [ ] **Phase 2: Oil Domain** - Tank readings, purchases, history, graph, depletion prediction
- [ ] **Phase 3: Electricity Domain** - Meter readings, bills, graphs, contract, expiry alert
- [ ] **Phase 4: Dashboard & Polish** - Unified home screen, skeleton loading, mobile QA

## Phase Details

### Phase 1: Foundation
**Goal**: The app is deployed, password-protected, and ready to store data
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. User can log in with the password and remain logged in across browser sessions
  2. User can log out from any page and is returned to the login screen
  3. The app is reachable at a public HTTPS URL via Cloudflare Tunnel
  4. The app renders correctly on a phone (bottom nav bar visible, tap targets usable)
  5. User can tap between Oil and Electricity sections in the bottom navigation bar
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [ ] 01-01-PLAN.md — Next.js 15 scaffold and shadcn/ui bootstrap
- [ ] 01-02-PLAN.md — Drizzle ORM database layer (schema, migrations, postgres.js client)
- [ ] 01-03-PLAN.md — iron-session auth (middleware, login page, server actions)
- [ ] 01-04-PLAN.md — UI shell (root layout, bottom nav, route placeholders, loading skeletons, /api/health)
- [ ] 01-05-PLAN.md — Docker deploy + Cloudflare Tunnel + secrets + backup wiring
- [ ] 01-06-PLAN.md — Playwright E2E verification of all Phase 1 success criteria

### Phase 2: Oil Domain
**Goal**: User can log and visualise oil consumption and know when the tank will run out
**Depends on**: Phase 1
**Requirements**: OIL-01, OIL-02, OIL-03, OIL-04, OIL-05, OIL-06
**Success Criteria** (what must be TRUE):
  1. User can submit a tank height reading (cm + date) and it appears in history newest-first
  2. User can log an oil purchase (date, litres, cost) and it appears in purchase history newest-first
  3. The app shows a graph of tank height over time with oil purchases marked as refill events
  4. The app displays an estimated date (and countdown in days) when the tank will run empty, calculated from readings since the last refill
**Plans**: TBD
**UI hint**: yes

### Phase 3: Electricity Domain
**Goal**: User can log electricity usage and bills, view consumption graphs, and track contract expiry
**Depends on**: Phase 2
**Requirements**: ELEC-01, ELEC-02, ELEC-03, ELEC-04, ELEC-05, ELEC-06, ELEC-07, ELEC-08
**Success Criteria** (what must be TRUE):
  1. User can log a monthly meter reading (kWh + date) and view all readings newest-first
  2. User can log a monthly bill (month, cost, kWh) and view all bills newest-first
  3. The app shows a graph of monthly electricity usage (kWh) and a graph of monthly cost (£) over time
  4. User can enter or edit the active electricity contract (provider, unit rate, type, expiry date)
  5. The app shows a visible warning banner when the contract is within 90, 60, or 30 days of expiry
**Plans**: TBD
**UI hint**: yes

### Phase 4: Dashboard & Polish
**Goal**: User sees both utilities summarised on the home screen, with fast load states and a polished mobile experience
**Depends on**: Phase 3
**Requirements**: DASH-01
**Success Criteria** (what must be TRUE):
  1. The home screen shows current oil level (cm), days to empty, last electricity bill cost and kWh, and contract expiry countdown — all without navigating away
  2. Every page shows a skeleton placeholder instantly on navigation rather than a blank screen
  3. The app passes a full mobile viewport QA pass (no layout overflow, all tap targets reachable, charts render correctly on a phone screen)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/6 | Planned ◆ | - |
| 2. Oil Domain | 0/? | Not started | - |
| 3. Electricity Domain | 0/? | Not started | - |
| 4. Dashboard & Polish | 0/? | Not started | - |
