# SLC-641 — System-Stabilitaet & DSGVO

## Metadata
- **Slice ID:** SLC-641
- **Version:** V6.4
- **Feature:** FEAT-641
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-07
- **Estimated Effort:** ~3-4h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (Begruendung: 2 unabhaengige Low-Risk-Aenderungen, beide mit Vitest-Coverage absicherbar, Rollback per Commit-Revert trivial)

## Goal

Schliesst zwei latente Luecken aus dem V6.2+V6.3 Post-Launch-Review (RPT-331) bevor erste produktive Sales-Flows starten:
1. ISSUE-057: FollowupEngine-Bug `proposals.value -> total_gross`
2. BL-423: DSGVO-konforme 90-Tage-Retention auf `campaign_link_clicks` via neuen Cron-Endpoint

## Scope

**In Scope (5 MTs):**
- MT-1: ISSUE-057 followup-engine.ts Code-Fix
- MT-2: ISSUE-057 Vitest-Pure-Function-Test
- MT-3: BL-423 Cleanup-Cron-Endpoint
- MT-4: BL-423 Vitest fuer Cron-Logik
- MT-5: REL-026-Notes-Draft + Coolify-Cron-Setup-Anleitung

**Out of Scope:**
- Schema-Migration (kein DDL noetig)
- Andere AI-Engines mit Schema-Drift (gehoeren in SLC-642 Code-Audit)
- Cleanup-Cron-Konfiguration ueber UI (90 Tage ist Code-Konstante)
- Multi-Tenant-Retention (Internal-Test-Mode = single user)

## Acceptance

- AC-1: `cockpit/src/lib/ai/followup-engine.ts:194-208` selektiert nicht mehr auf `value`, sondern auf `total_gross` (an 2 Stellen: Select-String Z. 199, order Z. 207).
- AC-2: Vitest enthaelt mindestens einen neuen Test der die FollowupEngine-Open-Proposals-Query auf `total_gross` prueft.
- AC-3: Container-Log nach Deploy zeigt keine `column proposals.value does not exist`-Fehler mehr in 24h Beobachtungs-Fenster.
- AC-4: `cockpit/src/app/api/cron/click-log-cleanup/route.ts` existiert und reagiert auf POST mit `Authorization: Bearer $CRON_SECRET`.
- AC-5: Endpoint loescht `campaign_link_clicks`-Eintraege aelter 90 Tage und schreibt audit_log-Zeile mit `action='click_log_cleanup'`, `changes={deleted_count, oldest_kept, cutoff, run_at}`.
- AC-6: Endpoint ist idempotent — 0-Row-Lauf erzeugt kein Error, JSON-Response mit `success:true, deleted:0`.
- AC-7: Vitest fuer Cron-Logik mit Mock-Now + Mock-Supabase-Client deckt Cutoff-Berechnung + Audit-Log-Insert + 0-Row-Fall ab.
- AC-8: Coolify-Cron-Setup-Anleitung steht als REL-026-Notes-Draft im Slice-Bericht (User legt den Cron-Eintrag manuell an, Pattern wie alle anderen Coolify-Crons).
- AC-9: Build success, Vitest 393/393 (oder mehr) PASS, kein neuer Lint-Error.
- AC-10: Live-Smoke nach Coolify-Redeploy: `npm run build` clean, App-Container healthy, Followup-Cron 1x manuell triggern und Log inspizieren — kein "column proposals.value"-Error.

## Reuse

- **`expire-proposals`-Pattern** (`cockpit/src/app/api/cron/expire-proposals/route.ts`, V5.5/REL-020) — 1:1-Vorlage fuer Click-Log-Cleanup-Cron-Struktur (POST + verifyCronSecret + admin-Client + Audit-Log-Insert + JSON-Response).
- **`verifyCronSecret`-Helper** (`cockpit/src/app/api/cron/verify-cron-secret.ts`) — keine Aenderung, direkter Reuse.
- **`audit_log`-Tabelle** (V5.7+) — bestehendes Schema, kein DDL.
- **Vitest-node-Env-Pattern** (Pattern aus V5.6 SLC-562 / V5.7 SLC-571 etc.) — keine RTL noetig, weil Server-Logik.

