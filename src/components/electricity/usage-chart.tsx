"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface BillForChart {
  billMonth: string;
  totalKwh: string;
  totalCostGbp: string;
}

interface UsageChartProps {
  bills: BillForChart[];
}

const chartConfig = {
  totalKwh: {
    label: "Usage (kWh)",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function UsageChart({ bills }: UsageChartProps) {
  if (bills.length === 0) return null;

  const data = [...bills]
    .sort((a, b) => a.billMonth.localeCompare(b.billMonth))
    .map((b) => ({
      month: b.billMonth,
      totalKwh: parseFloat(b.totalKwh),
    }));

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
          tickFormatter={(value: string) =>
            new Date(value + "T12:00:00").toLocaleDateString("en-GB", {
              month: "short",
              year: "2-digit",
            })
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v}`}
          width={40}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) =>
                new Date(String(label) + "T12:00:00").toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })
              }
              formatter={(value: unknown) => [`${value} kWh`, "Usage"]}
            />
          }
        />
        <Bar
          dataKey="totalKwh"
          fill="var(--color-totalKwh)"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
