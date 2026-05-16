# FEAT-721 — Test-Infra-Cleanup (V7.2-Sprint)

**Version:** V7.2
**Sprint:** Test-Infra-Cleanup vor V7.5
**Status:** planned (requirements done 2026-05-16)
**Geschaetzter Aufwand:** ~3-4h, 1 Slice
**Vorgaenger:** REL-030 (V7.1 deployed 2026-05-16)
**Nachfolger:** V7.5 NL-Automation

## Problem Statement

V7-Release hat 3 Test-Infra-Schwaechen liegengelassen, die als Accepted Risks in REL-030 dokumentiert wurden. Sie blockieren keine V7.1-Funktionalitaet, untergraben aber die Multi-User-Test-Confidence und werden in V7.5 (NL-Automation im Multi-User-Kontext) zur Bremse.

### Konkrete Symptome
1. **ISSUE-073:** `cockpit/__tests__/rls/v7-rls-matrix.test.ts` hat 96 SKIPPED Tests gegen die Coolify-DB, weil die Seed-Daten fuer 3 Multi-User-Test-Accounts fehlen. Test-Output: `"Seed-Daten fehlen: deals hat keine Records mit owner=00000000-0000-0000-0000-000000000081. 'npm run seed:multi-user' ausfuehren."` Plus `aggregate-queries.test.ts` 2/6 FAILs (verursacht durch ISSUE-075, dort bereits resolved). Heutiger Test-Stand: 20 PASS + 2 FAIL + 96 SKIP von 118.
2. **ISSUE-074:** `cockpit/vitest.rls.config.ts` hat keinen Path-Alias-Resolver konfiguriert. Folge: 7 Bulk-Reassign-Test-Suites werfen `Cannot find package '@/lib/db/pg'` und laden mit 0 Tests. RLS-Live-DB-Confidence fuer SLC-707-Bulk-Reassign-Pfad fehlt.
3. **BL-471:** `cockpit/scripts/create-qa-test-users.mjs` legt nur Teamlead + Member an. Bei /qa SLC-711 musste der qa-admin-Account inline per Admin-API + Profile-INSERT in der /qa-Session angelegt werden (~5-10 Min Overhead + 2 Stolperer mit Heredoc-Variable-Expansion-Trap, Dev-System IMP-486).

### Warum jetzt
V7.5 NL-Automation lebt im Multi-User-Kontext (Trigger pro Owner, Action mit owner-Filter). Ohne saubere Seed-Daten + Path-Alias-Resolver + 3. Rolle im Seed-Script wuerde die V7.5-Implementierung wieder neue Test-Infra-Workarounds einbauen. Sauberer Cut jetzt.

## Goal / Intended Outcome

Nach V7.2-Sprint:
- **`npm run test:rls` PASS 118/118** auf der Coolify-DB (20 PASS + 96 SKIP → 118 PASS).
- **`npm run test:rls` deckt Bulk-Reassign-Pfad** (7 Suites lauffaehig statt 0).
- **Seed-Script enthaelt alle 3 Rollen** (Admin/Teamlead/Member) und ist idempotent.
- **Seed-Script ist Teil des Container-Bootstraps** — bei jedem Coolify-Redeploy idempotent re-applied (kein manueller Schritt nach Restart).

## Primary User

- Entwickler (Strategaize-Team-Mitglied im /qa- oder /backend-Skill).
- Sekundaer: CI-Runner (zukuenftig — V7.2 baut die Basis dafuer).

**Nicht in V7.2-Scope:** End-User des Business-Systems sehen V7.2 nicht. Keine UI-Aenderungen, keine Production-Daten-Aenderungen.

## V1 Scope (V7.2-Sprint)

### In-Scope (3 Items)

