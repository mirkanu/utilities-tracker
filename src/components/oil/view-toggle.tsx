"use client";

export type ChartView = "raw" | "monthly" | "annual";

interface ViewToggleProps {
  value: ChartView;
  onChange: (v: ChartView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const options: { id: ChartView; label: string }[] = [
    { id: "raw",     label: "Raw" },
    { id: "monthly", label: "Monthly" },
    { id: "annual",  label: "Annual" },
  ];

  return (
    <div role="group" aria-label="Chart view" className="bg-muted rounded-lg p-1 flex">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={[
            "flex-1 h-11 rounded-md text-sm transition-colors",
            "active:scale-95 active:opacity-80",
            value === opt.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
