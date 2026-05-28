"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Trash2, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DeleteDialog } from "@/components/electricity/delete-dialog";
import { addElectricityBill, deleteElectricityBill } from "@/actions/electricity";

const PAGE_SIZE = 10;

function formatPeriod(startStr: string, endStr: string): string {
  const start = new Date(startStr + "T12:00:00");
  const end = new Date(endStr + "T12:00:00");
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const endFmt = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
}

/** Inclusive day count between two YYYY-MM-DD strings */
function daysBetween(startStr: string, endStr: string): number {
  const ms = new Date(endStr + "T12:00:00").getTime() - new Date(startStr + "T12:00:00").getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Calculate estimated cost in £ from usage + contract rates */
function calcCost(
  kwhStr: string,
  startStr: string,
  endStr: string,
  unitRatePence: string | null,
  standingChargePence: string | null
): string | null {
  const kwh = parseFloat(kwhStr);
  const unit = parseFloat(unitRatePence ?? "");
  if (!kwhStr || isNaN(kwh) || !unitRatePence || isNaN(unit)) return null;
  if (!startStr || !endStr || endStr < startStr) return null;

  const days = daysBetween(startStr, endStr);
  const unitCost = (kwh * unit) / 100;
  const standing = standingChargePence ? (parseFloat(standingChargePence) * days) / 100 : 0;
  if (isNaN(standing)) return null;

  return (unitCost + standing).toFixed(2);
}

interface Bill {
  id: number;
  periodStart: string;
  periodEnd: string;
  totalKwh: string;
  totalCostGbp: string;
  notes: string | null;
}

interface BillsSectionProps {
  initialBills: Bill[];
  unitRatePence: string | null;
  standingChargePence: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full min-h-[44px]" aria-busy={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </span>
      ) : "Save Bill"}
    </Button>
  );
}

