# SLC-893 — V8.10 documents-Storage user-scoped + Backfill (Cross-Tenant Defense)

- Feature: BL-499 (V8.10 Security Sprint 2 Slice 2)
- Status: planned
- Priority: High (PRE-LIVE PFLICHT)
- Created: 2026-06-02
- Estimated effort: ~3-4h Code + ~30 Min /qa
- Audit-Quelle: docs/SECURITY_AUDIT_2026-05-30.md SEC-008

## Goal

Schliesst Cross-Tenant-Exfiltration aus `documents`-Bucket. Aktuelle RLS in `sql/02_rls.sql:47-57` hat KEINEN first-path-segment-Filter — jeder authenticated User kann jedes Storage-Object lesen, ueberschreiben und loeschen. Bei 2. User sind alle Documents (PDFs, Anhaenge, Notizen-Attachments) sofort cross-tenant-lesbar.

Fix: 1:1-Pattern aus `proposal_pdfs_user_select` portieren (V5.5 SLC-553 + MIG-026): `(auth.uid())::text = (storage.foldername(name))[1]` als USING-Clause auf alle 4 Storage-Policies fuer `documents`-Bucket. Plus Code-Refactor in Doc-Upload-Aufrufern (Pfad-Normalize) + Backfill bestehender Files.

## Scope (In)

- Migration MIG-041 mit 4 Storage-Policy-Drops + 4 neue user-scoped Policies fuer `documents`-Bucket
- Code-Refactor in allen Doc-Upload-Aufrufern: Pfad-Normalize auf `<user-uuid>/<filename>` (statt `<filename>` oder `<random-uuid>/<filename>`)
- Backfill-Script: bestehende `documents`-Bucket-Objects pruefen, Owner aus DB-Verknuepfung ermitteln (welche Tabelle referenziert das Object), `storage.objects.name` rename auf `<user-uuid>/<original-path>`
- RLS-Test-Suite `__tests__/rls/documents-storage-rls.test.ts` mit 2 User-Setup: Read-Own / Read-Foreign-Blocked / Write-Own / Write-Foreign-Blocked / Delete-Own / Delete-Foreign-Blocked / List-Own / List-Foreign-Empty
- Live-Smoke gegen Production: 2 User Setup, Doc-Upload User-A, User-B versucht Read/Write/Delete → 403

## Scope (Out)

- Andere Buckets (z.B. proposal_pdfs, email_attachments) — separat oder bereits user-scoped (Pre-Audit)
- Documents-UI-Komponente — kein UI-Change, nur Path-Normalize-Layer in Upload-Aktion
- Migration in andere Cross-Repo-Storage-Patterns — separat per Cross-Repo-Slice

## Acceptance Criteria

- **AC-893-1**: MIG-041 erstellt + auf Coolify-Postgres applied
- **AC-893-2**: Alle 4 Storage-Policies fuer `documents`-Bucket (SELECT, INSERT, UPDATE, DELETE) haben `(auth.uid())::text = (storage.foldername(name))[1]` als USING-Clause
- **AC-893-3**: `cockpit/src/lib/actions/document-actions.ts` (oder gleichwertiger Upload-Aufrufer) normalisiert Pfad auf `<user-uuid>/<filename>` vor Storage-Upload (kein direkter `<filename>`-Pfad mehr erlaubt)
- **AC-893-4**: Backfill-Script `cockpit/scripts/backfill-documents-user-scope.mjs` lauffaehig und idempotent (bei Re-Run keine doppelte Move-Aktion)
- **AC-893-5**: Backfill-Script identifiziert Owner pro Object: (a) wenn `<filename>` als `<uuid>` parsebar und in `documents.id`-Tabelle referenziert: Owner aus `documents.owner_user_id`. (b) wenn ueber `email_attachments`/`deal_attachments`/etc. referenziert: Owner aus parent.owner_user_id. (c) wenn nicht eindeutig: Owner "unknown" — geloggt + im Backfill-Report dokumentiert, Object bleibt unter altem Pfad (orphan-Marker).
- **AC-893-6**: Vitest RLS-Test-Suite `__tests__/rls/documents-storage-rls.test.ts` mit 8 Cases gegen Coolify-DB (2 User: User-A + User-B): Read-Own-PASS, Read-Foreign-403, Write-Own-PASS, Write-Foreign-403, Delete-Own-PASS, Delete-Foreign-403, List-Own-zeigt-eigene, List-Foreign-leer
- **AC-893-7**: Live-Smoke gegen Production: 2 User Setup (Founder + qa-admin), Doc-Upload User-A, User-B versucht Read/Write/Delete → alle 403
- **AC-893-8**: Backfill-Report `reports/RPT-XXX-mig041-backfill.md` mit Statistik (N Objects gesamt, N moved, N orphan, N skipped)
- **AC-893-9**: Quality-Gates: TSC EXIT=0, ESLint EXACT V8.9-Baseline 142e/57w, Vitest jsdom Full-Suite ohne Regression, RLS-Suite 8/8 PASS (Coolify-DB)

