import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "./types";

/**
 * V7 SLC-703 — Wrapper um Supabase GoTrue Admin-Invite.
 *
 * Schritte:
 *  1. `supabase.auth.admin.inviteUserByEmail()` triggert GoTrue-Mail (Magic-Link
 *     fuer Set-Password). Liefert den frisch angelegten auth.users-Row.
 *  2. INSERT INTO profiles (id, role, team_id, display_name).
 *
 * DEC-194: team_id ist Pflicht beim Invite, Default-Rolle `member`.
 *
 * Idempotenz: GoTrue wirft `User already registered` bei doppelter Mail. Der
 * Caller (Server Action) faengt das ab und mappt auf User-Message.
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

  const { data, error } = await admin.auth.admin.inviteUserByEmail(args.email);

  if (error) {
    throw new Error(`Invite-Mail fehlgeschlagen: ${error.message}`);
  }

  const user = data?.user;
  if (!user) {
    throw new Error("Invite-Mail erfolgreich, aber kein User in Response.");
  }

  // Profile-Row anlegen. RLS profiles_admin_insert erlaubt nur admin —
  // adminClient (service_role) bypasst RLS, also auch fuer Teamlead-Caller OK.
  const { error: insertError } = await admin.from("profiles").insert({
    id: user.id,
    role: args.role,
    team_id: args.team_id,
    display_name: args.display_name ?? null,
  });

  if (insertError) {
    // Best-effort Rollback: GoTrue-User wieder loeschen, damit kein Waisen-Row
    // in auth.users zurueck bleibt. Fehler beim Rollback wird ignoriert.
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    throw new Error(`Profile-Insert fehlgeschlagen: ${insertError.message}`);
  }

  return { user_id: user.id, email: args.email };
}
