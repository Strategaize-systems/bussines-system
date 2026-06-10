/**
 * V8.12 SLC-908 / BL-502 — Zentrale Passwort-Policy (12+ Hard-Floor + zxcvbn-Score >= 3).
 *
 * DEC-278: Gilt NUR fuer NEU gesetzte Passwoerter. Im BS ist der einzige Entry-Point
 *   der set-password-Flow (`/auth/set-password`), der auch den Invite-Accept-Flow
 *   bedient (Invites routen via /auth/callback -> Redirect /auth/set-password).
 *   Bestands-User + Login (signInWithPassword) bleiben unangetastet bis Pre-Customer-Live.
 * DEC-282: Score-Threshold 3 (nicht 4) fuer Internal-Test-Mode.
 *
 * R-V812-3 Bundle-Mitigation: zxcvbn (~800KB) wird via dynamic import() geladen,
 *   damit es als Lazy-Chunk und NICHT im Main-Bundle landet.
 *
 * Strategaize-Cross-Repo-Origin-Pattern (BS V8.12 ist Origin, RPT-608):
 *   Wiederverwendung als Vorlage fuer OP/IS/immoscheckheft.
 */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MIN_SCORE = 3;

export interface PasswordStrengthResult {
  /** true, wenn Hard-Floor (Laenge) UND Score-Threshold erfuellt sind */
  ok: boolean;
  /** zxcvbn-Score 0-4. 0, wenn unter Mindestlaenge (dann nicht gemessen). */
  score: number;
  /** Maschinen-lesbare Gruende: "min_length" | "weak_strength". Leer wenn ok. */
  reasons: string[];
}

/**
 * Prueft ein NEU zu setzendes Passwort gegen die Policy.
 * Async, weil zxcvbn lazy via dynamic import() geladen wird (Bundle-Mitigation).
 */
export async function validatePasswordStrength(
  password: string,
): Promise<PasswordStrengthResult> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, score: 0, reasons: ["min_length"] };
  }

  const { default: zxcvbn } = await import("zxcvbn");
  const { score } = zxcvbn(password);

  if (score < PASSWORD_MIN_SCORE) {
    return { ok: false, score, reasons: ["weak_strength"] };
  }

  return { ok: true, score, reasons: [] };
}
