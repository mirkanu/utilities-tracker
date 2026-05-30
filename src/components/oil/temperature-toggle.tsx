"use client";

interface TemperatureToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function TemperatureToggle({ value, onChange, disabled = false }: TemperatureToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label="Show temperature overlay"
        disabled={disabled}
        title={disabled ? "Temperature data unavailable" : undefined}
        onClick={() => onChange(!value)}
        className={[
          "h-11 px-4 rounded-md text-sm transition-colors active:scale-95 active:opacity-80",
          disabled ? "opacity-50 cursor-not-allowed" : "",
          value
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        Temperature
      </button>
    </div>
  );
}
