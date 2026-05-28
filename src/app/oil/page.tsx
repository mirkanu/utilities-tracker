import { db } from "@/lib/db/db";
import { oilReadings, oilPurchases } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { computeDepletion } from "@/lib/oil-depletion";
import { DepletionCard } from "@/components/oil/depletion-card";
import { TankChart } from "@/components/oil/tank-chart";
import { ReadingsSection } from "@/components/oil/readings-section";
import { PurchasesSection } from "@/components/oil/purchases-section";

export default async function OilPage() {
  // Fetch all readings and purchases in parallel
  const [readings, purchases] = await Promise.all([
    db.select().from(oilReadings).orderBy(desc(oilReadings.readingDate)),
    db.select().from(oilPurchases).orderBy(desc(oilPurchases.purchaseDate)),
  ]);

  // Compute depletion server-side (pure function — no extra DB call)
  const { daysRemaining, emptyDate } = computeDepletion(
    readings.map((r) => ({ readingDate: r.readingDate, heightCm: r.heightCm })),
    purchases.map((p) => ({ purchaseDate: p.purchaseDate }))
  );

  return (
    <div className="p-4 pt-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Oil</h1>
      </div>

      {/* Depletion prediction card */}
      <DepletionCard daysRemaining={daysRemaining} emptyDate={emptyDate} />

      {/* Tank level chart — null when no readings (component handles empty gracefully) */}
      <TankChart
        readings={readings.map((r) => ({
          readingDate: r.readingDate,
          heightCm: r.heightCm,
        }))}
        purchases={purchases.map((p) => ({ purchaseDate: p.purchaseDate }))}
      />

      {/* Readings history */}
      <ReadingsSection
        initialReadings={readings.map((r) => ({
          id: r.id,
          readingDate: r.readingDate,
          heightCm: r.heightCm,
        }))}
      />

      {/* Purchases history */}
      <PurchasesSection
        initialPurchases={purchases.map((p) => ({
          id: p.id,
          purchaseDate: p.purchaseDate,
          litres: p.litres,
          totalCostGbp: p.totalCostGbp,
          supplier: p.supplier ?? null,
        }))}
        lastSupplier={purchases.find((p) => p.supplier)?.supplier ?? ""}
      />
    </div>
  );
}
