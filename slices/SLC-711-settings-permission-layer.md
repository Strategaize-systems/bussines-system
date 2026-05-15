# SLC-711 — Settings-Permission-Layer (rollen-basiert)

## Metadata
- **Slice ID:** SLC-711
- **Version:** V7.1
- **Feature:** FEAT-711
- **Status:** planned
- **Priority:** High (User-Wunsch aus V7-Walkthrough, Direct-URL-Risk bei Member-Login)
- **Created:** 2026-05-15
- **Estimated Effort:** ~4-6h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen (Touch in 11+ Settings-Pages — Worktree-Isolation hilft beim Revert falls Rolle-Cut falsch entschieden)
- **Architecture:** DEC-196, DEC-196b, DEC-197, DEC-198
- **Reihenfolge-Pflicht:** **erster V7.1-Slice** (sichtbar zuerst nach User-Wahl 2026-05-15). Vor SLC-712 (Drilldown) und SLC-713 (Defense-in-Depth).

## Goal

V7-Walkthrough hat aufgedeckt: 11 Settings-Sub-Pages sind heute fuer alle Rollen offen — Member kann Branding/Steuern/Pipelines/Workflows/Kampagnen aendern, was organisationsweite Wirkung haette. Slice schliesst diese Luecke mit zweistufiger Verteidigung:

1. **Server-Side `assertRole`-Guard** als first line in jeder gegateten Sub-Page (Direct-URL-Schutz)
2. **Sidebar-Visibility-Filter** in globaler Sidebar + Settings-Sub-Sidebar + Settings-Landing-Kacheln (UX-Schutz, kein 403-Flash)

Permission-Matrix (DEC-196):
- **Admin-only:** Branding, Payment-Terms, Pipelines, Products, Compliance, IMAP (6 Pages)
- **Admin+Teamlead:** Workflow-Automation (3 Pages: list/new/edit), Templates, Campaigns (3 Pages: list/new/edit) (= 7 Pages)
- **Alle (heute schon):** Working-Hours, Meeting-Settings, Briefing (= 3 Pages, kein Guard noetig)

## Scope

**In Scope:**

Erweiterung `SIDEBAR_CONFIG`:
- `cockpit/src/lib/navigation/sidebar-config.ts` (MOD) — 11 neue Settings-Sub-Page-Items mit korrekter `visibleFor`-Liste

Settings-Layout Sidebar:
- `cockpit/src/app/(app)/settings/layout.tsx` (MOD) — hardcoded `SIDEBAR_ITEMS` ersetzt durch Slug-Filter-Logic aus `SIDEBAR_CONFIG`. Behaeltet vorhandene Active-Highlight-Logic + "← Alle Einstellungen"-Footer-Link bei.

Settings-Landing-Kacheln:
- `cockpit/src/app/(app)/settings/page.tsx` (MOD) — Kacheln-Array bekommt `visibleFor`-Annotation, server-side Rolle-Filter mit `getProfile()`. Member sieht nur Mein-Profil + Working-Hours + Meeting + Briefing-Kacheln.

Server-Side-Guards (11 Pages):
- `cockpit/src/app/(app)/settings/branding/page.tsx` (MOD) — `assertRole(["admin"])`
- `cockpit/src/app/(app)/settings/payment-terms/page.tsx` (MOD) — `assertRole(["admin"])`
- `cockpit/src/app/(app)/settings/pipelines/page.tsx` (MOD) — `assertRole(["admin"])`
- `cockpit/src/app/(app)/settings/products/page.tsx` (MOD) — `assertRole(["admin"])`
- `cockpit/src/app/(app)/settings/compliance/page.tsx` (MOD) — `assertRole(["admin"])`
- `cockpit/src/app/(app)/settings/automation/page.tsx` (MOD) — `assertRole(["admin", "teamlead"])`
- `cockpit/src/app/(app)/settings/automation/new/page.tsx` (MOD) — `assertRole(["admin", "teamlead"])`
- `cockpit/src/app/(app)/settings/automation/[id]/edit/page.tsx` (MOD) — `assertRole(["admin", "teamlead"])`
- `cockpit/src/app/(app)/settings/templates/page.tsx` (MOD) — `assertRole(["admin", "teamlead"])`
- `cockpit/src/app/(app)/settings/campaigns/page.tsx` (MOD) — `assertRole(["admin", "teamlead"])`
- `cockpit/src/app/(app)/settings/campaigns/new/page.tsx` (MOD) — `assertRole(["admin", "teamlead"])`
- `cockpit/src/app/(app)/settings/campaigns/[id]/edit/page.tsx` (MOD) — `assertRole(["admin", "teamlead"])`

