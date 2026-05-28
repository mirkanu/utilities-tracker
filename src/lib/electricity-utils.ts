export function computeDaysToExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T12:00:00"); // BST fix: avoid UTC midnight off-by-one
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}
