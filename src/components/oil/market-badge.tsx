import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  paidPpl: number;
  beisPpl: number | null;
};

export function MarketBadge({ paidPpl, beisPpl }: Props) {
  if (beisPpl === null || isNaN(paidPpl)) {
    return (
      <span className="text-xs text-muted-foreground">Market data unavailable</span>
    );
  }
  const delta = paidPpl - beisPpl;
  const above = delta > 0;
  const absDelta = Math.abs(delta).toFixed(1);
  const beisRounded = beisPpl.toFixed(1);
  const Icon = above ? ArrowUp : ArrowDown;
  const colorClass = above ? "text-destructive" : "text-green-600 dark:text-green-400";
  const label = above
    ? `${absDelta}p above market avg (${beisRounded}p)`
    : `${absDelta}p below market avg (${beisRounded}p)`;

  return (
    <span className={cn("text-xs inline-flex items-center gap-1", colorClass)}>
      <Icon className="h-3 w-3 inline-block" aria-hidden="true" />
      {label}
    </span>
  );
}
