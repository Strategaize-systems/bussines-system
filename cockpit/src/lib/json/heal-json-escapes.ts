// V7.5 SLC-752 MT-2 — JSON-Escape-Healer (Bedrock-Output-Drift-Mitigation).
//
// Pattern portiert 1:1 aus strategaize-intelligence-studio:
//   src/lib/pitch/boosterSelector.ts (Funktion `healJsonEscapes`, IS-SLC-109).
// Memory-Trail: feedback_bedrock_json_drift_pattern.md ("healJsonEscapes-Pattern
// aus IS SLC-109 1:1 bei jedem neuen LLM-JSON-Adapter portieren — Bedrock
// unescaped Quotes"). Single-Source-of-Truth fuer alle Business-System-LLM-JSON-
// Adapter (V7.5 sculptor.ts ist die erste Anwendung).
//
// Hintergrund (IS-SLC-109 RPT-054 / ISSUE-026): Bedrock Claude Sonnet 4.6
// schreibt gelegentlich literale `"` (U+0022) in String-Werte, ohne sie als
// `\"` zu escapen. `JSON.parse` wirft daraufhin "Expected ',' or '}' after
// property value". Diese Funktion walked den Text und ergaenzt das Escape
// bei eindeutig "unzulaessigen" Quotes innerhalb von Strings.

/**
 * Heuristik: heile unescaped ASCII-Quotes innerhalb von JSON-String-Werten.
 *
 * Strategie (best-effort, nicht garantiert vollstaendig):
 * - State: `inString` zwischen oeffnender und schliessender Quote.
 * - `\\` und `\"` werden als Escape-Sequenzen anerkannt und uebersprungen.
 * - Eine Quote innerhalb eines Strings ist "Closing", wenn der naechste
 *   Non-Whitespace-Char zu den JSON-Struktur-Tokens `, } ] :` gehoert oder
 *   das Text-Ende ist. Andernfalls ist sie ein unescaped Inner-Quote und
 *   wird zu `\"` umgeschrieben.
 *
 * Side-Effects auf wohlgeformtem JSON: keine (Closing-Quotes werden korrekt
 * als Closing erkannt). Side-Effects auf bereits-escapten Quotes: keine
 * (Escape-Sequenz wird uebersprungen, kein Doppel-Escape).
 *
 * @returns gehealten Text oder Original wenn keine Aenderung noetig.
 */
export function healJsonEscapes(text: string): string {
  const out: string[] = [];
  let inString = false;
  let i = 0;
  let changed = false;

  while (i < text.length) {
    const ch = text[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
        out.push(ch);
        i++;
        continue;
      }
      out.push(ch);
      i++;
      continue;
    }

    // inString === true
    if (ch === "\\" && i + 1 < text.length) {
      // Escape-Sequenz (`\\`, `\"`, `\n`, etc.) — beide Zeichen unveraendert
      // durchreichen.
      out.push(ch);
      out.push(text[i + 1]);
      i += 2;
      continue;
    }

    if (ch === '"') {
      // Pruefe ob das die schliessende Quote ist oder ein Inner-Unescape.
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      const next = j < text.length ? text[j] : undefined;
      if (
        next === undefined ||
        next === "," ||
        next === "}" ||
        next === "]" ||
        next === ":"
      ) {
        inString = false;
        out.push(ch);
        i++;
        continue;
      }
      // Unescaped Inner-Quote -> escape ergaenzen.
      out.push("\\");
      out.push('"');
      i++;
      changed = true;
      continue;
    }

    out.push(ch);
    i++;
  }

  return changed ? out.join("") : text;
}

/**
 * Convenience: try JSON.parse direkt, dann via healed Text. Returnt das
 * geparste Objekt oder null wenn beide Versuche scheitern.
 *
 * Verwendet von `sculptor.ts` Re-Prompt-Loop und kann von anderen
 * LLM-JSON-Adaptern (z.B. signals-extractor, winloss) konsumiert werden,
 * sobald deren Inline-Heuristiken zugunsten dieses Single-Source-of-Truth-
 * Helpers aufgeloest werden.
 */
export function tryParseHealedJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const healed = healJsonEscapes(text);
    if (healed === text) return null;
    try {
      return JSON.parse(healed);
    } catch {
      return null;
    }
  }
}
