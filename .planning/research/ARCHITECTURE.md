# Architecture Patterns

**Domain:** Personal home utility tracker (heating oil + electricity)
**Researched:** 2026-05-09
**Confidence:** HIGH (Next.js App Router + Drizzle + Recharts all verified via Context7)

---

## Recommended Architecture

A single Next.js 15 App Router application. No separate backend process. The app serves both the UI and the data layer via Server Actions and Route Handlers co-located with the relevant pages. PostgreSQL via Drizzle ORM is the only external service.

```
Browser (mobile-first)
    │
    ▼
Next.js App (Docker container)
    ├── app/                      ← Pages + Server Components
    │   ├── (auth)/login/         ← Login page, iron-session auth
    │   ├── (app)/                ← Protected route group
    │   │   ├── layout.tsx        ← Auth guard + nav shell
    │   │   ├── page.tsx          ← Dashboard (summary cards)
    │   │   ├── oil/              ← Oil section
    │   │   └── electricity/      ← Electricity section
    ├── lib/
    │   ├── db/                   ← Drizzle schema + client
    │   ├── auth.ts               ← iron-session config
    │   └── calculations/         ← Pure computation functions
    └── components/
        ├── charts/               ← Recharts wrappers
        ├── forms/                ← Data entry forms
        └── ui/                   ← shadcn components
```

---

## Data Schema

### Core principle
Two independent utility domains share no data. A single `users` table is omitted entirely — single-user means no FK ownership needed on readings. Session auth covers access control.

### Tables

```sql
-- Heating oil: tank level readings (cm)
CREATE TABLE oil_readings (
  id          SERIAL PRIMARY KEY,
  read_at     DATE NOT NULL,           -- date of the reading
  level_cm    NUMERIC(6, 1) NOT NULL,  -- tank height in cm
  note        TEXT,                    -- optional free-text
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Heating oil: purchase events
CREATE TABLE oil_purchases (
  id          SERIAL PRIMARY KEY,
  purchased_at DATE NOT NULL,          -- delivery date
  litres      NUMERIC(8, 1) NOT NULL,  -- volume delivered
  cost_gbp    NUMERIC(10, 2) NOT NULL, -- total invoice cost
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Electricity: monthly meter readings (kWh cumulative)
CREATE TABLE electricity_readings (
  id          SERIAL PRIMARY KEY,
  read_at     DATE NOT NULL,           -- date meter was read
  reading_kwh NUMERIC(10, 1) NOT NULL, -- cumulative meter value
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Electricity: monthly bills
CREATE TABLE electricity_bills (
  id             SERIAL PRIMARY KEY,
  bill_month     DATE NOT NULL,        -- first day of billing month
  kwh_consumed   NUMERIC(10, 1) NOT NULL,
  cost_gbp       NUMERIC(10, 2) NOT NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Electricity: active contract (one row, upserted)
CREATE TABLE electricity_contract (
  id             SERIAL PRIMARY KEY,
  provider       TEXT NOT NULL,
  tariff_name    TEXT,
  contract_type  TEXT NOT NULL CHECK (contract_type IN ('fixed', 'variable')),
  unit_rate_gbp  NUMERIC(8, 4),        -- pence/kWh as decimal GBP
  standing_charge_gbp NUMERIC(8, 4),   -- daily standing charge
  start_date     DATE NOT NULL,
  expiry_date    DATE,                 -- NULL = rolling/no fixed end
  alert_days     INTEGER DEFAULT 60,  -- notify N days before expiry
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### Drizzle schema (TypeScript, pg-core)

```typescript
import { pgTable, serial, date, numeric, text, integer, timestamp, check } from 'drizzle-orm/pg-core';

