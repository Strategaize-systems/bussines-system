"use client";

import { useCallback, useEffect, useRef } from "react";

// V5.5 SLC-552: Custom-Debounce-Hook ohne lodash. Ersetzt setTimeout/clearTimeout-
// Boilerplate in Auto-Save (500ms) + Live-Preview (250ms).
// Wiederverwendbar fuer SLC-553/554/555.
//
// Pattern: stabile Callback-Identitaet (useCallback) + Cleanup-on-Unmount.

export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number,
): (...args: TArgs) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
