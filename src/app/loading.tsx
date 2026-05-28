import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="p-4 pt-6 space-y-6">
      {/* h1 "Home" */}
      <Skeleton className="h-7 w-16" />
      {/* ContractExpiryBanner placeholder — UI-SPEC notes this is always
          in the skeleton even when the real banner returns null > 90d. */}
      <Skeleton className="h-16 w-full rounded-lg" />
      {/* Two-card stat grid */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[100px] w-full rounded-lg" />
        <Skeleton className="h-[100px] w-full rounded-lg" />
      </div>
      {/* "View Oil details →" */}
      <Skeleton className="h-4 w-36" />
      {/* "View Electricity details →" */}
      <Skeleton className="h-4 w-40" />
    </div>
  );
}
