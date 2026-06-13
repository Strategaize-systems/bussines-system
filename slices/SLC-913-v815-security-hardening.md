# SLC-913 — V8.15 Security-Hardening Bundle

- Feature: FEAT-925
- Backlog: BL-516
- Status: planned
- Priority: High
- Created: 2026-06-12
- Branch: `main` (Single-Branch, Internal-Test-Mode)
- Model: **Fable 5 durchgängig** (Audit-Standard `.claude/rules/security-audit-fable5-standard.md`)
- Migration: **MIG-052** (additiv, profiles team_id-Column-Guard + INSERT-Coverage)

## Herkunft

Fable-5 Multi-Agent Post-Deploy Re-Audit 2026-06-12 (Workflow `wf_5e95fe4b-7e9`, 42 Agenten, 6 Finder-Dimensionen + adversarische Doppel-Verifikation über den **deployten** V8.14-Stand Commit `7a7b225`). 18 confirmed Findings → `docs/KNOWN_ISSUES.md` ISSUE-109..126. Dieser Slice schließt **alle High + Medium (ISSUE-109..121)**; die 5 Low (ISSUE-122..126) sind dokumentiert + deferred (Founder-Toleranz), ISSUE-122 wird vom MT-1-Fix mit-erledigt.

**Zentrale Lektion (IMP-1237):** Der V8.14-Fix hat 2 Lücken offengelassen — MIG-051 schützte nur `profiles.role` (nicht die zweite authz-Spalte `team_id`), und der Login-Rate-Limit ist per XFF-Spoof umgehbar. Ein Column-Level-Fix muss ALLE authz-tragenden Spalten/Pfade abdecken.

## Scope (IN)

| MT | Findings | Inhalt |
|----|----------|--------|
| MT-1 | ISSUE-109 (High) + ISSUE-122 (Low) | **MIG-052** DB-Column-Guard |
| MT-2 | ISSUE-111/112/117/121 (Medium) | `createAdminClient`-Ownership-Sweep |
| MT-3 | ISSUE-113/114 (Medium) | href-Scheme-Guard-Sweep |
| MT-4 | ISSUE-115 (Medium) | Mass-Assignment-Whitelist |
| MT-5 | ISSUE-110/118/119 (Medium) | Public-Endpoint-Hardening |
| MT-6 | ISSUE-120 (Medium) | Login-Rate-Limit-Härtung |
| MT-7 | ISSUE-116 (Medium) | Export-API-Tenant-Scoping (mit DEC) |
| MT-8 | — | Records-Sync |

## Scope (OUT — deferred Low, Founder-Toleranz)

ISSUE-123 (Cal.com-Webhook-Replay), ISSUE-124 (PII-Log andere Crons), ISSUE-125 (Typeahead `.or()`-Injection), ISSUE-126 (Transcribe Size/Rate-Limit). Bleiben `open` in KNOWN_ISSUES, kein V8.15-Aufwand.

---

## MT-1 — DB-Column-Guard (MIG-052) — ISSUE-109 + ISSUE-122

**Problem:** `profiles_role_change_guard` (MIG-051) blockt nur `NEW.role`. `team_id` ist via `profiles_admin_update USING/CHECK (is_admin() OR id=auth.uid())` selbst-mutierbar; `get_my_team_id()`/`can_see_owner()` hängen daran → Team-Isolation-Bypass. Trigger feuert zudem nur `BEFORE UPDATE`.

**Fix (MIG-052, additiv):**
- Guard-Function erweitern (oder neuen Guard) der für `current_user <> 'service_role'` jede Änderung an **authz-tragenden Spalten** blockt: `role` UND `team_id` (Audit prüfen ob weitere existieren: `is_admin`-bool? `tenant_id`? — via `\d profiles` Live-Inspektion vor dem Schreiben).
- Trigger auf **`BEFORE INSERT OR UPDATE`** umstellen. Bei INSERT: für non-service_role `role`/`team_id` auf Safe-Default zwingen oder RAISE (OLD ist NULL bei INSERT → Logik anpassen: bei INSERT prüfen `NEW.role <> 'member'`-Default bzw. nur service_role darf privilegierte Werte setzen).
- Alternativ-Ansatz (sauberer): `REVOKE UPDATE(role, team_id) ON profiles FROM authenticated` + service_role-RPC für legitime Changes. **Pflicht-Check:** bricht das `changeRole`/`team`-Verwaltung (läuft die via service_role/createAdminClient)? — analog R-912-1. Live verifizieren.

**AC-913-1:** Live-Apply MIG-052 via `sql-migration-hetzner.md` (postgres-User, Base64). DB-Verify via node:20-Sidecar SAVEPOINT: authenticated `team_id`-UPDATE → BLOCKED; service_role `team_id`-UPDATE → OK; authenticated `role`-UPDATE → BLOCKED (Regression MIG-051); authenticated harmlose Spalte (z.B. `display_name`) → OK; authenticated INSERT mit role='admin' → BLOCKED/Default. DB-Verify-Test als `cockpit/__tests__/migrations/052-*.test.ts` (läuft im /deploy gegen Coolify-DB, wie 051).
**R-913-1 (BLOCKING):** Naiver Guard darf legitime Admin-Pfade (changeRole, Team-Zuweisung via service_role) nicht brechen → `current_user <> 'service_role'`-Gate, nicht `NOT is_admin()`. Live-verifizieren.

