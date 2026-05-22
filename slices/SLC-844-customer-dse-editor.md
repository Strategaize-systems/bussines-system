# SLC-844 — V8.4 Editor /settings/compliance/customer-dse (Admin-only)

- **Feature:** FEAT-824 / BL-488
- **Version:** V8.4
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-22
- **Estimated:** ~2h Code-Side
- **Depends-On:** SLC-841, SLC-842
- **Architecture:** DEC-233 (eigene legal_documents-Tabelle), DEC-231 (Single-Row Update, kein History)
- **Pattern-Reuse:** V5.2 `ComplianceTemplateBlock`-Pattern (Markdown-Editor mit Live-Preview + Reset-to-Default)

## Goal

Markdown-Editor fuer Customer-DSE unter `/settings/compliance/customer-dse`. Tenant-Admin sieht den aktuellen DSE-Markdown-Inhalt, editiert ihn, sieht Live-Preview (renderLegalMarkdown clientseitig), speichert. Audit-Log bei Save. Admin-only via `assertRole(["admin"])`.

## Scope

### IN
- `cockpit/src/app/(app)/settings/compliance/customer-dse/page.tsx` Server-Component, admin-only
- `cockpit/src/app/(app)/settings/compliance/customer-dse/actions.ts` 3 Server-Actions: `getCustomerDse`, `updateCustomerDse(content_md)`, `resetCustomerDseToDefault()`
- `cockpit/src/components/settings/CustomerDseEditor.tsx` Client-Component mit Textarea + Live-Preview-Pane (Reuse-Adapter `ComplianceTemplateBlock`-Pattern oder neue Komponente)
- `audit_log` Insert bei Save (action=`customer_dse.updated`)
- Vitest fuer Server-Actions (RLS-Scope + Audit-Trail + ResetToDefault)
- Settings-Tile in `/settings/page.tsx` (oder `/settings/compliance/page.tsx`-Index) zu neuer Page

### OUT
- Public-Route (SLC-843)
- Consent-Form-Link (SLC-845)
- Mail-Footer (SLC-846)
- Versionierung (V2)

## Acceptance Criteria

- **AC1** `/settings/compliance/customer-dse` ist admin-only via `assertRole(["admin"])` — Teamlead und Member sehen `403`-Error oder Redirect
- **AC2** Page laedt aktuelle DSE aus `legal_documents.content_md` via `getCustomerDse()` Server-Action mit RLS-Scope auf `get_my_team_id()`
- **AC3** Editor zeigt Textarea mit Markdown-Inhalt + Live-Preview rechts (oder unter dem Editor) via clientseitig `renderLegalMarkdown` oder via Server-Re-Render bei Edit-Pause
- **AC4** `updateCustomerDse(content_md)` validiert `content_md.length BETWEEN 100 AND 50000`, ruft `UPDATE legal_documents SET content_md=$1, updated_by=auth.uid(), updated_at=now() WHERE tenant_team_id=get_my_team_id() AND kind='customer-dse'`, gibt `{ ok: true }` zurueck
- **AC5** `resetCustomerDseToDefault()` ueberschreibt mit Inhalt aus `cockpit/src/content/legal/customer-dse-default.md` (file-read serverseitig)
- **AC6** Bei Save: `audit_log` INSERT mit `action='customer_dse.updated', actor_id=auth.uid(), context='Customer-DSE editiert', changes={old_length, new_length}`
- **AC7** Vitest: 4-6 Tests fuer Server-Actions (admin-only-Guard, RLS-Scope-Korrektheit, Audit-Insert, Reset-to-Default, Validation-Reject-bei-zu-kurz/zu-lang)
- **AC8** Settings-Index zeigt neuen Tile/Link "Datenschutzerklaerung fuer Kunden" mit Description "Vor Customer-Live editieren, wird im Consent-Form + Mail-Footer angezeigt"

## Micro-Tasks

### MT-1: Server-Actions + Audit-Log
- Goal: 3 Server-Actions + Audit-Log-Insert.
- Files: `cockpit/src/app/(app)/settings/compliance/customer-dse/actions.ts` (NEU, ~80 Zeilen)
- Expected behavior:
  - `getCustomerDse()`: ruft `assertRole(["admin"])`, `supabase.from("legal_documents").select("content_md, updated_at").eq("tenant_team_id", get_my_team_id()).eq("kind", "customer-dse").maybeSingle()` (RLS macht den Rest), return `{ content_md, updated_at }`
  - `updateCustomerDse(content_md)`: validate length, UPDATE + audit_log INSERT in transaction-Reihenfolge (UPDATE → INSERT separate calls, no SAVEPOINT noetig)
  - `resetCustomerDseToDefault()`: `await readFile(path.join(process.cwd(), "src/content/legal/customer-dse-default.md"), "utf-8")` → UPDATE + audit_log
