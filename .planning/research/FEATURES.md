# Feature Landscape

**Domain:** Personal home utilities tracking (heating oil + electricity), single-user, mobile-first
**Researched:** 2026-05-09
**Confidence:** MEDIUM — based on domain knowledge of Home Assistant, energy monitoring apps (Octopus Energy, OVO, Loop, YNAB-style single-user trackers), and the specific project context. WebSearch unavailable; findings from training data.

---

## Table Stakes

Features users expect from any tracking app. Missing = the app provides less value than a spreadsheet.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Manual data entry (readings, purchases, bills) | Core input mechanism; without it there is nothing to track | Low | Forms with date pickers, number inputs. Oil: cm + purchase logs. Electricity: kWh reading + bill fields. |
| View historical entries as a list | Users need to verify what they entered and correct mistakes | Low | Sortable by date descending. Edit + delete actions. |
| Graphs of usage over time | Visual trend is the primary reason to track at all; a table of numbers is no better than a spreadsheet | Medium | Recharts/Chart.js line chart. Oil: cm over time. Electricity: monthly kWh bar chart, cost bar chart. |
| Oil depletion prediction | The most urgent anxiety for oil-heated homes — running out of oil in winter is a crisis | Medium | Linear regression over last N readings. Show predicted empty date + days remaining. Update every time a reading is logged. |
| Contract expiry alert | Missing a renewal window locks you into a bad tariff; this is a known pain point | Low | In-app banner/badge. Configurable lead time (30/60/90 days). Only applies to electricity contract. |
| Mobile-friendly layout | Primary use case is logging a reading while standing near the meter or tank | Low | Responsive layout. Large tap targets. Minimal scrolling to reach entry form. |
| Password-protected access | Personal financial/consumption data; must not be publicly readable | Low | Single-user session auth. |
| Data persistence | Nothing else matters if data is lost | Low | PostgreSQL with backups. |

---

## Differentiators

Features that make this app clearly better than a spreadsheet or a generic note-taking app for this specific use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Oil empty date countdown | "You have ~47 days of oil left" is immediately actionable; a spreadsheet requires you to do the math yourself | Medium | Depends on: depletion rate from recent readings, current tank level. Display prominently on dashboard. |
| Consumption rate display | "You're using ~3cm/day" contextualises whether this winter is unusually cold or the house is efficient | Low | Derived from linear fit over recent readings. No extra data entry. |
| Electricity cost per kWh trend | Lets the user see if their tariff is changing in practice (variable rate) | Low | Calculated: total bill cost / total kWh per month. Displayed alongside usage graph. |
| Dashboard summary ("at a glance") | Single screen showing: oil level + days remaining + electricity last month + contract status. No navigation needed to answer "am I OK?" | Medium | Requires all data entry features to exist first. The payoff feature. |
| Contract details page | Storing tariff, provider, unit rate, contract type in one place beats hunting through email for PDFs | Low | Simple form + display. Expiry date drives the alert feature. |
| Annotation / notes on entries | "Bought oil before the price spike" — context that makes historical graphs meaningful later | Low | Optional free-text field on any entry. Can be deferred to v1.5 without loss. |

---

## Anti-Features

Things to explicitly NOT build in v1, with rationale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Automated bill ingestion (email / photo OCR) | High implementation cost (email parsing, OCR, field extraction), high failure rate, complex error recovery. Adds weeks of work. | Manual entry form — takes 30 seconds/month and is perfectly reliable for one user |
| Liters / volume conversion for oil | Tank dimensions are unknown; the conversion formula requires measuring the specific tank geometry. Building it wrong and having to re-derive is worse than deferring. | Track cm only in v1. Add conversion in v2 once tank is measured. |
| Temperature correlation charts | Requires external weather API integration (Open-Meteo / Met Office), date alignment logic, dual-axis charts. Interesting but not urgent. | Defer to v2. Open-Meteo API is free and has good historical data when needed. |
| Electricity market comparison / tariff switching | This is a different product (price comparison). Not the goal. Adds complexity with no personal-use payoff since the user is not shopping. | Ignore entirely. |
| Push notifications (mobile) | Requires a service worker, push subscription management, a notification server. Significant infrastructure for marginal gain vs an in-app banner. | In-app alert banner for contract expiry. User checks app periodically — that is sufficient. |
| Multi-user / household sharing | Only one user. Adds auth complexity (invites, roles, permissions) with zero benefit. | Single-user password session only. |
| Import from CSV / spreadsheet | Tempting for migration, but one-time value and adds parsing complexity. User likely has few historical data points. | Manual re-entry of recent history is acceptable for a personal app. |
| Carbon footprint / CO2 calculations | Requires conversion factors that change, is politically fraught, and is not in scope for this user's goals. | Out of scope entirely. |
| Budget targets / alerts | The user wants to understand usage, not set budgets. YNAB does this for money. | Not relevant to the core value proposition. |

