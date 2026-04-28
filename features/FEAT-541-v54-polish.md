# FEAT-541 — V5.4-Polish (Composing-Studio + Hygiene)

## Summary
V5.3-Composing-Studio-Stack auf "polished + hygienisch" heben. Color-Picker AC9-Drift-Fix (ISSUE-043), ESLint-Hook-Order-Cleanup, COMPLIANCE.md V5.3-Update, Coolify-Cron-Cleanup als User-Aktion mit Doku.

## Problem
Vier Themen liegen nach V5.3-Release offen:
1. **ISSUE-043 Color-Picker AC9-Drift:** `<input type="color">` submitted immer einen gueltigen Hex-Wert. Sobald User auf `/settings/branding` einmal "Speichern" klickt, persistiert ein Color-Wert ungeplant — Branding-Renderer kickt ein, AC9 ("Mail ohne Branding bit-fuer-bit identisch zu V5.2") gilt nur noch im Initial-State.
2. **ESLint Hook-Order:** React-19-Strict-Mode-Hinweise in `new-template-dialog.tsx` und `inline-edit-dialog.tsx` — Hooks nicht unconditional am Top-Level.
3. **COMPLIANCE.md V5.3-Section fehlt:** Composing-Studio + Inline-Edit + Branding sind nicht in der Compliance-Doku — Pre-Pflicht vor Anwalts-Pruefung.
4. **Coolify Cron-Cleanup (BL-396):** Cron-Duplikate (`Classify` vs `classify-emails`, `embedding-sync` x2, `retention` vs `recording-retention`), ein kaputter Cron mit literalem Placeholder `CRON_SECRET_VALUE`, Klartext-Secrets statt `process.env.CRON_SECRET`-Pattern.

## Solution
**Color-Picker (Code-Aenderung):**
- Auf `/settings/branding` vor jedem Color-Picker (primary + secondary) eine Toggle-Checkbox "Markenfarbe verwenden".
- Toggle aus → Color-Picker disabled, persistierter Wert NULL.
- Toggle an → Color-Picker aktiv, persistierter Wert = Hex.
- Initial-Toggle-State: leitet sich aus DB-Wert ab (NULL = aus, Hex = an).
- Komponente: `ConditionalColorPicker` als wiederverwendbares Pattern.

**ESLint Hook-Order (Code-Refactor):**
- `cockpit/src/components/email/new-template-dialog.tsx` und `cockpit/src/components/email/inline-edit-dialog.tsx`.
- Alle Hooks unconditional am Komponent-Top-Level vor jedem `if`/`return` platzieren.
- Keine Funktional-Aenderung erwartet — Smoke-Test der zwei Dialoge.

**COMPLIANCE.md (Doku):**
- Sektion "V5.3 — E-Mail Composing Studio" mit:
  - Welche personenbezogenen Daten gehen an Bedrock (System-Prompt + Body-Text + Inline-Edit-Transkript)
  - Welche Daten in Storage (`branding`-Bucket: Logo)
  - Retention-Verhalten von Branding-Settings (persistiert bis User loescht)
  - Inline-Edit-Diktat: Whisper-Provider (openai-default V5.2), keine Zwischenspeicherung

**Coolify-Cron-Cleanup (User-Aktion mit Doku):**
- Klick-Anleitung in `/docs/RELEASES.md` REL-019-Notes:
  - (a) Konsolidieren: `Classify` vs `classify-emails` → behalten `classify-emails`, loeschen `Classify`
  - (b) Konsolidieren: zwei `embedding-sync` (5min + 15min) → behalten 15min, loeschen 5min
  - (c) Konsolidieren: `retention` (V4.1 Whisper) vs `recording-retention` (V5.2) → pruefen ob V4.1-Endpoint noch lebt; wenn nicht, loeschen
  - (d) Reparieren oder loeschen: Cron mit literalem `CRON_SECRET_VALUE` als x-cron-secret (verifizieren via Cron-Logs)
  - (e) 3 Crons mit Klartext-CRON_SECRET im Command auf `process.env.CRON_SECRET`-Pattern umstellen (`imap-sync`, `retention`, `embedding-sync`-alt)

## Acceptance Criteria
- AC1: Auf `/settings/branding` ist vor jedem Color-Picker (primary + secondary) ein Toggle "Markenfarbe verwenden" sichtbar.
- AC2: Toggle aus → Color-Picker visuell disabled, beim Speichern wird `primary_color`/`secondary_color` als NULL persistiert.
- AC3: Toggle an → Color-Picker aktiv, beim Speichern wird der gewaehlte Hex-Wert persistiert.
- AC4: Initial-Render leitet Toggle-State korrekt aus DB-Wert ab (NULL = aus, Hex = an).
- AC5: Bestehende Branding-Eintraege ohne explizites Speichern bleiben unveraendert (kein automatisches NULL-Setzen bei Migration).
- AC6: AC9 aus FEAT-531 ist wieder zuverlaessig erfuellt: Mail ohne aktivierte Branding-Farben geht bit-fuer-bit wie V5.2 raus, unabhaengig davon ob der User die Settings-Page besucht hat.
- AC7: ESLint-Build-Output zeigt keine React-Hook-Order-Warnings mehr in `new-template-dialog.tsx` und `inline-edit-dialog.tsx`.
- AC8: `docs/COMPLIANCE.md` enthaelt einen V5.3-Abschnitt mit den 3 Features (Branding, Composing-Studio, Inline-Edit) und nennt die jeweiligen Datenfluesse.
- AC9: REL-019-Eintrag in `/docs/RELEASES.md` enthaelt die Coolify-Cron-Cleanup-User-Anleitung als Sektion.

## Out of Scope
- Reset-Button "Alle Branding-Werte loeschen" auf der Settings-Page (Toggle reicht — Reset-Button waere alternative Loesung)
- Datenmigration bestehender Branding-Eintraege auf Toggle-Aus (User-Erwartung: was da ist, ist aktiv)
- ESLint-Cleanup ueber die zwei Ziel-Dateien hinaus (V5.4-Scope, andere Lint-Hinweise bleiben offen)
- COMPLIANCE.md-Anwalts-Pruefung — V5.4 schreibt nur den Doku-Stand, Anwalts-Review bleibt Pre-Recording-Pflicht
- Automatisierter Coolify-Cron-Cleanup via API — User-Aktion via Doku reicht (BL-396 ist Operations-Hygiene, kein Code)

## Dependencies
- FEAT-531 (Branding-Settings-Page existiert)
- FEAT-533 (`new-template-dialog.tsx` existiert)
- FEAT-534 (`inline-edit-dialog.tsx` existiert)
- `/docs/COMPLIANCE.md` aus V5.2 (FEAT-525)
- Coolify-UI-Zugang fuer User-Aktion (BL-396)
