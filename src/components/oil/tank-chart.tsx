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

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
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
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v}cm`}
          width={40}
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
              formatter={(value: unknown) => [`${value} cm`, "Tank Level"]}
            />
          }
        />
        {purchaseDates.map((d) => (
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
              }),
              position: "top",
              fontSize: 10,
              fill: "var(--muted-foreground)",
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
