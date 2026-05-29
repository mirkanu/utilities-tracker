import { describe, it, expect } from "vitest";
import {
  calendarYearLabel,
  heatingSeasonLabel,
  dayOfYear,
  daysSinceOct1,
  groupReadings,
} from "./oil-chart-grouping";

describe("calendarYearLabel", () => {
  it("returns the 4-digit year string", () => {
    expect(calendarYearLabel("2024-03-15")).toBe("2024");
  });
  it("handles BST transition date without off-by-one", () => {
    expect(calendarYearLabel("2025-03-30")).toBe("2025");
  });
  it("handles BST end date", () => {
    expect(calendarYearLabel("2024-10-26")).toBe("2024");
  });
  it("handles leap year day", () => {
    expect(calendarYearLabel("2024-02-29")).toBe("2024");
  });
});

describe("heatingSeasonLabel", () => {
  it("returns previous season for Sep 30", () => {
    expect(heatingSeasonLabel("2024-09-30")).toBe("2023/24");
  });
  it("returns new season for Oct 1", () => {
    expect(heatingSeasonLabel("2024-10-01")).toBe("2024/25");
  });
  it("stays in season for Feb of following year", () => {
    expect(heatingSeasonLabel("2025-02-15")).toBe("2024/25");
  });
  it("mid-winter stays in season", () => {
    expect(heatingSeasonLabel("2024-11-15")).toBe("2024/25");
  });
  it("early spring still in previous season", () => {
    expect(heatingSeasonLabel("2025-03-10")).toBe("2024/25");
  });
});

describe("dayOfYear", () => {
  it("returns 1 for Jan 1", () => {
    expect(dayOfYear("2024-01-01")).toBe(1);
  });
  it("returns 366 on leap year Dec 31", () => {
    expect(dayOfYear("2024-12-31")).toBe(366);
  });
  it("returns 365 on non-leap year Dec 31", () => {
    expect(dayOfYear("2025-12-31")).toBe(365);
  });
  it("handles BST transition without off-by-one", () => {
    expect(dayOfYear("2025-03-30")).toBe(89);
  });
});

describe("daysSinceOct1", () => {
  it("returns 1 for Oct 1", () => {
    expect(daysSinceOct1("2024-10-01")).toBe(1);
  });
  it("returns 2 for Oct 2", () => {
    expect(daysSinceOct1("2024-10-02")).toBe(2);
  });
  it("returns 365 for Sep 30 of following year", () => {
    expect(daysSinceOct1("2025-09-30")).toBe(365);
  });
});

describe("groupReadings empty input", () => {
  it("returns empty merged + years", () => {
    expect(groupReadings([], "calendar")).toEqual({ merged: [], years: [] });
    expect(groupReadings([], "season")).toEqual({ merged: [], years: [] });
  });
});

describe("groupReadings calendar mode", () => {
  const readings = [
    { readingDate: "2024-01-15", heightCm: 80 },
    { readingDate: "2025-01-15", heightCm: 70 },
    { readingDate: "2025-02-14", heightCm: 65 },
  ];
  const out = groupReadings(readings, "calendar");
  it("produces 2 years sorted ascending", () => {
    expect(out.years.map(y => y.label)).toEqual(["2024", "2025"]);
  });
  it("assigns colorIndex 1 to most recent year", () => {
    expect(out.years.find(y => y.label === "2025")?.colorIndex).toBe(1);
    expect(out.years.find(y => y.label === "2024")?.colorIndex).toBe(2);
  });
  it("merged array is sorted by dayPos ascending", () => {
    const positions = out.merged.map(p => p.dayPos);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
  it("omits years with zero readings (no 2025 entry on 2024-only dayPos)", () => {
    const readings2 = [
      { readingDate: "2024-02-14", heightCm: 80 },
      { readingDate: "2026-02-14", heightCm: 60 },
    ];
    const out2 = groupReadings(readings2, "calendar");
    expect(out2.years.map(y => y.label)).toEqual(["2024", "2026"]);
    expect(out2.years.find(y => y.label === "2025")).toBeUndefined();
  });
});

describe("groupReadings season mode", () => {
  it("groups Nov 2024 and Feb 2025 into same 2024/25 season", () => {
    const out = groupReadings([
      { readingDate: "2024-11-15", heightCm: 80 },
      { readingDate: "2025-02-15", heightCm: 60 },
    ], "season");
    expect(out.years.map(y => y.label)).toEqual(["2024/25"]);
  });
  it("assigns colorIndex 1 to the only (most recent) season", () => {
    const out = groupReadings([
      { readingDate: "2024-11-15", heightCm: 80 },
    ], "season");
    expect(out.years[0].colorIndex).toBe(1);
  });
});
