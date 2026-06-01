// V8.7-A SLC-871 MT-8 (OPTIONAL) — Build-Time Service-Key-Leak-Check
// (DEC-253). Verifiziert, dass STRATEGAIZE_KNOWLEDGE_SERVICE_KEY weder
// als ENV-Key-String noch als Wert in .next/static/-Files landet, nachdem
// `npm run build` gelaufen ist.
//
// OPT-IN: der Test skipt sich selbst wenn `.next/static/` nicht existiert
// (z.B. lokale Vitest-Runs ohne vorigen Build). Nach jedem Build kann
// `npm run test -- service-key-leak-check` als Smoke gegen unbeabsichtigte
// Bundle-Inklusion laufen.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

// __dirname = cockpit/src/__tests__/build  ->  ../../../  = cockpit/
const STATIC_DIR = resolve(__dirname, "../../../.next/static");
const FORBIDDEN_STRING = "STRATEGAIZE_KNOWLEDGE_SERVICE_KEY";

function collectFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, acc);
    } else if (stat.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

describe("Build-Time Service-Key-Leak-Check (V8.7-A SLC-871 MT-8 / DEC-253)", () => {
  it.skipIf(!existsSync(STATIC_DIR))(
    "no .next/static/* file references STRATEGAIZE_KNOWLEDGE_SERVICE_KEY",
    () => {
      const files = collectFiles(STATIC_DIR);
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const file of files) {
        // Nur Text-aehnliche Files lesen — JS/CSS/HTML/JSON. Binary skip.
        if (!/\.(js|mjs|cjs|css|html|json|map|txt)$/i.test(file)) {
          continue;
        }
        const content = readFileSync(file, "utf8");
        if (content.includes(FORBIDDEN_STRING)) {
          offenders.push(file);
        }
      }

      expect(offenders).toEqual([]);
    }
  );
});
