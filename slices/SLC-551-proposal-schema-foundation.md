# SLC-551 — Angebot-Schema-Foundation (MIG-026 + Bucket + RLS + createProposal)

## Meta
- Feature: FEAT-551
- Priority: Blocker
- Status: planned
- Created: 2026-04-29

## Goal

V2-Stub-`proposals` wird operativ. MIG-026 erweitert `proposals` um 11 nullable Spalten (Berechnung, Versionierung, Lifecycle-Timestamps, PDF-Pfad), legt die neue Tabelle `proposal_items` mit Snapshot-Feldern (DEC-107) an, erweitert `email_attachments` um `source_type` + `proposal_id` (DEC-108-Hookup-Vorbereitung), und erstellt den privaten Storage-Bucket `proposal-pdfs` mit User-Scope-RLS (DEC-111). Zusaetzlich liefert dieser Slice die zwei Server Actions, die SLC-552 sofort braucht: `createProposal({deal_id, contact_id, company_id})` als Einstiegspunkt-Trigger und `getProposalForEdit(id)` als Workspace-Loader. Bestehende V2-Stub-Daten in `proposals` bleiben unveraendert lesbar — der bestehende `/proposals`-Listing-View darf nicht brechen.

## Scope

- **MIG-026 anwenden auf Hetzner (`91.98.20.191`):**
  - `sql/migrations/026_v55_proposal_creation.sql` neu schreiben mit allen 4 Aenderungen aus `docs/MIGRATIONS.md` MIG-026.
  - 11 nullable Spalten auf `proposals` (`subtotal_net`, `tax_rate DEFAULT 19.00`, `tax_amount`, `total_gross`, `valid_until`, `payment_terms`, `parent_proposal_id` → `ON DELETE SET NULL` auf `proposals(id)`, `accepted_at`, `rejected_at`, `expired_at`, `pdf_storage_path`).
  - 3 Indizes: `idx_proposals_parent` (B-Tree auf `parent_proposal_id`), `idx_proposals_valid_until`, `idx_proposals_status_active` (partial WHERE `status IN ('draft','sent')`).
  - Neue Tabelle `proposal_items` mit allen 11 Spalten, FK `proposal_id ON DELETE CASCADE`, FK `product_id ON DELETE SET NULL`, RLS `authenticated_full_access` analog `deal_products`, 2 Indizes (`idx_proposal_items_proposal`, `idx_proposal_items_product` partial WHERE `product_id IS NOT NULL`).
  - `email_attachments`-Erweiterung: 2 Spalten + 1 Partial-Index + CHECK-Constraint `(source_type='upload' AND proposal_id IS NULL) OR (source_type='proposal' AND proposal_id IS NOT NULL)`.
  - Storage-Bucket `proposal-pdfs` (private) + 4 RLS-Policies (SELECT/INSERT/UPDATE/DELETE) auf `storage.objects` mit Pfad-Scope `(auth.uid())::text = (storage.foldername(name))[1]`.
  - Migration ist idempotent (`IF NOT EXISTS`-Pattern, `ON CONFLICT DO NOTHING` fuer Bucket-Insert).
  - Anwenden via SSH analog `coolify-test-setup.md` Rule + base64-Pattern aus `sql-migration-hetzner.md`.
- **Pfad-Helper als Single-Source-of-Truth (DEC-111):**
  - Datei `cockpit/src/lib/pdf/proposal-pdf-path.ts` exportiert `getProposalPdfPath(userId, proposalId, version, isTestMode)` → string. Test-Mode-Suffix `.testmode.pdf` per ENV-Flag (DEC-113).
  - Auch `parseProposalPdfPath(path)` als Inverse fuer Audit-Queries.
