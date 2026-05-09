"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/actions/auth";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Signing in...
        </span>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus password input on mount (per UI-SPEC accessibility requirement)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Utilities</h1>
          <p className="text-sm text-muted-foreground">Home utilities tracker</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                required
                className={`pr-10 text-base min-h-[44px] ${
                  state?.error ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                aria-describedby={state?.error ? "password-error" : undefined}
                aria-invalid={!!state?.error}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Error message — announced to screen readers via aria-live */}
            <div aria-live="polite" aria-atomic="true">
              {state?.error && (
                <p id="password-error" className="text-sm text-destructive">
                  {state.error}
                </p>
              )}
            </div>
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
