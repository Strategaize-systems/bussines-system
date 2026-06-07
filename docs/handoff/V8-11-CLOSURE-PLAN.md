# V8.11 Closure-Plan — RLS-Sweep Final-Sprint

**Stand:** 2026-06-05 (nach SLC-903 /qa PASS-WITH-MEDIUM, RPT-593, Worktree HEAD `8340abd`)
**Repo:** BS Business System
**Worktree:** `c:/strategaize/strategaize-business-system-v811/` Branch `v8-11-rls-sweep` (Cumulative-Single-Branch, NICHT gepusht)
**Master HEAD:** `b108b74` (V8.13 STABLE)
**Verbleibend bis V8.11 STABLE:** ~9-12h Active-Work + ~24h Burn-In

## Inhaltsverzeichnis

1. Status-Snapshot
2. SLC-904 audit_log Klasse E
3. SLC-905 knowledge_chunks Klasse D
4. Gesamt-/qa V8.11
5. V8.11-Closure-Block-Bundle (7-8 Defense-in-Depth-Fixes)
6. /final-check V8.11
7. /go-live V8.11 REL-046
8. Master-Merge + Coolify-Auto-Redeploy
9. /post-launch V8.11 T+3h + T+24h
10. Risiken
11. Rollback-Notes
12. Zeit-Schema

## 1. Status-Snapshot

### Aktueller Stand (2026-06-05)

| Sub-Slice | Status | Tabellen | Vitest | Migration | Live |
|---|---|---|---|---|---|
| SLC-901 Klasse A user_id | **done** (/qa PASS-WITH-MEDIUM, RPT-585) | 4 | 48/48 | MIG-045 LIVE | ✓ |
| SLC-902 Klasse B Team-Templates | **done** (/qa PASS-WITH-MEDIUM, RPT-587+588) | 11 | 132/132 | MIG-046 LIVE | ✓ |
| SLC-903 Klasse C Parent-FK-JOIN | **done** (/qa PASS-WITH-MEDIUM, RPT-593) | 24 | 288/288 | MIG-047a+b+c LIVE | ✓ |
| **SLC-904 Klasse E audit_log** | **planned** | 1 | 18 geplant | MIG-048 geplant | — |
| **SLC-905 Klasse D knowledge_chunks** | **planned** | 1 | 20 geplant | MIG-049 geplant | — |
| **Gesamt-/qa V8.11** | **planned** | alle 41 | — | — | — |
| **/final-check V8.11** | **planned** | — | — | — | — |
| **/go-live V8.11 REL-046** | **planned** | — | — | — | — |
| **/post-launch V8.11** | **planned** | — | — | — | — |

### Done-Gate-Sequenz

Helper-Function `list_tables_with_authenticated_full_access()` Count:

```
Pre-V8.11:     41 Tabellen
post-SLC-901:  37 (-4 Klasse A)
post-SLC-902:  26 (-11 Klasse B + Helper-Deploy)
post-SLC-903:   2 (-24 Klasse C)        ← AKTUELLER STAND
post-SLC-904:   1 (-1 audit_log)
post-SLC-905:   0 (-1 knowledge_chunks) ← V8.11-COMPLETE-Gate
```

### V8.11-Closure-Block-Bundle (Defense-in-Depth-Faelle)

7-8 createAdminClient-Bypass-Findings ueber alle Sub-Slices gesammelt:

| Issue | Datei | Tabelle | Severity |
|---|---|---|---|
| **SLC-901 M-1** | `cockpit/src/lib/actions/*.ts` (3/4 Klasse-A-Actions) | goals, kpi-snapshots, activity-kpis | Medium |
| **ISSUE-090** | `cockpit/src/lib/actions/*.ts` | products | Medium |
| **ISSUE-091** | `cockpit/src/lib/actions/*.ts` | goals (Cross-Verify) | Medium |
| **ISSUE-092** | `cockpit/src/lib/actions/*.ts` | kpi_snapshots + activity_kpi_targets | Medium |
| **ISSUE-093** | `cockpit/src/lib/actions/insight-actions.ts` L37/40/83/87/172/176+196 | ai_action_queue + ai_feedback | Medium |
| **ISSUE-094** | `cockpit/src/lib/actions/document-actions.ts` L31/73/79/114/128 | documents | Medium |
| **SLC-903 M-1** | (duplikat zu ISSUE-094) | documents | Medium |

