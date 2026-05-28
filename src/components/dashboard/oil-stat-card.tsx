import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets } from "lucide-react";

interface OilStatCardProps {
  heightCm: number | null;
  daysRemaining: number | null;
  emptyDate: Date | null;
  litresRemaining: number | null;
}

function formatEmptyDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OilStatCard({ heightCm, daysRemaining, emptyDate, litresRemaining }: OilStatCardProps) {
  const hasData = heightCm !== null;
  const hasPrediction = daysRemaining !== null;
  const isCritical = hasPrediction && daysRemaining! < 30;
  const isWarning = hasPrediction && daysRemaining! >= 30 && daysRemaining! < 60;

  return (
    <Card
      className={cn(
        "border-l-4 min-h-[100px]",
        isCritical ? "border-l-destructive bg-red-50 dark:bg-red-950/20" :
        isWarning  ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20" :
                     "border-l-border"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5">
          <Droplets className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Oil</p>
        </div>
        {!hasData ? (
          <p className="mt-1 text-sm text-muted-foreground">No readings yet</p>
        ) : (
          <>
            <p className="mt-1 text-[28px] font-semibold leading-tight">
              {litresRemaining !== null ? `~${litresRemaining} L` : `${heightCm} cm`}
            </p>
            <p className="text-sm text-muted-foreground">
              {litresRemaining !== null
                ? `${heightCm} cm` + (hasPrediction ? ` · ~${daysRemaining} days` : " · Not enough data")
                : (hasPrediction ? `~${daysRemaining} days` : "Not enough data")}
            </p>
            {emptyDate && (
              <p className="text-sm text-muted-foreground">
                Empty ~{formatEmptyDate(emptyDate)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
