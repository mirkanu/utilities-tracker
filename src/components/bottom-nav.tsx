"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Droplets, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/oil", label: "Oil", icon: Droplets },
  { href: "/electricity", label: "Electricity", icon: Zap },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    // pb-safe: CSS env(safe-area-inset-bottom) for iOS home indicator clearance
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe"
      aria-label="Main navigation"
    >
      <div className="grid grid-cols-3 h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                // min-h ensures 44px tap target (Apple HIG + Material Design)
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors active:scale-95 active:opacity-80",
                active
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
