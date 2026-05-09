import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="p-4 pt-6 space-y-3">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