## MT-2 — createAdminClient-Ownership-Sweep — ISSUE-111/112/117/121

Pattern-Reuse aus V8.12 SLC-906 (User-Client statt Admin-Client, RLS-Klasse-C greift). Pflicht-Search analog `strategaize-pattern-reuse.md`.

- **ISSUE-111** `app/(app)/mein-tag/followup-actions.ts:32-203` — `approveFollowup/postponeFollowup/rejectFollowup`: `ai_action_queue`-Reads/Writes + `tasks`-Insert auf `createClient()` (User-Client) umstellen; RLS-Klasse-C (047c) scoped auf Ownership.
- **ISSUE-112** gleiche Datei `getPendingFollowups:13-26` — auf User-Client + `auth.getUser()`-Guard, ODER toten Code + `FollowupSuggestions`-Component entfernen (grep bestätigt: nirgends gerendert → Entfernen ist sauberer, surgical prüfen).
- **ISSUE-117** `lib/ai/signals/applier.ts:41` — `applyProposedChange` deal-UPDATE über user-scoped Client (von `approveInsightAction` durchreichen) ODER Ownership auf `target_entity_id` vor Admin-Write verifizieren (`can_see_owner`).
- **ISSUE-121** `lib/validation/vies-actions.ts:21` — `requireUser()`-Gate am Top von `lookupVatIdAction` vor VIES-Call/Admin-Write.

**AC-913-2:** Jede der 4 Stellen hat vor jedem Admin-/Provider-Write entweder User-Client (RLS) oder expliziten Ownership/Auth-Check. Vitest pro Stelle (wrong-owner/unauth → rejected; legit → ok). TSC=0/ESLint=0/Full-Vitest GREEN.

## MT-3 — href-Scheme-Guard-Sweep — ISSUE-113/114

- Shared-Helper `cockpit/src/lib/utils/safe-external-href.ts` → `safeExternalHref(url): string` (Whitelist `^(https?:|mailto:|\/)`i, sonst `#`). Pattern aus `components/ki-workspace/AnswerPane.tsx:274`.
- **ISSUE-113** `companies/[id]/page.tsx:179` `href={safeExternalHref(company.website)}` + Scheme-Reject im Write-Path (`companies/actions.ts:122/174` + `api/leads/intake/route.ts:115`).
- **ISSUE-114** `contacts/[id]/page.tsx:315` `href={safeExternalHref(contact.linkedin_url)}` (analog `meeting_link`-Guard:328).

**AC-913-3:** `javascript:`/`data:`-URL in website/linkedin_url rendert als `#` (kein Klick-Exec). OWASP-XSS-Adversarial-Vitest für den Helper. Cross-Repo-Reuse-Quelle.

## MT-4 — Mass-Assignment-Whitelist — ISSUE-115

`app/(app)/pipeline/actions.ts:455` (`moveDealToStage`) + Merge:423-427 — `requirementValues` auf erlaubte `STAGE_REQUIRED_FIELDS[stageName].fields` projizieren (Whitelist-Pick + Typ-Validierung pro Feld), nur Clean-Payload updaten. Unbekannte Keys verwerfen.

**AC-913-4:** Extra-Keys (owner_user_id/value/created_at/pipeline_id/status/…) im Call werden NICHT geschrieben. Vitest mit Payload inkl. nicht-erlaubter Keys → nur Whitelist-Felder landen im Update.

## MT-5 — Public-Endpoint-Hardening — ISSUE-110/118/119

