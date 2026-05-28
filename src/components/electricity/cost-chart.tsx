"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface BillForChart {
  periodStart: string;
  totalKwh: string;
  totalCostGbp: string;
}

interface CostChartProps {
  bills: BillForChart[];
}

const chartConfig = {
  totalCostGbp: {
    label: "Cost (£)",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function CostChart({ bills }: CostChartProps) {
  if (bills.length === 0) return null;

  const data = [...bills]
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
    .map((b) => ({
      month: b.periodStart,
      totalCostGbp: parseFloat(b.totalCostGbp),
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
          tickFormatter={(v: number) => `£${v.toFixed(0)}`}
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
              formatter={(value: unknown) => [`£${parseFloat(String(value)).toFixed(2)}`, "Cost"]}
            />
          }
        />
        <Bar
          dataKey="totalCostGbp"
          fill="var(--color-totalCostGbp)"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
