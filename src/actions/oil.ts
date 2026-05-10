"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { oilReadings, oilPurchases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// --- ADD READING ---
// useActionState-compatible signature (prevState, formData)

export async function addOilReading(
  _prevState: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean }> {
  const heightRaw = formData.get("height") as string;
  const dateRaw = formData.get("date") as string;

  const height = Number(heightRaw);
  if (!heightRaw || isNaN(height) || height < 0 || height > 999) {
    return { error: "Height must be between 0 and 999 cm." };
  }
  if (!dateRaw) {
    return { error: "Please select a date." };
  }

  await db.insert(oilReadings).values({
    readingDate: dateRaw,          // DATE column — plain "YYYY-MM-DD" string, never new Date()
    heightCm: height,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/oil");
  return { error: "", ok: true };
}

// --- ADD PURCHASE ---

export async function addOilPurchase(
  _prevState: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean }> {
  const litresRaw = formData.get("litres") as string;
  const costRaw = formData.get("cost") as string;
  const dateRaw = formData.get("date") as string;

  if (!litresRaw || parseFloat(litresRaw) <= 0) {
    return { error: "Please enter the number of litres delivered." };
  }
  if (!costRaw || parseFloat(costRaw) <= 0) {
    return { error: "Please enter the total cost in pounds." };
  }
  if (!dateRaw) {
    return { error: "Please select a date." };
  }

  await db.insert(oilPurchases).values({
    purchaseDate: dateRaw,         // DATE column — plain "YYYY-MM-DD" string
    litres: litresRaw,             // numeric column accepts string — postgres.js coerces
    totalCostGbp: costRaw,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/oil");
  return { error: "", ok: true };
}

// --- DELETE READING ---
// Plain async function — not bound to useActionState

export async function deleteOilReading(id: number): Promise<void> {
  await db.delete(oilReadings).where(eq(oilReadings.id, id));
  revalidatePath("/oil");
}

// --- DELETE PURCHASE ---

export async function deleteOilPurchase(id: number): Promise<void> {
  await db.delete(oilPurchases).where(eq(oilPurchases.id, id));
  revalidatePath("/oil");
}
