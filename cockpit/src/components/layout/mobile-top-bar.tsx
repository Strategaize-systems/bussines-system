"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SLC-707 MT-3 — Mobile-Top-Bar.
 *
 * Sticky-Top-Bar nur sichtbar auf `<md` (Mobile). Logo links, Hamburger-Icon
 * rechts. Brand-Tokens (Style-Guide-V2), z-30 damit der Sheet-Overlay (z-50)
 * sauber drueber liegt.
 *
 * Verbraucher: `(app)/layout.tsx` (MT-5) — uebergibt `onMenuOpen` als
 * State-Setter fuer den Mobile-Sidebar-Sheet.
 */
export function MobileTopBar({
  onMenuOpen,
  className,
}: {
  onMenuOpen: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4",
        className,
      )}
      data-testid="mobile-top-bar"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Business System
        </span>
      </div>
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Navigation oeffnen"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  );
}
