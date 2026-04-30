// V5.5 SLC-553 — Logo-Embedding fuer pdfmake.
// pdfmake erwartet ein DataURL ("data:image/png;base64,...") fuer eingebettete
// Bilder. Wir laden das aktuelle Logo (neueste Datei im `branding`-Bucket via
// Service-Role) und konvertieren es magic-number-sicher in den passenden
// MIME-Typ. SVG/GIF/WebP werden bewusst nicht unterstuetzt — pdfmake kennt
// nur PNG und JPEG nativ.

import type { SupabaseClient } from "@supabase/supabase-js";

const LOGO_BUCKET = "branding";

type Mime = "image/png" | "image/jpeg" | null;

function detectMime(buffer: Buffer): Mime {
  if (buffer.length < 4) return null;
  const b0 = buffer[0];
  const b1 = buffer[1];
  const b2 = buffer[2];
  const b3 = buffer[3];
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return "image/png";
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return "image/jpeg";
  return null;
}

export async function getLogoDataUrl(
  admin: SupabaseClient,
): Promise<string | null> {
  try {
    const { data: files, error: listErr } = await admin.storage
      .from(LOGO_BUCKET)
      .list(undefined, {
        limit: 10,
        sortBy: { column: "created_at", order: "desc" },
      });
    if (listErr || !files || files.length === 0) return null;

    const file = files[0];
    const { data: blob, error: dlErr } = await admin.storage
      .from(LOGO_BUCKET)
      .download(file.name);
    if (dlErr || !blob) return null;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const mime = detectMime(buffer);
    if (!mime) return null;

    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
