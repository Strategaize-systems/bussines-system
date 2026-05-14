import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * GET /auth/callback — Handle token verification fuer Invite + Magic-Link.
 *
 * GoTrue redirect: /auth/callback?token_hash=...&type=invite|email
 *
 * Pattern uebernommen aus strategaize-onboarding-plattform/src/app/auth/callback/route.ts
 * (Memory: feedback_auth_callback_proxy_origin.md).
 *
 * KRITISCH — `NEXT_PUBLIC_APP_URL` statt `request.nextUrl.origin`:
 * Hinter Coolify-Traefik-Reverse-Proxy ist `origin` der INTERNE Container-Listener
 * (`http://0.0.0.0:3000`), nicht die Public-Domain. Redirect via `origin` produziert
 * `ERR_ADDRESS_INVALID` im Browser. Daher konsequent ENV-URL nutzen.
 *
 * Plus — Admin-Session-Kollision: Der einladende Admin ist beim Klick auf den Invite-
 * Link selbst eingeloggt. Ohne `signOut()` VOR `verifyOtp()` kollidieren die zwei
 * Sessions und der Invite-Token wird gegen den falschen User verifiziert. Daher
 * Sign-Out als erste Aktion in der Response-Cookie-Chain.
 *
 * Plus — Cookie-Binding: `createClient()` aus `lib/supabase/server.ts` nutzt
 * `cookies()` aus next/headers; diese Cookies werden bei `NextResponse.redirect()`
 * nicht zuverlaessig uebertragen. Daher hier `createServerClient` direkt mit
 * cookies-Binding an die Response.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const token = searchParams.get("token");

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || "";

  const isInvite = type === "invite";
  const successUrl = isInvite
    ? `${redirectBase}/auth/set-password`
    : `${redirectBase}/dashboard`;

  // Redirect-Response ZUERST anlegen, damit Supabase-Cookies daran haengen.
  const response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Bestehende Admin-Session ausloggen, damit der Invite-Token nicht gegen den
  // falschen User verifiziert wird.
  await supabase.auth.signOut();

  const hashToVerify = token_hash || token;
  if (!hashToVerify || !type) {
    return NextResponse.redirect(
      `${redirectBase}/login?error=Invalid+callback+parameters`,
    );
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: hashToVerify,
    type: type as "invite" | "email",
  });

  if (error) {
    return NextResponse.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}
