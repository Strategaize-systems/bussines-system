// V6.2 SLC-622 MT-3 — Template-Renderer
//
// Pure-Function fuer {{key}}-Variable-Substitution in Workflow-Action-Strings
// (z.B. create_task.title = "Task fuer {{deal.title}}").
//
// Defensives Pattern: unbekannte Keys werden zu leeren Strings, kein Throw.
// Max-Output-Length 1000 chars (Sicherheit gegen Template-Bombs).

const MAX_OUTPUT_LENGTH = 1000;
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/**
 * Liest einen Wert aus dem scope via Dot-Notation.
 * Beispiel: getValue({deal: {title: "x"}}, "deal.title") = "x"
 */
function getValue(scope: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = scope;
  for (const part of parts) {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return "";
}

/**
 * Substitutiert {{key}} und {{nested.key}}-Patterns gegen scope-Werte.
 *
 * - Unbekannte Keys → leerer String (kein Throw).
 * - Nicht-stringifizierbare Werte (Object/Array ohne Date) → leerer String.
 * - Output wird auf MAX_OUTPUT_LENGTH (1000) Zeichen begrenzt.
 */
export function renderTemplate(
  template: string,
  scope: Record<string, unknown>
): string {
  if (typeof template !== "string" || template.length === 0) return "";
  const replaced = template.replace(VARIABLE_REGEX, (_match, key: string) => {
    return stringifyValue(getValue(scope, key));
  });
  if (replaced.length > MAX_OUTPUT_LENGTH) {
    return replaced.slice(0, MAX_OUTPUT_LENGTH);
  }
  return replaced;
}
