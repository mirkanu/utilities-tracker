# Domain Pitfalls

**Domain:** Personal home utility tracker (heating oil + electricity, single-user, manual entry)
**Researched:** 2026-05-09
**Confidence:** HIGH (domain-specific, based on established PostgreSQL, Next.js, and time-series patterns)

---

## Critical Pitfalls

Mistakes that cause data corruption, silent wrong predictions, or schema rewrites.

---

### Pitfall 1: Storing Dates as Timestamps Without Timezone Awareness (UK / Northern Ireland)

**What goes wrong:**
Storing reading dates as `TIMESTAMP WITHOUT TIME ZONE` (or as UTC `TIMESTAMPTZ` but treating them as dates) causes readings to shift days when the UK transitions between GMT and BST (British Summer Time, UTC+1). A reading entered on 2026-03-29 at 23:00 GMT becomes 2026-03-30 00:00 BST in display — the reading appears on the wrong day. Over many months of data this corrupts depletion-rate calculations because consumption is attributed to the wrong calendar day.

**Why it happens:**
Next.js API routes typically run in UTC (container timezone is UTC by default). When a user enters a date like "2026-03-29" on a phone in Belfast in the evening, JavaScript `new Date("2026-03-29")` parses it as UTC midnight, which is already 2026-03-28 23:00 in local time — the day before. If the server then stores UTC, the reading is attached to the wrong date.

**Consequences:**
- Depletion rate calculated over wrong intervals (off-by-one-day errors compound over a year)
- Graphs show readings on wrong calendar days
- "Last reading was 3 days ago" type logic becomes unreliable
- No obvious error — silently wrong data

**Prevention:**
- Use `DATE` column type in PostgreSQL (not `TIMESTAMP`) for all user-entered reading dates. Oil tank readings and electricity meter readings are date-stamped, not time-stamped — the user cares about "which day", not "what second".
- On the API layer: accept ISO date strings (`"2026-03-29"`) from the client, never `new Date()` on a bare date string. Insert them as PostgreSQL `DATE` literals.
- Set `timezone = 'Europe/London'` in the PostgreSQL connection session (`SET TIME ZONE 'Europe/London'`) or in the connection string (`options=-c timezone=Europe/London`).
- In Next.js: never let the server infer timezone from `new Date()`. If a date picker returns `"2026-03-29"`, pass it as a string directly to the SQL query, not via `new Date("2026-03-29").toISOString()`.

**Warning signs:**
- Any reading entered after 23:00 Belfast time appears on the previous day in the database
- Readings in late March / late October (DST transitions) appear on wrong days
- Your `DATE_DIFF` calculations return 364 days for annual spans that should be 365

**Phase:** Address in Phase 1 (schema creation). Retrofitting timezone handling onto existing data is painful.

---

### Pitfall 2: Oil Depletion Prediction Breaks on Refill Events

**What goes wrong:**
Linear regression or simple rate calculation applied across the entire tank-reading history gives a wildly wrong depletion rate whenever a purchase has occurred. After a refill, the tank level jumps up — a naive "first reading to last reading" slope treats this jump as negative consumption (the tank "filled itself"). The predicted empty date becomes nonsensical.

**Example:**
- Reading 1: 80 cm
- Reading 2: 60 cm (used 20 cm over 14 days — 1.43 cm/day)
- Purchase: +40 cm
- Reading 3: 95 cm
- Reading 4: 75 cm

A naive slope from Reading 1 to Reading 4 gives: (75 - 80) / (14 + 14 + 14) = -5/42 = -0.12 cm/day. Completely wrong.

**Why it happens:**
Developers think of tank level as a monotone decreasing series and apply a single linear fit. The purchase events break the monotone assumption.

**Consequences:**
- Depletion prediction is the core feature — if it's wrong, the app has no value
- "You'll run out in 847 days" when the real answer is 45 days
- Worst case: user trusts it and runs out of heating oil in winter