**MT-1 — Coolify-DB Seed-Bootstrap (ISSUE-073 + BL-471)**
- `cockpit/scripts/create-qa-test-users.mjs` um `qa-admin@strategaize.test` (UUID `00000000-0000-0000-0000-0000000ba001`) als 3. Rolle erweitern.
- `npm run seed:multi-user` (Tabellen-Seed: 8 Tabellen mit Owner-Filter-Daten) gegen Coolify-Postgres applicieren.
- Container-Bootstrap-Hook anlegen, der bei jedem App-Container-Start `seed:multi-user --idempotent` ausfuehrt — Insert-OnConflict-DoNothing-Pattern.
- Verifikation: nach Coolify-Redeploy stehen alle 3 Test-Rollen + Test-Daten in der DB, idempotent.

**MT-2 — vitest.rls.config.ts Path-Alias-Resolver (ISSUE-074)**
- `cockpit/vitest.rls.config.ts` um `plugins: [tsconfigPaths()]` aus `vite-tsconfig-paths` (bereits in dependencies) erweitern. Alternativ `resolve.alias: { "@": resolve(__dirname, "src") }`.
- Verifikation: `npm run test:rls -- bulk-reassign.test.ts` laedt 7 Test-Suites + laeuft sie gegen die Coolify-DB.

**MT-3 — Test-Suite-Gesamt-Lauf + Records-Sync**
- `npm run test:all` auf der Coolify-DB. Erwartetes Outcome: 779 jsdom PASS + 118 RLS PASS = **897 PASS total**.
- Reports + Cockpit-Records: FEAT-721 + SLC-721 auf `done`, ISSUE-073 + ISSUE-074 + BL-471 auf `resolved`.

### Out-of-Scope (explizit)
- **Kein Code-Touch an V7-Server-Actions, RLS-Policies, SQL-Helper-Functions.** V7-Schema bleibt komplett unangetastet.
- **Keine neuen Test-Cases.** Existierende SKIP-Tests werden lauffaehig, nicht erweitert.
- **Keine CI-Pipeline-Anbindung.** Das ist V8+-Thema.
- **Keine V7.5-Vorgriffe.** Wenn der Seed-Bootstrap fuer NL-Automation noch eine Tabelle brauchen wuerde, kommt das in V7.5.
- **Keine Schema-Migration.** Wenn das Seed-Script ein neues Constraint findet, wird das als ISSUE notiert und in der naechsten Schema-Migration nachgezogen.

## Core Features (Sub-Items)

| Sub-Item | Bezug | Status nach V7.2 |
|---|---|---|
| Seed-Script qa-admin-Account | BL-471 | resolved |
| Seed-Script Multi-User-DB-Daten + Container-Bootstrap | ISSUE-073 | resolved |
| vitest.rls.config.ts Path-Alias-Resolver | ISSUE-074 | resolved |

## Constraints

- **Coolify-DB ist Live-Production-Postgres (Internal-Test-Mode)** — Seed-Script darf KEINE Production-Daten ueberschreiben oder loeschen. Pattern: nur INSERT mit `ON CONFLICT DO NOTHING`, kein DELETE/UPDATE auf bestehende Production-IDs. Test-Accounts haben UUID-Range `00000000-0000-0000-0000-0000000ba0xx` (qa-* Prefix) und Tenant-`00000000-0000-0000-0000-000000000077` ("[TEST] Test-Team") — klar separiert von Strategaize-Team `fa0ff2b6-...`.
- **Container-Bootstrap darf den App-Start nicht blockieren** — wenn Seed fehlschlaegt, Warnung in Logs, aber App startet trotzdem (Seed ist optional fuer Production-User-Pfad).
- **Pattern-Reuse Pflicht (Rule strategaize-pattern-reuse.md)** — Path-Alias-Resolver-Pattern aus `cockpit/vitest.config.ts` (jsdom-Default) 1:1 fuer rls-Config portieren, nicht neu designen.
- **Time-Box: 3-4h, max 1 Slice.** Wenn Seed-Bootstrap-Pfad mehr Aufwand verlangt (z.B. weil 8 Tabellen-Seed komplex wird), erst-Sub-Item zurueckschneiden auf qa-admin + Pure-Seed-Script und Container-Bootstrap auf BL-475 fuer V7.3.

