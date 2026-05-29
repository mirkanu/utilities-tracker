# Roadmap: Utilities Tracker

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-28) — [Archive](milestones/v1.0-ROADMAP.md)
- 🔄 **v1.1 Analytics & Insights** — Phases 6–9 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-05-28</summary>

- [x] Phase 1: Foundation (6/6 plans) — completed 2026-05-09
- [x] Phase 2: Oil Domain (4/4 plans) — completed 2026-05-10
- [x] Phase 3: Electricity Domain (5/5 plans) — completed 2026-05-27
- [x] Phase 4: Dashboard & Polish (4/4 plans) — completed 2026-05-28
- [x] Phase 5: Oil Volume Conversion (3/3 plans) — completed 2026-05-28

</details>

### v1.1 Analytics & Insights

- [ ] **Phase 6: Multi-Year Chart** - Oil chart shows overlaid lines per year/season with calendar vs heating-season toggle
- [ ] **Phase 7: Temperature Layer** - Open-Meteo temperature overlay on chart + HDD calculation for normalised metrics
- [ ] **Phase 8: Analytics Page** - New Analytics tab with YoY comparison, projected spend, and refill pattern cards
- [ ] **Phase 9: Anomaly Detection & Market Pricing** - Consumption anomaly flags + paid p/L vs BEIS market average per purchase

## Phase Details

### Phase 6: Multi-Year Chart
**Goal**: Users can see oil consumption trends across multiple years on a single chart, with meaningful grouping by calendar year or heating season
**Depends on**: Phase 5 (oil domain complete)
**Requirements**: CHART-01, CHART-02
**Success Criteria** (what must be TRUE):
  1. The oil chart page displays a distinct coloured line for each year (or heating season) of data, overlaid on shared axes with a legend identifying each line
  2. A toggle control on the oil chart page switches grouping between calendar year (Jan–Dec) and heating season (Oct–Sep, e.g. "2024/25"), and the chart re-renders accordingly
  3. Selecting a grouping that has no data for a given year gracefully omits that year rather than rendering an empty or broken line
**Plans**: 3 plans
  - [x] 06-01-PLAN.md — Pure grouping transform library (oil-chart-grouping.ts) + unit tests
  - [x] 06-02-PLAN.md — Add --year-color-1..5 palette to globals.css (light + dark)
  - [ ] 06-03-PLAN.md — GroupingToggle + MultiYearTankChart + oil page wiring + Playwright E2E
**UI hint**: yes

### Phase 7: Temperature Layer
**Goal**: Historical temperature data from Open-Meteo is available in the app and visible as a secondary overlay on the oil chart, with Heating Degree Days calculated for use in analytics
**Depends on**: Phase 6
**Requirements**: TEMP-01, TEMP-02, CHART-03
**Success Criteria** (what must be TRUE):
  1. The oil chart page shows a second line representing daily average temperature (°C) on a right-hand secondary y-axis, correctly aligned by date with the consumption data
  2. Temperature data for the full available date range is present in the database without manual action, with the app fetching from Open-Meteo (lat 54.92, lon -6.22) automatically and refreshing at most once per day
  3. HDD values (base 15.5°C) are stored or computable per day and correctly sum to weekly/monthly/seasonal totals that downstream analytics can consume
  4. The temperature overlay can be toggled on/off so the chart is not cluttered when the user only wants to see consumption lines
**Plans**: TBD
**UI hint**: yes

### Phase 8: Analytics Page
**Goal**: A new Analytics tab is accessible from the bottom navigation and shows users their year-over-year consumption comparison, projected annual spend, and refill pattern summary
**Depends on**: Phase 7
**Requirements**: ANAL-01, ANAL-02, ANAL-04, ANAL-05
**Success Criteria** (what must be TRUE):
  1. A fourth tab labelled "Analytics" appears in the bottom navigation bar and navigates to /analytics without breaking the existing three tabs
  2. The analytics page shows one comparison card per year/heating season containing total litres, total £, average L/day, and L/HDD — the HDD figure uses the Open-Meteo data from Phase 7
  3. A projected spend card shows the estimated litres and £ for the current full year/season at the current L/day rate, with the number of days remaining in the period
  4. A refill pattern section shows the average interval between oil purchases, whether that interval is trending shorter or longer, and an estimated date for the next required refill
**Plans**: TBD
**UI hint**: yes

### Phase 9: Anomaly Detection & Market Pricing
**Goal**: Users can see when their oil consumption is unusually high or low, and can tell whether each purchase was good value against the UK market average
**Depends on**: Phase 8
**Requirements**: ANAL-03, ANAL-06
**Success Criteria** (what must be TRUE):
  1. Any week or month with consumption more than 2× above or below the rolling baseline is flagged on the analytics page with a brief plain-English explanation (e.g. "Jan 2025 — 3× above average")
  2. Each oil purchase entry in the purchases list shows the paid price per litre alongside the BEIS UK domestic heating oil weekly average for that week, with a clear above/below indicator
  3. BEIS price data is fetched and stored (or server-side cached) from the gov.uk CSV source and kept reasonably current without manual action
  4. The full analytics flow passes a Playwright E2E verification — chart renders, anomaly flags appear for seeded data, market comparison indicators display on purchase entries
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 6/6 | Complete | 2026-05-09 |
| 2. Oil Domain | v1.0 | 4/4 | Complete | 2026-05-10 |
| 3. Electricity Domain | v1.0 | 5/5 | Complete | 2026-05-27 |
| 4. Dashboard & Polish | v1.0 | 4/4 | Complete | 2026-05-28 |
| 5. Oil Volume Conversion | v1.0 | 3/3 | Complete | 2026-05-28 |
| 6. Multi-Year Chart | v1.1 | 2/3 | In Progress|  |
| 7. Temperature Layer | v1.1 | 0/? | Not started | - |
| 8. Analytics Page | v1.1 | 0/? | Not started | - |
| 9. Anomaly Detection & Market Pricing | v1.1 | 0/? | Not started | - |
