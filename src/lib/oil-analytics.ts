// Pure analytics transforms for the analytics page. No React dependencies.
import { computeMonthlyUsage } from "./oil-chart-grouping";
import { computeDepletion } from "./oil-depletion";
import { aggregateAnnualHdd } from "./temperature-utils";
import type { DailyTemp } from "./temperature-fetch";

const MS_PER_DAY = 86_400_000;
const parseLocalDate = (s: string) => new Date(s + "T12:00:00");

export type YearStats = {
  label: string;
  totalLitres: number;
  totalGbp: number;
  avgLitresPerDay: number;
  lPerHdd: number | null;
  colorVar: string;
};

export type ProjectedSpend = {
  projectedLitres: number;
  projectedGbp: number;
  currentLitresPerDay: number;
  daysRemaining: number;
  periodLabel: "This calendar year";
};

export type RefillPattern = {
  avgIntervalDays: number;
  trend: "shorter" | "longer" | "stable";
  estimatedNextRefillDate: Date | null;
};

// Inputs use the DB row shape — numeric() columns are strings.
type ReadingInput = { readingDate: string; heightCm: number };
type PurchaseInput = { purchaseDate: string; litres: string; totalCostGbp: string };

export function computeYearStats(
  readings: ReadingInput[],
  purchases: PurchaseInput[],
  temperatures: DailyTemp[]
): YearStats[] {
  if (readings.length === 0) return [];

  // 1. Monthly usage points (handles refill-skip, DST-safe)
  const monthly = computeMonthlyUsage(readings);

  // 2. Sum monthly litres per year
  const litresByYear = new Map<string, number>();
  for (const m of monthly) {
    litresByYear.set(m.year, (litresByYear.get(m.year) ?? 0) + m.litres);
  }

  // Only emit years that appear in monthly usage (have actual consumption data)
  if (litresByYear.size === 0) return [];

  // 3. Sum purchases by year
  const gbpByYear = new Map<string, number>();
  for (const purchase of purchases) {
    const year = purchase.purchaseDate.slice(0, 4);
    gbpByYear.set(year, (gbpByYear.get(year) ?? 0) + parseFloat(purchase.totalCostGbp as unknown as string));
  }

  // 4. Date range per year from readings (firstDate, lastDate)
  const dateRangeByYear = new Map<string, { first: string; last: string }>();
  for (const reading of readings) {
    const year = reading.readingDate.slice(0, 4);
    const existing = dateRangeByYear.get(year);
    if (!existing) {
      dateRangeByYear.set(year, { first: reading.readingDate, last: reading.readingDate });
    } else {
      if (reading.readingDate < existing.first) existing.first = reading.readingDate;
      if (reading.readingDate > existing.last) existing.last = reading.readingDate;
    }
  }

  // 5. HDD per year from aggregateAnnualHdd
  const hddByYear = new Map(
    aggregateAnnualHdd(temperatures, "calendar").map((x) => [x.label, x.totalHdd])
  );

  // 6. Color index assignment (most recent = colorIndex 1)
  const sortedLabels = [...litresByYear.keys()].sort();
  const colorIndexFor = (label: string) => {
    const i = sortedLabels.indexOf(label);
    return ((sortedLabels.length - 1 - i) % 5) + 1;
  };

  // 7. Build result array sorted by label descending (most recent first)
  return sortedLabels
    .slice()
    .reverse()
    .map((label) => {
      const totalLitres = litresByYear.get(label) ?? 0;
      const totalGbp = gbpByYear.get(label) ?? 0;

      const range = dateRangeByYear.get(label);
      let avgLitresPerDay = 0;
      if (range) {
        // Approximation: denominator uses first/last raw reading dates for this
        // calendar year. totalLitres may include prorated consumption from
        // cross-year reading pairs (e.g. a pair spanning Dec 31 / Jan 1), so
        // the denominator can be slightly shorter than the actual consumption
        // period, inflating avgLitresPerDay for years where the earliest pair
        // straddles January 1.
        const days = Math.max(
          1,
          Math.round(
            (parseLocalDate(range.last).getTime() - parseLocalDate(range.first).getTime()) /
              MS_PER_DAY
          )
        );
        avgLitresPerDay = totalLitres / days;
      }

      const totalHdd = hddByYear.get(label);
      const lPerHdd =
        totalHdd === undefined || totalHdd === 0 ? null : totalLitres / totalHdd;

      const colorVar = `var(--year-color-${colorIndexFor(label)})`;

      return { label, totalLitres, totalGbp, avgLitresPerDay, lPerHdd, colorVar };
    });
}

