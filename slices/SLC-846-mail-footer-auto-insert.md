# SLC-846 — V8.4 Mail-Footer-Auto-Insert (render.ts + send.ts + send-consent-mail.ts Patches)

- **Feature:** FEAT-824 / BL-488
- **Version:** V8.4
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-22
- **Estimated:** ~1.5h Code-Side
- **Depends-On:** SLC-841, SLC-842, SLC-843
- **Architecture:** DEC-235 (Mail-Footer zentral in render.ts)

## Goal

Zentraler Patch in `cockpit/src/lib/email/render.ts` `renderBrandedHtml`: neuer optionaler `tenantSlug`-Param. Bei Wert gesetzt: zusaetzlicher Footer-Block "Datenschutzerklaerung: <URL>" wird automatisch angehaengt. Alle Caller (`send.ts`, `send-consent-mail.ts`, `meeting-briefing`-Cron) reichen `tenantSlug` durch — Aufloesung via `lib/team/lookup-slug.ts` aus `ownerUserId`. Regression-Safety: bei `tenantSlug=undefined` ist Output bit-identisch zu V8.3 — bestehende Vitest-Snapshots bleiben gruen.

## Scope

### IN
- `cockpit/src/lib/email/render.ts` PATCH: Signatur-Erweiterung `renderBrandedHtml(body, branding, vars = {}, tenantSlug?: string)`, Auto-Footer-Block bei `tenantSlug` gesetzt
- `cockpit/src/lib/email/send.ts` PATCH: Resolution `tenantSlug` aus `ownerUserId` via `getTenantSlugByOwnerUserId`, durchreichen an `renderBrandedHtml`
- `cockpit/src/lib/email/send-consent-mail.ts` PATCH: analog `send.ts` (eigener Render-Pfad)
- `cockpit/src/app/api/cron/meeting-briefing/route.ts` (oder existing briefing-Pfad) PATCH falls dort `renderBrandedHtml` aufgerufen wird
- Vitest: Snapshot-Tests fuer `renderBrandedHtml` Regression (bestehende Snapshots bleiben gruen bei `tenantSlug=undefined`) + neue Snapshots fuer `tenantSlug="strategaize-transition-bv"`
- Live-Smoke: Test-Mail an immo@bellaerts.de → HTML enthaelt Footer mit Link `https://business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz`

### OUT
- Editor (SLC-844)
- Public-Route (SLC-843)
- Consent-Form-Link (SLC-845)

## Acceptance Criteria

- **AC1** `renderBrandedHtml(body, branding, vars, tenantSlug?)` Signatur erweitert. Default-Verhalten bit-identisch bei `tenantSlug=undefined` — bestehende Vitest-Snapshots in `cockpit/src/lib/email/__snapshots__/render.test.ts.snap` BLEIBEN gruen ohne Aenderung
- **AC2** Bei `tenantSlug="strategaize-transition-bv"`: HTML enthaelt zusaetzlichen `<tr>`-Block am Ende mit `Datenschutzerklaerung: <a href="https://business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz">https://business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz</a>`
- **AC3** `BASE_URL` aus `process.env.NEXT_PUBLIC_APP_URL` (consistent zu Tracking-Pixel-Code in `lib/email/tracking.ts`)
- **AC4** `send.ts` `sendEmailWithTracking` loest `tenantSlug` aus `params.ownerUserId` via `getTenantSlugByOwnerUserId`. Bei `ownerUserId=null` (Legacy-Caller): `tenantSlug=undefined` → kein Auto-Footer
- **AC5** `send-consent-mail.ts` analog Patch (loest tenantSlug aus contact.owner_user_id)
- **AC6** `meeting-briefing`-Cron-Pfad: falls dort `renderBrandedHtml` aufgerufen wird, `tenantSlug` aus User-Context durchreichen. Falls NICHT `renderBrandedHtml` genutzt (eigener HTML-Builder): MT-4 dokumentiert das + V2-Followup
- **AC7** Vitest: bestehende `render.test.ts` Snapshot-Suite 100% PASS ohne Snapshot-Updates. Neue Tests fuer `tenantSlug` gesetzt (3-4 Cases: Tenant + leeres Branding, Tenant + voll-Branding, Tenant + empty body, undefined tenant = no-op-Bit-Identical)
- **AC8** Live-Smoke: User schickt Test-Mail via Composing-Studio an sich selbst → HTML-Quelle der empfangenen Mail enthaelt DSE-Footer-Block mit korrekter URL

## Micro-Tasks

### MT-1: render.ts tenantSlug-Param + Snapshot-Tests
- Goal: Renderer-Signatur erweitern + Snapshot-Regression-Safety beweisen.
- Files:
  - `cockpit/src/lib/email/render.ts` (PATCH, ~20-30 Zeilen neu)
  - `cockpit/src/lib/email/render.test.ts` (PATCH, +3-4 Tests)
- Expected behavior:
  - Signatur `renderBrandedHtml(body, branding, vars = {}, tenantSlug?: string)`
  - DSE-Link-Block-Builder als neue interne Funktion `buildDseFooterBlock(tenantSlug, primary)`
  - Append am Ende von footerText (Reihenfolge: logoBlock → bodyBlock → footerLine → contactRows → footerText → dseLinkBlock)
  - `BASE_URL` Const aus `process.env.NEXT_PUBLIC_APP_URL` (falls leer: kein Auto-Footer, graceful)
  - Bit-fuer-Bit-Regression bei `tenantSlug=undefined`: existing Snapshots blieben gruen
