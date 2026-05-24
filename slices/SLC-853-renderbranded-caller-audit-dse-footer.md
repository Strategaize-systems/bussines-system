# SLC-853 — V8.5 renderBrandedHtml-Caller-Audit + DSE-Footer fuer Consent + Briefing-Mails

- **Feature:** BL-492
- **Version:** V8.5
- **Status:** done
- **Priority:** Medium
- **Created:** 2026-05-24
- **Estimated:** ~2-3h Code-Side
- **Depends-On:** V8.4 SLC-846 (buildDseFooterBlock-Function private in render.ts)
- **Architecture:** DEC-239 (NEU): DSE-Footer als gemeinsam genutzter Helper-Export, NICHT komplette renderBrandedHtml-Migration der Custom-Renderer

## Goal

V8.4-Hotfix-Lehre (ISSUE-083): SLC-846 hat den DSE-Footer-Auto-Insert nur fuer `renderBrandedHtml` implementiert. Caller die ihren eigenen HTML-Builder einsetzen + an `sendEmailWithTracking({html: ...})` reichen, umgehen den tenantSlug-Lookup. V8.4-Audit identifizierte 2 solche Caller:

1. **`send-consent-mail.ts`** (Zeile 60): nutzt `consentRequestHtml(templateInput)` als eigenen HTML-Builder + reicht als `html:`-Param
2. **`/api/cron/meeting-briefing/route.ts`** (Zeile 272): nutzt eigenen Renderer + reicht das Ergebnis als `html:`-Param

Beide Mails (Customer-Consent-Request + Meeting-Briefing) haben aktuell **KEINEN DSE-Footer-Block** — Compliance-Risk fuer Customer-Outbound-Kommunikation pre-Customer-Live.

V8.5 schliesst die Luecke:
- **Phase A** (Audit + DEC): Komplette Grep-Liste aller Mail-Send-Pfade dokumentieren. DEC-239 nimmt explizit Option A (Helper-Export + Caller-Erweitern) statt Option B (renderBrandedHtml-Migration).
- **Phase B** (Implementation): `buildDseFooterBlock` aus `render.ts` exportieren. Beide Custom-Renderer (consentRequestHtml + meeting-briefing-Renderer) ergaenzen DSE-Footer-Block analog renderBrandedHtml. tenantSlug-Resolution via getTenantSlugByOwnerUserId im jeweiligen Send-Pfad.

## Scope

### IN
- Audit-Report `docs/AUDIT_MAIL_RENDERERS_V85.md` (NEU): Grep-Liste aller `sendEmailWithTracking`-Caller + Klassifikation `via renderBrandedHtml` vs. `via params.html`
- DEC-239 in `docs/DECISIONS.md`: Helper-Export vs. komplette Migration, Reasoning
- `buildDseFooterBlock` exportieren aus `cockpit/src/lib/email/render.ts` (heute private function)
- `send-consent-mail.ts`: tenantSlug per `getTenantSlugByOwnerUserId(ownerUserId)` resolven, `consentRequestHtml`-Funktions-Signatur um optionalen `dseFooterHtml`-Param erweitern, `consentRequestHtml(templateInput, dseFooter)` aufrufen
- `consentRequestHtml`-Renderer (in template-File, wahrscheinlich `lib/email/templates/consent-request.ts`): DSE-Footer-Block am Ende des HTML-Templates einfuegen
- Meeting-Briefing-Renderer-File identifizieren (vermutlich `lib/email/briefing-renderer.ts` oder inline in route.ts) + analog erweitern
- Vitest neu: 2 Snapshot/Substring-Tests fuer beide Renderer (mit + ohne tenantSlug)
- `docs/COMPLIANCE.md` V8.5-Section ergaenzen um DSE-Footer-Coverage-Note (deferred per `feedback_compliance_gate_later`, optional in V8.5)

