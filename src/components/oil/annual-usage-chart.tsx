"use client";

import { useMemo } from "react";
import { ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  computeMonthlyUsage,
  heatingSeasonLabel,
  type GroupingMode,
} from "@/lib/oil-chart-grouping";
import type { DailyTemp } from "@/lib/temperature-fetch";
import { aggregateAnnualHdd } from "@/lib/temperature-utils";

interface Props {
  readings: { readingDate: string; heightCm: number }[];
  mode: GroupingMode;
  temperatures: DailyTemp[];
  showTemp: boolean;
}

type AnnualBar = { label: string; litres: number; colorIndex: number; totalHdd?: number };

const chartConfig: ChartConfig = {
  litres: { label: "Litres", color: "var(--year-color-1)" },
};

export function AnnualUsageChart({ readings, mode, temperatures, showTemp }: Props) {
  const bars = useMemo((): AnnualBar[] => {
    if (readings.length === 0) return [];

    const monthly = computeMonthlyUsage(readings);

    // Aggregate per year label (calendar year or heating season)
    const totals = new Map<string, number>();
    for (const p of monthly) {
      const label =
        mode === "calendar"
          ? p.year
          : heatingSeasonLabel(`${p.year}-${String(p.month).padStart(2, "0")}-15`);
      totals.set(label, (totals.get(label) ?? 0) + p.litres);
    }

    // Sort labels ascending
    const sortedLabels = [...totals.keys()].sort();

    // Assign colorIndex: most recent label = 1
    const baseBars: AnnualBar[] = sortedLabels.map((label, i) => ({
      label,
      litres: Math.round(totals.get(label)!),
      colorIndex: ((sortedLabels.length - 1 - i) % 5) + 1,
    }));

    // Merge HDD data when showTemp is enabled
    if (showTemp && temperatures.length > 0) {
      const hddByLabel = new Map(
        aggregateAnnualHdd(temperatures, mode).map((h) => [h.label, h.totalHdd])
      );
      return baseBars.map((b) => ({ ...b, totalHdd: hddByLabel.get(b.label) }));
    }

    return baseBars;
  }, [readings, mode, temperatures, showTemp]);

  if (readings.length === 0) return null;

  return (
    <div className="space-y-2">
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ComposedChart data={bars} margin={{ top: 20, right: showTemp ? 58 : 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.3} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `${v}L`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={50}
          />
          {showTemp && (
            <YAxis
              yAxisId="temp"
              orientation="right"
              tickFormatter={(v) => `${v}`}
              label={{ value: "HDD (base 15.5°C)", angle: -90, position: "insideRight", fontSize: 10 }}
              width={50}
            />
          )}
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value: unknown, _name) => [
                  `${value} L`,
                  mode === "calendar" ? "Calendar Year" : "Heating Season",
                ]}
              />
            }
          />
          <Bar yAxisId="left" dataKey="litres" isAnimationActive={false} radius={[4, 4, 0, 0]}>
            {bars.map((b) => (
              <Cell key={b.label} fill={`var(--year-color-${b.colorIndex})`} />
            ))}
          </Bar>
          {showTemp && (
            <Line
              dataKey="totalHdd"
              yAxisId="temp"
              type="monotone"
              stroke="var(--temp-color)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              opacity={0.8}
              dot={{ r: 4, fill: "var(--temp-color)", strokeWidth: 0 }}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ChartContainer>

      {showTemp && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: "var(--temp-color)" }}
            />
            <span className="text-muted-foreground">HDD (heating degree days)</span>
          </div>
        </div>
      )}
    </div>
  );
}