- **Server Actions (`cockpit/src/app/(app)/proposals/actions.ts` Erweiterung — bestehende V2-Stubs unangetastet):**
  - `createProposal({ deal_id, contact_id?, company_id?, title? })` → `{ proposalId: string }`. Liest `branding_settings` fuer Defaults (`payment_terms`, `valid_until = today+30d`), INSERT `proposals` mit `status='draft'`, `version=1`, `tax_rate=19.00`, `parent_proposal_id=null`. Audit-Eintrag `action='create'`, `entity_type='proposal'`, `context='Created from deal/pipeline'`. KEINE `proposal_items`-Items angelegt (User fuegt manuell hinzu).
  - `getProposalForEdit(proposalId)` → `{ proposal, items, branding, deal, company, contact }` (Promise.all). RLS-implicit via authenticated-Client. Returns `null` wenn nicht gefunden.
- **Type-Generierung:**
  - Supabase-Types-Re-Generation (`npm run db:types` oder Vercel-cli, Pattern aus V5.4) inkl. `proposals` neue Spalten, `proposal_items` Tabelle, `email_attachments` Erweiterung.
  - TypeScript-Build muss gruen bleiben — bestehender `proposal-form.tsx`/`proposals-client.tsx` darf keine Type-Errors zeigen.
- **Backwards-Compat-Verifikation:**
  - Bestehende `/proposals`-Tabelle (Listing-View aus V2) rendert weiterhin korrekt — alle neuen Spalten sind nullable.
  - V2-Stub-Rows haben `subtotal_net=NULL`, `total_gross=NULL` — Listing zeigt das als "—" (kein Crash).
  - Bestehender `proposal-form.tsx` (V2-Modal mit `title`/`scope_notes`/`price_range`) darf weiterhin verwendet werden bis SLC-552 die neue Edit-Route ausrollt.
- Update `docs/STATE.md`, `slices/INDEX.md`, `planning/backlog.json` (BL-405 bleibt `in_progress`, neuer BL-407 fuer SLC-551 anlegen), `docs/MIGRATIONS.md` (MIG-026 mit Apply-Date setzen).

## Out of Scope

- UI-Workspace `/proposals/[id]/edit` — Inhalt von SLC-552
- PDF-Renderer (pdfmake) — Inhalt von SLC-553
- Status-Lifecycle Server Actions (`transitionProposalStatus`, `createProposalVersion`, `expireOverdueProposals`) — Inhalt von SLC-554
- Composing-Studio Proposal-Picker — Inhalt von SLC-555
- Migrations-Rollback-Skript — wenn benoetigt: per `docs/MIGRATIONS.md` Rollback-Notes manuell, kein eigenes Skript
- Auto-Cleanup-Cron fuer verwaiste Draft-PDFs — V5.6+ Folge-Slice (im Architecture als Risk dokumentiert)
- Multi-Currency, Multi-Tax-Rate per Position, Discount-Stacking
- Inline-Produkt-Erstellung aus Angebot (Picker filtert nur existierende `products.status='active'`)

## Acceptance Criteria

- AC1: MIG-026 ist auf Hetzner angewendet — `proposals` hat 11 neue nullable Spalten, alle Indizes existieren, `proposal_items` existiert mit RLS aktiv, `email_attachments` hat `source_type` + `proposal_id` + CHECK-Constraint, Storage-Bucket `proposal-pdfs` existiert privat mit 4 RLS-Policies.
- AC2: Migration ist idempotent — zweimaliger Apply derselben SQL-Datei wirft keine Fehler.
- AC3: V2-Stub-`proposals`-Rows sind unveraendert lesbar (`SELECT * FROM proposals` liefert alle Daten + neue Spalten als NULL bzw. Default 19.00 fuer `tax_rate`).
- AC4: `cockpit/src/lib/pdf/proposal-pdf-path.ts` exportiert `getProposalPdfPath(userId, proposalId, version, isTestMode=false)` und liefert deterministischen String `${userId}/${proposalId}/v${version}.pdf` bzw. mit `.testmode.pdf` Suffix.
- AC5: Server Action `createProposal({deal_id, contact_id, company_id, title?})` legt einen Draft mit `status='draft'`, `version=1`, `tax_rate=19.00`, `valid_until=today+30d` (aus Branding falls vorhanden, sonst Default) an, schreibt Audit-Eintrag, returnt `{ proposalId }`.
- AC6: Server Action `getProposalForEdit(id)` liefert `{ proposal, items, branding, deal, company, contact }` per Promise.all. Items sind nach `position_order` sortiert. Wenn `id` nicht existiert: Action returnt `null` (kein Throw).
- AC7: `email_attachments` CHECK-Constraint greift: INSERT mit `source_type='upload'` und `proposal_id NOT NULL` schlaegt fehl. INSERT mit `source_type='proposal'` und `proposal_id NULL` schlaegt fehl. Beide korrekten Kombinationen sind erlaubt.
- AC8: Storage-Bucket-RLS-Policy: User A kann auf `userA/...` Pfad lesen/schreiben/loeschen, aber NICHT auf `userB/...` (Cross-User-Block). Test via 2 Auth-Sessions ODER manueller Storage-Listing als anderer User.
- AC9: Bestehende V2-`/proposals`-Tabellen-View rendert ohne TypeScript-/Runtime-Errors trotz neuer Spalten.
- AC10: TypeScript-Build (`npm run build`) ist gruen. Supabase-Types umfassen alle Schema-Aenderungen.
- AC11: `npm run test` (wenn vorhanden) ist gruen — keine Regression.

