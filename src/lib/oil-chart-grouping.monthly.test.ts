import { describe, it, expect } from "vitest";
import { computeMonthlyUsage } from "./oil-chart-grouping";

describe("computeMonthlyUsage", () => {
  it("returns [] for empty input", () => {
    expect(computeMonthlyUsage([])).toEqual([]);
  });

  it("returns [] for single reading", () => {
    expect(computeMonthlyUsage([{ readingDate: "2024-01-15", heightCm: 80 }])).toEqual([]);
  });

  it("segment exactly in January → 105L", () => {
    const result = computeMonthlyUsage([
      { readingDate: "2024-01-01", heightCm: 80 },
      { readingDate: "2024-02-01", heightCm: 70 }, // 10 cm drop over 31 days
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ year: "2024", month: 1, litres: 105 }); // 10 * 10.5
  });

  it("skips refill pair (r2 > r1)", () => {
    const result = computeMonthlyUsage([
      { readingDate: "2024-01-01", heightCm: 50 },
      { readingDate: "2024-01-15", heightCm: 120 }, // refill — skip
      { readingDate: "2024-02-01", heightCm: 110 },
    ]);
    // Only the 15 Jan → 1 Feb segment counts
    expect(result.every((p) => p.litres >= 0)).toBe(true);
    expect(result.find((p) => p.year === "2024" && p.month === 1)?.litres).toBeGreaterThan(0);
  });

  it("segment spanning two months splits correctly", () => {
    // Jan 16 → Feb 16: 31 days, 31 cm drop → 1 cm/day
    const result = computeMonthlyUsage([
      { readingDate: "2024-01-16", heightCm: 100 },
      { readingDate: "2024-02-16", heightCm: 69 },
    ]);
    const jan = result.find((p) => p.month === 1)!;
    const feb = result.find((p) => p.month === 2)!;
    // Jan 16-31 = 16 days, Feb 1-16 = 15 days
    expect(jan.litres).toBe(Math.round(16 * 1 * 10.5)); // 168
    expect(feb.litres).toBe(Math.round(15 * 1 * 10.5)); // 158 (rounded from 157.5)
  });

  it("two calendar years produce separate year labels", () => {
    const result = computeMonthlyUsage([
      { readingDate: "2023-12-01", heightCm: 90 },
      { readingDate: "2024-01-31", heightCm: 75 },
    ]);
    const years = [...new Set(result.map((p) => p.year))].sort();
    expect(years).toContain("2023");
    expect(years).toContain("2024");
  });
});
