import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// SLC-751 DEC-210 — Pfad-Helper liegt in `lib/auth/read-only-paths` um
// Circular-Import zwischen `middleware.ts` und `lib/supabase/middleware.ts`
// zu vermeiden. Re-Export hier fuer externe Konsumenten/Tests.
export { pathMatchesReadOnlyDrilldown } from "@/lib/auth/read-only-paths";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
