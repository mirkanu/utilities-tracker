"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { upsertElectricityContract } from "@/actions/electricity";

interface Contract {
  id: number;
  provider: string;
  unitRatePence: string;
  standingChargePence: string | null;
  contractType: string;
  expiryDate: string | null;
  notes: string | null;
}

interface ContractSectionProps {
  contract: Contract | null;
}

function formatExpiryDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full min-h-[44px]"
      aria-busy={pending}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </span>
      ) : (
        "Save Contract"
      )}
    </Button>
  );
}

export function ContractSection({ contract }: ContractSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(upsertElectricityContract, null);

  useEffect(() => {
    if (state?.ok) {
      toast("Contract saved");
      setSheetOpen(false);
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Contract</h2>
        <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setFormKey((k) => k + 1); }}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="active:scale-95 active:opacity-80"
              />
            }
          >
            {contract ? "Edit Contract" : "Add Contract"}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[85vh] overflow-y-auto pb-safe"
          >
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>
                {contract ? "Edit Contract" : "Add Contract"}
              </SheetTitle>
            </SheetHeader>
            <form
              key={formKey}
              action={formAction}
              className="space-y-4 px-4 pb-6 pt-4"
            >
              <div className="space-y-1">
                <label htmlFor="contract-provider" className="text-sm font-medium">Provider</label>
                <Input
                  id="contract-provider"
                  name="provider"
                  type="text"
                  defaultValue={contract?.provider ?? ""}
                  placeholder="e.g. Octopus Energy"
                  required
                  className="text-base min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="contract-unit-rate" className="text-sm font-medium">Unit rate (p/kWh)</label>
                <Input
                  id="contract-unit-rate"
                  name="unitRate"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min={0}
                  defaultValue={contract?.unitRatePence ?? ""}
                  placeholder="e.g. 25.40"
                  required
                  className="text-base min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="contract-standing-charge" className="text-sm font-medium">Standing charge (p/day)</label>
                <Input
                  id="contract-standing-charge"
                  name="standingCharge"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min={0}
                  defaultValue={contract?.standingChargePence ?? ""}
                  placeholder="e.g. 53.27"
                  className="text-base min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="contract-type" className="text-sm font-medium">Contract type</label>
                <select
                  id="contract-type"
                  name="contractType"
                  defaultValue={contract?.contractType ?? "fixed"}
                  className="text-base min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="fixed">Fixed</option>
                  <option value="variable">Variable</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="contract-expiry" className="text-sm font-medium">Expiry date (optional)</label>
                <Input
                  id="contract-expiry"
                  name="expiryDate"
                  type="date"
                  defaultValue={contract?.expiryDate ?? ""}
                  className="text-base min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="contract-notes" className="text-sm font-medium">Notes (optional)</label>
                <Input
                  id="contract-notes"
                  name="notes"
                  type="text"
                  defaultValue={contract?.notes ?? ""}
                  placeholder="e.g. tariff name"
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

      {/* Display */}
      {!contract ? (
        <div className="py-6 text-center text-muted-foreground">
          <p className="text-base font-medium">No contract saved</p>
          <p className="text-sm mt-1">
            Tap &quot;Add Contract&quot; to record your electricity deal.
          </p>
        </div>
      ) : (
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Provider</dt>
            <dd className="font-medium">{contract.provider}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Unit rate</dt>
            <dd className="font-medium">
              {parseFloat(contract.unitRatePence).toFixed(3)}p/kWh
            </dd>
          </div>
          {contract.standingChargePence && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Standing charge</dt>
              <dd className="font-medium">
                {parseFloat(contract.standingChargePence).toFixed(3)}p/day
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium capitalize">{contract.contractType}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="font-medium">
              {contract.expiryDate
                ? formatExpiryDate(contract.expiryDate)
                : "No expiry (rolling contract)"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
