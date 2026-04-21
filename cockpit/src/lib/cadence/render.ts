/**
 * Cadence Template-Rendering (MT-3, SLC-504)
 *
 * Ersetzt Platzhalter wie {{kontakt.vorname}}, {{deal.name}} etc.
 * mit realen Werten aus dem Enrollment-Kontext.
 */

export type RenderContext = {
  kontakt?: {
    vorname?: string | null;
    nachname?: string | null;
    email?: string | null;
    position?: string | null;
  } | null;
  firma?: {
    name?: string | null;
  } | null;
  deal?: {
    name?: string | null;
    wert?: string | null;
    phase?: string | null;
  } | null;
};

const VARIABLE_PATTERN = /\{\{([a-zA-Z_]+)\.([a-zA-Z_]+)\}\}/g;

/**
 * Ersetzt Template-Variablen mit Kontext-Werten.
 *
 * Unbekannte Variablen oder fehlende Werte werden als leerer String ersetzt,
 * damit keine Platzhalter im finalen Text stehen bleiben.
 */
export function renderTemplate(template: string, context: RenderContext): string {
  return template.replace(VARIABLE_PATTERN, (_match, group, field) => {
    const groupKey = group as keyof RenderContext;
    const obj = context[groupKey];
    if (!obj) return "";

    const value = (obj as Record<string, string | null | undefined>)[field];
    return value ?? "";
  });
}

/**
 * Listet alle Variablen auf, die in einem Template verwendet werden.
 * Nuetzlich fuer Validierung im Frontend (Cadence-Builder).
 */
export function extractVariables(template: string): string[] {
  const vars: string[] = [];
  let match;
  const regex = new RegExp(VARIABLE_PATTERN.source, "g");
  while ((match = regex.exec(template)) !== null) {
    vars.push(`${match[1]}.${match[2]}`);
  }
  return [...new Set(vars)];
}
