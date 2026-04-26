# SLC-533 — Composing-Studio Layout + KI-Vorausfuellung

## Meta
- Feature: FEAT-532 (Teil 1 von 2)
- Priority: High
- Status: planned
- Created: 2026-04-26

## Goal

Vollbild-Seite `/emails/compose` mit 3-Panel-Layout (Vorlagen links / Erfassen mitte / Live-Preview rechts) als Skelett. Mobile-Tabs in derselben Route. Templates-Panel mit Filter (System/Eigene/Alle) und Klick-Anwendung. Compose-Form mit bestehenden KI-Improve-Buttons + Voice-Anhaengen + KI-Vorschlag-Button fuer Empfaenger/Betreff (deterministisch, kein LLM). NewTemplateDialog als Modal-Trigger fuer KI-Generator aus SLC-532. **KEIN Live-Preview-Render in diesem Slice** — das ist SLC-534. **KEIN Send** in diesem Slice — das ist SLC-534.

## Scope

- Route `cockpit/src/app/(app)/emails/compose/page.tsx` (Server-Side):
  - Liest Query-Params `dealId`, `contactId`, `companyId`, `templateId`
  - Laedt parallel: Branding (`getBranding`), Templates (`getEmailTemplates({filter:'all'})`), Deal-Kontext via Join wenn `dealId` gesetzt (Kontakt + Firma + letzte Inbound-Mail)
  - Liefert initiale Werte an Client
- Client-Komponente `cockpit/src/app/(app)/emails/compose/compose-studio.tsx`:
  - 3-Panel-Layout via Tailwind (`hidden md:grid md:grid-cols-[300px_1fr_460px]`) auf Desktop
  - Mobile-Variante: shadcn `Tabs` mit 3 Tabs (Vorlagen / Erfassen / Preview-Placeholder)
  - State: `to`, `subject`, `body`, `templateId`, `language`
- Templates-Panel `templates-panel.tsx`:
  - Filter-Tabs: System / Eigene / Alle
  - Optional Category-Filter (Dropdown)
  - System-Vorlagen mit "System"-Badge, nicht editier-/loeschbar
  - Eigene Vorlagen editier-/loeschbar (Aktionen oeffnen bestehende Edit/Delete-Pfade)
  - Klick auf Vorlage: setzt `subject` + `body` mit Variablen-Replace aus Deal-Kontext
  - "Als Vorlage duplizieren"-Button bei System-Vorlagen
  - "+ Neue Vorlage"-Button → NewTemplateDialog
- Compose-Form `compose-form.tsx`:
  - Felder An, Betreff, Body, Follow-up
  - "KI-Vorschlag An/Betreff"-Button → Server Action `recipientSuggest`
  - Bestehende KI-Improve-Buttons (Korrektur / Formaler / Kuerzen) — wiederverwendet aus `email-compose.tsx`-Logik
  - Bestehender Voice-Recording-Button (anhaengen) — wiederverwendet aus `voice-record-button.tsx`
  - Inline-Edit-Diktat-Button als **Placeholder** (Modal kommt erst in SLC-535 — Button bereits sichtbar mit "Coming in V5.3"-Tooltip oder direkt funktionslos)
- Server Action `recipient-suggest.ts` deterministisch:
  - Input: `dealId`
  - SELECT letzte Inbound-Mail fuer Deal sortiert nach `created_at DESC`
  - Mappe `from_address` auf Contact (via `contacts.email`-Lookup)
  - Fallback: `deals.primary_contact_id`
  - Subject-Vorschlag: Stage-basierte Map (hartkodiert: `discovery → 'Erstansprache'`, `proposal → 'Follow-up Angebot'`, ...)
  - Output: `{to: string, subject: string, contactId: string, contactName: string}`
  - **KEIN Bedrock-Call** (DEC-092)
- NewTemplateDialog `new-template-dialog.tsx`:
  - 2 Tabs: Manuell / KI-Diktat
  - Manuell: Title, Subject, Body, Sprache → `createEmailTemplate`
  - KI-Diktat: Voice-Recording oder Text-Eingabe + Sprach-Dropdown → `generateEmailTemplate` (aus SLC-532) → Editier-Vorschau → User editiert → Speichern via `createEmailTemplate`
