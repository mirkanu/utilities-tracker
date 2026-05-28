import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets, Info } from "lucide-react";

interface DepletionCardProps {
  daysRemaining: number | null;
  emptyDate: Date | null;
  litresRemaining: number | null;
  litresPerDay: number | null;
}

// Format Date as "25 Jun 2026" — append T12:00:00 to avoid UTC midnight BST offset bug
function formatEmptyDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DepletionCard({ daysRemaining, emptyDate, litresRemaining, litresPerDay }: DepletionCardProps) {
  const isInsufficient = daysRemaining === null;
  const isCritical = daysRemaining !== null && daysRemaining < 30;
  const isWarning = daysRemaining !== null && daysRemaining >= 30 && daysRemaining < 60;

  return (
    <Card
      className={cn(
        "border-l-4",
        isInsufficient ? "border-l-border bg-muted" :
        isCritical     ? "border-l-destructive bg-red-50 dark:bg-red-950/20" :
        isWarning      ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20" :
                         "border-l-border"
      )}
    >
      <CardContent className="p-4">
        {isInsufficient ? (
          <div className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Depletion prediction</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add at least 2 readings after a refill to see how long your oil will last.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Tank Level</p>
            </div>
            <p className="mt-1 text-[28px] font-semibold leading-tight">
              ~{daysRemaining} days
            </p>
            {litresRemaining !== null && litresPerDay !== null && (
              <p className="text-sm text-muted-foreground">
                ~{litresRemaining} L remaining · {litresPerDay} L/day
              </p>
            )}
            {emptyDate && (
              <p className="text-sm text-muted-foreground">
                Empty around {formatEmptyDate(emptyDate)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
