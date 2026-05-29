"use client";

import type { GroupingMode } from "@/lib/oil-chart-grouping";

interface GroupingToggleProps {
  value: GroupingMode;
  onChange: (v: GroupingMode) => void;
}

export function GroupingToggle({ value, onChange }: GroupingToggleProps) {
  return (
    <div role="group" aria-label="Chart grouping" className="bg-muted rounded-lg p-1 flex">
      {(["calendar", "season"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={[
            "flex-1 h-11 rounded-md text-sm transition-colors",
            "active:scale-95 active:opacity-80",
            value === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {mode === "calendar" ? "Calendar Year" : "Heating Season"}
        </button>
      ))}
    </div>
  );
}