- **Live-Preview-Panel-Slot ist im Layout** (rechtes Panel), aber rendert in SLC-533 nur einen Platzhalter ("Live-Preview kommt in SLC-534"). Layout-Stabilitaet vermeidet Re-Layout zwischen Slices.
- Update `docs/STATE.md`, `slices/INDEX.md`

## Out of Scope

- Live-Preview-Render mit `renderBrandedHtml` (das ist SLC-534)
- Send-Action / Senden-Button-Logik (das ist SLC-534)
- Einstiegspunkte umstellen (Deal-Workspace, Mein Tag, Focus → das ist SLC-534)
- Inline-Edit-Diktat-Modal (das ist SLC-535) — Button-Placeholder OK
- Auto-Save-Drafts
- Anhaenge-Upload-UI
- Empfaenger-Multi-Select / BCC

## Acceptance Criteria

- AC1: `/emails/compose` ist erreichbar und rendert auf Desktop 3-Panel-Layout
- AC2: Mobile-Variante (`< md`) zeigt 3 Tabs in derselben Route — alle 3 Bereiche bleiben erreichbar
- AC3: Mit `?dealId=X` wird Deal-Kontext serverseitig geladen, Compose-Form bleibt initial leer (Felder werden via "KI-Vorschlag An/Betreff"-Klick gefuellt)
- AC4: "KI-Vorschlag An/Betreff"-Klick fuellt `to` (mit zuletzt schreibendem Kontakt oder Primary-Contact) und `subject` (Stage-basiert) — kein Bedrock-Call
- AC5: Templates-Panel zeigt System-Vorlagen mit Badge, Filter funktioniert (System/Eigene/Alle)
- AC6: Klick auf Vorlage fuellt `subject` und `body` mit Variablen-Replace (Deal-Kontext: `{{vorname}}`, `{{nachname}}`, `{{firma}}`, `{{position}}`)
- AC7: "+ Neue Vorlage" oeffnet Modal; Manueller Modus speichert Vorlage; KI-Diktat-Modus generiert via `generateEmailTemplate` und zeigt Editier-Vorschau
- AC8: Bestehende KI-Improve-Buttons (Korrektur/Formaler/Kuerzen) funktionieren wie in `email-compose.tsx`
- AC9: Voice-Recording-Button haengt Transkript an Body an (wie heute)
- AC10: "Als Vorlage duplizieren"-Klick auf einer System-Vorlage erstellt eine eigene Kopie sichtbar im "Eigene"-Filter
- AC11: TypeScript-Build gruen, kein Linting-Fehler

## Dependencies

- SLC-531 (Branding-Settings + `getBranding` Server Action) — wird im Server-Loader verwendet, aber kein Render
- SLC-532 (Templates-Filter, KI-Generator, Schema) — Templates-Panel und NewTemplateDialog brauchen diese
- Bestehender Bedrock-Client + Whisper-Adapter
- Bestehende `voice-record-button.tsx` und KI-Improve-Logik aus `email-compose.tsx`

## Risks

- **Risk:** Templates-Panel-Filter triggert Re-Render des gesamten Studios bei jedem Filter-Wechsel.
  Mitigation: Filter-State in Templates-Panel-Komponente lokal halten (kein Re-Render anderer Panels).
- **Risk:** Variablen-Replace bei Vorlagen-Anwendung bricht wenn Deal-Kontext leer.
  Mitigation: Helper `applyPlaceholders` aus `email-compose.tsx` defensiv (leere Werte → Variable bleibt im Text).
- **Risk:** Mobile-Tabs verlieren State bei Tab-Wechsel.
  Mitigation: State liegt im Eltern-Container `compose-studio.tsx`, Tabs rendern nur Inhalte conditionally.
