# SLC-915 — V8.17 Regressions-Fix-Bundle (CSP-Feature-Flows + E-Mail-Bild-Toggle + MIG-055 changed-FK-only + startMeeting-Caller + Consent-Guard)

- Feature: FEAT-927
- Backlog: BL-520
- Version: V8.17
- Status: planned
- Delivery Mode: internal-tool (Internal-Test-Mode, Single-Branch `main`, kein Worktree — Precedent V8.12/14/15/16)
- Migration: MIG-055 (reserviert, additiv — DEC-307)
- Quellen: PRD §V8.17, ARCHITECTURE.md V8.17-Addendum (2026-07-07), DEC-306, DEC-307, KNOWN_ISSUES ISSUE-138..142, RPT-672 (Code-Review V8.16-Range), RPT-673 (/requirements), RPT-674 (/architecture)

## Goal

Die 5 von allen QA-Stufen übersehenen V8.16-Regressionen (RPT-672) in EINEM Slice schließen — Telefonie/Meeting-Audio unter enforced CSP wieder funktional, E-Mail-Viewer bewusst tracking-sicher mit opt-in Bild-Nachladen, RLS-Alltags-Updates im Multi-User-Betrieb entsperrt bei vollem Cross-Tenant-Injection-Schutz, kein Silent-Dead-Button, Consent-Gate fail-closed. CSP-Enforce-Härtung (SLC-910) bleibt erhalten — **kein Report-Only-Rollback** (Founder-Beschluss 2026-07-07).

## In Scope

Fünf chirurgische Fixes an bestehendem V8.16-Code + 1 additive Migration. Kein neues Subsystem, keine neuen npm-Packages, keine neuen Container.

## Out of Scope

- BL-519 Passwort-vergessen-Flow (eigener Pre-Multi-User-Slot)
- Bulk-Reassign-Parent-FK-Mit-Verschiebung (ISSUE-140 Option c — nicht gewählt)
- Persist-per-Absender des Bild-Toggles (DEC-306 OQ-1: session-only)
- Server-seitiger Bild-Proxy (DEC-306 verworfen)
- ISSUE-123/124/125/126 (Low, deferred)

## Acceptance Criteria