## Micro-Tasks

### MT-1: Code-Audit aller documents-Bucket-Aufrufer
- Goal: Vollstaendige Liste aller `.from("documents")`-Aufrufe + Pfad-Schemas im Code
- Files (Read-only Audit):
  - `cockpit/src/lib/actions/document-actions.ts` (vermutlich Haupt-Pfad)
  - Grep `from\("documents"\)` ueber cockpit/src
- Expected behavior: Audit-Notes-Datei `slices/SLC-893-audit-notes.md` mit Liste aller Aufrufer + aktueller Pfad-Schema-Map
- Verification: Manuelles Review-Doc
- Dependencies: none

### MT-2: Migration MIG-041 — documents-Storage-Policies user-scoped
- Goal: Drop + Re-create 4 Storage-Policies mit first-path-segment-Filter
- Files:
  - `sql/migrations/041_v810_documents_storage_user_scoped.sql` (neu)
  - `__tests__/migrations/041-v810-documents-storage-user-scoped.test.ts` (neu)
- Expected behavior:
  - DROP POLICY ... ON storage.objects WHERE bucket_id='documents' (4x)
  - CREATE POLICY `documents_user_select` ON storage.objects FOR SELECT USING (bucket_id='documents' AND (auth.uid())::text = (storage.foldername(name))[1])
  - Analog `documents_user_insert` / `documents_user_update` / `documents_user_delete`
  - Pattern-Reuse 1:1 aus `proposal_pdfs_user_select` (V5.5 MIG-026)
- Verification: Vitest gegen Coolify-DB — 4 Policies existieren mit erwartetem USING-Pattern
- Dependencies: MT-1

### MT-3: Code-Refactor document-actions.ts Pfad-Normalize
- Goal: Doc-Upload-Aufrufer auf `<user-uuid>/<filename>` umstellen
- Files:
  - `cockpit/src/lib/actions/document-actions.ts` (modify Upload-Path-Berechnung)
  - `cockpit/src/lib/actions/__tests__/document-actions.test.ts` (Pfad-Tests ergaenzen)
- Expected behavior:
  - Vor Storage-Upload: `const path = \`${user.id}/${filename}\``
  - Bei vorhandenem Sub-Dir-Schema (z.B. `<deal-id>/<filename>`): praefix-erweiterung `<user-id>/<deal-id>/<filename>`
  - Path-Schema-Helper als Pure-Function exportiert + Vitest abgedeckt
- Verification: Vitest 5-6 Cases (verschiedene Pfad-Schemas)
- Dependencies: MT-1, MT-2

### MT-4: Backfill-Script bestehender Objects
- Goal: Production-Documents auf neuen Pfad-Schema migrieren
- Files:
  - `cockpit/scripts/backfill-documents-user-scope.mjs` (neu)
  - `cockpit/scripts/__tests__/backfill-documents-user-scope.test.mjs` (neu — Dry-Run-Tests)
- Expected behavior:
  - Liste alle storage.objects WHERE bucket_id='documents'
  - Pro Object: (a) versuche Owner aus parent-Tabelle zu ermitteln (documents.id, email_attachments.id, etc.), (b) wenn eindeutig: rename via supabase.storage.from('documents').move(old, new), (c) wenn nicht eindeutig: log + skip + orphan-Marker im DB-Report
  - Idempotent: Re-Run skipt bereits umgezogene Objects (Pfad startet bereits mit valider UUID)
  - Dry-Run-Mode default, `--apply` als explizites Flag
- Verification: Dry-Run gegen Coolify-DB zeigt erwartete Move-Aktionen, dann --apply auf Production
- Dependencies: MT-2, MT-3

### MT-5: RLS-Test-Suite documents-storage-rls
- Goal: Cross-Tenant-Defense per Vitest gegen Coolify-DB
- Files:
  - `__tests__/rls/documents-storage-rls.test.ts` (neu)
- Expected behavior: 8 Cases gegen Coolify-DB
  - Setup: 2 User (User-A + User-B), je Test-Doc hochladen
  - Test-1: User-A Read own doc → PASS
  - Test-2: User-A Read User-B's doc → 403/empty
  - Test-3: User-A Write own doc → PASS
  - Test-4: User-A Write User-B's doc → 403
  - Test-5: User-A Delete own doc → PASS
  - Test-6: User-A Delete User-B's doc → 403
  - Test-7: User-A List → zeigt nur eigene
  - Test-8: User-A List User-B's Folder → leer
- Verification: 8/8 PASS gegen Coolify-DB via node:22 + business-net
- Dependencies: MT-2

### MT-6: Live-Smoke + Backfill-Apply
- Goal: Production-Verifikation
- Files:
  - `qa/SLC-893-live-smoke.md` (neu)
  - `reports/RPT-XXX-mig041-backfill.md` (neu — Backfill-Statistik)
