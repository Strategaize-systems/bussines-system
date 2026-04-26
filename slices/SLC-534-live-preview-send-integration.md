# SLC-534 — Live-Preview + Send-Integration + Einstiegspunkte

## Meta
- Feature: FEAT-532 (Teil 2 von 2)
- Priority: High
- Status: planned
- Created: 2026-04-26

## Goal

Live-Preview-Panel mit Debounce-250ms-Render via `renderBrandedHtml` (DEC-095 Single-Source-of-Truth). Send-Action `sendComposedEmail` ruft Renderer + bestehendes `sendEmailWithTracking`. Variablen-Resolver mit Deal-Kontext im Composing-Pfad. Einstiegspunkte aus Deal-Workspace, Mein Tag und Focus auf neue Route umgestellt.

## Scope

- Live-Preview-Komponente `cockpit/src/app/(app)/emails/compose/live-preview.tsx`:
  - Props: `body`, `subject`, `to`, `branding`, `vars`
  - Debounce 250ms (`useDebouncedValue` Hook oder `lodash-es/debounce`)
  - Rendert `renderBrandedHtml(body, branding, vars)` in `<iframe srcDoc={...}>` fuer korrekte CSS-Isolation
  - Empfaenger-Header sichtbar (`An: ...`, `Betreff: ...`, `Von: <SMTP_FROM_EMAIL>`)
  - Loading-State (Skeleton) bei initialem Render
- Variablen-Resolver `cockpit/src/lib/email/variables.ts`:
  - `resolveVarsFromDeal(deal, contact, company)` → `{vorname, nachname, firma, position, deal: stage|name}`
  - Wird im Server-Loader (SLC-533 page.tsx) und im Send-Pfad genutzt
  - Heute existiert `applyPlaceholders` in `email-compose.tsx` — wird in SLC-533 in `placeholders.ts` extrahiert; dieser Slice ergaenzt den Resolver fuer Deal-Kontext
- Send-Action `cockpit/src/app/(app)/emails/compose/send-action.ts`:
  - `sendComposedEmail({to, subject, body, dealId, contactId, companyId, templateId, followUpDate})` server action
  - Laedt Branding + Deal-Vars
  - `const html = renderBrandedHtml(body, branding, vars)`
  - Ruft `sendEmailWithTracking({to, subject, body, html, contactId, companyId, dealId, followUpDate, templateUsed: templateId, trackingEnabled: true})`
  - Returns `{success, emailId, trackingId, error?}`
- "Senden"-Button im Compose-Form (SLC-533 hat keinen Send-Button — der wird hier ergaenzt): unten in Compose-Form oder im Layout-Footer
- Einstiegspunkte umstellen:
  - Deal-Workspace `[dealId]/page.tsx` (oder die zustaendige Komponente) "E-Mail schreiben"-Button → `/emails/compose?dealId=...&contactId=primary`
  - Mein Tag E-Mail-Schnellaktion → `/emails/compose?contactId=...`
  - Focus E-Mail-Aktion → `/emails/compose?contactId=...`
  - Sidebar "E-Mail" bleibt unveraendert → fuehrt auf `/emails`
- Update `docs/STATE.md`, `slices/INDEX.md`

## Out of Scope

- Inline-Edit-Diktat-Modal (das ist SLC-535)
- KI-Vorlagen-Generator (existiert aus SLC-532)
- Branding-Settings (existiert aus SLC-531)
- Layout-Anpassungen am 3-Panel-Layout (existiert aus SLC-533)
- Tracking-Toggle pro Mail in der UI
- Auto-Save-Drafts in der neuen Seite

## Acceptance Criteria

