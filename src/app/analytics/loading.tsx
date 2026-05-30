import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="p-4 pt-6 space-y-6 pb-24">
      {/* Page header */}
      <Skeleton className="h-6 w-24 rounded-md" />

      {/* Anomalies section heading */}
      <Skeleton className="h-4 w-24 rounded-md mt-6" />
      {/* Two anomaly flag card skeletons */}
      <Skeleton className="h-[72px] w-full rounded-lg mt-3" />
      <Skeleton className="h-[72px] w-full rounded-lg mt-3" />

      {/* Year comparison section heading */}
      <Skeleton className="h-4 w-32 rounded-md mt-6" />

      {/* Three year comparison card skeletons */}
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[140px] w-full rounded-lg mt-4" />
      ))}

      {/* Projected spend card skeleton */}
      <Skeleton className="h-4 w-36 rounded-md mt-6" />
      <Skeleton className="h-[100px] w-full rounded-lg mt-4" />

      {/* Refill pattern card skeleton */}
      <Skeleton className="h-4 w-32 rounded-md mt-6" />
      <Skeleton className="h-[100px] w-full rounded-lg mt-4" />
    </div>
  );
}
