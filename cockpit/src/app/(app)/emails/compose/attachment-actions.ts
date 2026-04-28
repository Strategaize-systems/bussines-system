"use server";

// =============================================================
// Email-Anhang Server Actions (SLC-542 MT-3)
// =============================================================
// uploadEmailAttachment + deleteEmailAttachment.
//
// Storage-Path-Pattern (DEC-098): {user_id}/{compose_session_id}/{filename}
// - user_id-Prefix sichert Path-Owner-Check beim Delete (User kann nur eigene
//   Files loeschen, auch wenn er fremden Path konstruiert)
// - compose_session_id gruppiert Files einer Compose-Session, vereinfacht
//   spaeteres Cleanup (DEC-104 deferred)

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateAttachment,
  type AttachmentMeta,
} from "@/lib/email/attachments-whitelist";

const BUCKET = "email-attachments";

type UploadResult =
  | { ok: true; attachment: AttachmentMeta }
  | { ok: false; error: string };

type DeleteResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht authentifiziert");
  return auth.user;
}

/**
 * Upload eines E-Mail-Anhangs in Bucket "email-attachments".
 *
 * Erwartet FormData mit:
 *   - file: File
 *   - composeSessionId: string (UUID, vom Client generiert)
 *
 * Server-Re-Validation der Whitelist (MIME + Size). totalSizeSoFar wird hier
 * mit 0 angenommen — der Client macht die Total-Size-Pruefung. Wenn ein
 * Angreifer die Client-Validation umgeht, faengt der einzelne Pro-File-
 * MAX_FILE_SIZE_BYTES Limit + Bucket-File-Size-Limit (kein DB-Constraint
 * gesetzt) den Worst-Case ab. 25 MB Total ist nur User-Convenience, kein
 * Sicherheits-Limit.
 */
export async function uploadEmailAttachment(
  formData: FormData,
): Promise<UploadResult> {
  const user = await requireUser();

  const file = formData.get("file");
  const composeSessionId = formData.get("composeSessionId");

  if (!(file instanceof File)) {
    return { ok: false, error: "Keine Datei uebergeben." };
  }
  if (typeof composeSessionId !== "string" || !composeSessionId) {
    return { ok: false, error: "Compose-Session-ID fehlt." };
  }
  // UUID-Form-Pruefung defensiv (verhindert Path-Traversal via "..")
  if (!/^[0-9a-fA-F-]{8,}$/.test(composeSessionId)) {
    return { ok: false, error: "Ungueltige Compose-Session-ID." };
  }

  // Server-side Whitelist-Re-Validation (defensive — Client kann umgangen werden)
  const validation = validateAttachment(
    { type: file.type, size: file.size, name: file.name },
    0,
  );
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  // Filename sanitization: keine Pfad-Trenner, keine Steuerzeichen
  const safeName = file.name
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
    .substring(0, 200);

  const storagePath = `${user.id}/${composeSessionId}/${safeName}`;

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true, // gleicher Filename in derselben Session ueberschreibt
    });

  if (uploadError) {
    return { ok: false, error: `Upload fehlgeschlagen: ${uploadError.message}` };
  }

  return {
    ok: true,
    attachment: {
      storagePath,
      filename: safeName,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  };
}

/**
 * Loescht einen E-Mail-Anhang aus dem Bucket.
 * Path-Owner-Check: storagePath muss mit "{user_id}/" beginnen, sonst Reject.
 * Storage-Files bleiben generell nach Send (DEC-098), Delete ist nur
 * relevant fuer "Anhang im Compose-UI entfernen vor Send".
 */
export async function deleteEmailAttachment(
  storagePath: string,
): Promise<DeleteResult> {
  const user = await requireUser();

  if (typeof storagePath !== "string" || !storagePath) {
    return { ok: false, error: "Storage-Path fehlt." };
  }

  // Path-Owner-Check: User darf nur eigene Files loeschen
  const expectedPrefix = `${user.id}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return { ok: false, error: "Path gehoert nicht zum aktuellen User." };
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    return { ok: false, error: `Loeschen fehlgeschlagen: ${error.message}` };
  }

  return { ok: true };
}
