import { Skeleton } from "@/components/ui/skeleton";

export default function ElectricityLoading() {
  return (
    <div className="p-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Contract expiry banner */}
      <Skeleton className="h-20 w-full rounded-lg" />

      {/* Usage chart */}
      <Skeleton className="h-[220px] w-full rounded-lg" />

      {/* Cost chart */}
      <Skeleton className="h-[220px] w-full rounded-lg" />

      {/* Contract section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>

      {/* Readings section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>

      {/* Bills section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