**Fix-Pattern (Option A bevorzugt, Option B fallback):**
- **Option A:** `createAdminClient()` → `createClient()` (authenticated-Path, RLS greift automatisch). Aufwand pro Fall: ~10min.
- **Option B:** `assertOwnership(entity_id)` Helper als Pre-Check vor createAdminClient (defense-in-depth, kein RLS-Refactor). Aufwand pro Fall: ~30min.

**Bundle-Entscheidung:** in Gesamt-/qa V8.11 nach SLC-905 done.

---

## 2. SLC-904 audit_log Klasse E (~2-3h Code-Side + ~1h /qa)

### Goal

`audit_log` ist die einzige `audit-trail`-Tabelle in V8.11. Special-Case per Q-V8.11-A: **Admin-all + Actor-own DSGVO-Art-15-Self-Service** (User kann eigene Audit-Eintraege als DSGVO-Auskunft sehen, Admin sieht alle).

### MTs (5-6 MTs gemaess Slice-Spec `slices/SLC-904-rls-sweep-klasse-e-audit-log.md`)

**MT-1 Pre-Check (~15min)**
- SSH-Schema-Verify: `audit_log` Spalten + actor-Spalte-Naming (`user_id` vs `actor_user_id` vs `triggered_by_user_id`)
- Pre-V8.11-Baseline 3 Queries (SELECT all + SELECT-own + INSERT-Cron)
- Index-Audit auf actor-Spalte (Pflicht fuer Actor-own-Pfad)

**MT-2 MIG-048 (~45min)**
- Migration-Datei `sql/migrations/048_v8_11_slc_904_klasse_e_audit_log.sql`
- DROP `authenticated_full_access` ON `audit_log`
- CREATE 4 Policies:
  - `audit_log_select`: `actor_user_id = auth.uid() OR is_admin()`
  - `audit_log_insert`: `WITH CHECK (false)` (nur service_role / Cron schreibt)
  - `audit_log_update`: `USING (false) WITH CHECK (false)` (Audit-Trail ist immutable)
  - `audit_log_delete`: `USING (false)` (Audit-Trail ist immutable; ggf. Admin-DELETE fuer DSGVO-Loeschung)
- Idempotent (DROP-IF-EXISTS auf alte UND neue Naming-Varianten)
- NOTIFY pgrst

**MT-3 Vitest 18 Tests (~45min)**
- `cockpit/__tests__/rls/v8-11-slc-904-rls-matrix.test.ts`
- 1 Tabelle × 3 Rollen × 4 Ops = 12 Standard-Tests
- + 6 Special-Tests fuer Actor-own-Pfad (member_1 sieht eigene audit-Rows, nicht foreign)
- + service_role-Test-Block (Pflicht per Q-V8.11-D): service_role kann INSERT/UPDATE/DELETE (bypass via SET LOCAL ROLE service_role)
- Vitest via node:20-Sidecar gegen Coolify-DB

**MT-4 Cron-Code-Audit (~30min)**
- `docs/AUDIT_CRON_V811.md` Section "Klasse E"
- Grep alle audit_log-Writer in `cockpit/src/lib/audit.ts` + Cron-Endpoints
- Verify: alle Writes setzen `actor_user_id` korrekt aus User-Context oder Cron-System-ID
- createAdminClient-Audit per IMP-1054 (sollte 0 NEW Findings ergeben — audit.ts ist Helper, bereits in SLC-901+902+903 indirekt geprueft)

**MT-5 Records-Sync + Live-Smoke + RPT (~30min)**
- `slices/INDEX.md`: SLC-904 `planned` → `done`
- `planning/backlog.json`: BL-511 `open` → `done`
- `docs/STATE.md` updated
- `docs/MIGRATIONS.md` MIG-048 Eintrag
- `docs/AUDIT_CRON_V811.md` Klasse E Section voll ausgefuellt
- Live-Smoke 3 Pfade via SSH:
  1. Helper-Function-Count Pre 2 → Post **1** ✓
  2. audit_log Policy-Count = 4 ✓
  3. Cross-Block-RLS member_2 SELECT eigener audit-Rows vs foreign-actor-Rows
- Report `reports/RPT-594.md`

### /qa SLC-904 (~1h, RPT-595)

