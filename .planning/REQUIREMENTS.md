# Requirements: Utilities Tracker v1.1

**Defined:** 2026-05-29
**Milestone:** v1.1 — Analytics & Insights
**Core Value:** Surface meaningful patterns from accumulated oil data — multi-year trends, temperature correlation, anomaly detection, and market price context.

## v1.1 Requirements

### Chart Enhancements

- [ ] **CHART-01**: The oil chart displays one line per calendar year (or heating season), overlaid on the same axes with each year colour-coded and a legend
- [ ] **CHART-02**: A toggle on the oil chart switches between calendar year grouping (Jan–Dec) and heating season grouping (Oct–Sep, e.g. "2024/25")
- [x] **CHART-03**: Historical daily average temperature is plotted as a second line on the oil chart (secondary y-axis, °C)

### Temperature & HDD

- [x] **TEMP-01**: App fetches and caches historical daily average temperatures from Open-Meteo (configured location); cache refreshes at most once per day
- [ ] **TEMP-02**: Heating Degree Days (HDD) are calculated per day using base 15.5°C (UK domestic standard); summed per week/month/year/season for use in analytics

### Analytics

- [ ] **ANAL-01**: A new Analytics tab appears in the bottom navigation bar and navigates to /analytics
- [ ] **ANAL-02**: The analytics page shows year-over-year comparison cards: total litres consumed, total £ spent, average L/day, and HDD-normalised consumption rate (L per HDD) — one card per year/heating season
- [ ] **ANAL-03**: The analytics page flags consumption anomalies: any week or month where usage is 2× above or below the user's rolling baseline is highlighted with a brief explanation
- [ ] **ANAL-04**: A projected spend card shows estimated total litres and £ cost for the current full year/heating season at the current L/day rate, with days remaining in the period
- [ ] **ANAL-05**: A refill pattern section shows average days between oil purchases, the trend over time (getting shorter or longer), and the estimated date of the next required refill based on current consumption
- [ ] **ANAL-06**: Each oil purchase entry shows the paid price per litre alongside the BEIS UK domestic heating oil weekly average price for that week, indicating whether the purchase was above or below market

## Future Requirements

### Electricity Analytics (v1.2)

- Electricity year-over-year comparison (kWh and £ by year/season)
- Electricity consumption anomaly detection
- Combined oil + electricity annual energy cost summary

### Extended Temperature Analysis (v1.2+)

- Heating degree day correlation chart (L/HDD plotted over time to show efficiency trends)
- Identify coldest weeks and overlay actual oil consumption

### Oil Efficiency Tracking

- Tank insulation or boiler efficiency change detection (sustained shift in L/HDD rate)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Electricity analytics | Oil-first for v1.1; proven pattern extended to electricity in v1.2 |
| Live market price alerts | BEIS data is historical/weekly; real-time pricing requires commercial API |
| Push notifications for anomalies | In-app surfacing sufficient for v1.1 |
| Weather forecasting | Historical data only; forecasts add complexity without clear benefit |
| Multi-user sharing | Single user; no requirement |
| Automated bill ingestion | Manual entry only; OCR/email parsing deferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHART-01 | Phase 6 | Pending |
| CHART-02 | Phase 6 | Pending |
| CHART-03 | Phase 7 | Complete |
| TEMP-01 | Phase 7 | Complete |
| TEMP-02 | Phase 7 | Pending |
| ANAL-01 | Phase 8 | Pending |
| ANAL-02 | Phase 8 | Pending |
| ANAL-04 | Phase 8 | Pending |
| ANAL-05 | Phase 8 | Pending |
| ANAL-03 | Phase 9 | Pending |
| ANAL-06 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-05-29*
