# Known Issues

### ISSUE-085 — 8 TSC-Errors in 4 unrelated Test-Files (pre-existing nach Next 16 / TypeScript-Major-Upgrade) [RESOLVED 2026-05-26]
- Status: resolved
- Severity: Medium
- Resolution: V8.6 SLC-861 MT-2..MT-5 (2026-05-26). (a) useVoiceCapture.test.tsx Z.69 mock.calls-Cast per `feedback_vitest_mock_calls_typescript_cast`-Pattern. (b) reverse-charge-revert + skonto-revert.test.ts Patch-Object-Cast via `Parameters<typeof patchTouches...>[0]`. (c) vies-client.ts Source-Side-Loosening: `isViesEnabled(env: Record<string, string | undefined>)` + `lookupVatId({env?: Record<string, string | undefined>})` statt `NodeJS.ProcessEnv` — `process.env` als Default bleibt structural-compatible. (d) `package.json scripts.test:tsc = "tsc --noEmit"` + Erweiterung `test:all`-Script. Verifikation: `npm run test:tsc` exit 0 (8 Errors → 0), `npm run test` 1135/1135 PASS unveraendert, `npm run lint` 142e/57w EXACT V8.5-Baseline.
- Area: Test-Infra / TypeScript-Hygiene
- Summary: `npx tsc --noEmit` produziert 8 Errors in 4 Test-Files die NICHT im SLC-852-Scope liegen. Errors sind pre-existing, vermutlich nach Next.js 16 + TypeScript-Major-Upgrade ohne Test-Folge-Anpassung. Production-Build (`npm run build`) skipt Test-Files via `tsconfig.json` `exclude`-Pattern → kein Production-Code-Bug. Vitest (`npm run test`) laeuft via ESBuild/Vite ohne TSC-strict-Check und ist 1118/1118 PASS.
  Betroffen:
  - `cockpit/src/components/ki-workspace/hooks/__tests__/useVoiceCapture.test.tsx(69,36)` TS2493 Tuple type '[]' of length '0' has no element at index '0'
  - `cockpit/src/lib/proposal/reverse-charge-revert.test.ts(16,38)` TS2559 Type '{ title?: string }' has no properties in common with type 'ReverseChargeTouchingPatch'
  - `cockpit/src/lib/proposal/skonto-revert.test.ts(19,31)` TS2559 (gleicher Mechanismus)
  - `cockpit/src/lib/validation/vies-client.test.ts` (5 Errors auf Zeilen 13/17/21/105/224) TS2345 + TS2741 NODE_ENV-Drift in ProcessEnv-Argument-Type
- Impact: KEIN Production-Code-Bug. KEIN Test-Coverage-Loss (Vitest laeuft, alle Tests PASS). NUR `npx tsc --noEmit`-Lauf zeigt Errors — bei einem hypothetischen Pre-Commit-Hook auf `tsc --noEmit` waere das blockierend.
- Workaround: Keiner noetig — Production-Pipeline (Build + Vitest) ist clean. `npx tsc --noEmit` ist kein Mandatory-Step im /qa-Flow (Build + Vitest reichen).
- Discovery: V8.5 SLC-852 /frontend (RPT-539) 2026-05-24 — `npx tsc --noEmit` als Sanity-Check, 8 unrelated Errors aufgefallen. NICHT durch SLC-852 verursacht (per `git diff --name-only HEAD`-Vergleich verifiziert: nur 4 Files im Slice-Scope, alle 4 erscheinen NICHT in den 8 Error-Stacks).
- Next Action: V8.6 Test-Hygiene-Slice mit ISSUE-084 bundeln (~30-45 Min). Konkret: (a) useVoiceCapture.test.tsx Tuple-Initialisierung mit Length>0, (b) reverse-charge-revert.test.ts + skonto-revert.test.ts Patch-Object-Typing-Fix (vermutlich Touching-Patch-Type-Drift), (c) vies-client.test.ts ProcessEnv-Mock mit NODE_ENV='test' ergaenzen. Plus: in vitest.config.ts oder package.json einen `test:tsc`-Script ergaenzen der `tsc --noEmit` haengt → automatische Detection bei naechstem CI/QA-Lauf.

### ISSUE-084 — V8.4 legal-documents-rls.test.ts 4 Tests UNIQUE-Konflikt mit MIG-038 Phase-5 Default-Seed (pre-existing V8.4) [RESOLVED 2026-05-26]
- Status: resolved
- Severity: Medium
- Resolution: V8.6 SLC-861 MT-1 (2026-05-26). Default-Seed-Backup-Restore-Pattern in `__tests__/rls/legal-documents-rls.test.ts`: `beforeAll` backuppt alle existing legal_documents-Rows fuer Tenant-A + Tenant-B in `defaultSeedRows`-Variable, `beforeEach` DELETEs alle Rows beider Test-Tenants (leeren State pre-Test), `afterAll` Re-INSERTed Default-Seed-Rows idempotent via `ON CONFLICT (id) DO NOTHING`. Test-Lauf auf Coolify-DB via node:22 + business-net: 7/7 PASS (vs Baseline 3/7 PASS + 4/7 FAIL). Default-Seed-State Production-DB post-Test verifiziert restauriert (2 Rows mit original updated_at, 0 Test-Pollution-Rest). Full RLS-Suite 121/121 PASS (4 Test-Files: legal-documents-rls + custom-reports-rls + helper-functions + v7-rls-matrix).
- Area: Test-Infra / V8.4 / legal_documents RLS-Suite
- Summary: `cockpit/__tests__/rls/legal-documents-rls.test.ts` (V8.4 SLC-841 MT-3) failt 4/7 mit `duplicate key value violates unique constraint "legal_documents_tenant_team_id_kind_key"` beim Tenant-A-Admin-INSERT. Root-Cause: MIG-038 Phase 5 (SLC-842) seedete fuer alle existing Teams 1 Default-customer-dse-Row (Team-077 + Strategaize-Team). Test-Suite `beforeEach`-Cleanup hat Filter `content_md LIKE '[TEST-SLC-841]%'` und faengt den Seed-Row NICHT — UNIQUE(tenant_team_id, kind)-Constraint blockt jeden weiteren INSERT customer-dse fuer Tenant-A. Pre-existing seit V8.4 Phase-5-Apply 2026-05-23, in V8.4 /qa (RPT-528) nicht entdeckt weil Gesamt-RLS-Suite damals nicht gelaufen ist. Discovery in V8.5 SLC-851 /qa (RPT-538) 2026-05-24.
- Impact: RLS-Coverage-Gap fuer V8.4 legal_documents-Feature in Live-DB-Tests — 4 von 7 Tests koennen nicht beweisen was sie sollten (Admin-INSERT, Member-SELECT, Member-UPDATE-blocked, UNIQUE-Constraint-Wirkung). Kein Production-Code-Bug — die V8.4-Live-Smokes haben das Feature E2E verifiziert (RPT-531+532). Tests sind FALSE-NEGATIVE wegen Test-Hygiene-Drift, nicht weil das Feature broken ist.
- Workaround: Vor Test-Run manuell `DELETE FROM legal_documents WHERE tenant_team_id IN ('00000000-0000-0000-0000-000000000077', '<strategaize-team-uuid>');` — aber das zerstoert den Default-Seed-State, daher nicht empfohlen fuer Multi-Run-Szenarien.
- Discovery: V8.5 SLC-851 /qa (RPT-538) 2026-05-24 — Gesamt-RLS-Suite-Run gegen Coolify-DB zeigte 163 Tests gesamt, 4 failed im legal-documents-rls.test.ts. Stack-Trace verifizierte UNIQUE-Konflikt mit Default-Seed-Row.
- Next Action: V8.6+ Backlog-Item Test-Hygiene-Slice: (a) Test-Tenant-IDs verwenden die NICHT im V7-Seed enthalten sind (z.B. nur `00000000-0000-0000-0000-0000000b8841` Tenant-B fuer alle Operations + cleanup via CASCADE-on-team-DELETE), ODER (b) `beforeEach`-Cleanup um Default-Seed-Rows fuer Test-Tenant erweitern + nach Tests Default-Seed restaurieren via Re-Insert. Aufwand: ~30-45 Min Test-Refactor. Plus: `npm run test:all` sollte in CI/Pre-Deploy laufen — V8.4 hat das uebersehen.

### ISSUE-083 — V8.4 sendComposedEmail rendert HTML ohne tenantSlug + reicht als params.html (SLC-846 Patch-Gap auf Compose-Pfad) [RESOLVED 2026-05-23]
- Status: resolved
- Severity: High (V8.4-Feature broken: DSE-Footer-Auto-Insert fehlt komplett in allen Composing-Studio-Mails)
- Area: Backend / V8.4 SLC-846 Mail-Footer-Auto-Insert / Compose-Action-Patch-Gap
- Summary: SLC-846 hat `cockpit/src/lib/email/send.ts` (sendEmailWithTracking) korrekt erweitert — `tenantSlug` wird aus `params.ownerUserId` per `getTenantSlugByOwnerUserId` aufgeloest und an `renderBrandedHtml` uebergeben. ABER der Compose-Pfad `cockpit/src/app/(app)/emails/compose/send-action.ts` Zeile 100 rendert den HTML **vorher** ohne tenantSlug und reicht ihn als `params.html` an sendEmailWithTracking. In send.ts Zeile 103-105 greift dann der Shortcut `if (params.html) htmlContent = params.html` → der else-branch mit dem tenantSlug-Lookup wird fuer den Compose-Pfad NIE ausgefuehrt. Folge: alle Mails aus dem Composing-Studio enthalten **keinen DSE-Footer**, obwohl SLC-846 als "deployed" gilt und Vitest 11/11 in render.test.ts PASS war. **Vitest hat den Bug nicht catchen koennen, weil render.test.ts nur die Render-Funktion direkt mit `tenantSlug` gesetzt testet — der Caller-Site sendComposedEmail wurde nie in der Test-Suite traversiert.**
- Impact: V8.4 SLC-846-Feature ist code-side "fertig" deployed aber funktional 100% broken fuer den primaeren Caller (Composing-Studio). Der send-consent-mail.ts und meeting-briefing.ts-Pfade sind separat (MT-3 + MT-4 von SLC-846) — diese mussen separat verifiziert werden, ob sie auch das Pre-Render-Anti-Pattern haben oder den else-branch in send.ts treffen.
- Workaround: Keiner. User-Discovery 14:20 UTC via Mail-Postfach-Verify: Mail kam an mit Branding-Footer (Richard Bellaerts + Strategaize transition BV + Adresse), aber OHNE den DSE-Footer-Block.
- Discovery: User-Postfach-Check 2026-05-23 14:20 UTC nach MIG-040-Fix. Mail erhalten, aber Footer-Inhalt zeigt nur Branding, kein "Datenschutzerklaerung: <URL>". DB-Verify: `emails`-Row hat `owner_user_id=96322a0a-...` (Richard) korrekt gesetzt, NEXT_PUBLIC_APP_URL ist korrekt gesetzt. Code-Walkthrough zeigte den Pre-Render-Pfad in sendComposedEmail.
- Resolution: Code-Fix in `cockpit/src/app/(app)/emails/compose/send-action.ts`: Import von `getTenantSlugByOwnerUserId`, Auflosung `const tenantSlug = profile.user_id ? (await getTenantSlugByOwnerUserId(profile.user_id)) ?? undefined : undefined`, Erweiterung des renderBrandedHtml-Aufrufs um den vierten Param. Commit folgt. Coolify-Redeploy erforderlich (Code-Change).
- Next Action: (a) User-Redeploy via Coolify nach Commit. (b) Re-Smoke S4 — Test-Mail erwartet jetzt DSE-Footer im HTML-Source. (c) send-consent-mail.ts + meeting-briefing.ts auf gleichen Pre-Render-Bypass-Pattern pruefen (Code-Audit-Followup, V8.5 BL-492). (d) Skill-Improvement Dev-System: bei Feature-Slices die einen zentralen Render-Pfad erweitern (DEC-095 Single-Source-of-Truth) MUSS Vitest auch die Caller-Sites traversieren, nicht nur die Funktion direkt. Plus: stale Code-Kommentar in send.ts Zeile 102 "params.html ueberschreibt den Renderer (heute nirgendwo gesetzt, Backwards Compat)" — der Kommentar ist falsch, sendComposedEmail SETZT params.html.

### ISSUE-082 — V8.4 emails.owner_user_id Spalte fehlte (MIG-033 hat outgoing-emails-Tabelle vergessen) [RESOLVED 2026-05-23]
- Status: resolved
- Severity: Blocker (Production-Mail-Send seit V8.4-Deploy 2026-05-23 09:18 UTC bis ~14:08 UTC komplett broken)
- Area: Backend / V7 SLC-704 Migration-Drift / V8.4 SLC-846-Trigger
- Summary: MIG-033 (V7 SLC-704, 2026-05-14) hat `owner_user_id`-Spalte auf 8 Kerntabellen ergaenzt (companies, contacts, deals, activities, meetings, proposals, email_messages, calls). Die outgoing-Mail-Tabelle `emails` (separate Tabelle von `email_messages`!) wurde dabei vergessen — keine ALTER TABLE-Anweisung in `033_v7_schema.sql`. Code in `cockpit/src/lib/email/send.ts` Zeilen 133+232 inserted aber `owner_user_id` wenn `params.ownerUserId` truthy. Vor V8.4: kein Compose-Caller setzte ownerUserId → INSERT-Spread `...(params.ownerUserId ? { owner_user_id: ... } : {})` liess die Spalte einfach weg → kein DB-Error, alle Mails gingen durch. **Mit V8.4 SLC-846** ergaenzte sendComposedEmail um `ownerUserId` (Pflicht-Param fuer tenantSlug-Lookup im DSE-Footer-Render-Pfad). Ab V8.4-Redeploy (2026-05-23 09:18 UTC) failt jeder Mail-Send aus dem Composing-Studio mit roter Fehlermeldung `Could not find the 'owner_user_id' column of 'emails' in the schema cache`. **0 emails-Rows insert.** SMTP wird gar nicht erst aufgerufen (Insert vor Send).
- Impact: BLOCKER. Alle outgoing-Mails via Composing-Studio (Compose-Form, Follow-up-Templates, KI-Verbesserung) gingen 5h lang gar nicht raus. Cadence-Mails + Cron-Pfade (meeting-briefing, automation-runner) sind nur dann betroffen, wenn diese sendEmailWithTracking mit ownerUserId aufrufen — siehe Code-Audit-Followup.
- Workaround: Keiner. User hat zwischen 09:18 UTC und 14:08 UTC vermutlich keine Mail versandt — anders waere der Fehler frueher entdeckt worden.
- Discovery: User-Browser-Smoke im Composing-Studio 2026-05-23 ~14:05 UTC. User schickte gerade einen Test-Send mit angewendeter Template, roter Banner ueber Senden-Button zeigte den Schema-Fehler. Screenshot via User-Message in der Smoke-Session.
- Resolution: MIG-040 angelegt + auf Production appliziert 2026-05-23 ~14:08 UTC via SSH+base64. ALTER TABLE emails ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL + CREATE INDEX + NOTIFY pgrst. Verify-Block PASS. Code blieb unveraendert.
- Next Action: (a) Re-Smoke S4 vom User: nochmal Mail via Composing-Studio senden, jetzt sollte INSERT durchgehen. (b) Code-Audit: pruefen ob weitere Tabellen aus V7-Owner-Scope vergessen wurden (`grep -rE "owner_user_id" cockpit/src/lib | awk` gegen `\\d <table>` auf der DB). (c) Skill-Improvement im Dev-System: `feedback_migration_must_cover_all_writes` — bei Owner-Scope-Migrationen MUSS jeder `INSERT/UPDATE`-Site mit der Spalte gegen die Migration-File verifiziert werden.