Analog /qa SLC-903 (RPT-593-Pattern):
- AC-Matrix Verifikation (live SSH-Re-Verify Done-Gate=1)
- Stub-Detection
- createAdminClient-Audit (0 NEW expected)
- Pattern-Reuse vs SLC-901+902+903
- Wiring-Chain
- Risk-Audit

**Erwartung:** PASS oder PASS-WITH-LOW (audit_log ist single-table, minimal Komplexitaet)

---

## 3. SLC-905 knowledge_chunks Klasse D (~4-5h Code-Side + ~1h /qa)

### Goal

`knowledge_chunks` ist die letzte verbleibende Tabelle. **Destructive ALTER + Backfill + RPC-Erweiterung** noetig per Q-V8.11-C (Schema-Erweiterung um `owner_user_id` + `team_id`).

### MTs (7 MTs gemaess Slice-Spec `slices/SLC-905-rls-sweep-klasse-d-knowledge-chunks.md`)

**MT-1 Pre-Check + Schema-Inspection (~30min)**
- SSH-Schema-Verify: knowledge_chunks Spalten + bestehende Indices
- Pre-V8.11-Baseline 4 Queries (search_knowledge_chunks RPC + raw SELECT + INSERT-Cron)
- Backfill-Strategie-Entscheidung: alle bestehenden Rows mit welcher `owner_user_id` befuellen? (Erwartung: ein default Admin-User, dokumentiert in MIG-049-Kommentar)

**MT-2 MIG-049 Destructive ALTER + Backfill (~90min)**
- `sql/migrations/049_v8_11_slc_905_klasse_d_knowledge_chunks.sql`
- ALTER TABLE knowledge_chunks ADD COLUMN owner_user_id UUID + team_id UUID (NULL erlaubt initial)
- Backfill UPDATE: bestehende Rows mit default Admin-Owner befuellen (Knowledge-Indexer-System-ID)
- ALTER COLUMN owner_user_id SET NOT NULL nach Backfill
- CREATE INDEX idx_knowledge_chunks_owner + idx_knowledge_chunks_team
- DROP `authenticated_full_access`
- CREATE 4 Policies (V7-Direct-Pattern analog emails, owner_user_id-basiert):
  - `knowledge_chunks_select`: `can_see_owner(owner_user_id)` (team-share)
  - `knowledge_chunks_insert`: `owner_user_id = auth.uid() OR is_admin()`
  - `knowledge_chunks_update`: `can_see_owner(owner_user_id)` USING + `owner_user_id = auth.uid() OR is_admin()` WITH CHECK
  - `knowledge_chunks_delete`: `owner_user_id = auth.uid() OR is_admin()`
- Idempotent + NOTIFY pgrst

**MT-3 search_knowledge_chunks-Function-Erweiterung (~60min)**
- `cockpit/src/sql/functions/search_knowledge_chunks.sql` (oder direkter SQL-File in migrations/)
- RPC-Funktion erweitern um owner_user_id-Filter + team_id-Scope
- Backfill testen: bestehende RAG-Calls funktionieren weiter (transparent fuer Caller)
- Live-Apply auf Coolify-DB

**MT-4 Vitest 20 Tests (~60min)**
- `cockpit/__tests__/rls/v8-11-slc-905-rls-matrix.test.ts` (16 RLS-Matrix-Tests analog SLC-902 V7-Direct emails)
- + Schema-Test: ALTER COLUMN nicht-null + Indices existieren
- + RPC-Test: search_knowledge_chunks gibt nur scope-konforme Chunks zurueck
- Vitest via node:20-Sidecar

**MT-5 Cron-Code-Audit + Knowledge-Indexer-Update (~30min)**
- `cockpit/src/lib/knowledge/indexer.ts` L244/261 (createAdminClient OK Worker-Pattern, dokumentiert) — pruefen ob owner_user_id korrekt aus Quelldokument-Context gesetzt wird
- `/api/cron/embedding-sync` falls vorhanden — owner_user_id-Set verifizieren
- `docs/AUDIT_CRON_V811.md` Section "Klasse D" ausfuellen

