"use client";

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

interface TankChartProps {
  readings: { readingDate: string; heightCm: number }[];
  purchases: { purchaseDate: string }[];
}

const chartConfig = {
  heightCm: {
    label: "Tank Level",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

// Custom Y-axis tick: shifts the anchor right by 20px so numbers don't clip
// against the SVG left boundary. Recharts hardcodes tspan x, so dx on the
// outer <text> is ignored — we must override x in a custom renderer.
function YAxisTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  return (
    <text
      x={x + 20}
      y={y}
      dy="0.355em"
      textAnchor="end"
      fontSize={11}
      fill="var(--muted-foreground)"
      className="recharts-text recharts-cartesian-axis-tick-value"
    >
      {payload?.value}cm
    </text>
  );
}

export function TankChart({ readings, purchases }: TankChartProps) {
  if (readings.length === 0) return null;

  // Sort ascending for correct left-to-right line direction
  const data = [...readings]
    .sort((a, b) => a.readingDate.localeCompare(b.readingDate))
    .map((r) => ({
      date: r.readingDate,   // "YYYY-MM-DD" — MUST match ReferenceLine x format exactly
      heightCm: r.heightCm,
    }));

  // Purchase dates as ReferenceLine x values — must be "YYYY-MM-DD" to match XAxis dataKey
  const purchaseDates = purchases.map((p) => p.purchaseDate);

  // Compute evenly-spaced X-axis ticks — explicitly include last point so
  // Recharts doesn't append it a second time, then deduplicate.
  const tickCount = 6;
  const step = Math.max(1, Math.floor((data.length - 1) / (tickCount - 1)));
  const ticks = [
    ...Array.from({ length: tickCount - 1 }, (_, i) => data[i * step].date),
    data[data.length - 1].date, // always end at the final reading
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <LineChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          ticks={ticks}
          tickFormatter={(value: string) =>
            new Date(value + "T12:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={<YAxisTick />}
          width={60}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) =>
                new Date(String(label) + "T12:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }
              formatter={(value: unknown) => [
                  `${value} cm / ~${cmToLitres(Number(value))} L`,
                  "Tank Level",
                ]}
            />
          }
        />
        {purchaseDates.map((d, i) => (
          <ReferenceLine
            key={d}
            x={d}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{
              value: new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "2-digit",
              }),
              position: "insideTopRight",
              fontSize: 10,
              fill: "var(--muted-foreground)",
              offset: i % 2 === 0 ? 4 : 16, // stagger overlapping labels vertically
            }}
          />
        ))}
        <Line
          type="monotone"
          dataKey="heightCm"
          stroke="var(--color-heightCm)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
