import type { ComplianceVariableMap } from "./tokens";

/**
 * Mini-Variablen-Engine fuer Compliance-Templates (DEC-084, V5.2).
 *
 * Token-Syntax: `{token_name}` — wird durch den Wert aus `vars[token_name]` ersetzt.
 * Unbekannte oder leere Tokens bleiben unveraendert sichtbar (`{firma}` -> `{firma}`),
 * damit der User in der Copy-Vorschau erkennt, welche Werte fehlen.
 *
 * Regex `\{(\w+)\}` matcht ASCII-Identifier — keine Sonderzeichen, kein Whitespace.
 * Das ist absichtlich restriktiv, um versehentliche Replacements in Markdown zu vermeiden.
 */
export function applyTemplateVariables(
  template: string,
  vars: ComplianceVariableMap,
): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null || value === "") {
      return match;
    }
    return value;
  });
}
