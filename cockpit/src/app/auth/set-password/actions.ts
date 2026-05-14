"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * V7 SLC-703 / BL-470 Follow-up — Set-Password Server Action.
 *
 * Aufrufer: cockpit/src/app/auth/set-password/set-password-form.tsx
 *
 * Voraussetzung: Vor diesem Aufruf wurde der Invite-Token via /auth/callback
 * verifyOtp() konsumiert und eine frische Auth-Session in den Response-Cookies
 * gesetzt (siehe route.ts). updateUser() braucht diese Session.
 */
export async function setPassword(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen lang sein" };
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