- Expected behavior:
  - Backfill-Script Dry-Run gegen Production
  - Backfill-Script --apply gegen Production
  - Browser-Smoke: 2 User (Founder + qa-admin) Cross-Doc-Read/Write/Delete → 403
- Verification: User-Browser oder Playwright-MCP
- Dependencies: MT-4, MT-5

### MT-7: Quality-Gates + Records-Sync
- Goal: Finalize
- Files:
  - `slices/INDEX.md` (Status update SLC-893 → done)
  - `features/INDEX.md` (BL-499-Feature → done)
  - `planning/backlog.json` (BL-499 → done)
  - `docs/KNOWN_ISSUES.md` (SEC-008 → resolved)
  - `docs/MIGRATIONS.md` (MIG-041 Eintrag)
  - `docs/STATE.md` (Phase update)
- Expected behavior: Alle Records reflect SLC-893-Done-Stand + MIG-041 dokumentiert
- Verification: Quality-Gate-Aggregat
- Dependencies: MT-6

## Risks

- **R-1 (High) Backfill-Owner-Ambiguitaet**: Wenn bestehende Documents nicht eindeutig auf einen Owner mapbar sind (z.B. Notizen-Attachments ohne owner_user_id), kann das Backfill orphan-Markers erzeugen — diese bleiben unter altem Pfad und sind nach Policy-Aktivierung nicht mehr erreichbar. Mitigation: MT-1 Code-Audit muss alle Upload-Pfade enumerieren, MT-4 Dry-Run zeigt Orphan-Stats VOR Apply. Falls Orphan-Count > 0: vor Apply User-Sync mit konkretem Plan.
- **R-2 (Medium) Production-DB-Race**: Wenn waehrend Backfill neue Uploads kommen, koennten sie unter altem Schema (ohne user-prefix) landen → nach Policy-Apply orphan. Mitigation: kurze Production-Pause (~5 Min) waehrend Apply, oder Backfill iteriert bis 0 unverarbeitete Objects gemessen.
- **R-3 (Low) Storage-API-Rate-Limit waehrend Backfill**: Supabase Storage hat keine harten Rate-Limits, aber bei N>1000 Objects sollte Backfill mit Concurrency-Cap (z.B. 5 parallel) laufen. Akzeptiert.
- **R-4 (Low) Pattern-Test bei Tab-Reload**: nicht relevant — RLS-Pattern ist DB-Layer, kein Session-Konzept

## Verification Plan

1. **Pre-Apply-Code-Audit**: MT-1 erst Code-Pfade verstehen vor Migration
2. **Dry-Run-First**: MT-4 Dry-Run vor Apply, Stats reviewen
3. **TDD**: MT-2 Migration-Tests vor Apply, MT-3 Code-Tests vor Refactor
4. **RLS-Tests-gegen-Coolify-DB**: MT-5 gegen `supabase-db-k9f5pn5upfq7etoefb5ukbcg-...` mit 2 User via business-net
5. **Live-Smoke**: MT-6 mit Founder + qa-admin
6. **Backfill-Report**: MT-6 RPT-XXX mit Statistik (N total, N moved, N orphan)

## Pattern-Reuse-Audit (Result)

- **Storage-RLS first-path-segment-Pattern** in BS bereits etabliert: `proposal_pdfs_user_select` (V5.5 SLC-553, MIG-026). **1:1 portierbar** als USING-Clause-Vorlage.
- **OP `walkthrough_storage_bucket` (MIG-084)**: vergleichbares user-scoped Pattern. Cross-Repo-Confirmation moeglich.
- **OP `recordings_bucket` (MIG-061) + `handbook_storage_bucket` (MIG-071) + `evidence_storage_bucket` (MIG-044)**: alle haben first-path-segment-Filter. Bestaetigt Pattern-Universal-Anwendbarkeit.
- **MIG-041 ist 1:1-Port** von BS `proposal_pdfs_user_select` mit `documents` als Bucket-Identifier.

## DEC-Candidates (Implementation-Time)

- DEC-262 Backfill-Orphan-Handling-Strategie (skip + log vs. delete vs. move-to-quarantine-bucket)
- DEC-263 Production-Pause-Window-Strategie waehrend Apply (kurze geplante Down-Time vs. iterativ-Bis-Zero-Pattern)
- DEC-264 Pfad-Sub-Schema (`<user-id>/<filename>` vs. `<user-id>/<deal-id>/<filename>` bei Sub-Hierarchien)

## Out-of-Scope (Future)

- 25 weitere Zweittabellen-RLS-Sweep (V8.11 SLC-901..904, BL-500)
- CSP-Headers Defense-in-Depth (V8.12 BL-501)
- search_knowledge_chunks RPC-RLS-Hardening (V8.11 SLC-903, V8.9 Carryover SEC-003)