- **AC-915-1 (ISSUE-138):** In-App-SIP-Softphone verbindet unter enforced CSP (`wss://sip…` in `connect-src`) und hat Mikrofon-Zugriff (`microphone=(self)`). Funktionaler Telefonie-Browser-Smoke: 0 CSP/Permissions-Console-Errors auf dem Call-Flow (nicht nur Hydration).
- **AC-915-2 (ISSUE-138):** `camera=()` bleibt unverändert; kein App-Origin-Kamera-Flow existiert (Jitsi = separater Origin via `window.open`, siehe Step-0). Meeting-Audio-Smoke bestätigt: kein Permissions-Block auf dem Meeting-Start.
- **AC-915-3 (ISSUE-142):** `checkConsentStatus` ist fail-closed: `returned-Row-Count < contactIds.length` ⇒ fehlende IDs als `missing`, `allGranted=false`. Caller-unabhängig (Vitest deckt RLS-weggefilterte Row ab).
- **AC-915-4 (ISSUE-141):** `MeetingPrepCard` wertet `res.error` aus (sichtbare Meldung statt No-Op); `getNextMeetingWithContext` reicht keine RLS-unsichtbare rohe `contact_id` durch (`contact?.id ?? null`).
- **AC-915-5 (ISSUE-140 / MIG-055):** Nach MIG-055 besteht ein Status-Update (unveränderte FKs) auf einer mixed-owner-Row für Non-Admins; ein UPDATE, das einen FK auf einen unsichtbaren Parent ändert, wird mit `insufficient_privilege` geblockt; INSERT bleibt strikt (AND). DB-Verify positiv+negativ+mixed-owner im /deploy gegen Coolify-DB.
- **AC-915-6 (ISSUE-140):** Die 4 Call-Sites (`followup-actions.ts:126`, `signal-actions.ts:73`, `emails/imap-actions.ts:135`, `meetings/actions.ts:228`) prüfen den Insert/Update-Fehler und kompensieren (kein „approved ohne Task", keine Thread-Divergenz, keine verworfene calendar_events-Row).
- **AC-915-7 (ISSUE-139):** Inbound-E-Mail-Viewer blockt Remote-Bilder standardmäßig + Banner „Externe Bilder blockiert (Tracking-Schutz) [Bilder laden]"; „Bilder laden" (Session-State pro Mail) lädt via `/api/emails/[id]/body` (route-scoped CSP, RLS-scoped, kein Proxy) und rendert die Bilder direkt.
- **AC-915-8 (global):** `npm run test` grün inkl. neuer Regressionstests; enforced `Content-Security-Policy`-Header bleibt (Report-Only 0); globale `img-src`/`connect-src` app-weit unverändert strikt außer der einen wss-SIP-Origin.

---

## Step-0 — Architecture-/DEC-Reconciliation

**OQ→Slice→MT-Mapping (alle offenen /architecture-Fragen zugeordnet):**

| Herkunft | Frage | Auflösung | Ziel |
|---|---|---|---|
| DEC-306 OQ-1 | Toggle-State session vs. persist | **session-only** (Founder, einfachster sicherer Default) | MT-6 |
| Req OQ-3 / Arch B-1 | Jitsi iframe-Origin? → `camera=(self)` nötig? | **Nein** — Jitsi via `window.open` separater Origin (`meet.strategaizetransition.com`), nicht App-Origin-iframe → Permissions-Policy gated es nicht → `camera=()` bleibt | MT-1 |
| Arch OQ-A1 | Trigger `SECURITY INVOKER` + parent-RLS im Subquery ausreichend? | Verifikation gegen Live-DB im **/backend** (MT-4) — mirror MIG-054-Semantik | MT-4 (Verification) |
| Arch OQ-A2 | `emails.id` + RLS-Read im Body-Route; Höhenmessung unter `sandbox="allow-same-origin"` | Live-Schema-Bestätigung im /backend, Browser-Höhenmessung im /qa | MT-6 (Verification) |
| Arch OQ-A3 | Marker-Shape „blockierte Bilder vorhanden" (Return-String vs. Hook-Side-Channel) | /backend wählt schlankere Variante (Pre-Scan-Regex im Caller ODER Hook-Side-Channel) | MT-6 |

**Keine offene Founder-Frage → kein AskUserQuestion nötig.** Alle Scope-Entscheidungen sind in DEC-306/307 + PRD-Founder-Entscheidungen gelockt. OQ-A1..A3 sind technische Live-Verifikationen, keine Scope-Fragen — als Verification-Steps in die MTs eingebettet.

**Konsistenz-Sweep — 1 Drift gefunden (DEC/Architecture gewinnt über stale Spec):**
- **DRIFT-1 (camera):** PRD §V8.17 V1-Scope Pt.1, roadmap v8-17-Summary und BL-520-Description nennen `camera=(self)` „für Meetings". Das ARCHITECTURE-V8.17-Addendum (Grounding-Befund B-1, OQ-3 aufgelöst) widerlegt das gegen realen Code: In-App-Meetings öffnen Jitsi via `window.open(res.hostRedirectUrl,"_blank")` auf separater Origin (`cockpit/src/lib/meetings/jitsi-jwt.ts` + `mein-tag-client.tsx:571-576`), kein App-Origin-iframe → unsere Permissions-Policy gated Jitsi nicht. Kein App-Origin-Kamera-Zugriff existiert. **Auflösung:** Slice folgt der Architektur → **nur `microphone=(self)`, `camera=()` bleibt**. PRD/roadmap-Formulierung als requirements-Stand-veraltet geflaggt (keine Änderung nötig, Architektur ist die jüngere Wahrheit).

---

## Verified-Against-Code-Reality (BLOCKING — geprüft in dieser Session per Bash/Grep gegen `cockpit/`)

| Pfad | Status | Verifikation |
|---|---|---|
| `cockpit/src/lib/security/csp.ts` | MODIFY | existiert; `buildCSP(supabaseKongUrl, reportUri="")` @18, `PERMISSIONS_POLICY` const @54-55 (`microphone=()`) |
| `cockpit/next.config.ts` | MODIFY | existiert; `CSP_VALUE = buildCSP(...)` @9, `PERMISSIONS_POLICY` import @3, header @20 |
| `cockpit/src/lib/meetings/consent-check.ts` | MODIFY | existiert; `checkConsentStatus(contactIds, client?)` @34, `allGranted: missing.length===0` @64, Loop nur über returned rows (fail-open bestätigt) |
| `cockpit/src/app/(app)/mein-tag/actions.ts` | MODIFY | existiert; `contactId: contact?.id ?? (meeting as any).contact_id ?? null` @449 (verbatim bestätigt) |
| `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` | MODIFY | existiert; `MeetingPrepCard` @565, `handleStartMeeting` liest nur `res.hostRedirectUrl` @571-576 (kein `res.error`) |
| `cockpit/src/lib/email/sanitize-email-html.ts` | MODIFY | existiert; `sanitizeEmailHtml(html)` @60 (1 Param), `uponSanitizeAttribute`-Hook @93 |
| `cockpit/src/components/email/email-html-iframe.tsx` | MODIFY | existiert; `sandbox=""` + `srcDoc={buildSrcDoc(html)}` @73-78, Prop nur `html` |
| `cockpit/src/app/(app)/emails/email-detail.tsx` | MODIFY | existiert; `<EmailHtmlIframe html={sanitizeEmailHtml(email.body_html)} />` @231 (EmailBody @229) |
| `cockpit/src/app/(app)/mein-tag/followup-actions.ts` | MODIFY | existiert (ISSUE-140 Call-Site :126) |
| `cockpit/src/app/(app)/fit-assessment/signal-actions.ts` | MODIFY | existiert — **korrigierter Pfad** (Architektur/Issue schrieb bare `signal-actions.ts:73`; real unter `(app)/fit-assessment/`) |
| `cockpit/src/app/(app)/emails/imap-actions.ts` | MODIFY | existiert — **disambiguiert**: `:135` = `email_threads.update({contact_id}).eq(id, thread_id)` ohne Error-Check (matcht ISSUE-140 „Thread-Divergenz"). NICHT `(app)/settings/imap-actions.ts` (dort @135 leer) |
| `cockpit/src/app/(app)/meetings/actions.ts` | MODIFY | existiert (ISSUE-140 Call-Site :228, calendar_events-Insert) |
| `cockpit/src/app/actions/meetings.ts` | (read-only Ref) | `startMeeting(...)` @56 → `Promise<StartMeetingResult>`, Union mit `{error: string}` (@12/32/51) + `{hostRedirectUrl}` — `res.error` existiert (Fix MT-3 trägt) |
| `cockpit/src/app/api/emails/[id]/body/route.ts` | **NEU** | existiert NICHT; unter `api/emails/` nur `attachments/route.ts` → keine Kollision |
| `sql/migrations/055_v817_*.sql` | **NEU** | existiert NICHT (höchste real: `054_v816_slc914_class_c_withcheck_harden.sql`) → keine Kollision |
| `cockpit/src/lib/security/csp.test.ts` | **NEU** | existiert NICHT (kein csp-Test heute) |

**Test-Pfade:** `vitest.config.ts` → `environment: "jsdom"`, `include: ["src/**/*.test.ts","src/**/*.test.tsx"]`. `vitest.rls.config.ts` existiert (Coolify-DB-Layer). Probe `tests/_probe/csp-check.mjs` existiert (Repo-Root, nicht `cockpit/`).

## Schema-Grounding (BLOCKING)

- **MIG-055 Ziel-Tabellen (9 Klasse-C):** tasks, signals, calendar_events, handoffs, cadence_enrollments, documents, email_threads, referrals, email_attachments — Namen + FK→Parent-Map verbatim aus ARCHITECTURE.md V8.17-Addendum (abgeleitet aus MIG-054-Policies). Parents tragen alle `owner_user_id` (aus MIG-054 EXISTS-Klauseln bestätigt).
- **`can_see_owner(owner_user_id)`** + **`current_user <> 'service_role'`**: Scaffolding aus MIG-051 `profiles_role_change_guard` (P-080) — kanonisch, service_role-aware.
- **`contacts.consent_status`** (Werte inkl. `"granted"`): aus consent-check.ts @43/50 real gelesen.
- **`emails.id` / `emails.body_html`** (MT-6 Body-Route): Existenz im /backend gegen Live-Schema bestätigen (OQ-A2) — `email_messages` (imap-actions nutzt `email_messages`) vs. `emails`-Tabelle im Body-Route unterscheiden; /backend liest die reale Quelle des Viewers (`email-detail.tsx` `InboxEmail.body_html`).
- MIG-File-Nummer wird erst beim /backend-MT-Start per `ls sql/migrations/` final vergeben (aktuell frei ab 055); Slice referenziert nur die **MIG-055-ID**.

## Symbol- und API-Verifikation

- `buildCSP` Signatur wird erweitert auf `buildCSP(supabaseKongUrl, sipWssOrigin, reportUri="")` — Caller `next.config.ts:9` MUSS mit-angepasst werden (neuer 2. Param, `reportUri` rückt auf 3). Kein weiterer Caller (Grep bestätigt: nur next.config.ts importiert buildCSP).
- `PERMISSIONS_POLICY` ist eine exportierte Konstante (kein buildCSP-Output) → direkt am String editieren.
- `checkConsentStatus` Return-Type `ConsentCheckResult { allGranted, missing, granted }` — Count-Guard nutzt bestehende `missing`-Struktur (`ContactConsentInfo`).
- `StartMeetingResult` ist eine Union — `res.error` typsicher lesbar (kein `as any` nötig).
- **Kein Toast-Lib installiert** (kein sonner/react-hot-toast/react-toastify in package.json; mein-tag-client nutzt `useState`/`useTransition`). ISSUE-141-Fehleranzeige daher via lokalem `useState`-Fehlerzustand + Inline-Rendering in `MeetingPrepCard` — **keine** Toast-API vorschreiben.

## Reuse-Claim-Verifikation

- **changed-FK-only BEFORE-UPDATE-Trigger** ← Scaffolding `sql/migrations/051_v814_slc912_profiles_role_protect.sql` (`profiles_role_change_guard`, service_role-aware, P-080). Kanonische Quelle im eigenen Repo, real vorhanden. MIG-055 spiegelt den MIG-054-Stil (explizit, kein Dynamic-SQL, 9 Funktionen/Trigger). Neuer Origin-Pattern-Kandidat für die Pattern Library (immoscheckheft portiert später).
- **route-scoped-CSP-Dokument** ← BS ist Origin des CSP-Patterns (P-089, Playbook `security-headers-live-smoke.md`). Kein Sibling-Port. Neuer Origin-Pattern-Kandidat (route-scoped-CSP-iframe für User-HTML).
- **DOMPurify `uponSanitizeAttribute`** ← existiert bereits in `sanitize-email-html.ts:93` (V8.10 SLC-892-Reuse) → additiver Param, kein Neubau.

---

## Micro-Tasks (Implementierungs-Reihenfolge ISSUE-138 → 142 → 141 → 140 → 139)

### MT-1: ISSUE-138 — CSP connect-src (SIP-WSS) + Permissions-Policy microphone=(self) [backend]
- Goal: In-App-Softphone unter enforced CSP wieder verbindungs- und mikrofonfähig.
- Files: `cockpit/src/lib/security/csp.ts` (MODIFY), `cockpit/next.config.ts` (MODIFY), `cockpit/src/lib/security/csp.test.ts` (NEU)
- Expected behavior: `buildCSP` erhält Param `sipWssOrigin`; nimmt ihn in `connect-src` auf (neben 'self'/sentry/kong/bedrock). `PERMISSIONS_POLICY`: `microphone=()` → `microphone=(self)`; `camera=()` **bleibt** (Step-0 DRIFT-1). `next.config.ts` ruft `buildCSP(NEXT_PUBLIC_SUPABASE_URL, wss://${process.env.NEXT_PUBLIC_SIP_DOMAIN || 'sip.strategaizetransition.com'}, SENTRY_CSP_REPORT_URI)`. Header-Key bleibt enforced `Content-Security-Policy`. Globale `img-src` unverändert.
- Verification: `csp.test.ts` — connect-src enthält die wss-SIP-Origin; PERMISSIONS_POLICY == `microphone=(self)` und `camera=()`; img-src unverändert. `npm run test`. `next build`. (Funktionaler Browser-Smoke → Live-Verification-Plan / /qa+/deploy.)
- Dependencies: none

### MT-2: ISSUE-142 — checkConsentStatus Count-Guard fail-closed [backend]
- Goal: Consent-Gate caller-unabhängig fail-closed.
- Files: `cockpit/src/lib/meetings/consent-check.ts` (MODIFY), `cockpit/src/lib/meetings/consent-check.test.ts` (MODIFY, +Cases)
- Expected behavior: `returnedIds = new Set((contacts??[]).map(c => c.id))`; jede angeforderte `contactId` ohne Row → synthetischer `missing`-Eintrag (minimale `ContactConsentInfo`-Shape); `allGranted = missing.length===0` bleibt, wird durch die synthetischen Einträge fail-closed. Bestehende granted/missing-Klassifikation unverändert.
- Verification: neuer Vitest-Case: 2 angeforderte IDs, DB liefert 1 Row (RLS-weggefiltert) ⇒ `allGranted=false`, fehlende ID in `missing`. Bestehende 3 Tests bleiben grün. Baseline 3 → Soll ≥5.
- Dependencies: none

### MT-3: ISSUE-141 — MeetingPrepCard res.error + kein unsichtbarer contact_id [frontend]
- Goal: Kein Silent-Dead-Button; unsichtbare rohe contact_id wird nicht durchgereicht.
- Files: `cockpit/src/app/(app)/mein-tag/actions.ts` (MODIFY @449), `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MODIFY, MeetingPrepCard)
- Expected behavior: actions.ts `contactId: contact?.id ?? (meeting as any).contact_id ?? null` → `contact?.id ?? null`. `MeetingPrepCard`: lokaler `const [meetingError, setMeetingError] = useState<string|null>(null)`; nach `startMeeting(...)` bei `res.error` → `setMeetingError(res.error)` + Inline-Fehlermeldung; bei `res.hostRedirectUrl` → `window.open` + Fehler löschen. Kein Toast-Lib.
- Verification: `npm run test` (bestehende); Interaktions-Check im /qa (Dead-Button → sichtbare Meldung). Statisch: kein `(meeting as any).contact_id` mehr in actions.ts:449 (Grep 0 Treffer).
- Dependencies: none

### MT-4: ISSUE-140 — MIG-055 changed-FK-only Trigger + UPDATE-WITH-CHECK OR [backend]
- Goal: Legitime Status-Updates auf mixed-owner-Rows für Non-Admins entsperren, Cross-Tenant-Injection-Schutz voll erhalten.
- Files: `sql/migrations/055_v817_slc915_class_c_changed_fk_trigger.sql` (NEU — finale Nummer per `ls sql/migrations/` beim MT-Start), `cockpit/__tests__/migrations/055-*.test.ts` (NEU, Coolify-DB-Layer)
- Expected behavior: Pro der 9 Tabellen (1) UPDATE-`WITH CHECK` von MIG-054-AND zurück auf USING-konsistentes **OR**; INSERT-`WITH CHECK` bleibt **AND** (strikt). (2) `BEFORE UPDATE`-Trigger (SECURITY INVOKER, service_role-Bypass): pro FK-Spalte `NEW.<fk> IS DISTINCT FROM OLD.<fk> AND NEW.<fk> IS NOT NULL AND current_user <> 'service_role' AND NOT EXISTS(SELECT 1 FROM <parent> p WHERE p.id=NEW.<fk> AND can_see_owner(p.owner_user_id)) → RAISE insufficient_privilege`. FK→Parent-Map exakt aus ARCHITECTURE-V8.17-Addendum. Idempotent (CREATE OR REPLACE FUNCTION, DROP TRIGGER/POLICY IF EXISTS). Rollback-Notes im File.
- Verification (OQ-A1): DB-Verify-Test (node:20-Sidecar SAVEPOINT, Precedent MIG-054) — **positiv** (Status-Update unveränderte FKs auf mixed-owner-Row als Non-Admin → PASS), **negativ** (FK-Change auf unsichtbaren Parent → BLOCK insufficient_privilege), **INSERT strikt bleibt** (Cross-Tenant-FK-Insert → BLOCK), **service_role** unberührt. Live-Apply im /deploy (Ops-Pre-Cond, `sql-migration-hetzner.md`). SECURITY-INVOKER + parent-RLS-Sichtbarkeit im Subquery gegen Live-DB bestätigen.
- Dependencies: none (Migration additiv, unabhängig von MT-1..3)

### MT-5: ISSUE-140 — 4 Call-Sites Fehlerprüfung + Kompensation [backend]
- Goal: Verschluckte Insert/Update-Fehler prüfen/kompensieren (kein „approved ohne Task", keine Thread-Divergenz, keine verworfene calendar_events-Row).
- Files: `cockpit/src/app/(app)/mein-tag/followup-actions.ts` (MODIFY @126), `cockpit/src/app/(app)/fit-assessment/signal-actions.ts` (MODIFY @73), `cockpit/src/app/(app)/emails/imap-actions.ts` (MODIFY @135), `cockpit/src/app/(app)/meetings/actions.ts` (MODIFY @228)
- Expected behavior: Je Call-Site den `error` des Insert/Update auswerten. followup-actions.ts:126 — Task-Insert-Fehler ⇒ ai_action_queue nicht als approved zurücklassen (Rollback/Fehler an UI). signal-actions.ts:73 — rohe RLS-Fehlermeldung durch klare Meldung ersetzen. emails/imap-actions.ts:135 — email_threads.update-Fehler prüfen (Message/Thread-Divergenz verhindern). meetings/actions.ts:228 — calendar_events-Insert-Fehler nicht verwerfen. Verhalten für Admin/legitime Rows unverändert.
- Verification: `npm run test` (bestehende Suites grün); je Call-Site Grep-Check: kein unchecked `.update(`/`.insert(` mehr auf dem betroffenen Pfad. Interaktion im /qa.
- Dependencies: none (logisch nach MT-4, aber unabhängig editierbar)

### MT-6: ISSUE-139 — E-Mail-Bild-Block by-default + opt-in route-scoped Viewer [full-stack]
- Goal: Remote-Bilder standardmäßig blocken (Tracking-Schutz) + Per-Mail-„Bilder laden" via route-scoped CSP, kein Proxy, kein globales Aufweichen.
- Files: `cockpit/src/lib/email/sanitize-email-html.ts` (MODIFY), `cockpit/src/app/api/emails/[id]/body/route.ts` (NEU), `cockpit/src/components/email/email-html-iframe.tsx` (MODIFY), `cockpit/src/app/(app)/emails/email-detail.tsx` (MODIFY @231), `cockpit/src/lib/email/sanitize-email-html.test.ts` (MODIFY, +Cases)
- Expected behavior:
  1. `sanitizeEmailHtml(html, { blockRemoteImages }?)` (default `true` für Inbound-Viewer): `uponSanitizeAttribute`-Hook strippt http(s)-`src` an `<img>` (cid:/data:image bleiben), Signal „blockierte Bilder vorhanden" (OQ-A3: Return-String bleibt + Pre-Scan-Regex im Caller ODER Hook-Side-Channel — /backend wählt schlanker).
  2. **NEU** `GET /api/emails/[id]/body`: Same-Origin, lädt `body_html` per **User-Client (RLS-scoped)** an der realen Viewer-Quelle (OQ-A2 Schema-Bestätigung `emails` vs `email_messages`), `sanitizeEmailHtml(body,{blockRemoteImages:false})`, Response-Header route-scoped `Content-Security-Policy: default-src 'none'; img-src https: data: blob: cid:; style-src 'unsafe-inline'; font-src 'self'`. Globale CSP unberührt.
  3. `EmailHtmlIframe`: Zwei-Zustand — **blocked** (default) = srcDoc mit gestrippten Bildern + Banner „Externe Bilder blockiert (Tracking-Schutz) [Bilder laden]"; **loaded** (opt-in, Session-State pro Mail) = iframe `src` → Route (2), `sandbox="allow-same-origin"` (Höhe messbar, kein allow-scripts). Neue Prop `emailId`.
  4. `email-detail.tsx`: `<EmailHtmlIframe emailId={email.id} html={sanitizeEmailHtml(email.body_html, { blockRemoteImages: true })} />`.
- Verification (OQ-A2): sanitize-Vitest — http(s)-img gestrippt bei blockRemoteImages=true, cid:/data:image bleiben, Marker gesetzt; blockRemoteImages=false lässt https durch. Baseline 19 → +≥3. Route: RLS-scoped (fremde emails.id → kein Body). Browser-Höhenmessung unter `allow-same-origin` im /qa (nicht statisch). `next build`.
- Dependencies: none (unabhängig; größter MT, zuletzt)

---

## Cross-Slice-Dependencies

- **Blockiert-von:** keine. Alle 6 MTs sind file-disjunkt und unabhängig editierbar (siehe Touchpoint-Tabelle unten). Einziger geteilter Baustein: MT-1 ändert `csp.ts`/`next.config.ts`; MT-6 fügt eine route-scoped CSP-Response hinzu (eigener Header in der neuen Route, keine Änderung an `csp.ts`) → **kein** Konflikt.
- **Blockiert:** keine Folge-Slices. V8.17 ist ein abschließendes Fix-Bundle.
- **Reihenfolge-Rationale:** Implementierung folgt 138→142→141→140→139 (akut-High zuerst, größter Full-Stack-MT zuletzt) — ist eine Empfehlung, keine harte Abhängigkeit (MTs sind unabhängig). Commit pro MT (atomic, `fix(SLC-915/MT-x)`).
- **Produced/Consumed:** MT-4 produziert MIG-055 (Live-Apply = /deploy-Ops-Pre-Cond, node:20-Sidecar DB-Verify); kein anderer MT konsumiert es zur Code-Zeit. MT-6 produziert die neue Body-Route; nur `email-detail.tsx` (im selben MT) konsumiert sie.

## Live-Verification-Plan (BLOCKING — Security-Header-Slice, Playbook `security-headers-live-smoke.md`)

Der Slice macht CSP `connect-src` + `Permissions-Policy` verhaltensändernd → funktionaler Browser-Smoke ist Done-Gate (nicht `curl -I`-only, nicht nur Hydration — RPT-672-Trugschluss-Prävention, IMP-1401 Feature-Flow-Coverage):

1. **`curl -I <prod-URL>`** — enforced `Content-Security-Policy` gesetzt (Report-Only 0), `connect-src` enthält `wss://sip…`, `Permissions-Policy: microphone=(self)`.
2. **`node tests/_probe/csp-check.mjs <URL>`** — Hydration-Baseline (hasReactProps/hasReactFiber/onSubmitAttached, 0 CSP-Console-Errors).
3. **Funktionaler Feature-Flow-Smoke (BLOCKING):**
   - **Telefonie:** Softphone-Call-Flow auslösen → 0 `connect-src`/`Permissions-Policy`-Console-Errors, WSS verbindet, Mikrofon-Zugriff da (AC-915-1).
   - **Meeting:** „Meeting starten" in Mein Tag → `window.open` öffnet Jitsi (separater Origin), kein Permissions-Block (AC-915-2).
   - **E-Mail-Viewer:** Mail mit Remote-Bild öffnen → Bilder blockiert + Banner; „Bilder laden" → Bilder rendern über Route, Höhe korrekt gemessen (AC-915-7).
4. **Bei FAIL:** Hotfix-Path — `csp.ts`/`next.config.ts` reapply + Coolify-Redeploy (`coolify-autonomous-redeploy.md`); MIG-055 reapply via `sql-migration-hetzner.md`.

## Parallel-Execution-Tabelle

Ein Slice (Founder-Beschluss). Intern sind die MTs file-disjunkt und könnten parallelisiert werden; für einen Single-Founder ist sequentielle MT-Abarbeitung in der Fix-Reihenfolge empfohlen (kein Worktree, Single-Branch `main`, Internal-Test-Mode).

| Slice | Parallel-Gruppe | MIG reserviert | File-Touchpoints | Notes |
|---|---|---|---|---|
| SLC-915 | A (einziger) | MIG-055 (MT-4) | csp.ts, next.config.ts, consent-check.ts, mein-tag/actions.ts, mein-tag-client.tsx, followup-actions.ts, fit-assessment/signal-actions.ts, emails/imap-actions.ts, meetings/actions.ts, sanitize-email-html.ts, email-html-iframe.tsx, email-detail.tsx, api/emails/[id]/body/route.ts (NEU), 055_*.sql (NEU) + 3 Test-Files | 1 Slice / 6 MTs, alle file-disjunkt; kein Worktree (Precedent V8.12/14/15/16) |

## Risks / Tradeoffs

- **R-1 (MT-4):** Trigger über 9 Tabellen = aufwändigste Einzelmaßnahme; Regressionsrisiko auf legitime INSERTs = 0 (INSERT-Policy unangetastet). Mitigation: DB-Verify positiv+negativ+mixed-owner im /deploy (node:20-Sidecar, Precedent MIG-054).
- **R-2 (MT-6):** route-scoped-CSP-iframe + Höhenmessung unter `allow-same-origin` ist der aufwändigste Frontend-Teil. Dokumentierte leichtere Alternative (falls Downgrade): „Original-Mail im neuen Tab" (Top-Level-Dokument, keine iframe-Höhen-Arbeit) — verliert Inline-Gefühl. Empfehlung: Inline (Gmail-Modell, Founder-Intent, DEC-306).
- **Annahme:** `NEXT_PUBLIC_SIP_DOMAIN` bleibt live leer → Fallback `sip.strategaizetransition.com` ist die zu erlaubende Origin (RPT-672-Live-Verifikation).

## Recommended Next Step

`/qa` auf diesen Plan (Plan-QA), danach per MT `/backend` (MT-1,2,4,5,6-Backend-Teil) und `/frontend` (MT-3, MT-6-Frontend-Teil) in der Reihenfolge ISSUE-138→142→141→140→139. `/qa` nach jedem Implementierungs-Block. Danach Gesamt-/qa V8.17 → /final-check → /go-live → /deploy (MIG-055 Live-Apply + funktionaler CSP-Feature-Flow-Smoke) → /post-launch T+24h.