**Prevention:**
- Model consumption **segments** (between events), not the whole series. A segment is a contiguous run of tank readings with no purchase in between. Calculate the consumption rate within each segment independently.
- Schema: store readings and purchases as separate tables. The prediction algorithm queries readings ordered by date, then identifies segment boundaries by joining against purchases.
- For prediction, use only the **most recent segment** (since last purchase) — older segments are historical context only. Consumption rate changes with season, so old segments are less predictive anyway.
- Apply a **sanity check**: if the calculated rate is positive (tank appears to be filling), reject it and surface an error/warning rather than returning a nonsense date.
- The SQL for "readings since last purchase" is: `SELECT * FROM oil_readings WHERE reading_date > (SELECT MAX(purchase_date) FROM oil_purchases) ORDER BY reading_date`.
- Need at least 2 readings in the current segment to form a rate. With only 1 reading since last purchase, show "not enough data" rather than predicting.

**Warning signs:**
- Predicted empty date jumps dramatically after entering a purchase
- Rate is positive (consumption is negative)
- Prediction uses more than 5-6 readings to calculate (should use only post-last-purchase readings)

**Phase:** Address in Phase 2 (oil tracking feature). The segment model must be designed before the first prediction is written.

---

### Pitfall 3: Multiple Readings on the Same Day Break Unique Constraints and Rate Calculation

**What goes wrong:**
If a `UNIQUE(reading_date)` constraint exists on the oil readings table, the user cannot correct a mistaken reading on the same day without deleting the original. Without the constraint, two readings on the same day make rate calculation ambiguous — which one is "the" reading for that day?

**Why it happens:**
Date-level uniqueness seems sensible at schema design time. But corrections happen — the user enters "85" and means "58", realises immediately, and wants to enter the correct value. Without a correction mechanism, they're stuck.

**Consequences:**
- With a unique constraint: the user gets a database error when correcting a reading
- Without a unique constraint: depletion rate calculation has to pick one reading per day or average them — both create edge cases
- Graph shows two points for the same date, which confuses chart rendering

**Prevention:**
- Do not enforce `UNIQUE(reading_date)` at the database level. Instead, enforce it at the application level on **save/display** by using `SELECT DISTINCT ON (reading_date) ... ORDER BY reading_date, created_at DESC` — this takes the most-recently-entered reading per day.
- Add a `created_at TIMESTAMPTZ DEFAULT NOW()` column to every reading table. This timestamps when the row was inserted (not the reading date), enabling "latest wins" semantics.
- Provide an explicit edit/delete flow in the UI rather than asking users to enter a correcting duplicate.
- The depletion algorithm should always work on deduplicated readings: `DISTINCT ON (reading_date) ORDER BY reading_date, created_at DESC`.

**Warning signs:**
- User reports "I can't update yesterday's reading"
- Graph shows double points on a single date
- Rate calculation gives 0 cm/day for a period (two same-day readings = zero distance)

**Phase:** Address in Phase 1 (schema) and Phase 2 (oil tracking UI — include edit capability from day one).

---

### Pitfall 4: PostgreSQL Schema Locks In One Utility Type — V2 Addition Requires Rewrite

**What goes wrong:**
The v1 schema hard-codes oil and electricity as separate tables with utility-specific columns (`tank_cm`, `kwh_reading`, etc.). When a new utility type is added in v2 (e.g. gas, water), there is no generalised structure to extend. Adding a third utility requires new tables, new API routes, new UI components — full duplication.

**Why it happens:**
Premature table specialisation. It feels right to have `oil_readings` and `electricity_readings` because they have different columns. But the shared structure (date, value, notes, created_at) is identical.

**Consequences:**
- V2 utility addition requires schema migration + new backend routes + new frontend forms
- Every new utility type multiplies code surface area

**Prevention:**
- Two-table pattern: `utility_types` (lookup) + `readings` (polymorphic with `utility_type_id` FK and `numeric_value`). Utility-specific metadata (tank dimensions, contract provider) goes in a separate `utility_metadata` JSONB column or a typed sidecar table.
- For this app specifically: `oil_readings` and `electricity_readings` as separate tables is **acceptable** given the small surface area and concrete schema differences. However, avoid hard-coding utility-type logic in query functions — parameterise them so a new utility means adding a new query file, not rewriting existing ones.
- The schema migration risk is low if readings tables are clearly namespaced (`oil_readings`, `electricity_readings`) and shared logic (graph rendering, date range queries) is in utility-agnostic functions from the start.
- Minimum mitigation: design the API layer with a `/api/utilities/[type]/readings` route pattern from v1, not `/api/oil/readings` and `/api/electricity/readings` as separate flat routes.

