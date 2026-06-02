# SLC-893 — MT-1 Code-Audit-Notes (documents-Bucket-Aufrufer)

- Status: done
- Created: 2026-06-02
- Audit-Scope: `cockpit/src/**/*.ts(x)` — alle `.storage.from("documents")` UND `.from("documents")` Aufrufer
- Tools: Grep, Read

## Storage-Aufrufer (RLS-relevant, MT-2 / MT-3 / MT-4)

| # | File:Line | Operation | Pfad-Schema heute | RLS-Korrektur Pflicht |
|---|---|---|---|---|
| 1 | `cockpit/src/lib/actions/document-actions.ts:64` | `.storage.from("documents").upload(filePath, file)` | `documents/{folder}/{Date.now()}_{filename}` mit `folder` ∈ `contacts/<id>` / `companies/<id>` / `deals/<id>` / `misc` | **JA — MT-3 Pfad-Refactor** |
| 2 | `cockpit/src/lib/actions/document-actions.ts:101` | `.storage.from("documents").remove([filePath])` | `filePath` aus `documents.file_path`-Spalte (DB) | **NEIN** — Pfad kommt aus DB, wird nach Backfill korrekt |
| 3 | `cockpit/src/lib/actions/document-actions.ts:118` | `.storage.from("documents").createSignedUrl(filePath, 3600)` | `filePath` aus `documents.file_path`-Spalte (DB) | **NEIN** — Pfad kommt aus DB, wird nach Backfill korrekt |
| 4 | `cockpit/src/lib/knowledge/indexer.ts:261` | `.storage.from("documents").download(doc.file_path)` | `doc.file_path` aus DB, **admin (service_role) Client** | **NEIN** — service_role BYPASSRLS, akzeptiert jeden Pfad |

## DB-Aufrufer (Tabellen-RLS — OUT-OF-SCOPE SLC-893)

Aktuelle `documents`-Tabelle hat `authenticated_full_access`-Policy (`sql/02_rls.sql:33-37`). Tabellen-RLS wird in **V8.11 SLC-901..904** (RLS-Sweep 25 Zweittabellen) gehaertet, NICHT in SLC-893.

| # | File:Line | Operation | Auth-Mode |
|---|---|---|---|
| 1 | `cockpit/src/lib/actions/document-actions.ts:30` | `.from("documents").select(...)` | server (`createClient`) |
| 2 | `cockpit/src/lib/actions/document-actions.ts:70` | `.from("documents").insert(...)` | server (`createClient`) |
| 3 | `cockpit/src/lib/actions/document-actions.ts:104` | `.from("documents").delete().eq("id", id)` | server (`createClient`) |
| 4 | `cockpit/src/lib/knowledge/indexer.ts:244` | `.from("documents").select(...)` | admin (`createAdminClient`, BYPASSRLS) |

## Client-/UI-Aufrufer (kein Refactor)

| File | Direkter Storage-Aufruf? |
|---|---|
| `cockpit/src/components/documents/document-row.tsx` | Nein — `useTransition` + Server-Action-Calls `getDocumentUrl()` + `deleteDocument()` |

## Owner-Quelle fuer Backfill (Slice-Spec-Drift!)

Slice-Spec **AC-893-5(a)** sagte: "Owner aus `documents.owner_user_id`". Tatsaechliches Schema (`sql/01_schema.sql:129`):

