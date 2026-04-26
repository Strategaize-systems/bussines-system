# SLC-532 — Email-Templates Schema + Systemvorlagen + KI-Generator

## Meta
- Feature: FEAT-533
- Priority: High
- Status: planned
- Created: 2026-04-26

## Goal

`email_templates`-Schema-Erweiterung um `is_system`, `category`, `language`, `layout` (alle nullable, Backwards Compatibility). 6+ DE-Systemvorlagen + 1-2 EN/NL als Seed-INSERT in MIG-023. Server-side KI-Vorlagen-Generator (`email-template-generate.ts`) mit Bedrock + JSON-Output, Voice-Input via bestehendem Whisper-Adapter. `template-actions.ts` erweitert um Filter-Funktionalitaet und `duplicateSystemTemplate`.

## Scope

- SQL-Migration `023_v53_branding_email_templates.sql` (Teil 2 — Templates):
  - ALTER TABLE `email_templates` + 4 nullable Spalten (`is_system`, `category`, `language`, `layout`)
  - 2 Indizes auf `is_system` und `category`
  - Seed-INSERT 6 DE-Systemvorlagen (Erstansprache Multiplikator, Erstansprache Lead, Follow-up Erstgespraech, Follow-up Angebot, Danke nach Termin, Re-Aktivierung) + 1-2 EN/NL (Cold Outreach EN, Eerste contact NL)
  - Konkrete Body-Texte werden hier ausformuliert (Bezug auf B2B-Vertrieb, neutral, mit Variablen)
- TypeScript-Typ-Updates in `cockpit/src/app/(app)/settings/template-actions.ts` (`EmailTemplate`-Type erweitert um `is_system`, `category`, `language`, `layout`)
- Erweiterung `template-actions.ts`:
  - `getEmailTemplates({filter?: 'system'|'own'|'all', category?})` mit Filter
  - Neue Action `duplicateSystemTemplate(id)`: erstellt Kopie mit `is_system=false`, Title-Suffix " (Kopie)"
  - Bestehende `createEmailTemplate` und `updateEmailTemplate` akzeptieren `is_system`, `category`, `language` (Defaults beibehalten)
  - `deleteEmailTemplate` rejected wenn `is_system=true` (App-Level-Guard)
- KI-Prompt `cockpit/src/lib/ai/prompts/email-template-generate.ts` analog `email-improve.ts`:
  - System-Prompt: produziert JSON `{title, subject, body, suggestedCategory}`
  - Categories: `erstansprache | follow-up | nach-termin | angebot | danke | reaktivierung | sonstige`
  - Sprache aus User-Prompt geraten (default `de`)
- Server Action `generateEmailTemplate(prompt, language)` in `cockpit/src/app/(app)/emails/compose/template-generate-action.ts` (Modul-Pfad fuer den Composing-Studio-Slice — wird hier vorbereitet, im SLC-533 verwendet)
- Update `docs/MIGRATIONS.md` (MIG-023 Teil 2 dokumentiert) + `docs/STATE.md`

## Out of Scope

- Composing-Studio-UI (das ist SLC-533/534 — der Generator wird dort verwendet, aber UI dort)
- Inline-Edit-Diktat (das ist SLC-535)
- Branding-Settings (das ist SLC-531)
- Multi-Language-KI-Generierung in einem Schritt (V5.3: 1 Sprache pro Generierung)
- Block-basiertes Layout (`layout` bleibt in V5.3 ungenutzt)
- Vorlagen-Versionierung
- Vorlagen-Sharing zwischen Users (V7+)

## Acceptance Criteria

- AC1: `email_templates` hat 4 neue Spalten (`is_system`, `category`, `language`, `layout`) — bestehende Rows unveraendert (`is_system=false`, `category=null`, `language='de'`, `layout=null`)
- AC2: Mindestens 6 Systemvorlagen sind nach Migration in der DB (`SELECT count(*) FROM email_templates WHERE is_system=true` >= 6)
- AC3: 1-2 EN/NL Systemvorlagen vorhanden
- AC4: 2 Indizes auf `is_system` und `category` existieren
- AC5: `getEmailTemplates({filter: 'system'})` gibt nur System-Vorlagen zurueck; `'own'` nur eigene; `'all'` beide
- AC6: `duplicateSystemTemplate(id)` erstellt eine Kopie mit `is_system=false` und Title `"... (Kopie)"`
- AC7: `deleteEmailTemplate(id)` schlaegt fehl mit klarer Fehlermeldung wenn `is_system=true`
- AC8: KI-Prompt `email-template-generate.ts` produziert valides JSON mit allen 4 Feldern (`title`, `subject`, `body`, `suggestedCategory`) bei min. 3 Test-Prompts
- AC9: Server Action `generateEmailTemplate(prompt, language)` ruft Bedrock und gibt parsed JSON zurueck
- AC10: TypeScript-Build gruen, alle Lesepfade defensiv mit `language || 'de'`

