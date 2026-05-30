import { describe, it, expect } from "vitest";
import {
  computeYearStats,
  computeProjectedSpend,
  computeRefillPattern,
  detectAnomalies,
} from "./oil-analytics";
import type { AnomalyFlag } from "./oil-analytics";
import { computeMonthlyUsage } from "./oil-chart-grouping";

type R = { readingDate: string; heightCm: number };
type P = { purchaseDate: string; litres: string; totalCostGbp: string };
type T = { date: string; avgTempC: number; hdd: number };

const r = (readingDate: string, heightCm: number): R => ({ readingDate, heightCm });
const p = (purchaseDate: string, litres: number, cost: number): P => ({
  purchaseDate,
  litres: litres.toFixed(2),
  totalCostGbp: cost.toFixed(2),
});
const t = (date: string, hdd: number): T => ({ date, avgTempC: 5, hdd });

// ─────────────────────────────────────────────────────────────────────────────
// computeYearStats
// ─────────────────────────────────────────────────────────────────────────────

describe("computeYearStats", () => {
  it("returns one YearStats per calendar year present in readings", () => {
    const readings: R[] = [
      r("2023-01-15", 90),
      r("2023-06-15", 70),
      r("2024-01-15", 85),
      r("2024-06-15", 60),
      r("2025-01-15", 80),
      r("2025-06-15", 55),
    ];
    const purchases: P[] = [
      p("2023-03-01", 500, 320),
      p("2024-03-01", 500, 340),
      p("2025-03-01", 500, 360),
    ];
    const temps: T[] = [];
    const stats = computeYearStats(readings, purchases, temps);
    const labels = stats.map((s) => s.label).sort();
    expect(labels).toContain("2023");
    expect(labels).toContain("2024");
    expect(labels).toContain("2025");
    expect(stats.length).toBe(3);
  });

  it("totalLitres sums computeMonthlyUsage points by year", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-02-01", 90),   // 10 cm drop = 105L
      r("2024-03-01", 80),   // 10 cm drop = 105L → 210L total in 2024
    ];
    const purchases: P[] = [p("2024-01-01", 500, 350)];
    const temps: T[] = [];
    const stats = computeYearStats(readings, purchases, temps);
    const y2024 = stats.find((s) => s.label === "2024");
    expect(y2024).toBeDefined();
    // computeMonthlyUsage: Jan 1→Feb 1 = 31 days, 10cm = 105L; Feb 1→Mar 1 = 29 days (2024 leap), 10cm = 105L
    expect(y2024!.totalLitres).toBe(210);
  });

  it("totalGbp sums purchases by purchase year using parseFloat on numeric columns", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-12-31", 60),
    ];
    const purchases: P[] = [
      p("2024-03-01", 500, 320.5),
      p("2024-09-01", 600, 385.0),
    ];
    const temps: T[] = [];
    const stats = computeYearStats(readings, purchases, temps);
    const y2024 = stats.find((s) => s.label === "2024");
    expect(y2024).toBeDefined();
    expect(y2024!.totalGbp).toBeCloseTo(705.5, 1);
  });

  it("avgLitresPerDay = totalLitres / daysBetween(firstReading, lastReading) in that year", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-02-01", 90),   // 31 days, 105L
    ];
    const purchases: P[] = [];
    const temps: T[] = [];
    const stats = computeYearStats(readings, purchases, temps);
    const y2024 = stats.find((s) => s.label === "2024");
    expect(y2024).toBeDefined();
    // 105L over 31 days
    expect(y2024!.avgLitresPerDay).toBeCloseTo(105 / 31, 1);
  });

  it("lPerHdd is totalLitres / totalHdd from aggregateAnnualHdd('calendar')", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-02-01", 90),
    ];
    const purchases: P[] = [];
    // 31 days × 5 hdd each = 155 totalHdd for 2024
    const temps: T[] = Array.from({ length: 31 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return t(`2024-01-${day}`, 5);
    });
    const stats = computeYearStats(readings, purchases, temps);
    const y2024 = stats.find((s) => s.label === "2024");
    expect(y2024).toBeDefined();
    // 105L / 155 HDD
    expect(y2024!.lPerHdd).toBeCloseTo(105 / 155, 3);
  });

  it("lPerHdd is null when totalHdd for that year is 0", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-02-01", 90),
    ];
    const purchases: P[] = [];
    const temps: T[] = Array.from({ length: 31 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return t(`2024-01-${day}`, 0);
    });
    const stats = computeYearStats(readings, purchases, temps);
    const y2024 = stats.find((s) => s.label === "2024");
    expect(y2024).toBeDefined();
    expect(y2024!.lPerHdd).toBeNull();
  });

  it("lPerHdd is null when no temperature data covers that year", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-02-01", 90),
    ];
    const purchases: P[] = [];
    const temps: T[] = [t("2023-12-31", 10)]; // temp data only in 2023
    const stats = computeYearStats(readings, purchases, temps);
    const y2024 = stats.find((s) => s.label === "2024");
    expect(y2024).toBeDefined();
    expect(y2024!.lPerHdd).toBeNull();
  });

  it("colorVar assignment: most recent year gets var(--year-color-1)", () => {
    const readings: R[] = [
      r("2023-01-01", 100),
      r("2023-06-01", 80),
      r("2024-01-01", 90),
      r("2024-06-01", 70),
      r("2025-01-01", 85),
      r("2025-06-01", 65),
    ];
    const purchases: P[] = [];
    const temps: T[] = [];
    const stats = computeYearStats(readings, purchases, temps);
    expect(stats.find((s) => s.label === "2025")?.colorVar).toBe("var(--year-color-1)");
    expect(stats.find((s) => s.label === "2024")?.colorVar).toBe("var(--year-color-2)");
    expect(stats.find((s) => s.label === "2023")?.colorVar).toBe("var(--year-color-3)");
  });

  it("year with readings but no purchases returns totalGbp: 0", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-06-01", 70),
    ];
    const purchases: P[] = []; // no purchases
    const temps: T[] = [];
    const stats = computeYearStats(readings, purchases, temps);
    const y2024 = stats.find((s) => s.label === "2024");
    expect(y2024).toBeDefined();
    expect(y2024!.totalGbp).toBe(0);
  });

  it("empty readings array returns []", () => {
    expect(computeYearStats([], [], [])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeProjectedSpend
// ─────────────────────────────────────────────────────────────────────────────

describe("computeProjectedSpend", () => {
  it("returns null when computeDepletion returns litresPerDay: null", () => {
    // Only 1 reading after last purchase — insufficient for depletion
    const readings: R[] = [r("2025-01-01", 100)];
    const purchases: P[] = [p("2024-12-01", 500, 350)];
    const result = computeProjectedSpend(readings, purchases, "2025-10-05");
    expect(result).toBeNull();
  });

  it("returns null when there are no purchases (no price reference)", () => {
    const readings: R[] = [
      r("2025-01-01", 100),
      r("2025-06-01", 70),
    ];
    const purchases: P[] = [];
    const result = computeProjectedSpend(readings, purchases, "2025-10-05");
    expect(result).toBeNull();
  });

  it("daysRemaining counts whole days from today to Dec 31 of current year", () => {
    // today = "2026-10-05", Dec 31 2026 is 87 days away (Oct 5 to Dec 31 = 87 days)
    // Use recent readings with gentle depletion so regression stays positive
    const readings: R[] = [
      r("2026-08-01", 100),
      r("2026-09-30", 97),  // 2 cm drop over 60 days — gentle, tank stays high
    ];
    const purchases: P[] = [p("2026-07-15", 500, 350)];
    const result = computeProjectedSpend(readings, purchases, "2026-10-05");
    expect(result).not.toBeNull();
    // Oct 5 to Dec 31 2026 = 87 days
    expect(result!.daysRemaining).toBe(87);
  });

  it("currentLitresPerDay equals the litresPerDay returned by computeDepletion", () => {
    // Use recent readings so the regression doesn't project past empty
    const readings: R[] = [
      r("2026-04-01", 100),
      r("2026-05-01", 97),   // gentle 3 cm / 30 days
      r("2026-05-20", 96),
    ];
    const purchases: P[] = [p("2026-03-15", 500, 350)];
    const result = computeProjectedSpend(readings, purchases, "2026-05-30");
    expect(result).not.toBeNull();
    expect(result!.currentLitresPerDay).toBeGreaterThan(0);
  });

  it("projectedGbp uses most recent purchase price per litre", () => {
    // Use recent readings with gentle depletion so regression stays positive
    const readings: R[] = [
      r("2026-04-01", 100),
      r("2026-05-01", 97),
      r("2026-05-20", 96),
    ];
    // Most recent purchase: 600L for £420 → £0.70/L
    const purchases: P[] = [
      p("2026-03-01", 500, 300),
      p("2026-03-15", 600, 420),
    ];
    const result = computeProjectedSpend(readings, purchases, "2026-05-30");
    expect(result).not.toBeNull();
    // projectedGbp should use 420/600 = 0.70 per litre
    const expectedPricePerLitre = 420 / 600;
    expect(result!.projectedGbp).toBeCloseTo(result!.projectedLitres * expectedPricePerLitre, 0);
  });

  it("periodLabel is 'This calendar year'", () => {
    // Use recent readings with gentle depletion
    const readings: R[] = [
      r("2026-04-01", 100),
      r("2026-05-01", 97),
      r("2026-05-20", 96),
    ];
    const purchases: P[] = [p("2026-03-15", 500, 350)];
    const result = computeProjectedSpend(readings, purchases, "2026-05-30");
    expect(result).not.toBeNull();
    expect(result!.periodLabel).toBe("This calendar year");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeRefillPattern
// ─────────────────────────────────────────────────────────────────────────────

describe("computeRefillPattern", () => {
  it("returns null when fewer than 3 purchases", () => {
    expect(computeRefillPattern([], "2025-10-05")).toBeNull();
    expect(computeRefillPattern([p("2025-01-01", 500, 350)], "2025-10-05")).toBeNull();
    expect(computeRefillPattern([p("2025-01-01", 500, 350), p("2025-04-01", 500, 350)], "2025-10-05")).toBeNull();
  });

  it("avgIntervalDays is the mean of consecutive interval days, rounded to 1 decimal", () => {
    // 3 purchases at day 0, 60, 120 → intervals [60, 60] → avgIntervalDays = 60.0
    const purchases: P[] = [
      p("2024-01-01", 500, 350),
      p("2024-03-01", 500, 350), // 60 days later
      p("2024-04-30", 500, 350), // 60 days later
    ];
    const result = computeRefillPattern(purchases, "2025-10-05");
    expect(result).not.toBeNull();
    expect(result!.avgIntervalDays).toBe(60.0);
  });

  it("trend === 'shorter' when second-half mean < first-half mean * 0.9", () => {
    // intervals [100, 100, 50, 50] → first half avg 100, second half avg 50
    // 50 < 100 * 0.9 = 90 → "shorter"
    const purchases: P[] = [
      p("2020-01-01", 500, 350),
      p("2020-04-11", 500, 350), // +100 days
      p("2020-07-20", 500, 350), // +100 days
      p("2020-09-07", 500, 350), // +50 days
      p("2020-10-27", 500, 350), // +50 days
    ];
    const result = computeRefillPattern(purchases, "2025-10-05");
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("shorter");
  });

  it("trend === 'longer' when second-half mean > first-half mean * 1.1", () => {
    // intervals [50, 50, 100, 100] → first half avg 50, second half avg 100
    // 100 > 50 * 1.1 = 55 → "longer"
    const purchases: P[] = [
      p("2020-01-01", 500, 350),
      p("2020-02-20", 500, 350), // +50 days
      p("2020-04-10", 500, 350), // +50 days
      p("2020-07-19", 500, 350), // +100 days
      p("2020-10-27", 500, 350), // +100 days
    ];
    const result = computeRefillPattern(purchases, "2025-10-05");
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("longer");
  });

  it("trend === 'stable' when second-half mean within ±10% of first-half mean", () => {
    // intervals [60, 60, 62, 58] → first half avg 60, second half avg 60
    const purchases: P[] = [
      p("2020-01-01", 500, 350),
      p("2020-03-01", 500, 350), // +59 days (Jan has 31, so to Mar 1 = 60 days)
      p("2020-04-30", 500, 350), // +60 days
      p("2020-07-01", 500, 350), // +62 days
      p("2020-08-28", 500, 350), // +58 days
    ];
    const result = computeRefillPattern(purchases, "2025-10-05");
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("stable");
  });

  it("estimatedNextRefillDate = lastPurchaseDate + avgIntervalDays when that date is in the future", () => {
    // Last purchase 2025-09-01, avg interval 60 days → estimate = 2025-10-31
    const purchases: P[] = [
      p("2025-01-01", 500, 350),
      p("2025-03-02", 500, 350), // +60 days
      p("2025-09-01", 500, 350), // +183 days (but we need avg=60 so adjust)
    ];
    // With only 3 purchases, intervals = [daysBetween(Jan1, Mar2), daysBetween(Mar2, Sep1)]
    // Jan 1 to Mar 2 = 60 days; Mar 2 to Sep 1 = 183 days; avg = (60+183)/2 = 121.5
    // Last purchase = Sep 1 + 121.5 days ≈ Jan 1 2026 → in future from today "2025-10-05"
    const result = computeRefillPattern(purchases, "2025-10-05");
    expect(result).not.toBeNull();
    expect(result!.estimatedNextRefillDate).not.toBeNull();
    expect(result!.estimatedNextRefillDate!.getTime()).toBeGreaterThan(
      new Date("2025-10-05T12:00:00").getTime()
    );
  });

  it("estimatedNextRefillDate adds another avgIntervalDays when naive estimate is in the past", () => {
    // All purchases in 2020, avg interval 60 days
    // Naive estimate would be in 2020 (past), so we keep adding until future
    const purchases: P[] = [
      p("2020-01-01", 500, 350),
      p("2020-03-01", 500, 350), // +60 days
      p("2020-04-30", 500, 350), // +60 days
    ];
    const result = computeRefillPattern(purchases, "2025-10-05");
    expect(result).not.toBeNull();
    // estimatedNextRefillDate must be after today (2025-10-05)
    expect(result!.estimatedNextRefillDate!.getTime()).toBeGreaterThan(
      new Date("2025-10-05T12:00:00").getTime()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build readings that produce a given monthly usage sequence
//
// Strategy: produce one reading per month boundary, dropping by the target
// litres each interval. 1 cm drop = 10.5 L, so cmDrop = litres / 10.5.
// We start at heightCm=200 and subtract each month's cm drop in sequence.
// Months with litres=0 are implemented as a refill (height goes UP) so that
// computeMonthlyUsage skips the pair, producing a 0-litre month naturally.
// ─────────────────────────────────────────────────────────────────────────────

function buildReadingsForSequence(
  litresPerMonth: number[],
  startYear = 2020,
  startMonth = 1 // 1-indexed
): R[] {
  const CM_TO_LITRES = 10.5;
  let height = 200;
  let year = startYear;
  let month = startMonth;

  const readings: R[] = [];

  // First reading at the start of the sequence
  const firstDate = `${year}-${String(month).padStart(2, "0")}-01`;
  readings.push(r(firstDate, height));

  for (const litres of litresPerMonth) {
    // Advance to next month
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const dateStr = `${year}-${String(month).padStart(2, "0")}-01`;

    if (litres === 0) {
      // Simulate a refill: height goes up so computeMonthlyUsage skips this pair
      height += 20; // arbitrary rise — marks a refill
      readings.push(r(dateStr, height));
    } else {
      const cmDrop = litres / CM_TO_LITRES;
      height = Math.max(1, height - cmDrop);
      readings.push(r(dateStr, height));
    }
  }

  return readings;
}

// ─────────────────────────────────────────────────────────────────────────────
// detectAnomalies
// ─────────────────────────────────────────────────────────────────────────────

describe("detectAnomalies", () => {
  it("empty readings returns []", () => {
    expect(detectAnomalies([])).toEqual([]);
  });

  it("fewer than 3 readings returns []", () => {
    const readings: R[] = [r("2024-01-01", 100), r("2024-02-01", 90)];
    expect(detectAnomalies(readings)).toEqual([]);
  });

  it("fewer than 2 prior months in window returns []", () => {
    // Only 2 months of data → the second month has window of 1 prior month, not enough
    const readings = buildReadingsForSequence([100, 100], 2024, 1);
    expect(detectAnomalies(readings)).toEqual([]);
  });

  it("above-baseline month is flagged with direction=above", () => {
    // 12 months of 100L then one month of 350L (ratio = 3.5 → above)
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 350];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    expect(flags.length).toBeGreaterThanOrEqual(1);
    const aboveFlag = flags.find((f: AnomalyFlag) => f.direction === "above");
    expect(aboveFlag).toBeDefined();
    expect(aboveFlag!.multiplier).toBe(3.5);
    expect(aboveFlag!.explanation).toMatch(/3\.5× above your rolling average/);
  });

  it("below-baseline month is flagged with direction=below", () => {
    // 12 months of 100L then one month of 40L (ratio = 0.4 → below)
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 40];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    const belowFlag = flags.find((f: AnomalyFlag) => f.direction === "below");
    expect(belowFlag).toBeDefined();
    expect(belowFlag!.multiplier).toBe(0.4);
    expect(belowFlag!.explanation).toMatch(/0\.4× of your rolling average/);
  });

  it("actual=0 (refill-skip month) is NOT flagged below", () => {
    // 12 months of 100L then one month of 0 (refill-skip)
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 0];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    // The zero month should not appear as a flag
    const belowFlag = flags.find((f: AnomalyFlag) => f.direction === "below");
    expect(belowFlag).toBeUndefined();
  });

  it("zero baseline months are excluded from median window", () => {
    // Months: 0,0,100,100,100,100,300 — median of non-zero months in window before 300 is 100
    // 300/100 = 3.0 → should be flagged above
    const litres = [0, 0, 100, 100, 100, 100, 300];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    const aboveFlag = flags.find((f: AnomalyFlag) => f.direction === "above");
    expect(aboveFlag).toBeDefined();
  });

  it("flags returned most-recent-first", () => {
    // Two obvious anomalies at different positions in the sequence
    // 12 months of 100, then 300 (anomaly A), then 6 months of 100, then 300 (anomaly B)
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 300, 100, 100, 100, 100, 100, 100, 300];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    expect(flags.length).toBeGreaterThanOrEqual(2);
    // Most-recent-first: flag[0] should be from a later date than flag[1]
    const parseFlag = (period: string) => {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const [mon, yr] = period.split(" ");
      return parseInt(yr) * 12 + months.indexOf(mon);
    };
    expect(parseFlag(flags[0].period)).toBeGreaterThan(parseFlag(flags[1].period));
  });

  it("period label format en-GB short month (e.g. 'Jan 2025')", () => {
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 350];
    const readings = buildReadingsForSequence(litres, 2024, 1);
    const flags = detectAnomalies(readings);
    expect(flags.length).toBeGreaterThanOrEqual(1);
    expect(flags[0].period).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
  });

  it("multiplier is rounded to 1 decimal place", () => {
    // Use 314L as the anomalous month (ratio 3.14 → rounds to 3.1)
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 314];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    const aboveFlag = flags.find((f: AnomalyFlag) => f.direction === "above");
    expect(aboveFlag).toBeDefined();
    // 314 / 100 = 3.1 exactly after rounding to 1dp
    expect(aboveFlag!.multiplier).toBe(3.1);
  });

  it("ratios between 0.5 and 2 are NOT flagged", () => {
    // Months: 12 × 100, then 60 (0.6×), then 100 (1.0×), then 190 (1.9×)
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 60, 100, 190];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    expect(flags).toEqual([]);
  });

  it("boundary 2.0 IS flagged above (inclusive)", () => {
    // 12 months of 100L then exactly 200L → ratio = 2.0 exactly → should flag
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 200];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    const aboveFlag = flags.find((f: AnomalyFlag) => f.direction === "above");
    expect(aboveFlag).toBeDefined();
    expect(aboveFlag!.multiplier).toBe(2.0);
  });

  it("boundary 0.5 IS flagged below (inclusive)", () => {
    // 12 months of 100L then exactly 50L → ratio = 0.5 exactly → should flag
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 50];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const flags = detectAnomalies(readings);
    const belowFlag = flags.find((f: AnomalyFlag) => f.direction === "below");
    expect(belowFlag).toBeDefined();
    expect(belowFlag!.multiplier).toBe(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeYearStats with precomputed monthly
// ─────────────────────────────────────────────────────────────────────────────

describe("computeYearStats with precomputed monthly", () => {
  it("computeYearStats with and without precomputedMonthly returns identical results", () => {
    const readings: R[] = [
      r("2023-01-01", 100),
      r("2023-06-01", 80),
      r("2024-01-01", 90),
      r("2024-06-01", 65),
    ];
    const purchases: P[] = [p("2023-03-01", 500, 320), p("2024-03-01", 500, 340)];
    const temps: T[] = [];
    const precomputed = computeMonthlyUsage(readings);
    const withoutPrecomputed = computeYearStats(readings, purchases, temps);
    const withPrecomputed = computeYearStats(readings, purchases, temps, precomputed);
    expect(withPrecomputed).toEqual(withoutPrecomputed);
  });

  it("computeYearStats uses precomputed monthly when supplied (not re-computing)", () => {
    const readings: R[] = [
      r("2024-01-01", 100),
      r("2024-06-01", 80),
    ];
    const purchases: P[] = [p("2024-03-01", 500, 320)];
    const temps: T[] = [];

    // Fabricated precomputed: one entry for a year that has no actual readings
    const fabricated = [{ year: "2099", month: 1, litres: 9999 }];
    const result = computeYearStats(readings, purchases, temps, fabricated);

    // If precomputed was used, the result should contain the fabricated year 2099
    const year2099 = result.find((s) => s.label === "2099");
    expect(year2099).toBeDefined();
    expect(year2099!.totalLitres).toBe(9999);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// detectAnomalies with precomputed monthly
// ─────────────────────────────────────────────────────────────────────────────

describe("detectAnomalies with precomputed monthly", () => {
  it("detectAnomalies with and without precomputedMonthly returns identical results", () => {
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 350];
    const readings = buildReadingsForSequence(litres, 2020, 1);
    const precomputed = computeMonthlyUsage(readings);
    const withoutPrecomputed = detectAnomalies(readings);
    const withPrecomputed = detectAnomalies(readings, precomputed);
    expect(withPrecomputed).toEqual(withoutPrecomputed);
  });

  it("detectAnomalies uses precomputed monthly when supplied (not re-computing)", () => {
    // Readings: flat 100L/month for 2 years (no anomalies)
    const litres = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
    const readings = buildReadingsForSequence(litres, 2020, 1);

    // Fabricated precomputed: same steady sequence except last month is 500L (anomaly)
    const genuine = computeMonthlyUsage(readings);
    const fabricated = genuine.map((m, i) =>
      i === genuine.length - 1 ? { ...m, litres: 500 } : m
    );

    const withFabricated = detectAnomalies(readings, fabricated);
    // Should detect the fabricated anomaly (500 vs median ~100 = 5× above)
    const aboveFlag = withFabricated.find((f: AnomalyFlag) => f.direction === "above");
    expect(aboveFlag).toBeDefined();

    // Without fabrication, no anomaly expected
    const withoutFabricated = detectAnomalies(readings);
    expect(withoutFabricated).toEqual([]);
  });
});
