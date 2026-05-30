import { Card, CardContent } from "@/components/ui/card";
import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { RefillPattern } from "@/lib/oil-analytics";

type Props = { pattern: RefillPattern | null };

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RefillPatternCard({ pattern }: Props) {
  return (
    <div role="region" aria-label="Refill pattern">
      <Card>
        <CardContent className="p-4">
          {pattern === null ? (
            <div className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Add oil purchases to see refill pattern.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Average interval</p>
              <p className="mt-1 text-[28px] font-semibold leading-tight">
                {pattern.avgIntervalDays.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">days between refills</p>

              {(() => {
                const TrendIcon =
                  pattern.trend === "shorter" ? TrendingDown :
                  pattern.trend === "longer"  ? TrendingUp   : Minus;
                const trendLabel =
                  pattern.trend === "shorter" ? "Refills getting more frequent" :
                  pattern.trend === "longer"  ? "Refills getting less frequent" :
                                                "Refill interval stable";
                const trendClass =
                  pattern.trend === "shorter" ? "text-amber-500" :
                  pattern.trend === "longer"  ? "text-green-600"  :
                                                "text-muted-foreground";
                return (
                  <div className={`flex items-center gap-1 mt-3 ${trendClass}`}>
                    <TrendIcon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm">{trendLabel}</span>
                  </div>
                );
              })()}

              <p className="mt-3 text-sm text-muted-foreground">
                {pattern.estimatedNextRefillDate
                  ? `Next refill ~${formatDate(pattern.estimatedNextRefillDate)}`
                  : "Not enough data"}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
