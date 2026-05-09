import { Skeleton } from "@/components/ui/skeleton";

export default function ElectricityLoading() {
  return (
    <div className="p-4 pt-6 space-y-3">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
