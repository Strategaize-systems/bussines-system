"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  peekRateLimit,
  checkRateLimit,
  clearRateLimit,
} from "@/lib/security/rate-limit";
import { extractClientIp } from "@/lib/security/ip-hash";

// V8.14 SLC-912 MT-2 (ISSUE-099) — App-Layer Brute-Force/Credential-Stuffing-Schutz.
// 5 Fehlversuche / 15min / (Email+IP). Generische Fehlermeldung (keine User-
// Enumeration). In-Memory-Limiter (Single-Container Internal-Test-Mode, R-912-4);
// GoTrue GOTRUE_RATE_LIMIT_* ist die zweite Bremse (Coolify-ENV).
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
// V8.15 SLC-913 MT-6 (ISSUE-120) — zusaetzlicher account-scoped Lockout,
// UNABHAENGIG von der IP. Der per-(Email+IP)-Key allein laesst einen Angreifer
// mit vielen realen IPs (Botnet) einen frischen Bucket pro IP ziehen — das ist
// die einzige reale Luecke, nachdem live-verifiziert wurde, dass Traefik den
// XFF nicht client-spoofbar macht (R-913-3). Hoeherer Threshold, weil
// mehrere legitime Nutzer hinter einer NAT/Account denselben Key teilen koennen.
const LOGIN_ACCT_MAX_ATTEMPTS = 20;
const LOGIN_ACCT_WINDOW_MS = 15 * 60 * 1000;
// Generisch — verraet NICHT, ob die E-Mail existiert oder das Passwort falsch war.
const LOGIN_GENERIC_ERROR = "E-Mail oder Passwort ungültig.";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const emailKey = (email ?? "").trim().toLowerCase();
  const ip = extractClientIp(await headers()) ?? "unknown";
  const rateKey = `login:${emailKey}:${ip}`;
  const acctKey = `login-acct:${emailKey}`;

  // Lockout VOR signInWithPassword pruefen (kein GoTrue-Touch wenn gesperrt).
  // Per-IP UND account-scoped — letzteres greift auch bei IP-Rotation.
  if (
    !peekRateLimit(rateKey, LOGIN_MAX_ATTEMPTS).allowed ||
    !peekRateLimit(acctKey, LOGIN_ACCT_MAX_ATTEMPTS).allowed
  ) {
    return { error: LOGIN_GENERIC_ERROR };
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Fehlversuch zaehlen (beide Buckets); generische Meldung statt verbatim error.message.
    checkRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    checkRateLimit(acctKey, LOGIN_ACCT_MAX_ATTEMPTS, LOGIN_ACCT_WINDOW_MS);
    return { error: LOGIN_GENERIC_ERROR };
  }

  // Erfolgreicher Login leert beide Fehlversuch-Counter.
  clearRateLimit(rateKey);
  clearRateLimit(acctKey);

  // SLC-702: rollen-aware Landing-Redirect. Member darf /dashboard nicht
  // sehen (DEC-191) — direkt zu /mein-tag schicken, sonst zeigt URL-Bar
  // kurz /dashboard waehrend Middleware zu /mein-tag redirected (Server-
  // Action + Middleware-Redirect-Interaktion in Next.js 16).
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profile?.role === "member") {
      redirect("/mein-tag");
    }
  }

  redirect("/dashboard");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
