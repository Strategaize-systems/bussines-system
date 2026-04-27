/**
 * Branding-Logo Public Endpoint (FEAT-531, SLC-531 Hotfix RPT-225)
 *
 * Oeffentlicher Endpoint (kein Auth) — Browser- und Mail-Empfaenger laden
 * das aktive Branding-Logo via dieser Route. Holt das neueste File aus dem
 * `branding`-Storage-Bucket via service_role (BYPASSRLS) und liefert es
 * mit korrektem Content-Type aus.
 *
 * Hintergrund: Self-Hosted-Supabase ist via `/supabase/...` extern nicht
 * direkt erreichbar — kein Reverse-Proxy zu Kong. Statt einer Kong-Public-URL
 * proxien wir das Logo-File serverseitig durch Next.js.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "branding";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
};

export async function GET() {
  const admin = createAdminClient();

  // Neuestes File im Bucket holen (uploadLogo loescht alte best-effort vorher,
  // also ist das neueste File immer das aktuelle Logo).
  const { data: files, error: listError } = await admin.storage
    .from(BUCKET)
    .list(undefined, { limit: 10, sortBy: { column: "created_at", order: "desc" } });

  if (listError || !files || files.length === 0) {
    return new NextResponse("Logo nicht gefunden", { status: 404 });
  }

  const file = files[0];
  const { data: blob, error: downloadError } = await admin.storage
    .from(BUCKET)
    .download(file.name);

  if (downloadError || !blob) {
    return new NextResponse("Logo-Download fehlgeschlagen", { status: 500 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const buffer = Buffer.from(await blob.arrayBuffer());

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
