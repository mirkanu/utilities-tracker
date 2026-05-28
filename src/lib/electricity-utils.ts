export function computeDaysToExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00"); // midnight-to-midnight: offset cancels in subtraction
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}
