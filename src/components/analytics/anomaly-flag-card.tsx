import { AlertTriangle, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnomalyFlag } from "@/lib/oil-analytics";

type Props = { flag: AnomalyFlag };

export function AnomalyFlagCard({ flag }: Props) {
  const Icon = flag.direction === "above" ? AlertTriangle : TrendingDown;
  const borderClass =
    flag.direction === "above" ? "border-l-destructive" : "border-l-amber-500";
  const bgClass =
    flag.direction === "above"
      ? "bg-red-50 dark:bg-red-950/20"
      : "bg-amber-50 dark:bg-amber-950/20";
  const multClass =
    flag.direction === "above" ? "text-destructive" : "text-amber-500";

  return (
    <div role="region" aria-label={`${flag.period} anomaly`}>
      <Card className={cn("border-l-4", borderClass, bgClass)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <p className="text-sm font-medium">{flag.period}</p>
            </div>
            <p className={cn("text-xs", multClass)}>
              {flag.multiplier}× {flag.direction === "above" ? "above avg" : "of avg"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{flag.explanation}</p>
        </CardContent>
      </Card>
    </div>
  );
}
