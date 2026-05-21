import { db } from "@/lib/db/db";
import {
  electricityReadings,
  electricityBills,
  electricityContracts,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ContractExpiryBanner } from "@/components/electricity/contract-expiry-banner";
import { UsageChart } from "@/components/electricity/usage-chart";
import { CostChart } from "@/components/electricity/cost-chart";
import { ContractSection } from "@/components/electricity/contract-section";
import { ReadingsSection } from "@/components/electricity/readings-section";
import { BillsSection } from "@/components/electricity/bills-section";

function computeDaysToExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T12:00:00");
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

export default async function ElectricityPage() {
  const [readings, bills, contractRows] = await Promise.all([
    db.select().from(electricityReadings).orderBy(desc(electricityReadings.readingDate)),
    db.select().from(electricityBills).orderBy(desc(electricityBills.billMonth)),
    db.select().from(electricityContracts).where(eq(electricityContracts.isActive, true)).limit(1),
  ]);
  const contract = contractRows[0] ?? null;
  const daysToExpiry = computeDaysToExpiry(contract?.expiryDate);

  // Bills shape for charts (only the three fields charts need)
  const billsForCharts = bills.map((b) => ({
    billMonth: b.billMonth,
    totalKwh: b.totalKwh,
    totalCostGbp: b.totalCostGbp,
  }));

  // Plain-object mapping for sections
  const readingsForSection = readings.map((r) => ({
    id: r.id,
    readingDate: r.readingDate,
    readingKwh: r.readingKwh,
    notes: r.notes,
  }));
  const billsForSection = bills.map((b) => ({
    id: b.id,
    billMonth: b.billMonth,
    totalKwh: b.totalKwh,
    totalCostGbp: b.totalCostGbp,
    notes: b.notes,
  }));
  const contractForSection = contract
    ? {
        id: contract.id,
        provider: contract.provider,
        unitRatePence: contract.unitRatePence,
        contractType: contract.contractType,
        expiryDate: contract.expiryDate,
        notes: contract.notes,
      }
    : null;

  return (
    <div className="p-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Electricity</h1>
      </div>
      <ContractExpiryBanner
        daysToExpiry={daysToExpiry}
        expiryDate={contract?.expiryDate ?? null}
        provider={contract?.provider ?? null}
      />
      <UsageChart bills={billsForCharts} />
      <CostChart bills={billsForCharts} />
      <ContractSection contract={contractForSection} />
      <ReadingsSection initialReadings={readingsForSection} />
      <BillsSection initialBills={billsForSection} />
    </div>
  );
}
