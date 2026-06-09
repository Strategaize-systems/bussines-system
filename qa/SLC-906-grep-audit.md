# SLC-906 grep-Audit — createAdminClient Defense-in-Depth Closure

**Date:** 2026-06-09
**Slice:** SLC-906 V8.12 Phase 1 Code-Layer-Closures Bundle
**Done-Gate-Quelle:** AC-906-3

## Audit-Command

```bash
grep -rnE "createAdminClient" cockpit/src/lib/actions/ cockpit/src/app/actions/ cockpit/src/lib/knowledge/ cockpit/src/app/\(app\)/emails/compose/
```

## Befund nach SLC-906 (Post-MT-1..MT-7)

| File | Status | Pattern |
|---|---|---|
| `cockpit/src/app/actions/products.ts` | ✓ Closed | assertRole(['admin']) vor createAdminClient bei 3 Write-Funcs (createProduct/updateProduct/archiveProduct). 2 Read-Funcs auf User-Client (RLS Klasse-B SELECT USING(true)). MT-1 ISSUE-090 |
| `cockpit/src/app/actions/deal-products.ts` | ✓ Closed | Alle 4 Funcs auf User-Client. RLS Klasse-C `EXISTS(deals + can_see_owner) OR is_admin()` greift. MT-2 ISSUE-091 |
| `cockpit/src/app/(app)/emails/compose/send-action.ts` | ✓ Closed | email_attachments-Bulk-INSERT auf User-Client. RLS Klasse-C `EXISTS emails.owner_user_id OR EXISTS proposals.owner_user_id OR is_admin()` greift. MT-3 ISSUE-092 |
| `cockpit/src/lib/actions/insight-actions.ts` | ✓ Closed | Alle 4 Server-Actions auf User-Client. RLS Klasse-C polymorph 5-Wege greift. MT-4 ISSUE-093 (Spec-Deviation dokumentiert in Code-Kommentar) |
| `cockpit/src/lib/actions/document-actions.ts` | ✓ Closed | No-Op-Befund — bereits in V8.10 SLC-893 MT-4 auf User-Client umgestellt. Regression-Test ergaenzt. MT-5 ISSUE-094 |
| `cockpit/src/app/actions/goals.ts` | ✓ Closed | Alle 7 createAdminClient-Sites auf User-Client. RLS Klasse-A `user_id=auth.uid() OR is_admin()` greift. MT-6 SLC-901 M-1 |
| `cockpit/src/app/actions/kpi-snapshots.ts` | ✓ Closed | 2 Read-Funcs auf User-Client. RLS Klasse-A greift. MT-6 SLC-901 M-1 |
| `cockpit/src/app/actions/activity-kpis.ts` | ✓ Closed | 5 createAdminClient-Sites auf User-Client (inkl. Helper-Param-Switch via Type-Widening). MT-6 SLC-901 M-1 |
| `cockpit/src/lib/knowledge/search.ts` | ✓ Closed | Caller-Mode-Switch via `serviceMode?: boolean`. Default User-Client, Cron-Caller `serviceMode: true`. MT-7 SLC-905 D-905-4 |

## In-Scope SLC-906: createAdminClient-Sites mit dokumentierter Begruendung

`cockpit/src/app/actions/products.ts` — 3 Writes (Klasse-B):
- L77 createProduct: `assertRole(["admin"])` an L73 vorgelagert (Defense-in-Depth)
- L110 updateProduct: `assertRole(["admin"])` an L102 vorgelagert
- L145 archiveProduct: `assertRole(["admin"])` an L143 vorgelagert

`cockpit/src/lib/knowledge/search.ts` — 1 conditional:
- L95: ternary `options.serviceMode ? createAdminClient() : await createClient()` — Caller-Mode-Switch DEC-906 MT-7

## Out-of-Scope-Befund (NICHT in SLC-906)

Folgende Files enthalten weiterhin `createAdminClient` — sie sind NICHT Teil von SLC-906, sondern werden in spaeteren V8.12 Phase-2/3 oder V8.13 Closures adressiert:

| File | Sites | Begruendung |
|---|---|---|
| `cockpit/src/app/actions/consent.ts` | 5 | Customer-facing Token-Consent-Flow (kein auth.user), V8.7-A SLC-871 Pattern. Eigener Defense-in-Depth-Path (Audit-Helper-Dual-Client). Out-of-SLC-906. |
| `cockpit/src/app/actions/meetings.ts` | 1 | Meeting-Snapshot-Erstellung mit Deal-JOIN-Read. Nicht Teil der ISSUE-090..094 + SLC-901-M-1 + SLC-905-D-905-4 Liste. Kandidat fuer kuenftige Closure-Inventur. |
| `cockpit/src/lib/knowledge/indexer.ts` | 6 | Knowledge-Indexer (Cron-Pfad, ai-Embedding-Generation). Aehnlich Signal-Extractor — Service-Mode-Caller. Out-of-SLC-906 (keine ISSUE-Listen-Eintrag). Kandidat fuer kuenftige Caller-Mode-Audit. |

## Done-Gate-Validierung

- **AC-906-3**: ✓ Erfuellt — alle SLC-906-In-Scope-Sites haben entweder vorgelagerten assertRole(['admin']) ODER User-Client-Switch-Code-Kommentar.
- **Cross-Repo-Empfehlung**: consent.ts + meetings.ts + indexer.ts in V8.13 Audit-Cycle (separates Slice).
