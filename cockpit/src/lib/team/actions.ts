"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/auth/assert-role";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { inviteUserAndCreateProfile } from "@/lib/auth/invite";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth/types";

/**
 * V7 SLC-703 + V8.1 SLC-824 — Team-Verwaltung Server Actions.
 *
 * 3 Actions:
 *  - inviteMember:  admin + teamlead (Teamlead nur eigenes Team + nur role='member'),  DEC-230
 *  - changeRole:    admin only,                                                          DEC-181
 *  - deleteProfile: admin + teamlead (Teamlead nur eigene Team-Member), Hard-Lock bei
 *                   Owner-Records bleibt fuer beide,                                     DEC-230
 *
 * Alle 3 schreiben audit_log mit entity_type='profile', entity_id=target user_id,
 * actor_id=caller (auth.uid()), changes=Payload (inkl. caller_role bei delete fuer
 * forensische Nachvollziehbarkeit).
 */

const ROLE_VALUES: readonly [Role, ...Role[]] = ["admin", "teamlead", "member"];

// Lax UUID-Format: pruefe nur Shape (8-4-4-4-12 hex), nicht v4-Version/Variant-Bits.
// Real-DB hat geseedete Test-IDs wie '00000000-0000-0000-0000-000000000081' die kein
// striktes RFC-4122 v4 sind, aber valide PostgreSQL-UUIDs. Defense-in-Depth bleibt
// via DB-Column-Type erhalten.
const UUID_LAX_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidLax = (label: string) =>
  z.string().regex(UUID_LAX_REGEX, `${label} muss eine UUID sein`);

const inviteSchema = z.object({
  email: z.string().email("Ungueltige E-Mail-Adresse"),
  role: z.enum(ROLE_VALUES),
  team_id: uuidLax("team_id"),
  display_name: z.string().trim().min(1).max(120).nullable().optional(),
});

const changeRoleSchema = z.object({
  user_id: uuidLax("user_id"),
  new_role: z.enum(ROLE_VALUES),
});

const deleteProfileSchema = z.object({
  user_id: uuidLax("user_id"),
});

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * 8 Kerntabellen pro MIG-033 (DEC-182). Wenn IRGENDEINE > 0 Owner-Rows hat,
 * darf Profile nicht geloescht werden (DEC-193).
 */
const OWNER_TABLES = [
  "companies",
  "contacts",
  "deals",
  "activities",
  "meetings",
  "proposals",
  "email_messages",
  "calls",
] as const;

type OwnerTable = (typeof OWNER_TABLES)[number];

export async function inviteMember(input: {
  email: string;
  role: Role;
  team_id: string;
  display_name?: string | null;
}): Promise<ActionResult<{ user_id: string }>> {
  const profile = await assertRole(["admin", "teamlead"]);
  await assertNotReadOnlyContext();

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe" };
  }
  const { email, role, team_id, display_name } = parsed.data;

  // Teamlead darf nur eigenes Team einladen (DEC-194).
  if (profile.role === "teamlead" && profile.team_id !== team_id) {
    return {
      ok: false,
      error: "Teamlead darf nur das eigene Team einladen.",
    };
  }

  // DEC-230 (supersedes DEC-194): Teamlead darf nur Mitglieder mit Rolle
  // 'member' einladen. Org-Struktur-Aenderungen (Teamlead/Admin anlegen)
  // bleiben Admin-only.
  if (profile.role === "teamlead" && role !== "member") {
    return {
      ok: false,
      error: "INVALID_ROLE_FOR_TEAMLEAD_INVITER: Teamlead darf nur Mitglieder mit Rolle 'member' einladen.",
    };
  }

  try {
    const result = await inviteUserAndCreateProfile({
      email,
      role,
      team_id,
      display_name: display_name ?? null,
    });

    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: profile.user_id,
      action: "invite_sent",
      entity_type: "profile",
      entity_id: result.user_id,
      changes: { email, role, team_id },
      context: "V7 SLC-703 team invite",
    });

    revalidatePath("/settings/team");
    return { ok: true, data: { user_id: result.user_id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return { ok: false, error: message };
  }
}

export async function changeRole(input: {
  user_id: string;
  new_role: Role;
}): Promise<ActionResult> {
  const profile = await assertRole(["admin"]);
  await assertNotReadOnlyContext();

  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe" };
  }
  const { user_id, new_role } = parsed.data;

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user_id)
    .maybeSingle();

  if (readError || !existing) {
    return {
      ok: false,
      error: readError?.message ?? "Profil nicht gefunden.",
    };
  }
  const oldRole = (existing as { role: Role }).role;

  if (oldRole === new_role) {
    return { ok: true, data: undefined };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: new_role })
    .eq("id", user_id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await admin.from("audit_log").insert({
    actor_id: profile.user_id,
    action: "role_changed",
    entity_type: "profile",
    entity_id: user_id,
    changes: { old_role: oldRole, new_role },
    context: "V7 SLC-703 role change",
  });

  revalidatePath("/settings/team");
  return { ok: true, data: undefined };
}

