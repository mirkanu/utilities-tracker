import { db } from "@/lib/db/db";
import { oilReadings, oilPurchases } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import {
  computeYearStats,
  computeProjectedSpend,
  computeRefillPattern,
} from "@/lib/oil-analytics";
import { fetchTemperatures, type DailyTemp } from "@/lib/temperature-fetch";
import { YearComparisonCard } from "@/components/analytics/year-comparison-card";
import { ProjectedSpendCard } from "@/components/analytics/projected-spend-card";
import { RefillPatternCard } from "@/components/analytics/refill-pattern-card";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default async function AnalyticsPage() {
  const [readings, purchases] = await Promise.all([
    db.select().from(oilReadings).orderBy(asc(oilReadings.readingDate)),
    db.select().from(oilPurchases).orderBy(asc(oilPurchases.purchaseDate)),
  ]);

  const sortedDates = readings.map((r) => r.readingDate).sort();
  const startDate = sortedDates[0] ?? "2021-11-01";
  const endDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  let temperatures: DailyTemp[] = [];
  try {
    temperatures = await fetchTemperatures(startDate, endDate);
  } catch (err) {
    console.error("[analytics/page] fetchTemperatures failed:", err);
    temperatures = [];
  }

  const yearStats = computeYearStats(readings, purchases, temperatures);
  const projection = computeProjectedSpend(readings, purchases);
  const refillPattern = computeRefillPattern(purchases);

  return (
    <div className="p-4 pt-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Analytics</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Year on Year
        </h2>
        {yearStats.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Add oil readings to see year-on-year comparison.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          yearStats.map((stat) => (
            <YearComparisonCard
              key={stat.label}
              label={stat.label}
              totalLitres={stat.totalLitres}
              totalGbp={stat.totalGbp}
              avgLitresPerDay={stat.avgLitresPerDay}
              lPerHdd={stat.lPerHdd}
              colorVar={stat.colorVar}
            />
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Projected Spend
        </h2>
        <ProjectedSpendCard projection={projection} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Refill Pattern
        </h2>
        <RefillPatternCard pattern={refillPattern} />
      </section>
    </div>
  );
}
