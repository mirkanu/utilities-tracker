"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cmToLitres } from "@/lib/oil-config";
import {
  groupReadings,
  dayOfYear,
  daysSinceOct1,
  MONTH_START_DAYS,
  SEASON_START_DAYS,
  type GroupingMode,
} from "@/lib/oil-chart-grouping";
import { GroupingToggle } from "./grouping-toggle";
import { ViewToggle, type ChartView } from "./view-toggle";
import { MonthlyUsageChart } from "./monthly-usage-chart";
import { AnnualUsageChart } from "./annual-usage-chart";
import type { DailyTemp } from "@/lib/temperature-fetch";

interface Props {
  readings: { readingDate: string; heightCm: number }[];
  purchases: { purchaseDate: string }[];
  temperatures: DailyTemp[];
}

// Custom Y-axis tick: positions text 4px inside the right edge of the axis band.
// Recharts hardcodes tspan x, so dx on the outer <text> is ignored — we must override x.
function YAxisTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  const litres = payload ? cmToLitres(payload.value) : null;
  return (
    <text
      x={x - 4}
      y={y}
      textAnchor="end"
      fill="var(--muted-foreground)"
      className="recharts-text recharts-cartesian-axis-tick-value"
    >
      <tspan dy="-0.2em" fontSize={11}>{payload?.value}cm</tspan>
      {litres !== null && (
        <tspan x={x - 4} dy="1.3em" fontSize={10} opacity={0.7}>~{litres}L</tspan>
      )}
    </text>
  );
}

// Month label sequence for calendar mode (Jan..Dec)
const CAL_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// Month label sequence for season mode (Oct..Sep)
const SEASON_LABELS = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep"];

function RawViewContent({
  readings,
  purchases,
  mode,
}: {
  readings: Props["readings"];
  purchases: Props["purchases"];
  mode: GroupingMode;
}) {
  const { merged, years } = useMemo(
    () =>
      readings.length === 0
        ? { merged: [], years: [] }
        : groupReadings(readings, mode),
    [readings, mode]
  );

  const chartConfig: ChartConfig = Object.fromEntries(
    years.map((y) => [y.label, { label: y.label, color: `var(--year-color-${y.colorIndex})` }])
  );

  // Tick positions and labels depend on mode
  const monthLabels = mode === "calendar" ? CAL_LABELS : SEASON_LABELS;
  const tickPositions = mode === "calendar" ? MONTH_START_DAYS : SEASON_START_DAYS;
  const tickFormatter = (value: number) => {
    const idx = tickPositions.indexOf(value);
    return idx >= 0 ? monthLabels[idx] : "";
  };

  // Purchase dates mapped to the active mode's x-axis position
  const dayPosFor = mode === "calendar" ? dayOfYear : daysSinceOct1;
  const purchasePositions = purchases.map((p) => ({
    key: p.purchaseDate,
    pos: dayPosFor(p.purchaseDate),
  }));

  return (
    <>
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <LineChart data={merged} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.3} />
          <XAxis
            dataKey="dayPos"
            type="number"
            domain={[1, 366]}
            ticks={tickPositions}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={tickFormatter}
          />
          <YAxis tickLine={false} axisLine={false} tick={<YAxisTick />} width={48} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => {
                  const idx = tickPositions.indexOf(Number(label));
                  return idx >= 0 ? monthLabels[idx] : `Day ${label}`;
                }}
                formatter={(value: unknown, name) => [
                  `${value} cm / ~${cmToLitres(Number(value))} L`,
                  String(name),
                ]}
              />
            }
          />
          {purchasePositions.map((p) => (
            <ReferenceLine
              key={p.key}
              x={p.pos}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
          ))}
          {years.map((y) => (
            <Line
              key={y.label}
              type="linear"
              dataKey={y.label}
              stroke={`var(--year-color-${y.colorIndex})`}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={{ r: 4, fill: `var(--year-color-${y.colorIndex})`, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={true}
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
    </>
  );
}

export function MultiYearTankChart({ readings, purchases, temperatures }: Props) {
  const [view, setView] = useState<ChartView>("raw");
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("calendar");

  if (readings.length === 0) return null;

  const showTemp = temperatures.length > 0;

  return (
    <div className="space-y-2">
      <ViewToggle value={view} onChange={setView} />

      {view === "annual" && (
        <GroupingToggle value={groupingMode} onChange={setGroupingMode} />
      )}

      {view === "raw" && (
        <RawViewContent readings={readings} purchases={purchases} mode={groupingMode} />
      )}
      {view === "monthly" && (
        <MonthlyUsageChart readings={readings} temperatures={temperatures} showTemp={showTemp} />
      )}
      {view === "annual" && (
        <AnnualUsageChart readings={readings} mode={groupingMode} temperatures={temperatures} showTemp={showTemp} />
      )}
    </div>
  );
}
