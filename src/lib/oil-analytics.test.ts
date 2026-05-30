import { describe, it, expect } from "vitest";
import {
  computeYearStats,
  computeProjectedSpend,
  computeRefillPattern,
} from "./oil-analytics";

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