**MT-6 Records-Sync + Live-Smoke + RPT (~30min)**
- `slices/INDEX.md`: SLC-905 `planned` → `done`
- `planning/backlog.json`: BL-512 `open` → `done`
- `docs/STATE.md` updated
- `docs/MIGRATIONS.md` MIG-049 Eintrag
- Live-Smoke 4 Pfade:
  1. Helper-Function-Count Pre 1 → Post **0** ✓ **Q-V8.11-B 100% Coverage Done-Gate erfuellt**
  2. knowledge_chunks Policy-Count = 4 ✓
  3. Cross-Block-RLS member_2 sieht nur eigene Chunks
  4. RPC search_knowledge_chunks scoped korrekt
- Report `reports/RPT-596.md`

**MT-7 RAG-Application-Smoke (~15min)**
- Echter `useFreeQuestion()`-Call vom Frontend (oder direkt API-Call) — verifizieren dass RAG-Antwort nach Schema-Migration nicht degraded ist
- Vergleichen mit V8.10 RAG-Behavior

### /qa SLC-905 (~1h, RPT-597)

Analog SLC-903/904 Pattern. **Erwartung:** PASS oder PASS-WITH-LOW.

---

## 4. Gesamt-/qa V8.11 (~1-2h, RPT-598)

### Scope

Alle 5 Sub-Slices SLC-901..905 kombiniert. Kein Sub-Slice-Re-Verify (das war Sub-/qa-Aufgabe). Stattdessen V8.11-uebergreifende Audits:

### Audit-Punkte

**A1 — Done-Gate Final-Check (5min)**
- `SELECT COUNT(*) FROM list_tables_with_authenticated_full_access()` = **0** ✓
- Q-V8.11-B 100% Coverage erfuellt

**A2 — Policy-Count V8.11-Total (5min)**
- Alle 41 V8.11-Tabellen × 4 Policies = 164 neue Policies expected
- SSH-Verify exakter Count

**A3 — V8.11-Closure-Block-Bundle Fix-Entscheidung (45min)**
- **HIER ist der V8.11-DEFINING-MOMENT.**
- 7-8 createAdminClient-Bypass-Faelle (ISSUE-090/091/092/093/094 + SLC-901+903 M-1)
- Entscheidung: Option A (createClient Replace) ODER Option B (assertOwnership Pre-Check)?
- **Empfehlung Option A** — sauberer, RLS-Pfad funktioniert da alle Sub-Slices RLS jetzt korrekt gesetzt haben.
- Implementation: 1 Commit pro File (7-8 Commits), je ~10min Refactor + Vitest re-run
- **Wenn Founder Option B bevorzugt:** Aufwand +20min/Fall = +2.5h gesamt. Defense-in-Depth-Mode.
- **Wenn Founder Deferral wuenscht:** Bundle bleibt offen, V8.11 closes mit Medium-Issues open, V8.12 picks up. **NICHT EMPFOHLEN** — Pre-Customer-Live-Blocker bleibt offen.

**A4 — Vitest Full-Suite V8.11 (15min)**
- `npm run test:rls` (oder analog) — alle 506 V8.11-Vitest-RLS-Tests GREEN
- jsdom Vitest-Suite optional re-run wenn Code-Aenderungen aus A3

**A5 — Cron-Code-Audit V8.11-uebergreifend (15min)**
- `docs/AUDIT_CRON_V811.md` Klasse A+B+C+D+E komplett gefuellt
- 0 FIX-NEEDED auf Cron-Pfaden (A3-Fixes betreffen Server-Actions, nicht Cron)

**A6 — Perf-Baseline V8.11-Aggregat (15min)**
- 41 Tabellen × 1 Repraesentativ-Query = 41 EXPLAIN-Queries (oder Sample 10-15)
- DEC-266-Threshold `max(100ms, 10x)` Pflicht
- Worst-Case-Re-Verify ai_action_queue Polymorph 10.247ms

**A7 — KNOWN_ISSUES + DECISIONS V8.11-uebergreifend (10min)**
- ISSUE-090/091/092/093/094 → Status `resolved` (falls A3 Option A gewaehlt) ODER `open` mit V8.12-Deferral-Note (NICHT empfohlen)
- DEC-265..276 V8.11-Architektur-Block dokumentiert

**A8 — RPT-598 mit V8.11-Gesamt-Verdict**
- Verdict: PASS oder PASS-WITH-LOW (alle Code-Side-Sub-/qas waren PASS-WITH-MEDIUM, aber Closure-Block-Bundle aufgeloest)

---

