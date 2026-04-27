"use client";

import { useEffect, useState } from "react";

/**
 * useDebouncedValue (SLC-534 MT-2)
 *
 * Liefert einen verzoegerten Wert. Aenderungen am Input setzen einen Timer
 * zurueck — der Output aktualisiert sich erst nach `delay` ms ohne weitere
 * Aenderung. Wird im Composing-Studio fuer das Live-Preview-Render genutzt,
 * damit jeder Tastendruck nicht sofort einen Renderer-Lauf ausloest.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
