import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { evaluateRouteGuard } from "@/lib/auth/middleware-guards";
import { isRole } from "@/lib/auth/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPaths = ["/login", "/auth/callback", "/auth/set-password", "/api/cron", "/api/webhooks", "/consent", "/api/track", "/api/export", "/api/branding", "/r/", "/api/leads/intake", "/api/campaigns", "/api/winloss"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // Not authenticated and trying to access protected route
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated and on login page → redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // V7 SLC-702: Rollen-Schutz fuer protected Routes (DEC-191). Wir laden
  // die Rolle nur dann wenn der User authentifiziert ist und die Route nicht
  // public ist — sonst kostet jede public-Navigation einen DB-Hit ohne
  // Nutzen.
  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile && isRole(profile.role)) {
      const redirectPath = evaluateRouteGuard(pathname, profile.role);
      if (redirectPath && pathname !== redirectPath) {
        const url = request.nextUrl.clone();
        url.pathname = redirectPath;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    // Wenn Profile fehlt oder Rolle ungueltig: kein middleware-Block. Die
    // Server-Component-Layout-Pruefung (`assertRole`) faengt das spaeter
    // mit besserer Fehler-Surface auf.
  }

  return supabaseResponse;
}
