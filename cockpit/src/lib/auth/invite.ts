import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "./types";

/**
 * V7 SLC-703 / BL-470 — Wrapper um Supabase GoTrue Admin-Invite.
 *
 * Schritte:
 *  1. `admin.auth.admin.generateLink({ type: 'invite', email })` legt den User
 *     an (wenn nicht existiert) UND liefert `hashed_token`. KEINE GoTrue-Auto-
 *     Mail, daher kein Host-Drift-Risiko (ISSUE-072 ehemals: GoTrue v2.160.0
 *     baut die Mail-URL aus Request-Host = `supabase-kong:8000`).
 *  2. Eigene Confirm-URL gegen `${NEXT_PUBLIC_APP_URL}/auth/callback` bauen.
 *  3. INSERT INTO profiles (id, role, team_id, display_name).
 *  4. Eigenes NodeMailer-Mail mit Confirm-URL versenden.
 *  5. Rollback (auth.users + profiles) bei Profile-Insert- oder Mail-Fehler.
 *
 * DEC-194: team_id ist Pflicht beim Invite, Default-Rolle `member`.
 *
 * Idempotenz: generateLink wirft `User already registered` bei doppelter Mail.
 * Der Caller (Server Action) faengt das ab und mappt auf User-Message.
 *
 * Audit-Log: erfolgt im Caller (Server Action), nicht hier, damit das
 * Audit-Trail-Entity-ID = neuer User-ID + Actor-ID = einladender User aus
 * einem zentralen Punkt geloggt wird.
 */
export interface InviteResult {
  user_id: string;
  email: string;
}

export async function inviteUserAndCreateProfile(args: {
  email: string;
  role: Role;
  team_id: string;
  display_name?: string | null;
}): Promise<InviteResult> {
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL ist nicht gesetzt");
  }

  // 1. User anlegen + Invite-Token generieren (KEINE Auto-Mail).
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: args.email,
    options: {
      redirectTo: `${appUrl}/auth/set-password`,
    },
  });

  if (linkError) {
    throw new Error(`Invite-Link-Generierung fehlgeschlagen: ${linkError.message}`);
  }

  const user = linkData?.user;
  const hashedToken = linkData?.properties?.hashed_token;
  if (!user || !hashedToken) {
    throw new Error(
      "Invite-Link-Generierung erfolgreich, aber kein User/Token in Response.",
    );
  }

  // 2. Confirm-URL gegen unseren eigenen Callback bauen — bypass GoTrue-Auto-
  //    URL-Building (das den internen Container-Hostname injiziert).
  const confirmUrl =
    `${appUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}` +
    `&type=invite`;

  // 3. Profile-Row anlegen. RLS profiles_admin_insert erlaubt nur admin —
  //    adminClient (service_role) bypasst RLS, also auch fuer Teamlead-Caller OK.
  const { error: insertError } = await admin.from("profiles").insert({
    id: user.id,
    role: args.role,
    team_id: args.team_id,
    display_name: args.display_name ?? null,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    throw new Error(`Profile-Insert fehlgeschlagen: ${insertError.message}`);
  }

  // 4. Eigene Mail via NodeMailer.
  try {
    await sendInviteMail({
      to: args.email,
      confirmUrl,
      displayName: args.display_name ?? args.email,
    });
  } catch (mailError) {
    // Rollback: Profile + Auth-User loeschen.
    await admin.from("profiles").delete().eq("id", user.id).then(() => {}, () => {});
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    const msg = mailError instanceof Error ? mailError.message : "Unbekannter Fehler";
    throw new Error(`Invite-Mail-Versand fehlgeschlagen: ${msg}`);
  }

  return { user_id: user.id, email: args.email };
}

async function sendInviteMail(args: {
  to: string;
  confirmUrl: string;
  displayName: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const senderName = process.env.SMTP_FROM_NAME || "Business Cockpit";

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP-Konfiguration unvollstaendig (SMTP_HOST/SMTP_USER/SMTP_PASSWORD)",
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const safeName = escapeHtml(args.displayName);
  const safeLink = escapeHtml(args.confirmUrl);
  const subject = "Einladung zum Business Cockpit";
  const text =
    `Hallo ${args.displayName},\n\n` +
    `du wurdest zum Business Cockpit eingeladen.\n\n` +
    `Klicke auf folgenden Link, um dein Passwort zu setzen und dich anzumelden:\n` +
    `${args.confirmUrl}\n\n` +
    `Der Link ist 24 Stunden gueltig.\n`;
  const html = `<!DOCTYPE html>
<html lang="de">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
  <h2 style="color:#1e40af;margin-top:0;">Einladung zum Business Cockpit</h2>
  <p>Hallo ${safeName},</p>
  <p>du wurdest zum Business Cockpit eingeladen.</p>
  <p>Klicke auf den Button, um dein Passwort zu setzen und dich anzumelden:</p>
  <p style="margin:32px 0;">
    <a href="${safeLink}" style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Einladung annehmen</a>
  </p>
  <p style="color:#475569;font-size:14px;">Der Link ist 24 Stunden gueltig.</p>
  <p style="color:#475569;font-size:12px;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
    <a href="${safeLink}" style="color:#1e40af;word-break:break-all;">${safeLink}</a>
  </p>
</body>
</html>`;

  await transporter.sendMail({
    from: senderName ? `"${senderName}" <${from}>` : from,
    to: args.to,
    subject,
    text,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
