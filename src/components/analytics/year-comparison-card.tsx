import { Card, CardContent } from "@/components/ui/card";

type Props = {
  label: string;
  totalLitres: number;
  totalGbp: number;
  avgLitresPerDay: number;
  lPerHdd: number | null;
  colorVar: string; // e.g. "var(--year-color-1)"
};

function formatLitres(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function formatGbp(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

export function YearComparisonCard({
  label,
  totalLitres,
  totalGbp,
  avgLitresPerDay,
  lPerHdd,
  colorVar,
}: Props) {
  return (
    <div role="region" aria-label={`${label} comparison`}>
      <Card className="border-l-4" style={{ borderLeftColor: colorVar }}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-[28px] font-semibold leading-tight">
                {formatLitres(totalLitres)}
              </p>
              <p className="text-xs text-muted-foreground">L</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className="mt-1 text-[28px] font-semibold leading-tight">
                {formatGbp(totalGbp)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daily avg</p>
              <p className="mt-1 text-[28px] font-semibold leading-tight">
                {avgLitresPerDay.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">L/day</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per HDD</p>
              {lPerHdd !== null ? (
                <p className="mt-1 text-[28px] font-semibold leading-tight">
                  {lPerHdd.toFixed(2)}
                </p>
              ) : (
                <p
                  className="mt-1 text-[28px] font-semibold leading-tight text-muted-foreground"
                  title="HDD data not available for this period"
                >
                  —
                </p>
              )}
              <p className="text-xs text-muted-foreground">L/HDD</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
