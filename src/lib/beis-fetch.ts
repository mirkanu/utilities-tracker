/**
 * BEIS heating oil price fetcher.
 *
 * Source: DESNZ QEP Table 4.1.1 — "Standard grade burning oil (Pence per litre)".
 *
 * GRANULARITY NOTE: ANAL-06 requirement says "weekly average" but BEIS/DESNZ does
 * NOT publish weekly heating oil prices. The "weekly statistics" gov.uk page covers
 * road fuel (petrol/diesel) only. Monthly data is the finest authoritative resolution
 * available. Purchases are matched to BEIS price via purchaseDate.slice(0, 7).
 */
import "server-only";
import * as XLSX from "xlsx";
import { db } from "@/lib/db/db";
import { beisMonthlyPrices } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// DESNZ QEP Table 4.1.1 — verified 2026-05-30.
// URL contains a content-hash segment; will return 404 when DESNZ publishes a new edition.
// Update this constant manually when the staleness re-fetch starts logging errors (~monthly, around the 28th).
const DESNZ_XLSX_URL =
  "https://assets.publishing.service.gov.uk/media/6a155f039819be865f421cd9/table_411_413__9_.xlsx";
const SHEET_NAME = "4.1.1";
const HEADER_ROW_INDEX = 9; // row 10 in spreadsheet (0-based row 9)
const STALENESS_DAYS = 45;

function londonToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function daysBetween(isoDateA: string, isoDateB: string): number {
  const a = new Date(isoDateA + "T12:00:00Z").getTime();
  const b = new Date(isoDateB + "T12:00:00Z").getTime();
  return Math.floor(Math.abs(a - b) / 86_400_000);
}

// Excel serial date → "YYYY-MM-01". Uses XLSX.SSF.parse_date_code which handles the 1900 leap-year bug.
function excelSerialToMonthStart(serial: number): string {
  const parsed = XLSX.SSF.parse_date_code(serial);
  const year = String(parsed.y).padStart(4, "0");
  const month = String(parsed.m).padStart(2, "0");
  return `${year}-${month}-01`;
}

export async function fetchBeisPrices(): Promise<Record<string, number>> {
  const today = londonToday();

  // Staleness check
  const latest = await db
    .select({ maxMonth: sql<string | null>`MAX(month_start)` })
    .from(beisMonthlyPrices);
  const maxMonth = latest[0]?.maxMonth ?? null;
  const isStale = !maxMonth || daysBetween(maxMonth, today) > STALENESS_DAYS;

  if (isStale) {
    await refreshFromDesnz(today);
  }

  const rows = await db.select().from(beisMonthlyPrices);
  const out: Record<string, number> = {};
  for (const r of rows) {
    const key = r.monthStart.slice(0, 7); // "YYYY-MM"
    out[key] = parseFloat(r.pplPence as unknown as string);
  }
  return out;
}

async function refreshFromDesnz(today: string): Promise<void> {
  const res = await fetch(DESNZ_XLSX_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `[beis-fetch] DESNZ XLSX fetch failed: ${res.status} ${res.statusText}. ` +
      `The URL likely changed (DESNZ publishes monthly ~28th). ` +
      `Update DESNZ_XLSX_URL in beis-fetch.ts from https://www.gov.uk/government/statistical-data-sets/oil-and-petroleum-products-monthly-statistics`
    );
  }
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`[beis-fetch] Sheet "${SHEET_NAME}" not found in workbook. Sheets present: ${Object.keys(wb.Sheets).join(", ")}`);
  }

  // Parse as 2D array. header:1 returns rows as arrays. defval:null keeps column alignment.
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const rows: Array<{ monthStart: string; pplPence: string; fetchedAt: string }> = [];
  for (let i = HEADER_ROW_INDEX + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row) continue;
    const year = row[0]; // column A
    const monthSerial = row[1]; // column B (Excel serial)
    const burningOil = row[6]; // column G

    if (typeof year !== "number") continue; // skip blank/divider rows
    if (typeof monthSerial !== "number") continue;
    if (typeof burningOil !== "number") continue;

    const monthStart = excelSerialToMonthStart(monthSerial);
    rows.push({
      monthStart,
      pplPence: burningOil.toFixed(3),
      fetchedAt: today,
    });
  }

  if (rows.length === 0) {
    throw new Error("[beis-fetch] Parsed 0 rows from DESNZ XLSX — sheet structure may have changed.");
  }

  await db
    .insert(beisMonthlyPrices)
    .values(rows)
    .onConflictDoUpdate({
      target: beisMonthlyPrices.monthStart,
      set: {
        pplPence: sql`excluded.ppl_pence`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });
}
