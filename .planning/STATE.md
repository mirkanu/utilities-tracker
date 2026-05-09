# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-09)

**Core value:** See at a glance how much oil and electricity you're using, know when the oil will run out, and never miss an electricity contract renewal — all from your phone.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 4 (Foundation)
Plan: 0 of 6 in current phase
Status: Ready to execute
Last activity: 2026-05-09 — Phase 1 planned (6 plans, 5 waves)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Use DATE columns (not TIMESTAMP) for all reading dates; set TZ=Europe/London in Docker Compose from day one — cannot be cheaply changed after data exists
- Phase 1: Use iron-session (encrypted cookie) for auth; no session table needed
- Phase 1: Create postgres.js client singleton in lib/db/client.ts (max: 5 connections) to prevent pool exhaustion
- Phase 2: Oil depletion prediction uses only readings since last purchase (segment-based) — naive all-time slope breaks silently on refill events
- Phase 2: Require at least 2 readings since last purchase before showing any depletion prediction

### Pending Todos

None yet.

### Blockers/Concerns

- Brute-force protection: Using Cloudflare Access IP restriction (no app code needed) — resolved in planning.
- UTILITIES_SESSION_SECRET: Plan 01-05 generates this automatically via `openssl rand -base64 32` during deploy task.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-09
Stopped at: Roadmap created; ready to run /gsd-plan-phase for Phase 1
Resume file: None
