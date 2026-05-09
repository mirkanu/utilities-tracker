# Requirements: Utilities Tracker

**Defined:** 2026-05-09
**Core Value:** See at a glance how much oil and electricity you're using, know when the oil will run out, and never miss an electricity contract renewal — all from your phone.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: User can log in with a password and stay logged in across sessions
- [ ] **FOUND-02**: User can log out from any page
- [ ] **FOUND-03**: App is accessible via HTTPS on a public URL (Cloudflare Tunnel)
- [x] **FOUND-04**: App is usable on a phone (mobile-first responsive layout)
- [ ] **FOUND-05**: User can navigate between Oil and Electricity sections

### Oil Tracking

- [ ] **OIL-01**: User can log a tank height reading (cm + date)
- [ ] **OIL-02**: User can view history of all tank readings (newest first)
- [ ] **OIL-03**: User can log an oil purchase (date, total litres, total cost £)
- [ ] **OIL-04**: User can view history of all oil purchases (newest first)
- [ ] **OIL-05**: User can see a graph of tank height over time, with refill events marked
- [ ] **OIL-06**: User can see an estimated date when the tank will run empty (based on consumption rate since last refill)

### Electricity Tracking

- [ ] **ELEC-01**: User can log a monthly meter reading (kWh value + date)
- [ ] **ELEC-02**: User can view history of all meter readings (newest first)
- [ ] **ELEC-03**: User can log a monthly bill (month, total cost £, total kWh consumed)
- [ ] **ELEC-04**: User can view history of all bills (newest first)
- [ ] **ELEC-05**: User can see a graph of monthly electricity usage (kWh) over time
- [ ] **ELEC-06**: User can see a graph of monthly electricity cost (£) over time
- [ ] **ELEC-07**: User can enter/edit the active electricity contract (provider name, unit rate p/kWh, contract type fixed/variable, expiry date)
- [ ] **ELEC-08**: User sees an in-app warning when the electricity contract is within 90, 60, or 30 days of expiry

### Dashboard

- [ ] **DASH-01**: User sees a home screen with key stats for both utilities (current oil level cm, estimated days/date to empty, last electricity bill cost & kWh, contract expiry countdown)

## v2 Requirements

### Oil Volume Conversion

- **OIL-V2-01**: User can enter tank dimensions or product code; app converts cm readings to approximate litres
- **OIL-V2-02**: Graphs show litres instead of (or alongside) cm once conversion is configured

### Bill Import

- **ELEC-V2-01**: User can forward a bill email; app parses and pre-fills the bill entry form
- **ELEC-V2-02**: User can photograph a bill; app extracts figures via OCR

### Temperature Correlation

- **TEMP-V2-01**: App overlays historical outside temperature (from Open-Meteo, Broughshane NI) on the oil consumption graph
- **TEMP-V2-02**: App shows heating degree day correlation — consumption vs temperature trend

### Trend Detection

- **ELEC-V2-03**: App flags months where electricity usage is significantly above or below baseline

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user / household accounts | Only one user; adds auth complexity with no benefit |
| Push notifications | In-app alert is sufficient for contract expiry; push adds infrastructure complexity |
| Gas tracking | User heats with oil, not gas; no requirement |
| Electricity market comparison / deal switching | Not the goal; too complex and requires 3rd party data |
| Solar / export tracking | Not relevant to user's setup |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Complete ✓ |
| FOUND-05 | Phase 1 | Pending |
| OIL-01 | Phase 2 | Pending |
| OIL-02 | Phase 2 | Pending |
| OIL-03 | Phase 2 | Pending |
| OIL-04 | Phase 2 | Pending |
| OIL-05 | Phase 2 | Pending |
| OIL-06 | Phase 2 | Pending |
| ELEC-01 | Phase 3 | Pending |
| ELEC-02 | Phase 3 | Pending |
| ELEC-03 | Phase 3 | Pending |
| ELEC-04 | Phase 3 | Pending |
| ELEC-05 | Phase 3 | Pending |
| ELEC-06 | Phase 3 | Pending |
| ELEC-07 | Phase 3 | Pending |
| ELEC-08 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-09*
*Last updated: 2026-05-09 after roadmap creation (traceability complete)*
