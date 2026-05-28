export interface OilReading {
  readingDate: string; // "YYYY-MM-DD"
  heightCm: number;
}

export interface OilPurchase {
  purchaseDate: string; // "YYYY-MM-DD"
}

import { CM_TO_LITRES_RATIO } from "./oil-config";

export interface DepletionResult {
  daysRemaining: number | null; // null = insufficient data or tank not depleting
  emptyDate: Date | null;
  litresRemaining: number | null; // null when daysRemaining is null
  litresPerDay: number | null;    // null when daysRemaining is null; rounded to 1 decimal place
}

const MS_PER_DAY = 86_400_000;

export function computeDepletion(
  readings: OilReading[],
  purchases: OilPurchase[]
): DepletionResult {
  const insufficient: DepletionResult = {
    daysRemaining: null,
    emptyDate: null,
    litresRemaining: null,
    litresPerDay: null,
  };

  // Guard: no purchases means no segment to calculate from
  if (purchases.length === 0) return insufficient;

  // Find the most recent purchase date
  const sortedPurchases = [...purchases].sort(
    (a, b) =>
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );
  const lastPurchaseDate = new Date(sortedPurchases[0].purchaseDate);

  // Filter to readings STRICTLY AFTER the last purchase date
  // (strict > excludes same-day readings which are ambiguous — before or after delivery?)
  const segmentReadings = readings
    .filter((r) => new Date(r.readingDate) > lastPurchaseDate)
    .sort(
      (a, b) =>
        new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime()
    );

  // Guard: require at least 2 readings in the current segment
  if (segmentReadings.length < 2) return insufficient;

  // Parse date strings at noon local time to avoid UTC-offset drift (CLAUDE.md requirement).
  // new Date("YYYY-MM-DD") parses as UTC midnight; adding T12:00:00 keeps arithmetic
  // in local time so x-values are always whole integers in whole-day steps.
  const parseLocalDate = (s: string) => new Date(s + "T12:00:00");

  // Least-squares linear regression (cm per day)
  // x = days since first segment reading, y = height cm
  // More robust than two-point slope — guards against noisy endpoint readings
  const t0 = parseLocalDate(segmentReadings[0].readingDate).getTime();
  const xs = segmentReadings.map(
    (r) => (parseLocalDate(r.readingDate).getTime() - t0) / MS_PER_DAY
  );
  const ys = segmentReadings.map((r) => r.heightCm);

  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  // Guard: zero denominator when all readings fall on the same calendar day
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return insufficient;

  const slope = (n * sumXY - sumX * sumY) / denom;
  // slope is cm/day — expected to be negative (tank depleting)
  const intercept = (sumY - slope * sumX) / n;

  // Estimate current tank height from today's position on the regression line
  const today = new Date();
  today.setHours(12, 0, 0, 0); // noon today, matching parseLocalDate
  const daysSinceFirst = (today.getTime() - parseLocalDate(segmentReadings[0].readingDate).getTime()) / MS_PER_DAY;
  const currentEstimatedHeight = intercept + slope * daysSinceFirst;

  // Guard: tank not depleting or model says already empty
  if (slope >= 0 || currentEstimatedHeight <= 0) return insufficient;

  const daysRemaining = Math.round(currentEstimatedHeight / Math.abs(slope));
  const emptyDate = new Date(today.getTime() + daysRemaining * MS_PER_DAY);

  // litresRemaining is derived from the most recent SENSOR reading, not the regression
  // projection — keeps the measured snapshot honest vs. the modelled days countdown.
  const latestReading = segmentReadings[segmentReadings.length - 1];
  const litresRemaining = Math.round(latestReading.heightCm * CM_TO_LITRES_RATIO);
  const litresPerDay = Math.round(Math.abs(slope) * CM_TO_LITRES_RATIO * 10) / 10;

  return { daysRemaining, emptyDate, litresRemaining, litresPerDay };
}
