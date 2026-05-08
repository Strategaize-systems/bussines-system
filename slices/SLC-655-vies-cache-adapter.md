# SLC-655 — VIES-Cache + Adapter (BL-420)

## Metadata
- **Slice ID:** SLC-655
- **Version:** V6.5
- **Feature:** FEAT-652
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-08
- **Estimated Effort:** ~2-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** **mandatory** (externer Service-Call mit Rate-Limit, Schema-Migration)
- **Architecture:** DEC-157 (DB-Cache vat_id_validations) + DEC-158 (graceful-degradation transparent) + MIG-030

## Goal

VIES-Online-Lookup-Adapter mit DB-Cache + UI-Status-Badge in Branding/Company-Forms. Pre-Production-Vorbereitung fuer echte VAT-ID-Validierung.

## Scope

**In Scope:**
- MIG-030 Apply auf Hetzner-DB: `vat_id_validations` Cache-Tabelle
- `cockpit/src/lib/vat/vies-client.ts` neu: Pure-Function `lookupVatId(country, number)` mit DB-Cache + graceful-degradation
- `cockpit/src/lib/vat/vat-id.ts` erweitern um optionale VIES-Tier (opt-in via `validateWithVies` Pure-Function)
- UI-Status-Badge-Component fuer Branding-Form + Company-Form (3 States: Format-Invalid / Format-OK / VIES-OK / VIES-Unavailable)
- Vitest fuer Adapter mit Mock-VIES + Mock-Supabase
- Live-Smoke: 1 echter VIES-Lookup + Cache-Hit-Verifikation

**Out of Scope:**
- VIES-Bulk-Validation fuer Bestandsdaten (separater Hygiene-Slice falls Bedarf)
- VIES-Async-Validation im Form-Submit (sync Format + on-demand VIES bei Save)
- Multi-Country-Erweiterung
- Caching-TTL konfigurierbar via UI

## Acceptance Criteria

- AC-1: MIG-030 auf Hetzner-DB applied: `vat_id_validations` Tabelle existiert mit erwarteten Spalten + Indizes + RLS
- AC-2: `lib/vat/vies-client.ts` exportiert `lookupVatId(country: string, number: string): Promise<{is_valid: boolean, source: 'vies'|'vies_unavailable'|'format_only', validated_at: Date}>`
- AC-3: Cache-Hit-Pfad: zweiter Aufruf innerhalb 24h queryt DB statt VIES (audit_log zeigt 1 Eintrag, nicht 2)
- AC-4: Cache-Miss-Pfad: erster Aufruf macht VIES-HTTP-Call + Insert in vat_id_validations + audit_log-Insert
- AC-5: VIES-Down-Pfad: HTTP-Failure faellt graceful zurueck auf source='vies_unavailable', is_valid=null
- AC-6: Branding-Form + Company-Form zeigen Live-Validierungs-Status-Badge mit 3 States; Save bei VIES-Unavailable funktional
- AC-7: Vitest mit Mock-VIES-Client + Mock-Supabase: 4 Test-Cases (Format-Invalid, Cache-Hit, Cache-Miss-Success, Cache-Miss-VIES-Down)
- AC-8: `npm run build` clean, Vitest 405/405+ PASS, kein neuer Lint-Error
- AC-9: Live-Smoke nach Coolify-Redeploy: 1 echter VIES-Lookup gegen Production (z.B. NL-Strategaize-VAT-ID), Audit-Log-Eintrag verifiziert; 2. Lookup ist Cache-Hit
- AC-10: ENV `VIES_ENABLED` (Default: true) via Coolify konfigurierbar — falls auf false, faellt System auf Format-only zurueck

## Reuse

- V5.7 `cockpit/src/lib/vat/vat-id.ts` als Format-Validation-Layer-Basis
- V5.5 `cockpit/src/app/api/cron/expire-proposals/route.ts` Pattern fuer audit_log-Insert-Style
- V5.2 audit_log-Coverage-Pattern (DSGVO-Trail)
- Hetzner-DB SSH-Migration-Pattern (sql-migration-hetzner-rule)

## Risks

- **VIES-Service-Downtime:** Plan-Wartung mehrmals jaehrlich. Mitigation: graceful-degradation transparent (DEC-158)
- **VIES-Rate-Limit:** unklar, kostenloses Service ohne API-Key. Mitigation: 24h-Cache-TTL reduziert Rate-Limit-Pressure massiv
- **Schema-Migration-Risiko:** MIG-030 ist additiv, low-risk. Mitigation: Pre-Apply-Audit (`\d vat_id_validations` zeigt no-existence), Idempotenz `CREATE TABLE IF NOT EXISTS`
- **Real-VIES-Call-Test-Pollution:** Tests duerfen keine echten VIES-Calls machen. Mitigation: VIES-Adapter ueber Module-Mock + Test-VAT-ID-Pattern (z.B. `XX99999999` als format-invalid)

## Verification Strategy

