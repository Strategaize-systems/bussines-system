import { notFound, redirect } from "next/navigation";
import { getProfile } from "./get-profile";
import type { Profile, Role } from "./types";

/**
 * Pure function: prueft ob `current` in `allowed` enthalten ist.
 * Exportiert fuer Vitest und fuer Sidebar-Filter.
 */
export function roleAllowed(current: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(current);
}

/**
 * Server-Component-Guard: wirft `redirect('/mein-tag')` wenn Rolle nicht
 * in `allowed`. Returnt das Profile bei Erfolg, damit es im Caller
 * weiterverwendet werden kann.
 *
 * DEC-191: Pro Page Server-Component am Anfang.
 */
export async function assertRole(allowed: readonly Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!roleAllowed(profile.role, allowed)) {
    redirect("/mein-tag");
  }
  return profile;
}

/**
 * Variant fuer Routes die bei Mismatch 404 statt Redirect zeigen sollen
 * (z.B. interne Admin-only Tools die fuer Member nicht existieren sollen).
 */
export async function requireRole(allowed: readonly Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!roleAllowed(profile.role, allowed)) {
    notFound();
  }
  return profile;
}