## Risks

- **Risiko AC-3 nicht innerhalb 24h verifizierbar:** FollowupEngine-Cron laeuft nur wenn echte stagnant-Deals existieren. Mitigation: manueller Cron-Trigger via curl + `Authorization: Bearer $CRON_SECRET`-Header direkt auf Hetzner.
- **Risiko Cutoff-Berechnung an Sommer/Winterzeit-Grenze:** `NOW() - INTERVAL '90 days'` ist Postgres-Server-Zeit (UTC), nicht Client-Zeit. Mitigation: Vitest mit Mock-Now im UTC + Live-Smoke nach Deploy + audit_log-Cutoff-Feld zur Nachvollziehbarkeit.
- **Risiko Coolify-Cron-Eintrag nicht aktiv nach Redeploy:** Cron-Setup ist User-Aktion ueber Coolify-UI. Mitigation: konkreter `node -e fetch()`-Snippet inkl. CRON_SECRET-Lookup in REL-026-Notes-Draft, Setup-Anleitung in Slice-Bericht.
- **Risiko `count: "exact"` schlaegt bei Supabase fehl:** Manche supabase-js-Versionen unterstuetzen `count`-Option in DELETE nicht direkt. Mitigation: Vor Implementation API-Doku der installierten supabase-js Version pruefen + Fallback auf SELECT-vor-DELETE-Pattern wenn noetig.

## Verification Strategy

### Pre-Implementation
- supabase-js Version pruefen (`grep '"@supabase/supabase-js"' cockpit/package.json`) und DELETE-count-Option-Support verifizieren.
- `cockpit/src/app/api/cron/expire-proposals/route.ts` lesen als 1:1-Pattern-Vorlage.

### Per-MT Verification
Siehe Micro-Tasks unten.

### Slice-Level Verification
- `npm run lint` — kein neuer Error
- `npm run test` — alle Tests gruen, neue Tests aus MT-2 + MT-4 mit gezaehlt
- `npm run build` — compile success
- Live-Smoke nach Coolify-Redeploy:
  1. App-Container healthy via `docker ps`
  2. Followup-Cron 1x manuell triggern, 24h spaeter erneut Log-Stichprobe — kein `column proposals.value`-Error
  3. Click-Log-Cleanup-Cron 1x manuell triggern, audit_log-Zeile inserted, JSON-Response success

---

## Micro-Tasks

### MT-1: ISSUE-057 followup-engine.ts Code-Fix
- **Goal:** Spalten-Referenz `value` durch `total_gross` ersetzen (2 Stellen).
- **Files:**
  - `cockpit/src/lib/ai/followup-engine.ts` (MODIFY)
- **Expected behavior:** Z. 199 select-string `value` -> `total_gross`; Z. 207 `.order("value", ...)` -> `.order("total_gross", ...)`. Keine Verhaltensaenderung ausser Spaltenname.
- **Verification:**
  1. `grep "proposals.value\|\"value\"" cockpit/src/lib/ai/followup-engine.ts` — keine Treffer mehr
  2. `npm run build` — success
- **Dependencies:** none

### MT-2: ISSUE-057 Vitest-Pure-Function-Test
- **Goal:** Regression-Test fuer den Open-Proposals-Query-Builder.
- **Files:**
  - `cockpit/src/lib/ai/__tests__/followup-engine.test.ts` (NEW oder EXTEND falls existiert)
- **Expected behavior:** Test mockt einen Supabase-Client, ruft die Open-Proposals-Query-Funktion auf (ggf. via Hilfs-Export), prueft dass `from("proposals").select(...)` `total_gross` enthaelt und `.order("total_gross", ...)` aufgerufen wird. Mindestens 1 Assert pro Stelle.
- **Verification:**
  1. `npm run test -- followup-engine` — mindestens 1 neuer Test gruen
  2. Wenn der Test gegen die alte Version (vor MT-1) lief, wuerde er rot sein (Regression bewiesen)