- **ISSUE-110** `app/api/test-sentry/route.ts` — hinter `NODE_ENV!=='production'` ODER `verifyCronSecret` gaten, aus `middleware.ts:48` publicPaths entfernen, sentry-State-Feld aus Response droppen. (Einfachster sauberer Weg: in Prod 404.)
- **ISSUE-118** `api/leads/intake/route.ts` — separater write-scoped Key (`LEAD_INTAKE_API_KEY`, eigene ENV) statt `EXPORT_API_KEY`; `checkRateLimit` (IP/Key) via `guardExportRequest`-Pattern; Max-Längen-Caps in `validateInput` (first_name/last_name/notes/company_name/website).
- **ISSUE-119** `api/push/subscribe/route.ts` — `endpoint` beim Write validieren: https-URL, Host gegen Allowlist echter Push-Services (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`, `web.push.apple.com`), private/loopback/link-local/metadata-IPs rejecten. Optional Re-Check in `lib/push/send.ts` vor `sendNotification`.

**AC-913-5:** test-sentry in Prod nicht anonym erreichbar; leads-intake mit eigenem Key + Rate-Limit + Längen-Caps; push/subscribe rejected interne/non-allowlist-endpoints. Vitest je Endpoint.

## MT-6 — Login-Rate-Limit-Härtung — ISSUE-120

`lib/security/ip-hash.ts` + `app/(auth)/login/actions.ts`:
- XFF nicht client-vertrauen: hinter bekanntem Single-Proxy (Traefik/Kong) **rightmost** XFF-Entry oder trusted-proxy-Offset; **live verifizieren** wie der Reverse-Proxy XFF setzt (Founder/SSH-Check gegen die laufende Instanz — ENV `TRUSTED_PROXY_COUNT`).
- Zusätzlich **account-scoped Lockout** (`login-acct:<email>`, höherer Threshold) unabhängig von IP.
- Counter in persistenten Store (DB-Tabelle `login_attempts` o.ä.) statt in-memory — überlebt Deploy + multi-instance. (Falls Store zu groß für V8.15: zumindest account-scoped + XFF-Fix; Store-Migration als Folge-Item dokumentieren.)

**AC-913-6:** XFF-Rotation umgeht das Limit nicht mehr (account-scoped greift); legit Login nach Fail-Clear funktioniert; generische Error-Message bleibt. Vitest. **Cross-Repo:** gleiche `ip-hash.ts` in OP/IS/immoscheckheft prüfen + Pattern portieren.

## MT-7 — Export-API-Tenant-Scoping — ISSUE-116 (mit DEC)

`api/export/*` + `api/winloss/[deal_id]` + `api/campaigns/[id]/performance` queryen via `createAdminClient()` ohne owner/team-Filter, einziger geteilter `EXPORT_API_KEY`. **Architektur-Entscheidung nötig (DEC-3xx):** per-Tenant/owner-Key-Mapping + `.eq('owner_user_id'/'team_id', …)`-Filter, ODER RLS-gebundene Identität statt Admin-Client. winloss/performance: id-Ownership prüfen. Rate-Limit auf Key-Identität statt spoofbaren Header.

**Hinweis:** Latent (heute Single-Owner = 0 Blast-Radius). Falls der saubere Fix (per-Tenant-Keys) größer ist als V8.15-Budget → als eigenständiges Folge-Item mit DEC dokumentieren und in V8.15 mindestens den Header-basierten Rate-Limit-Key auf die Key-Identität umstellen.

**Founder-Entscheidung 2026-06-13: per-Tenant-Keys JETZT bauen (Full-Fix, NICHT defer).** Scope-Erweiterung gegenüber Spec-Fallback bewusst akzeptiert. Im /backend zu liefern: Key→Tenant/owner-Mapping (eigene Migration MIG-053 o.ä.), `.eq('owner_user_id'/'team_id', …)`-Filter auf `api/export/*` + `api/winloss/[deal_id]` + `api/campaigns/[id]/performance`, id-Ownership-Checks für winloss/performance, Rate-Limit-Key auf Key-Identität. DEC-3xx im /backend formalisieren (Approach: per-Tenant-Key-Mapping vs. RLS-gebundene Identität — Entscheidung beim Design treffen).

**AC-913-7:** Entweder Tenant-Scope-Filter aktiv ODER DEC dokumentiert + Rate-Limit-Key gehärtet. Vitest/Doku entsprechend.

## MT-8 — Records-Sync

KNOWN_ISSUES ISSUE-109..121 → `resolved` mit Resolution-Notes (nach Live-Verify im /deploy für DB-Findings); SLC-913/FEAT-925/BL-516 Status; STATE.md; ggf. DECISIONS.md (DEC für MT-7 + DB-Guard-Ansatz); MIGRATIONS.md MIG-052; RPT.

---

## Risks

- **R-913-1 (BLOCKING):** MT-1 Guard darf legitime service_role-Pfade (changeRole, Team-Zuweisung) nicht brechen → `current_user <> 'service_role'`-Gate, Live-verifizieren (analog R-912-1).
- **R-913-2:** MT-2 User-Client-Umstellung darf bestehende Founder-Flows (eigene Followups/Insights) nicht brechen — RLS-Klasse-C muss für Owner durchlassen. Full-Vitest + Live-Smoke.
- **R-913-3:** MT-6 XFF-Fix hängt davon ab, wie Traefik/Kong den Header setzt — falsche Annahme sperrt legit Logins aus oder lässt Bypass offen. Live gegen die Instanz verifizieren, nicht raten.
- **R-913-4:** MT-3 Scheme-Guard darf legitime `www.`-ohne-Scheme-URLs nicht brechen (analog meeting_link: `https://`+ prepend statt `#` für schemenlose Hosts erwägen).

## Done-Gate (Gesamt-Slice)

Alle High+Medium (ISSUE-109..121) resolved + Live-verifiziert (DB-Findings nach /deploy MIG-052-Apply), TSC=0/ESLint=0/Full-Vitest-jsdom GREEN pro MT (IMP-1108), DB-Verify-Test für MIG-052, Cross-Repo-Patterns (safeExternalHref, XFF-Fix, team_id-Guard) in `strategaize-pattern-reuse.md`. Dann Gesamt-/qa → /final-check → /go-live → /deploy (MIG-052-Apply + Live-Smokes) → /post-launch T+24h. Founder optional /code-review ultra vor Multi-User.