### OUT
- Komplette Migration von consentRequestHtml + briefing-Renderer auf renderBrandedHtml (Option B, ~6-8h Aufwand, V9+ Roadmap-Item bei naechstem Customer-Mail-Refactor)
- Default-Replacement-Pattern fuer `{{tenant_name}}`-Platzhalter (V2-Feature aus V8.4-Roadmap)
- Anwalts-Pruefung der Mail-Texte (Pre-Customer-Live-Compliance-Gate)
- Tracking-Pixel + Link-Wrapping fuer Consent + Briefing (eigene SLC waere noetig, nicht V8.5-Scope)

## Acceptance Criteria

- **AC1** `docs/AUDIT_MAIL_RENDERERS_V85.md` listet alle `sendEmailWithTracking`-Caller (Grep-Output), klassifiziert nach Pfad-Typ (renderBrandedHtml vs. custom-html), mind. 4 Caller dokumentiert
- **AC2** DEC-239 in `docs/DECISIONS.md` dokumentiert Option-A-Wahl mit Reasoning (Aufwand + Migration-Risk + V8.5-Hygiene-Scope)
- **AC3** `buildDseFooterBlock` exportiert aus `render.ts`, importable als `import { buildDseFooterBlock } from '@/lib/email/render'`
- **AC4** `consentRequestHtml`-Renderer um DSE-Footer-Block am Ende erweitert. Bei `tenantSlug=undefined` Output Bit-fuer-Bit identisch zu V8.4 (regression-safe). Bei `tenantSlug='strategaize-transition-bv'` Output enthaelt `Datenschutzerklaerung:`-Link + URL
- **AC5** Meeting-Briefing-Renderer analog erweitert. Bit-Regression-safe bei `tenantSlug=undefined`.
- **AC6** `send-consent-mail.ts`: tenantSlug-Resolution per `getTenantSlugByOwnerUserId(ownerUserId)` (graceful-null), an consentRequestHtml-Builder durchgereicht
- **AC7** `meeting-briefing/route.ts`: tenantSlug-Resolution analog, an Briefing-Renderer durchgereicht
- **AC8** Vitest 2 neue Tests: `consentRequestHtml` mit tenantSlug enthaelt DSE-URL, ohne nicht. Analog briefing-Renderer.
- **AC9** Existing Vitest bleibt gruen (V8.4-Snapshots in render.test.ts + Snapshots in __snapshots__/)
- **AC10** TSC + Build + Lint clean
- **AC11** Live-Smoke (User-Action, optional): 1 echte Consent-Request-Mail + 1 echte Meeting-Briefing-Mail an immo@bellaerts.de, HTML-Source enthaelt DSE-Footer
- **AC12** `slices/INDEX.md` + `planning/backlog.json` BL-492 → done

## Micro-Tasks

### MT-1: Audit-Report + DEC-239

- **Goal:** Komplette Caller-Liste + Architektur-Decision dokumentieren
- **Files:** `docs/AUDIT_MAIL_RENDERERS_V85.md` (create), `docs/DECISIONS.md` (modify, DEC-239 ergaenzen)
- **Expected behavior:** Audit-Report mit Grep-Output, DEC-239 mit Option-A-Reasoning
- **Verification:** Manuelle Inspektion, Cockpit zeigt DEC-239
- **Dependencies:** none

### MT-2: buildDseFooterBlock-Export

- **Goal:** Helper-Function aus render.ts exportieren
- **Files:** `cockpit/src/lib/email/render.ts` (modify, `export function buildDseFooterBlock(...)` statt private)
- **Expected behavior:** Function ist via `import { buildDseFooterBlock } from '@/lib/email/render'` importable. Existing-renderBrandedHtml-Aufruf bleibt unveraendert.
- **Verification:** TSC clean, existing Vitest 11/11 gruen
- **Dependencies:** none

### MT-3: consentRequestHtml-Renderer erweitern + Send-Action-Wiring

