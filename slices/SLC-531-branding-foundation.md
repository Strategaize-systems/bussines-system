# SLC-531 — Branding Foundation

## Meta
- Feature: FEAT-531
- Priority: Blocker
- Status: planned
- Created: 2026-04-26

## Goal

Zentrale Branding-Engine fuer V5.3. Eine `branding_settings`-Tabelle (single-row), ein Supabase Storage Bucket fuer Logos, eine Settings-Page `/settings/branding`, und ein dedizierter HTML-Renderer (`renderBrandedHtml`) als Single-Source-of-Truth fuer Live-Preview und Versand. `send.ts` bekommt einen Renderer-Hook mit Fallback auf `textToHtml` (Backwards Compatibility).

## Scope

- SQL-Migration `023_v53_branding_email_templates.sql` (Teil 1 — Branding):
  - Tabelle `branding_settings` (single-row, RLS authenticated_full_access)
  - Storage Bucket `branding` (Public-Read, Authenticated-Write)
  - Initiale leere Row (UPSERT idempotent)
- TypeScript-Typ `Branding` in `cockpit/src/types/branding.ts`
- Pure Function `renderBrandedHtml(body, branding, vars)` in `cockpit/src/lib/email/render.ts` mit Inline-CSS, Table-Layout, E-Mail-Client-Kompatibilitaet (Gmail/Outlook/Apple Mail)
- Snapshot-Tests fuer Renderer (min. 3 Cases: leeres Branding-Fallback, vollstaendiges Branding, edge-case nur-Logo)
- Server Actions in `cockpit/src/app/(app)/settings/branding/actions.ts`: `getBranding`, `updateBranding`, `uploadLogo` (mit App-Level-Validierung max 2MB + MIME-Types)
- Settings-Page `cockpit/src/app/(app)/settings/branding/page.tsx` + Client-Form `branding-form.tsx`
- Renderer-Hook in `cockpit/src/lib/email/send.ts`: Wenn `branding_settings`-Row vollstaendig leer → `textToHtml` Fallback (heutiges Verhalten), sonst `renderBrandedHtml`
- Manueller Smoke-Test: echte Mail mit Branding an Test-Postfach (Gmail + Outlook), visuelle Pruefung Logo + Farbe + Schrift
- Update `docs/MIGRATIONS.md` (MIG-023 Status auf applied) + `docs/STATE.md` (Slice done)

## Out of Scope

- `email_templates`-Schema-Erweiterung (das ist SLC-532)
- 3-Panel-Composing-Studio (das ist SLC-533/534)
- KI-Vorlagen-Generator (das ist SLC-532)
- Inline-Edit-Diktat (das ist SLC-535)
- Multi-Branding pro User/Tenant (V7+ Topic)
- WYSIWYG-Editor / Block-basierter Builder

## Acceptance Criteria

- AC1: `branding_settings`-Tabelle existiert mit allen 8 Spalten + RLS + initialem Empty-Row
- AC2: Storage Bucket `branding` existiert (Public-Read), Logo-Upload funktioniert via Server Action
- AC3: `/settings/branding` ist erreichbar, persistiert eingegebene Werte, zeigt Preview-Render im Form (optional in MT-5)
- AC4: `renderBrandedHtml(body, null, {})` gibt denselben Output wie `textToHtml(body)` (Backwards Compatibility)
- AC5: `renderBrandedHtml(body, fullBranding, vars)` rendert Logo als `<img>`, Primaerfarbe als Footer-Linie/Buttons, Schriftfamilie als Inline-Style auf `<body>`
- AC6: Snapshot-Tests gruen fuer 3 Cases (`leer`, `voll`, `nur-Logo`)
- AC7: `send.ts` ruft `renderBrandedHtml` wenn Branding gepflegt, sonst `textToHtml` — bestehende Tracking-/DB-Logging-Logik unveraendert
- AC8: Smoke-Test: Mail mit Branding kommt in Gmail UND Outlook visuell korrekt an (Logo sichtbar, Farbe sichtbar, Schrift gesetzt)
- AC9: Mail OHNE Branding-Settings (alle Felder leer) geht weiterhin als Plain-zu-HTML raus — Bit-fuer-Bit identisch zu V5.2-Output (MIG-023 Empty-Row triggert Fallback)
- AC10: Logo-Upload validiert max 2MB und MIME-Types `image/png|jpeg|svg+xml|webp`

## Dependencies

- MIG-023 (eigene Migration, wird in diesem Slice angelegt — Teil 1)
- Bestehender `send.ts`/`tracking.ts` (additive Aenderung, kein Breaking)
- Bestehende Supabase-Storage-Pattern (siehe `documents`, `recordings`)