### ISSUE-081 — Composing-Studio Live-Preview ruft renderBrandedHtml ohne tenantSlug (Pre-Drift Preview vs. Send) [RESOLVED 2026-05-24]
- Status: resolved
- Severity: Medium
- Resolution: V8.5 SLC-852 (2026-05-24). Server-Component `compose/page.tsx` resolved `currentUserTenantSlug` per `getTenantSlugByOwnerUserId(user.id)` (Pattern aus V8.4 send-action.ts), reicht als Prop durch `compose-studio.tsx` an `live-preview.tsx`, dort als 4. Param an `renderBrandedHtml(debouncedBody, branding, vars, tenantSlug)` mit useMemo-Dep-Array-Update. Render-Output Preview = Send bit-identisch (DEC-095 SST). Vitest +2 Cases in render.test.ts (13/13 PASS): "Preview = Send bit-identical with tenantSlug" + "Preview = Send bit-identical without tenantSlug Solopreneur-Fallback". Tracking-Layer bleibt out-of-scope (wird erst im Send-Pfad appliziert, Hinweis-Box-Text in live-preview.tsx unveraendert).
- Area: Frontend / V8.4 Composing-Studio / SLC-846
- Summary: Die Live-Preview im `/emails/compose` Composing-Studio (compose-studio.tsx + render.ts) ruft `renderBrandedHtml(body, branding, vars)` ohne den `tenantSlug`-Param auf. Folge: Die Preview zeigt KEIN DSE-Footer-Block ("Datenschutzerklaerung: <URL>"), obwohl der echte Send-Pfad (`lib/email/send.ts` Zeilen 111-118) den tenantSlug aus `params.ownerUserId` aufloest und an renderBrandedHtml uebergibt. User sieht in der Preview einen anderen HTML-Output als die tatsaechlich versendete Mail. SLC-846 R1 ("Bit-fuer-Bit-Regression-Safety") hat den Drift-Pfad explizit so ausgelegt — der DSE-Footer ist optional bei tenantSlug=undefined — aber die Preview wurde nicht analog erweitert.
- Impact: Vertrauen in die Preview wird reduziert. User kann Footer-Wirkung nicht visuell pruefen vor Send. Funktional unkritisch: der echte Send-Pfad hat den Footer (per render.test.ts Vitest 11/11 PASS in /qa SLC-846 RPT-528). Risiko: User koennte den Eindruck haben, der Footer fehle in der Mail.
- Workaround (pre-SLC-852): Vor Customer-Live einfach 1x echte Test-Mail an sich selbst senden und HTML-Source pruefen — bestaetigt den Send-Pfad. Preview als Layout/Body-Vorschau verstehen, nicht als 1:1-Send-Vorschau.
- Discovery: V8.4 RPT-532 Playwright-Smoke 2026-05-23: iframe-Inhalt der Compose-Preview ausgelesen via `document.querySelector('iframe').contentDocument.documentElement.outerHTML.slice(-500)` — letzte 500 Zeichen enden mit `Strategaize Transition GmbH | Am Markt 19 | Swalmen | NL</td></tr></tbody></table></body></html>` ohne DSE-Footer-Block.

### ISSUE-080 — V8.4 SLC-841 Backfill ignoriert reserved-slugs.ts Liste (Slug-Collision-Bug) [RESOLVED 2026-05-24]
- Status: resolved
- Severity: Medium
- Resolution: V8.5 SLC-851 / MIG-039 (APPLIED 2026-05-24). PL/pgSQL Function `public.is_reserved_slug(text)` + Trigger `teams_reserved_slug_guard BEFORE INSERT OR UPDATE OF slug ON teams` wirft RAISE EXCEPTION ERRCODE 23514 bei Reserved-Treffer. Reserved-Liste in der DB-Function ist Mirror von `reserved-slugs.ts` (38 Strings). Sync-Pflicht TS↔SQL dokumentiert in Memory `feedback_reserved_slug_sst_pattern.md`. Vitest 4/4 PASS gegen Coolify-DB.
- Area: Backend / V8.4 Customer-DSE / Slug-Generator
- Summary: MIG-038 Phase 2 Backfill (SLC-841 SQL `DO $$ ... lower(replace(...)) ... $$`) prueft NICHT gegen die TypeScript-Reserved-Liste `cockpit/src/lib/team/reserved-slugs.ts`. Bei V8.4 Live-Smoke 2026-05-23 trat der erste Real-Fall auf: Team "Strategaize" wurde via Backfill zu Slug `strategaize` — aber `strategaize` ist in RESERVED_SLUGS (Strategaize-Common-Reserved). Public-Route `/p/strategaize/datenschutz` ruft `isReservedSlug("strategaize") → true → notFound()` → HTTP 404 statt 200. Slug-Generator-TS (SLC-842 `generateUniqueSlug`) haette beim Neuanlegen `strategaize-2` erzeugt — der Backfill-SQL-Pfad ist eine separate Implementierung ohne diese Defense.
- Impact: Bei Tenant-Onboarding-Flow ab V8.5+ (Multi-Tenant) wuerden Team-Namen die exakt Reserved-Slugs matchen falsch backfilled. Workaround fuer V8.4: Single-Tenant (1 Team) — manueller SQL-UPDATE auf neuen Slug `strategaize-transition-bv`. RLS + Public-Route + Editor funktionieren danach normal.
- Workaround: V8.4 Live-Fix 2026-05-23: `UPDATE teams SET slug='strategaize-transition-bv' WHERE slug='strategaize'; NOTIFY pgrst, 'reload schema';` — danach Public-Route HTTP 200, alle Live-Smokes PASS.
- Discovery: V8.4 SLC-847 MT-3 Live-Smoke S2 — curl `/p/strategaize/datenschutz` returnt HTTP 404 trotz korrekt-existing DB-Row + content_md=10205. HTML-Inspect zeigte `NEXT_HTTP_ERROR_FALLBACK;404` aus notFound()-Branch. Root-Cause via Code-Walkthrough: `isReservedSlug(tenantSlug)`-Check vor DB-Lookup.
- Next Action: V8.5 Backlog (BL-490): Folge-Migration `MIG-039` die (a) reserved-slugs-Liste in PL/pgSQL portiert ODER (b) Trigger BEFORE INSERT/UPDATE auf teams.slug der Reserved-Check enforced. Empfehlung: Single-Source-of-Truth — Reserved-Liste in DB-Function `is_reserved_slug(text)` + Backfill-SQL + Slug-Trigger ruft sie. TypeScript-Liste wird daraus generiert oder spiegelt sie. Plus Skill-Improvement-Eintrag im Dev-System (`feedback_sql_translate_no_multi_char_expansion` ergaenzen um Reserved-Check).

### ISSUE-079 — Duplicate Backlog-ID BL-442 in planning/backlog.json (V6.5 + V7.6 beide ID BL-442)
- Status: open
- Severity: Low
- Area: Project Records / Cockpit-Parser
- Summary: planning/backlog.json enthaelt zwei verschiedene Eintraege mit derselben ID `BL-442`: (1) "V6.5 Theming Phase A — Brand-Tokens" status `done` 2026-05-08 SLC-651, (2) "Custom-Reports — User legt eigene Berichts-Vorlagen im KI-Workspace an" status `in_progress` V7.6 (FEAT-762). Beide haben semantisch eigenstaendige Inhalte und sind beide gewuenscht — der Konflikt entstand durch unabhaengiges ID-Vergabe ohne uniqueness-check.
- Impact: Cockpit-Backlog-Parser-Verhalten bei Duplicate-Keys ist undokumentiert. Vermutlich zeigt der Parser den ersten Match oder erzeugt einen JSON-Key-Conflict. Funktional unkritisch — beide Items haben eigene Lifecycles, Slice-Mapping geht ueber features/INDEX.md + slices/INDEX.md. Risk: V7.6-Backlog-Progress wird in der Cockpit-Roadmap-Progress-Bar evt. inkorrekt angezeigt.
- Workaround: Bis-Fix funktioniert das System ueber features/INDEX.md + slices/INDEX.md als Source-of-Truth. Cockpit-Roadmap-V7.6-Progress kann manuell verifiziert werden.
- Discovery: V7.6 /slice-planning RPT-468 — beim Read von backlog.json fuer Slice-Mapping aufgefallen, `grep '"id": "BL-442"' planning/backlog.json` zeigt 2 Treffer.
- Next Action: Hygiene-Fix in V7.7+: Eine der beiden Duplicate-IDs umnummerieren (Empfehlung: V6.5-Eintrag bekommt naechste freie BL-Nummer, V7.6-Eintrag behaelt BL-442 weil FEAT-762 + RPT-466 darauf referenzieren). Plus IMP-644 (Dev-System) — Skill-Improvement fuer Backlog-ID-Uniqueness-Check vor Insert.

### ISSUE-078 — Sonner-Toast rendert nicht client-side im Cockpit (Turbopack 16.2 Hydration-Issue)
- Status: open
- Severity: Low
- Area: Frontend / Infra / Turbopack / Sonner-Library
- Summary: Onboarding-Plattform-Pattern (sonner@^2.0.7 + Toaster im RootLayout + toast.success-Call client-side) wurde 1:1 in Business System portiert, rendert aber keinen Toast. Live-Smoke RPT-460 zeigte: Sonner-Library wird komplett aus dem client bundle tree-shaked (kein `data-sonner-toaster`, kein `toaster group`-className, kein `Notifications alt+T` in Static-Chunks), nur SSR-Markup vom leeren `<section aria-label="Notifications alt+T">` erscheint. toast.success() laeuft fehlerfrei (kein Console-Error), aber rendert keinen Toast.
- Impact: NL-Rule-Builder Apply hat aktuell keine visuelle Success-Confirmation. Funktional unkritisch — Modal schliesst + Card-Reset signalisiert Erfolg, Soft-Dedup (SLC-754 AC6) faengt versehentliches Wieder-Apply.
- Workaround: Card-State-Reset (SLC-757 Variante A) bleibt als implizites Feedback. Toast-Integration aus Code zurueckgezogen.
- Discovery: SLC-757 MT-6 Live-Smoke, 3 Iterations + 2 Fix-Versuche (e82bda9 "use client" Zeile 1, cad02d0 Wrapper-Delete + Direct-Import), beide ohne Effekt. RPT-460.
- Next Action: Eigener Mini-Slice in V7.6 — Reproducer in isoliertem Mini-Next-16.2.3-Repo bauen, Turbopack-Behavior gegen Webpack-Fallback vergleichen, ggf. Next.js-Bugreport. Versions-Diff zu Onboarding: Next 16.1.1 → 16.2.3 (vermutliche Regression). Workaround-Idee: Toaster-Mount via Client-Component-Wrapper unterhalb (app) layout statt RootLayout. Bedeutung niedrig — funktionaler Code laeuft, nur UX-Politur.

### ISSUE-077 — NL-Rule-Builder Card-State-Reset + Success-Toast bleiben aus nach Apply (SLC-754 Live-Smoke)
- Status: resolved
- Severity: Medium
- Area: Frontend / Mein-Tag / NL-Rule-Builder / SLC-754
- Summary: Nach erfolgreichem `applyNlRule()` (Rule + Audit-Log INSERT serverseitig verifiziert) schliesst zwar das Confirm-Modal, aber die Klarsprache-Karte, Schema-Karte, Preview-Karte und Apply-Button bleiben unveraendert in der UI sichtbar. Textarea-Wert + `nl-rule-builder-clarsprache` + `preview-result-card` weiterhin gerendert, Apply-Button weiterhin enabled. Kein Success-Toast sichtbar (toastCount=0 nach 3s+8s Wait). AC5 spezifiziert: "Toast 'Regel aktiviert' + Modal-Close + Card-State-Reset" — Modal-Close erfuellt, die anderen zwei nicht.
- Impact: User koennte versehentlich die gleiche Rule erneut aktivieren (Soft-Dedup AC6 wuerde den 2. Apply fangen, aber UX-Confusion). Keine Server-Side-Konsequenz — Rule + Audit sind sauber persistiert. UI-State-Reset-Bug.
- Workaround: Page-Reload setzt UI zurueck. Rule wird trotz fehlendem Visual-Feedback korrekt erstellt.
- Discovery: SLC-754 /qa Live-Smoke RPT-453, 2026-05-17 ~10:27 UTC. Manuell verifiziert: dialogStillOpen=false, clarspracheVisible=true, previewVisible=true, applyButtonExists=true+!disabled, toastCount=0.
- Next Action: Pruefe `nl-rule-builder-card.tsx` Apply-Success-Handler — vermutlich fehlen `setSculptResult(null)`, `setPreviewResult(null)`, `setNlInput("")`, `setLastSculptAuditId(null)`-Calls. Toast-Integration: Sonner-Toaster-Mount im RootLayout pruefen (`<Toaster />`-Komponente vorhanden?), und `toast.success("Regel aktiviert")`-Call in Apply-Success-Path verifizieren. Folge-Slice oder Fast-Fix in V7.5.
- Resolution: SLC-757 MT-3 (Commit d2f7082) — `handleApply()` ruft nach `res.ok` `handleNewRule()` (Card-State-Reset komplett: Textarea, Schema, Preview, Apply-CTA, Banner, Modal). Apply-Success-Banner-Block + applySuccess-State entfernt. Live-Smoke 3 Iterations RPT-460 gegen Coolify-Image (zuletzt cad02d0): Card-State-Reset PASS in allen 3 Iterations (textarea-value="", schema/preview/apply-cta/banner alle weg). Toast-Teil als ISSUE-078 abgespalten (Turbopack-Hydration-Issue, nicht SLC-757-Scope).

### ISSUE-076 — Sculptor-PRICING-Coverage-Gap fuer Coolify-LLM_MODEL Kurz-Form
- Status: resolved
- Severity: Low
- Area: AI / Bedrock / SLC-752 Sculptor-Cost
- Summary: Production-Coolify-ENV `LLM_MODEL=eu.anthropic.claude-sonnet-4-6` (Kurz-Form) war nicht in `sculptor-cost.ts` PRICING-Table. Bestehende Eintraege nur Lang-Form `...-20250514-v1:0`. Folge: `safeCalculate` fing UnknownModelPricingError und returnte cost=0, Render-Condition `totalCostUsd > 0` evaluierte false, Cost-Display rendert nicht.
- Impact: SLC-753 AC7 FAIL in Run-1 (08:14:39 UTC 2026-05-17). User sah keine Bedrock-Kosten. audit_log persistiert cost=0 statt echtem Cost-Wert. Kein Funktions-Bug im Sculpt-Pfad selbst.
- Discovery: SLC-753 Live-Smoke RPT-450 — erste echte Production-Sculpt-Anfrage.
- Resolution: Hotfix-Branch `hotfix/slc-753-pricing-short-id` Commit `bafe9ca` (2026-05-17). 2 Kurz-Form-Aliase ergaenzt (`anthropic.claude-sonnet-4-6` + `eu.anthropic.claude-sonnet-4-6`) mit identischem Pricing wie Lang-Form. +2 Vitest. Re-Smoke Run-2 (08:25:22 UTC) cost=0.009312 in audit_log, UI rendert "Bedrock-Kosten: ~$0.009 fuer 1 Versuch".
- Next Action: Optional — Coolify-ENV `LLM_MODEL` auf Lang-Form `eu.anthropic.claude-sonnet-4-6-20250514-v1:0` korrigieren als Best-Practice. PRICING-Code-Pfad ist via Alias abgesichert, aber Lang-Form ist die kanonische AWS-ID.

### ISSUE-075 — Production-User immo@bellaerts.de im Test-Team-77 (BL-470-Smoke-Test-Artefakt nicht aufgeraeumt)
- Status: resolved
- Severity: Medium
- Area: Production-DB / Daten-Hygiene / BL-470-Followup
- Summary: Profile `7bdd1faf-7d72-4ffb-8c78-66c3481290ba` (email `immo@bellaerts.de`, display_name "Richard", role=member) sitzt im Test-Team `00000000-0000-0000-0000-000000000077` ("[TEST] Test-Team") seit 2026-05-14 15:56:50 — eine Minute nach Richards Production-Login um 15:55. Vermutlich BL-470 Invite-Flow-Smoke-Test 2026-05-14 (User Richard hat sich selbst eingeladen, Smoke-Test landete im Test-Team-77 als Invite-Default). Nicht aufgeraeumt seit 2026-05-14. Echter Production-Admin ist UUID `96322a0a-be2d-49e1-ba0d-03c4de1f1440` (email `richard@bellaerts.de`, role=admin, team=`fa0ff2b6-...` "Strategaize").
- Impact: Kein Production-Code-Bug, kein Security-Issue (RLS funktioniert weiterhin korrekt — Member-Profile im Test-Team sieht nur Test-Team-Daten). Aber: Production-DB-User-Hygiene-Drift. Konkrete Folgen: (1) Falls User sich versehentlich mit immo@bellaerts.de einloggt, landet er als Member im Test-Team statt im Strategaize-Team mit Admin-Rechten. (2) Causes aggregate-queries.test.ts 2/6 FAILs (siehe ISSUE-073). (3) Test-Team-Cockpit zeigt 6 statt 5 Members — verfaelscht jede Cross-Team-Aggregat-Statistic in Tests.
- Workaround: Keiner — User muss entscheiden.
- Next Action: **User-Entscheidung erforderlich** zwischen 3 Optionen:
  - (a) **Complete Delete**: `DELETE FROM profiles WHERE id = '7bdd1faf-...'` + `DELETE FROM auth.users WHERE id = '7bdd1faf-...'` (Cleanup, falls Account nicht weiter gebraucht wird).
  - (b) **Team-Nullsetzung**: `UPDATE profiles SET team_id = NULL WHERE id = '7bdd1faf-...'` (Account bleibt, ist aber kein Test-Team-Member mehr).
  - (c) **Team-Wechsel**: `UPDATE profiles SET team_id = 'fa0ff2b6-...', role = 'admin' WHERE id = '7bdd1faf-...'` (Account ins richtige Strategaize-Team als Second-Admin verschieben).
