# SLC-852 — V8.5 Compose-Preview tenantSlug-Drift-Fix (ISSUE-081)

- **Feature:** BL-491 / ISSUE-081
- **Version:** V8.5
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-24
- **Estimated:** ~1-1.5h Code-Side
- **Depends-On:** V8.4 SLC-846 (renderBrandedHtml-Signatur mit tenantSlug)
- **Architecture:** Single-Source-of-Truth-Render-Funktion mit Preview-vs-Send-Symmetrie (DEC-095 erweitert)

## Goal

V8.4 ISSUE-081 schliessen: Die Live-Preview im Composing-Studio (`live-preview.tsx`) ruft `renderBrandedHtml(body, branding, vars)` ohne den V8.4-neuen 4. Param `tenantSlug`. Folge: Preview zeigt KEIN DSE-Footer-Block, obwohl Send-Pfad (`lib/email/send.ts`) ihn ergaenzt. User sieht unterschiedlichen HTML-Output zwischen Preview und tatsaechlich-versendeter Mail → Vertrauensbruch.

SLC-852 schliesst die Drift: Server-Component `compose/page.tsx` resolved den aktuellen User-tenantSlug per `getTenantSlugByOwnerUserId(user.id)`, reicht ihn als Prop durch `compose-studio.tsx` an `live-preview.tsx`, und `live-preview.tsx` uebergibt ihn als 4. Param an renderBrandedHtml. Preview ist danach bit-identisch zur Send-Mail (ohne Tracking-Layer, der Hinweis-Box-Text bleibt unveraendert).

## Scope

### IN
- `compose/page.tsx` (Server Component) erweitern um `getTenantSlugByOwnerUserId`-Call + Prop-Down
- `compose-studio.tsx` (Client Component) erweitern um optionalen `tenantSlug?: string` Prop, durchreichen an `LivePreview`
- `live-preview.tsx` erweitern um optionalen `tenantSlug?: string` Prop + renderBrandedHtml-Call mit 4. Param
- Vitest neu: Preview-Render-Helper-Test mit + ohne tenantSlug (Snapshot oder Substring-Check)
- Optional: Playwright-Live-Smoke gegen Compose-Studio → iframe-Content endet mit DSE-Footer-Block

### OUT
- Aenderung der renderBrandedHtml-Signatur (bleibt wie V8.4 SLC-846)
- Aenderung im Send-Pfad (`send.ts`, `send-action.ts` — bleibt wie V8.4-Hotfix)
- send-consent-mail + meeting-briefing Preview (kein Preview-Pfad dort, BL-492 Scope)
- Compose-Studio-Pre-Render in send-action.ts (das ist V8.4 ISSUE-083-Fix-Pattern, bleibt)

## Acceptance Criteria

- **AC1** `compose/page.tsx` liest `user.id` aus `supabase.auth.getUser()` (existing-Pfad), resolved `currentUserTenantSlug` per `getTenantSlugByOwnerUserId(user.id)`, reicht als Prop `currentUserTenantSlug` an `<ComposeStudio>`
- **AC2** `ComposeStudio` Props-Interface erweitert um `currentUserTenantSlug?: string`, reicht als Prop `tenantSlug` an `<LivePreview>`
- **AC3** `LivePreview` Props-Interface erweitert um `tenantSlug?: string`, ruft `renderBrandedHtml(debouncedBody, branding, vars, tenantSlug)` (4. Param) im useMemo
- **AC4** Existing-Vitest in render.test.ts bleibt gruen (11/11)
- **AC5** Neuer Vitest-Case in render.test.ts oder live-preview.test.ts: Render mit `tenantSlug='strategaize-transition-bv'` enthaelt Substring `/p/strategaize-transition-bv/datenschutz`, ohne tenantSlug nicht
- **AC6** TSC + Build + Lint clean (kein neuer Error)
- **AC7** Live-Smoke (User-Action ODER Playwright-MCP, optional): Compose-Studio oeffnen → iframe-DOM enthaelt DSE-Footer-`<tr>`-Block mit `Datenschutzerklaerung`-Link
- **AC8** Bit-Identitaet Preview-vs-Send (manuell oder Vitest-Snapshot-Compare): renderBrandedHtml(body, branding, vars, slug) liefert in beiden Pfaden identischen HTML (ohne Tracking-Pixel)

