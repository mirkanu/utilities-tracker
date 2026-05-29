// Pure grouping transforms for the multi-year oil chart. No React dependencies.

export const MS_PER_DAY = 86_400_000;
export const MONTH_START_DAYS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
// Season-mode tick positions: Oct=1, Nov=32, Dec=62, Jan=93, Feb=124, Mar=152, Apr=183, May=213, Jun=244, Jul=274, Aug=305, Sep=335
export const SEASON_START_DAYS = [1, 32, 62, 93, 124, 152, 183, 213, 244, 274, 305, 335];

export type GroupingMode = "calendar" | "season";

export interface YearPoint {
  dayPos: number; // 1-based position on shared x-axis
  [yearLabel: string]: number | undefined;
}

export interface YearMeta {
  label: string; // e.g. "2024" or "2024/25"
  colorIndex: number; // 1..5 mapped to --year-color-N (most recent year = 1)
}

// DST-safe parse — REQUIRED pattern (mirrors oil-depletion.ts)
// new Date("YYYY-MM-DD") parses as UTC midnight which shifts backwards in BST;
// T12:00:00 keeps arithmetic in local time so results are always correct.
const parseLocalDate = (s: string) => new Date(s + "T12:00:00");

/**
 * Returns the 4-digit calendar year label for a given date string.
 * e.g. calendarYearLabel("2024-03-15") === "2024"
 */
export function calendarYearLabel(dateStr: string): string {
  return String(parseLocalDate(dateStr).getFullYear());
}

/**
 * Returns the heating season label (Oct–Sep) for a given date string.
 * e.g. heatingSeasonLabel("2024-11-15") === "2024/25"
 *      heatingSeasonLabel("2024-09-30") === "2023/24"
 */
export function heatingSeasonLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed; 9 = October
  const seasonStartYear = month >= 9 ? year : year - 1;
  return `${seasonStartYear}/${String(seasonStartYear + 1).slice(-2)}`;
}

/**
 * Returns the 1-based day-of-year for a given date string.
 * e.g. dayOfYear("2024-01-01") === 1
 *      dayOfYear("2024-12-31") === 366 (leap year)
 *      dayOfYear("2025-03-30") === 89  (BST transition — no off-by-one)
 */