- Reported: 2026-05-15 (Gesamt-/qa V7.1, RPT-425).
- Resolved: 2026-05-15 — User-Entscheidung Option (a) Complete Delete. Auf Hetzner-91.98.20.191 ausgefuehrt: `BEGIN; DELETE FROM profiles WHERE id = '7bdd1faf-...'; DELETE FROM auth.users WHERE id = '7bdd1faf-...'; COMMIT;`. CASCADE entfernt 1 user_settings + 1 auth.sessions + 4 auth.refresh_tokens + 1 auth.identities. Verifikation: profiles 1→0, auth.users 1→0, alle auth-Cascade-Tables 0. Test-Team-77 jetzt wieder bei erwarteten 6 Members (1 Teamlead + 5 Test-Members). aggregate-queries.test.ts 6/6 PASS nach Cleanup re-verified.

### ISSUE-074 — vitest.rls.config.ts fehlt tsconfig-paths-Resolver fuer `@/...` Aliases (pre-existing V7-Test-Infra-Bug)
- Status: resolved
- Resolved: 2026-05-16 — V7.2 SLC-721 MT-2 (Commit `1b2e046`). `cockpit/vitest.rls.config.ts` erhielt `resolve.alias`-Block (Pattern-Reuse aus `vitest.config.ts:14-18`). 7 Bulk-Reassign-Test-Suites laufen jetzt — `npm run test:rls -- bulk-reassign.test.ts` zeigt 20 PASS (vorher 0).
- Severity: Medium
- Area: Test-Infra / vitest-Config / Path-Alias-Resolution
- Summary: `cockpit/vitest.rls.config.ts` hat keinen Path-Alias-Resolver konfiguriert. Folge: `__tests__/team/bulk-reassign.test.ts` importiert `../../src/lib/team/bulk-reassign`, das Source-File macht `import { getPgClient } from "@/lib/db/pg"` (Z.15) — Resolver kann `@/...` nicht aufloesen → `Error: Cannot find package '@/lib/db/pg' imported from /app/src/lib/team/bulk-reassign.ts`. Test-File laedt mit 0 Tests, vitest markiert als FAIL. Pre-existing seit SLC-707 (Bulk-Reassign-Test-Setup 2026-05-12). Die Default-vitest.config.ts hat den Alias-Resolver via Next.js-Plugin — daher 779/779 PASS in der jsdom-Suite.
- Impact: 7 Bulk-Reassign-Test-Suites (validateBulkReassignInput, assertCanReassign, buildFilterClause, countAffectedPerTable, applyReassignPerTable, Audit-Trail Phase 2, Two-Phase-Audit-Integrity) koennen nicht laufen — keine RLS-Live-DB-Confidence fuer SLC-707-Bulk-Reassign-Pfad. V7.1-Code-Pfad unbetroffen (V7.1 modifiziert `bulk-reassign-actions.ts` Wrapper, nicht `bulk-reassign.ts` Pure-Core, und der Wrapper-Test laeuft in der Default-jsdom-Suite via `bulk-reassign-actions.test.ts`).
- Workaround: Keiner — RLS-Live-DB-Confidence fuer Bulk-Reassign-Pfad fehlt.
- Next Action: V7.2-Cleanup-Slice SLC-721 MT-2: vitest.rls.config.ts erweitern mit `resolve.alias` (Pattern-Reuse aus `vitest.config.ts:14-18`). **Korrektur 2026-05-16**: `vite-tsconfig-paths` ist NICHT in dependencies installiert (falscher Befund im urspruenglichen ISSUE-074-Wording). DEC-203 waehlt deshalb bewusst `resolve.alias` statt Plugin (kein neuer dep, Pattern-Reuse, identisch zu Default-Config). Nach Fix: `bulk-reassign.test.ts` muss 7 Test-Suites mit echten Counts laufen.
- Reported: 2026-05-15 (Gesamt-/qa V7.1, RPT-425).

### ISSUE-073 — v7-rls-matrix.test.ts 96 SKIPPED auf Coolify-DB wegen fehlenden Seed-Daten (pre-existing V7-Seed-Drift)
- Status: resolved
- Resolved: 2026-05-16 — V7.2 SLC-721 MT-3. Seed-Script + Auth-User-Script auf Coolify-DB applied via `docker run node:20` im Coolify-Netzwerk: 882 Rows (1 Team + 7 Profile inkl. qa-admin + 50/200/100/500 Volumen-Daten + 24 Aux-Fixtures). v7-rls-matrix.test.ts: 96/96 PASS (statt 96 SKIP). aggregate-queries.test.ts 6/6 PASS nach Test-Anpassung an qa-admin (Commit `46497f9`). Gesamt-Test-Suite `npm run test:all` 917 PASS / 0 FAIL / 0 SKIP (779 jsdom + 138 RLS).
- Severity: Medium
- Area: Test-Infra / Seed-Daten / Coolify-DB-State
- Summary: `cockpit/__tests__/rls/v7-rls-matrix.test.ts` `beforeAll` wirft "Seed-Daten fehlen: deals hat keine Records mit owner=00000000-0000-0000-0000-000000000081. 'npm run seed:multi-user' ausfuehren." — die Coolify-DB hat fuer TEST_MEMBER_1 (`0...000081`) keine Records in `deals` (und vermutlich auch nicht in `companies, contacts, activities, meetings, proposals, email_messages, calls`). Folge: alle 96 Cross-Owner-Tests (8 Tabellen × 3 Rollen × 4 Operationen) SKIPPED. Zusaetzlich: `aggregate-queries.test.ts` 2/6 FAIL — `getTeamMembers` liefert 6 statt erwartete 5, `getTeamBedrockContext.members.length` 6 statt 5 (direkt verbunden mit ISSUE-075).
- Impact: Primary RLS-Regression-Check (8×3×4=96 Cases) liefert keine Confidence. Allerdings: V7.1 aendert keine RLS-Policies oder DB-Schema → RLS-Regression-Risk aus V7.1 ist Null. Die Seed-Luecke wuerde aber zukuenftige Multi-User-Slices blockieren (V7.5, V8+).
- Workaround: Keiner — manuell auf Coolify-DB seed:multi-user-Script applicieren.
- Next Action: In V7.2-Cleanup-Slice: (1) `npm run seed:multi-user` auf Coolify-DB applicieren + idempotent halten, (2) ISSUE-075 cleanup (entfernt 2 aggregate-queries-FAILs automatisch), (3) Seed-Script in den Container-Bootstrap einbauen damit es bei jedem Coolify-Redeploy idempotent re-applied wird. Erwartetes Outcome nach Fix: 12+4+6+0+96 = 118/118 PASS auf RLS-Suite (statt heute 20 PASS + 2 FAIL + 96 SKIP).
- Reported: 2026-05-15 (Gesamt-/qa V7.1, RPT-425).

### ISSUE-071 — Disk-Voll-Risiko auf 91.98.20.191 (Docker Build-Cache + unbenutzte Images akkumulieren ohne Cleanup, fuehrt zu Postgres-Crash-Loop)
- Status: resolved
- Severity: High
- Area: Hetzner-Server / Coolify / Disk-Capacity / Operational
- Resolution: **2026-05-20 (RPT-488 V8 Phase-2 Live-Smoke Session): systemd-timer `docker-prune.timer` eingerichtet auf 91.98.20.191.** Files: `/etc/systemd/system/docker-prune.{service,timer}`. Schedule: `OnCalendar=Sun 03:00:00` + `RandomizedDelaySec=600` (jeden Sonntag 03:00-03:10 UTC). `Persistent=true` (laeuft nach Reboot nach falls verpasst). ExecStart: `docker builder prune -af && docker image prune -af`. **Test-Run sofort erfolgreich**: 722.4MB reclaimed, Disk 88%→82%, exit-code 0/SUCCESS. `systemctl enable --now docker-prune.timer` aktiv. Naechster automatischer Lauf: Sun 2026-05-24 03:04:37 UTC. Coolify-Auto-Cleanup bleibt als zweite Sicherheitsstufe (3x bewaehrt in REL-030/032/033). Permanent-Loesung der weekly-Cron-User-Pflicht-Action aus Next-Action #1 erledigt.
- **Post-Launch-Update 2026-05-20 (RPT-477 V7.6 /post-launch Burn-In): Disk-Trend POSITIV. ~17h nach REL-033 Coolify-Redeploy auf 83% (30G/38G, 6.4G free) — von 88% pre-Burn-In gefallen. Coolify-Auto-Cleanup-Pattern aus REL-032 ein drittes Mal bestaetigt (REL-030 → REL-032 → REL-033). Headroom fuer 2-3 weitere Coolify-Redeploys. Weekly Cron weiterhin NICHT eingerichtet — User-Pflicht-Action bleibt offen, aber nicht-blockierend solange Auto-Cleanup zuverlaessig greift. Empfehlung: Cron vor naechstem REL-Zyklus (V7.7 oder V8) idealerweise einrichten als Resilience-Massnahme.**
- **Pre-/deploy-Update 2026-05-19 (RPT-473 V7.6 /final-check): Disk-Druck auf 93% (33G/38G, 2.8G free) zurueck. Anstieg von 82% (RPT-465 2026-05-19 morgens) auf 93% in ~6h — Akkumulations-Geschwindigkeit hoeher als angenommen. Coolify-Auto-Cleanup hat noch nicht durchgegriffen. V7.6 /deploy wuerde temporaer auf >95% schieben und Crash-Loop-Pattern aus RPT-461 wiederholen. **BLOCKER fuer V7.6 /deploy als REL-033** — User-Pflicht-Action: `ssh root@91.98.20.191 'docker builder prune -af && docker image prune -af && df -h /'` ausfuehren VOR Coolify-Redeploy.**
- **Post-Launch-Update 2026-05-19 (RPT-465): Disk-Trend POSITIV. ~13h nach REL-032 Coolify-Redeploy auf 82% (30G/38G, 6.5G free) — von 91% post-Redeploy gesunken. Coolify hat offenbar automatisches Image-Layer-Cleanup nach Redeploy ausgefuehrt (vermutlich Retention-Policy). Kein manueller Eingriff durch Agent noetig. Cron-Setup bleibt sinnvoll fuer Resilience gegen kuenftige Redeploy-Zyklen, aber Druck reduziert.**
- **3. Auftritt 2026-05-18 (RPT-461 Gesamt-/qa V7.5): Disk 100% (38G/38G, 0 Avail), Postgres-Crash-Loop seit 11:27 UTC mit `PANIC: could not write to file pg_logical/replorigin_checkpoint.tmp: No space left on device`. Entdeckt waehrend RLS-Suite-Lauf. Agent fuehrte auf User-OK `docker builder prune -af && docker image prune -af` aus — 5.695GB Build-Cache + 2.305GB Images freigesetzt. Neuer Disk-Stand: 82% (29G/38G, 6.8GB free), Postgres `pg_is_in_recovery=false` nach ~5s, Container app weiterhin healthy. Akkumulations-Intervall ~30h zwischen RPT-429 (2026-05-16) und RPT-461 (2026-05-18) — Cron-Setup wird zunehmend kritisch.**
- Post-Launch-Update 2026-05-16 (RPT-429): Disk 89% (32G/38G, 4GB free) ~25h nach V7.1-Deploy. Agent fuehrte auf User-OK `docker builder prune -af && docker image prune -af` aus — 1.87GB Build-Cache + 0.80GB Dangling-Images freigesetzt. **Neuer Disk-Stand: 83% (30G/38G, 6.4GB free)**, Build-Cache leer, Images-Reclaimable 611MB (4%). Headroom fuer 2-3 weitere Coolify-Redeploys. Weekly Cron weiterhin NICHT eingerichtet — User-Pflicht-Action aus REL-030 weiterhin offen, gleicher Akkumulations-Trend nach 1-2 Wochen erneut zu erwarten.
- Summary: 2026-05-14 ~10:25 UTC ist die Disk auf 91.98.20.191 auf 100% gelaufen (`/dev/sda1 38G 37G 0 Avail`). Hauptverbraucher: Docker Build-Cache (4.32GB, 164 cached layers, 100% reclaimable) + unbenutzte Images (5.55GB von 15.94GB total reclaimable). Postgres-Daten selbst nur ~64MB. Folge: Supabase-Postgres geriet in Crash-Loop wegen `PANIC: could not write to file "pg_logical/replorigin_checkpoint.tmp": No space left on device` — Container restartete sich endlos, DB war ~5min unerreichbar. Entdeckt durch Cross-System-Smoke aus Onboarding-Plattform SLC-106 MT-12 (RPT-252 dort), Lead-Intake-Endpoint antwortete mit HTTP 500.
- Impact: Business-System komplett unerreichbar fuer Dauer des Crash-Loops (~5min). Alle Inbound-API-Calls schlugen fehl, Coolify-UI nicht ansprechbar, /supabase Storage/Auth nicht erreichbar. Kein Daten-Verlust (Postgres-WAL-Replay funktionierte, nur Checkpoint-Write blockierte). Bei laenger andauerndem Disk-Voll-Zustand: Risiko fuer Datenkorruption durch unvollstaendige Schreib-Operationen.
- Workaround: 2026-05-14 ~10:27 UTC durchgefuehrt:
  ```
  docker builder prune -af   # reclaim 5.59GB
  docker image prune -af     # reclaim 2.45GB
  ```
  Ergebnis: Disk 100% → 83% (6.2GB free), Postgres `pg_is_in_recovery()=false`, DB online. Non-destructive fuer laufende Container — nur dangling Build-Layers + unbenutzte Images entfernt.
- Next Action:
  1. **Coolify-Cron einrichten** (User-Pflicht via Coolify-UI): wöchentlich (z.B. Sonntag 03:00 UTC) `docker builder prune -af && docker image prune -af`. Wichtig: Befehl muss als root laufen — entweder direkt auf dem Host via Hetzner-systemd-cron (sauberster Pfad), oder via Coolify-Cron-Container mit Docker-Socket-Mount (privilegierter Pfad). Coolify-Cron-Pattern-Erfahrung in `~/.claude/projects/c--strategaize-strategaize-dev-system/memory/feedback_coolify_cron_node.md` (Coolify-Container `app` + `which curl` → Fallback auf `node -e fetch()`). Fuer Docker-prune ist Host-systemd-cron einfacher (eine systemd-timer-Unit, kein Container-Overhead). Beispiel: `/etc/systemd/system/docker-prune.timer` + `/etc/systemd/system/docker-prune.service` mit `ExecStart=/usr/bin/docker builder prune -af; /usr/bin/docker image prune -af`.
  2. **Disk-Monitoring**: Hetzner-Cloud-Console Alert bei Disk-Usage > 85% (ueber Web-UI: Server → Metrics → Add Alert). Alternativ Coolify-Cron der `df -h /` parsed und bei Schwelle eine Mail/Webhook ausloest.
  3. **Image-Retention-Policy in Coolify Settings** pruefen — Coolify hat optional Image-Retention-Config pro Resource. Auf "keep last 3 versions" stellen, falls noch nicht so.
  4. **Repeat fuer 159.69.207.29 (Onboarding-Plattform)** — gleiches Build-Cache-Akkumulations-Muster ist dort ebenfalls zu erwarten, bisher noch nicht aufgetreten weil Repo juenger. Praeventiv selbe Cron + Monitoring einrichten.

### ISSUE-070 — 4 Mutate-Server-Actions ohne assertNotReadOnlyContext-Guard (Defense-in-Depth-Polish, kein Exploit-Pfad)
- Status: resolved
- Severity: Medium
- Area: Backend / V7 / Defense-in-Depth / SLC-704-Symmetrie
- Summary: /final-check V7 RPT-410: 4 Files mutieren Tabellen ohne `await assertNotReadOnlyContext()` als first line — `lib/team/bulk-reassign-actions.ts` (bulkReassignApply, RLS-Bypass via SET LOCAL ROLE postgres), `components/insights/insight-actions.ts` (saveInsight INSERT activities), `lib/settings/working-hours-actions.ts` (updateWorkingHoursSettings UPSERT user_settings), `lib/ki-workspace/reports/winloss.ts` (persistManualRun INSERT auto_winloss_runs, V6.6-Code). ISSUE-064-Style-Policy ("first line in jeder Mutate-Action") nicht symmetrisch durchgezogen seit SLC-707.
- Impact: Kein aktueller Exploit-Pfad. Die 4 Server-Actions sind NICHT aus dem `/team/[user_id]/*`-Drilldown-Subtree aufrufbar — Read-Only-Context wird nur dort via Layout-Wrap gesetzt. ISSUE-066-Kontext: AsyncLocalStorage propagiert ohnehin nicht in Server-Action-Requests, Guard wuerde dort eh nicht greifen. V7.5-Mitigation via Middleware-Header geplant. Bei zukuenftiger Drilldown-Erweiterung wuerden diese Guards wichtig.
- Workaround: Keiner notwendig — keine Live-Auslieferungs-Bedrohung.
- Resolution: SLC-713 MT-1 (Branch slc-713-defense-in-depth-polish): 4× `await assertNotReadOnlyContext()` als first line eingefuegt. `persistManualRun` aus `winloss.ts` zu sibling `winloss-persist.ts` (non-"use server") extrahiert (analog Pattern `bulk-reassign.ts`), damit der Audit-Insert nicht versehentlich als Server-Action exposed wird. 4 neue Vitest-Tests in MT-2 alle gruen (Pattern DEC-201: runWithReadOnlyContext-Wrap + rejects.toThrow(/Mutation blocked/) + AC3-Assertion dass Mock-Clients nicht aufgerufen werden). Volle Suite 779/779 PASS (+4 vs. Baseline 775).
- Resolved: 2026-05-15

