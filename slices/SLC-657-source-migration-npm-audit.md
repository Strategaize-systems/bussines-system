# SLC-657 — Source-Migration + npm audit + ISSUE-058 (BL-424 + BL-430)

## Metadata
- **Slice ID:** SLC-657
- **Version:** V6.5
- **Feature:** FEAT-653
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-08
- **Estimated Effort:** ~2-4h (inkl. User-Pause fuer Mapping-File)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** **mandatory** (Datenmigration ist destructive im UPDATE-Sinn, isolierte Branch erlaubt sauberen Pre-Production-Audit + Rollback)
- **Architecture:** DEC-159 (SQL-Skript mit Mapping-File) + DEC-160 (Source-Felder als Backup) + DEC-161 (postcss-Akzeptanz) + MIG-031 + ISSUE-058

## Goal

Zwei nicht-thematisch verwandte Hygiene-Items: Source-zu-Kampagne Bulk-Migration aufloesen + npm audit cleanup-Path dokumentieren.

## Scope

**In Scope:**
- Pre-Migration-Audit-SQL: SELECT distinct source-Werte mit Counts pro contacts/companies
- User-Pause: User pflegt Mapping-JSON-File mit campaign_id pro source_value
- Bulk-UPDATE-SQL (idempotent via campaign_id IS NULL Filter)
- Audit-Log-Insert pro Migration-Run mit Stats
- contact-form.tsx + company-form.tsx: Legacy-Felder read-only-Display wenn nicht-leer
- /api/campaigns/[id]/export/route.ts: CSV-Spalte source_detail → campaign_name
- ISSUE-058 dokumentieren in KNOWN_ISSUES (bereits durch /architecture geschehen)
- npm audit re-check + ggf. non-force fixes anwenden

**Out of Scope:**
- DROP COLUMN auf Legacy-Source-Felder (DEC-160 — bleiben als Backup)
- UI-Mapping-Tool (DEC-159 — SQL-Skript reicht)
- npm audit fix --force fuer postcss (DEC-161 catastrophic)
- Auto-Update-Cron fuer Dependencies

## Acceptance Criteria

- AC-1: `sql/migrations/031_v65_pre_audit.sql` zeigt distinct source-Werte mit Counts (Pre-Migration-Inspection vor User-Pause)
- AC-2: User-Pause: User pflegt `sql/migrations/031_v65_source_to_campaign_mapping.json` mit `[{entity, source_value, source_detail_value, campaign_id}]`-Struktur
- AC-3: `sql/migrations/031_v65_bulk_update.sql` macht idempotenten UPDATE: `WHERE campaign_id IS NULL` Filter; einer der Mapping-Eintraege liefert valide UUID; Audit-Log-Insert mit Stats
- AC-4: contact-form.tsx + company-form.tsx zeigen Legacy-Felder (`contacts.source/source_detail`, `companies.source_type/source_detail`) nur read-only wenn nicht-leer + Hinweis "Legacy-Quelle, neue Eingaben via Kampagne"; CampaignPicker bleibt primary
- AC-5: `/api/campaigns/[id]/export/route.ts` CSV-Spalten-Schema ersetzt `source_detail` durch `campaign_name` (LEFT JOIN auf campaigns); existing CSV-Konsumenten werden in Slice-Bericht dokumentiert
- AC-6: ISSUE-058 in `/docs/KNOWN_ISSUES.md` mit Status=open, Severity=Low, Workaround + Next-Action dokumentiert (bereits durch /architecture)
- AC-7: `npm audit` Output: 0 high, 0 critical; moderate Vulnerabilities entweder reduziert (non-force fix) ODER in ISSUE-058 dokumentiert
- AC-8: `npm run build` clean, Vitest 405/405+ PASS, kein neuer Lint-Error
- AC-9: Live-Smoke nach Coolify-Redeploy: contact-form + company-form zeigen Legacy-Felder read-only wo erwartet; CSV-Export einer Kampagne hat campaign_name-Spalte