- AC1: Live-Preview rendert `renderBrandedHtml` und zeigt Logo, Farbe, Schrift wenn Branding gepflegt
- AC2: Live-Preview-Debounce ist 250ms (User merkt nicht, kein Tipp-Lag)
- AC3: Empfaenger-Header in Preview sichtbar (`An: <to>`, `Betreff: <subject>`, `Von: <env>`)
- AC4: Live-Preview rendert ohne Tracking-Pixel/Link-Wrapping (das passiert NUR im Send-Pfad — wichtig fuer DEC-095 Bit-Identitaet zur Final-Mail OHNE Tracking-Injection-Layer)
- AC5: "Senden"-Button ruft `sendComposedEmail` → `sendEmailWithTracking` → DB-Eintrag wie heute (status='sent', tracking_id, contact_id, deal_id, etc.)
- AC6: Tracking + IMAP + Cadence-Versand bleiben unbeeintraechtigt (Regression-Check)
- AC7: Deal-Workspace-Button "E-Mail schreiben" oeffnet `/emails/compose?dealId=...&contactId=primary` (nicht mehr das Sheet)
- AC8: Mein Tag E-Mail-Aktion oeffnet `/emails/compose?contactId=...`
- AC9: Focus E-Mail-Aktion oeffnet `/emails/compose?contactId=...`
- AC10: Live-Preview = Final-Mail bit-identisch (DEC-095) — beide rufen `renderBrandedHtml`. Verifikation: Klick "Senden", oeffne `emails`-Tabelle, vergleiche `body` mit Live-Preview-Quelltext (modulo Tracking-Pixel)
- AC11: Mobile-Tab "Preview" rendert dieselbe Live-Preview wie Desktop-Panel
- AC12: TypeScript-Build gruen, kein Linting-Fehler

## Dependencies

- SLC-531 (renderBrandedHtml, getBranding)
- SLC-532 (Templates schon im Compose-Studio nutzbar)
- SLC-533 (3-Panel-Layout, Compose-Form, Page mit Server-Loader)
- Bestehender `sendEmailWithTracking` aus `cockpit/src/lib/email/send.ts`

## Risks

- **Risk:** `<iframe srcDoc>` blockiert manche CSP-Pfade.
  Mitigation: srcDoc ist standard, aber bei Problemen Fallback auf `dangerouslySetInnerHTML` in einem isolierten div. Dokumentation in QA-Report.
- **Risk:** Variablen-Resolver hat Stage-Abhaengigkeit — wenn Deal kein Stage hat, ist `{{deal}}` leer.
  Mitigation: Resolver gibt Fallback-Strings (`firma` als Deal-Label, leere Strings statt undefined).
- **Risk:** Einstiegspunkte umstellen bricht bestehende Tests/Routen.
  Mitigation: Bestehender `email-sheet.tsx` bleibt funktional als Backup; Browser-Smoke-Test der 3 Einstiegspunkte vor Slice-Done.
- **Risk:** `sendComposedEmail` triggert Tracking-Injection auf bereits gerendetes HTML — `injectTracking` muss korrekt mit Branding-HTML umgehen.
  Mitigation: `injectTracking` arbeitet mit Regex auf `<a>` und appended Pixel vor `</body>` — Branding-HTML hat `<body>`-Tag (vom Renderer), funktioniert unveraendert.