```sql
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT,
  created_by UUID,           -- <-- ECHTE Owner-Spalte
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Spalte heisst `created_by`, nicht `owner_user_id`.** MT-4 Backfill nutzt `created_by`. Slice-Spec wird in MT-7 Records-Sync nachgepflegt.

## DEC-262 — Backfill-NULL-Owner-Fallback (User-Entscheidung 2026-06-02)

**Entscheidung:** Founder-UUID-Default fuer Documents mit `created_by IS NULL` (V1-Single-User-Aera).

**Begruendung:** BS Internal-Test-Mode + Single-User-Phase → alle bestehenden Documents sind praktisch vom Founder. Founder-UUID wird via ENV-Variable `MIG_041_FALLBACK_OWNER_UUID` an das Backfill-Script gegeben (kein Hard-Code). Keine Orphans.

**Konsequenz:** AC-893-5(c) Orphan-Pfad bleibt definiert fuer (b) Multi-Tabellen-Referenzen mit Konflikt — wird in MT-4 als "wenn FALLBACK_OWNER NICHT gesetzt UND created_by IS NULL → Orphan" implementiert.

## DEC-263 — Production-Pause-Window (deferred bis MT-6)

Sequenz Apply-Tag: (1) Production-Pause kurz (~5 Min), (2) MIG-041 apply, (3) Backfill --apply, (4) Re-Iterate bis 0 Pending, (5) Production-Resume. Entscheidung bleibt offen bis MT-6 Live-Apply-Session mit Founder.

## DEC-264 — Pfad-Sub-Schema (entschieden)

**Neues Pfad-Schema** = `<user-id>/<folder>/<Date.now()>_<filename>` mit:
- `folder` = `contacts/<contact-id>` | `companies/<company-id>` | `deals/<deal-id>` | `misc`

**Aenderung vs. heute:** `documents/`-Praefix entfaellt (redundant, Bucket heisst schon `documents`). User-UUID-Praefix prependet.

**Beispiele:**
- alt: `documents/contacts/abc-123/1717322400000_invoice.pdf`
- neu: `<user-uuid>/contacts/abc-123/1717322400000_invoice.pdf`
- alt: `documents/misc/1717322400000_notes.txt`
- neu: `<user-uuid>/misc/1717322400000_notes.txt`

**Backfill-Rename-Logik:**
1. Liste storage.objects WHERE bucket_id='documents'
2. Pro Object: lookup `documents.created_by` via `documents.file_path = object.name`
3. Wenn `created_by` gesetzt → `new_path = ${created_by}/${old_path.replace(/^documents\//, '')}`
4. Wenn `created_by IS NULL` UND `MIG_041_FALLBACK_OWNER_UUID` gesetzt → `new_path = ${FALLBACK_OWNER}/${old_path.replace(/^documents\//, '')}`
5. Sonst → Orphan (skip + log)
6. `supabase.storage.from('documents').move(old_path, new_path)` + `UPDATE documents SET file_path = new_path WHERE id = doc.id`

**Idempotenz:** Wenn `object.name` bereits mit gueltigem UUID-Praefix anfaengt (Regex `/^[0-9a-f-]{36}\//i`) → skip (bereits migriert).

## Storage-Policy-Stand HEUTE (`sql/02_rls.sql:47-57`)

```sql
-- 3 Policies (KEIN UPDATE!), alle mit bucket_id-only Check:
"authenticated_upload_documents"  FOR INSERT WITH CHECK (bucket_id = 'documents')
"authenticated_read_documents"    FOR SELECT  USING       (bucket_id = 'documents')
"authenticated_delete_documents"  FOR DELETE  USING       (bucket_id = 'documents')
```

**Spec-Drift:** Slice-Spec sagte "4 Storage-Policies (SELECT, INSERT, UPDATE, DELETE)". Tatsaechlich existieren nur **3** (INSERT, SELECT, DELETE). MT-2 MIG-041 wird:
- DROP IF EXISTS die 3 alten Policies (idempotent, kein Fehler wenn nicht vorhanden)
- CREATE 4 neue Policies (SELECT, INSERT, UPDATE, DELETE) mit first-path-segment-Filter

## Audit-Outcome

- **4 Storage-Aufrufer** identifiziert (1x upload-Pfad-Refactor noetig, 3x DB-Pfad)
- **0 Client-/UI-Aufrufer** mit direktem Storage-Touch
- **Owner-Quelle** = `documents.created_by` (Slice-Spec hatte Spalten-Namen falsch)
- **DEC-262** entschieden: Founder-UUID-Fallback via ENV
- **DEC-264** entschieden: `<user-id>/<folder>/<filename>` ohne `documents/`-Praefix
- **DEC-263** deferred bis MT-6 Live-Apply

**Naechster Schritt:** MT-2 Migration 041 + Migration-Tests.
