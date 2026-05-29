import {
  pgTable,
  serial,
  integer,
  date,
  numeric,
  text,
  boolean,
} from "drizzle-orm/pg-core";

// Oil tracking — populated in Phase 2
export const oilReadings = pgTable("oil_readings", {
  id: serial("id").primaryKey(),
  readingDate: date("reading_date").notNull(), // DATE not TIMESTAMP (per CONTEXT.md)
  heightCm: integer("height_cm").notNull(),
  notes: text("notes"),
});

export const oilPurchases = pgTable("oil_purchases", {
  id: serial("id").primaryKey(),
  purchaseDate: date("purchase_date").notNull(), // DATE not TIMESTAMP
  litres: numeric("litres", { precision: 8, scale: 2 }).notNull(),
  totalCostGbp: numeric("total_cost_gbp", { precision: 8, scale: 2 }).notNull(),
  supplier: text("supplier"),
  notes: text("notes"),
});

// Electricity tracking — populated in Phase 3
// IMPORTANT: readings and bills are separate series, never reconciled (per CONTEXT.md)
export const electricityReadings = pgTable("electricity_readings", {
  id: serial("id").primaryKey(),
  readingDate: date("reading_date").notNull(), // DATE not TIMESTAMP
  readingKwh: numeric("reading_kwh", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const electricityBills = pgTable("electricity_bills", {
  id: serial("id").primaryKey(),
  periodStart: date("period_start").notNull(), // DATE: first day of the billing period
  periodEnd: date("period_end").notNull(),     // DATE: last day of the billing period
  totalCostGbp: numeric("total_cost_gbp", { precision: 8, scale: 2 }).notNull(),
  totalKwh: numeric("total_kwh", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const electricityContracts = pgTable("electricity_contracts", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  unitRatePence: numeric("unit_rate_pence", { precision: 6, scale: 3 }).notNull(),
  standingChargePence: numeric("standing_charge_pence", { precision: 6, scale: 3 }), // nullable — p/day
  contractType: text("contract_type").notNull(), // 'fixed' | 'variable'
  expiryDate: date("expiry_date"), // nullable — rolling contracts have no expiry
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
});

// Temperature cache — Phase 7 (TEMP-01)
export const dailyTemperatures = pgTable("daily_temperatures", {
  date: date("date").primaryKey().notNull(),
  avgTempC: numeric("avg_temp_c", { precision: 5, scale: 2 }).notNull(),
  hdd: numeric("hdd", { precision: 5, scale: 2 }).notNull(),
  fetchedAt: date("fetched_at").notNull(),
});