## 5. /final-check V8.11 (~15-20min, RPT-599)

### 7-Dimensions-Audit

1. **Quality-Gates Re-Run:** TSC + ESLint + Build + Vitest Full-Suite (~10min auto)
2. **Security-Audit:** `npm audit` + secret-leak-check + RLS-final-verify Done-Gate=0
3. **Dependency-Audit:** keine neuen package.json-Changes (V8.11 ist nur SQL+Vitest+optional A3-Server-Action-Refactor)
4. **Migration-Idempotenz:** alle 5 MIG-045..049 re-apply-test ohne Errors
5. **Records-Konsistenz:** slices/INDEX + backlog.json + STATE.md + KNOWN_ISSUES + RELEASES vorbereitet (REL-046-Stub)
6. **Coolify-Redeploy-Plan:** Image-Tag-Drift dokumentiert (V8.13 `b108b74` → V8.11 neuer Commit-Hash nach Master-Merge)
7. **Rollback-Notes:** dokumentiert (siehe Section 11)

**Verdict-Erwartung:** READY fuer /go-live (PASS-WITH-LOW akzeptiert wenn A3 Option A done).

---

## 6. /go-live V8.11 REL-046 (~10min, RPT-600)

### Release-Gate-Vote

- **GO mit accepted-risks** (wenn /final-check READY + Closure-Block-Bundle A3 Option A applied)
- **NO-GO** wenn Closure-Block-Bundle deferred zu V8.12 (Pre-Customer-Live-Blocker bleibt offen, NICHT empfohlen)

### Pre-Merge-Actions

1. `docs/RELEASES.md` REL-046-Eintrag (Date, Scope, Risks, Rollback-Notes)
2. `planning/roadmap.json`: V8.11 `active` → `released`
3. `features/INDEX.md`: FEAT-911 `in_progress` → `deployed`
4. `slices/INDEX.md`: SLC-901..905 alle `done` → `deployed`
5. `docs/STATE.md`: Last Stable Version vorbereitet (wird in /post-launch T+24h gesetzt)
6. Memory-File Pre-Release-Marker

### Commit-Plan

Final RPT-600-Commit auf `v8-11-rls-sweep`-Branch, dann **Master-Merge**.

---

## 7. Master-Merge + Coolify-Auto-Redeploy (~5min Active + ~5-10min Build)

### Merge-Strategie

`v8-11-rls-sweep` ist Cumulative-Single-Branch. Master-Merge ohne Squash (preserve atomic Commit-History fuer Bisect).

```bash
git checkout main
git merge v8-11-rls-sweep --no-ff -m "Merge V8.11 RLS-Sweep — 41 Tabellen Klasse A+B+C+D+E (REL-046)"
git push origin main
```

### Coolify-Auto-Redeploy

GitHub-Webhook getrigger automatisch (per IMP-1056 dokumentiert; falls Webhook nicht greift, manuell via Coolify-UI "Redeploy"). 

**Image-Tag:** neuer Commit-Hash post-Merge. Container-Names werden mit neuem Timestamp-Suffix versehen — alte `supabase-db-k9f5pn5upfq7etoefb5ukbcg-065643061649`-Referenzen ggf. drift.

**Pre-Apply auf Coolify-DB:** alle 5 Migrations MIG-045..049 sind bereits LIVE applied (per Sub-Sessions). Coolify-Redeploy ist Code-Side-only.

---

## 8. /post-launch V8.11 T+3h + T+24h

### T+3h Light-Check (~10min, RPT-601)

- App-Container Status (Started + RestartCount=0)
- App-Log letzte 3h: errors/exceptions/stack count
- Cron-Loops alle Endpoints aktiv (`errors=0|picked=0`-Pattern)
- DB-Connectivity-Verify
- 1 Live-Smoke-Pfad per RLS-Sweep-Sicht (Helper-Function-Count=0 + Sample-Tabelle Multi-Role-Check)

### T+24h Full-Check (~10-15min, RPT-602)

Pflicht-Gate fuer V8.11 → STABLE:
- 0 echte App-Errors in 24h
- RestartCount=0 auf allen Containern
- alle Cron-Loops konsistent
- RLS-Sweep persistent (Done-Gate=0 reverify)
- Closure-Block-Bundle-Fixes greifen in Production (createClient-Pfad funktioniert)

### Post-T+24h-Actions

