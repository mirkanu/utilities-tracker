export default function AnalyticsPage() {
  return (
    <div className="p-4 pt-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Analytics</h1>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Year on Year
        </h2>
        {/* Cards wired in plan 08-03 */}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Projected Spend
        </h2>
        {/* Card wired in plan 08-03 */}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Refill Pattern
        </h2>
        {/* Card wired in plan 08-03 */}
      </section>
    </div>
  );
}