## Risks

- **Risk:** Email-Client-Render-Drift zwischen Snapshot-Tests und realer Mail.
  Mitigation: Snapshot-Tests sind notwendige, nicht hinreichende Verifikation. AC8 verlangt echten Smoke-Test mit Test-Postfach.
- **Risk:** Storage Bucket Public-Read leakt Logo-URL. Akzeptiert — Logo ist ohnehin in jeder versendeten Mail enthalten, kein Geheimnis.
- **Risk:** Bestehende Mails brechen wenn Renderer-Hook fehlerhaft.
  Mitigation: AC9 verlangt Bit-fuer-Bit-Identitaet im Fallback-Pfad. Snapshot-Test fuer Fallback-Case.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/023_v53_branding_email_templates.sql` | NEU: Tabelle `branding_settings` + Storage Bucket + Empty-Row INSERT |
| `cockpit/src/types/branding.ts` | NEU: TypeScript-Typ `Branding` |
| `cockpit/src/lib/email/render.ts` | NEU: Pure Function `renderBrandedHtml` |
| `cockpit/src/lib/email/render.test.ts` | NEU: Snapshot-Tests (3 Cases) |
| `cockpit/src/app/(app)/settings/branding/page.tsx` | NEU: Server-Page mit Form-Render |
| `cockpit/src/app/(app)/settings/branding/branding-form.tsx` | NEU: Client-Form (Inputs, Logo-Upload, Color-Picker) |
| `cockpit/src/app/(app)/settings/branding/actions.ts` | NEU: Server Actions `getBranding`, `updateBranding`, `uploadLogo` |
| `cockpit/src/lib/email/send.ts` | MODIFY: Renderer-Hook in `sendEmailWithTracking` |
| `docs/MIGRATIONS.md` | MIG-023 Status auf applied |
| `docs/STATE.md` | Slice done, Phase update |
| `slices/INDEX.md` | SLC-531 status `done` |

## QA Focus

- Renderer-Snapshot-Tests gruen (Vitest)
- TypeScript-Build gruen
- Browser-Test: `/settings/branding` Form persistiert + Logo-Upload funktioniert
- Smoke-Test: Mail mit Branding an Gmail + Outlook (echtes Test-Postfach)
- Smoke-Test: Mail ohne Branding identisch zum V5.2-Output (visuelle Vergleich + DB-Eintrag-Vergleich)
- DB-Verifikation: `branding_settings`-Row ist da, `email_templates` unangetastet (das passiert in SLC-532)

## Micro-Tasks

### MT-1: SQL-Migration anlegen (Branding-Teil)
- Goal: Tabelle `branding_settings` + Storage Bucket + Empty-Row erstellen
- Files: `sql/migrations/023_v53_branding_email_templates.sql` (NEU, dieser Teil zuerst)
- Expected behavior: Migration ausfuehrbar idempotent (IF NOT EXISTS, ON CONFLICT). RLS-Policy `authenticated_full_access`. GRANT auf authenticated. Storage Bucket via `storage.buckets`-INSERT mit Public-Read.
- Verification: SQL gegen Hetzner-DB ausgefuehrt (siehe `sql-migration-hetzner.md` Regel: postgres-User, Base64-Transfer); `\d branding_settings` zeigt Spalten; `SELECT * FROM storage.buckets WHERE id='branding'`; `SELECT count(*) FROM branding_settings` = 1
- Dependencies: none

### MT-2: TypeScript-Typ Branding
- Goal: Typ `Branding` als Single-Source-of-Truth fuer alle Lese-/Schreibstellen
- Files: `cockpit/src/types/branding.ts`
- Expected behavior: `type Branding = { id, logoUrl: string|null, primaryColor: string|null, secondaryColor: string|null, fontFamily: 'system'|'inter'|'sans'|'serif'|null, footerMarkdown: string|null, contactBlock: {name, company, phone, web}|null, updatedBy: string|null, updatedAt: string }`
- Verification: TypeScript kompiliert; Typ wird in render.ts und actions.ts importiert
- Dependencies: MT-1

### MT-3: renderBrandedHtml Pure Function + Snapshot-Tests
- Goal: HTML-Renderer mit Inline-CSS, Table-Layout, E-Mail-Client-Kompatibilitaet
- Files: `cockpit/src/lib/email/render.ts`, `cockpit/src/lib/email/render.test.ts`
- Expected behavior: `renderBrandedHtml(body, branding, vars)` gibt `string` zurueck. Variablen-Ersetzung intern (`{{vorname}}` etc.). Wenn `branding === null` ODER alle Branding-Felder leer/null → ruft `textToHtml` aus `tracking.ts` (Fallback). Sonst: vollstaendiges `<!DOCTYPE html>...<table>...</table>...</html>` mit Inline-CSS auf `<body>` (font-family) und in Footer (border-top mit primary_color).
- Verification: Vitest `npm run test` zeigt 3 Snapshot-Tests gruen (`empty-fallback`, `full-branding`, `logo-only`); Snapshots sind in `__snapshots__/` committed
- Dependencies: MT-2

### MT-4: Server Actions (getBranding, updateBranding, uploadLogo)
- Goal: CRUD fuer Branding-Settings + Logo-Upload mit App-Level-Validierung
- Files: `cockpit/src/app/(app)/settings/branding/actions.ts`
- Expected behavior:
  - `getBranding()` → SELECT erste Row aus `branding_settings`, return `Branding | null`
  - `updateBranding(formData)` → UPSERT auf erste Row mit `updated_by=auth.uid()`, `revalidatePath('/settings/branding')`
  - `uploadLogo(file: FormData)` → MIME-Type-Check (`image/png|jpeg|svg+xml|webp`), Size-Check (max 2MB), Pfad `branding/logo-{Date.now()}.{ext}`, alten File loeschen falls existiert, neue Public-URL zurueckgeben
- Verification: Manueller Test via Form (MT-5); SELECT zeigt persistierte Werte; Storage-Bucket zeigt hochgeladenes Logo
- Dependencies: MT-2

### MT-5: /settings/branding Page + Form
- Goal: Settings-Page mit Form fuer Logo-Upload, Farb-Picker, Schrift-Dropdown, Footer-Markdown
- Files: `cockpit/src/app/(app)/settings/branding/page.tsx` (Server), `cockpit/src/app/(app)/settings/branding/branding-form.tsx` (Client)
- Expected behavior:
  - Page laedt aktuelle Branding via `getBranding`, rendert Form mit Defaults
  - Form mit `<input type="file">` fuer Logo, `<input type="color">` fuer Farben, `<select>` fuer Schrift, `<textarea>` fuer Footer-Markdown
  - "Speichern"-Button ruft `updateBranding`, optional Live-Preview-Toggle (kann in einem Mini-Render-Frame innerhalb der Form sein, optional)
- Verification: Browser-Test: Werte persistieren nach Reload; Logo erscheint nach Upload als kleines Preview-Image
- Dependencies: MT-4

### MT-6: send.ts Renderer-Hook (mit Fallback)
- Goal: `sendEmailWithTracking` ruft `renderBrandedHtml` wenn Branding gepflegt, sonst `textToHtml`
- Files: `cockpit/src/lib/email/send.ts`
- Expected behavior:
  - Vor dem Tracking-Inject-Schritt: `const branding = await getBrandingForSend()` (interne Helper, nutzt `createAdminClient`)
  - `let htmlContent = params.html || renderBrandedHtml(params.body, branding, vars)`
  - `vars` aus bestehenden Aufrufer-Kontext (Variablen werden ohnehin im Composing-Studio aufgeloest BEVOR `send.ts` aufgerufen wird — `vars` kann in Phase 1 leeres Objekt sein, Variablen-Resolver wandert in SLC-534)
  - Backwards Compatibility: `params.html` wenn explizit gesetzt, ueberschreibt Renderer (wird heute nirgendwo gesetzt, aber als Sicherheit)
  - Fallback bei leerem Branding: Renderer ruft intern `textToHtml`
- Verification: Bestehende Tests fuer `send.ts` laufen; manueller Smoke: Mail ohne Branding identisch zum V5.2-DB-Eintrag (`textToHtml`-Output)
- Dependencies: MT-3, MT-4

### MT-7: Smoke-Test echte Mail an Test-Postfach
- Goal: Mail mit Branding kommt in Gmail UND Outlook visuell korrekt an
- Files: keine
- Expected behavior:
  1. Branding-Settings einmalig pflegen via `/settings/branding` (Test-Logo, Test-Farbe, Test-Schrift)
  2. Mail aus bestehender `email-sheet.tsx` an Test-Gmail-Postfach senden
  3. Mail an Test-Outlook-Postfach senden
  4. Logo, Farbe, Schrift in beiden Inboxes visuell pruefen
- Verification: Screenshots in QA-Report (RPT) hinterlegt; Mail in Gmail zeigt Logo + Farbe; Mail in Outlook zeigt Logo + Farbe (auch wenn Outlook konservativ rendert)
- Dependencies: MT-6