(12 Page-Files, weil Workflow-Automation 3 Routes + Campaigns 3 Routes hat — bleibt unter 5-Files-Anti-Pattern weil jedes File 1 Zeile Edit + 1 Import)

Tests:
- `cockpit/src/lib/navigation/sidebar-config.test.ts` (MOD) — Test-Erweiterung um 11 neue Settings-Items pro Rolle (visible/hidden)

**Out of Scope:**
- Mein-Profil-Stub-Page anlegen (V7.2+ falls Bedarf)
- Audit-Trail `settings_*_update` (DEC-197 deferred, BL-471-Kandidat)
- 403-Page-Component (DEC-198, redirect nach /mein-tag reicht)
- IMAP-Settings ausserhalb der 11 Settings-Sub-Pages (nicht erkennbar als eigene Page in /settings/*; wenn entdeckt: zu Liste hinzufuegen, sonst out-of-scope)

## Acceptance Criteria

- **AC1** Sidebar-Visibility (globale Sidebar): Member-Login sieht in der Sidebar weder /settings/branding noch /settings/automation, etc. Sieht aber /settings (Landing-Page-Link) — die filtert intern auf erlaubte Sub-Pages.
- **AC2** Sidebar-Visibility (Settings-Sub-Sidebar): Member-Login auf `/settings/working-hours` sieht in der Sub-Sidebar nur die fuer Member erlaubten Eintraege (Working-Hours + Meeting + Briefing). Admin sieht alle. Teamlead sieht Branding/Payment-Terms/Pipelines/Products/Compliance NICHT, aber Workflow-Automation + Templates + Campaigns ja.
- **AC3** Settings-Landing-Kacheln: Member-Login auf `/settings` sieht nur Mein-Profil + Working-Hours + Meeting + Briefing-Kacheln. Admin sieht alle Kacheln.
- **AC4** Direct-URL-Guard: Member klickt auf URL `https://business.../settings/branding` → redirect("/mein-tag"). Kein 5xx-Crash, kein 403-Page (DEC-198).
- **AC5** Direct-URL-Guard: Member auf `/settings/automation` → redirect("/mein-tag"). Teamlead auf `/settings/automation` → 200 OK (Sub-Page rendert).
- **AC6** Vitest `sidebar-config.test.ts`: alle 3 Rollen × 11 neue Items + bestehende Items = visible/hidden Matrix gruen.
- **AC7** `npm run test:all` clean (kein Regression in V7-Vitest 756/756).
- **AC8** Live-Smoke 3-Rollen-Tour: Mit dem existierenden Test-User-Trio (Admin = existing, Teamlead = invited, Member = invited) durchschalten — jede Rolle sieht/sieht-nicht die Pages nach Matrix. Audit-Log bleibt symmetrisch (kein neuer Audit-Eintrag, DEC-197).

## Micro-Tasks

### MT-1: SIDEBAR_CONFIG erweitern um 11 Settings-Sub-Pages
- **Goal:** Zentrale Sidebar-Config bekommt explizite Items fuer alle 11 Settings-Sub-Pages mit korrekten `visibleFor`-Listen nach Permission-Matrix DEC-196.
- **Files:**
  - `cockpit/src/lib/navigation/sidebar-config.ts` (MOD)
- **Expected behavior:** `SIDEBAR_CONFIG` Array enthaelt 11 neue Items unter Section `VERWALTUNG_SETUP`. Items haben `href`/`label`/`icon`/`section`/`visibleFor` korrekt gesetzt. ADMIN_ONLY: branding, payment-terms, pipelines, products (existiert), compliance, IMAP-Stub. ADMIN_TEAMLEAD: automation, templates, campaigns. Achtung: Aktuell ist `/cadences` mit Label "Automatisierung" ADMIN_TEAMLEAD — pruefen, ob das doppelt zu `/settings/automation` ist oder ob /cadences eine separate Page ist. /cadences NICHT aendern.
- **Verification:**
  - TSC: `cd cockpit && npx tsc --noEmit` clean
  - Build: `npm run build` clean (Sidebar wird in Layout gerendert)
- **Dependencies:** none

### MT-2: Settings-Layout-Sidebar auf Slug-Filter umbauen
- **Goal:** `(app)/settings/layout.tsx` ersetzt hardcoded `SIDEBAR_ITEMS` durch `filterByRole(role).filter(item => item.href.startsWith("/settings/"))`-Logik. Single-Source-of-Truth via SIDEBAR_CONFIG (DEC-196b).
- **Files:**
  - `cockpit/src/app/(app)/settings/layout.tsx` (MOD) — `"use client"`-Direktive entfernen oder beibehalten? Heutige Datei ist Client-Component (`"use client"` Z.1), nutzt `usePathname()`. Settings-Sub-Sidebar muss Rolle kennen → entweder Server-Component-Refactor mit Profile-Loading + Client-Component fuer Active-Highlight, oder Server-Wrapper laedt Items und uebergibt sie an unveraenderten Client-Layout. Letzteres ist surgical-kleiner. /backend entscheidet konkret.
- **Expected behavior:** Sub-Sidebar zeigt nur Eintraege die fuer aktuelle Rolle visible sind. Active-Highlight + "← Alle Einstellungen"-Footer-Link bleiben unveraendert.
- **Verification:**
  - Lokaler Lauf in 3 Browser-Sessions (oder per User-Switch) — Sub-Sidebar zeigt rollen-spezifische Items
  - TSC clean
- **Dependencies:** MT-1

### MT-3: Settings-Landing-Page Kacheln rollen-aware
- **Goal:** `(app)/settings/page.tsx` filtert Kacheln-Array gegen `getProfile().role`. Member sieht nur 3-4 Kacheln (Mein-Profil-Stub, Working-Hours, Meeting, Briefing). Admin sieht alle.
- **Files:**
  - `cockpit/src/app/(app)/settings/page.tsx` (MOD) — Server-Component-Read der Profile + Filter-Logic
- **Expected behavior:** Member-Login zeigt 3-4 Kacheln, Teamlead zeigt 6-8 Kacheln (Workflow/Templates/Kampagnen + persoenliche), Admin zeigt alle (ca. 10-12).
- **Verification:**
  - Browser-Smoke pro Rolle (Teil von AC3)
  - TSC clean
- **Dependencies:** none (kann parallel zu MT-2 laufen)

### MT-4: assertRole-Guard als first line in 12 Settings-Sub-Page-Files
- **Goal:** Jede gegated Sub-Page bekommt `await assertRole([...])` als first line vor existierendem Daten-Loading. Konsistent mit DEC-191 (V7-Page-Guard-Pattern).
- **Files (12):**
  - `cockpit/src/app/(app)/settings/branding/page.tsx`
  - `cockpit/src/app/(app)/settings/payment-terms/page.tsx`
  - `cockpit/src/app/(app)/settings/pipelines/page.tsx`
  - `cockpit/src/app/(app)/settings/products/page.tsx`
  - `cockpit/src/app/(app)/settings/compliance/page.tsx`
  - `cockpit/src/app/(app)/settings/automation/page.tsx`
  - `cockpit/src/app/(app)/settings/automation/new/page.tsx`
  - `cockpit/src/app/(app)/settings/automation/[id]/edit/page.tsx`
  - `cockpit/src/app/(app)/settings/templates/page.tsx`
  - `cockpit/src/app/(app)/settings/campaigns/page.tsx`
  - `cockpit/src/app/(app)/settings/campaigns/new/page.tsx`
  - `cockpit/src/app/(app)/settings/campaigns/[id]/edit/page.tsx`
- **Expected behavior:** Jede Page macht `await assertRole(["admin"])` (oder `["admin","teamlead"]` fuer Workflow/Templates/Campaigns). Bei Mismatch: redirect nach /mein-tag (DEC-198).
- **Verification:**
  - TSC clean
  - Vitest clean (kein Regression)
  - Direct-URL-Smoke mit Member: 12 URLs aufrufen, alle redirecten auf /mein-tag (AC4+AC5)
- **Dependencies:** none — file-level MOD, kein Cross-File-Refactor

### MT-5: Vitest sidebar-config.test.ts erweitern
- **Goal:** Bestehender Test um die 11 neuen Items × 3 Rollen erweitern. Pure-Function-Tests fuer `filterByRole`.
- **Files:**
  - `cockpit/src/lib/navigation/sidebar-config.test.ts` (MOD)
- **Expected behavior:** Test bestaetigt: `filterByRole("admin")` returnt 11 neue Items, `filterByRole("teamlead")` returnt 7 (automation×3 + templates + campaigns×3), `filterByRole("member")` returnt 0 der 11 neuen Items.
- **Verification:**
  - `cd cockpit && npm run test -- sidebar-config` gruen
  - `npm run test:all` gruen
- **Dependencies:** MT-1

### MT-6: Live-Smoke 3-Rollen-Tour
- **Goal:** Browser-Smoke aus 3 Rollen (Admin + Teamlead + Member) bestaetigt AC1+AC2+AC3+AC4+AC5 end-to-end. Per Playwright-MCP wenn moeglich, sonst manuell per Browser-Switch.
- **Files:** keine Code-Aenderung. Optional: Report in `reports/RPT-417-slc711-smoke.md` falls /qa SLC-711 lieber separat.
- **Expected behavior:**
  - Admin-Login auf /settings → 12 Kacheln + alle Sub-Sidebar-Eintraege sichtbar
  - Teamlead-Login auf /settings → 6-8 Kacheln (kein Branding/Payment-Terms/Pipelines/Products/Compliance) + 4-5 Sub-Sidebar-Eintraege
  - Member-Login auf /settings → 3-4 Kacheln + 3 Sub-Sidebar-Eintraege
  - Member auf `/settings/branding` Direct-URL → redirect auf /mein-tag
  - Audit-Log keine neuen settings_*_update-Eintraege (DEC-197)
- **Verification:**
  - Playwright-MCP-Lauf (Pattern aus RPT-411-Live-Smoke) ODER manueller User-Walk
  - audit_log-Query nach Smoke: keine neuen settings_*-Action-Eintraege
- **Dependencies:** MT-1 + MT-2 + MT-3 + MT-4 + MT-5

## Risks & Mitigations

- **Risk R1:** Settings-Layout `"use client"`-Direktive-Konflikt mit Server-Side-Profile-Loading. **Mitigation:** Server-Component-Wrapper-Pattern (Server-Layout uebergibt Items als Prop an unveraenderten Client-Layout). Aufwand ~1h, kein Architektur-Sprung.
- **Risk R2:** `/settings/products`-Page hat heute schon Sidebar-Visibility-Block via SIDEBAR_CONFIG (ADMIN_ONLY), aber Page selbst hat ggf. keinen assertRole-Guard. **Mitigation:** Pruefen in MT-4, ggf. nur Sidebar-Filter-Logic nutzen.
- **Risk R3:** Pages mit dynamischen Routen (`[id]/edit`) brauchen `await params` vor assertRole-Aufruf — Next.js 15 async-params-Pattern. **Mitigation:** Wenn TSC nach MT-4 fehlt, await-Reihenfolge fixen.
- **Risk R4:** `/cadences`-Page (heute SIDEBAR-Setup mit Label "Automatisierung", ADMIN_TEAMLEAD) ist nicht dasselbe wie `/settings/automation` — zwei verschiedene Features. **Mitigation:** /cadences NICHT touchieren in SLC-711. /settings/automation ist die Workflow-Rule-Builder-Page (V6.2).

## Dependencies

- **None** — SLC-711 ist eigenstaendig, baut nur auf V7-Stack (assertRole + SIDEBAR_CONFIG + getProfile bestehend).

## Verification & Tests

- TSC clean fuer alle 12 modifizierten Page-Files + 2 Layout-Files + 1 Test-File
- `npm run test -- sidebar-config` gruen (AC6)
- `npm run test:all` 760+/760+ gruen (kein Regression, AC7)
- Live-Smoke 3-Rollen-Tour (AC1-AC5+AC8)

## Open Points

- Risk R1 Entscheidung (Server-Wrapper vs Client-Refactor) wird in /backend MT-2 final getroffen
- Risk R4 `/cadences`-vs-`/settings/automation`-Trennung pruefen in MT-1 (sidebar-config-File-Lesen)

## Files Reviewed (Slice-Planning)

- `cockpit/src/lib/navigation/sidebar-config.ts`
- `cockpit/src/lib/auth/assert-role.ts`, `types.ts`, `get-profile.ts`
- `cockpit/src/app/(app)/settings/layout.tsx`, `page.tsx`
- `cockpit/src/app/(app)/settings/team/page.tsx` (assertRole-Reference)

## Recommended Implementation Skill

`/backend` fuer MT-1 bis MT-5 (Code-Patches + Tests).
`/qa` fuer MT-6 (Live-Smoke 3-Rollen-Tour). Nach SLC-711 PASS: SLC-712a starten.