## Dependencies

- V2 `proposals`-Stub (existing, in `sql/04_v2_migration.sql` Z.85+)
- V3 `audit_log` (FEAT-307, existing)
- V5.3 `branding_settings` (existing — fuer Default `payment_terms` + `valid_until`-Defaults)
- V5.4 `email_attachments`-Junction-Table (existing aus MIG-025) — wird in dieser Slice erweitert um `source_type` + `proposal_id`
- V6 `products`-Tabelle (FEAT-601, existing)
- DEC-105..114 (alle V5.5-Architecture-DECs)
- Self-hosted Supabase Storage (existing Infra)
- SSH-Zugriff Hetzner-Server (Pattern aus `sql-migration-hetzner.md`)

## Risks

- **Risk:** MIG-026 Apply auf Hetzner schlaegt fehl wegen vorhandener Daten in `proposals` (z.B. NOT-NULL-Drift).
  Mitigation: Pre-Apply-Check auf Server: `SELECT count(*) FROM proposals; SELECT count(*) FROM proposals WHERE status NOT IN ('draft','sent','accepted','rejected','expired')`. Alle 11 neuen Spalten sind nullable, `tax_rate` mit DEFAULT 19.00 — kein UPDATE auf existing Rows noetig.
- **Risk:** Storage-Bucket-RLS-Policy ist falsch konfiguriert (User sieht alle PDFs).
  Mitigation: AC8 verlangt expliziten Cross-User-Block-Test. Pattern aus `cockpit/src/lib/storage/branding-storage-policy` (V5.3) ist 1:1 anwendbar.
- **Risk:** `email_attachments`-CHECK-Constraint bricht V5.4-Bestandsdaten.
  Mitigation: Bestand ist `source_type='upload'` + `proposal_id=NULL` — beide Defaults der neuen Spalten. CHECK greift erst bei zukuenftigen INSERTs. Pre-Apply: `SELECT count(*) FROM email_attachments WHERE source_type='proposal' OR proposal_id IS NOT NULL` muss 0 sein.
- **Risk:** Supabase-Type-Generation laeuft nicht durch wegen RLS-Policy-Conflict.
  Mitigation: Type-Gen-Pattern aus V5.4 (`scripts/regen-types.sh` oder vergleichbar). Falls Drift: manuelle Type-Definition in `cockpit/src/types/database.types.ts` bis Type-Gen wieder lauffaehig (Audit-Note in Slice-Report).
- **Risk:** `createProposal` schreibt Audit-Eintrag fehlerhaft (FK auf `actor_id`).
  Mitigation: Pattern aus V5.4 `uploadEmailAttachment` (Audit-Insert per Service-Role-Client) wiederverwenden. `actor_id = auth.uid()` aus Server-Side-Auth.