### ISSUE-069 — AUDIT_SERVER_ACTIONS_V7.md stale: SLC-707 Bulk-Reassign + 3 V6.6-Mutate-Files nicht nachgetragen + 1 Fehlklassifizierung
- Status: resolved
- Severity: Medium
- Area: Documentation / V7 / Audit-Trail
- Summary: /final-check V7 RPT-410: docs/AUDIT_SERVER_ACTIONS_V7.md hat seit SLC-704-Sweep 4 Files ergaenzt (ISSUE-064-Tranche), aber 5 weitere Mutate-Files sind nicht synchron mit dem aktuellen Code-Stand. (a) Bulk-Reassign-Server-Actions (bulkReassignPreview, bulkReassignApply) sind nur in Section 8 "Out-of-Scope" gelistet — nie als "live"-Eintrag nachgetragen, obwohl SLC-707 sie produktiv ausgeliefert hat. (b) `lib/team/bulk-reassign.ts` Audit-Helper (writeInitiatedAudit + writeAppliedAudit) fehlen. (c) `lib/settings/working-hours-actions.ts` (V6.6) fehlt. (d) `lib/ki-workspace/reports/winloss.ts` persistManualRun (V6.6) fehlt. (e) `lib/audit.ts` logAudit + logAuditWithId (zentrale Audit-Insertion) fehlt. Plus 1 Fehlklassifizierung: `components/insights/insight-actions.ts:201` ist als "wrapper, ruft lib/actions" markiert — real macht die Datei selbst `supabase.from("activities").insert(...)` an Zeile 59.
- Impact: Reine Doc-Hygiene. Kein Runtime-Risk. Aber: Compliance-Gate-Auditoren verlassen sich auf das Doc als Quelle-der-Wahrheit fuer Server-Action-Coverage und Audit-Trail-Pfade.
- Workaround: Keiner.
- Resolution: SLC-713 MT-3 (Branch slc-713-defense-in-depth-polish): Neue Section 10 "Post-V7 Mutate-Pfade — SLC-707 + V6.6 nachgetragen" mit 5 Sub-Sections (bulk-reassign-actions / bulk-reassign Audit-Helpers / working-hours-actions / winloss-persist / lib/audit.ts) ergaenzt. Fehlklassifizierung `components/insights/insight-actions.ts` korrigiert (saveInsight macht selbst INSERT activities, nicht UI-wrapper). Section 8 Out-of-Scope: 3 abgehakte Eintraege als delivered annotiert (SLC-705/706/707). grep nach den 6 neuen Symbolen (bulkReassignApply, writeInitiatedAudit, writeAppliedAudit, updateWorkingHoursSettings, persistManualRun, logAuditWithId) bestaetigt alle in der Doc.
- Resolved: 2026-05-15

