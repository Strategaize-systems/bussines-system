# SLC-523 — Compliance-Templates Vertical Slice (DB + Backend + Frontend)

## Meta
- Feature: FEAT-523
- Priority: High
- Status: planned
- Created: 2026-04-25

## Goal

Drei Einwilligungstext-Templates (Meeting-Einladung, E-Mail-Footer, Cal.com-Buchungsbestaetigung) werden in einer eigenen Tabelle (`compliance_templates`, MIG-022) persistiert. Eine Settings-Page `/settings/compliance` zeigt 3 Bloecke mit Edit-Form, Variable-Helper, Copy-to-Clipboard und Reset-to-Default. Variablen werden ueber eine Mini-Engine (DEC-084) ersetzt — unbekannte Tokens bleiben sichtbar. Kein Auto-Anhaengen an externe Workflows.

## Scope

- **DB:** MIG-022 anlegen — Tabelle `compliance_templates` mit `template_key` PK, `body_markdown`, `default_body_markdown`, `updated_by`, `updated_at`. RLS analog `user_settings`. 3 Default-Rows als idempotenter INSERT.
- **Lib:** `cockpit/src/lib/compliance/consent-templates.ts` mit Default-Markdown-Bodies fuer 3 Template-Keys
- **Lib:** `cockpit/src/lib/compliance/variables.ts` Mini-Engine `applyTemplateVariables(template, vars)` mit Regex-Replace; unbekannte Tokens bleiben sichtbar
- **Lib:** `cockpit/src/lib/compliance/tokens.ts` Token-Definitions-Liste + UI-Helper-Doku (`user_name`, `user_email`, `firma`, `kontakt_name`, `kontakt_email`, `kontakt_firma`)
- **Server:** Server Actions `getComplianceTemplate`, `getAllComplianceTemplates`, `updateComplianceTemplate`, `resetComplianceTemplate` in `cockpit/src/app/(app)/settings/compliance/actions.ts`
- **UI:** `/settings/compliance/page.tsx` mit 3 ComplianceTemplateBlock-Instanzen
- **UI:** `cockpit/src/components/settings/ComplianceTemplateBlock.tsx` — Edit-Form (textarea), Variable-Helper (Token-Liste), Copy-to-Clipboard-Button, Reset-to-Default-Button, "Speichern"-Button
- **UI:** Hinweis-Block oben auf der Page: "Diese Texte sind pragmatische Standardvorlagen. Vor produktivem Einsatz anwaltlich pruefen."
- **Settings-Navigation:** Eintrag/Link auf `/settings/compliance` in der bestehenden Settings-Page
- Unit-Tests fuer `applyTemplateVariables` (Erfolgsfall, unbekannter Token, leerer Input)

## Out of Scope

- Auto-Anhaengen der Templates an Cal.com-Buchungsworkflow oder E-Mail-Versand
- Versionsgeschichte fuer Template-Aenderungen
- Audit-Log fuer Template-Edits (separates Feature)
- WYSIWYG-Editor (reine Markdown-Textarea genuegt)
- Live-Markdown-Preview (Copy verwendet den rohen Markdown — User kann es im Ziel pasten)
- Multi-User Templates (V7)

## Acceptance Criteria

- AC1: MIG-022 ist im Repo unter `sql/migrations/022_v52_compliance_templates.sql`, idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- AC2: Tabelle `compliance_templates` existiert nach Migration mit 3 Default-Rows
- AC3: RLS-Policy `authenticated_full_access` ist aktiv
- AC4: `applyTemplateVariables("Hi {user_name}", {user_name: "Immo"})` liefert `"Hi Immo"`; unbekannte Tokens bleiben sichtbar (z.B. `{firma}` bleibt stehen)
- AC5: `/settings/compliance` ist erreichbar und zeigt 3 Bloecke mit Default-Inhalten beim ersten Aufruf
- AC6: Edit + Speichern persistiert in `compliance_templates.body_markdown`; `updated_by` = aktuelle User-ID; `updated_at` = jetzt
- AC7: Copy-to-Clipboard kopiert den rohen Markdown-Text mit eingesetzten Variablen (User-Vars aus Profile + leere Kontakt-Vars als Platzhalter)
- AC8: Reset-to-Default setzt `body_markdown` zurueck auf `default_body_markdown`; UI re-rendert
- AC9: Variable-Helper-Block zeigt Liste verfuegbarer Tokens mit Beispiel-Wert
- AC10: Anwalts-Hinweis-Block ist sichtbar oben auf der Page
- AC11: Settings-Hauptseite enthaelt Link "Einwilligungstexte" (oder aehnlich) auf `/settings/compliance`
- AC12: Unit-Tests fuer `applyTemplateVariables` laufen gruen (3 Faelle)