**Warning signs:**
- Graph component has `if (type === 'oil') ... else if (type === 'electricity') ...` blocks
- API routes are completely separate with no shared logic
- Adding a third utility would require duplicating >200 lines of code

**Phase:** Address in Phase 1 (API route structure) and Phase 3 (refactoring review before v2 starts).

---

### Pitfall 5: Docker Container Timezone Defaults to UTC, Mismatching UK User Expectations

**What goes wrong:**
The Docker container running Next.js has `TZ=UTC` by default. When server-side code formats dates for display (e.g. "Last reading: 3 days ago" calculated server-side), it uses UTC. A reading entered at 01:00 Belfast time on 2026-10-26 (BST→GMT transition night) could be displayed as "yesterday" or "2 days ago" depending on which side of midnight UTC the server calculates from.

**Why it happens:**
Hetzner VPS servers typically run in UTC. Docker inherits host timezone. Next.js server-side code uses `new Date()` which is UTC in that environment.

**Consequences:**
- Relative date display ("3 days ago") is wrong around midnight
- Date sorting in SSR-rendered lists is inconsistent with what the user entered
- Any server-side `new Date().toLocaleDateString()` shows UTC date, not Belfast date

**Prevention:**
- Set `TZ=Europe/London` in the Docker Compose service environment for the Next.js container. This makes `new Date().toLocaleDateString()` use UK time server-side.
- Even with `TZ` set: prefer computing all relative date display client-side (in the browser, which is always in the user's timezone). Use `Intl.DateTimeFormat` with `timeZone: 'Europe/London'` explicitly rather than relying on environment defaults.
- Store dates as PostgreSQL `DATE` (not `TIMESTAMP`) for readings — this eliminates the timezone conversion problem at the database level entirely.
- In docker-compose.yml: `environment: - TZ=Europe/London`.

**Warning signs:**
- "Last reading" shows wrong date around 11pm-1am Belfast time
- Readings entered late at night appear as next-day in the app

**Phase:** Address in Phase 1 (Docker Compose setup). One line in docker-compose.yml.

---

## Moderate Pitfalls

---

### Pitfall 6: Chart Library Touch Interactions Break on Mobile (Recharts / Chart.js)

**What goes wrong:**
Recharts (the most common React chart library) has well-known issues on mobile touch:
- Tooltip requires hover, not available on touch — user taps, nothing happens
- Touch events on SVG don't bubble correctly in some mobile Safari versions
- A chart that fills `100%` width inside a flex container causes the container to expand infinitely on iOS (SVG width="100%" without explicit height triggers layout reflow loop)

**Why it happens:**
Chart libraries are primarily designed for desktop mouse interactions. Mobile is an afterthought.

**Consequences:**
- User taps on a data point and sees nothing — tooltips don't appear
- Page scrolling conflicts with chart pan/zoom gestures
- iOS Safari infinite expand causes page layout to break

**Prevention:**
- Use Recharts with `<ResponsiveContainer width="100%" height={300}>` (fixed `height` in px, never percentage height). Always set a fixed height.
- For tooltip on mobile, set `<Tooltip trigger="click" />` rather than relying on hover. Or render a selected point's data in a static info card below the chart.
- Wrap charts in a container with `touch-action: pan-y` CSS to allow vertical page scroll without interfering with chart touch events.
- Test on actual mobile viewport (use Playwright's device emulation or physical device) — desktop browser responsive mode doesn't accurately simulate touch event handling.
- Consider using `recharts` v2.x+ (current stable) — it has improved touch support over v1.

**Warning signs:**
- Chart tooltips don't appear when tapping on mobile
- Page layout expands beyond screen width on iOS
- Scrolling the page accidentally zooms the chart

**Phase:** Address in Phase 2/3 (when building chart UI). Test on mobile explicitly before marking chart feature done.

---

### Pitfall 7: Electricity Readings vs Bills Dual-Entry Creates Data Inconsistency

**What goes wrong:**
The app tracks both meter readings (manually read kWh) and bills (kWh + cost from bill document). These two data sources cover the same underlying quantity (kWh consumed) but will inevitably diverge. The meter reading date rarely aligns exactly with the billing period. If both are shown on the same graph without clear labelling, users confuse them — or assume they should match when they won't.

**Why it happens:**
Electricity suppliers bill in arrears for a period that ends before the bill is issued. The kWh on the bill covers "01 March to 31 March" but the user's meter reading on 01 April is for a different interval. These are different numbers that measure overlapping but not identical time windows.

**Consequences:**
- User sees meter reading of 342 kWh for March, bill says 328 kWh — thinks the app is broken
- Consumption graphs show apparently contradictory data
- Unit rate calculation (cost / kWh) differs between the two sources

**Prevention:**
- Treat meter readings and electricity bills as **two independent data series** — never try to reconcile them automatically.
- Label them clearly in the UI: "Meter readings" (your logged kWh) vs "Bills" (supplier billed kWh).
- Store them in separate tables: `electricity_meter_readings` and `electricity_bills`. Do not share columns or try to JOIN them for consumption calculation.
- The meter readings graph is for tracking your own consumption over time. The bills table is for cost tracking. Document this distinction in the UI (tooltip or info text).
- For the "monthly kWh" chart, use ONE source consistently — prefer meter readings for self-logged data, bills for cost attribution. Document the choice.

**Warning signs:**
- A single "electricity consumption" graph combining data from both tables
- User reports "my readings don't match my bill"
- Code that JOINs `electricity_meter_readings` and `electricity_bills` to calculate a single monthly figure

**Phase:** Address in Phase 3 (electricity tracking). Disambiguate in the UI from day one.

---

### Pitfall 8: Contract Expiry Alert Logic Skips Leap Years / Month Edge Cases

**What goes wrong:**
"Alert 60 days before contract expiry" implemented as `expiry_date - 60 days` in JavaScript using `new Date(expiryDate).setDate(date.getDate() - 60)` fails in some month transitions. For example, March 31 minus 60 days should be January 30, but `setDate()` can overflow into February if not handled carefully.

**Why it happens:**
JavaScript date arithmetic with `setDate()` is notoriously error-prone. `new Date("2027-03-31").setDate(new Date("2027-03-31").getDate() - 60)` actually works, but developers often make mistakes like `new Date("2027-03-31").setMonth(...)` combinations.

**Consequences:**
- Alert fires on wrong day (too early or too late)
- In worst case, alert never fires if date calculation overflows to an invalid month

**Prevention:**
- Use PostgreSQL for date arithmetic, not JavaScript: `SELECT expiry_date - INTERVAL '60 days'`. PostgreSQL handles leap years, month boundaries, and DST correctly.
- Or use the `date-fns` library in JavaScript: `subDays(expiryDate, 60)`. Never use raw `setDate()` subtraction.
- The alert check query: `SELECT * FROM electricity_contracts WHERE expiry_date - INTERVAL '60 days' <= CURRENT_DATE AND expiry_date > CURRENT_DATE`.
- Make the lead time configurable in the DB (store it as an integer column `alert_days_before`) rather than hardcoding 60.

**Warning signs:**
- Alert fires on a date that doesn't match the user's configured lead time
- Test with expiry dates in March/April (post-leap-day) and around BST transition

**Phase:** Address in Phase 3 (contract tracking feature).

---

### Pitfall 9: Single-User Auth — Brute Force and Session Fixation Risks

**What goes wrong:**
A single-user password login with no rate limiting is trivially brute-forceable. Since the app is public via Cloudflare Tunnel (internet-accessible), an attacker can script 10,000 password attempts per minute. The app doesn't need to be a high-value target — automated scanners hit everything.

The opposite mistake: using `httpOnly` cookie sessions correctly but forgetting to rotate the session ID on login. If an attacker plants a known session ID (e.g. via XSS on another domain), they can wait for the user to log in and then use that session — session fixation.

**Why it happens:**
Single-user apps feel low-stakes, so security is deprioritised. The developer implements a simple bcrypt check and sets a cookie without thinking about rate limiting or session rotation.

**Consequences:**
- Brute-forced password gives full access to all utility data and the ability to corrupt all readings
- No visible sign of compromise — single session, no "other logins" audit trail

**Prevention:**
- Implement rate limiting at the application layer: maximum 5 failed attempts per 15 minutes per IP, stored in PostgreSQL or an in-memory counter. After 5 failures, return 429 with a delay.
- Alternatively (simpler): use Cloudflare Tunnel's built-in access controls — add a Cloudflare Access rule that restricts the tunnel to your home IP or requires a one-time PIN email before the login page is shown. This pushes brute-force protection to the CDN layer.
- For session management, use `next-auth` v5 (Auth.js) with the `credentials` provider — it handles session rotation, CSRF tokens, and `httpOnly` secure cookies correctly out of the box. Do NOT roll a custom session with `crypto.randomBytes` unless you fully understand session fixation.
- If rolling custom: generate a new session ID on every successful login (`DELETE old session, INSERT new session`). Never reuse a session ID across login events.
- Set `Secure; HttpOnly; SameSite=Strict` on all session cookies.
- Add `NEXTAUTH_SECRET` (or equivalent) to `/home/services/.env.production` as `UTILITIES_NEXTAUTH_SECRET`.

**Warning signs:**
- Login endpoint returns 401 without any delay after wrong password (no rate limiting)
- Session cookie is regenerated on login (check: same cookie value before and after login = fixation vulnerability)
- No 429 response after repeated failures

**Phase:** Address in Phase 1 (auth setup). Security issues retrofitted onto existing auth are error-prone.

---

### Pitfall 10: PostgreSQL Connection Pool Exhaustion in Docker (Next.js Serverless-style)

**What goes wrong:**
Next.js API routes in a Docker container (non-serverless but with short-lived handler functions) can exhaust the PostgreSQL connection pool if each API route creates a new `pg.Pool` instance rather than sharing a singleton. In development this is masked (low request volume). In production, after enough route invocations, the app hangs waiting for a free connection.

**Why it happens:**
Next.js hot-reload in development constantly re-imports modules, which destroys old pool instances. To prevent this, developers often create the pool inside the route handler — which they then accidentally ship to production.

**Consequences:**
- App hangs after 10-20 requests (default pool max)
- `Error: timeout acquiring connection from pool` errors in logs
- Requires container restart to recover

**Prevention:**
- Create a single `pg.Pool` singleton in `lib/db.ts`, exported and reused across all API routes.
- In development, attach the pool to `global` to survive hot-reload: `global.__pgPool = global.__pgPool || new Pool(...)`.
- Set explicit pool limits in `docker-compose.yml` or the pool config: `max: 5` (sufficient for a single-user app), `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.
- Prefer `node-postgres` (`pg`) or `postgres.js` (`postgres`) — both are well-maintained. Avoid adding Prisma ORM overhead for a simple schema of 5-7 tables (the query complexity doesn't warrant it).

**Warning signs:**
- `import { pool } from '../db'` inside the API route file body (not at module level)
- No `max` setting in the Pool constructor
- App becomes unresponsive after several minutes of use

**Phase:** Address in Phase 1 (database connection setup).

---

## Minor Pitfalls

---

### Pitfall 11: Oil Readings Graph Looks Wrong When Tank Is Refilled

**What goes wrong:**
A line chart connecting all readings in date order draws a vertical line upward at refill time (e.g. from 30 cm to 95 cm). This is technically correct but visually implies the tank filled itself gradually — it looks like consumption went backwards. Users may interpret this as a graph bug.

**Prevention:**
- Mark refill events on the chart as vertical dashed lines or point annotations (distinct colour/shape).
- Connect line segments only within a consumption segment (not across refills). Use `connectNulls={false}` in Recharts and insert a `null` data point at each refill event date to break the line.
- Show purchases as a separate overlay (bar chart or marker) on the same time axis.

**Phase:** Address in Phase 2 (oil chart implementation).

---

### Pitfall 12: Depletion Prediction Breaks With Fewer Than 2 Readings Since Last Purchase

**What goes wrong:**
If the user just bought oil and has only entered one reading since, there is no rate to calculate. The app must handle this gracefully.

**Prevention:**
- Show "Need at least 2 readings since last purchase to predict depletion" with a specific prompt ("Add another reading in 1-2 weeks for a prediction").
- Never return a prediction from a single data point — even if the previous segment's rate is available, do not use it silently without disclosing the assumption.

**Phase:** Address in Phase 2 (oil prediction feature).

---

### Pitfall 13: Electricity Bill and Meter Reading Month Attribution Ambiguity

**What goes wrong:**
A bill for "January 2026" typically arrives in February. If the user enters it in February, what date should the system use? If it uses the entry date (February), the bill appears in the wrong month on the graph.

**Prevention:**
- Electricity bills should have a `billing_period_start` and `billing_period_end` date (or just a `billing_month` DATE column set to the first of the billed month). Never infer the billing period from the entry date.
- Make `billing_month` a required field in the bill entry form, defaulting to the previous calendar month (since bills arrive in arrears).

**Phase:** Address in Phase 3 (electricity bill UI schema).

---

### Pitfall 14: Mobile Form UX — Numeric Keyboard Not Triggered for Readings

**What goes wrong:**
A plain `<input type="text">` for entering "85.5 cm" or "1234 kWh" on mobile shows the alphabetic keyboard. Users must manually switch to the numeric keyboard — friction on every entry.

**Prevention:**
- Use `<input type="number" inputMode="decimal">` for all reading inputs. `type="number"` triggers the numeric keyboard but has quirks (spinner arrows on desktop, scroll-to-change behaviour); pair with CSS `input[type=number]::-webkit-inner-spin-button { display: none }`.
- Or use `<input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*">` — this triggers a clean numeric keypad on iOS without the `type="number"` browser quirks.
- Validate numeric input server-side regardless — never trust client-side `type` coercion.

**Phase:** Address in Phase 2-3 (all data entry forms).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Schema design | Storing dates as TIMESTAMP (Pitfall 1) | Use `DATE` columns for all reading dates |
| Phase 1: Schema design | No `created_at` column (Pitfall 3) | Add `created_at TIMESTAMPTZ DEFAULT NOW()` to every table |
| Phase 1: Auth setup | No rate limiting on login (Pitfall 9) | Use Cloudflare Access as outer guard OR next-auth with rate limiting |
| Phase 1: Docker setup | UTC timezone mismatch (Pitfall 5) | `TZ=Europe/London` in docker-compose.yml |
| Phase 1: DB connection | Pool exhaustion (Pitfall 10) | Singleton pool in `lib/db.ts`, attach to `global` for dev |
| Phase 2: Oil prediction | Refill events corrupting rate (Pitfall 2) | Segment-based calculation, post-last-purchase readings only |
| Phase 2: Oil prediction | Single reading since refill (Pitfall 12) | "Need 2 readings" guard with helpful prompt |
| Phase 2: Oil chart | Refill jump looks like graph bug (Pitfall 11) | Break line at refills, add refill markers |
| Phase 2: API routes | Utility-type coupling (Pitfall 4) | `/api/utilities/[type]/readings` route pattern |
| Phase 3: Electricity UI | Meter reading vs bill confusion (Pitfall 7) | Two independent series, clear labelling |
| Phase 3: Electricity UI | Bill month attribution (Pitfall 13) | Explicit `billing_month` field, default to last month |
| Phase 3: Contract alerts | Date arithmetic bugs (Pitfall 8) | PostgreSQL interval arithmetic, not JS `setDate()` |
| All phases: Mobile forms | Alphabetic keyboard (Pitfall 14) | `inputMode="decimal"` on all numeric fields |
| All phases: Charts | Mobile touch/layout (Pitfall 6) | Fixed px height on ResponsiveContainer, click tooltips |

---

## Sources

- PostgreSQL DATE vs TIMESTAMPTZ handling: PostgreSQL documentation (https://www.postgresql.org/docs/current/datatype-datetime.html)
- UK DST transitions: IANA timezone database `Europe/London` (GMT/BST transitions last Sunday in March and October)
- Recharts mobile pitfalls: Recharts GitHub issues (known SVG width 100% infinite expand on iOS)
- next-auth session handling: Auth.js documentation (https://authjs.dev)
- node-postgres pool configuration: https://node-postgres.com/apis/pool
- Confidence: HIGH for all pitfalls — based on well-documented PostgreSQL, Next.js, and Recharts behaviour patterns