## Reuse

- V5.7 sql-migration-hetzner-rule fuer SSH+base64-Pattern
- V5.5 audit_log-Insert-Pattern (action='source_migration_v65', changes=JSONB)
- V6.2 CSV-Export-Pattern in `/api/campaigns/[id]/export/route.ts`
- V6.3 npm audit fix non-force-Pattern (BL-430-Description-History)

## Risks

- **Falsches Mapping → falsche campaign_id-Zuordnung:** Mitigation: Pre-Migration-Audit + User-Pause + Idempotenz-Filter + Source-Felder als Backup (DEC-160)
- **CSV-Konsumenten extern brechen:** wenn andere Tools die Export-CSV parsen und auf source_detail-Spalte erwarten. Mitigation: Slice-Bericht dokumentiert Spalten-Aenderung; User informiert externe Empfaenger ggf. vorab
- **npm audit -- Build kann nach non-force fix brechen:** Mitigation: nach jedem npm-Aenderung Build+Test+Live-Smoke-Cycle
- **Audit-Log-DB-Footprint:** mehrere migration_v65-Eintraege bei Re-Run. Mitigation: idempotenter Filter erzeugt 0 Updates beim Re-Run, kein Spam

## Verification Strategy

- Pre-Implementation: SSH-Zugang Hetzner verifiziert; Coolify-DB-Container-Name ermittelt
- Pre-Migration: SELECT-Audit zeigt Volumen + distinct-Werte
- Per-MT: SQL-Skript dry-run (BEGIN; ROLLBACK;) + npm audit Re-Check
- Slice-Level: Live-Smoke + Audit-Log-DB-Verifikation

---

## Micro-Tasks

### MT-1: Pre-Migration-Audit-Skript
- Goal: SELECT-Statistik vor Migration generieren.
- Files: `sql/migrations/031_v65_pre_audit.sql` (NEU)
- Expected behavior: SQL mit `SELECT entity, source_value, source_detail_value, COUNT(*) FROM (UNION contacts/companies)` gruppiert. Output zeigt pro distinct source_value die Anzahl der betroffenen Rows.
- Verification: SSH-Apply auf Hetzner-DB, Output gibt User klare Mapping-Vorlage.
- Dependencies: none

### MT-2: User-Pause: Mapping-JSON-File pflegen
- Goal: User-Sign-Off-Pause fuer Mapping-Definition.
- Files: `sql/migrations/031_v65_source_to_campaign_mapping.json` (NEU, User-pflegt)
- Expected behavior: JSON-Struktur `[{entity: 'contact', source_value: 'LinkedIn April', source_detail_value: null, campaign_id: '<uuid>'}, ...]`. User schreibt fuer jeden distinct source_value aus MT-1 entweder eine campaign_id oder markiert als "ungemappt" (campaign_id=null → wird in Bulk-UPDATE skipped).
- Verification: User signiert Mapping ab; JSON valid (Python-`json.load`-Check).
- Dependencies: MT-1

### MT-3: Bulk-UPDATE-SQL anwenden
- Goal: Idempotente Source→Campaign-Migration.
- Files: `sql/migrations/031_v65_bulk_update.sql` (NEU)
- Expected behavior: `UPDATE contacts SET campaign_id = m.campaign_id::uuid FROM jsonb_to_recordset($1::jsonb) AS m(...) WHERE contacts.campaign_id IS NULL AND contacts.source = m.source_value`-Pattern (analog fuer companies). Audit-Log-Insert mit Stats.
- Verification: SSH-Apply: Erste Run → N Rows updated, Audit-Log-Eintrag. Re-Run → 0 Rows updated (Idempotenz).
- Dependencies: MT-2

