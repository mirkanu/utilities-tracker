"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { computeMonthlyUsage, type YearMeta } from "@/lib/oil-chart-grouping";

interface Props {
  readings: { readingDate: string; heightCm: number }[];
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_LONG  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function MonthlyUsageChart({ readings }: Props) {
  const { merged, years, chartConfig } = useMemo(() => {
    if (readings.length === 0) {
      return { merged: [], years: [] as YearMeta[], chartConfig: {} as ChartConfig };
    }

    const points = computeMonthlyUsage(readings);

    // Collect unique year strings sorted ascending
    const uniqueYears = [...new Set(points.map((p) => p.year))].sort();

    // Assign colorIndex: most recent year = 1, older = higher index
    const yearMetas: YearMeta[] = uniqueYears.map((label, i) => ({
      label,
      colorIndex: ((uniqueYears.length - 1 - i) % 5) + 1,
    }));

    // Build chartConfig from years array
    const config: ChartConfig = Object.fromEntries(
      yearMetas.map((y) => [
        y.label,
        { label: y.label, color: `var(--year-color-${y.colorIndex})` },
      ])
    );

    // Build merged array: one entry per month 1-12
    // Each entry: { month: number, [yearLabel]: number | undefined }
    // Absent keys = no data for that month in that year (gap, not zero)
    const byMonthMap = new Map<number, Record<string, number>>();
    for (const p of points) {
      if (!byMonthMap.has(p.month)) byMonthMap.set(p.month, { month: p.month });
      byMonthMap.get(p.month)![p.year] = p.litres;
    }

    // Ensure all 12 months are present in the array (so x-axis is complete)
    const mergedArr = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return byMonthMap.get(month) ?? { month };
    });

    return { merged: mergedArr, years: yearMetas, chartConfig: config };
  }, [readings]);

  if (readings.length === 0) return null;

  return (
    <div className="space-y-2">
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <LineChart data={merged} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.3} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[1, 12]}
            ticks={[1,2,3,4,5,6,7,8,9,10,11,12]}
            tickFormatter={(v) => MONTH_SHORT[v - 1] ?? ""}
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
                labelFormatter={(label) => MONTH_LONG[Number(label) - 1] ?? String(label)}
                formatter={(value: unknown, name) => [`${value} L`, String(name)]}
              />
            }
          />
          {years.map((y) => (
            <Line
              key={y.label}
              type="monotone"
              dataKey={y.label}
              stroke={`var(--year-color-${y.colorIndex})`}
              strokeWidth={2}
              dot={{ r: 4, fill: `var(--year-color-${y.colorIndex})`, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>

      {/* Custom HTML legend below chart (NOT Recharts <Legend>) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {years.map((y) => (
          <div key={y.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: `var(--year-color-${y.colorIndex})` }}
            />
            <span className="text-muted-foreground">{y.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
