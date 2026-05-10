"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Trash2, ShoppingCart, Loader2 } from "lucide-react";
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
import { DeleteDialog } from "@/components/oil/delete-dialog";
import { addOilPurchase, deleteOilPurchase } from "@/actions/oil";

const PAGE_SIZE = 10;

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCost(gbp: string): string {
  return `£${parseFloat(gbp).toFixed(2)}`;
}

function calcPpl(totalCostGbp: string, litres: string): string | null {
  const cost = parseFloat(totalCostGbp);
  const ltr = parseFloat(litres);
  if (isNaN(cost) || isNaN(ltr) || ltr === 0) return null;
  return `${((cost / ltr) * 100).toFixed(1)}p/L`;
}

interface Purchase {
  id: number;
  purchaseDate: string;
  litres: string;
  totalCostGbp: string;
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
      ) : "Save Purchase"}
    </Button>
  );
}

export function PurchasesSection({ initialPurchases }: { initialPurchases: Purchase[] }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(addOilPurchase, null);
  // Live pence-per-litre preview state
  const [previewLitres, setPreviewLitres] = useState("");
  const [previewCost, setPreviewCost] = useState("");

  useEffect(() => {
    if (state?.ok) {
      toast("Purchase saved");
      setSheetOpen(false);
      setFormKey((k) => k + 1);
      setPreviewLitres("");
      setPreviewCost("");
    }
  }, [state]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeletedIds((prev) => new Set([...prev, id]));
    setDeleteTarget(null);
    setIsDeleting(true);
    try {
      await deleteOilPurchase(id);
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

  const pplPreview = calcPpl(previewCost, previewLitres);
  const filtered = initialPurchases.filter((p) => !deletedIds.has(p.id));
  const visible = filtered.slice(0, shown);
  const hasMore = filtered.length > shown;
  const total = filtered.length;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Purchases</h2>
          <span className="text-sm text-muted-foreground">{total}</span>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger render={<Button variant="outline" size="sm" className="active:scale-95 active:opacity-80" />}>
            Add Purchase
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto pb-safe">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>Log Oil Purchase</SheetTitle>
            </SheetHeader>
            <form key={formKey} action={formAction} className="space-y-4 px-4 pb-6 pt-4">
              <div className="space-y-1">
                <Input
                  type="number"
                  name="litres"
                  placeholder="e.g. 900"
                  min={0}
                  step="0.1"
                  inputMode="decimal"
                  className="text-base min-h-[44px]"
                  aria-label="Litres delivered"
                  value={previewLitres}
                  onChange={(e) => setPreviewLitres(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Input
                  type="number"
                  name="cost"
                  placeholder="e.g. 630.00"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="text-base min-h-[44px]"
                  aria-label="Total cost in pounds"
                  value={previewCost}
                  onChange={(e) => setPreviewCost(e.target.value)}
                />
                {pplPreview && (
                  <p className="text-sm text-muted-foreground">= {pplPreview}</p>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="text-base min-h-[44px]"
                  aria-label="Purchase date"
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
          <ShoppingCart className="h-8 w-8" />
          <p className="text-base font-medium">No purchases yet</p>
          <p className="text-sm">Tap &quot;Add Purchase&quot; to log your first oil delivery.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((p) => {
            const ppl = calcPpl(p.totalCostGbp, p.litres);
            return (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <p className="text-base">{formatDate(p.purchaseDate)}</p>
                    <p className="text-base font-semibold">
                      {parseFloat(p.litres).toLocaleString("en-GB")} L
                    </p>
                    <p className="text-base font-semibold">{formatCost(p.totalCostGbp)}</p>
                  </div>
                  {ppl && <p className="text-sm text-muted-foreground">{ppl}</p>}
                </div>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-md",
                    "text-muted-foreground hover:text-destructive",
                    "active:scale-95 active:opacity-80"
                  )}
                  aria-label={`Delete purchase from ${formatDate(p.purchaseDate)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="mt-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground active:opacity-70"
        >
          Load more purchases
        </button>
      )}

      {/* Delete confirmation */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this purchase?"
        description={
          deleteTarget
            ? `This will permanently remove the purchase from ${formatDate(deleteTarget.purchaseDate)}. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete purchase"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </section>
  );
}