- **Risk:** `getProposalForEdit` Promise.all schlaegt fehl wenn Deal/Company/Contact NULL ist (Stub-Proposals ohne Deal-Link).
  Mitigation: Branching im Action: NULL-FK → `deal=null` zurueckgeben, kein Throw. Workspace-UI in SLC-552 zeigt dann "Kein Deal verlinkt"-Hinweis.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/026_v55_proposal_creation.sql` | NEU: MIG-026 SQL (4 Aenderungen + Bucket + Policies) |
| `cockpit/src/lib/pdf/proposal-pdf-path.ts` | NEU: Pfad-Helper Single-Source-of-Truth |
| `cockpit/src/lib/pdf/proposal-pdf-path.test.ts` | NEU: Unit-Tests fuer Pfad-Helper |
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: `createProposal`, `getProposalForEdit` ergaenzen, V2-Bestand unangetastet |
| `cockpit/src/types/database.types.ts` | MODIFY (auto-gen): neue Schema-Types |
| `docs/STATE.md` | Slice-Status-Update + Phase auf `implementing` |
| `docs/MIGRATIONS.md` | MIG-026 Apply-Date setzen |
| `slices/INDEX.md` | SLC-551 anlegen + V5.5-Section |
| `planning/backlog.json` | BL-407 (SLC-551 Tracking) anlegen, BL-405 bleibt `in_progress` |
| `features/INDEX.md` | FEAT-551 → `in_progress` |

## QA Focus

- **MIG-026 Apply-Verifikation auf Hetzner:**
  - `\d proposals` zeigt 11 neue Spalten + 3 Indizes
  - `\d proposal_items` zeigt 11 Spalten + RLS aktiv + 2 Indizes
  - `\d email_attachments` zeigt `source_type` + `proposal_id` + CHECK-Constraint
  - `SELECT * FROM storage.buckets WHERE id='proposal-pdfs'` liefert privat
  - `SELECT polname FROM pg_policies WHERE tablename='objects'` zeigt 4 neue Proposal-Pfad-Policies
- **Idempotenz-Smoke:**
  - SQL-Datei zweimal hintereinander apply — kein Error
- **V2-Bestand-Smoke:**
  - `SELECT id, title, status, version, tax_rate, subtotal_net FROM proposals LIMIT 5` — alte Rows haben `tax_rate=19.00` (Default), `subtotal_net=NULL`
  - `/proposals`-Listing-View im Browser laden — kein Crash, alte Rows sichtbar mit "—" fuer NULL-Felder
- **Pfad-Helper Unit-Tests:**
  - `getProposalPdfPath('uA', 'pX', 1, false)` → `'uA/pX/v1.pdf'`
  - `getProposalPdfPath('uA', 'pX', 2, true)` → `'uA/pX/v2.testmode.pdf'`
  - `parseProposalPdfPath('uA/pX/v1.pdf')` → `{ userId: 'uA', proposalId: 'pX', version: 1, isTestMode: false }`
- **Server-Action-Smoke `createProposal`:**
  - Mit Deal-Kontext aufrufen → `proposalId` zurueck, `proposals`-Row existiert mit `status='draft'`, `version=1`, `tax_rate=19.00`, `valid_until` ~ today+30d, Audit-Eintrag in `audit_log`
- **Server-Action-Smoke `getProposalForEdit`:**
  - Mit existierender `proposalId` → Object mit allen 6 Sub-Properties
  - Mit nicht-existierender `proposalId` → `null`
  - Mit `proposalId` ohne `deal_id` → `deal=null` (kein Throw)
- **CHECK-Constraint-Smoke:**
  - INSERT `email_attachments(source_type='upload', proposal_id=<uuid>)` → Error
  - INSERT `email_attachments(source_type='proposal', proposal_id=NULL)` → Error
  - Beide Default-Pfade laufen
- **Storage-RLS-Cross-User-Smoke:**
  - User A laedt `userA/test/v1.pdf` hoch → ok
  - User B versucht `userA/test/v1.pdf` zu lesen → Error
- **TypeScript-Build:** `npm run build` gruen
- **`npm run test`:** wenn Test-Suite vorhanden, gruen

## Micro-Tasks

### MT-1: MIG-026 SQL schreiben + Pre-Apply-Check
- Goal: Idempotente Migration mit allen 4 Aenderungen
- Files: `sql/migrations/026_v55_proposal_creation.sql`
- Expected behavior:
  - 4 Aenderungen aus `docs/MIGRATIONS.md` MIG-026 als `IF NOT EXISTS`-Pattern
  - Storage-Bucket-Insert mit `ON CONFLICT DO NOTHING`
  - Storage-Policies mit `DROP POLICY IF EXISTS` + `CREATE POLICY` (idempotent)
  - Header-Kommentar mit MIG-026-ID + Datum + Commit-Reference + Apply-Hinweis
- Verification: SQL-Lint (psql parse-test lokal: `psql -f - --command 'SELECT 1' < sql/migrations/026_v55_proposal_creation.sql` Dry-Run mit `BEGIN; ... ROLLBACK;`)
- Dependencies: none

### MT-2: MIG-026 anwenden auf Hetzner via SSH (sql-migration-hetzner.md Pattern)
- Goal: Schema live im Coolify-Postgres
- Files: keine (SSH-Run)
- Expected behavior:
  - Pre-Apply-Check: `SELECT count(*) FROM proposals; SELECT count(*) FROM email_attachments WHERE source_type='proposal' OR proposal_id IS NOT NULL;` (zweiter Wert muss 0 sein)
  - Base64-Transfer der SQL-Datei nach `/tmp/026_v55_proposal_creation.sql`
  - Apply als `postgres`-User: `docker exec -i <supabase-db-container> psql -U postgres -d postgres < /tmp/026_v55_proposal_creation.sql`
  - Idempotenz-Smoke: zweiter Apply-Run muss ohne Fehler durchlaufen
  - Post-Apply-Verifikation: `\d proposals`, `\d proposal_items`, `\d email_attachments`, `SELECT * FROM storage.buckets WHERE id='proposal-pdfs'`, `SELECT polname FROM pg_policies WHERE schemaname='storage'`
  - Apply-Datum + Commit-Hash in `docs/MIGRATIONS.md` MIG-026 Date-Feld setzen
- Verification: Schema gemaess MIG-026-Spec live auf Hetzner
- Dependencies: MT-1

### MT-3: Pfad-Helper `proposal-pdf-path.ts` + Unit-Tests
- Goal: Single-Source-of-Truth fuer DEC-111 Pfad-Schema
- Files: `cockpit/src/lib/pdf/proposal-pdf-path.ts`, `cockpit/src/lib/pdf/proposal-pdf-path.test.ts`
- Expected behavior:
  - Export `getProposalPdfPath(userId: string, proposalId: string, version: number, isTestMode: boolean = false): string`
  - Returns `${userId}/${proposalId}/v${version}.pdf` (default) oder `${userId}/${proposalId}/v${version}.testmode.pdf` (testMode=true)
  - Export `parseProposalPdfPath(path: string): { userId, proposalId, version, isTestMode } | null` (null fuer Format-Drift)
  - Unit-Tests fuer beide Funktionen + Edge-Cases (leer/invalid)
  - Konstante `PROPOSAL_PDF_BUCKET = 'proposal-pdfs'` als named-Export
- Verification: `npm run test -- proposal-pdf-path` gruen
- Dependencies: none (parallel zu MT-1+MT-2)

### MT-4: Server Action `createProposal` (in `actions.ts`)
- Goal: Einstiegspunkt-Trigger fuer Quickaction "Angebot erstellen"
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY — bestehende V2-Stubs unangetastet)
- Expected behavior:
  - Signature: `createProposal({ deal_id, contact_id?, company_id?, title? }: { deal_id: string; contact_id?: string | null; company_id?: string | null; title?: string }): Promise<{ ok: true; proposalId: string } | { ok: false; error: string }>`
  - Auth-Check (`auth.uid()` muss vorhanden sein)
  - Liest `branding_settings.payment_terms_default` (falls Spalte existiert, sonst Fallback "30 Tage netto") fuer Default
  - INSERT in `proposals`: `status='draft'`, `version=1`, `tax_rate=19.00`, `valid_until = today + 30d`, `payment_terms = branding-default`, `parent_proposal_id = null`, `title = title ?? 'Angebot ' + currentDate`
  - Audit-Eintrag in `audit_log`: `action='create'`, `entity_type='proposal'`, `entity_id=newId`, `actor_id=userId`, `context='Created from deal/pipeline'`
  - `revalidatePath('/proposals')` + `revalidatePath('/deals/' + deal_id)`
  - Returns `{ ok: true, proposalId: newId }`
- Verification: Server-Action-Smoke via DevTools/Postman: Aufruf mit Deal-ID liefert `proposalId`, DB-Row + Audit-Eintrag sichtbar
- Dependencies: MT-2

### MT-5: Server Action `getProposalForEdit` (in `actions.ts`)
- Goal: Workspace-Loader fuer SLC-552
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - Signature: `getProposalForEdit(proposalId: string): Promise<ProposalEditPayload | null>` mit `ProposalEditPayload = { proposal, items, branding, deal, company, contact }`
  - Promise.all: SELECT `proposals` + SELECT `proposal_items ORDER BY position_order` + SELECT `branding_settings` (single-row) + SELECT `deals` (via `proposal.deal_id`, NULL-tolerant) + SELECT `companies` (via `proposal.company_id`, NULL-tolerant) + SELECT `contacts` (via `proposal.contact_id`, NULL-tolerant)
  - Wenn `proposalId` nicht existiert: `null` returnen
  - Type-Export `ProposalEditPayload` fuer SLC-552-Konsumenten
- Verification: Server-Action-Smoke: existing ID → Object, fake ID → null
- Dependencies: MT-2, MT-4

### MT-6: Supabase-Type-Generation + Build-Smoke
- Goal: Types reflektieren neue Schema-Aenderungen
- Files: `cockpit/src/types/database.types.ts` (auto-gen)
- Expected behavior:
  - `npm run db:types` (oder Pendant aus V5.4) regeneriert Types
  - Neue Spalten in `proposals`, neue Tabelle `proposal_items`, neue Spalten in `email_attachments` sichtbar
  - `npm run build` gruen — bestehende `proposal-form.tsx` darf nicht brechen (alte Felder bleiben, neue sind nullable)
- Verification: `npm run build` gruen, keine Type-Errors
- Dependencies: MT-2

### MT-7: V2-Bestand-Smoke + `/proposals`-Listing-View Regression-Test
- Goal: Backwards-Compat-Verifikation
- Files: keine (Browser-Smoke)
- Expected behavior:
  - `SELECT id, title, status, version, tax_rate, subtotal_net, total_gross FROM proposals LIMIT 5` — alle V2-Stubs haben `tax_rate=19.00` (Default), `subtotal_net=NULL`, `total_gross=NULL`
  - Browser: `/proposals` laden — Listing rendert ohne Crash, V2-Stub-Rows sichtbar mit "—" fuer NULL-Werte
  - Bestehender V2-Modal "Neues Angebot" (alte `proposal-form.tsx`) funktioniert weiterhin (kein Touch in dieser Slice)
- Verification: Browser-Screenshot ODER manuelle Bestaetigung im QA-Report
- Dependencies: MT-2, MT-6

## Schaetzung

~3-4h:
- MT-1 (MIG-026 SQL): ~45min
- MT-2 (Hetzner Apply + Verifikation): ~45min
- MT-3 (Pfad-Helper + Tests): ~30min
- MT-4 (createProposal Action): ~30min
- MT-5 (getProposalForEdit Action): ~30min
- MT-6 (Type-Gen + Build): ~15min
- MT-7 (V2-Bestand-Smoke): ~15min
- Buffer + Bug-Fix: ~30-45min