## Risks / Assumptions

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| Seed-Script verletzt unbekannte CHECK-Constraint in V7-Schema | mittel | `seed:multi-user --dry-run` Modus zuerst auf Coolify-DB pruefen. Bei Constraint-Hit: ISSUE notieren, Workaround ohne Schema-Aenderung. |
| Container-Bootstrap-Hook konflikt mit existing Startup-Sequenz (Next.js + Coolify) | niedrig | Pattern aus Onboarding-Plattform / Business-System pruefen vor Implementierung. Wenn unbekannt: separater Bootstrap-Job statt In-App-Hook. |
| vite-tsconfig-paths-Version-Drift zwischen src + rls-Config | niedrig | dieselbe Package-Version, ein Resolver-Setup |
| Time-Box von 3-4h gerissen | mittel | Bei Hit auf MT-1 (Container-Bootstrap zu komplex): Slice schneiden auf nur Seed-Script + Manual-Apply, Bootstrap auf V7.3 verschieben. |

## Success Criteria

| Kriterium | Messung |
|---|---|
| Multi-User-RLS-Matrix lauffaehig | `npm run test:rls -- v7-rls-matrix` = 96 PASS (statt 96 SKIP) |
| Bulk-Reassign-Tests lauffaehig | `npm run test:rls -- bulk-reassign` = 7 Suites laden, alle laufen |
| Test-Total PASS | `npm run test:all` = 897 PASS (779 jsdom + 118 RLS), 0 FAIL, 0 SKIP |
| Coolify-DB hat 3 Test-Rollen | psql `SELECT email, role FROM profiles WHERE email LIKE 'qa-%@strategaize.test'` = 3 Rows |
| Idempotenz | 2x `seed:multi-user` ausfuehren liefert identisches Outcome, keine Duplicate-Errors |
| Container-Bootstrap | nach Coolify-Redeploy laeuft Seed automatisch (Log-Eintrag), Test-Daten sind da |

## Open Questions

1. **Container-Bootstrap-Pfad:** Bootstrap-Hook im Dockerfile-Entrypoint, in `cockpit/start.sh`, oder separater Coolify-Pre-Deploy-Cron? Entscheidung in /architecture V7.2.
2. **Seed-Script auf Production-DB:** Wird das Script bei jedem Redeploy ausgefuehrt (idempotent) oder nur einmalig manuell? Idempotent automatisch ist sauberer, aber muss klar als "Internal-Test-Mode-only" markiert werden. Entscheidung in /architecture V7.2.
3. **Seed-Script-Daten-Umfang:** Wie viele Records pro Tabelle pro Owner? V7-RLS-Matrix-Test braucht mindestens 1 Record pro Owner pro Tabelle (8 Tabellen x 3 Owner = 24 Records). Reicht 1 oder brauchen wir 3 fuer Aggregat-Tests? Entscheidung in /architecture V7.2 — Default-Annahme: 3 Records pro (Tabelle, Owner).
4. **Migration auf CI-Pipeline:** Wenn das Seed-Script in V7.2 sauber laeuft, soll es spaeter auch in einer CI-Pipeline ausgefuehrt werden (V8+)? Nicht-V7.2-Scope, aber Sub-Item-Design soll diesen Pfad nicht blockieren.

## Delivery Mode

**internal-tool** (unveraendert, kein Customer-Touchpoint).

## Recommended Next Step

`/architecture V7.2` — folgendes klaeren:
1. Container-Bootstrap-Pfad (Dockerfile-Entrypoint vs. start.sh vs. Coolify-Cron).
2. Seed-Script-Daten-Umfang (Records pro Tabelle).
3. Internal-Test-Mode-Gate fuer Production-DB.
4. Idempotenz-Pattern (`ON CONFLICT DO NOTHING` vs. `WHERE NOT EXISTS`).

Danach `/slice-planning V7.2` mit 1 Slice (SLC-721) und 3 MTs (MT-1 Seed+Bootstrap, MT-2 vitest-Config, MT-3 Verifikation + Records-Sync).