---

## Feature Dependencies

```
Password auth
  → (everything else — app is useless without this)

Oil readings log (cm, date)
  → Oil graph (cm over time)
  → Depletion rate calculation
    → Oil empty date prediction
      → Dashboard oil summary

Oil purchases log (date, litres, cost)
  → Purchase history list
  → (v2) Cost per litre trend

Electricity meter readings (kWh, date)
  → Monthly consumption graph (kWh)

Electricity bills (month, cost, kWh)
  → Monthly cost graph
  → Cost per kWh trend

Electricity contract (provider, tariff, expiry date)
  → Contract expiry alert
  → Dashboard electricity summary

Dashboard
  → Requires: oil prediction + contract alert + recent readings for both utilities
  → Build last — it is the payoff of everything else
```

---

## What Home Assistant / Commercial Apps Do (Reference)

This project is a deliberate lightweight alternative. Understanding what these apps do clarifies what to borrow vs. ignore.

**Home Assistant energy dashboard:**
- Automatic data ingestion via smart meters / integrations (irrelevant here — manual entry only)
- Live power draw graph (irrelevant — no smart meter)
- Solar production vs. consumption (irrelevant)
- Cost configuration per tariff period (relevant: unit rate storage is table stakes)
- Historical comparison (month-over-month) — RELEVANT, simple to add to electricity graphs

**OVO / Octopus Energy apps:**
- Automatic smart meter data (irrelevant)
- Carbon footprint (anti-feature per above)
- "Good Octopus" green energy tracking (irrelevant)
- Contract status and renewal prompts — RELEVANT, validates contract expiry alert
- Usage vs. previous year comparison — RELEVANT for v2

**Loop Energy Monitor:**
- Requires hardware clamp sensor (irrelevant)
- Real-time monitoring (irrelevant for manual entry)
- Seasonal patterns — RELEVANT concept for v2

**Key takeaway:** The differentiating insight is that commercial apps serve automated smart-meter users. This app serves a manual-entry user with an oil tank — a gap that none of the above products address well. The oil depletion prediction is the unique feature with no commercial equivalent in the apps above.

---

## MVP Recommendation

Build in this order to deliver value as early as possible:

**Phase 1 — Foundation + Oil**
1. Auth (password login)
2. Oil readings log (entry form + list)
3. Oil graph (cm over time)
4. Depletion rate + empty date prediction
   - Delivers the highest-anxiety use case (running out of oil) immediately

**Phase 2 — Electricity**
5. Electricity meter readings (entry + list + graph)
6. Electricity bills (entry + list + cost graph)
7. Contract details + expiry alert
   - Delivers the second core use case

**Phase 3 — Dashboard**
8. Unified dashboard: oil summary + electricity summary + contract status
   - Builds on all prior data; this is the "product feel" moment

**Defer to v2:**
- Liters conversion (tank not yet measured)
- Temperature correlation (Open-Meteo integration)
- Bill import via email/photo
- Month-over-month year comparison
- Annotations on entries

---

## Sources

- Project context: `/data/home/utilities-tracker/.planning/PROJECT.md`
- Domain knowledge: Home Assistant energy dashboard (docs.home-assistant.io), OVO Energy app, Octopus Energy app, Loop Energy Monitor — feature sets as of training data (August 2025). WebSearch unavailable; confidence MEDIUM.
- Heating oil specific knowledge: Standard practice in Northern Ireland / Republic of Ireland for oil-heated homes (bunded tanks, cm dipstick readings, typical 1000-2000 litre tanks).