- **Goal:** Consent-Mail bekommt DSE-Footer
- **Files:** `cockpit/src/lib/email/templates/consent-request.ts` (oder wo `consentRequestHtml` lebt — Grep-discoverable), `cockpit/src/lib/email/send-consent-mail.ts`
- **Expected behavior:** `consentRequestHtml(templateInput, tenantSlug?)` ruft `buildDseFooterBlock(tenantSlug, primary)` + appended am Ende des HTML-Templates. `send-consent-mail.ts` resolved tenantSlug + reicht durch.
- **Verification:** Vitest, manuell HTML-String inspecten
- **Dependencies:** MT-2

### MT-4: meeting-briefing-Renderer erweitern + Cron-Wiring

- **Goal:** Briefing-Mail bekommt DSE-Footer
- **Files:** Briefing-Renderer-File (Grep-discoverable, vermutlich in `lib/email/` oder inline in `app/api/cron/meeting-briefing/route.ts`), `cockpit/src/app/api/cron/meeting-briefing/route.ts`
- **Expected behavior:** Briefing-Renderer akzeptiert optionalen tenantSlug + appended DSE-Footer. Cron-Route resolved tenantSlug aus meeting-owner_user_id + reicht durch.
- **Verification:** Vitest, manuell HTML-String inspecten
- **Dependencies:** MT-2

### MT-5: Vitest fuer beide Renderer

- **Goal:** 2+ neue Vitest-Cases: with + without tenantSlug, Bit-Regression-Test
- **Files:** `cockpit/src/lib/email/templates/consent-request.test.ts` (create oder modify falls existiert), Briefing-Renderer-Test analog
- **Expected behavior:** 4 neue Vitest-Cases (2 pro Renderer), alle PASS
- **Verification:** `npm run test`
- **Dependencies:** MT-3 + MT-4

### MT-6: Records-Update

- **Goal:** Slices/Features/Backlog/KNOWN_ISSUES/STATE Cockpit-Records sync
- **Files:** `slices/INDEX.md`, `planning/backlog.json`, `docs/KNOWN_ISSUES.md` (ISSUE-080 + 081 + ggf. BL-492 Closure), `docs/STATE.md`, `docs/MIGRATIONS.md` (falls SLC-851 schon merged)
- **Expected behavior:** BL-492 done, BL-490 + 491 ggf. done (falls SLC-851 + 852 schon mergt), STATE.md V8.5 status update
- **Verification:** Cockpit-Refresh zeigt korrekten Stand
- **Dependencies:** MT-5

## Risiken

- **R1 (Medium)** Custom-Renderer-Tabellen-Struktur kann von renderBrandedHtml abweichen — `buildDseFooterBlock` baut `<tr>`-Block, der nur in Table-basierten HTML-Mails passt. Mitigation: Beide Renderer pruefen, ob Table-Struktur passt. Falls nicht, eigene Pre-Send-Helper-Function bauen (z.B. `buildDseFooterParagraph` als Paragraph-Variante).
- **R2 (Low)** consentRequestHtml-Caller-Stack: send-consent-mail wird auch von Cron / Cadences gerufen? Pruefung in MT-1 Audit-Report.
- **R3 (Medium)** Anwalts-Pruefung der DSE-Link-Position: in der Consent-Mail koennte der DSE-Link rechtlich strenger positioniert sein muessen (z.B. VOR dem Consent-Button, nicht im Footer). Deferred per `feedback_compliance_gate_later`, aber dokumentieren als Risiko.
- **R4 (Low)** Live-Smoke benoetigt SMTP-Send → Live-Mail an immo@bellaerts.de. User-Action.

## Verification

- Vitest 1116 + 4 neu = 1120/1120 PASS
- TSC + Build + Lint clean
- DEC-239 in Cockpit sichtbar
- `docs/AUDIT_MAIL_RENDERERS_V85.md` existiert
- Live-Smoke (optional): 2 echte Mails mit DSE-Footer in HTML-Source

## Worktree-Isolation

Branch: `slc-853-renderbranded-caller-audit-dse-footer` (Optional fuer Internal-Tool).
