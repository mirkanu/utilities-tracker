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
**Goal**: Users can see oil consumption patterns across multiple years via three complementary views: raw tank-level history, monthly usage overlaid by calendar year, and annual/seasonal totals with a CY vs HS toggle
**Depends on**: Phase 5 (oil domain complete)
**Requirements**: CHART-01, CHART-02
**Success Criteria** (what must be TRUE):
  1. The oil chart page offers three views via a segmented control: "Raw" (all readings chronological), "Monthly" (usage per calendar month, years overlaid), "Annual" (total usage per year/season, CY vs HS sub-toggle)
  2. Raw view: distinct coloured line per year overlaid on shared Jan–Dec axes with a legend; years with no data omitted
  3. Monthly view: consumption (cm or L) aggregated per calendar month via linear interpolation between readings; years overlaid so seasonal patterns are comparable across years
  4. Annual view: total consumption per calendar year or heating season (Oct–Sep); CY vs HS sub-toggle switches the grouping, chart re-renders without a server fetch
  5. All three views render correctly with the seeded historical data; empty states are handled gracefully
**Plans**: 5 plans
  - [x] 06-01-PLAN.md — Pure grouping transform library (oil-chart-grouping.ts) + unit tests
  - [x] 06-02-PLAN.md — Add --year-color-1..5 palette to globals.css (light + dark)
  - [x] 06-03-PLAN.md — GroupingToggle + MultiYearTankChart (Raw view) + oil page wiring + Playwright E2E
  - [x] 06-04-PLAN.md — Monthly usage view: interpolated L/month per calendar month, years overlaid
  - [x] 06-05-PLAN.md — Annual totals view: total L per CY or HS, CY vs HS sub-toggle + 3-view segmented control + Playwright E2E
**UI hint**: yes
**Design note (2026-05-29)**: Raw height overlay is the correct base view. Monthly usage (interpolated consumption/month, years overlaid) and Annual usage (total per CY or HS) were added after initial implementation — these derived views are more analytically useful than raw height grouped by year/season. The CY vs HS toggle is only meaningful for Annual view; Monthly view is always calendar-month.

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
**Design constraint (2026-05-29)**: Temperature overlay does NOT make sense against the Raw (tank height) view — overlaying °C on a cm/L Y-axis has no analytical meaning. Temperature should only be offered as a secondary axis on the Monthly and/or Annual usage views (Phase 6), where it shows the relationship between cold weather and consumption. When designing the overlay UI, gate the temperature toggle so it is only available when the chart is in Monthly or Annual view, not Raw.

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
| 6. Multi-Year Chart | v1.1 | 3/5 | In Progress|  |
| 7. Temperature Layer | v1.1 | 0/? | Not started | - |
| 8. Analytics Page | v1.1 | 0/? | Not started | - |
| 9. Anomaly Detection & Market Pricing | v1.1 | 0/? | Not started | - |