export const oilReadings = pgTable('oil_readings', {
  id:        serial('id').primaryKey(),
  readAt:    date('read_at').notNull(),
  levelCm:   numeric('level_cm', { precision: 6, scale: 1 }).notNull(),
  note:      text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const oilPurchases = pgTable('oil_purchases', {
  id:          serial('id').primaryKey(),
  purchasedAt: date('purchased_at').notNull(),
  litres:      numeric('litres', { precision: 8, scale: 1 }).notNull(),
  costGbp:     numeric('cost_gbp', { precision: 10, scale: 2 }).notNull(),
  note:        text('note'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const electricityReadings = pgTable('electricity_readings', {
  id:          serial('id').primaryKey(),
  readAt:      date('read_at').notNull(),
  readingKwh:  numeric('reading_kwh', { precision: 10, scale: 1 }).notNull(),
  note:        text('note'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const electricityBills = pgTable('electricity_bills', {
  id:          serial('id').primaryKey(),
  billMonth:   date('bill_month').notNull(),
  kwhConsumed: numeric('kwh_consumed', { precision: 10, scale: 1 }).notNull(),
  costGbp:     numeric('cost_gbp', { precision: 10, scale: 2 }).notNull(),
  note:        text('note'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const electricityContract = pgTable('electricity_contract', {
  id:               serial('id').primaryKey(),
  provider:         text('provider').notNull(),
  tariffName:       text('tariff_name'),
  contractType:     text('contract_type').notNull(),   // 'fixed' | 'variable'
  unitRateGbp:      numeric('unit_rate_gbp', { precision: 8, scale: 4 }),
  standingChargeGbp: numeric('standing_charge_gbp', { precision: 8, scale: 4 }),
  startDate:        date('start_date').notNull(),
  expiryDate:       date('expiry_date'),
  alertDays:        integer('alert_days').default(60),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

**No FK relationships between tables.** The two utility domains are independent; purchases do not reference readings (they are correlated by date in queries, not by FK). This simplifies schema and avoids cascade complexity for a single-user app.

**Use `date` not `timestamp` for readings.** A meter reading is an observation on a calendar day, not a point-in-time event. Storing as `DATE` makes range queries and month-grouping clean.

**`bill_month` stores the 1st of the month.** Group-by month queries become `DATE_TRUNC('month', bill_month)` with no ambiguity.

---

## Component Boundaries

### Route Structure

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx          ← Login form only; no nav shell
├── (app)/
│   ├── layout.tsx            ← Auth guard + bottom nav bar (mobile)
│   ├── loading.tsx           ← Global skeleton (required by perf rules)
│   ├── page.tsx              ← Dashboard
│   ├── oil/
│   │   ├── page.tsx          ← Oil overview (chart + recent readings)
│   │   ├── loading.tsx
│   │   ├── log/
│   │   │   └── page.tsx      ← Add reading / add purchase forms
│   │   └── history/
│   │       └── page.tsx      ← Full reading + purchase history table
│   └── electricity/
│       ├── page.tsx          ← Electricity overview (chart + contract alert)
│       ├── loading.tsx
│       ├── log/
│       │   └── page.tsx      ← Add meter reading / add bill forms
│       ├── history/
│       │   └── page.tsx      ← Full history table
│       └── contract/
│           └── page.tsx      ← Contract details + edit form
```

### UI Component Breakdown

| Component | Type | Responsibility |
|-----------|------|----------------|
| `BottomNav` | Client | Mobile tab bar — Oil / Electricity / Dashboard |
| `DashboardSummaryCards` | Server | Two stat cards: oil level + days-to-empty, electricity cost/kWh |
| `ContractExpiryBanner` | Server | In-app alert when within `alert_days` of expiry |
| `OilLevelChart` | Client | Recharts AreaChart: cm over time + depletion projection line |
| `OilHistoryTable` | Server | Readings + purchases, sortable by date |
| `ElectricityUsageChart` | Client | Recharts BarChart: monthly kWh consumed |
| `ElectricityCostChart` | Client | Recharts LineChart: cost/kWh trend over time |
| `LogOilReadingForm` | Client | Date + cm input, optimistic update |
| `LogOilPurchaseForm` | Client | Date + litres + cost input |
| `LogElectricityReadingForm` | Client | Date + kWh reading input |
| `LogElectricityBillForm` | Client | Month + kWh + cost input |
| `ContractForm` | Client | Provider / tariff / dates / rates + alert days |
| `Skeleton` variants | Client | Per-section shimmer placeholders |

---

## Data Flow: Readings → Calculations → Visualisations

### Oil depletion prediction

```
oil_readings (ordered by read_at ASC)
    │
    ▼
lib/calculations/oil.ts
    ├── computeDepletionRate()
    │     Δcm / Δdays across all readings pairs → rolling avg cm/day
    │     Weighted toward recent pairs (exponential decay optional)
    │
    ├── predictEmptyDate()
    │     currentLevel / depletionRate → days until 0 cm
    │     returns Date | null (null if rate ≤ 0 or no readings)
    │
    └── buildChartData()
          Merge actual readings + projected future points
          [ { date, actual: cm }, ..., { date, projected: cm } ]
              ↓
          OilLevelChart renders with two <Line> series:
            solid line = actual readings
            dashed line = projection to 0
          <ReferenceLine y={0} label="Empty" /> marks zero
```

### Electricity cost/kWh trend

```
electricity_bills (ordered by bill_month ASC)
    │
    ▼
lib/calculations/electricity.ts
    ├── computeCostPerKwh()
    │     costGbp / kwhConsumed per bill row → pence/kWh
    │
    ├── computeMonthlyConsumption()
    │     kwhConsumed per month for bar chart
    │
    └── computeContractExpiry()
          expiryDate - today → daysUntilExpiry
          if daysUntilExpiry <= alertDays → show banner
```

### Data flow direction

```
PostgreSQL
    ↓  (Drizzle query in Server Component or Server Action)
Server Component (async, runs on server)
    ↓  (serialisable props only)
Client Component (chart, form)
    ↓  (Server Action on submit)
PostgreSQL  (mutation + revalidatePath)
    ↓
Server Component re-renders with fresh data
```

**Calculation functions are pure TypeScript in `lib/calculations/`.** They take plain data arrays and return derived values. No DB calls inside them — queries happen in Server Components, results passed to calculations, then to chart components. This keeps calculations unit-testable without a DB.

---

## API Route Structure

All mutations go through **Server Actions** (co-located with forms in `app/`). No separate REST API layer needed for a single-user app. Route Handlers are used only for session management.

```
app/api/
└── auth/
    ├── login/
    │   └── route.ts      ← POST: validate password, set iron-session cookie
    └── logout/
        └── route.ts      ← POST: destroy session

app/(app)/oil/
└── actions.ts            ← 'use server': addReading, addPurchase, deleteReading

app/(app)/electricity/
└── actions.ts            ← 'use server': addReading, addBill, upsertContract
```

**Auth pattern:** iron-session stores `{ isLoggedIn: boolean }` in an encrypted cookie. Password is a single env var `UTILITIES_PASSWORD` (bcrypt-hashed or plain secret — single user so either is acceptable; bcrypt preferred). Middleware at `middleware.ts` redirects unauthenticated requests to `/login`.

---

## Charting Approach for Mobile

**Library: Recharts** with `ResponsiveContainer` wrapping every chart.

Rationale:
- React-native SVG components — no canvas, no imperative API, composable with JSX
- `ResponsiveContainer width="100%" height={250}` auto-sizes to phone viewport
- `ReferenceLine` and dashed `Line` series needed for oil prediction — both built-in
- Lighter than Chart.js (no global Chart instance) and more React-idiomatic than ECharts

**Mobile-specific chart configuration:**

```tsx
// Touch-friendly: larger dot radius, simplified X axis labels
<LineChart data={data}>
  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
  <YAxis tick={{ fontSize: 11 }} width={35} />
  <Tooltip
    contentStyle={{ fontSize: 13 }}
    // finger-friendly: tooltip always visible without hover
    trigger="axis"
  />
  <Line
    type="monotone"
    dataKey="levelCm"
    strokeWidth={2}
    dot={{ r: 4 }}
    activeDot={{ r: 7 }}
  />
</LineChart>
```

**Chart height:** 220–260px on mobile (fits above the fold on 375px viewport without scrolling). Keep Y-axis labels narrow (`width={35}`). Rotate X-axis labels only if more than 12 data points.

**Oil chart:** AreaChart (filled) for actual readings → conveys "volume" semantics. Dashed Line overlay for projection. `ReferenceLine y={0}` marks empty. Two data series in one dataset: `{ date, actual, projected }` with `null` substituted where a series doesn't apply.

**Electricity charts:** BarChart for monthly kWh (discrete months) + separate LineChart for cost/kWh trend. Two separate charts stacked vertically on the electricity page rather than one complex dual-axis chart.

---

## Build Order (Dependencies)

Build order is determined by what each layer depends on.

```
1. Infrastructure & Auth
   - Docker Compose + Dockerfile
   - Drizzle schema + migrations
   - iron-session login/logout
   - Middleware auth guard
   - (app) layout with BottomNav

2. Oil Domain — Data Layer
   - oil_readings table + Server Actions (add, delete)
   - oil_purchases table + Server Actions
   - lib/calculations/oil.ts (depletion rate, empty date)

3. Oil Domain — UI
   - Log forms (OilReadingForm, OilPurchaseForm)
   - OilLevelChart (depends on calculations)
   - History table
   - Oil overview page (depends on chart + calculations)

4. Electricity Domain — Data Layer
   - electricity_readings, electricity_bills, electricity_contract tables
   - Server Actions for each
   - lib/calculations/electricity.ts (cost/kWh, expiry)

5. Electricity Domain — UI
   - Log forms (ReadingForm, BillForm, ContractForm)
   - ElectricityUsageChart, ElectricityCostChart
   - ContractExpiryBanner
   - Electricity overview page

6. Dashboard
   - DashboardSummaryCards (depends on both domains)
   - Cross-domain layout polish

7. Polish & Hardening
   - Skeleton loading states per section
   - Optimistic updates on forms
   - Mobile viewport QA
```

**Key dependency constraint:** Charts cannot be built until calculation functions exist. Calculation functions cannot be built until the DB schema is seeded with real or fixture data. Therefore: schema → calculations → charts is a strict ordering.

**Auth must be built first.** Every subsequent page is behind the auth guard. Building auth last would require retrofitting middleware protection onto all routes.

---

## Scalability Considerations

This is a single-user personal app. Scalability is not a concern for data volume (< 1000 rows total lifetime). The relevant scalability questions are operational:

| Concern | Approach |
|---------|----------|
| Docker restarts losing state | Data in PostgreSQL volume, not container filesystem |
| Schema evolution | Drizzle migrations via `drizzle-kit migrate` — run on deploy |
| Adding v2 features (oil volume, temperature) | Add columns to existing tables via migration; calculations module is isolated |
| Moving from cm to litres | Add `volume_litres` nullable column to `oil_readings`; populate via migration once tank dimensions known |

---

## Sources

- Recharts `ResponsiveContainer` and `ReferenceLine` patterns: Context7 `/recharts/recharts` (HIGH confidence)
- Next.js Server Actions and App Router data fetching: Context7 `/vercel/next.js` (HIGH confidence)
- Drizzle ORM PostgreSQL schema definition: Context7 `/drizzle-team/drizzle-orm` (HIGH confidence)
- iron-session App Router pattern + middleware: Context7 `/vvo/iron-session` (HIGH confidence)
- Schema design and calculation approach: derived from domain analysis of PROJECT.md requirements (MEDIUM confidence — no external reference for this specific domain)
