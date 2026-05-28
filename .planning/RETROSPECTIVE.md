# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-28
**Phases:** 5 | **Plans:** 22 | **Timeline:** 19 days | **Commits:** 138

### What Was Built

1. Next.js 15 app deployed to production from zero — iron-session auth, Drizzle/Postgres, Docker + Cloudflare Tunnel
2. Oil domain: tank height readings, purchases (with supplier), TankChart (dashed line + refill markers), segment-based depletion prediction
3. Electricity domain: meter readings, bills (with billing period dates), usage/cost BarCharts, contract management (with standing charge), 3-tier expiry banner
4. Unified dashboard: OilStatCard + ElectricityStatCard in grid-cols-2, ContractExpiryBanner, 3-tab bottom nav
5. Oil cm→litre conversion: calibrated 10.5 L/cm constant wired throughout readings, chart, depletion card, dashboard

### What Worked

- **Wave-based parallelisation**: Phases like 04 split cleanly into Wave 1 (components) → Wave 2 (page assembly) → Wave 3 (E2E) — no blocking
- **CLAUDE.md rules as guardrails**: DATE columns + TZ=Europe/London rules written before coding prevented common timestamp bugs
- **Playwright E2E as final plan in each phase**: Gave high confidence before advancing — caught BST/midnight offset bug in Phase 2
- **Quick tasks after phase completion**: Standing charge, billing period dates, supplier field, visible labels — small polishes that improved UX without polluting phase plans
- **Segment-based depletion from day one**: Writing the algorithm spec correctly in Phase 2 avoided a hard-to-debug regression on refill events
- **shadcn v4 + tw-animate-css decision captured early**: Saved confusion when upgrading or adding components later

### What Was Inefficient

- **REQUIREMENTS.md checkbox tracking never updated during execution**: All 22 requirements were implemented but the file still showed `[ ]` at milestone close — needed manual audit to confirm completeness
- **ROADMAP.md Phase 2 plans section was corrupted**: Had Phase 4 plan IDs under Phase 2's "Plans:" heading — never caught because plans lived in the phase directories
- **STATE.md progress counter lagged**: `completed_plans: 19` when all 22 were done — counter not updated after Phase 5
- **No milestone audit run before close**: Skipped `/gsd-audit-milestone` — acceptable in yolo mode but means cross-phase integration wasn't formally verified

### Patterns Established

- **`src/lib/oil-config.ts`** as a calibration constants file — any adjustable numeric constant goes here, not inline in UI code
- **Dates in Recharts always append `"T12:00:00"`** to prevent BST midnight offset shifting dates by -1 day
- **BottomNav as isolated Client Component** — `usePathname` hook must not bleed into Server Component layout
- **`computeDepletion` returns null when < 2 readings** — never show a 1-point "prediction"
- **postgres.js singleton with max:5** in `lib/db/client.ts` — prevents pool exhaustion in Next.js serverless-style execution

### Key Lessons

1. **Capture implementation rules in CLAUDE.md before coding** — TZ=Europe/London and DATE-only columns were written as rules in Phase 1; they were never violated. Rules written after the fact have less force.
2. **Quick tasks are a healthy pressure valve** — allowing small improvements post-phase without reopening the phase plan kept velocity high and requirements realistic
3. **E2E as the final wave of each phase is non-negotiable** — Phase 2's BST bug would have silently corrupted chart dates in production without it
4. **Checkbox tracking needs automation or a discipline check** — REQUIREMENTS.md state diverged from reality by Phase 3; needs updating either as part of SUMMARY.md creation or as a gate in the verification step

### Cost Observations

- Sessions: ~8 sessions across 19 days
- Notable: Phases 3–5 + quick tasks completed in a single day (2026-05-28) — momentum built well by Phase 4

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Timeline | 19 days |
| Phases | 5 |
| Plans | 22 |
| Commits | 138 |
| LOC | ~4,050 TS/TSX |
| Rework | Low (1 BST bug caught by E2E) |
| Quick tasks | 4 |
