export interface OilReading {
  readingDate: string; // "YYYY-MM-DD"
  heightCm: number;
}

export interface OilPurchase {
  purchaseDate: string; // "YYYY-MM-DD"
}

export interface DepletionResult {
  daysRemaining: number | null; // null = insufficient data or tank not depleting
  emptyDate: Date | null;
}

const MS_PER_DAY = 86_400_000;

export function computeDepletion(
  readings: OilReading[],
  purchases: OilPurchase[]
): DepletionResult {
  const insufficient: DepletionResult = { daysRemaining: null, emptyDate: null };

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

  // Least-squares linear regression (cm per day)
  // x = days since first segment reading, y = height cm
  // More robust than two-point slope — guards against noisy endpoint readings
  const t0 = new Date(segmentReadings[0].readingDate).getTime();
  const xs = segmentReadings.map(
    (r) => (new Date(r.readingDate).getTime() - t0) / MS_PER_DAY
  );
  const ys = segmentReadings.map((r) => r.heightCm);

  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  // slope is cm/day — expected to be negative (tank depleting)
  const intercept = (sumY - slope * sumX) / n;

  // Estimate current tank height from today's position on the regression line
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceFirst = (today.getTime() - new Date(segmentReadings[0].readingDate).getTime()) / MS_PER_DAY;
  const currentEstimatedHeight = intercept + slope * daysSinceFirst;

  // Guard: tank not depleting or model says already empty
  if (slope >= 0 || currentEstimatedHeight <= 0) return insufficient;

  const daysRemaining = Math.round(currentEstimatedHeight / Math.abs(slope));
  const emptyDate = new Date(today.getTime() + daysRemaining * MS_PER_DAY);

  return { daysRemaining, emptyDate };
}
