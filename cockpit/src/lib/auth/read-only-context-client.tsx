"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ReadOnlyContextValue } from "./read-only-context";

/**
 * Client-Side Pendant zu read-only-context.ts.
 *
 * Server-Components (z.B. SLC-706 Drilldown-Page) rendern den Provider, damit
 * Client-Komponenten im Subtree (Buttons, Forms) wissen, dass sie disabled
 * darstellen sollen.
 *
 * Konsum: `useReadOnlyContext()` in Client-Komponenten.
 */

const ClientReadOnlyContext = createContext<ReadOnlyContextValue | null>(null);

export function ReadOnlyContextProvider({
  value,
  children,
}: {
  value: ReadOnlyContextValue | null;
  children: ReactNode;
}) {
  return (
    <ClientReadOnlyContext.Provider value={value}>
      {children}
    </ClientReadOnlyContext.Provider>
  );
}

export function useReadOnlyContext(): ReadOnlyContextValue | null {
  return useContext(ClientReadOnlyContext);
}

export function useIsReadOnly(): boolean {
  return useContext(ClientReadOnlyContext) !== null;
}
