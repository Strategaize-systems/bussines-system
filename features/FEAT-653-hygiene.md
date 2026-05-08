# FEAT-653 — Schema + Dependency Hygiene

**Status:** planned
**Version:** V6.5
**Created:** 2026-05-08
**Sources:** RPT-336 V6.4 Code-Audit (CA-011..014 Source-Schema) + V6.3 SLC-631 MT-7 (npm audit non-force) + V6.4 RPT-341 M4

## Purpose

Zwei nicht-thematisch verwandte aber beide "Hygiene"-Items, die V6.4-Audit als V6.5-Defer-Kandidaten klassifiziert hat. Beide blockieren V7-Multi-User nicht direkt, aber ihre Reduktion vor V7 vermeidet Tech-Debt-Akkumulation in einem Sprint, der ohnehin grossen Scope hat.

Ziel: Source-Schema-Drift via einmalige Bulk-Migration aufloesen + npm-Vulnerabilities von 6 moderate auf 0 reduzieren (oder dokumentiert akzeptiert).

## Scope

### Teil 1: Source-zu-Kampagne Bulk-Migration (BL-424, CA-011..014)

**Aktuell:** V6.2 hat campaign_id-Felder auf contacts/companies/deals eingefuehrt (DEC-138 First-Touch-Lock). Legacy-Felder `contacts.source`/`source_detail` + `companies.source_type`/`source_detail` bleiben backward-compatible unangetastet — DEC-136 hat keine V1-Source-Migration erlaubt.

V6.4-Audit hat 4 Source-Schema-Inkonsistenz-Items klassifiziert:
- CA-011: Lead-Intake Doppel-Writer fuer source UND campaign_id (asymmetrische Locking-Semantik)
- CA-012: Form-Inputs lesen `contacts.source/source_detail` (UI-Reader-Drift, 3 Felder fuer "wo kommt der Lead her")
- CA-013: Form-Inputs lesen `companies.source_type/source_detail` (analog zu CA-012)
- CA-014: CSV-Export liest `source_detail` UND `campaign_id` parallel (CSV-Konsumenten-Risk)

**Loesung:**
- Optional A: Settings-Tool mit Mapping-UI ("LinkedIn April" → campaign-id-X), User definiert Mapping, Tool macht Bulk-UPDATE
- Optional B: Einmalige SQL-Migration mit hartkodiertem Mapping (User pflegt Mapping in JSON-File pre-migration)
- Nach Migration: Form-Inputs auf CampaignPicker only (Legacy-Felder als read-only-Display wenn nicht-leer)
- CSV-Export-Spalten-Schema auf "Kampagnen-Name" umstellen (CSV-Konsumenten-Hinweis falls externe Empfaenger)

### Teil 2: npm audit --force Cleanup (BL-430, RPT-341 M4)

**Aktuell:** V6.3 SLC-631 MT-7 hat `npm audit fix` (non-force) angewendet, 9 → 6 Vulnerabilities reduziert. Verbleibend 6 moderate:
- @modelcontextprotocol/sdk + express-rate-limit + ip-address (Chain via shadcn) — autofix mit --force
- postcss <8.5.10 (sub-dep von next) — fix verlangt next@9.3.3-Downgrade (catastrophic)

**Loesung:**
- Phase 1: hono + ip-address `npm audit fix` (sicherer Pfad, ohne --force) — bereits in V6.3 versucht, ggf. mit neuerem Toolchain-Stand erneut probieren
- Phase 2: postcss-Vulnerability dokumentiert als "akzeptiert" (kein direkter User-Input von untrusted CSS, Build-Time-only) bis Upstream-Next-Release
- Phase 3: Audit-Strategy in `/docs/SECURITY.md` oder ROOT-README dokumentieren
- Build+Test-Cycle nach jeder npm-Aenderung: Build clean, Vitest 405/405 PASS, kein neuer Lint-Error

## Acceptance Criteria

**AC1:** Mapping-Strategie fuer Source-Migration entschieden (UI-Tool oder SQL-Migration) — Open Question siehe unten.

**AC2:** Source-Migration Pre-Migration-Audit: SELECT-Statistik wie viele Rows pro source-Wert existieren (DSGVO-Spur in audit_log).

**AC3:** Source-Migration durchgefuehrt: alle Legacy-Source-Werte entweder auf campaign_id gemappt ODER explizit als "ungemappt" markiert.

**AC4:** Form-Inputs (contact-form.tsx + company-form.tsx) zeigen Legacy-Felder nur read-only wenn nicht-leer; Eingabe nur via CampaignPicker.

**AC5:** CSV-Export-Spalten-Schema verwendet `campaign_name` statt `source_detail`; bestehende externe CSV-Konsumenten-Hinweis dokumentiert.

**AC6:** npm audit Output: 0 high, 0 critical. Moderate Vulnerabilities entweder behoben ODER mit Begruendung in `/docs/SECURITY.md` oder `/docs/KNOWN_ISSUES.md` als akzeptiert dokumentiert.

**AC7:** Build clean nach npm-Aenderungen, Vitest 405/405+ PASS, kein neuer Lint-Error.

**AC8:** Live-Smoke nach Coolify-Redeploy: Container healthy, Browser-Smoke 5 Pages OK.

## Out of Scope

- Schema-Audit-DEC-148 (komplettere DB-Schema-Pruefung) — auf V7+ deferred bei Bedarf
- AI-Engine-Konsolidierung-DEC-149 — auf V7+ deferred
- Multi-Touch-Tracking-Erweiterung (BL-425 → V7)
- Source-Migration als reversible Migration (V6.5 ist forward-only)
- Auto-Update-Cron fuer Dependencies (Dependabot/Renovate-Setup) — wenn Bedarf, separater Infra-Slice

## Open Questions for /architecture

- BL-424 Migration-Strategie: UI-Mapping-Tool (User-friendly aber Aufwand) oder SQL-Migrations-Skript (schnell, weniger flexibel)?
- BL-424 Migration-Reversibilitaet: Source-Felder NACH Migration in DB lassen (Backup) oder DROP COLUMN?
- BL-430 postcss-Akzeptanz: Wo dokumentieren — KNOWN_ISSUES als ISSUE-058 oder neue SECURITY.md?
- BL-430 Audit-Strategie: Wann und wie naechste Ueberpruefung? Bei jedem npm install oder nur bei Major-Releases?
- Sollte FEAT-653 in 2 separate Features gesplittet werden (Schema-Hygiene + Dep-Hygiene)?

## References

- BL-424 in `/planning/backlog.json` (Source-Migration)
- BL-430 in `/planning/backlog.json` (npm audit)
- RPT-336 V6.4 Code-Audit Section 3 (CA-011..014 Source-Schema-Inkonsistenzen)
- RPT-341 V6.4 Final-Check M4 (npm-Vulnerabilities-Akzeptanz)
- V6.2 DEC-138 First-Touch-Lock + DEC-136 Keine-V1-Source-Migration als historischer Kontext
- V6.3 SLC-631 MT-7 Records (`npm audit fix` non-breaking 9→6)
