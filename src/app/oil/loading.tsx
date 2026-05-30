import { Skeleton } from "@/components/ui/skeleton";

export default function OilLoading() {
  return (
    <div className="p-4 pt-6 space-y-6">
      {/* Header row: "Oil" title skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-10" />
      </div>

      {/* Depletion card skeleton */}
      <Skeleton className="h-20 w-full rounded-lg" />

      {/* Toggle skeleton — matches GroupingToggle h-11 */}
      <Skeleton className="h-11 w-full rounded-lg" />
      {/* Temperature toggle skeleton — left-aligned, narrower than view toggle (h-11 w-32) */}
      <Skeleton className="h-11 w-32 rounded-md" />
      {/* Chart skeleton — 300px to accommodate dual y-axis layout (Phase 7) */}
      <Skeleton className="h-[300px] w-full rounded-lg" />

      {/* Readings section */}
      <div className="space-y-3">
        {/* Section heading + count chip */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        {/* Three list row skeletons — each 56px tall */}
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>

      {/* Purchases section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