- **Dependencies:** MT-1

### MT-3: BL-423 Cleanup-Cron-Endpoint
- **Goal:** Neuer Cron-Endpoint fuer 90-Tage-Click-Log-Retention.
- **Files:**
  - `cockpit/src/app/api/cron/click-log-cleanup/route.ts` (NEW)
- **Expected behavior:** POST-Endpoint, `verifyCronSecret`, admin-Client DELETE FROM `campaign_link_clicks` WHERE created_at < NOW()-90d, anschliessend SELECT MIN(created_at) fuer `oldest_kept`, dann INSERT in audit_log mit `action='click_log_cleanup'` + changes-JSONB. Idempotent (0-Row-Lauf produziert success-Response). JSON-Response: `{ success, deleted, cutoff, oldest_kept }`.
- **Verification:**
  1. `npm run build` — success
  2. `curl -X POST http://localhost:3000/api/cron/click-log-cleanup` ohne Auth -> 401
  3. `curl -X POST -H "Authorization: Bearer <CRON_SECRET>"` lokal -> JSON-Response (lokal evtl. ohne Daten = `deleted:0`)
- **Dependencies:** none (parallel zu MT-1/MT-2 moeglich)

### MT-4: BL-423 Vitest fuer Cron-Logik
- **Goal:** Pure-Function-Test fuer Cleanup-Cron.
- **Files:**
  - `cockpit/src/app/api/cron/click-log-cleanup/__tests__/route.test.ts` (NEW)
  - ggf. Hilfs-Export-Refactor in `route.ts` damit Logik testbar (Pure-Function `runClickLogCleanup(supabaseAdmin, now)`).
- **Expected behavior:** Test mockt Supabase-Admin-Client + Mock-Now (z.B. `2026-05-07T03:00:00Z`), prueft (a) Cutoff-Berechnung exakt 90 Tage zurueck, (b) DELETE-Aufruf mit `.lt("created_at", cutoff)`, (c) audit_log-Insert mit korrekten changes-Feldern, (d) 0-Row-Fall liefert `success:true, deleted:0`.
- **Verification:**
  1. `npm run test -- click-log-cleanup` — mindestens 4 Tests (Cutoff, DELETE-Filter, Audit-Insert, 0-Row)
- **Dependencies:** MT-3

### MT-5: REL-026-Notes-Draft + Coolify-Cron-Setup-Anleitung
- **Goal:** Konkrete Anleitung fuer User-Coolify-Cron-Setup im Slice-Bericht.
- **Files:**
  - Slice-Completion-Report (RPT-XXX nach /qa) — keine Code-Datei
- **Expected behavior:** Report enthaelt Section "Coolify-Cron-Setup" mit:
  - Container: `app`
  - Schedule: `0 3 * * *` (taeglich 03:00 UTC)
  - Command: `node -e 'fetch("https://business.strategaizetransition.com/api/cron/click-log-cleanup",{method:"POST",headers:{Authorization:"Bearer "+process.env.CRON_SECRET}}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))'`
  - ENV: `CRON_SECRET` muss als Container-ENV verfuegbar sein (analog expire-proposals)
- **Verification:** Slice-Bericht enthaelt copy-paste-faehigen Snippet, User folgt Anleitung in Coolify-UI nach Redeploy.
- **Dependencies:** MT-3

---

## Definition of Done

- Alle 5 MTs verifiziert (AC-1..AC-10 erfuellt)
- Vitest-Suite gruen (mindestens 393/393, mit den ~5 neuen Tests = ~398 PASS)
- Build clean, kein neuer Lint-Error
- Code committed + pushed
- Live-Smoke nach User-Coolify-Redeploy: Cron triggert ohne 5xx, audit_log-Eintrag verifiziert
- ISSUE-057 in `docs/KNOWN_ISSUES.md` auf `Status: resolved` gesetzt
- BL-423 in `docs/KNOWN_ISSUES.md` als resolved markiert (BL-Eintrag in backlog.json auch)
- Slice-Status auf `done` in `slices/INDEX.md`
- /qa als naechster Schritt automatisch