## Dependencies

- MIG-023 Teil 1 (Branding) muss nicht vorher applied sein — die beiden Migrations-Teile sind unabhaengig, koennen aber in einer Migration-Datei kombiniert werden (DEC-091)
- Bestehender Bedrock-Client (`cockpit/src/lib/ai/bedrock-client.ts`)
- Bestehender Whisper-Adapter (V5.2 `transcription/openai.ts` default)

## Risks

- **Risk:** KI-generierte Vorlagen produzieren generische Texte ohne Personalisierung.
  Mitigation: System-Prompt verlangt Branchen-/Beziehungstyp-Hinweis im User-Input. 3 Test-Prompts in QA dokumentiert.
- **Risk:** Sprache wird falsch geraten (User schreibt "erstelle mir...", KI antwortet auf EN).
  Mitigation: Server Action akzeptiert expliziten `language`-Parameter; UI in SLC-533 setzt diesen.
- **Risk:** Seed-Migration mit langen Body-Texten wird unleserlich.
  Mitigation: Body-Texte als Heredoc in SQL (`$$...$$`) — gut lesbar, auch bei Newlines.
- **Risk:** Bestehende Vorlagen ohne `language` produzieren `null`-Bugs.
  Mitigation: Migration setzt Default `'de'` + alle Lesepfade defensiv mit `language || 'de'`.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/023_v53_branding_email_templates.sql` | EXTEND: ALTER TABLE + 4 Spalten + 2 Indizes + 6+ Seed-INSERT |
| `cockpit/src/app/(app)/settings/template-actions.ts` | MODIFY: Type erweitert, Filter, `duplicateSystemTemplate`, `is_system`-Guard in delete |
| `cockpit/src/lib/ai/prompts/email-template-generate.ts` | NEU: KI-Prompt fuer Vorlagen-Generierung |
| `cockpit/src/app/(app)/emails/compose/template-generate-action.ts` | NEU: Server Action `generateEmailTemplate` |
| `docs/MIGRATIONS.md` | MIG-023 Status auf applied (Teil 2) |
| `docs/STATE.md` | Slice done |
| `slices/INDEX.md` | SLC-532 status `done` |

## QA Focus

- DB: `SELECT count(*) FROM email_templates WHERE is_system=true` >= 6
- DB: 2 Indizes vorhanden (`\d email_templates`)
- TypeScript-Build gruen
- Vitest fuer template-actions (mind. Filter-Logik)
- Manueller Smoke-Test: KI-Prompt mit 3 verschiedenen Eingaben (Multiplikator-Erstansprache, Follow-up Angebot kalt, Danke nach Termin) → 3 plausible JSON-Outputs
- Manueller Smoke-Test: `duplicateSystemTemplate` produziert eigene Kopie sichtbar in `getEmailTemplates({filter: 'own'})`

## Micro-Tasks

### MT-1: SQL-Migration ALTER + Indizes
- Goal: 4 nullable Spalten + 2 Indizes auf `email_templates` ergaenzen
- Files: `sql/migrations/023_v53_branding_email_templates.sql` (EXTEND)
- Expected behavior: `ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false; ...` plus `CREATE INDEX IF NOT EXISTS idx_email_templates_is_system ON email_templates(is_system); ...`
- Verification: `\d email_templates` zeigt 4 neue Spalten + 2 Indizes
- Dependencies: none

### MT-2: SQL-Seed Systemvorlagen (6 DE + 1-2 EN/NL)
- Goal: Min. 6 deutsche + 1-2 EN/NL Systemvorlagen mit konkreten Body-Texten
- Files: `sql/migrations/023_v53_branding_email_templates.sql` (EXTEND)
- Expected behavior:
  - `INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders) VALUES (...) ON CONFLICT DO NOTHING;` (idempotent)
  - 6 DE-Vorlagen: Erstansprache-Multiplikator, Erstansprache-Lead, Follow-up Erstgespraech, Follow-up Angebot, Danke nach Termin, Re-Aktivierung kalter Lead
  - 1-2 EN/NL-Vorlagen: "Cold Outreach (EN)", "Eerste contact (NL)"
  - Body-Texte mit B2B-Vertriebs-Tonalitaet, Variablen `{{vorname}} {{nachname}}`, `{{firma}}`, `{{position}}`
  - placeholders-Spalte mit `'["{{vorname}}", "{{nachname}}", "{{firma}}", ...]'::jsonb`
- Verification: `SELECT count(*) FROM email_templates WHERE is_system=true GROUP BY language` zeigt mindestens DE >= 6 und EN+NL >= 1
- Dependencies: MT-1

### MT-3: TypeScript-Type Erweiterung + Filter in getEmailTemplates
- Goal: `EmailTemplate`-Type um neue Felder erweitern; `getEmailTemplates` mit Filter-Parameter
- Files: `cockpit/src/app/(app)/settings/template-actions.ts`
- Expected behavior:
  - Type-Felder: `is_system: boolean`, `category: string | null`, `language: string | null`, `layout: any | null`
  - `getEmailTemplates(opts?: { filter?: 'system'|'own'|'all'; category?: string })` ergaenzen
  - Default `filter='all'`
  - SQL: `.eq('is_system', filter === 'system' ? true : false)` wenn `filter !== 'all'`
- Verification: TypeScript-Build gruen; manueller Aufruf via Test-Page zeigt korrekte Filterung
- Dependencies: MT-1

### MT-4: duplicateSystemTemplate + delete-Guard
- Goal: Kopier-Funktion fuer Systemvorlagen + Schutz vor Loeschen
- Files: `cockpit/src/app/(app)/settings/template-actions.ts`
- Expected behavior:
  - `duplicateSystemTemplate(id)`: SELECT Quelle, INSERT mit `is_system=false` + Title-Suffix ` (Kopie)`, gleicher Body/Subject/Category/Language
  - `deleteEmailTemplate(id)`: vor DELETE pruefen `SELECT is_system FROM email_templates WHERE id=$1`; wenn `is_system=true` return `{ error: 'Systemvorlagen koennen nicht geloescht werden' }`
- Verification: Manueller Test: System-Vorlage duplizieren erzeugt eigene Kopie; Delete einer System-Vorlage gibt Fehler zurueck
- Dependencies: MT-3

### MT-5: KI-Prompt email-template-generate.ts
- Goal: System-Prompt + JSON-Schema fuer Vorlagen-Generierung
- Files: `cockpit/src/lib/ai/prompts/email-template-generate.ts`
- Expected behavior:
  - Export `EMAIL_TEMPLATE_GENERATE_SYSTEM_PROMPT`: System-Prompt (Deutsch) verlangt JSON `{title, subject, body, suggestedCategory}`
  - Categories: `erstansprache | follow-up | nach-termin | angebot | danke | reaktivierung | sonstige`
  - Export `buildEmailTemplateGeneratePrompt(context: { userPrompt: string; language: 'de'|'en'|'nl' })` baut User-Prompt mit Sprache-Hinweis
  - Constraint im System-Prompt: "Verwende Variablen `{{vorname}}`, `{{nachname}}`, `{{firma}}` wo sinnvoll. Erfinde keine Fakten."
- Verification: 3 Test-Prompts in Smoke-Test (siehe MT-7)
- Dependencies: none

### MT-6: Server Action generateEmailTemplate
- Goal: Server Action ruft Bedrock und gibt geparsed JSON zurueck
- Files: `cockpit/src/app/(app)/emails/compose/template-generate-action.ts`
- Expected behavior:
  - `generateEmailTemplate(userPrompt: string, language: 'de'|'en'|'nl' = 'de')` server action
  - Ruft Bedrock-Client mit Prompt aus MT-5
  - Parse JSON-Response mit Validation (alle 4 Felder vorhanden, `suggestedCategory` aus erlaubter Menge)
  - Bei Parse-Fehler: return `{ error: 'KI-Antwort nicht parsebar' }`
  - Audit-Log analog `email-improve` (Provider, Region, Model-ID)
  - DEC-052: kein Auto-Call, nur on-click vom UI in SLC-533
- Verification: 3 Test-Prompts → 3 plausible JSON-Outputs (siehe MT-7)
- Dependencies: MT-5

### MT-7: Smoke-Test 3 Test-Prompts
- Goal: KI-Prompt produziert plausible Outputs fuer 3 verschiedene Vertriebs-Szenarien
- Files: keine (manueller Test, dokumentiert im QA-Report)
- Expected behavior: Aufruf `generateEmailTemplate(...)` mit:
  1. "Erstansprache fuer Steuerberater im Mittelstand mit Verweis auf Co-Innovation"
  2. "Follow-up nach 3 Wochen ohne Antwort auf ein Angebot"
  3. "Danke nach erfolgreichem Erstgespraech mit naechstem Schritt"
- Verification: 3 JSON-Outputs in QA-Report dokumentiert; alle haben `title`/`subject`/`body`/`suggestedCategory`; `body` enthaelt mindestens eine Variable; keine erfundenen Fakten
- Dependencies: MT-6