- `planning/roadmap.json`: V8.11-Status erweitert um STABLE-Marker (Schema hat keinen `stable`-Status, aber STATE.md "Last Stable Version" update)
- `docs/STATE.md`: Last Stable Version updated V8.13 → **V8.11**
- Memory-File `project_bs_v811_stable_post_launch_pass_*` als finaler V8.11-Resume-Punkt

---

## 9. V8.11-Closure-Block-Bundle Detail (A3 in Gesamt-/qa)

### Empfohlene Reihenfolge (wenn Option A)

| Reihenfolge | File | Issue | Aufwand |
|---|---|---|---|
| 1 | `cockpit/src/lib/actions/document-actions.ts` | ISSUE-094 + SLC-903 M-1 | ~10min + Vitest re-run |
| 2 | `cockpit/src/lib/actions/insight-actions.ts` | ISSUE-093 | ~10min + Vitest re-run |
| 3 | `cockpit/src/lib/actions/<products>.ts` | ISSUE-090 | ~10min |
| 4 | `cockpit/src/lib/actions/<goals>.ts` | ISSUE-091 + SLC-901 M-1 | ~10min |
| 5 | `cockpit/src/lib/actions/<kpi_snapshots>.ts` | ISSUE-092 part 1 | ~10min |
| 6 | `cockpit/src/lib/actions/<activity_kpi_targets>.ts` | ISSUE-092 part 2 | ~10min |
| 7 | Optional: `cockpit/src/lib/actions/<deal-products>.ts` (falls separate) | SLC-901 M-1 part | ~10min |

**Pflicht-Verifikation pro Fix:**
1. Grep `createAdminClient` ueber File → 0 Treffer post-Fix
2. Vitest Tabelle-Re-Run via node:20-Sidecar
3. KNOWN_ISSUES Status `open` → `resolved` mit Resolution-Block

**Total Aufwand A3:** ~60-90min Code-Side + ~30min Records-Sync.

---

## 10. Risiken

### R-V8.11-Closure-1 (Medium) — Closure-Block-Bundle Deferral

Wenn Founder A3 deferred zu V8.12: V8.11 closes mit 7-8 Defense-in-Depth-Issues open. Pre-Customer-Live-Blocker bleibt offen. **NICHT empfohlen.**

**Mitigation:** Founder-Direktive in Gesamt-/qa explizit anfragen.

### R-V8.11-Closure-2 (Low) — SLC-905 Destructive ALTER mit Backfill-Fehler

MIG-049 ALTER + Backfill + NOT NULL ist mehrstufig. Bei Backfill-Failure: Tabelle in inkonsistentem Zustand (Spalte exists aber NULL).

**Mitigation:** MIG-049 in `BEGIN; ... COMMIT;` wrap, Rollback bei Fehler. Pre-Apply auf Test-Container falls verfuegbar.

### R-V8.11-Closure-3 (Low) — Coolify-Auto-Redeploy-Drift

Per IMP-1056 dokumentiert: GitHub-Webhook nicht zuverlaessig.

**Mitigation:** Nach Master-Merge manuell Coolify-UI "Redeploy" klicken + Container-Status verifizieren.

### R-V8.11-Closure-4 (Low) — V8.13 → V8.11 Last-Stable-Version-Drift

V8.13 ist aktuelle Last Stable. V8.11 wird sie ueberschreiben nach /post-launch T+24h PASS-STABLE. Pattern-Konsistenz zu V8.10 → V8.13 Wechsel 2026-06-04.

**Mitigation:** STATE.md explizit aktualisieren in /post-launch T+24h.

---

## 11. Rollback-Notes

### Migration-Rollback

Alle 5 MIG-045..049 sind RLS-Policy-Changes + Index-Adds + (MIG-049) Schema-ALTER. Rollback-Pfade:

- **MIG-045..048 (Policy-Only):** Re-CREATE old `authenticated_full_access`-Policy pro Tabelle. Verlust: kein Datenverlust, nur RLS-Sicherheit zurueck auf Pre-V8.11-Niveau (alle authenticated sehen alles).
- **MIG-049 (Schema-ALTER):** Schwerwiegender — `ALTER TABLE knowledge_chunks DROP COLUMN owner_user_id, team_id` + Re-CREATE old Policy. Datenverlust: nur die 2 neuen Spalten, kein Chunk-Loss.

