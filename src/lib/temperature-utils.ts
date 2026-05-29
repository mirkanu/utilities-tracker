// Pure temperature + HDD utilities for the multi-year oil chart. No React dependencies.
import { heatingSeasonLabel } from "./oil-chart-grouping";
import type { DailyTemp } from "./temperature-fetch";

export function computeHdd(avgTempC: number): number {
  return Math.max(0, 15.5 - avgTempC);
}

export function computeDailyAvgTemp(maxTempC: number, minTempC: number): number {
  return (maxTempC + minTempC) / 2;
}

export function aggregateMonthlyTemp(
  temps: DailyTemp[]
): { month: number; avgTempC: number }[] {
  const byMonth = new Map<number, number[]>();
  for (const t of temps) {
    const month = parseInt(t.date.slice(5, 7), 10);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(t.avgTempC);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, vals]) => ({
      month,
      avgTempC: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
    }));
}

export function aggregateAnnualHdd(
  temps: DailyTemp[],
  mode: "calendar" | "season"
): { label: string; totalHdd: number }[] {
  const byPeriod = new Map<string, number>();
  for (const t of temps) {
    const label = mode === "calendar"
      ? t.date.slice(0, 4)
      : heatingSeasonLabel(t.date);
    byPeriod.set(label, (byPeriod.get(label) ?? 0) + t.hdd);
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, totalHdd]) => ({ label, totalHdd: Math.round(totalHdd) }));
}
