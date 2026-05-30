import { describe, it, expect } from "vitest";
import {
  computeHdd,
  computeDailyAvgTemp,
  aggregateMonthlyTemp,
  aggregateAnnualHdd,
} from "./temperature-utils";

describe("computeHdd", () => {
  it("returns 5.5 when avgTempC=10", () => {
    expect(computeHdd(10)).toBe(5.5);
  });
  it("clamps to 0 when avgTempC >= 15.5", () => {
    expect(computeHdd(20)).toBe(0);
    expect(computeHdd(15.5)).toBe(0);
  });
  it("handles sub-zero temperatures", () => {
    expect(computeHdd(-5)).toBe(20.5);
  });
});

describe("computeDailyAvgTemp", () => {
  it("returns the mean of max and min", () => {
    expect(computeDailyAvgTemp(20, 10)).toBe(15);
    expect(computeDailyAvgTemp(5, -5)).toBe(0);
  });
});

describe("aggregateMonthlyTemp", () => {
  it("averages per calendar month across all years", () => {
    const result = aggregateMonthlyTemp([
      { date: "2024-01-15", avgTempC: 5, hdd: 10.5 },
      { date: "2025-01-15", avgTempC: 7, hdd: 8.5 },
      { date: "2024-07-15", avgTempC: 20, hdd: 0 },
    ]);
    expect(result).toEqual([
      { month: 1, avgTempC: 6 },
      { month: 7, avgTempC: 20 },
    ]);
  });
  it("returns empty array for empty input", () => {
    expect(aggregateMonthlyTemp([])).toEqual([]);
  });
  it("sorts results by month ascending", () => {
    const result = aggregateMonthlyTemp([
      { date: "2024-12-01", avgTempC: 2, hdd: 13.5 },
      { date: "2024-03-01", avgTempC: 8, hdd: 7.5 },
    ]);
    expect(result.map((r) => r.month)).toEqual([3, 12]);
  });
});

describe("aggregateAnnualHdd", () => {
  it("sums HDD per calendar year in calendar mode", () => {
    const result = aggregateAnnualHdd(
      [
        { date: "2024-01-15", avgTempC: 5, hdd: 10.5 },
        { date: "2024-02-15", avgTempC: 6, hdd: 9.5 },
        { date: "2025-01-15", avgTempC: 7, hdd: 8.5 },
      ],
      "calendar"
    );
    expect(result).toEqual([
      { label: "2024", totalHdd: 20 },
      { label: "2025", totalHdd: 9 },
    ]);
  });
  it("sums HDD per heating season (Oct-Sep) in season mode", () => {
    const result = aggregateAnnualHdd(
      [
        { date: "2024-11-15", avgTempC: 5, hdd: 10 },   // 2024/25 season
        { date: "2025-03-15", avgTempC: 6, hdd: 9 },    // 2024/25 season
        { date: "2025-11-15", avgTempC: 7, hdd: 8 },    // 2025/26 season
      ],
      "season"
    );
    expect(result).toEqual([
      { label: "2024/25", totalHdd: 19 },
      { label: "2025/26", totalHdd: 8 },
    ]);
  });
});
