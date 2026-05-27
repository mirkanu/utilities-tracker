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
import { addElectricityReading, deleteElectricityReading } from "@/actions/electricity";

const PAGE_SIZE = 10;

// Date display: "9 May 2026" (British, no leading zero)
// Append T12:00:00 to avoid UTC midnight / BST +1hr off-by-one-day bug
function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Reading {
  id: number;
  readingDate: string;
  readingKwh: string;
  notes: string | null;
}

// Inner submit button uses useFormStatus — must be a separate component inside the form
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full min-h-[44px]" aria-busy={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </span>
      ) : "Save Reading"}
    </Button>
  );
}

export function ReadingsSection({ initialReadings }: { initialReadings: Reading[] }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Reading | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(addElectricityReading, null);

  useEffect(() => {
    if (state?.ok) {
      toast("Reading saved");
      setSheetOpen(false);
      setFormKey((k) => k + 1);
    }
  }, [state]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    // Optimistic: remove immediately
    setDeletedIds((prev) => new Set([...prev, id]));
    setDeleteTarget(null);
    setIsDeleting(true);
    try {
      await deleteElectricityReading(id);
      toast("Deleted");
    } catch {
      // Revert on error
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

  const filtered = initialReadings.filter((r) => !deletedIds.has(r.id));
  const visible = filtered.slice(0, shown);
  const hasMore = filtered.length > shown;
  const total = filtered.length;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Readings</h2>
          <span className="text-sm text-muted-foreground">{total}</span>
        </div>
        <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setFormKey((k) => k + 1); }}>
          <SheetTrigger render={<Button variant="outline" size="sm" className="active:scale-95 active:opacity-80" />}>
            Add Reading
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto pb-safe">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>Log Meter Reading</SheetTitle>
            </SheetHeader>
            <form key={formKey} action={formAction} className="space-y-4 px-4 pb-6 pt-4">
              <div className="space-y-1">
                <Input
                  type="number"
                  name="kwh"
                  placeholder="e.g. 42350"
                  min={0}
                  step="1"
                  inputMode="numeric"
                  className="text-base min-h-[44px]"
                  aria-label="Meter reading (kWh)"
                />
              </div>
              <div className="space-y-1">
                <Input
                  type="date"
                  name="date"
                  defaultValue={new Date().toLocaleDateString("en-CA")}
                  className="text-base min-h-[44px]"
                  aria-label="Reading date"
                />
              </div>
              <div className="space-y-1">
                <Input
                  type="text"
                  name="notes"
                  placeholder="e.g. after solar panel install"
                  className="text-base min-h-[44px]"
                  aria-label="Notes (optional)"
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
          <p className="text-base font-medium">No readings yet</p>
          <p className="text-sm">Tap &quot;Add Reading&quot; to log your first meter reading.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-base">{formatDate(r.readingDate)}</p>
                <p className="text-base font-semibold">
                  {parseFloat(r.readingKwh).toLocaleString("en-GB")} kWh
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(r)}
                disabled={isDeleting}
                aria-disabled={isDeleting}
                className={cn(
                  "flex size-11 items-center justify-center rounded-md",
                  "text-muted-foreground hover:text-destructive",
                  "active:scale-95 active:opacity-80",
                  isDeleting && "pointer-events-none opacity-40"
                )}
                aria-label={`Delete reading from ${formatDate(r.readingDate)}`}
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
          Load more readings
        </button>
      )}

      {/* Delete confirmation */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this reading?"
        description={
          deleteTarget
            ? `This will permanently remove the reading from ${formatDate(deleteTarget.readingDate)}. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete reading"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </section>
  );
}
