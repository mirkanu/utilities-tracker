# Utilities Tracker

Personal home utilities tracker — heating oil and electricity. Mobile-first Next.js 15 app on a VPS.

## GSD Workflow

This project uses the GSD workflow system. Planning docs are in `.planning/`.

**Current state:** See `.planning/STATE.md`
**Roadmap:** See `.planning/ROADMAP.md`
**Requirements:** See `.planning/REQUIREMENTS.md`

All non-trivial work goes through GSD:
- `/gsd-discuss-phase N` — gather context before planning
- `/gsd-plan-phase N` — create execution plan
- `/gsd-execute-phase N` — execute the plan
- `/gsd-verify-work N` — verify phase is complete

## Stack

- **Framework**: Next.js 15 (App Router, `output: 'standalone'`)
- **Database**: PostgreSQL via Drizzle ORM + postgres.js driver
- **Auth**: iron-session (single hardcoded password from env)
- **Charts**: Recharts via shadcn `ChartContainer`
- **UI**: shadcn/ui + Tailwind CSS + lucide-react icons
- **Deployment**: Docker Compose on VPS

## Critical Implementation Rules

- **DATE columns only** — never TIMESTAMP for readings/bills; all dates are "which day" facts
- **TZ=Europe/London** must be set in docker-compose.yml (app observes BST)
- **Oil depletion**: segment-based calculation — use readings since last purchase only, not all-time average
- **Electricity**: meter readings and bills are separate tables/series, never reconciled
- **Auth middleware**: global from Phase 1 — no route is ever accidentally unauthenticated
- **Drizzle migrations**: wired into Docker Compose health check from Phase 1

## Infrastructure

- Secrets: store in `.env.production` (use `UTILITIES_` prefix for new keys)
- Deploy via Docker Compose; add reverse-proxy/tunnel ingress rule before first deploy

## Testing

- Playwright with Chromium for all UI verification
- Always run full E2E before marking a phase complete — user only does final sanity check
