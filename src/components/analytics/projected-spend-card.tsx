import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import type { ProjectedSpend } from "@/lib/oil-analytics";

type Props = { projection: ProjectedSpend | null };

function formatLitres(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}
function formatGbp(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

export function ProjectedSpendCard({ projection }: Props) {
  return (
    <div role="region" aria-label="Projected spend">
      <Card>
        <CardContent className="p-4">
          {projection === null ? (
            <div className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projected Spend</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add at least 2 readings after a refill to project annual spend.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Projected</p>
                <p className="text-sm text-muted-foreground">{projection.periodLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Litres</p>
                  <p className="mt-1 text-[28px] font-semibold leading-tight">
                    {formatLitres(projection.projectedLitres)}
                  </p>
                  <p className="text-xs text-muted-foreground">L</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="mt-1 text-[28px] font-semibold leading-tight">
                    {formatGbp(projection.projectedGbp)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {projection.currentLitresPerDay.toFixed(1)} L/day · {projection.daysRemaining} days remaining
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