### Code-Side-Rollback

`v8-11-rls-sweep`-Branch revert per Master-Merge-Commit:
```bash
git revert -m 1 <merge-commit-hash>
git push origin main
```

Coolify-Auto-Redeploy mit Pre-V8.11-Image-Tag.

### Closure-Block-Bundle-Rollback (falls A3 Option A breaks)

Pro File: revert auf `createAdminClient`-Pattern, KNOWN_ISSUES wieder `open`. Aufwand: ~5min/File via git revert.

---

## 12. Zeit-Schema

### Reine Active-Work

| Step | Aufwand |
|---|---|
| /backend SLC-904 | ~2-3h |
| /qa SLC-904 | ~1h |
| /backend SLC-905 | ~4-5h |
| /qa SLC-905 | ~1h |
| Gesamt-/qa V8.11 (inkl. A3 Option A) | ~2.5-3.5h |
| /final-check V8.11 | ~15-20min |
| /go-live V8.11 + Master-Merge | ~15min |
| /post-launch T+3h | ~10min |
| /post-launch T+24h | ~10-15min |
| **Total Active** | **~11-15h** |

### Mit Burn-In + Founder-Wartezeit

- T+0 (Master-Merge) → T+3h (Light-Check)
- T+3h → T+24h (Full-Check) — Pflicht-Window
- **Total inkl. Burn-In:** ~36-39h Wall-Clock

### Empfohlene Session-Verteilung

| Session | Scope | Aktive Zeit |
|---|---|---|
| **Session A (fresh)** | /backend SLC-904 + /qa SLC-904 | ~3-4h |
| **Session B (fresh)** | /backend SLC-905 + /qa SLC-905 | ~5-6h |
| **Session C (fresh)** | Gesamt-/qa V8.11 mit A3 Closure-Block-Bundle Option A | ~2.5-3.5h |
| **Session D (kurz)** | /final-check + /go-live + Master-Merge | ~30-45min |
| **Session E (T+3h Light)** | /post-launch T+3h | ~10min |
| **Session F (T+24h Full)** | /post-launch T+24h + STATE Last-Stable-Bump | ~15min |

**Empfehlung:** Jede Session in fresh Context starten (analog Pattern-Konsistenz zu SLC-901+902+903). Worktree `v8-11-rls-sweep` bleibt cumulative bis Master-Merge.

---

## Anhang A — Verbleibende Slice-Spec-Files

- `slices/SLC-904-rls-sweep-klasse-e-audit-log.md`
- `slices/SLC-905-rls-sweep-klasse-d-knowledge-chunks.md`

Beide Specs sind in V8.11 /slice-planning RPT-582 angelegt. Founder kann vor Session A nachlesen.

## Anhang B — Relevante DECs aus V8.11 /architecture

- DEC-265 Sub-Slice-Reihenfolge SLC-901..905
- DEC-266 EXPLAIN-Threshold `max(100ms, 10x-Baseline)`
- DEC-268 Vitest-Pattern V7-Matrix-Adapter
- DEC-269 service_role-Bypass-Pattern fuer Cron + Pflicht-Audit pro Sub-Slice
- DEC-271 Klasse-A user_id-Pattern
- DEC-272 Klasse-C Multi-Parent OR-EXISTS-Pattern
- DEC-273 Klasse-D Schema-ALTER + Backfill
- DEC-274 Sec-Audit-Helper-Function `list_tables_with_authenticated_full_access()` (SLC-902 deployed)
- DEC-275 Klasse-C-OQ-arch-5/6 Entscheidungen (ai_action_queue Polymorph 5-Wege + documents documents_table_*-Praefix)
- DEC-276 Klasse-E audit_log Admin-all + Actor-own DSGVO-Art-15

## Anhang C — Founder-Pflicht-Entscheidungen

Vor Session C (Gesamt-/qa V8.11) muss Founder folgende Entscheidung treffen:

**Closure-Block-Bundle:**
- [ ] Option A (createClient Replace, ~60-90min, empfohlen)
- [ ] Option B (assertOwnership Pre-Check, ~3-4h)
- [ ] Deferral zu V8.12 (NICHT empfohlen, Pre-Customer-Live-Blocker offen)

Default ohne Direktive: **Option A** wird in Gesamt-/qa angewendet.