- **Risk:** Recipient-Suggest findet keinen Inbound-Kontakt UND keinen Primary-Contact.
  Mitigation: Server Action gibt `null`-Felder zurueck, UI zeigt Toast "Kein Vorschlag verfuegbar".

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/(app)/emails/compose/page.tsx` | NEU: Server-Page mit Server-Loader |
| `cockpit/src/app/(app)/emails/compose/compose-studio.tsx` | NEU: 3-Panel-Layout-Container + Mobile-Tabs |
| `cockpit/src/app/(app)/emails/compose/templates-panel.tsx` | NEU: Vorlagen-Liste mit Filter |
| `cockpit/src/app/(app)/emails/compose/compose-form.tsx` | NEU: Erfassen-Form mit KI-Improve + Voice + Vorschlag-Button |
| `cockpit/src/app/(app)/emails/compose/recipient-suggest.ts` | NEU: Server Action (deterministisch) |
| `cockpit/src/app/(app)/emails/compose/new-template-dialog.tsx` | NEU: Modal mit 2 Tabs (Manuell / KI-Diktat) |
| `cockpit/src/lib/email/placeholders.ts` | NEU oder MODIFY: Variablen-Replace Helper extrahieren (aus `email-compose.tsx`) |
| `docs/STATE.md` | Slice done |
| `slices/INDEX.md` | SLC-533 status `done` |

## QA Focus

- Browser-Test: `/emails/compose?dealId=X` laedt Deal-Kontext, Form bleibt leer
- Browser-Test: "KI-Vorschlag An/Betreff" fuellt korrekte Werte (manuelle Verifikation gegen DB)
- Browser-Test: Templates-Filter funktioniert (System/Eigene/Alle)
- Browser-Test: Vorlage-Klick wendet Subject + Body an mit Variablen-Replace
- Browser-Test: Mobile-Layout (Browser-DevTools <768px) zeigt Tabs, alle 3 Bereiche erreichbar
- Browser-Test: NewTemplateDialog Manuell + KI-Diktat funktionieren
- Browser-Test: KI-Improve-Buttons + Voice-Recording wie heute (Regression-Check)
- DB-Check: nach "Als Vorlage duplizieren" gibt es eine neue Row mit `is_system=false`
- TypeScript-Build gruen; Vitest gruen (sofern vorhanden)

## Micro-Tasks

### MT-1: Route page.tsx + Server-Loader
- Goal: `/emails/compose` Server-Page mit parallelem Datenladen
- Files: `cockpit/src/app/(app)/emails/compose/page.tsx`
- Expected behavior:
  - `searchParams: { dealId?, contactId?, companyId?, templateId? }`
  - `Promise.all([getBranding(), getEmailTemplates({filter:'all'}), loadDealContext(dealId)])`
  - `loadDealContext(dealId)`: Helper laedt deal + primary_contact + last_inbound_email + company (Join via Supabase)
  - Liefert Initial-Props an `<ComposeStudio ...>` Client-Komponente
- Verification: Browser zeigt `/emails/compose` mit/ohne `?dealId=X` ohne 500-Fehler
- Dependencies: SLC-531 (`getBranding`), SLC-532 (`getEmailTemplates` mit Filter)

### MT-2: 3-Panel-Layout + Mobile-Tabs
- Goal: Layout-Container mit Desktop-Grid und Mobile-Tabs
- Files: `cockpit/src/app/(app)/emails/compose/compose-studio.tsx`
- Expected behavior:
  - Desktop (`md:`): `<div className="md:grid md:grid-cols-[300px_1fr_460px] md:gap-4 hidden">` + 3 Slots
  - Mobile (`< md`): `<Tabs>` mit 3 TabsTrigger und 3 TabsContent (Vorlagen / Erfassen / Preview-Placeholder)
  - State: `to`, `subject`, `body`, `templateId`, `language` (`useState`)
  - State-Reset nicht bei Tab-Wechsel — State liegt im Container
  - Preview-Slot rendert `<div className="text-muted-foreground">Live-Preview kommt in SLC-534</div>` als Platzhalter
- Verification: Browser-DevTools 360px-Width zeigt Tabs; 1280px zeigt Grid
- Dependencies: MT-1

### MT-3: Templates-Panel mit Filter
- Goal: Vorlagen-Liste links mit Filter (System/Eigene/Alle), System-Badge, Klick-Anwendung
- Files: `cockpit/src/app/(app)/emails/compose/templates-panel.tsx`, `cockpit/src/lib/email/placeholders.ts`
- Expected behavior:
  - Props: `templates: EmailTemplate[]`, `dealVars: PlaceholderValues`, `onApply: (subject, body, language) => void`, `onDuplicate: (id) => void`
  - Filter-Buttons: System / Eigene / Alle (Default Alle)
  - Optionaler Category-Dropdown (System-Categories aus DB)
  - System-Vorlagen mit `<Badge>System</Badge>`
  - Klick auf Vorlage: `applyPlaceholders(body, dealVars)` + `applyPlaceholders(subject, dealVars)` + `onApply(...)` → Container-State setzt sich
  - "Als Vorlage duplizieren"-Button neben System-Vorlage → `onDuplicate(id)` triggert `duplicateSystemTemplate`
  - Helper `applyPlaceholders` extrahiert in `cockpit/src/lib/email/placeholders.ts` (geteilt mit SLC-534)
- Verification: Browser-Test: Filter funktioniert; Klick wendet Vorlage an mit Variablen-Replace
- Dependencies: MT-2

### MT-4: Compose-Form mit KI-Improve + Voice + Vorschlag
- Goal: Erfassen-Form mit allen bestehenden Buttons + neuem KI-Vorschlag-Button
- Files: `cockpit/src/app/(app)/emails/compose/compose-form.tsx`
- Expected behavior:
  - Props: `to, subject, body, onChange: ({to?, subject?, body?}) => void`, `dealId?`, `contactLanguage?`, `placeholderValues`
  - Felder: Input `An`, Input `Betreff`, Textarea `Body`, Date-Input `Follow-up`
  - "KI-Vorschlag An/Betreff"-Button (Sparkles-Icon) → `recipientSuggest(dealId)` → Toast bei null-Result, sonst `onChange({to, subject})`
  - Bestehende KI-Improve-Buttons (Korrektur, Formaler, Kuerzen) — Logik aus `email-compose.tsx` Zeilen ~70-130 wiederverwendet
  - Voice-Recording-Button via `<VoiceRecordButton onTranscript={(t) => setBody(b => b + ' ' + t)}>` (heutiges Pattern)
  - Inline-Edit-Diktat-Button als Placeholder mit `disabled` (Tooltip "Coming SLC-535")
- Verification: Browser-Test: alle Buttons funktionieren; KI-Vorschlag fuellt Felder
- Dependencies: MT-2, MT-5

### MT-5: recipient-suggest.ts Server Action (deterministisch)
- Goal: Empfaenger + Subject deterministisch aus Deal-Kontext, KEIN LLM
- Files: `cockpit/src/app/(app)/emails/compose/recipient-suggest.ts`
- Expected behavior:
  - `recipientSuggest(dealId: string)` server action
  - SELECT letzte 10 Mails fuer Deal sortiert `created_at DESC`
  - Erste mit `direction='inbound'` und `from_address` → Lookup `contacts WHERE email = from_address` → Contact-Match
  - Fallback: `SELECT primary_contact_id FROM deals WHERE id = $1` → Primary-Contact laden
  - Subject-Vorschlag: hartkodierte Map `STAGE_TO_SUBJECT` (z.B. `discovery → 'Erstansprache zu deinem Anliegen'`, `proposal → 'Folge-up zu unserem Angebot'`, `closed_won → 'Vielen Dank fuer dein Vertrauen'`, etc.)
  - Return `{to, subject, contactId, contactName} | null`
- Verification: Test mit echtem Deal in DB → korrekter Vorschlag; Deal ohne Inbound + ohne Primary → `null` zurueck
- Dependencies: none

### MT-6: NewTemplateDialog Modal
- Goal: Modal mit 2 Tabs (Manuell / KI-Diktat)
- Files: `cockpit/src/app/(app)/emails/compose/new-template-dialog.tsx`
- Expected behavior:
  - shadcn `<Dialog>` mit zwei `<Tabs>`:
    - **Manuell**: Inputs Title, Subject, Body, Sprache-Select → `createEmailTemplate(formData)`
    - **KI-Diktat**: Sprach-Dropdown + Voice-Button (oder Textarea fuer Text-Prompt) → `generateEmailTemplate(prompt, language)` → Editier-Vorschau (Title/Subject/Body editierbar) → "Speichern"-Button → `createEmailTemplate`
  - Bei Speichern: Modal schliessen + Templates-Panel-Liste refreshen (revalidatePath)
- Verification: Browser-Test: beide Modi funktionieren; Vorlage erscheint im "Eigene"-Filter
- Dependencies: SLC-532 (`generateEmailTemplate`), MT-3

### MT-7: TypeScript + Browser-Smoke-Test
- Goal: Build gruen, alle Browser-Pfade funktional
- Files: keine
- Expected behavior: `npm run build` (TypeScript+Next-Build) gruen; Browser-Test der 11 Acceptance Criteria
- Verification: Build-Log + manuelle AC-Checkliste im QA-Report
- Dependencies: MT-1..MT-6
