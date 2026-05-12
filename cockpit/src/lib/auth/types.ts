/**
 * V7 Auth-Helper Types — Rollen-Modell + Profile-Shape.
 * Single Source of Truth fuer `Role` und `Profile` im Anwendungs-Layer.
 *
 * DEC-181: 3 Rollen, flach, 1 User in 1 Team.
 */

export type Role = "admin" | "teamlead" | "member";

export const ROLES: readonly Role[] = ["admin", "teamlead", "member"] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export interface Profile {
  user_id: string;
  role: Role;
  team_id: string | null;
  display_name: string | null;
}
