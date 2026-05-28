import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface BillSummary {
  totalCostGbp: string; // numeric column from Drizzle
  totalKwh: string;     // numeric column from Drizzle
}

interface ElectricityStatCardProps {
  bill: BillSummary | null;
  daysToExpiry: number | null;
  expiryDate: string | null;
  provider: string | null;
}

function formatExpiryDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ElectricityStatCard({
  bill,
  daysToExpiry,
  expiryDate,
  provider,
}: ElectricityStatCardProps) {
  // 4-tier colour band, per UI-SPEC Color table for electricity:
  //   <= 0 or <= 30 days       -> destructive (red)
  //   31 - 60 days             -> amber
  //   61 - 90 days             -> blue-500
  //   > 90 days or null        -> default border
  const hasExpiry = daysToExpiry !== null;
  const isCritical = hasExpiry && daysToExpiry! <= 30;
  const isWarning  = hasExpiry && daysToExpiry! > 30 && daysToExpiry! <= 60;
  const isNotice   = hasExpiry && daysToExpiry! > 60 && daysToExpiry! <= 90;
  const isExpired  = hasExpiry && daysToExpiry! <= 0;

  const costNum = bill ? parseFloat(bill.totalCostGbp) : null;
  const kwhNum  = bill ? parseFloat(bill.totalKwh) : null;

  return (
    <Card
      className={cn(
        "border-l-4 min-h-[100px]",
        isCritical ? "border-l-destructive bg-red-50 dark:bg-red-950/20" :
        isWarning  ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20" :
        isNotice   ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20" :
                     "border-l-border"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Electricity</p>
        </div>
        {bill === null ? (
          <p className="mt-1 text-sm text-muted-foreground">No bills yet</p>
        ) : (
          <>
            <p className="mt-1 text-[28px] font-semibold leading-tight">
              £{costNum!.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">{kwhNum !== null ? kwhNum.toFixed(0) : '—'} kWh</p>
          </>
        )}
        {hasExpiry && (
          <p className="text-sm text-muted-foreground">
            {isExpired
              ? "Contract expired"
              : `${provider ? provider + " — " : ""}Contract: ${daysToExpiry} days${expiryDate ? ` (${formatExpiryDate(expiryDate)})` : ""}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
