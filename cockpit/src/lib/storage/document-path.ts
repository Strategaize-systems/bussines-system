/**
 * SLC-893 MT-3 — Pfad-Normalize-Helper fuer documents-Storage-Bucket.
 *
 * Mapping zum neuen user-scoped Pfad-Schema (DEC-264):
 *   <user-id>/<folder>/<Date.now()>_<filename>
 *
 * Wobei `folder` einer von:
 *   - `contacts/<contact-id>`
 *   - `companies/<company-id>`
 *   - `deals/<deal-id>`
 *   - `misc`
 *
 * Pre-MIG-041 Schema (zur Backfill-Erkennung):
 *   documents/<folder>/<Date.now()>_<filename>
 *
 * Pure-Function — keine I/O, testbar via Vitest jsdom-config.
 */

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DocumentPathInput {
  userId: string;
  filename: string;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  timestamp?: number;
}

/**
 * Liefert den neuen user-scoped Storage-Pfad fuer ein hochzuladendes Document.
 *
 * Regeln:
 * - `userId` MUSS valides UUID v4 sein (sonst Throw — Storage-RLS waere kaputt).
 * - Genau eine entity-Verknuepfung darf gesetzt sein. Bei Mehrfach: Prio
 *   contact > company > deal (matchet bisherige document-actions.ts L:55-58).
 * - Keine Verknuepfung → `misc`.
 * - `filename` wird NICHT sanitized (Supabase Storage akzeptiert UTF-8).
 * - `timestamp` wird als `Date.now()` injectable fuer Tests.
 */
export function buildDocumentStoragePath(input: DocumentPathInput): string {
  if (!UUID_V4_RE.test(input.userId)) {
    throw new Error(
      `buildDocumentStoragePath: userId muss UUID v4 sein, got '${input.userId}'`
    );
  }
  if (!input.filename || input.filename.length === 0) {
    throw new Error("buildDocumentStoragePath: filename darf nicht leer sein");
  }

  const ts = input.timestamp ?? Date.now();
  let folder = "misc";
  if (input.contactId) folder = `contacts/${input.contactId}`;
  else if (input.companyId) folder = `companies/${input.companyId}`;
  else if (input.dealId) folder = `deals/${input.dealId}`;

  return `${input.userId}/${folder}/${ts}_${input.filename}`;
}

/**
 * Prueft, ob ein Storage-Pfad bereits dem user-scoped Schema entspricht
 * (erstes Path-Segment ist eine UUID). Wird vom Backfill-Script genutzt,
 * um idempotent zu skipen.
 */
export function isUserScopedPath(storagePath: string): boolean {
  const firstSegment = storagePath.split("/")[0];
  return firstSegment !== undefined && UUID_V4_RE.test(firstSegment);
}

// =====================================================================
// Backfill-Helpers (SLC-893 MT-4)
// =====================================================================

export type BackfillDecision =
  | { action: "skip-already-migrated"; reason: string }
  | { action: "move"; newPath: string; ownerId: string; ownerSource: "created_by" | "fallback" }
  | { action: "orphan"; reason: string };

/**
 * Klassifiziert ein Storage-Object fuer das MIG-041-Backfill.
 *
 * @param oldPath aktuelles `storage.objects.name` (z.B. `documents/contacts/<id>/...`)
 * @param createdBy `documents.created_by` UUID oder null
 * @param fallbackOwnerId Founder-UUID aus ENV `MIG_041_FALLBACK_OWNER_UUID`, oder null
 */
export function classifyBackfillCandidate(
  oldPath: string,
  createdBy: string | null,
  fallbackOwnerId: string | null
): BackfillDecision {
  if (isUserScopedPath(oldPath)) {
    return {
      action: "skip-already-migrated",
      reason: "first-path-segment is already a UUID",
    };
  }

  let ownerId: string | null = null;
  let ownerSource: "created_by" | "fallback" | null = null;

  if (createdBy && UUID_V4_RE.test(createdBy)) {
    ownerId = createdBy;
    ownerSource = "created_by";
  } else if (fallbackOwnerId && UUID_V4_RE.test(fallbackOwnerId)) {
    ownerId = fallbackOwnerId;
    ownerSource = "fallback";
  }

  if (!ownerId || !ownerSource) {
    return {
      action: "orphan",
      reason:
        "documents.created_by NULL and MIG_041_FALLBACK_OWNER_UUID not set or invalid",
    };
  }

  // Strip leading "documents/" praefix wenn vorhanden — Bucket heisst schon
  // documents, kein doppeltes Verzeichnis im neuen Schema.
  const stripped = oldPath.replace(/^documents\//, "");
  const newPath = `${ownerId}/${stripped}`;

  return {
    action: "move",
    newPath,
    ownerId,
    ownerSource,
  };
}
