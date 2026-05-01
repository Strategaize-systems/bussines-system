/**
 * E-Mail-Anhang Upload + Delete API Route (SLC-542 Refactor 2026-04-29)
 *
 * Entstand aus Live-Smoke-Befund:
 *   1. Server-Action 1-MB-Body-Limit blockt 2 MB+ Files (gefixt mit
 *      next.config bodySizeLimit, aber strukturell in API-Route besser geloest).
 *   2. Filename mit Umlauten/Sonderzeichen (z.B. "Energieausweiß.pdf")
 *      → Supabase Storage "Invalid key"-Reject.
 *
 * Pattern 1:1 portiert aus strategaize-onboarding-plattform
 * (`src/app/api/capture/[sessionId]/evidence/upload/route.ts`):
 *   - Multipart-Upload via API-Route (kein Body-Size-Limit-Problem)
 *   - Strict ASCII-only Filename-Sanitization
 *   - Strukturierte HTTP-Status-Codes (201/400/401/413/500)
 *   - Cleanup bei DB-Fehler (storage.remove nach failed insert)
 *
 * POST   /api/emails/attachments       multipart { file, composeSessionId }  → 201 { attachment }
 * DELETE /api/emails/attachments?path=…                                       → 200 { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateAttachment,
  type AttachmentMeta,
} from "@/lib/email/attachments-whitelist";

const BUCKET = "email-attachments";

/** ASCII-only Filename-Sanitization (Pattern aus Onboarding-Plattform).
 *  Verhindert "Invalid key"-Errors bei Supabase Storage durch Umlaute,
 *  Sonderzeichen, Leerzeichen, etc. */
function sanitizeFilename(name: string): string {
  // Letzte 200 Zeichen reichen, alles ausser ASCII-alphanumerisch + ._- → "_"
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 200);
}

// =============================================================
// POST /api/emails/attachments
// =============================================================

export async function POST(request: NextRequest) {
  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Nicht authentifiziert" } },
      { status: 401 },
    );
  }

  // --- Multipart-Body parsen ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Multipart form data erwartet" } },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const composeSessionId = formData.get("composeSessionId");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Feld 'file' fehlt oder ist keine Datei" } },
      { status: 400 },
    );
  }
  if (typeof composeSessionId !== "string" || !composeSessionId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Feld 'composeSessionId' fehlt" } },
      { status: 400 },
    );
  }
  // UUID-Form-Pruefung defensiv (verhindert Path-Traversal via "..")
  if (!/^[0-9a-fA-F-]{8,}$/.test(composeSessionId)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Ungueltige Compose-Session-ID" } },
      { status: 400 },
    );
  }

  // --- Storage-State der Compose-Session lesen ---
  // V5.4.1 (ISSUE-045 + SLC-542 L1): Single list()-Call deckt zwei Aspekte:
  //   (a) Server-side Total-Size-Limit (vorher Client-Convenience)
  //   (b) Filename-Kollision-Suffix " (n)" statt blindem upsert
  const admin = createAdminClient();
  const { data: existingFiles } = await admin.storage
    .from(BUCKET)
    .list(`${user.id}/${composeSessionId}/`, { limit: 1000 });
  const existing = existingFiles ?? [];

  const totalSizeSoFar = existing.reduce(
    (sum, f) => sum + (f.metadata?.size ?? 0),
    0,
  );

  // --- Whitelist + Pro-File + Total-Size Validation ---
  const validation = validateAttachment(
    { type: file.type, size: file.size, name: file.name },
    totalSizeSoFar,
  );
  if (!validation.ok) {
    // 413 nur wenn Size das Problem ist, sonst 400.
    const isPayloadIssue = /zu gross/.test(validation.error);
    return NextResponse.json(
      { error: { code: isPayloadIssue ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", message: validation.error } },
      { status: isPayloadIssue ? 413 : 400 },
    );
  }

  // --- Filename-Kollision: " (n)"-Suffix bei Duplikat ---
  // V5.4.1 (SLC-542 L1): Re-Drag derselben Datei wuerde mit upsert:true die
  // alte Version ueberschreiben — okay solange beide Kopien identisch sind,
  // problematisch wenn der User echte zweite Datei mit gleichem Namen hat.
  // Pragmatischer Fix: bei Duplikat suffix anhaengen, kein upsert mehr.
  const safeName = sanitizeFilename(file.name);
  const existingNames = new Set(existing.map((f) => f.name));
  const finalName = generateUniqueName(safeName, existingNames);
  const storagePath = `${user.id}/${composeSessionId}/${finalName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: `Upload fehlgeschlagen: ${uploadError.message}`,
        },
      },
      { status: 500 },
    );
  }

  const attachment: AttachmentMeta = {
    storagePath,
    filename: finalName,
    mimeType: file.type,
    sizeBytes: file.size,
  };

  return NextResponse.json({ attachment }, { status: 201 });
}

/** Generates a unique filename by appending " (n)" before the extension when
 *  a name collision exists. Examples: "report.pdf" → "report (1).pdf" → ... */
function generateUniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dotIdx = name.lastIndexOf(".");
  const base = dotIdx >= 0 ? name.substring(0, dotIdx) : name;
  const ext = dotIdx >= 0 ? name.substring(dotIdx) : "";
  let n = 1;
  while (taken.has(`${base} (${n})${ext}`)) n++;
  return `${base} (${n})${ext}`;
}

// =============================================================
// DELETE /api/emails/attachments?path=<storagePath>
// =============================================================

export async function DELETE(request: NextRequest) {
  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Nicht authentifiziert" } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get("path");

  if (!storagePath) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Query-Parameter 'path' fehlt" } },
      { status: 400 },
    );
  }

  // --- Path-Owner-Check: User darf nur eigene Files loeschen ---
  const expectedPrefix = `${user.id}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Path gehoert nicht zum aktuellen User" } },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: `Loeschen fehlgeschlagen: ${error.message}`,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
