"use client";

import { useMemo } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
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

interface Props {
  readings: { readingDate: string; heightCm: number }[];
  mode: GroupingMode;
}

type AnnualBar = { label: string; litres: number; colorIndex: number };

const chartConfig: ChartConfig = {
  litres: { label: "Litres", color: "var(--year-color-1)" },
};

export function AnnualUsageChart({ readings, mode }: Props) {
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
    return sortedLabels.map((label, i) => ({
      label,
      litres: Math.round(totals.get(label)!),
      colorIndex: ((sortedLabels.length - 1 - i) % 5) + 1,
    }));
  }, [readings, mode]);

  if (readings.length === 0) return null;

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={bars} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => `${v}L`}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={50}
        />
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
        <Bar dataKey="litres" isAnimationActive={false} radius={[4, 4, 0, 0]}>
          {bars.map((b) => (
            <Cell key={b.label} fill={`var(--year-color-${b.colorIndex})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