export async function deleteProfile(input: {
  user_id: string;
}): Promise<ActionResult> {
  const profile = await assertRole(["admin", "teamlead"]);
  await assertNotReadOnlyContext();

  const parsed = deleteProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe" };
  }
  const { user_id } = parsed.data;

  // DEC-230: Self-Delete fuer alle Rollen blockiert.
  if (user_id === profile.user_id) {
    return {
      ok: false,
      error: profile.role === "teamlead"
        ? "FORBIDDEN_SELF: Eigenes Profil kann nicht geloescht werden."
        : "Eigenes Profil kann nicht geloescht werden.",
    };
  }

  const admin = createAdminClient();

  // Target-Profile-Read VORGEZOGEN: wird fuer Teamlead-Guards (DEC-230) und
  // spaeter fuer Audit-Backup gebraucht. Eine Query reicht.
  const { data: targetProfileRaw } = await admin
    .from("profiles")
    .select("display_name, role, team_id")
    .eq("id", user_id)
    .maybeSingle();

  const targetProfile = targetProfileRaw as
    | { display_name: string | null; role: Role; team_id: string | null }
    | null;

  // DEC-230 (supersedes DEC-193 fuer Permission-Layer): Teamlead-Caller darf
  // nur eigene Team-Member loeschen. Hard-Lock (DEC-193 Mechanik) bleibt
  // unveraendert und greift fuer beide Rollen.
  if (profile.role === "teamlead") {
    if (!targetProfile) {
      return {
        ok: false,
        error: "Profil nicht gefunden.",
      };
    }
    if (targetProfile.role !== "member") {
      return {
        ok: false,
        error: "FORBIDDEN_NON_MEMBER: Teamlead darf nur Mitglieder mit Rolle 'member' loeschen.",
      };
    }
    if (targetProfile.team_id !== profile.team_id) {
      return {
        ok: false,
        error: "FORBIDDEN_OTHER_TEAM: Teamlead darf nur Mitglieder des eigenen Teams loeschen.",
      };
    }
  }

  // Hard-Lock (DEC-193): COUNT pro Tabelle WHERE owner_user_id = user_id.
  // Greift fuer Admin UND Teamlead unveraendert.
  const counts = await countOwnerRecords(admin, user_id);
  const totalOpen = counts.reduce((sum, c) => sum + c.count, 0);
  if (totalOpen > 0) {
    const detail = counts
      .filter((c) => c.count > 0)
      .map((c) => `${c.table}: ${c.count}`)
      .join(", ");
    return {
      ok: false,
      error: `Profil hat noch ${totalOpen} aktive Records (${detail}). Vorher Bulk-Reassign noetig.`,
    };
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user_id);
  if (deleteAuthError) {
    return {
      ok: false,
      error: `GoTrue-Delete fehlgeschlagen: ${deleteAuthError.message}`,
    };
  }

  // FK ON DELETE SET NULL aus MIG-033 nullt owner_user_id; profiles-Row wird
  // hier explizit geloescht (CASCADE faengt auth-User-Delete sicher ab).
  await admin.from("profiles").delete().eq("id", user_id);

  // DEC-230: caller_role im changes-Payload (Defense-in-Depth, forensisch).
  // Schema-Realitaet: audit_log.context ist TEXT (nicht JSONB wie DEC-230 wortwoertlich
  // beschreibt), deshalb caller_role als Feld in der bestehenden changes-JSONB.
  await admin.from("audit_log").insert({
    actor_id: profile.user_id,
    action: "profile_deleted",
    entity_type: "profile",
    entity_id: user_id,
    changes: {
      display_name_backup: targetProfile?.display_name ?? null,
      role_backup: targetProfile?.role ?? null,
      team_id_backup: targetProfile?.team_id ?? null,
      caller_role: profile.role,
    },
    context: "V8.1 SLC-824 profile delete (DSGVO display_name backup)",
  });

  revalidatePath("/settings/team");
  return { ok: true, data: undefined };
}

async function countOwnerRecords(
  admin: ReturnType<typeof createAdminClient>,
  user_id: string,
): Promise<Array<{ table: OwnerTable; count: number }>> {
  const results: Array<{ table: OwnerTable; count: number }> = [];
  for (const table of OWNER_TABLES) {
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", user_id);
    if (error) {
      // Konservativ: bei Read-Fehler annehmen "noch Records vorhanden", damit
      // Hard-Lock nicht durch Race umgangen wird.
      throw new Error(`Owner-Count fuer ${table} fehlgeschlagen: ${error.message}`);
    }
    results.push({ table, count: count ?? 0 });
  }
  return results;
}
