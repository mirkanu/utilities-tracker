"use client";

import { useState } from "react";
import { Info, CheckCircle2 } from "lucide-react";
import type { AnomalyFlag } from "@/lib/oil-analytics";
import { AnomalyFlagCard } from "./anomaly-flag-card";

type Props = {
  flags: AnomalyFlag[];
  hasEnoughData: boolean;
};

export function AnomalyFlagsSection({ flags, hasEnoughData }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!hasEnoughData) {
    return (
      <div className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Add more oil readings to enable anomaly detection.
        </p>
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="flex gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          No unusual consumption detected.
        </p>
      </div>
    );
  }

  const visible = showAll ? flags : flags.slice(0, 5);

  return (
    <div className="space-y-3" role="region" aria-label="Anomalies">
      {visible.map((flag, i) => (
        <AnomalyFlagCard key={`${flag.period}-${i}`} flag={flag} />
      ))}
      {flags.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="text-sm text-muted-foreground active:opacity-70"
        >
          {showAll ? "Show fewer" : `Show all ${flags.length} anomalies`}
        </button>
      )}
    </div>
  );
}
