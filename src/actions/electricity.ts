"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { electricityReadings, electricityBills, electricityContracts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// --- ADD READING ---
// useActionState-compatible signature (prevState, formData)

export async function addElectricityReading(
  _prevState: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean }> {
  const kwhRaw = formData.get("kwh") as string;
  const date = formData.get("date") as string;
  const notesRaw = formData.get("notes") as string;
  const notes = notesRaw || null;

  const kwh = parseFloat(kwhRaw);
  if (!kwhRaw || isNaN(kwh) || kwh < 0) {
    return { error: "Please enter a valid meter reading." };
  }
  if (!date) {
    return { error: "Please select a date." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Please select a valid date." };
  }

  await db.insert(electricityReadings).values({
    readingDate: date,    // DATE column — plain "YYYY-MM-DD" string, never new Date()
    readingKwh: kwhRaw,  // numeric column accepts string — postgres.js coerces
    notes,
  });

  revalidatePath("/electricity");
  return { error: "", ok: true };
}

// --- ADD BILL ---

export async function addElectricityBill(
  _prevState: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean }> {
  const periodStartRaw = formData.get("periodStart") as string;
  const periodEndRaw = formData.get("periodEnd") as string;
  const totalKwhRaw = formData.get("totalKwh") as string;
  const totalCostGbpRaw = formData.get("totalCostGbp") as string;
  const notesRaw = formData.get("notes") as string;
  const notes = notesRaw || null;

  if (!periodStartRaw || !/^\d{4}-\d{2}-\d{2}$/.test(periodStartRaw)) {
    return { error: "Please select a valid period start date." };
  }
  if (!periodEndRaw || !/^\d{4}-\d{2}-\d{2}$/.test(periodEndRaw)) {
    return { error: "Please select a valid period end date." };
  }
  if (periodEndRaw < periodStartRaw) {
    return { error: "Period end must be on or after period start." };
  }

  const kwh = parseFloat(totalKwhRaw);
  if (!totalKwhRaw || isNaN(kwh) || kwh < 0) {
    return { error: "Please enter a valid usage amount." };
  }

  const cost = parseFloat(totalCostGbpRaw);
  if (!totalCostGbpRaw || isNaN(cost) || cost < 0) {
    return { error: "Please enter a valid cost." };
  }

  await db.insert(electricityBills).values({
    periodStart: periodStartRaw,   // DATE column — first day of billing period
    periodEnd: periodEndRaw,       // DATE column — last day of billing period
    totalKwh: totalKwhRaw,         // numeric column accepts string
    totalCostGbp: totalCostGbpRaw, // numeric column accepts string
    notes,
  });

  revalidatePath("/electricity");
  return { error: "", ok: true };
}

// --- UPSERT CONTRACT ---
// Strategy: deactivate all existing active contracts, then insert new one.
// NOT onConflictDoUpdate — no unique constraint exists to conflict on.

export async function upsertElectricityContract(
  _prevState: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean }> {
  const providerRaw = formData.get("provider");
  if (!providerRaw) {
    return { error: "Please enter the provider name." };
  }
  const provider = (providerRaw as string).trim();
  if (!provider) {
    return { error: "Please enter the provider name." };
  }
  const unitRateRaw = formData.get("unitRate") as string;
  const standingChargeRaw = formData.get("standingCharge") as string;
  const contractType = formData.get("contractType") as string;
  const expiryRaw = formData.get("expiryDate") as string;
  const notesRaw = formData.get("notes") as string;
  const notes = notesRaw || null;

  const unitRate = parseFloat(unitRateRaw);
  if (!unitRateRaw || isNaN(unitRate) || unitRate <= 0) {
    return { error: "Please enter a valid unit rate." };
  }

  const standingCharge = standingChargeRaw ? parseFloat(standingChargeRaw) : null;
  if (standingChargeRaw && (isNaN(standingCharge!) || standingCharge! < 0)) {
    return { error: "Please enter a valid standing charge." };
  }

  if (contractType !== "fixed" && contractType !== "variable") {
    return { error: "Please select a contract type." };
  }

  if (expiryRaw && !/^\d{4}-\d{2}-\d{2}$/.test(expiryRaw)) {
    return { error: "Please select a valid expiry date." };
  }

  // Atomic: deactivate existing active contracts and insert new one in one transaction.
  // Without a transaction, a crash between the two statements leaves zero active contracts.
  await db.transaction(async (tx) => {
    // Step 1: Deactivate all currently active contracts
    await tx
      .update(electricityContracts)
      .set({ isActive: false })
      .where(eq(electricityContracts.isActive, true));

    // Step 2: Insert new active contract
    await tx.insert(electricityContracts).values({
      provider,
      unitRatePence: unitRateRaw,                                  // numeric column accepts string
      standingChargePence: standingChargeRaw || null,              // null if not provided
      contractType,
      expiryDate: expiryRaw || null, // null for rolling contracts
      isActive: true,
      notes,
    });
  });

  revalidatePath("/electricity");
  return { error: "", ok: true };
}

// --- DELETE READING ---
// Plain async function — not bound to useActionState

export async function deleteElectricityReading(id: number): Promise<void> {
  await db.delete(electricityReadings).where(eq(electricityReadings.id, id));
  revalidatePath("/electricity");
}

// --- DELETE BILL ---

export async function deleteElectricityBill(id: number): Promise<void> {
  await db.delete(electricityBills).where(eq(electricityBills.id, id));
  revalidatePath("/electricity");
}
