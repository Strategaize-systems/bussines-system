"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  validatePasswordStrength,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

/**
 * V7 SLC-703 / BL-470 Follow-up — Set-Password Server Action.
 *
 * Aufrufer: cockpit/src/app/auth/set-password/page.tsx
 *
 * Voraussetzung: Vor diesem Aufruf wurde der Invite-Token via /auth/callback
 * verifyOtp() konsumiert und eine frische Auth-Session in den Response-Cookies
 * gesetzt (siehe route.ts). updateUser() braucht diese Session.
 *
 * V8.12 SLC-908 / BL-502: Dies ist der einzige NEU-Passwort-Entry-Point im BS und
 * bedient sowohl den direkten Set-Password- als auch den Invite-Accept-Flow.
 * Hier greift die zentrale Passwort-Policy (12+ Hard-Floor + zxcvbn-Score >= 3,
 * DEC-278/DEC-282).
 */
export async function setPassword(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof password !== "string") {
    return { error: "Passwort fehlt" };
  }

  const strength = await validatePasswordStrength(password);
  if (!strength.ok) {
    const message = strength.reasons.includes("min_length")
      ? `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`
      : "Passwort ist zu schwach. Bitte waehle ein staerkeres Passwort (z. B. eine laengere Passphrase).";
    return { error: message };
  }

  if (password !== confirmPassword) {
    return { error: "Passwoerter stimmen nicht ueberein" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