- **Risk:** Live-Preview rendert clientseitig, aber `renderBrandedHtml` ist eine pure Function in `lib/email/render.ts` — keine Server-Only-Pakete (kein nodemailer-Import).
  Mitigation: `render.ts` darf nichts aus `send.ts` importieren. `tracking.ts` `textToHtml` ist clientseitig OK (keine Side-Effects).

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/(app)/emails/compose/live-preview.tsx` | NEU: Live-Preview-Komponente mit Debounce + iframe |
| `cockpit/src/lib/email/variables.ts` | NEU: `resolveVarsFromDeal(deal, contact, company)` Helper |
| `cockpit/src/app/(app)/emails/compose/send-action.ts` | NEU: Server Action `sendComposedEmail` |
| `cockpit/src/app/(app)/emails/compose/compose-studio.tsx` | MODIFY: Live-Preview-Komponente in rechtem Panel/Tab einbinden + "Senden"-Button-Integration |
| `cockpit/src/app/(app)/emails/compose/compose-form.tsx` | MODIFY: "Senden"-Button ergaenzt unten |
| `cockpit/src/app/(app)/deals/[id]/...` | MODIFY: "E-Mail schreiben"-Button-Link auf `/emails/compose?dealId=...&contactId=primary` |
| `cockpit/src/app/(app)/mein-tag/...` | MODIFY: E-Mail-Schnellaktion-Link |
| `cockpit/src/app/(app)/focus/...` | MODIFY: E-Mail-Aktion-Link |
| `docs/STATE.md` | Slice done |
| `slices/INDEX.md` | SLC-534 status `done` |

## QA Focus

- Browser-Test: Live-Preview rendert sofort beim Tippen mit max 300ms Lag
- Browser-Test: Live-Preview = Final-Mail (Klick "Senden", DB-Eintrag-Body vs. Preview-Quelltext)
- Browser-Test: Senden produziert dieselbe DB-Row-Struktur wie heute (`emails`-Tabelle vergleichen)
- Browser-Test: Tracking-Pixel + Link-Wrapping in versendeter Mail vorhanden
- Browser-Test: Deal-Workspace "E-Mail schreiben" landet auf `/emails/compose` mit korrekten Query-Params
- Browser-Test: Mein Tag + Focus E-Mail-Buttons landen auf `/emails/compose`
- Browser-Test: Mobile-Tab "Preview" rendert wie Desktop
- Regression: bestehender `email-sheet.tsx` (Mini-Variante) funktioniert weiterhin (z.B. fuer Cadence-Trigger)
- TypeScript-Build gruen

## Micro-Tasks

### MT-1: Variablen-Resolver
- Goal: Helper `resolveVarsFromDeal` mit defensivem Fallback
- Files: `cockpit/src/lib/email/variables.ts`
- Expected behavior:
  - `resolveVarsFromDeal(deal: Deal | null, contact: Contact | null, company: Company | null) → PlaceholderValues`
  - `vorname = contact?.first_name ?? ''`, `nachname = contact?.last_name ?? ''`
  - `firma = company?.name ?? deal?.title ?? ''`
  - `position = contact?.position ?? ''`
  - `deal = deal?.title ?? deal?.name ?? ''` (je nachdem welches Feld in Schema heisst)
  - Defensiv: nie `undefined`/`null` zurueckgeben — immer leerer String
- Verification: Vitest 3 Cases (alle Daten / nur Contact / nichts)
- Dependencies: none

### MT-2: Live-Preview-Komponente mit Debounce
- Goal: Debounced iframe-Render mit `renderBrandedHtml`
- Files: `cockpit/src/app/(app)/emails/compose/live-preview.tsx`
- Expected behavior:
  - Props: `body, subject, to, branding, vars`
  - `useDebouncedValue` mit 250ms (oder Custom-Hook in `lib/hooks/use-debounced-value.ts`)
  - `const html = useMemo(() => renderBrandedHtml(debouncedBody, branding, vars), [debouncedBody, branding, vars])`
  - Render: Header `<div>An: ${to}</div><div>Betreff: ${subject}</div><div>Von: ${SMTP_FROM_EMAIL}</div>` + `<iframe srcDoc={html} className="w-full h-full border rounded">`
  - Loading-Skeleton bei initialem Mount
  - **WICHTIG:** Live-Preview ruft NUR `renderBrandedHtml`, KEIN `injectTracking` (DEC-095: Bit-Identitaet zur Final-Mail OHNE Tracking-Layer — Tracking ist anti-cosmetisch fuer User-Preview)
- Verification: Browser-Test: Live-Render bei Body-Aenderung mit < 300ms Lag; iframe zeigt vollstaendige Mail
- Dependencies: SLC-531 MT-3 (`renderBrandedHtml`)

### MT-3: Live-Preview in Layout einbinden
- Goal: rechtes Panel + Mobile-Tab "Preview" zeigt LivePreview-Komponente
- Files: `cockpit/src/app/(app)/emails/compose/compose-studio.tsx` (MODIFY)
- Expected behavior:
  - Platzhalter aus SLC-533 ersetzt durch `<LivePreview body={body} subject={subject} to={to} branding={branding} vars={vars} />`
  - `vars` wird aus Initial-Props gerechnet via `resolveVarsFromDeal(deal, contact, company)`
- Verification: Browser-Test: Tippen im Body → Preview rendert
- Dependencies: MT-2, MT-1

### MT-4: Send-Action sendComposedEmail
- Goal: Server Action ruft Renderer + sendEmailWithTracking
- Files: `cockpit/src/app/(app)/emails/compose/send-action.ts`
- Expected behavior:
  - Input: `{to, subject, body, dealId?, contactId?, companyId?, templateId?, followUpDate?}`
  - Schritte:
    1. `getBranding()` (re-use SLC-531)
    2. `loadDealContext(dealId)` und `resolveVarsFromDeal(...)` (oder Server-Loader-Werte direkt durchreichen via Form-Hidden-Inputs — pragmatischer Weg)
    3. `const html = renderBrandedHtml(body, branding, vars)`
    4. `sendEmailWithTracking({to, subject, body, html, contactId, companyId, dealId, followUpDate, templateUsed: templateId, trackingEnabled: true})`
  - Return `{success, emailId, trackingId, error?}` zur UI
  - Bei Erfolg: optional `redirect('/emails/' + emailId)` oder Toast + Cleanup
- Verification: DB-Check nach Senden: `emails`-Row mit `status='sent'`, `tracking_id`, alle FK-IDs gesetzt
- Dependencies: MT-1, MT-2, SLC-531 MT-3+MT-4

### MT-5: "Senden"-Button + Confirm-Toast
- Goal: Button im Compose-Form unten, ruft `sendComposedEmail`, zeigt Toast
- Files: `cockpit/src/app/(app)/emails/compose/compose-form.tsx` (MODIFY)
- Expected behavior:
  - Button "Senden" mit `<Send>`-Icon, `onClick={async () => { ... }}`
  - Validierung: `to` und `subject` Pflicht (toast bei leer)
  - Calls `sendComposedEmail(...)` mit allen Form-Werten
  - Bei `success`: Toast "Mail gesendet", optional `router.push('/emails')`
  - Bei `error`: Toast mit Fehlermeldung, Button bleibt aktiv
  - Loading-State waehrend Submission (`isPending` von `useTransition`)
- Verification: Browser-Test: echte Mail an Test-Postfach gesendet
- Dependencies: MT-4

### MT-6: Einstiegspunkte umstellen (Deal-Workspace)
- Goal: Deal-Workspace "E-Mail schreiben"-Button auf neue Route
- Files: `cockpit/src/app/(app)/deals/[id]/...` (genauer Pfad bei Implementierung pruefen, vermutlich `deal-workspace.tsx` oder `deal-actions.tsx`)
- Expected behavior:
  - Bestehender Button-Click der `email-sheet.tsx` oeffnet → ersetzt durch `<Link href={`/emails/compose?dealId=${dealId}&contactId=${primaryContactId}`}>`
  - Falls bestehende Sheet weiterhin parallel sinnvoll: Default ist neue Route, optional Modifier-Klick fuer Sheet (V5.3 nicht zwingend)
- Verification: Browser-Test: Klick im Deal-Workspace landet auf `/emails/compose?dealId=...`
- Dependencies: MT-5

### MT-7: Einstiegspunkte umstellen (Mein Tag + Focus)
- Goal: E-Mail-Schnellaktionen aus Mein Tag und Focus auf neue Route
- Files: `cockpit/src/app/(app)/mein-tag/...`, `cockpit/src/app/(app)/focus/...`
- Expected behavior:
  - Schnellaktion-Button-Pfade auf `/emails/compose?contactId=...` umstellen
  - Falls Mein Tag heute Sheet nutzt: Default neue Route, Sheet bleibt als Embedded-Variant verfuegbar wenn das anderswo verwendet wird
- Verification: Browser-Test: beide Einstiegspunkte landen auf `/emails/compose?...`
- Dependencies: MT-6

### MT-8: TypeScript-Build + Browser-Smoke-Test
- Goal: Build gruen, alle 12 Acceptance Criteria abgehakt
- Files: keine
- Expected behavior: `npm run build` gruen; AC-Checkliste in QA-Report manuell durchgegangen
- Verification: Build-Log + AC-Checkliste
- Dependencies: MT-1..MT-7