## Dependencies

- MIG-022 muss vor Backend-Server-Actions laufen (interne Slice-Abhaengigkeit)
- Profile-Tabelle existiert (für `updated_by` FK) — bereits vorhanden seit V1
- Kein anderer V5.2-Slice

## Risks

- **Risk:** Default-Markdown-Texte sind juristisch unverbindlich. User koennte sie produktiv nutzen ohne Pruefung. 
  Mitigation: Sichtbarer Hinweis-Block auf der Page; Hinweis auch im Skill-Output (Memory).
- **Risk:** Migration-File wird auf Hetzner manuell ausgefuehrt (Pattern aus `sql-migration-hetzner.md` Rule). Bei Fehler in der Migration koennten 3 Default-Rows fehlen. 
  Mitigation: Migration ist idempotent, nochmal ausfuehrbar; `ON CONFLICT DO NOTHING` sorgt fuer keine Duplicate-Errors.
- **Risk:** `compliance_templates` ohne `tenant_id` ist Single-Tenant — bei spaeterer Multi-User-Erweiterung (V7) muss Schema erweitert werden. 
  Mitigation: Erweiterung ist additiv (ALTER TABLE ADD COLUMN); akzeptabel fuer V5.2.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/022_v52_compliance_templates.sql` (neu) | MIG-022 — Tabelle + Default-Rows + RLS + Grants |
| `cockpit/src/lib/compliance/consent-templates.ts` (neu) | Default-Markdown-Bodies fuer 3 Templates |
| `cockpit/src/lib/compliance/variables.ts` (neu) | Mini-Engine `applyTemplateVariables` |
| `cockpit/src/lib/compliance/tokens.ts` (neu) | Token-Liste + UI-Helper-Daten |
| `cockpit/src/lib/compliance/variables.test.ts` (neu) | Unit-Tests |
| `cockpit/src/app/(app)/settings/compliance/actions.ts` (neu) | Server Actions get/update/reset |
| `cockpit/src/app/(app)/settings/compliance/page.tsx` (neu) | Settings-Page mit 3 Bloecken + Anwalts-Hinweis |
| `cockpit/src/components/settings/ComplianceTemplateBlock.tsx` (neu) | Edit-Form + Helpers |
| `cockpit/src/app/(app)/settings/page.tsx` | Link auf `/settings/compliance` ergaenzen |

## QA Focus

- Migration laeuft idempotent (zweiter Aufruf wirft keine Fehler)
- 3 Default-Rows sind nach Migration vorhanden
- Edit + Speichern + Reload zeigt persistierte Aenderung
- Copy-to-Clipboard funktioniert in Chrome (manueller Test)
- Reset-Button setzt Body korrekt zurueck
- Settings-Hauptseite zeigt Link
- Anwalts-Hinweis sichtbar
- TypeScript + Lint gruen
- `npm run test` gruen
- RLS-Verifikation: nicht-authentifizierter Request bekommt keine Daten

## Micro-Tasks

### MT-1: MIG-022 SQL-Datei
- Goal: Migration mit Tabelle, RLS, Grants, 3 Default-Rows
- Files: `sql/migrations/022_v52_compliance_templates.sql`
- Expected behavior: Idempotente Migration mit `IF NOT EXISTS` und `ON CONFLICT DO NOTHING`. Default-Rows haben Body = Default-Body.
- Verification: SQL-Linter; lokaler PostgreSQL-Trockenlauf nicht moeglich (siehe sql-migration-hetzner.md Regel — Migration laeuft auf Hetzner)
- Dependencies: none

### MT-2: Default-Markdown-Bodies + Token-Liste
- Goal: Default-Texte fuer 3 Templates + Token-Definition
- Files: `cockpit/src/lib/compliance/consent-templates.ts`, `cockpit/src/lib/compliance/tokens.ts`
- Expected behavior: 3 Markdown-Bodies (10-30 Zeilen je) mit DSGVO-konformen Standardtexten + Token-Platzhaltern. `tokens.ts` exportiert Liste mit Name + Beschreibung + Beispiel-Wert
- Verification: TypeScript kompiliert; manueller Review der Texte (User-OK fuer V5.2-Default-Qualitaet)
- Dependencies: none

### MT-3: Variablen-Engine + Tests
- Goal: `applyTemplateVariables(template, vars)` Mini-Implementation + 3 Unit-Tests
- Files: `cockpit/src/lib/compliance/variables.ts`, `cockpit/src/lib/compliance/variables.test.ts`
- Expected behavior: Regex-Replace `/\{(\w+)\}/g`; unbekannte Tokens bleiben sichtbar. Tests fuer Erfolgsfall, unbekannter Token, leerer Input.
- Verification: `npm run test` gruen
- Dependencies: none

### MT-4: Server Actions
- Goal: 4 Server Actions in `actions.ts`
- Files: `cockpit/src/app/(app)/settings/compliance/actions.ts`
- Expected behavior: `getComplianceTemplate(key)`, `getAllComplianceTemplates()`, `updateComplianceTemplate(key, body)`, `resetComplianceTemplate(key)` mit Auth-Check und Supabase-Calls
- Verification: TypeScript kompiliert; manueller Test ueber UI (MT-6) bestaetigt Funktionalitaet
- Dependencies: MT-1 (Tabelle existiert), MT-2 (Defaults verfuegbar)

### MT-5: ComplianceTemplateBlock-Komponente
- Goal: Wiederverwendbarer Block mit Edit-Form, Variable-Helper, Copy, Reset, Save
- Files: `cockpit/src/components/settings/ComplianceTemplateBlock.tsx`
- Expected behavior: Props (template_key, currentBody, defaultBody, onSave, onReset, onCopy). Textarea fuer Markdown-Edit. Liste verfuegbarer Tokens. 3 Buttons.
- Verification: TypeScript kompiliert; visuell in Settings-Page (MT-6)
- Dependencies: MT-3 (Variablen-Engine fuer Copy-Vorschau)

### MT-6: Settings-Page + Navigation-Link
- Goal: `/settings/compliance` Page mit 3 Bloecken + Anwalts-Hinweis + Settings-Link
- Files: `cockpit/src/app/(app)/settings/compliance/page.tsx`, `cockpit/src/app/(app)/settings/page.tsx`
- Expected behavior: Page laedt Templates ueber Server Action, rendert 3 Bloecke. Settings-Hauptseite hat Link-Karte "Einwilligungstexte" auf `/settings/compliance`. Anwalts-Hinweis in einer rounded-xl border-Karte oben.
- Verification: Browser-Test: Page laedt; Edit+Speichern+Reload zeigt persistierten Inhalt; Reset funktioniert; Copy schreibt in Clipboard; Settings-Link ist sichtbar
- Dependencies: MT-4, MT-5

### MT-7: Migration auf Hetzner ausfuehren (User-Aktion)
- Goal: MIG-022 auf Production-DB anwenden via Pattern aus `sql-migration-hetzner.md`
- Files: keine (Server-Aktion)
- Expected behavior: Migration laeuft via Base64 + `psql -U postgres`, Tabelle existiert mit 3 Rows
- Verification: `\dt compliance_templates` zeigt Tabelle; `SELECT count(*) FROM compliance_templates` = 3
- Dependencies: MT-1
