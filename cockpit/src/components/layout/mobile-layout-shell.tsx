"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import type { Role } from "@/lib/auth/types";

/**
 * SLC-707 MT-5 — Mobile-Shell um den App-Bereich.
 *
 * - Rendert auf `<md` die `MobileTopBar` mit Hamburger-Button.
 * - Klick oeffnet einen left-anchored Drawer (base-ui Dialog) mit der
 *   Sidebar im Mobile-Mode.
 * - `useEffect([pathname])` schliesst den Drawer automatisch nach Navigation
 *   (AC4 + AC7 Memory-only State).
 * - Desktop-Variant `Sidebar` wird ueber max-md:hidden in der Sidebar selbst
 *   geblendet.
 *
 * Hinweis: Wir benutzen `@base-ui/react/dialog` direkt statt `<SheetContent>`,
 * weil das shadcn-Sheet in diesem Repo als zentrierte Modal-Card mit white-bg
 * vorkonfiguriert ist und nicht in einen Side-Drawer umgeformt werden kann.
 * Die Dialog-Primitives liefern uns volle Kontrolle ueber den Drawer-Layout.
 */
export function MobileLayoutShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // AC7: Memory-only. Reset bei Route-Wechsel.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop-Sidebar (max-md:hidden intern, fixed). */}
      <Sidebar role={role} variant="desktop" />

      {/* Mobile-Drawer (md:hidden). */}
      <Dialog.Root open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          />
          <Dialog.Popup
            className="md:hidden fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col outline-none transition-transform duration-200 ease-out data-ending-style:-translate-x-full data-starting-style:-translate-x-full"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Mobile Navigations-Drawer
            </Dialog.Description>
            <Sidebar
              role={role}
              variant="mobile"
              onItemClick={() => setMobileSidebarOpen(false)}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex flex-1 flex-col md:pl-64">
        <MobileTopBar onMenuOpen={() => setMobileSidebarOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