- Verification: TypeScript compile, Vitest in MT-4.
- Dependencies: SLC-841, SLC-842

### MT-2: Page + CustomerDseEditor-Component
- Goal: Page mit Server-Component-Page + Client-Editor.
- Files:
  - `cockpit/src/app/(app)/settings/compliance/customer-dse/page.tsx` (NEU, ~40 Zeilen)
  - `cockpit/src/components/settings/CustomerDseEditor.tsx` (NEU, ~80-120 Zeilen)
- Expected behavior:
  - Page: `await assertRole(["admin"])`, `const { content_md, updated_at } = await getCustomerDse()`, render `<CustomerDseEditor initialBody onSave={updateCustomerDse} onReset={resetCustomerDseToDefault} />`
  - Editor: Textarea + Live-Preview-Pane (clientside `renderLegalMarkdown` mit dynamic-import oder fallback auf Server-Re-Render-on-Blur). Save-Button + Reset-Button + ENTWURF-Banner. Pattern-Reuse: `ComplianceTemplateBlock`-Layout (textarea-links + preview-rechts) ODER eigene 2-Panel-Layout, je nach Slice-Planning-Tradeoff.
- Verification: Browser-Smoke MT-4 AC3.
- Dependencies: MT-1

### MT-3: Settings-Index-Tile + admin-only-Guard
- Goal: Tile auf `/settings/compliance/page.tsx`-Index (oder `/settings/page.tsx` falls Compliance-Index nicht existiert) verlinkt zu neuer Page.
- Files: `cockpit/src/app/(app)/settings/compliance/page.tsx` (PATCH, 1-3 Zeilen) oder `cockpit/src/app/(app)/settings/page.tsx` (PATCH, 1 Tile-Insert)
- Expected behavior: Neuer Tile `Datenschutzerklaerung fuer Kunden` mit `visibleFor: ADMIN_ONLY`, Description, href=`/settings/compliance/customer-dse`. Reuse existing Tile-Pattern in `/settings/compliance/page.tsx`.
- Verification: Tile sichtbar fuer Admin, nicht fuer Teamlead/Member.
- Dependencies: MT-1, MT-2

### MT-4: Vitest + Browser-Smoke
- Goal: Unit-Tests + Live-Smoke.
- Files: `cockpit/src/app/(app)/settings/compliance/customer-dse/actions.test.ts` (NEU, 4-6 Tests)
- Expected behavior: Tests mocken `assertRole`, `createClient` (Supabase) chain-fluent. Verifizieren admin-only-Guard, RLS-eq-Filter, Audit-Insert, Reset-File-Read, Length-Validation. Browser-Smoke: Login als Admin → `/settings/compliance/customer-dse` → Edit + Save → Reload → Inhalt persistiert → Reset → Inhalt = default-md.
- Verification: Vitest 4-6 PASS, Browser-Smoke alle AC1-AC8 PASS.
- Dependencies: MT-1, MT-2, MT-3

## Risks / Notes

- **R1** Live-Preview-Pattern: V5.2 `ComplianceTemplateBlock` rendert Preview clientside mit Token-Replacement. V8.4 braucht keine Token-Replacement (Platzhalter bleiben sichtbar als Hinweis fuer Admin). Empfehlung: einfaches `<div dangerouslySetInnerHTML={{ __html: previewHtml }} />` mit clientside `renderLegalMarkdown` via dynamic-import von `@/lib/legal/markdown`.
- **R2** `resetCustomerDseToDefault` braucht Datei-Read von `cockpit/src/content/legal/customer-dse-default.md`. Pflicht: `await readFile(path.join(process.cwd(), "src/content/legal/customer-dse-default.md"), "utf-8")` analog V8.2-Pattern aus `app/datenschutz/page.tsx`.
- **R3** Tenant-Admin-Edit ist Sole-User-Action (kein Co-Editor-Konflikt heute). V2 mit Multi-Admin braucht optimistic-locking via `updated_at`-WHERE-Clause.
- **R4** `feedback_compliance_gate_later`: Editor zeigt ENTWURF-Banner mit Anwalts-Pruefungs-Hinweis als Pflicht-Bestandteil. User darf Banner NICHT loeschen koennen — als statischer Header im Editor-Component, nicht als Markdown-Inhalt.

## Worktree-Isolation

Worktree-Branch `slc-844-customer-dse-editor` empfohlen.

## Done-Definition

- 3 neue Files committed (actions.ts, page.tsx, CustomerDseEditor.tsx)
- Settings-Index-Tile gepatcht
- Vitest 4-6 Tests PASS
- AC1-AC8 verifiziert (inklusive Browser-Smoke Admin-Edit-Save-Reload-Reset)
- `/qa` PASS
- Slice-Branch ready