- Pre-Implementation: VIES-API-Spec lesen (https://ec.europa.eu/taxation_customs/vies/services/checkVatService) + Coolify-DB Container-Name pruefen
- Per-MT: Pure-Function-Test mit Mocks
- Slice-Level: MIG-030 applied + Build + Vitest + 1 echter VIES-Lookup gegen Production

---

## Micro-Tasks

### MT-1: MIG-030 Apply auf Hetzner-DB
- Goal: `vat_id_validations` Cache-Tabelle erstellen.
- Files: `sql/migrations/030_v65_vies_cache.sql` (NEU)
- Expected behavior: SQL-File enthaelt CREATE TABLE + Index + RLS + GRANTS exakt wie in MIGRATIONS.md spezifiziert. Apply via SSH+base64-Pattern (sql-migration-hetzner-rule).
- Verification: `docker exec <DB> psql -U postgres -d postgres -c "\d vat_id_validations"` zeigt 5 Spalten + 1 UNIQUE-Index + 1 Lookup-Index + RLS aktiv.
- Dependencies: none

### MT-2: VIES-Adapter implementieren
- Goal: Pure-Function `lookupVatId` mit DB-Cache + VIES-HTTP-Call + graceful-degradation.
- Files: `cockpit/src/lib/vat/vies-client.ts` (NEU)
- Expected behavior: 4-Pfad-Logik: (1) DB-Cache-Lookup mit expires_at-Filter, (2) Cache-Hit-Return, (3) Cache-Miss → VIES-HTTP-Call → Insert+Return, (4) VIES-Down → Insert mit source='vies_unavailable' + Return mit is_valid=null. Audit-Log-Insert pro Cache-Miss.
- Verification: TS-Compile clean.
- Dependencies: MT-1

### MT-3: Vitest fuer VIES-Adapter
- Goal: 4 Test-Cases mit Mock-VIES + Mock-Supabase.
- Files: `cockpit/src/lib/vat/vies-client.test.ts` (NEU)
- Expected behavior: Test 1: Format-Invalid skipt VIES; Test 2: Cache-Hit returnt cached; Test 3: Cache-Miss + VIES-Success Insert; Test 4: VIES-Down returns vies_unavailable.
- Verification: `npm run test -- vies-client` 4 Tests gruen.
- Dependencies: MT-2

### MT-4: VAT-ID Validation-Layer-Erweiterung
- Goal: vat-id.ts um optionalen VIES-Tier ergaenzen.
- Files: `cockpit/src/lib/vat/vat-id.ts`
- Expected behavior: Bestehender `validateVatIdFormat` bleibt unveraendert. Neue Funktion `validateVatIdWithVies(country, number)` chained Format-Layer + VIES-Tier mit graceful-degradation. Beide Pure-Functions exportiert.
- Verification: Vitest beide Funktionen, V5.7-Existing-Tests bleiben gruen.
- Dependencies: MT-2

### MT-5: UI-Status-Badge-Component
- Goal: Wiederverwendbare Status-Badge-Component fuer Validation-Status.
- Files: `cockpit/src/components/forms/vat-id-status-badge.tsx` (NEU)
- Expected behavior: Props: `state: 'invalid' | 'format-ok' | 'vies-ok' | 'vies-unavailable'`. Render: Color-Coded Badge (rot/gelb/gruen/orange) mit Tooltip-Text.
- Verification: Visual-Inspection in Storybook-Mock oder Dev-Preview.
- Dependencies: SLC-651 Tokens (fuer success/warning/danger Tokens)

### MT-6: Branding-Form + Company-Form Integration
- Goal: Status-Badge + VIES-Lookup in beiden Forms.
- Files: `cockpit/src/app/(app)/settings/branding/branding-form.tsx`, `cockpit/src/app/(app)/companies/company-form.tsx`
- Expected behavior: VAT-ID-Input on-blur triggert Format-Check (sync) + optional VIES-Check (async, debounced 1s). Badge-State updated. Save funktional unabhaengig von VIES-State.
- Verification: Browser-Dev-Smoke: 1 valides VAT-ID eingeben → Badge wird VIES-OK; 1 invalides → Badge bleibt invalid.
- Dependencies: MT-2, MT-5

### MT-7: Live-Smoke gegen Production-VIES
- Goal: Echten VIES-Lookup gegen Production verifizieren.
- Files: keine
- Expected behavior: Coolify-Redeploy auf neuen Commit. Im Branding-Form 1 echte NL-VAT-ID (z.B. Strategaize Transition GmbH) eingeben → Badge wird VIES-OK. DB-Query auf vat_id_validations zeigt 1 Eintrag mit source='vies'. 2. Lookup ist Cache-Hit (audit_log zeigt 1 Eintrag, nicht 2).
- Verification: docker exec DB-Query + Browser-Inspection.
- Dependencies: MT-1..MT-6

### MT-8: Slice-Closing Build + Test + Lint + Records-Sync
- Goal: Quality-Gate + Records-Update.
- Files: `slices/INDEX.md`, `planning/backlog.json` (BL-420 done)
- Expected behavior: Build + Vitest + Lint clean. SLC-655 done in INDEX.
- Verification: alle Commands clean.
- Dependencies: MT-7

---

## Definition of Done

- 8 MTs verifiziert (AC-1..AC-10 erfuellt)
- MIG-030 live auf Hetzner-DB
- Build + Lint + Vitest clean (mit 4+ neuen VIES-Tests)
- Live-Smoke gegen Production-VIES gruen
- Atomic Commits gepusht
- /qa als naechster Schritt