- Verification: `npx vitest run lib/email/render.test.ts` ALLE Tests PASS, KEINE Snapshot-Updates (UNVERAENDERTE alte Snapshots).
- Dependencies: —

### MT-2: send.ts tenantSlug-Resolution
- Goal: `sendEmailWithTracking` loest tenantSlug aus ownerUserId.
- Files: `cockpit/src/lib/email/send.ts` (PATCH, ~3-5 Zeilen)
- Expected behavior:
  - Vor `renderBrandedHtml`-Call: `const tenantSlug = params.ownerUserId ? await getTenantSlugByOwnerUserId(params.ownerUserId) : undefined;`
  - Durchreichen an `renderBrandedHtml(body, branding, vars, tenantSlug)`
- Verification: Browser-Smoke MT-4.
- Dependencies: MT-1, SLC-845-MT-1 (Lookup-Helper) — falls SLC-845 noch nicht durch, hier den Helper anlegen.

### MT-3: send-consent-mail.ts tenantSlug-Resolution
- Goal: Analog send.ts fuer Consent-Mail-Pfad.
- Files: `cockpit/src/lib/email/send-consent-mail.ts` (PATCH, ~3-5 Zeilen) — Pfad-Verifikation bei Slice-Start (falls Datei-Struktur abweicht)
- Expected behavior: analog MT-2 mit Resolution aus `contact.owner_user_id`. Falls die Funktion `renderBrandedHtml` nicht aufruft sondern eigenen HTML-Builder hat: prueft + dokumentiert in Slice-Notes.
- Verification: Live-Smoke MT-5.
- Dependencies: MT-1

### MT-4: meeting-briefing-Cron-Pfad pruefen + ggf. patchen
- Goal: Inventur ob `meeting-briefing`-Cron `renderBrandedHtml` nutzt.
- Files: `cockpit/src/lib/email/templates/briefing-html.ts` (PATCH falls relevant) ODER nur Inspektion
- Expected behavior:
  - Grep ueber `cockpit/src/app/api/cron/meeting-briefing/` + `lib/email/templates/briefing-html.ts` auf `renderBrandedHtml`-Aufrufe
  - Falls genutzt: tenantSlug durchreichen
  - Falls eigener HTML-Builder: dokumentieren als V2-Followup in Slice-Notes
- Verification: Code-Audit-Report in Slice-Notes.
- Dependencies: —

### MT-5: Live-Smoke Test-Mail
- Goal: End-to-End-Verifikation auf staging/production.
- Files: keine
- Expected behavior:
  - User loggt sich als Admin ein, oeffnet Composing-Studio, schreibt Test-Mail an sich selbst (immo@bellaerts.de), versendet
  - User oeffnet Mail im Postfach, schaut HTML-Quelle an
  - Footer enthaelt `Datenschutzerklaerung: https://business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz` mit Link
  - Optional: Klick auf Link in Mail → DSE oeffnet sich im Browser
- Verification: AC8 PASS.
- Dependencies: MT-1, MT-2, MT-3, MT-4, Coolify-Redeploy

## Risks / Notes

- **R1** Snapshot-Regression-Risiko: jede Aenderung am HTML-Output (z.B. Whitespace zwischen `<tr>`-Bloecken) wuerde alle bestehenden Snapshots brechen. Disziplin: bei `tenantSlug=undefined` MUSS Output identisch zu V8.3 sein. Strategie: dseLinkBlock-Append erfolgt INSIDE des `<table>` als zusaetzlicher `<tr>`, KEIN Whitespace-Change im Render-Body fuer Legacy-Pfad.
- **R2** Resolution-Performance: 2 DB-Hits pro Mail-Send (profiles + teams) ist akzeptabel bei <100 Mails/Tag. V2-Cache via React `cache()` oder Request-Memoization.
- **R3** `NEXT_PUBLIC_APP_URL` ENV muss gesetzt sein. Falls in lokaler/staging-ENV leer: graceful Fallback (kein Auto-Footer, kein Crash). Production-ENV ist `https://business.strategaizetransition.com`.
- **R4** Pre-Existing Mails ohne ownerUserId (Legacy-Caller in Cadences/Cron): tenantSlug=undefined → kein Auto-Footer. Akzeptabel als V1-Behavior. V2 koennte Cadence-Owner-Resolution rueckwirkend ergaenzen.
- **R5** `meeting-briefing`-Cron-Pfad nutzt ggf. eigenen HTML-Builder (`briefing-html.ts`). Inspektion in MT-4. Falls separater Builder: V2 vereinheitlichen oder Auto-Footer dort separat ergaenzen.

## Worktree-Isolation

Worktree-Branch `slc-846-mail-footer-auto-insert` empfohlen. Orthogonal zu SLC-845 — koennen parallel laufen (touchen verschiedene Files: SLC-845 = consent-page, SLC-846 = email-lib).

## Done-Definition

- render.ts + send.ts + send-consent-mail.ts (+ briefing falls relevant) gepatcht
- Vitest Snapshots gruen (bestehende + neue)
- AC1-AC8 verifiziert (inklusive Live-Smoke Test-Mail)
- `/qa` PASS
- Slice-Branch ready