### ISSUE-068 — vitest.config.ts include-Pattern uebersieht root-level __tests__/-Suite (V7-Live-DB-Coverage silent geskipped)
- Status: resolved
- Severity: Medium
- Area: Test-Infrastructure / vitest.config / V7 Live-DB-Coverage
- Summary: `cockpit/vitest.config.ts` `include`-Pattern faengt nur `src/**/*.test.ts(x)`. Die root-level `cockpit/__tests__/`-Tests (RLS-Matrix, Team-Aggregat, Drilldown, Bulk-Reassign — Live-DB-Tests gegen Coolify-DB) werden vom Default-Lauf silent geskipped. Discovery via /qa V7 (RPT-408): Subagent musste Override-Config `vitest.config.full.mts` mit zusaetzlichem `__tests__/**/*.test.ts`-Pattern bauen, um die 138+ V7-Live-DB-Tests ueberhaupt zu fahren.
- Impact: Ein `npm run test` (oder /qa-default-Run) deckt **nicht** die V7-RLS-Tests (96), Bulk-Reassign-Tests (20), Drilldown-Tests (4) oder Team-Aggregat-Live-DB-Tests (6) ab. Future Test-Driven-Slices in V7-Bereich koennten Regression-Symptome haben, die der Default-Lauf nicht aufdeckt → falsche Sicherheit.
- Workaround: Bei /qa-Laeufen explizit `vitest run __tests__/` oder Override-Config mit erweitertem include-Pattern verwenden.
- Resolved: 2026-05-14 — BL-465. Erster Anlauf (include-Pattern in `vitest.config.ts` erweitern) brach den Default-Lauf, weil `__tests__/`-Tests Node-env + `TEST_DATABASE_URL` brauchen und im jsdom-Default-Run mit "TEST_DATABASE_URL nicht gesetzt" abbrechen (5 Test-Files failed). Korrekte Loesung: neuer `npm run test:all` Script in `cockpit/package.json`, der `test` (Default, src/* in jsdom) gefolgt von `test:rls` (existierendes Script, __tests__/* in node-env gegen Coolify-DB) ausfuehrt. `vitest.config.ts` wurde auf src-only zurueckgesetzt. /qa-Skill-Default muss zukuenftig `npm run test:all` verwenden um V7-Live-DB-Coverage einzuschliessen (IMP-512).

### ISSUE-067 — POSTGRES_URL/DATABASE_URL fehlt in Coolify-Business-System-ENV — Bulk-Reassign-Server-Action wuerde Runtime-Fehler werfen
- Status: resolved
- Severity: High
- Area: Infrastructure / Coolify-ENV / SLC-707 / Bulk-Reassign
- Summary: SLC-707 MT-1 fuehrt einen neuen Raw-pg-Connection-Pfad ein (`cockpit/src/lib/db/pg.ts` → `getPgClient()` via `process.env.POSTGRES_URL ?? process.env.DATABASE_URL`). Bulk-Reassign-Server-Action (`bulkReassignPreview`, `bulkReassignApply`) und Audit-Helper `writeInitiatedAudit` brauchen den Connection-String fuer den SET-LOCAL-ROLE-postgres-Pfad. Die Coolify-Business-System-Resource hat aktuell weder `POSTGRES_URL` noch `DATABASE_URL` gesetzt (nicht in `.env.example`, nicht in `docs/ARCHITECTURE.md` ausser im unverwandten Cal.com-Block).
- Impact: Bulk-Reassign-UI in Produktion bricht beim Klick auf "Vorschau" oder "Reassign starten" mit Fehler-Toast: "Kein Postgres-Connection-String in POSTGRES_URL oder DATABASE_URL gefunden — bulk-reassign benoetigt direkten DB-Zugriff". Vitest deckt das nicht ab, weil Tests die Pure-Helper direkt mit `pg.Client` aufrufen (Server-Action-Layer wird umgangen). Live-Smoke blockiert.
- Workaround: ENV-Set in Coolify per Hand: `POSTGRES_URL=postgresql://postgres:${POSTGRES_PASSWORD}@<supabase-db-host>:5432/postgres`. Mit aktuellem Container-Suffix `supabase-db-k9f5pn5upfq7etoefb5ukbcg-075059013140` ist die ENV nach dem naechsten DB-Container-Redeploy stale (IMP-497 Container-Suffix-Drift). Stabiler: Service-Alias `supabase-db` falls Coolify-Compose das auto-erzeugt.
- Next Action: BL-464 — User setzt `POSTGRES_URL` in Coolify Business-System ENV und Re-Deployt. Alternative-Architektur (BL-466 oder BL-467 falls noetig): SECURITY DEFINER Postgres-Function + `supabase.rpc('bulk_reassign_apply', ...)` Aufruf, das umgeht den ENV-Drift komplett (Aufwand ~2-3h Refactor).
- Resolved: 2026-05-14 (Live-Smoke RPT-409). User setzte `POSTGRES_URL=postgresql://postgres:<password>@supabase-db:5432/postgres` mit URL-encodetem Password und stabilem DNS-Alias `supabase-db` (kein Timestamp-Suffix-Drift mehr). Coolify-Redeploy mit Image `42f1e20`. Playwright-Live-Smoke verifizierte: Preview returned 174 records, Apply ueberschrieb owner_user_id auf 174 Records, 9 audit_log-Eintraege geschrieben (1 initiated + 8 applied), Member-1 deals 20->0, Member-2 deals 20->40. AC1+AC2+AC2b+AC2c PASS.

### ISSUE-066 — SLC-706 Drilldown Mutate-Lockdown Defense-in-Depth-Gap: AsyncLocalStorage propagiert nicht in Server-Action-Requests
- Status: resolved
- Severity: Medium
- Area: Backend / SLC-706 / V7 Drilldown / Read-Only-Context-Propagation
- Summary: `cockpit/src/app/(app)/team/[user_id]/layout.tsx` wrappt Children mit `runWithReadOnlyContext()` via Node `AsyncLocalStorage`. Der Context propagiert korrekt durch die Server-Component-Render-Chain (Vitest MT-6 3/3 PASS). ABER: Server Actions sind separate Request-Handler in Next.js App-Router — wenn ein Client Direct-Server-Action-Call macht (z.B. via DevTools `fetch` mit Next-Action-Header oder Form-POST), laeuft die Action OHNE aktiven Read-Only-Context. `assertNotReadOnlyContext()` greift dann nicht → Mutate-Action wuerde gelingen, obwohl Teamlead im Drilldown ist.
- Impact: Im UI sind alle Mutate-Buttons im Drilldown unsichtbar (V1 Defense-Layer 1 PASS). Aber technisch koennte ein Teamlead via DevTools eine Mutate-Server-Action seines Team-Members callen — Mutation gelingt, RLS erlaubt Teamlead Schreib-Rechte auf eigene Team-Member-Daten. **Kein Cross-Team-Daten-Leak** (RLS blockt das unabhaengig), nur Same-Team-Bypass des Read-Only-UX-Versprechens.
- Workaround: Keiner — UX-Layer (keine Mutate-Buttons) bleibt aktiv.
- Resolved: 2026-05-16 (SLC-751, RPT-444). V7.5-Foundation-Slice schliesst Defense-in-Depth: Middleware (DEC-210) setzt `X-Read-Only-Mode: 1`-Request-Header bei Pfad-Regex `/^\/team\/[^/]+\//`. `assertNotReadOnlyContext()` ist async + liest beide Layer parallel (AsyncLocalStorage + `next/headers`). Bei Header-Block: Best-Effort `audit_log`-Insert mit Action `read_only_context_blocked`. Live-Smoke 2026-05-16 16:18:49 PASS: Direct-Server-Action-Fetch (createTask) gegen `/team/<member>/mein-tag` als Teamlead → HTTP 500 Error-Digest 3227532044 + audit_log-Eintrag `actor_id=00000000-0000-0000-0000-000000000078`, `entity_type=read_only_context`, `context.path=/team/.../mein-tag`, `context.blocked_via=header`. 13 neue Vitest-Cases (9 Pfad-Regex + 4 Defense-in-Depth-Permutations) PASS in REL-032.

### ISSUE-065 — getTeamMembers Self-Filter inaktiv durch .single() ohne explicit auth.uid()-Lookup
- Status: resolved
- Severity: High
- Area: Backend / SLC-705 / V7 Team-Aggregat / Team-Cockpit + Bedrock-Context
- Summary: `cockpit/src/lib/team/aggregate-queries.ts:188-192` macht `supabase.from("profiles").select("id, team_id").single()` ohne `.eq("id", auth.uid())`. RLS-Policy `profiles_select_team` liefert dem Teamlead 6 Rows (`team_id=get_my_team_id() OR id=auth.uid()`). `.single()` returnt bei multi-row `null` → `callerId = null` und `callerTeamId = null` → BEIDE Filter (`team_id`-eq + `id`-neq) werden inaktiv geschaltet. Effekt: `getTeamMembers()` returnt ALLE 6 RLS-sichtbaren Profiles inkl. Teamlead-Self.
- Impact: Tabelle `/team` zeigt 6 Rows statt 5 (Teamlead-Self mit 0 €/0/0 als Member-Pseudo-Row). `getTeamBedrockContext()` ruft `getTeamMembers()` direkt → Bedrock-Coaching-Prompt enthaelt Teamlead-als-Member. Bedrock-Antwort fuer "Wer hat Underperformance?" identifiziert Teamlead als Outlier (mit Selbstklarstellung "Teamlead-Rolle typischerweise nicht auf eigene Pipeline ausgelegt"). Funktional kein Daten-Leak (RLS greift weiter), UX-Drift + Bedrock-Coaching-Drift.
- Resolution: `cockpit/src/lib/team/aggregate-queries.ts:185-209` umgebaut auf zweistufigen Lookup: `await supabase.auth.getUser()` fuer Self-Identitaet (Early-Return `[]` wenn null), dann `.from("profiles").select("id, team_id").eq("id", user.id).single()`. Defensive-Default `callerId = caller?.id ?? user.id`, falls Profile-Lookup null returnt. Plus neuer Unit-Test `cockpit/src/lib/team/aggregate-queries.test.ts` (8 Tests, vi.mock-Pattern) der `getTeamMembers()` direkt mit gemocktem Supabase-Client aufruft — faengt zukuenftige Code-Logik-Bugs der Klasse `.single() ohne .eq()`. Live-DB-Suite `__tests__/team/aggregate-queries.test.ts` (RLS/SQL-Replikation) bleibt als komplementaere Coverage. Vitest 745/745 PASS (737 baseline + 8 neu), TSC clean fuer SLC-705-Files. **Live-verifiziert via RPT-405 gegen Image-Tag `853f31c` 2026-05-13:** /team Tabelle zeigt 5 Rows (kein Teamlead-Self), KI-Workspace-Underperformance-Antwort identifiziert "Alle fuenf Mitarbeiter" korrekt ohne Teamlead-als-Outlier.
- Resolved: 2026-05-13

### ISSUE-064 — SLC-704 Defense-in-Depth-Gap: 6 Mutate-Files ohne assertNotReadOnlyContext()
- Status: resolved
- Severity: High
- Area: Backend / SLC-704 / V7-Owner-Wiring / AC3-Mutate-Lockdown
- Summary: AC3 fordert `await assertNotReadOnlyContext()` als first line in JEDER Mutate-Server-Action. `/qa SLC-704` hat 6 Files identifiziert, in denen das fehlte: 3 mutieren Core-Tabellen (`src/app/actions/meetings.ts` → meetings+activities, `src/lib/actions/activity-actions.ts` → activities, `src/lib/actions/insight-actions.ts` → activities), 3 mutieren non-core-Tabellen (`src/app/(app)/cadences/enrollment-actions.ts` → cadence_enrollments, `src/app/(app)/fit-assessment/signal-actions.ts` → signals, `src/app/(app)/settings/template-actions.ts` → email_templates). Audit-Doc `docs/AUDIT_SERVER_ACTIONS_V7.md` hatte zudem 4 dieser 6 Files NICHT erfasst (AC1-Gap symmetrisch). Plus TSC-Regression `auto_winloss_extract.test.ts:184` (Test-Mock fehlte `ownerUserId` aus DEC-185).
- Impact: Heute war kein Runtime-Risk weil SLC-706 (Read-Only-Context-Setter via Drilldown-Pages) noch nicht existiert. Bei SLC-706-Auslieferung waren aber 6 Pfade ohne Read-Only-Guard.
- Resolution: Commit `f272299` — 6 Files × `assertNotReadOnlyContext()`-Guard auf 17 Mutate-Funktionen + Test-Mock-Fix + Audit-Doc 4 fehlende Eintraege ergaenzt + meetings.ts-Funktionsname `startMeeting` korrigiert. Build + Vitest 737/737 + TSC SLC-704-Regression clean.
- Resolved: 2026-05-13

### ISSUE-063 — Team-Dropdown in Invite-Dialog zeigt UUID statt Team-Name
- Status: resolved
- Severity: Medium
- Area: Frontend / SLC-703 / Invite-Dialog
- Summary: `cockpit/src/app/(app)/settings/team/invite-dialog.tsx` rendert `<SelectValue />` ohne expliziten Display-Resolver. base-ui-Select mappt den Value (UUID) NICHT automatisch auf das `<SelectItem>`-Kind. Resultat: User sieht `fa0ff2b6-6a12-4d5f-a9d0-54956c054728` statt z.B. "Standard-Team" im Team-Dropdown.
- Impact: Funktional korrekt (Submit klappt), aber UX-Bug — User kann nicht erkennen welches Team gewaehlt ist. Bei mehreren Teams (Multi-Team-Setup spaeter) unbrauchbar.
- Workaround: `<SelectValue>{teams.find(t => t.id === teamId)?.name ?? teamId}</SelectValue>` als Display-Override. ~5 Min Fix.
- Resolved: 2026-05-14 (SLC-707 MT-0). Team-Select bekam Display-Resolver via `<SelectValue>{teams.find(...).name ?? teamId}</SelectValue>`. Adjacent-Bug-Fix per Deviation Rule 1: Role-Select hatte gleichen Root-Cause (zeigte `member`/`teamlead`/`admin` statt `Member`/`Teamlead`/`Admin`), wurde mit ternaerem Lookup im selben Edit gefixt.

### ISSUE-072 — Invite-Mail-Confirmation-Link nutzt internen Docker-Hostname `supabase-kong` statt Public-Domain
- Status: resolved
- Severity: High
- Area: Backend / Auth / GoTrue / Invite-Flow / SLC-703
- Summary: User-Walkthrough 2026-05-14: Nach BL-467 SMTP-Fix kommt die Invite-Mail zwar an, aber der Confirmation-Link zeigt auf `http://supabase-kong:8000/auth/v1/verify?token=...` (interner Docker-Container-Hostname). Browser-DNS-Lookup auf `supabase-kong` scheitert mit `DNS_PROBE_FINISHED_NXDOMAIN`. Root Cause: `cockpit/src/lib/auth/invite.ts` ruft `admin.auth.admin.inviteUserByEmail()` ueber Server-Side-Admin-Client mit `SUPABASE_URL=http://supabase-kong:8000` (Container-DNS) auf. GoTrue v2.160.0 in Coolify-Supabase-Stack baut die Confirmation-URL aus dem Request-Host statt aus `GOTRUE_API_EXTERNAL_URL` — bekanntes Self-hosted-GoTrue-Issue. `createAdminClient` setzt zwar X-Forwarded-Host + X-Forwarded-Proto, GoTrue respektiert sie ohne trusted_proxy-Flag nicht.
- Impact: Invite-Mail-Flow (SLC-703 AC3) ist UI-side nicht funktional — User kann die Mail nicht via Link-Klick beantworten. Workaround manuell moeglich (URL editieren), fuer produktiven Einsatz nicht akzeptabel.
- Workaround: Mail-Link manuell editieren — `http://supabase-kong:8000` durch `https://business.strategaizetransition.com` ersetzen, Rest des URL-Pfads unveraendert lassen. Token bleibt gueltig.
- Next Action: BL-470 — Code-Fix in `cockpit/src/lib/auth/invite.ts`. `admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })` liefert `action_link` mit korrektem Public-Host. Mail-Versand selbst via V5.3 NodeMailer-SMTP-Pipeline mit eigenem Template. Vorteil: kein GoTrue-Auto-Mail mehr, Template-Kontrolle. ~2-3h. V7.1-Sprint.
- Resolved: 2026-05-14 — BL-470 done. Code-Fix in 4 Schritten (alle haetten mit Onboarding-Pattern-Reuse in einem Step erfolgen koennen — siehe Memory `feedback_check_existing_patterns_first.md`): (1) `lib/auth/invite.ts` umgebaut auf `generateLink` + eigener NodeMailer-Send mit Public-Host-Confirm-URL (commit 05f3ff2, 8 Vitest-Tests). (2) `app/auth/callback/route.ts` 1:1 portiert aus Onboarding-Plattform — `NEXT_PUBLIC_APP_URL` statt `request.nextUrl.origin` + signOut() vor verifyOtp() + cookie-binding an NextResponse (commit d4107b8). (3) `app/auth/set-password/page.tsx` + `actions.ts` NEU angelegt (existierte vorher nicht, war 404) — Style-matching Login-Page (commit 2131ec7). (4) User-Live-Test bestaetigt: Invite an immo@bellaerts.de → Mail kam an → Link-Klick → Set-Password → Login → Dashboard. Vitest gesamt 756/756 PASS.

### ISSUE-062 — GOTRUE_SMTP_PASS in Coolify-ENV auf "unused" gesetzt — Mail-Versand blockiert
- Status: resolved
- Severity: High
- Area: Infrastructure / Coolify / GoTrue / SMTP
- Summary: GoTrue-Container hat ENV `GOTRUE_SMTP_PASS=unused` und `SMTP_PASS=unused`, waehrend `SMTP_PASSWORD=aithatworks-01!` korrekt ist. GoTrue liest die `GOTRUE_*`-prefixed Variante. Mail-Versand schlaegt mit `535 Authentication credentials invalid` fehl. Coolify-Supabase-ENV-Wrapper-Mapping-Bug (siehe Memory `reference_coolify_supabase_env_mapping`).
- Impact: Blockiert ALLE Auth-Mails (Invite, Password-Reset, Email-Change-Confirmation). Betrifft SLC-703 AC3 (Invite-E-Mail-Flow live-untestbar), aber auch jeden zukuenftigen produktiven Use-Case. GoTrue rollt fehlgeschlagene Invites atomar zurueck → keine Datenintegritaets-Issues.
- Resolved: 2026-05-14 — BL-467. User setzte in Coolify-UI Environment Variables sowohl `SMTP_PASS=aithatworks-01!` als auch `SMTP_PASSWORD=aithatworks-01!` mit "Available at Buildtime" + "Available at Runtime" Checkboxes (vorher unchecked → ENV wurde nicht in Container injiziert — IMP-515-Lehre). Coolify-Stack-Redeploy uebernahm die Werte. SSH-Verifikation: `GOTRUE_SMTP_PASS=aithatworks-01!`, `SMTP_PASS=aithatworks-01!`, `SMTP_PASSWORD=aithatworks-01!`. User-Live-Test: Invite-Mail kam an. **Follow-up ISSUE-072:** Mail-Link selbst nutzt internen Docker-Hostname (separater Code-Fix via BL-470).
- Workaround: Im Coolify-UI ENV-Konfiguration `GOTRUE_SMTP_PASS=aithatworks-01!` setzen + GoTrue-Container redeployen. Alternativ: `SMTP_PASS=aithatworks-01!` (GoTrue liest beide).
- Next Action: User-Manual-Fix in Coolify-UI (Settings → Environment Variables → `GOTRUE_SMTP_PASS` setzen + Redeploy). Danach AC3 live-verifizierbar.

### ISSUE-061 — Read-API /api/winloss/[deal_id] vom Middleware-Auth-Wall geblockt (Bearer-Auth nie erreicht)
- Status: resolved
- Severity: Blocker
- Area: Backend / SLC-665 / Middleware / Read-API
- Summary: `cockpit/src/lib/supabase/middleware.ts:33` definiert `publicPaths` ohne `/api/winloss`. Jeder Request auf `/api/winloss/[deal_id]` wird vor dem Route-Handler auf `/login` (HTTP 307) redirected — auch mit korrektem Bearer-Token. Live-curl gegen `https://business.strategaizetransition.com/api/winloss/<deal_id>` mit gueltigem `EXPORT_API_KEY` liefert `307 -> /login`; gleicher Effekt bei container-internem `localhost:3000`-Call. AC12 ist damit nicht erfuellbar.
- Impact: Intelligence-Studio-Integration (V6.6-Pull-Pfad) war blockiert. Auch Routine-curl-Smokes oder externe Tools hatten keinen Zugriff.
- Resolution: Commit `8379833` — `/api/winloss` zum publicPaths-Array hinzugefuegt, gleicher Pattern wie `/api/export`/`/api/campaigns`/`/api/branding`. Live-curl-Smoke 4/4 PASS gegen Container-Image `8379833`: (a) ohne Auth -> 401 "Missing Authorization header", (b) falsche Auth -> 401 "Invalid API key", (c) gueltige Auth + kein Run -> 404 "No win/loss run found for this deal", (d) gueltige Auth + Test-Row -> 200 mit JSON {deal_id, target_status, triggered_at, bedrock_output, model, completed_at, status}.
- Resolved: 2026-05-11

### ISSUE-060 — Mehr-Aktionen-Dropdown crasht Deal-Detail-Page beim Click (Base UI #31)
- Status: resolved
- Severity: Blocker
- Area: Frontend / SLC-664 / Action-Bar / Base UI Dropdown
- Summary: `cockpit/src/components/deals/deal-action-bar.tsx:240-295` rendert mehrere unzulaessige direkte Kinder von `<DropdownMenuContent>`. Root-Cause war NICHT primaer EnrollButton/md:hidden, sondern `<DropdownMenuLabel>Mehr Aktionen</DropdownMenuLabel>` (= Base UI `Menu.GroupLabel`) als direkter Child von `Menu.Popup` ohne `Menu.Group`-Wrapper. Hotfix-1 (`26a4627`) hat EnrollButton/md:hidden korrigiert, blieb aber wirkungslos. Hotfix-2 (`aec7147`) hat DropdownMenuLabel entfernt — Crash weg.
- Impact: AC4 war UNERREICHBAR bis Hotfix-2.
- Resolution: aec7147 — DropdownMenuLabel rausgenommen, Import bereinigt. RPT-375 PASS.
- Resolved: 2026-05-11

### ISSUE-059 — Meeting-Dropdown crasht Deal-Detail-Page beim Click (Base UI #31)
- Status: resolved
- Severity: Blocker
- Area: Frontend / SLC-664 / Action-Bar / Base UI Dropdown
- Summary: `cockpit/src/components/deals/deal-action-bar.tsx:169-206` rendert mehrere problematische Patterns. Root-Cause analog ISSUE-060: nicht primaer MeetingSheet-as-direct-child (Hotfix-1 wirkungslos), sondern `<DropdownMenuLabel>Meeting</DropdownMenuLabel>` ohne `Menu.Group`-Wrapper. Hotfix-2 (`aec7147`) hat den Label entfernt — Crash weg. MeetingSheet wird jetzt korrekt state-controlled ausserhalb DropdownMenuContent gerendert (Hotfix-1).
- Impact: AC3 war UNERREICHBAR bis Hotfix-2.
- Resolution: aec7147 — DropdownMenuLabel rausgenommen + Hotfix-1 (26a4627) state-controlled Pattern. RPT-375 PASS, MeetingSheet-Open via Click verifiziert.
- Resolved: 2026-05-11

### ISSUE-058 — postcss <8.5.10 Vulnerability (Patch-Path catastrophic, akzeptiert bis Upstream-Next-Release)
- Status: open
- Severity: Low
- Area: Dependencies / Build-Toolchain
- Summary: postcss <8.5.10 hat eine moderate XSS-Vulnerability via Unescaped `</style>` in CSS-Stringify-Output (https://github.com/advisories/GHSA-qx2v-qp2m-jg93). Sub-Dependency von Next.js. `npm audit fix --force` wuerde Next 9.3.3 installieren — catastrophic-Breaking-Downgrade von Next 14+ auf Next 9 (mehrere Major-Versionen, keine App-Kompatibilitaet, keine Server-Components, kein App-Router).
- Impact: Niedrig fuer Internal-Test-Mode. Build-Time-only Vulnerability — postcss prozessiert nur autorisierte CSS aus dem eigenen Repo (keine User-CSS-Inputs zur Laufzeit). XSS-Vector erfordert untrusted-CSS-Input, was im aktuellen Single-User-Setup nicht gegeben ist.
- Workaround: Keiner — auf Upstream-Next-Release mit gepatcher postcss-Version warten. Periodisch `npm audit` pruefen (~alle 4-8 Wochen oder bei Toolchain-Updates).
- Next Action: Bei naechstem Next.js-Major-Update (Next 15+ Release) erneut `npm audit` laufen. Falls postcss-Patch dann verfuegbar: `npm audit fix` (non-force) anwenden + Build+Test+Live-Smoke-Cycle.
- Resolution: V6.5 BL-430 / SLC-657 dokumentiert ISSUE-058 in KNOWN_ISSUES als akzeptiert. Per DEC-161: kein Force-Fix, kein eigenes SECURITY.md (zu schwer fuer 1 CVE). Ist Pre-Production-relevant aber nicht-blockierend fuer Internal-Test-Mode.

### ISSUE-057 — FollowupEngine.openProposals query bricht auf nicht-existenter Spalte `proposals.value`
- Status: resolved
- Severity: Medium
- Area: Backend / Cron / FollowupEngine / Schema-Drift
- Summary: `cockpit/src/lib/ai/followup-engine.ts:194-208` selektiert + sortiert auf Spalte `value` der Proposals-Tabelle. Diese Spalte existiert nicht; tatsaechliche Felder sind `subtotal_net`, `tax_amount`, `total_gross`. Cron-Log-Hit: `[FollowupEngine] Open proposals query failed: column proposals.value does not exist` (3x in 16h, siehe RPT-331). Engine-Code stammt aus SLC-405 (V4), Schema wurde durch SLC-551 / MIG-026 (V5.5, 2026-04-29) restrukturiert — `value` wurde dabei nicht migriert.
- Impact: Aktuell null (0 Proposals mit status='sent' und sent_at < NOW()-7d in DB). Sobald reale Proposals versendet werden, wuerden KI-Wiedervorlagen fuer Open-Proposals still uebersprungen. Stagnant-Deal-Pfad der gleichen Engine ist nicht betroffen.
- Resolution: 2026-05-07 in SLC-641 MT-1+2 (Commit f1af68b). 3 Stellen gefixt: Select Z. 199 + Order Z. 207 + Candidate-Context `proposalValue` Z. 235. Spec sagte 2 Stellen, real waren 3 — Z. 235 haette sonst `undefined` zurueckgegeben. Vitest `cockpit/src/lib/ai/followup-engine.test.ts` mit Mock-Supabase-Client + 2 Regression-Tests ergaenzt. Live-Smoke: Followups-Cron auf Hetzner manuell getriggert, Container-Log ohne `column proposals.value`-Fehler, Cron meldet `success:true, candidates:2, failed:0`.

### ISSUE-056 — Kampagnen-Verwaltung nicht in Settings-Landing-Page verlinkt
- Status: resolved
- Severity: Medium
- Area: UI / Settings-Navigation / V6.2
- Summary: V6.2 SLC-624 hat `/settings/campaigns/page.tsx` als Listing erstellt, aber die Settings-Landing-Page (`cockpit/src/app/(app)/settings/page.tsx`) listet nur 5 Link-Karten (Meeting, Branding, Zahlungsbedingungen, Workflow-Automation, Einwilligungstexte) + Inline-Sections (ImapStatus, PipelineConfig, TemplatesConfig). Kampagnen-Karte wurde nicht ergaenzt.
- Impact: User findet `/settings/campaigns` nur ueber Direkt-URL, da auch in der Sidebar kein Kampagnen-Link existiert. Funktion arbeitet, aber UX-blockiert (effektiv unsichtbar).
- Resolution: 2026-05-06 in V6.2-Hotfix. Neue Link-Karte "Kampagnen" → `/settings/campaigns` in `settings/page.tsx` zwischen Workflow-Automation und Einwilligungstexte. `Megaphone`-Icon aus `lucide-react`, `bg-sky-50` Background-Tint zur visuellen Differenzierung von Workflow-Karte. Build clean, Vitest 361/361 PASS.

### ISSUE-055 — Workflow-Wizard zeigt Pipeline+Stage UUIDs statt Labels
- Status: resolved
- Severity: Medium
- Area: UI / Workflow-Wizard / V6.2
- Summary: Im Wizard `/settings/automation/new` Schritt 1 "Trigger" zeigen die Dropdowns "Pipeline" + "Stage (Ziel)" (DealStageChangedSubForm) sowie "Pipeline" (DealCreatedSubForm) nach Auswahl die rohe UUID statt des lesbaren Namens. Pattern identisch zu ISSUE-052 (PaymentTerms-Dropdown V5.7-Fix): base-ui `<SelectValue />` rendert per Default den Raw-Value-String (UUID) ohne Render-Callback.
- Impact: User sieht UUIDs wie `b0000000-0000-0000-0000-000000000002` statt "Sales-Pipeline" und `12993d55-4c15-4392-8e5d-d2ec242557cc` statt z.B. "Closed Won". Funktional intakt — die richtigen IDs werden korrekt persistiert und der Workflow funktioniert. Nur die Trigger-Anzeige ist unleserlich.
- Resolution: 2026-05-06 in V6.2-Hotfix. `cockpit/src/app/(app)/settings/automation/_components/step-trigger.tsx` an 3 Stellen: `renderPipeline` + `renderStage`-Helper-Funktionen (mappen `__any__` auf "Alle Pipelines"/"Alle Stages" und UUID auf `pipeline.name`/`stage.name`), als Function-Child von `<SelectValue>{renderFn}</SelectValue>` analog ISSUE-052. Build clean, Vitest 361/361 PASS, kein neuer Lint-Error.

### ISSUE-054 — EXPORT_API_KEY-ENV nicht im Coolify-Container gesetzt
- Status: resolved
- Severity: High
- Area: ENV / Deployment
- Summary: Live-Container hatte `EXPORT_API_KEY` + `IP_HASH_SALT` als ENV nicht gesetzt. SLC-625-Spec ging davon aus, dass die ENV "existing aus FEAT-504" ist. Konsequenz: Bearer-Auth-Endpoints `/api/leads/intake` und `/api/campaigns/[id]/performance` antworteten 500 "EXPORT_API_KEY not configured" statt 401/200.
- Impact: 2 von 4 SLC-625-API-Endpoints waren ohne User-ENV-Setup nicht voll testbar.
- Resolution: 2026-05-06 in /qa SLC-625. User hat `EXPORT_API_KEY` (32 hex) + `IP_HASH_SALT` (32 hex) in Coolify-Project-ENV gesetzt + Redeploy. Live-verifiziert via curl: 401 ohne Bearer, 200 mit gültigem Bearer, ip_hash kein Klartext. RPT-320 dokumentiert.

### ISSUE-052 — PaymentTerms-Dropdown zeigt Template-UUID statt Label nach Auswahl
- Status: resolved
- Severity: Medium
- Area: UI / Proposals-Editor
- Summary: Im Editor "Vorlage waehlen"-Dropdown wurde nach Auswahl eines Templates die rohe Template-UUID (`f57bd7b7-c711-4d5f-bbd6-894e63ec38e4`) im Trigger angezeigt statt des lesbaren Labels (`Standard 14 Tage netto (Default)`).
- Impact: User-sichtbarer Display-Bruch nach jeder Vorlagen-Auswahl. Funktional intakt (richtiger Body wurde in Textarea geschrieben), nur die Trigger-Anzeige war kaputt.
- Resolution: 2026-05-05 in V5.7-Follow-up. base-ui's `<Select.Value>` rendert den Raw-Value-String als Default; ohne render-callback gibt es keinen Mapping-Pfad zum Label. Fix: `renderSelected(value)` als Function-Child von `<SelectValue>` in `cockpit/src/app/(app)/proposals/[id]/edit/payment-terms-dropdown.tsx` — mappt CUSTOM_VALUE auf "(eigene Eingabe)" und Template-IDs auf `${tpl.label}${is_default ? ' (Default)' : ''}`. Live-Smoke nach User-Coolify-Redeploy.

### ISSUE-053 — Skonto-Edit-Flicker durch Server-Save mit invaliden Zwischenzustand
- Status: resolved
- Severity: High
- Area: UI / Proposals-Editor
- Summary: Auch nach ISSUE-051-Fix (Inputs bleiben gemountet) erschien beim Backspace im Prozent- oder Tage-Input kurz die Validation-Message "Beide Skonto-Felder muessen gesetzt sein", danach rollte SLC-572-Revert auf den letzten gueltigen Wert zurueck. User konnte das Feld nicht editieren — er hatte nicht genug Zeit, eine neue Zahl zu tippen, bevor der debounced Server-Save mit dem invaliden Zwischenzustand feuerte und revertet wurde.
- Impact: Selbst nach beiden vorherigen Fixes (ISSUE-049 via SLC-572 + ISSUE-051 via isOn-Inferenz) blieb das normale Edit-Tippen unbenutzbar. Discovered durch User-Smoke 2026-05-05 (2. Live-Smoke gegen commit 64c0178).
- Resolution: 2026-05-05 in V5.7-Follow-up #2. Client-side Validation-Gate in `persistPatch` (proposal-editor.tsx). Wenn der debounced Patch einen Skonto-Touching-Patch ist und client-side `validateSkonto(patch.skonto_percent, patch.skonto_days)` rejected, wird der Server-Save NICHT ausgefuehrt — `return` statt `updateProposal()`. SkontoSection zeigt die Inline-Validation-Message via `<p>{validation.error}</p>` bereits an; SaveIndicator bleibt am letzten erfolgreichen Stand. Sobald der User einen validen Wert tippt (z.B. nach Backspace die "3" eingibt), feuert der naechste debounced Save mit gueltigem Patch durch. Mein SLC-572-Revert-on-Server-Error bleibt als Defense-in-Depth fuer echte Server-Reject-Pfade (z.B. Concurrent-Edit, Lock-Status).

### ISSUE-051 — Skonto-Inputs unmounten waehrend Edit-Tippen (Optimistic-null Race)
- Status: resolved
- Severity: High
- Area: UI / Proposals-Editor
- Summary: Mit V5.7 SLC-572 useRef-Revert-Fix: wenn der User waehrend Edit den Prozent- oder Tage-Input mit Backspace komplett leert, wechselt SkontoSection's `isOn = (skonto_percent !== null)` sofort auf false (optimistic state hat null), die Inputs unmounten DOM-mauml;ssig, der Cursor verliert das Feld. User kann keine neue Zahl eingeben. Fehlt fuer 500ms+ bis das Server-Reject + Revert die Inputs zurueckbringt.
- Impact: SLC-572-Hauptfunktion (Toggle-Drift-Fix) ist technisch korrekt, aber das normale Editieren der Skonto-Werte ist gestoert. AC8 Live-Smoke konnte nicht ausgefuehrt werden, weil die Vorbereitungs-Aktion (Backspace) selbst den User-Flow unterbrach. Discovered durch User-Smoke 2026-05-05 RPT-302.
- Resolution: 2026-05-05 in V5.7-Follow-up. `isOn = (skonto_percent !== null || skonto_days !== null)` statt `(skonto_percent !== null)` — Inputs bleiben gemountet solange mindestens ein Feld einen Wert hat. Toggle-Click setzt beide auf null, dadurch isOn=false korrekt erhalten. Edge-Case "User Backspace BEIDE Felder gleichzeitig" ist akzeptabel (debounce-timer reset bei jedem Keystroke macht das in der Praxis irrelevant). DEC-126 / lastKnownGoodSkontoRef-Pattern bleibt unangetastet. **Hinweis:** Inputs bleiben zwar gemountet, aber das eigentliche Edit-Verhalten war erst nach ISSUE-053-Fix (Validation-Gate vor Server-Save) tatsaech.lich benutzbar.

### ISSUE-050 — Audit-Log UI-Renderer zeigt generic-update-changes als "[object Object]"
- Status: resolved
- Severity: Medium
- Area: UI / Audit-Log
- Summary: Auf `/audit-log` rendert der Changes-Cell-Renderer fuer Eintraege mit `action='update'` und nested `changes={ before: {...}, after: {...} }` den Wert als JS-Default-Repr `[object Object] → [object Object]` statt formatierter Diff. `action='reverse_charge_toggled'`-Eintraege (V5.7 MT-7) und andere flat-changes-Actions rendern dagegen sauber (z.B. `tax_rate: 9 → 0`).
- Impact: Audit-Trail ist fuer alle Workspace-Auto-Save-Eintraege (mehrere pro Tag) effektiv unleserlich. DSGVO-/Compliance-Reviewability eingeschraenkt. Daten in DB sind korrekt, nur Rendering ist defekt.
- Workaround: Direkter SQL-Query auf `audit_log.changes` JSONB liefert die echten Werte. Cockpit-View nicht nutzbar.
- Resolution: 2026-05-06 in V6.3 SLC-631 MT-5. Pure-Function `formatAuditChanges(changes, action)` in `cockpit/src/lib/audit/format.ts` extrahiert + 12 Vitest-Cases in node-Env. Heuristisches Detect: wenn der erste Wert in changes.before/after selbst ein {before,after}-Objekt ist, wird die Struktur als doppelt-verschachtelt behandelt (Workspace-Auto-Save in saveProposal-Pattern, `before: { tax_rate: { before: 9, after: 0 } }`). Sonst flat-Pattern (V5.7 explicit-action-Schreibweise mit `before: { tax_rate: 9 }`). `audit-log-client.tsx ChangesPreview` ruft die Pure-Function statt selbst zu formatieren. Pre-Scan zeigte nur eine Renderer-Stelle, daher kein Sub-Tasks notwendig. Schema in DB unveraendert — kein retroaktives Re-Format historischer Eintraege.

### ISSUE-049 — SLC-562 UI-State-Drift im SkontoSection nach Auto-Save-Error
- Status: resolved
- Severity: Low
- Area: UI / Proposals-Editor
- Summary: Nach mehreren Server-rejected Auto-Saves im SkontoSection (z.B. Prozent=10 ausserhalb Range) flippt der Toggle visuell in OFF-Zustand, obwohl die DB den vorherigen gueltigen State haelt.
- Impact: Cosmetic-Drift zwischen UI und DB. Selbstheilend nach Page-Reload. DB-State immer korrekt. Validation greift korrekt mit Inline-Error.
- Workaround: Page-Reload zeigt aktuellen DB-State.
- Resolution: 2026-05-04 in SLC-572 (DEC-126 Option A). `lastKnownGoodSkontoRef` useRef in `proposal-editor.tsx` initialisiert mit DB-State, bei jedem erfolgreichen Skonto-Save aktualisiert. Auf Save-Error fuer einen Skonto-touching Patch ruft `persistPatch` `onProposalChange(revert)` mit den last-known-good Werten auf, sodass der Toggle/Input-State auf den letzten vom Server bestaetigten Stand zurueckrollt. Decision-Logic ist als pure Function in `cockpit/src/lib/proposal/skonto-revert.ts` extrahiert und mit 16 Vitest-Tests im Node-Env abgesichert (RPT-277-Repro inkl.). Keine Pattern-Erweiterung auf PaymentTermsDropdown/SplitPlanSection — beide nutzen andere Persist-Pfade ohne den gleichen Race (SplitPlanSection validiert pre-flight, sendet bei invalid plan nicht; PaymentTermsDropdown hat nur length-checks ohne realistisches Reject-Pattern).

### ISSUE-048 — SLC-562 PaymentTermsDropdown initial Display-Bug
- Status: resolved
- Severity: Medium
- Area: UI / Proposals-Editor
- Summary: Bei initial render zeigt der Bedingungs-Dropdown den Raw-Value '__custom__' statt des Labels '(eigene Eingabe)'. base-ui SelectValue-Placeholder greift nicht weil useState<string>(CUSTOM_VALUE) gesetzt ist.
- Impact: UX-Anomalie beim Erstmount des Editors. Nach erstem Klick + Auswahl funktioniert es korrekt. Cosmetic, nicht release-blockierend.
- Resolution: 2026-05-02 in BL-418 Hotfix. `useState<string>(CUSTOM_VALUE)` → `useState<string>("")` in `cockpit/src/app/(app)/proposals/[id]/edit/payment-terms-dropdown.tsx`. Empty-String matched kein SelectItem, daher greift der base-ui-Placeholder "(eigene Eingabe)" beim Initial-Mount korrekt. Nach User-Auswahl wird der echte Wert (Template-ID oder CUSTOM_VALUE) gesetzt und das passende SelectItem-Label angezeigt. TypeScript clean.

### ISSUE-047 — F1 React Hydration #418 auf /proposals (Listing-Card Datums-Drift)
- Status: resolved
- Severity: Medium
- Area: UI / Hydration
- Summary: Auf `/proposals` (Listing-Seite) feuert React Hydration Error #418. Ursache war NICHT wie vermutet ein Datums-Format-Drift — Code-Audit (RPT-268) zeigte: Listing rendert kein Datum, kein `Math.random`/`Date.now`/`toLocale` im Render-Pfad. Wahrscheinliche Quelle: Browser-Extension am `<body>`-Element (Standard-Pattern).
- Impact: UI funktional unauffaellig (kein User-sichtbarer Bruch), aber Console-Warning + potenzielle Performance-Degradation bei Re-Render.
- Resolution: 2026-05-01 in V5.5.1 Polish-Patch (Commit `42495cc`). `suppressHydrationWarning` auf `<html>` + `<body>` im Root-Layout (`cockpit/src/app/layout.tsx`). Standard-Pattern fuer extension-induzierten Top-Level-Diff. Limitation: falls #418 weiterhin auftritt, ist die Quelle tiefer (Provider-Race, Auth-State-Drift) und braucht Live-Console-Inspection.

## Blocker

### ISSUE-001 — Dockerfile für Cockpit fehlt
- Status: resolved
- Severity: Blocker
- Area: Infrastructure / Docker
- Summary: `/cockpit/Dockerfile` existiert nicht, wird aber in `docker-compose.yml` Zeile 25 referenziert. Docker Compose kann ohne Dockerfile nicht bauen.
- Impact: Stack kann nicht gestartet werden.
- Next Action: Erledigt — Multi-Stage Dockerfile erstellt (2026-03-27).

### ISSUE-002 — Dockerfile.kong für Kong Env-Var-Substitution fehlt
- Status: resolved
- Severity: Blocker
- Area: Infrastructure / Kong
- Summary: Kong 2.x ersetzt `${ENV_VAR}` in deklarativer Config nicht automatisch. Das Blueprint-Projekt nutzt `config/Dockerfile.kong` mit `envsubst`. Business System referenziert stattdessen `image: kong:2.8.1` direkt.
- Impact: Kong startet, aber Auth-Keys werden nicht eingesetzt. API entweder komplett offen oder komplett blockiert.
- Next Action: Erledigt — Dockerfile.kong + docker-entrypoint.sh erstellt, docker-compose.yml auf build umgestellt (2026-03-27).

### ISSUE-039 — Recording-Volume fuer nextjs-User nicht lesbar (Call-Pipeline blockiert)
- Status: resolved
- Severity: Blocker
- Area: V5.1 / Call-Pipeline / Container-Permissions
- Summary: `/var/spool/asterisk/monitor` (gemounted als `/recordings-calls:ro` im app-Container) ist mit `drwxr-x---` (0750) owned by UID 101 (asterisk). App-Container laeuft als `nextjs` (UID 1001, group nogroup). Kein Lesezugriff moeglich.
- Impact: `/api/cron/call-processing` findet keine WAVs, ALLE Calls werden mit "WAV not yet available" skipped. Gesamte SLC-514 Pipeline (Upload + Whisper + Summary + Timeline) steht still. Verifiziert via manueller Cron-Trigger am 2026-04-24 — 1 vorhandener Test-Call blieb in recording_status='not_recording'.
- Workaround: Keiner ohne Code-Fix. Manuelle chmod 0755 auf Volume koennte funktionieren, ist aber nicht persistent.
- Next Action: Erledigt 2026-04-24 — `asterisk/entrypoint.sh` ergaenzt um `chmod 0755 /var/spool/asterisk/monitor/` + `umask 022` vor `exec asterisk`. Asterisk-Container-Redeploy erforderlich, damit neuer Entrypoint greift.

### ISSUE-040 — Supabase Storage Uploads broken (latent seit Supabase-Upgrade)
- Status: resolved
- Severity: Blocker
- Area: Supabase Self-Hosted / Storage / Role Delegation
- Summary: `supabase_storage_admin` konnte `set_config('role','service_role',...)` nicht ausfuehren, weil die Role-Membership fehlte. ZUSAETZLICH fehlten Schema-Grants auf `storage` und der `search_path` der Request-Rollen. Jeder Upload an irgendeinem Bucket (Meeting + Call) schlug fehl mit PostgreSQL-Error 42501, von der storage-api als "new row violates row-level security policy" gemeldet.
- Impact: SLC-514 Call-Recording-Pipeline blockiert beim Upload-Schritt. Meeting-Recording-Upload (V4.1) war seit letztem Supabase-Upgrade LATENT kaputt — bisher nicht bemerkt, weil kein Meeting-Recording seit dem Upgrade stattfand. Storage-Buckets `meeting-recordings` und `call-recordings` waren beide objektleer.
- Workaround: Keiner — ohne die Grants geht kein Upload durch service_role.
- Next Action: Erledigt 2026-04-24 via MIG-021 (sql/migrations/021_v51_storage_grants_fix.sql): GRANT anon/authenticated/service_role TO supabase_storage_admin, GRANT USAGE ON SCHEMA storage, GRANT CRUD auf storage-Tabellen, search_path=storage,public fuer die Supabase-Request-Rollen. Zusaetzlich MIG-020 um die fehlerhaften call_recordings RLS-Policies bereinigt — wir nutzen BYPASSRLS auf service_role genauso wie meeting-recordings es schon immer tut. E2E-Test am 2026-04-24 gruen: Upload+Whisper+Summary+Activity durchgelaufen.

## High

### ISSUE-003 — Supabase DB Init-Scripts werden durch Volume-Mount überschrieben
- Status: resolved
- Severity: High
- Area: Infrastructure / Database
- Summary: `docker-compose.yml` mapped `./sql:/docker-entrypoint-initdb.d` als Volume. Das überschreibt die Supabase-internen Init-Scripts die Rollen wie `supabase_auth_admin`, `authenticator`, `anon` anlegen.
- Impact: PostgREST, GoTrue und Storage können sich nicht authentifizieren.
- Next Action: Erledigt — sql/Dockerfile.db + sql/00_roles.sh erstellt, docker-compose.yml auf build umgestellt (2026-03-27).

### ISSUE-004 — Kontakt-Bearbeiten UI fehlt
- Status: resolved
- Severity: High
- Area: Frontend / CRM
- Summary: `updateContact` Server Action existiert, aber keine UI nutzt sie. Kein Bearbeiten-Button auf Kontakt-Detail oder in der Liste.
- Impact: Acceptance Criterion "Kontakte bearbeiten" (FEAT-001) nicht erfüllt.
- Next Action: Erledigt — ContactSheet nutzt jetzt updateContact bei vorhandenem contact-Prop, Bearbeiten-Button auf Detail-Seite (2026-03-27).

### ISSUE-005 — Firmen-Bearbeiten UI fehlt
- Status: resolved
- Severity: High
- Area: Frontend / CRM
- Summary: Gleich wie ISSUE-004 für Firmen. `updateCompany` existiert, aber keine UI.
- Impact: Acceptance Criterion "Firmen bearbeiten" nicht erfüllt.
- Next Action: Erledigt — CompanySheet nutzt jetzt updateCompany bei vorhandenem company-Prop, Bearbeiten-Button auf Detail-Seite (2026-03-27).

### ISSUE-006 — Skills nicht als Claude Code Slash-Commands registriert
- Status: resolved
- Severity: High
- Area: Skills / Claude Code
- Summary: 8 SKILL.md Dateien liegen unter `/skills/`. Claude Code erwartet Skills unter `.claude/commands/`. Ohne korrekte Registrierung sind Skills nicht als `/skill-name` aufrufbar.
- Impact: Acceptance Criterion "Skills sind über Claude Code als `/skill-name` aufrufbar" unsicher.
- Next Action: Erledigt — 8 Skills nach `.claude/commands/` kopiert (blog-post, cold-email, competitor-analysis, content-strategy, copywriting, create-proposal, linkedin-post, sales-enablement). Quell-Dateien bleiben in `/skills/` (2026-03-27).

## Medium

### ISSUE-007 — Kontakt-Detail enthält Stub für Aktivitäten
- Status: resolved
- Severity: Medium
- Area: Frontend / CRM
- Summary: Platzhalter-Text "Aktivitäten-Timeline wird in SLC-005 implementiert" in Production-Code.
- Next Action: Erledigt — Stub ersetzt durch ActivityTimeline + DocumentList (2026-03-27).

### ISSUE-008 — Native select statt shadcn Select im Kontakt-Formular
- Status: open
- Severity: Medium
- Area: Frontend / UI-Konsistenz
- Summary: Firma-Auswahl in `contact-form.tsx` nutzt natives `<select>` statt shadcn Select. Funktional korrekt, visuell inkonsistent.
- Next Action: Durch shadcn Combobox oder Select ersetzen.

### ISSUE-009 — Keine Fehlermeldungen bei CRUD-Operationen
- Status: resolved
- Severity: Medium
- Area: Frontend / UX
- Summary: Contact-Sheet und Company-Sheet prüfen Fehler für Close-Logik, zeigen aber keinen Fehler-Text an. User bekommt bei fehlgeschlagenem Create/Update kein Feedback.
- Next Action: Erledigt — Error-State + Anzeige in allen 5 Sheets (Contact, Company, Deal, DealEdit, Calendar Entry) (2026-03-27).

### ISSUE-012 — updateDeal setzt stage_id nicht
- Status: resolved
- Severity: High
- Area: Frontend / Pipeline
- Summary: `updateDeal` in `pipeline/actions.ts` enthält `stage_id` nicht im Update-Objekt. Stage-Änderung über das Bearbeiten-Formular wird ignoriert.
- Impact: Acceptance Criterion "Deals bearbeiten" teilweise nicht erfüllt.
- Next Action: Erledigt — stage_id in updateDeal aufgenommen (2026-03-27).

### ISSUE-013 — Drag-Cancel revertiert optimistischen State nicht
- Status: resolved
- Severity: High
- Area: Frontend / Kanban
- Summary: Wenn ein Drag abgebrochen wird (Drop außerhalb aller Columns), wird der optimistische State nicht zurückgesetzt. Card bleibt visuell in der falschen Column bis Page-Refresh.
- Impact: UX-Vertrauen in Kanban-Board.
- Next Action: Erledigt — State-Reset auf initialDeals bei !over in handleDragEnd (2026-03-27).

### ISSUE-014 — Click vs. Drag Konflikt auf Deal-Cards
- Status: resolved
- Severity: High
- Area: Frontend / Kanban
- Summary: KanbanCard hat sowohl Drag-Listeners als auch onClick. Nach einem Drag könnte onClick zusätzlich feuern. Kein Tracking ob Drag stattfand.
- Impact: Unbeabsichtigtes Öffnen des Edit-Sheets nach Drag.
- Next Action: Erledigt — isDragging-Check vor onClick (2026-03-27).

## Medium

### ISSUE-041 — Call-Processing-Cron interferiert mit SMAO-Calls (latent bis SMAO_ENABLED=true)
- Status: resolved
- Severity: Medium
- Area: V5.1 / Call-Processing / SMAO-Integration
- Summary: Der Cron `/api/cron/call-processing` wuerde SMAO-Calls ohne `recording_url` aufgreifen. Query filtert auf `recording_url IS NULL AND status='completed' AND ended_at IS NOT NULL`. Mein SLC-515 Webhook-Insert setzt exakt diese Felder (status='completed', ended_at=now) und `recording_url=null` wenn SMAO keine URL liefert. Der Cron-Worker versucht dann eine nicht-existente WAV-Datei unter `/recordings-calls/{id}.wav` zu lesen (SMAO-Calls laufen nicht ueber Asterisk-MixMonitor).
- Impact: Keiner in V5.1-Release (SMAO_ENABLED=false default, keine SMAO-Webhooks). Bei SMAO-Go-Live wuerde der Cron bei jedem SMAO-Call in "WAV not yet available" bzw. "file not found" laufen und eventuell `recording_status='failed'` setzen.
- Workaround: SMAO_ENABLED=false beibehalten (aktueller Zustand).
- Resolution: 2026-04-25 — Option (a) umgesetzt. Cron-Query in `cockpit/src/app/api/cron/call-processing/route.ts` um `.eq("voice_agent_handled", false)` ergaenzt. SMAO-Calls werden jetzt vom Asterisk-Pipeline-Cron ignoriert. Pre-SMAO-Go-Live-Blocker entfernt.

### ISSUE-015 — Letzte Aktivität fehlt auf Deal-Cards
- Status: open
- Severity: Medium
- Area: Frontend / Pipeline
- Summary: Slice-Spec verlangt "letzte Aktivität" auf Deal-Karten. getDealsForPipeline jointed nicht die activities-Tabelle. Activity-Infrastruktur existiert jetzt (SLC-005), aber Join auf Deal-Cards fehlt noch.
- Next Action: getDealsForPipeline um activities-Join erweitern, KanbanCard um letzte Aktivität ergänzen.

### ISSUE-016 — reorderStages definiert aber nie aufgerufen
- Status: resolved
- Severity: Medium
- Area: Frontend / Settings
- Summary: `reorderStages()` existiert in actions.ts, wird aber nie aufgerufen. GripVertical-Icon in Settings ist rein dekorativ.
- Next Action: Erledigt — GripVertical-Icons und reorderStages-Funktion entfernt (2026-03-27).

### ISSUE-017 — getContactsForSelect dupliziert in Pipeline-Seiten
- Status: resolved
- Severity: Medium
- Area: Frontend / Code Quality
- Summary: Gleiche Funktion `getContactsForSelect` in endkunden/page.tsx und multiplikatoren/page.tsx statt in shared actions.
- Next Action: Erledigt — Funktion in contacts/actions.ts extrahiert, Pipeline-Seiten importieren sie (2026-03-27).

### ISSUE-018 — Supabase Storage Bucket "documents" wird nirgends erstellt
- Status: resolved
- Severity: High
- Area: Infrastructure / Storage
- Summary: `uploadDocument` referenziert `supabase.storage.from("documents")`, aber kein Storage Bucket existiert in Init-Scripts oder Migrations. Upload schlägt zur Laufzeit fehl.
- Impact: Dokument-Upload funktioniert nicht ohne manuelles Erstellen des Buckets.
- Next Action: Erledigt — Storage Bucket + RLS Policies in 02_rls.sql hinzugefügt (2026-03-27).

### ISSUE-019 — Aktivitäten + Dokumente fehlen auf Deal-Ebene
- Status: resolved
- Severity: Medium
- Area: Frontend / Pipeline
- Summary: Behoben durch SLC-202 (Deal-Detail-Popup mit 4 Tabs: Übersicht, Aktivitäten, Angebote, Bearbeiten). getDealWithRelations lädt Activities, Proposals, Emails, Signals parallel.

### ISSUE-020 — deleteDocument prüft Storage-Delete-Ergebnis nicht
- Status: open
- Severity: Medium
- Area: Backend / Storage
- Summary: Storage-Remove Ergebnis wird in document-actions.ts ignoriert. DB-Record wird gelöscht auch wenn Storage-Delete fehlschlägt.
- Next Action: Storage-Delete Ergebnis prüfen oder zumindest loggen.

## Low

### ISSUE-023 — Monatsende-Berechnung ist Zeitzonen-abhängig
- Status: resolved
- Severity: Medium
- Area: Backend / Calendar
- Summary: `new Date(y, m, 0).toISOString()` in getEntries month filter gibt UTC zurück. In CET kann der Vortag resultieren, wodurch Einträge am Monatsletzten nicht angezeigt werden.
- Next Action: Erledigt — String-basierte Berechnung mit getDate() (2026-03-27).

### ISSUE-024 — Keine Filter-UI in Kalender-Tabellenansicht
- Status: wontfix
- Severity: Medium
- Area: Frontend / Calendar
- Summary: Spec verlangt Filter nach Typ, Status, Kanal. Server Action unterstützt Filter, aber Table-UI hat keine Filter-Dropdowns.
- Next Action: Content-Kalender in V2 entfernt (zu System 4 verschoben). Issue obsolet.

### ISSUE-025 — Status-Advance hat kein Undo
- Status: wontfix
- Severity: Low
- Area: Frontend / Calendar
- Summary: Status-Badge-Klick geht nur vorwärts. Kein Zurücksetzen möglich. Akzeptabel für internal-tool.
- Next Action: Content-Kalender in V2 entfernt. Issue obsolet.

### ISSUE-021 — any-Typ in RecentActivities
- Status: resolved
- Severity: Medium
- Area: Frontend / TypeScript
- Summary: `activities: any[]` in recent-activities.tsx statt typisiert. Funktional korrekt, schwächt TypeScript-Schutz.
- Next Action: Erledigt — DashboardActivity-Typ definiert (2026-03-27).

### ISSUE-026 — TopBar Logout-Button hat keinen Handler
- Status: resolved
- Severity: High
- Area: Frontend / Auth
- Summary: Logout DropdownMenuItem hatte weder onClick noch Form Action. Klick auf Logout machte nichts.
- Next Action: Erledigt — signout Action als Form Action im DropdownMenu verdrahtet (2026-03-27).

### ISSUE-029 — NEXT_PUBLIC_* Variablen fehlen beim Docker Build
- Status: resolved
- Severity: Blocker
- Area: Infrastructure / Docker
- Summary: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY werden client-seitig verwendet und beim Next.js Build inline. Dockerfile hatte keine ARG-Deklarationen, Build lief mit undefined Werten.
- Impact: Supabase-Verbindung im Browser funktioniert nicht.
- Next Action: Erledigt — ARG im Dockerfile + args in docker-compose.yml (2026-03-27).

### ISSUE-027 — /auth/set-password Route fehlt
- Status: open
- Severity: Medium
- Area: Frontend / Auth
- Summary: Invite-Flow redirected auf /auth/set-password, Route existiert aber nicht. Invite-Links enden in 404.
- Impact: Einladungs-Flow für neue User funktioniert nicht. Login per Password funktioniert.
- Next Action: V2 — Invite-Flow ist nicht V1-Scope. Password-Login deckt V1 ab.

### ISSUE-028 — Root Layout hat Scaffold-Metadata
- Status: resolved
- Severity: Medium
- Area: Frontend / Meta
- Summary: title "Create Next App", description "Generated by create next app" im Root Layout.
- Next Action: Erledigt — Metadata auf "Business Cockpit — Strategaize" gesetzt (2026-03-27).

### ISSUE-022 — getPipelineSummaries hat N+1 Query-Pattern
- Status: open
- Severity: Low
- Area: Backend / Performance
- Summary: Pro Pipeline 2 separate Queries (Stages + Deals). Bei 2 Pipelines = 5 Queries total. Akzeptabel für V1.
- Next Action: Bei Skalierung auf eine aggregierte Query umstellen.

### ISSUE-010 — Dashboard ist nur Stub
- Status: resolved
- Severity: Low
- Area: Frontend / Dashboard
- Summary: Dashboard-Seite zeigt nur "Willkommen im Business Cockpit". Geplant für SLC-006.
- Next Action: Erledigt — Dashboard mit Stats, Pipeline-Summary, Aktivitäten-Feed, Upcoming Actions (2026-03-27).

### ISSUE-011 — .env.local enthält Platzhalter-Werte
- Status: open
- Severity: Low
- Area: Configuration
- Summary: Platzhalter wie "placeholder-will-be-replaced" in .env.local. Akzeptabel für Dev, .gitignore schützt vor Commit.
- Next Action: Bei Deployment echte Werte einsetzen (SLC-011).

### ISSUE-031 — SLC-414 JWT-fuer-Externe-Teilnehmer inkonsistent zur Architecture
- Status: resolved
- Severity: High
- Area: Planning / V4.1 / FEAT-404
- Summary: ARCHITECTURE.md zeigt Redirect mit `?jwt={token}` in URL fuer externe Teilnehmer. SLC-414 MT-5 sagt explizit "ohne JWT im Link". Jitsi laeuft mit `ENABLE_AUTH=1` (SLC-412), externe ohne JWT koennen nicht in den Raum.
- Impact: SLC-414 implementiert wuerde fuer Host funktionieren, externe Teilnehmer wuerden HTTP 401 erhalten. Meeting-Flow kaputt fuer den Hauptanwendungsfall.
- Workaround: Vor SLC-414 Implementation klaeren. Empfehlung: Per-Recipient-JWT mit `moderator=false`, eingebettet in Einladungs-URL.
- Next Action: Erledigt 2026-04-15 — SLC-414 MT-1 bietet jetzt 2 JWT-Varianten (Moderator + Participant), MT-4 erzeugt pro Teilnehmer individuellen JWT, MT-5 baut Einladungs-URL mit `?jwt=<participant-jwt>`. AC-6 + AC-7 + AC-8 ergaenzt. Verifikation in SLC-414 Implementation.

### ISSUE-032 — contacts.opt_out_communication-Flag fehlt fuer FEAT-409 AC-5 Respect-Logik
- Status: resolved
- Severity: Medium
- Area: Planning / V4.1 / FEAT-409
- Summary: FEAT-409 AC-5 verlangt Respect-Flag am Kontakt, das verhindert Reminder-Versand bei Opt-out. SQL-Migrations (V1-V4) zeigen kein solches Feld. SLC-411 MT-1 (MIG-011) fuegt es nicht hinzu. SLC-417 erwaehnt es nur als Scope-Notiz, ohne Schema-Zuordnung.
- Impact: SLC-417 implementierbar, aber ohne Opt-out-Check verletzt es spaeter FEAT-409 AC-5. Zweite Migration noetig wenn nicht in MIG-011 mit aufgenommen.
- Workaround: Spalte `opt_out_communication BOOLEAN DEFAULT false` zu MIG-011 (SLC-411 MT-1) hinzufuegen + UI-Toggle in SLC-411 MT-7.
- Next Action: Erledigt 2026-04-15 — SLC-411 MT-1 (MIG-011) enthaelt jetzt `contacts.opt_out_communication BOOLEAN DEFAULT false`. SLC-411 MT-7 UI zeigt Opt-out-Toggle. SLC-414 MT-5 respektiert Flag beim Einladungs-Versand. Neuer AC-7 + AC-9 in SLC-411. Verifikation in SLC-411 Implementation.

### ISSUE-034 — 6 V2/V3-Tabellen RLS-enabled ohne Policy (Insert implizit verboten)
- Status: resolved
- Severity: High
- Area: Database / RLS
- Summary: `emails`, `fit_assessments`, `handoffs`, `proposals`, `referrals`, `signals` hatten RLS enabled (`relrowsecurity=true`), aber keine einzige Policy (`pg_policy` = 0 rows). Postgres-Verhalten: RLS an + keine Policy = alles implizit verboten fuer authenticated. Bei SLC-411 Live-Test durch Klick auf "E-Mail senden" als "new row violates row-level security policy for the table 'emails'" sichtbar geworden. Historisch: V2/V3-Migrationen haben RLS aktiviert, aber die `authenticated_full_access`-Policy wurde nur in `sql/02_rls.sql` fuer V1-Tabellen per DO-Block angelegt — nachtraeglich hinzugefuegte Tabellen blieben policy-los.
- Impact: Insert/Update/Delete auf 6 Tabellen war fuer authenticated User gebrochen. E-Mail-Versand-Logging, Fit-Assessment-Speichern, Handoff-Erstellung, Proposal-Speichern, Referral-Tracking, Signal-Insert aus der Cockpit-UI waren alle betroffen. adminClient (service_role mit BYPASSRLS) war nicht betroffen — das erklaert warum bestimmte Code-Pfade (IMAP-Sync, Cron-Jobs) trotzdem liefen.
- Next Action: Erledigt 2026-04-16 — `sql/14_fix_missing_rls_policies.sql` legt `authenticated_full_access` Policy auf alle 6 Tabellen an (idempotent via DROP POLICY IF EXISTS + CREATE POLICY) und setzt explizite Grants. Auf Hetzner angewendet, verifiziert: alle 6 Tabellen haben jetzt genau 1 Policy.

### ISSUE-033 — Public-Revoke-Link nach Grant funktionslos (Token-Invalidierung)
- Status: open
- Severity: Medium
- Area: FEAT-411 / Consent-Flow
- Summary: SLC-411 invalidiert `consent_token` nach grant/decline (QA-Focus "Token nach Grant invalidiert"). Der Widerruf-Link in der Consent-Mail nutzt aber denselben Token. Nach Grant geht der Widerruf-Link aus der Mail ins Leere ("Link nicht gefunden"). Public-Widerruf nach Zustimmung ist damit nur ueber manuelle UI (revokeConsentManual) moeglich, nicht ueber den Link in der Original-Mail.
- Impact: User, die granted haben und spaeter per Mail-Link widerrufen wollen, bekommen "Link nicht gefunden". Das ist ein DSGVO-Komfort-Gap (Widerruf muss leicht moeglich sein). Interner User kann Widerruf manuell ueber Kontakt-Detail ausloesen.
- Workaround: Widerruf-Prozess: User per Mail an Besitzer → Besitzer klickt "Widerrufen" im Kontakt-Workspace. Langfristig (V4.2+): Separater persistenter `revoke_token` in contacts oder Re-Generation des Tokens mit jedem Mail-Versand.
- Next Action: In V4.2-Planning aufnehmen. Architektur-Entscheidung noetig: dauerhafter revoke_token vs. pro-Mail-Token-Rotation. Bis dahin ist manueller Widerruf der offizielle Weg.

### ISSUE-035 — Jibri finalize-script Placeholder-Error nach Recording
- Status: open
- Severity: Low
- Area: FEAT-404 / SLC-412 / Recording
- Summary: Nach erfolgreichem MP4-Write versucht Jibri `/path/to/finalize` auszufuehren (Default-Platzhalter aus jibri.conf). `java.io.IOException: Cannot run program "/path/to/finalize": error=2, No such file or directory`. MP4 ist bereits geschrieben und valide, Error kommt rein post-processing.
- Impact: Keine auf Recording-Qualitaet. Log-Noise "SEVERE" in Jibri, koennte Monitoring-Alerts ausloesen.
- Workaround: SLC-415 implementiert Poll-basiertes Upload (Cron alle 2 Min liest /recordings, uploaded nach Supabase Storage). Finalize-Script wird dadurch nicht mehr benoetigt fuer Upload. Log-Noise bleibt.
- Next Action: Optional: `JIBRI_FINALIZE_RECORDING_SCRIPT_PATH=""` in Jibri-ENV setzen um Log-Noise zu eliminieren. Kein funktionaler Blocker mehr.

### ISSUE-036 — Jitsi Bridge Channel Qualitaets-Warning bei 1-User-Recording
- Status: open
- Severity: Low
- Area: FEAT-404 / SLC-412 / WebRTC
- Summary: Beim Jibri-Server-Recording-Smoke-Test erschien Jitsi-Toast "Schlechte Videoqualitaet / Bridge Channel Verbindung wurde unterbrochen". Recording lief durch, MP4 korrekt. Ursache vermutet: Hairpin-NAT-UDP-Verlust (JVB-Media-Stream geht Container -> Public-IP -> Hetzner-Firewall -> zurueck zu JVB).
- Impact: UX-Noise bei internen Smoke-Tests. Bei echten Kunden-Meetings (externe Teilnehmer) waere der Pfad anders, aber das gleiche Problem koennte bei strikten Kunden-NATs auftreten.
- Workaround: Internal-Tool ohne externe Teilnehmer OK. Fuer externe Meetings: coturn-Server nachruesten (BL-206-Nachbar).
- Next Action: Bei ersten echten Kunden-Meetings nachmessen. Falls regelmaessig: coturn-Container als eigenen Slice planen. Aktuell kein V4.1-Blocker.

### ISSUE-037 — linux-modules-extra muss nach Kernel-Upgrade nachinstalliert werden
- Status: open
- Severity: Medium
- Area: Infrastructure / Hetzner Host
- Summary: Hetzner-Cloud-Ubuntu liefert `snd-aloop` nicht im Standard-Kernel — musste via `apt install linux-modules-extra-$(uname -r)` nachinstalliert werden, damit Jibri Audio erfasst. Aktueller Kernel: 6.8.0-106-generic, neuer 6.8.0-107 ist im APT verfuegbar. Bei naechstem Reboot wird der neue Kernel geladen — das `linux-modules-extra-6.8.0-107-generic` Paket ist aber nicht installiert, damit faellt snd-aloop aus → Jibri-Recording bricht.
- Impact: Stille Regression nach Kernel-Upgrade + Reboot. Jibri meldet ERR_CONNECTION_REFUSED oder Chrome-Crash, erster Smoke-Test nach Reboot schlaegt fehl.
- Workaround: Vor Reboot `apt install linux-modules-extra-$(uname -r)` fuer den NEUEN Kernel laufen lassen (uname -r dann noch der alte, deshalb explizit den kommenden Kernel angeben). Oder Auto-Hook einrichten: `apt-get install -y linux-modules-extra-\$(uname -r)` in /etc/apt/apt.conf.d/.
- Next Action: In Server-Maintenance-Runbook dokumentieren. Langfristig: APT-Hook fuer automatische Modules-Extra-Installation bei Kernel-Upgrades einrichten (eigener kleiner Infra-Slice oder Doctor-Checklist-Item).

### ISSUE-030 — Fremde Onboarding-Artefakte in Business-DB (Hostname-Kollision)
- Status: resolved
- Severity: High
- Area: Database / Infrastructure
- Summary: Am 2026-04-14 wurden versehentlich 5 Onboarding-Plattform-Tabellen (template, capture_session, block_checkpoint, knowledge_unit, validation_layer) sowie die Funktion `handle_new_user()` und der Trigger `on_auth_user_created` auf Business-DB angelegt. Ursache: beide Hetzner-Server (Business 91.98.20.191, Onboarding 159.69.207.29) haben denselben internen Hostname `coolify-ubuntu-4gb-nbg1-1`, sodass der SSH-Prompt keinen Unterschied zeigte.
- Impact: Neue User-Signups wären gebrochen, weil `handle_new_user()` in Spalten `tenant_id` und `email` schrieb, die Business-`profiles` nicht hat. Bestehender User (richard@bellaerts.de) war nicht betroffen.
- Next Action: Erledigt 2026-04-15 — Trigger, Funktion und die 5 leeren Tabellen gedropped, `_set_updated_at()` Helper mitentfernt. Verifikation: 25 Tabellen im public-Schema (erwartet), User + Profile intakt. Präventiv: SSH-Zugang via Claude-Code-Agent eingerichtet, alle DB-Eingriffe laufen jetzt nur noch via Agent (keine User-Paste-Sessions mehr), Hostname-Kollision kann sich damit nicht wiederholen (Adressierung nur noch per Public-IP).

### ISSUE-038 — VAPID_SUBJECT zeigt auf nicht-existierende E-Mail-Adresse
- Status: resolved
- Severity: Low
- Area: Push Notifications / ENV
- Summary: VAPID_SUBJECT in Coolify stand auf `mailto:admin@strategaizetransition.com` — diese Adresse existierte nicht. Geaendert auf `mailto:immo@bellaerts.de` am 2026-04-18 vor V4.1 Redeploy.
- Next Action: Erledigt.

### ISSUE-046 — Proposal-PDF Signed-URL nutzte internen Kong-Hostname (Mixed-Content)
- Status: resolved
- Severity: Blocker
- Area: V5.5 / SLC-553 / Storage / Self-Hosted-Supabase
- Summary: `admin.storage.from('proposal-pdfs').createSignedUrl(path, 300)` returnte URLs mit dem internen Container-Hostname `http://supabase-kong:8000`. Coolify-Reverse-Proxy hat KEIN Routing zu Kong (`https://business.strategaizetransition.com/supabase` liefert 404). Browser blockierte die HTTP-iframe-URL zusaetzlich mit Mixed-Content auf der HTTPS-Seite. Pattern identisch mit ISSUE-044 (V5.3 Logo) — die Signed-URL-Variante umgeht NICHT die Public-URL-Probleme.
- Impact: PDF-Generierung war serverseitig vollstaendig erfolgreich (Storage + DB-Persistenz + audit_log + Renderer-Performance), aber iframe-Anzeige + Download im Modal komplett broken. AC10 + AC11 verletzt. Nur durch echten externen Browser-Zugriff reproduzierbar.
- Workaround: Keiner ohne Code-Fix.
- Next Action: Erledigt 2026-04-30 via Hotfix Commit `91020b2`:
  1. Neue Route `cockpit/src/app/api/proposals/[id]/pdf/route.ts` (Pattern analog SLC-531 `/api/branding/logo`) — service_role-Download mit Auth-Check, Content-Type `application/pdf`, Content-Disposition inline mit Filename.
  2. `generateProposalPdf` returnt relative URL `/api/proposals/{id}/pdf?v={version}-{timestamp}` statt Signed-URL.
  3. `createSignedUrl` + `PDF_SIGNED_URL_TTL_SECONDS` entfernt.
  4. Cache-Buster verhindert iframe-Re-Use bei erneuter Generierung.
  5. Build + 76/76 Tests gruen, Re-Smoke nach Coolify-Redeploy PASS.

### ISSUE-045 — Server-side Total-Size-Limit fuer E-Mail-Anhaenge ist Client-Convenience
- Status: resolved
- Severity: Low
- Area: V5.4 / SLC-542 / E-Mail-Anhaenge / Storage
- Summary: `uploadEmailAttachment` ruft `validateAttachment(file, totalSizeSoFar=0)` — der Server hatte keinen Cross-Call-State und kannte nicht die kumulierte Anhang-Groesse der Compose-Session. Pro-File-Limit (10 MB) war 3-fach hart enforced (Browser + Upload + Send), aber das Total-Limit (25 MB) war nur Browser-Convenience.
- Impact: Niedrig fuer internal-tool single-user delivery-mode. Storage-Volumen-Verbrauch ohne Cleanup-Cron (DEC-104 deferred). Kein direkter Sicherheits-Impact, kein Daten-Verlust.
- Resolution: 2026-05-01 in V5.5.1 Polish-Patch (Commit `d996307`). `/api/emails/attachments` POST liest jetzt `admin.storage.from('email-attachments').list(${user.id}/${composeSessionId}/)` und summiert `f.metadata.size` als `totalSizeSoFar`. Validation greift, der Client-Bypass-Vektor ist geschlossen. Single list()-Call deckt zusaetzlich Filename-Kollisions-Suffix ab (gemeinsam mit SLC-542 L1).

### ISSUE-044 — Branding-Logo broken-image im Browser (Public-Storage extern nicht erreichbar)
- Status: resolved
- Severity: High
- Area: V5.3 / SLC-531 / Storage / Self-Hosted-Supabase
- Summary: Beim ersten Browser-Smoke-Test SLC-531 (2026-04-27) zeigt `<img src=...>` ein broken-image obwohl Upload + DB-Persistenz erfolgreich. Zwei Ursachen: (a) `admin.storage.getPublicUrl()` baut die URL aus `SUPABASE_URL=http://supabase-kong:8000` (Docker-intern, browser-unerreichbar). (b) `storage.objects` hatte 0 SELECT-Policies fuer den `branding`-Bucket — `public=true` allein reicht bei Self-Hosted-Supabase nicht. Zusaetzlich: das Hosting-Setup hat keinen Reverse-Proxy von `https://business.strategaizetransition.com/supabase/storage/...` zu Kong, d.h. selbst mit korrekter External-URL kommt nichts an.
- Impact: Logo-Anzeige in Form-Vorschau und in versendeten Mails kaputt. AC2/AC3 Browser-Smoke blockiert. AC8 Smoke (echte Mail) waere mit broken image bei Empfaengern angekommen.
- Workaround: Keiner ohne Code-Fix.
- Next Action: Erledigt 2026-04-27 via:
  1. MIG-024 (`024_v53_branding_storage_policy_fix.sql`) — SELECT-Policy `branding_public_read` fuer anon+authenticated; UPDATE alter Logo-URLs auf NULL (User laedt nach Code-Fix neu hoch).
  2. Strategie-Switch: Statt extern erreichbarer Kong-Public-URL liefern wir das Logo via Next.js-API-Route `/api/branding/logo` aus. Service_role-Client laedt das neueste File aus dem `branding`-Bucket und proxiet es mit korrektem Content-Type. Cache-Buster `?v=ts` erzwingt Refresh nach Upload. Middleware ergaenzt um `/api/branding` in publicPaths.
  3. `actions.ts uploadLogo` speichert jetzt `${NEXT_PUBLIC_APP_URL}/api/branding/logo?v=${Date.now()}` statt der Storage-URL.

### ISSUE-043 — Branding-Form Color-Picker submitted immer einen Wert (AC9-Drift)
- Status: resolved
- Severity: Medium
- Area: V5.3 / SLC-531 / /settings/branding / Renderer-Fallback
- Summary: `<input type="color">` im Branding-Form submitted IMMER einen gueltigen Hex-Wert (Default `#4454b8`/`#94a3b8`), auch wenn der User die Picker nie bewusst angefasst hat. Sobald der User auf `/settings/branding` einmal "Speichern" klickt, wird `primary_color` (und ggf. `secondary_color`) als nicht-null in `branding_settings` persistiert — `isBrandingEmpty` returnt danach `false`, der Renderer verlaesst den `textToHtml`-Fallback und schaltet auf Branding-Output (Inline-CSS, Footer-Linie). Damit gilt AC9 (Bit-fuer-Bit-Identitaet zum V5.2-Output) nur noch im **Initial-State** (User hat /settings/branding nie besucht).
- Impact: User-Erwartung "ich habe alles geleert, Mail sollte wieder plain rausgehen" wird nicht erfuellt, solange primary_color einen Wert hat. Kein Daten-Verlust und keine Sicherheitsluecke — nur ein latenter UX-Drift gegen die explizit dokumentierte AC9-Garantie. Keine V5.2-Regression im laufenden Production-System (DB-Empty-Row ist initial korrekt seeded).
- Resolution: 2026-04-28 in SLC-541 V5.4-Polish (DEC-102). `ConditionalColorPicker`-Komponente mit Toggle-Checkbox vor dem Color-Picker. Toggle aus → onChange(null), persistierter Wert NULL; Toggle an → onChange(hex), persistierter Wert = Hex. Initial-State leitet sich aus DB-Wert ab. AC9-Bit-Identitaet wieder zuverlaessig — User mit primary_color=NULL bekommt textToHtml-Fallback unabhaengig davon, ob er die Settings-Page besucht hat. Verifiziert in QA SLC-541 (RPT-243).

### ISSUE-042 — OpenAI-API-Key in untrackter Datei am Repo-Root
- Status: open
- Severity: High
- Area: Security / Credentials
- Summary: Datei `open AI Business system.txt` im Repo-Root enthaelt einen produktiven OpenAI-API-Key (`sk-proj-...`). Untracked (NIE in git history), nur lokal im Working-Tree seit ca. 2026-04-06. Risiko: versehentliches Commit via `git add .`, Filesystem-Zugriff durch Dritte, Credential-Leak ueber Backup/Cloud-Sync.
- Impact: OpenAI-Key ist fuer aktuellen V5.2-Whisper-Provider (`TRANSCRIPTION_PROVIDER=openai`) potenziell der Production-Key. Bei Leak: unautorisierte API-Nutzung auf Kosten des OpenAI-Account, unkontrollierte Kosten, Audio-Daten-Exposition durch Dritt-Calls.
- Workaround: Im V5.2 Final-Check (RPT-217) am 2026-04-26 wurde `.gitignore` defensiv um Credential-Patterns (`*api*key*.txt`, `open AI*.txt` u.a.) erweitert. Datei ist nun von Git unsichtbar — kann nicht mehr versehentlich committed werden.
- Next Action:
  1. Key bei OpenAI rotieren (platform.openai.com → API Keys → revoke + create new)
  2. Neuen Key in Coolify-ENV `OPENAI_API_KEY` setzen
  3. Lokale Datei loeschen oder nach `~/credentials/` ausserhalb des Repos verschieben
  4. (Pre-Go-Live Pflicht) Switch auf Azure OpenAI EU per `TRANSCRIPTION_PROVIDER=azure` macht den OpenAI-US-Key irrelevant — diese Massnahme reduziert Blast-Radius dauerhaft.
