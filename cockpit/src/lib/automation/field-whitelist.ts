// V6.2 SLC-621 MT-5 — Field-Whitelist + Validators
//
// DEC-130: Whitelist als Code-Konfig (Type-safe, Reviewable in Git, Test-bar).
// Wichtig: PII-Felder (email, phone, name, title, description) sind explizit
// NICHT erlaubt. Aktion `update_field` darf nur die hier genannten Felder
// schreiben — alles andere wird vom Action-Executor (SLC-622) abgelehnt.

export type EntityType = "deal" | "contact" | "company";

export interface FieldSpec {
  field: string;
  validate: (value: unknown) => boolean;
  description: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUuid(value: unknown): boolean {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function validateIsoDate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // YYYY-MM-DD oder YYYY-MM-DDTHH:mm:ss[Z|+/-HH:mm]
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(value)) {
    return false;
  }
  const ts = Date.parse(value);
  return !Number.isNaN(ts);
}

function validatePositiveNumber(value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 1e9 && Number.isFinite(value);
}

function validateTagsArray(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length > 50) return false;
  return value.every((v) => typeof v === "string" && v.length > 0 && v.length <= 100);
}

/**
 * Whitelist der per `update_field`-Action editierbaren Felder.
 *
 * **PII-Schutz:** absichtlich KEIN email, phone, name, title, description,
 * email_address. Workflow-Engine darf solche Felder NICHT setzen.
 */
export const UPDATE_FIELD_WHITELIST: Record<EntityType, FieldSpec[]> = {
  deal: [
    {
      field: "stage_id",
      validate: validateUuid,
      description: "Pipeline-Stage UUID",
    },
    {
      field: "value",
      validate: validatePositiveNumber,
      description: "Deal-Wert (>= 0, <= 1 Mrd.)",
    },
    {
      field: "expected_close_date",
      validate: validateIsoDate,
      description: "Erwartetes Abschluss-Datum (ISO 8601)",
    },
  ],
  contact: [
    {
      field: "tags",
      validate: validateTagsArray,
      description: "Tag-Array (max 50 Eintraege, max 100 Zeichen pro Tag)",
    },
  ],
  company: [
    {
      field: "tags",
      validate: validateTagsArray,
      description: "Tag-Array (max 50 Eintraege, max 100 Zeichen pro Tag)",
    },
  ],
};

/** Liefert true wenn (entity, field) in der Whitelist steht. */
export function isFieldWhitelisted(entity: EntityType, field: string): boolean {
  const specs = UPDATE_FIELD_WHITELIST[entity];
  if (!specs) return false;
  return specs.some((s) => s.field === field);
}

/** Liefert die FieldSpec wenn whitelisted, sonst null. */
export function getFieldSpec(
  entity: EntityType,
  field: string
): FieldSpec | null {
  const specs = UPDATE_FIELD_WHITELIST[entity];
  if (!specs) return null;
  return specs.find((s) => s.field === field) ?? null;
}

export type ValidateFieldResult =
  | { ok: true }
  | { ok: false; error: string };

/** Pruefen ob (entity, field, value) erlaubt ist. */
export function validateFieldValue(
  entity: EntityType,
  field: string,
  value: unknown
): ValidateFieldResult {
  const spec = getFieldSpec(entity, field);
  if (!spec) {
    return {
      ok: false,
      error: `Feld '${entity}.${field}' ist nicht in der update_field-Whitelist.`,
    };
  }
  if (!spec.validate(value)) {
    return {
      ok: false,
      error: `Wert fuer '${entity}.${field}' ist ungueltig (erwartet: ${spec.description}).`,
    };
  }
  return { ok: true };
}