export function BillsSection({ initialBills, unitRatePence, standingChargePence }: BillsSectionProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(addElectricityBill, null);

  // Live calculation state
  const [previewKwh, setPreviewKwh] = useState("");
  const [previewStart, setPreviewStart] = useState("");
  const [previewEnd, setPreviewEnd] = useState("");
  const [previewCost, setPreviewCost] = useState("");

  useEffect(() => {
    if (state?.ok) {
      toast("Bill saved");
      setSheetOpen(false);
      setFormKey((k) => k + 1);
      setPreviewKwh("");
      setPreviewStart("");
      setPreviewEnd("");
      setPreviewCost("");
    }
  }, [state]);

  // Auto-calculate cost when kWh or period changes
  useEffect(() => {
    const calculated = calcCost(previewKwh, previewStart, previewEnd, unitRatePence, standingChargePence);
    if (calculated !== null) {
      setPreviewCost(calculated);
    }
  }, [previewKwh, previewStart, previewEnd, unitRatePence, standingChargePence]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeletedIds((prev) => new Set([...prev, id]));
    setDeleteTarget(null);
    setIsDeleting(true);
    try {
      await deleteElectricityBill(id);
      toast("Deleted");
    } catch {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = initialBills.filter((b) => !deletedIds.has(b.id));
  const visible = filtered.slice(0, shown);
  const hasMore = filtered.length > shown;
  const total = filtered.length;

  // Preview breakdown hint
  const hasRates = unitRatePence && parseFloat(unitRatePence) > 0;
  const daysPreview = previewStart && previewEnd && previewEnd >= previewStart
    ? daysBetween(previewStart, previewEnd)
    : null;
  const costHint = hasRates && previewKwh && daysPreview
    ? (() => {
        const unit = parseFloat(unitRatePence!);
        const sc = standingChargePence ? parseFloat(standingChargePence) : 0;
        const unitPart = ((parseFloat(previewKwh) * unit) / 100).toFixed(2);
        const scPart = ((sc * daysPreview) / 100).toFixed(2);
        return standingChargePence
          ? `£${unitPart} usage + £${scPart} standing (${daysPreview} days)`
          : `£${unitPart} usage`;
      })()
    : null;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Bills</h2>
          <span className="text-sm text-muted-foreground">{total}</span>
        </div>
        <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setFormKey((k) => k + 1); }}>
          <SheetTrigger render={<Button variant="outline" size="sm" className="active:scale-95 active:opacity-80" />}>
            Add Bill
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto pb-safe">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>Log Monthly Bill</SheetTitle>
            </SheetHeader>
            <form key={formKey} action={formAction} className="space-y-4 px-4 pb-6 pt-4">
              <div className="space-y-1">
                <label htmlFor="elec-bill-start" className="text-sm font-medium">Period start</label>
                <Input
                  id="elec-bill-start"
                  type="date"
                  name="periodStart"
                  className="text-base min-h-[44px]"
                  value={previewStart}
                  onChange={(e) => setPreviewStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="elec-bill-end" className="text-sm font-medium">Period end</label>
                <Input
                  id="elec-bill-end"
                  type="date"
                  name="periodEnd"
                  className="text-base min-h-[44px]"
                  value={previewEnd}
                  onChange={(e) => setPreviewEnd(e.target.value)}
                />
                {daysPreview !== null && (
                  <p className="text-sm text-muted-foreground">{daysPreview} days</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="elec-bill-kwh" className="text-sm font-medium">Usage (kWh)</label>
                <Input
                  id="elec-bill-kwh"
                  type="number"
                  name="totalKwh"
                  placeholder="e.g. 320"
                  min={0}
                  step="0.1"
                  inputMode="decimal"
                  className="text-base min-h-[44px]"
                  value={previewKwh}
                  onChange={(e) => setPreviewKwh(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="elec-bill-cost" className="text-sm font-medium">Total cost (£)</label>
                <Input
                  id="elec-bill-cost"
                  type="number"
                  name="totalCostGbp"
                  placeholder="e.g. 85.40"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="text-base min-h-[44px]"
                  value={previewCost}
                  onChange={(e) => setPreviewCost(e.target.value)}
                />
                {costHint && (
                  <p className="text-sm text-muted-foreground">{costHint}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="elec-bill-notes" className="text-sm font-medium">Notes (optional)</label>
                <Input
                  id="elec-bill-notes"
                  type="text"
                  name="notes"
                  placeholder="e.g. includes standing charge"
                  className="text-base min-h-[44px]"
                />
              </div>
              {state?.error && (
                <div aria-live="polite" aria-atomic="true">
                  <p className="text-sm text-destructive">{state.error}</p>
                </div>
              )}
              <SubmitButton />
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full py-2 text-sm text-muted-foreground active:opacity-70"
              >
                Cancel
              </button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* List or empty state */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-base font-medium">No bills yet</p>
          <p className="text-sm">Tap &quot;Add Bill&quot; to log your first electricity bill.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{formatPeriod(b.periodStart, b.periodEnd)}</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-base">
                    {parseFloat(b.totalKwh).toLocaleString("en-GB")} kWh
                  </p>
                  <p className="text-base font-semibold">
                    £{parseFloat(b.totalCostGbp).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(b)}
                disabled={isDeleting}
                aria-disabled={isDeleting}
                className={cn(
                  "flex size-11 items-center justify-center rounded-md",
                  "text-muted-foreground hover:text-destructive",
                  "active:scale-95 active:opacity-80",
                  isDeleting && "pointer-events-none opacity-40"
                )}
                aria-label={`Delete bill for ${formatPeriod(b.periodStart, b.periodEnd)}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="mt-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground active:opacity-70"
        >
          Load more bills
        </button>
      )}

      {/* Delete confirmation */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this bill?"
        description={
          deleteTarget
            ? `This will permanently remove the bill for ${formatPeriod(deleteTarget.periodStart, deleteTarget.periodEnd)}. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete bill"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </section>
  );
}
