import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ContractExpiryBannerProps {
  daysToExpiry: number | null;
  expiryDate: string | null;
  provider: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ContractExpiryBanner({
  daysToExpiry,
  expiryDate,
  provider,
}: ContractExpiryBannerProps) {
  if (daysToExpiry === null) return null;
  if (daysToExpiry > 90) return null;

  const isExpired = daysToExpiry <= 0;
  const isUrgent = daysToExpiry > 0 && daysToExpiry <= 30;
  const isWarning = daysToExpiry > 30 && daysToExpiry <= 60;
  // notice (61–90) is the implicit else — uses blue tier

  return (
    <Card
      className={cn(
        "border-l-4",
        isExpired || isUrgent
          ? "border-l-destructive bg-red-50 dark:bg-red-950/20"
          : isWarning
          ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20"
          : "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {isExpired ? "Contract has expired" : "Contract expiring soon"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isExpired
                ? `Your ${provider ?? "current"} contract expired on ${expiryDate ? formatDate(expiryDate) : "an unknown date"}. Renew now to avoid going out of contract.`
                : `${provider ?? "Current"} contract expires in ${daysToExpiry} days${expiryDate ? ` (${formatDate(expiryDate)})` : ""}.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