### MT-4: Form-Read-only-Display fuer Legacy-Felder
- Goal: contact-form.tsx + company-form.tsx Legacy-Felder nur read-only when not-null.
- Files: `cockpit/src/app/(app)/contacts/contact-form.tsx`, `cockpit/src/app/(app)/companies/company-form.tsx`
- Expected behavior: Wenn `contacts.source` oder `contacts.source_detail` nicht-leer ist: Felder als `<dl><dt>Quelle</dt><dd>{source}</dd></dl>` rendern (read-only-Display) + Hinweis "Legacy-Quelle, neue Eingaben via Kampagne". CampaignPicker bleibt aktiv.
- Verification: Browser-Dev-Smoke: 1 contact mit source != null → Felder als read-only-Display; 1 contact ohne source → Felder gar nicht angezeigt.
- Dependencies: MT-3

### MT-5: CSV-Export-Spalten-Schema-Update
- Goal: campaign_name statt source_detail als CSV-Spalte.
- Files: `cockpit/src/app/api/campaigns/[id]/export/route.ts`
- Expected behavior: SELECT-Erweiterung um `campaigns.name AS campaign_name` (LEFT JOIN auf campaigns). CSV-Header-Row aktualisieren. Slice-Bericht dokumentiert Spalten-Aenderung fuer externe Konsumenten.
- Verification: curl mit Bearer-Auth gegen `/api/campaigns/[id]/export?type=leads` → CSV mit campaign_name-Spalte.
- Dependencies: none (parallel zu MT-1..MT-4 moeglich)

### MT-6: npm audit Re-Check + non-force Fixes
- Goal: Re-Audit + sichere Patches anwenden.
- Files: `cockpit/package.json`, `cockpit/package-lock.json`
- Expected behavior: `npm audit` zeigt aktuellen Stand. Falls hono/ip-address autofix moeglich: `npm audit fix` (non-force) anwenden. postcss bleibt offen pro DEC-161 / ISSUE-058. Build+Test danach clean.
- Verification: `npm audit` zeigt 0 high, 0 critical; moderate-Liste dokumentiert in Slice-Bericht.
- Dependencies: none

### MT-7: ISSUE-058-Verifikation in KNOWN_ISSUES
- Goal: Bestaetigung dass ISSUE-058 korrekt dokumentiert ist (sollte bereits durch /architecture geschehen sein).
- Files: `docs/KNOWN_ISSUES.md`
- Expected behavior: ISSUE-058 mit Status=open, Severity=Low, Workaround, Next-Action sichtbar.
- Verification: grep `ISSUE-058` zeigt Eintrag.
- Dependencies: none

### MT-8: Live-Smoke + Audit-Log-DB-Verifikation
- Goal: Production-Verifikation.
- Files: keine
- Expected behavior: Coolify-Redeploy. Browser: 1 contact mit Legacy-source → Read-only-Display sichtbar. CSV-Export einer Kampagne: campaign_name-Spalte vorhanden. DB-Query auf audit_log: source_migration_v65-Eintrag mit Stats.
- Verification: Browser + curl + DB-Query alle PASS.
- Dependencies: MT-3, MT-4, MT-5

### MT-9: Slice-Closing Build + Test + Lint + Records-Sync
- Goal: Quality-Gate + Records.
- Files: `slices/INDEX.md`, `planning/backlog.json` (BL-424 + BL-430 done)
- Expected behavior: Build + Vitest + Lint clean. SLC-657 done in INDEX. BL-424 + BL-430 done in backlog.
- Dependencies: MT-8

---

## Definition of Done

- 9 MTs verifiziert (AC-1..AC-9 erfuellt)
- MIG-031 applied auf Hetzner-DB (idempotent, Backup-Felder erhalten)
- npm audit 0 high/critical, moderate dokumentiert
- ISSUE-058 in KNOWN_ISSUES sichtbar
- Build + Lint + Vitest clean
- Live-Smoke gruen
- Atomic Commits gepusht (mind. 2: source-migration + npm-audit)
- /qa als naechster Schritt
