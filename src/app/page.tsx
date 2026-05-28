import { db } from "@/lib/db/db";
import {
  oilReadings,
  oilPurchases,
  electricityBills,
  electricityContracts,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { computeDepletion } from "@/lib/oil-depletion";
import { computeDaysToExpiry } from "@/lib/electricity-utils";
import { ContractExpiryBanner } from "@/components/electricity/contract-expiry-banner";
import { OilStatCard } from "@/components/dashboard/oil-stat-card";
import { ElectricityStatCard } from "@/components/dashboard/electricity-stat-card";

export default async function HomePage() {
  // CRITICAL: fetch ALL oil readings + purchases (no LIMIT) — computeDepletion
  // needs the full series to find the segment since the last refill.
  // Electricity bills/contracts use limit(1) — dashboard only shows latest.
  const [readings, purchases, bills, contractRows] = await Promise.all([
    db.select().from(oilReadings).orderBy(desc(oilReadings.readingDate)),
    db.select().from(oilPurchases).orderBy(desc(oilPurchases.purchaseDate)),
    db
      .select()
      .from(electricityBills)
      .orderBy(desc(electricityBills.billMonth))
      .limit(1),
    db
      .select()
      .from(electricityContracts)
      .where(eq(electricityContracts.isActive, true))
      .limit(1),
  ]);

  const { daysRemaining, emptyDate } = computeDepletion(
    readings.map((r) => ({ readingDate: r.readingDate, heightCm: r.heightCm })),
    purchases.map((p) => ({ purchaseDate: p.purchaseDate }))
  );

  const contract = contractRows[0] ?? null;
  const bill = bills[0] ?? null;
  const daysToExpiry = computeDaysToExpiry(contract?.expiryDate);

  return (
    <div className="p-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Home</h1>
      </div>

      <ContractExpiryBanner
        daysToExpiry={daysToExpiry}
        expiryDate={contract?.expiryDate ?? null}
        provider={contract?.provider ?? null}
      />

      <div className="grid grid-cols-2 gap-4">
        <OilStatCard
          heightCm={readings[0]?.heightCm ?? null}
          daysRemaining={daysRemaining}
          emptyDate={emptyDate}
        />
        <ElectricityStatCard
          bill={
            bill
              ? { totalCostGbp: bill.totalCostGbp, totalKwh: bill.totalKwh }
              : null
          }
          daysToExpiry={daysToExpiry}
          expiryDate={contract?.expiryDate ?? null}
          provider={contract?.provider ?? null}
        />
      </div>

      <Link
        href="/oil"
        className="block text-sm text-muted-foreground"
      >
        View Oil details →
      </Link>
      <Link
        href="/electricity"
        className="block text-sm text-muted-foreground"
      >
        View Electricity details →
      </Link>
    </div>
  );
}