export function computeProjectedSpend(
  readings: ReadingInput[],
  purchases: PurchaseInput[],
  today?: string // YYYY-MM-DD; defaults to London today
): ProjectedSpend | null {
  // 1. Get litresPerDay from segment-based depletion
  const depletion = computeDepletion(
    readings.map((r) => ({ readingDate: r.readingDate, heightCm: r.heightCm })),
    purchases.map((p) => ({ purchaseDate: p.purchaseDate }))
  );
  const litresPerDay = depletion.litresPerDay;
  if (litresPerDay === null) return null;

  // 2. Guard: no purchases → no price reference
  if (purchases.length === 0) return null;

  // 3. Today string in London timezone
  const todayStr =
    today ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  const year = todayStr.slice(0, 4);
  const yearEnd = parseLocalDate(year + "-12-31");

  // 5. Litres consumed in current year to date from monthly usage
  const monthly = computeMonthlyUsage(readings);
  const litresConsumedToDate = monthly
    .filter((m) => m.year === year)
    .reduce((s, m) => s + m.litres, 0);

  // 4. Days remaining from the last reading in the current year to Dec 31.
  // Using today as the handoff would leave a gap (last reading → today) that
  // falls in neither the accumulated nor the projected term.
  const currentYearReadings = readings.filter((r) => r.readingDate.startsWith(year));
  const lastReadingInYear = currentYearReadings.length
    ? currentYearReadings.map((r) => r.readingDate).sort().at(-1)!
    : todayStr;
  const handoffDate = parseLocalDate(lastReadingInYear);
  const daysRemaining = Math.max(
    0,
    Math.round((yearEnd.getTime() - handoffDate.getTime()) / MS_PER_DAY)
  );

  // 6. Projected total litres for the year
  const projectedLitres = litresConsumedToDate + litresPerDay * daysRemaining;

  // 7. Most recent purchase price per litre
  const mostRecent = purchases
    .slice()
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))[0];
  const litresNum = parseFloat(mostRecent.litres as unknown as string);
  if (!litresNum || litresNum <= 0) return null;
  const pricePerLitre =
    parseFloat(mostRecent.totalCostGbp as unknown as string) / litresNum;

  const projectedGbp = projectedLitres * pricePerLitre;

  return {
    projectedLitres,
    projectedGbp,
    currentLitresPerDay: litresPerDay,
    daysRemaining,
    periodLabel: "This calendar year",
  };
}

export function computeRefillPattern(
  purchases: PurchaseInput[],
  today?: string // YYYY-MM-DD; defaults to London today
): RefillPattern | null {
  // 1. Need at least 3 purchases for a meaningful pattern
  if (purchases.length < 3) return null;

  // 2. Sort purchases ascending by date
  const sorted = purchases
    .slice()
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));

  // 3. Compute consecutive intervals in days
  const intervals: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const days =
      (parseLocalDate(sorted[i + 1].purchaseDate).getTime() -
        parseLocalDate(sorted[i].purchaseDate).getTime()) /
      MS_PER_DAY;
    intervals.push(days);
  }

  // 4. Average interval (rounded to 1 decimal)
  const avgIntervalDays =
    Math.round((intervals.reduce((s, x) => s + x, 0) / intervals.length) * 10) / 10;

  // 5. Trend: compare first-half average to second-half average.
  // Use slice(-half) so both halves are the same size and the middle element
  // of an odd-length array is not silently dropped.
  const half = Math.floor(intervals.length / 2);
  const firstHalfAvg = intervals.slice(0, half).reduce((s, x) => s + x, 0) / half;
  const secondHalfAvg = intervals.slice(-half).reduce((s, x) => s + x, 0) / half;
  const trend: "shorter" | "longer" | "stable" =
    secondHalfAvg < firstHalfAvg * 0.9
      ? "shorter"
      : secondHalfAvg > firstHalfAvg * 1.1
        ? "longer"
        : "stable";

  // 6. Today string
  const todayStr =
    today ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  // 7. Estimated next refill date
  // Guard: avgIntervalDays = 0 (all purchases on same date) would cause an infinite loop.
  if (avgIntervalDays <= 0) {
    return { avgIntervalDays, trend, estimatedNextRefillDate: null };
  }

  const lastDate = parseLocalDate(sorted[sorted.length - 1].purchaseDate);
  let estimate = new Date(lastDate.getTime() + avgIntervalDays * MS_PER_DAY);

  // Advance estimate until it is in the future
  while (estimate < parseLocalDate(todayStr)) {
    estimate = new Date(estimate.getTime() + avgIntervalDays * MS_PER_DAY);
  }

  return { avgIntervalDays, trend, estimatedNextRefillDate: estimate };
}