export function dayOfYear(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  const year = d.getFullYear();
  // new Date(year, 0, 0) = Dec 31 of previous year (numeric args, not string)
  const start = new Date(year, 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Returns the 1-based days-since-Oct-1 for a given date string.
 * Oct 1 = 1, Oct 2 = 2, Sep 30 of next year = 365.
 * e.g. daysSinceOct1("2024-10-01") === 1
 */
export function daysSinceOct1(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const seasonStartYear = month >= 9 ? year : year - 1;
  // Oct 1 at noon (numeric args) to avoid DST edge cases
  const oct1 = new Date(seasonStartYear, 9, 1, 12, 0, 0);
  return Math.floor((d.getTime() - oct1.getTime()) / MS_PER_DAY) + 1;
}

/**
 * Groups an array of oil readings by year (calendar or heating season) and
 * returns a flat merged array suitable for Recharts multi-line overlay.
 *
 * Each element of `merged` has `{ dayPos, [yearLabel]: heightCm? }`.
 * Years with zero readings are omitted entirely.
 * `years` is sorted ascending; most recent year gets colorIndex=1.
 */
export function groupReadings(
  readings: { readingDate: string; heightCm: number }[],
  mode: GroupingMode
): { merged: YearPoint[]; years: YearMeta[] } {
  if (readings.length === 0) {
    return { merged: [], years: [] };
  }

  // 1. Assign each reading to a year label and x-position
  const byYear = new Map<string, Map<number, number>>();

  for (const r of readings) {
    const label =
      mode === "calendar"
        ? calendarYearLabel(r.readingDate)
        : heatingSeasonLabel(r.readingDate);
    const pos =
      mode === "calendar"
        ? dayOfYear(r.readingDate)
        : daysSinceOct1(r.readingDate);

    if (!byYear.has(label)) byYear.set(label, new Map());
    byYear.get(label)!.set(pos, r.heightCm);
  }

  // 2. Sort year labels ascending; assign color index (most recent = 1)
  const sortedLabels = [...byYear.keys()].sort();
  const years: YearMeta[] = sortedLabels.map((label, i) => ({
    label,
    colorIndex: ((sortedLabels.length - 1 - i) % 5) + 1, // most recent gets colorIndex=1, wraps at 5
  }));

  // 3. Merge into flat array keyed by dayPos
  const posMap = new Map<number, YearPoint>();
  for (const [label, points] of byYear) {
    for (const [pos, val] of points) {
      if (!posMap.has(pos)) posMap.set(pos, { dayPos: pos });
      posMap.get(pos)![label] = val;
    }
  }

  const merged = [...posMap.values()].sort((a, b) => a.dayPos - b.dayPos);
  return { merged, years };
}

export interface MonthlyPoint {
  /** Calendar year as 4-digit string, e.g. "2024" */
  year: string;
  /** Month number 1-12 */
  month: number;
  /** Estimated litres consumed in this calendar month */
  litres: number;
}

/**
 * Computes estimated oil consumption (litres) per calendar month from
 * irregular tank height readings using linear interpolation.
 *
 * Algorithm:
 * 1. Sort readings ascending by date.
 * 2. For each consecutive pair [r1, r2]:
 *    a. If r2.heightCm >= r1.heightCm → refill or flat; SKIP (no consumption).
 *    b. Compute daily depletion rate = (r1.heightCm - r2.heightCm) / days between.
 *    c. For each calendar month overlapping the [r1.date, r2.date) interval:
 *       - Compute overlap days (integer floor of days in this month that fall in the interval).
 *       - litres for this month += overlapDays * dailyRateCm * CM_TO_LITRES_RATIO.
 * 3. Return one MonthlyPoint per (year, month) pair with non-zero litres, sorted
 *    ascending by year then month.
 *
 * Notes:
 * - Uses parseLocalDate (T12:00:00) — same DST-safe pattern as the rest of this file.
 * - CM_TO_LITRES_RATIO = 10.5 — applied at accumulation time to preserve fractional
 *   cm precision during summation.
 * - Does NOT use cmToLitres() (which rounds) to avoid compounding rounding errors.
 */
export function computeMonthlyUsage(
  readings: { readingDate: string; heightCm: number }[]
): MonthlyPoint[] {
  if (readings.length < 2) return [];

  // Sort ascending
  const sorted = [...readings].sort((a, b) =>
    a.readingDate.localeCompare(b.readingDate)
  );

  // Accumulator keyed by "YYYY-MM" string
  const acc = new Map<string, number>();

  for (let i = 0; i < sorted.length - 1; i++) {
    const r1 = sorted[i];
    const r2 = sorted[i + 1];

    // Skip refill events and zero-change events
    if (r2.heightCm >= r1.heightCm) continue;

    const d1 = parseLocalDate(r1.readingDate);
    const d2 = parseLocalDate(r2.readingDate);
    const totalDays = Math.round((d2.getTime() - d1.getTime()) / MS_PER_DAY);
    if (totalDays <= 0) continue;

    const dailyRateCm = (r1.heightCm - r2.heightCm) / totalDays;

    // Walk through each calendar month that the segment [d1, d2) overlaps.
    // Month boundaries use noon (12:00:00) to match parseLocalDate — this keeps
    // all arithmetic consistent and avoids 0.5-day rounding errors from mixing
    // midnight month boundaries with noon reading dates.
    let cursor = new Date(d1.getFullYear(), d1.getMonth(), 1, 12, 0, 0);
    while (cursor < d2) {
      const monthStart = cursor;
      // First day of next month at noon
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0);
      const monthEnd = nextMonth;

      // Overlap = [max(d1, monthStart), min(d2, monthEnd))
      const overlapStart = d1 > monthStart ? d1 : monthStart;
      const overlapEnd = d2 < monthEnd ? d2 : monthEnd;
      const overlapDays = Math.round(
        (overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY
      );

      if (overlapDays > 0) {
        const year = String(cursor.getFullYear());
        const month = cursor.getMonth() + 1; // 1-indexed
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const litresThisMonth = overlapDays * dailyRateCm * 10.5; // CM_TO_LITRES_RATIO
        acc.set(key, (acc.get(key) ?? 0) + litresThisMonth);
      }

      cursor = nextMonth;
    }
  }

  // Build result array sorted by year then month
  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, litres]) => {
      const [year, monthStr] = key.split("-");
      return { year, month: parseInt(monthStr, 10), litres: Math.round(litres) };
    });
}
