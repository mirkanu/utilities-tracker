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
  const billMonthRaw = formData.get("billMonth") as string;
  const totalKwhRaw = formData.get("totalKwh") as string;
  const totalCostGbpRaw = formData.get("totalCostGbp") as string;
  const notesRaw = formData.get("notes") as string;
  const notes = notesRaw || null;

  if (!billMonthRaw) {
    return { error: "Please select the billing month." };
  }

  const kwh = parseFloat(totalKwhRaw);
  if (!totalKwhRaw || isNaN(kwh) || kwh < 0) {
    return { error: "Please enter a valid usage amount." };
  }

  const cost = parseFloat(totalCostGbpRaw);
  if (!totalCostGbpRaw || isNaN(cost) || cost < 0) {
    return { error: "Please enter a valid cost." };
  }

  // Coerce "YYYY-MM" (HTML month input) → "YYYY-MM-01" (safe DATE string)
  const billMonthDate = billMonthRaw + "-01";

  await db.insert(electricityBills).values({
    billMonth: billMonthDate,      // DATE column — first of billing month
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
  const provider = (formData.get("provider") as string).trim();
  const unitRateRaw = formData.get("unitRate") as string;
  const contractType = formData.get("contractType") as string;
  const expiryRaw = formData.get("expiryDate") as string;
  const notesRaw = formData.get("notes") as string;
  const notes = notesRaw || null;

  if (!provider) {
    return { error: "Please enter the provider name." };
  }

  const unitRate = parseFloat(unitRateRaw);
  if (!unitRateRaw || isNaN(unitRate) || unitRate <= 0) {
    return { error: "Please enter a valid unit rate." };
  }

  if (contractType !== "fixed" && contractType !== "variable") {
    return { error: "Please select a contract type." };
  }

  // Step 1: Deactivate all currently active contracts
  await db.update(electricityContracts).set({ isActive: false }).where(eq(electricityContracts.isActive, true));

  // Step 2: Insert new active contract
  await db.insert(electricityContracts).values({
    provider,
    unitRatePence: unitRateRaw, // numeric column accepts string
    contractType,
    expiryDate: expiryRaw || null, // null for rolling contracts
    isActive: true,
    notes,
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
