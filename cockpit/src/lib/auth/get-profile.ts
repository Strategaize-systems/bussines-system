import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRole, type Profile } from "./types";

/**
 * Server-only: returnt das Profile des aktuell eingeloggten Users.
 * - Per-Request memoized via React `cache()` (Next.js App-Router-Pattern).
 * - Bei fehlender Session: `redirect('/login')` (kein return).
 * - Bei fehlendem profiles-Row oder ungueltiger Rolle: wirft Error (signalisiert
 *   harten Datenfehler, nicht User-Issue).
 *
 * DEC-181: Rollen-Modell. SLC-701 hat `role` CHECK-Constraint live, daher ist
 * `isRole()`-Verifikation Defense-in-Depth.
 */
export const getProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, team_id, display_name")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(
      `getProfile: profile row missing for user_id=${user.id} (${error?.message ?? "no row"})`,
    );
  }

  if (!isRole(data.role)) {
    throw new Error(
      `getProfile: invalid role '${data.role}' for user_id=${user.id} (expected admin|teamlead|member)`,
    );
  }

  return {
    user_id: user.id,
    role: data.role,
    team_id: data.team_id ?? null,
    display_name: data.display_name ?? null,
  };
});