## Micro-Tasks

### MT-1: compose/page.tsx Server-Side-Resolve

- **Goal:** currentUserTenantSlug aus User-Session resolven + als Prop durchreichen
- **Files:** `cockpit/src/app/(app)/emails/compose/page.tsx`
- **Expected behavior:** Async Server-Component holt user.id, ruft `await getTenantSlugByOwnerUserId(user.id)` (kann null sein), reicht als `currentUserTenantSlug={...}` an ComposeStudio
- **Verification:** TSC clean, Build clean
- **Dependencies:** none

### MT-2: compose-studio.tsx Prop-Pass-Through

- **Goal:** ComposeStudio Props-Interface erweitern + an LivePreview reichen
- **Files:** `cockpit/src/app/(app)/emails/compose/compose-studio.tsx`
- **Expected behavior:** Neue Prop `currentUserTenantSlug?: string`, durchgereicht als `tenantSlug={currentUserTenantSlug}` an `<LivePreview>`
- **Verification:** TSC clean
- **Dependencies:** MT-1

### MT-3: live-preview.tsx renderBrandedHtml mit tenantSlug

- **Goal:** LivePreview Props-Interface erweitern + renderBrandedHtml-Call 4. Param ergaenzen
- **Files:** `cockpit/src/app/(app)/emails/compose/live-preview.tsx`
- **Expected behavior:** Neue Prop `tenantSlug?: string`, useMemo-Dep-Array um tenantSlug erweitert, renderBrandedHtml-Call hat 4. Param
- **Verification:** TSC clean
- **Dependencies:** MT-2

### MT-4: Vitest Preview-vs-Send Bit-Identity Test

- **Goal:** Neuer Vitest-Case verifiziert dass Preview-Render und Send-Render bit-identisch (ohne Tracking-Layer)
- **Files:** `cockpit/src/lib/email/render.test.ts` (modify; existing 11 Tests bleiben gruen)
- **Expected behavior:** Test ruft renderBrandedHtml(body, branding, vars, 'strategaize-transition-bv') zweimal (simuliert Preview + Send), erwartet identischen Output. Plus: Preview-Output mit tenantSlug enthaelt DSE-URL, ohne nicht.
- **Verification:** `npm run test -- render.test.ts` 11+2 = 13 PASS
- **Dependencies:** MT-3

### MT-5: Live-Smoke (Optional)

- **Goal:** Browser-Verifikation Preview = Send
- **Files:** keine (Playwright-MCP-Script oder User-Action)
- **Expected behavior:** Compose-Studio oeffnen, body eingeben, iframe.contentDocument enthaelt `Datenschutzerklaerung:` + Link auf `/p/strategaize-transition-bv/datenschutz`
- **Verification:** Visual oder DOM-Assertion via Playwright-MCP
- **Dependencies:** MT-4 (post Vitest), Deploy nicht notwendig (Worktree-Branch genuegt fuer Live-Smoke nach Coolify-Switch — ABER User-Direktive `feedback_no_coolify_branch_switch_ever`, also Live-Smoke erst nach Master-Merge + Redeploy)

## Risiken

- **R1 (Low)** `getTenantSlugByOwnerUserId` haengt von DB-Roundtrip ab → Server-Component blockt initial render. Mitigation: Pfad ist async, Next.js handelt das ohne extra-Latency.
- **R2 (Low)** User ohne team_id (Solopreneur mit NULL): `getTenantSlugByOwnerUserId` gibt null zurueck, renderBrandedHtml mit `tenantSlug=undefined` zeigt KEINE DSE-Footer (Erwartet, graceful Fallback).
- **R3 (Low)** Vitest-Dep-Array-Drift: useMemo-Dep-Array um tenantSlug erweitert. ESLint-Rule react-hooks/exhaustive-deps catches.

## Verification

- Vitest 1116 + 2 neu = 1118/1118 PASS
- TSC + Build + Lint clean
- Live-Smoke: Preview-iframe enthaelt DSE-Footer-Block
- Cockpit zeigt SLC-852 done + ISSUE-081 resolved

## Worktree-Isolation

Branch: `slc-852-compose-preview-tenantslug-fix` (optional fuer Internal-Tool).
