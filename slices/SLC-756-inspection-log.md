# SLC-756 — Inspection-Log /settings/workflow-automation/nl-history (FEAT-751)

## Metadata
- **Slice ID:** SLC-756
- **Version:** V7.5
- **Feature:** FEAT-751 Natural-Language Workflow-Sculptor
- **Status:** planned
- **Priority:** Medium (Admin-Audit-Sweep; SLC-756 closes V7.5)
- **Created:** 2026-05-16
- **Estimated Effort:** ~2-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (kleiner Patch, neue Settings-Subpage)
- **Architecture:** V7.1-Permission-Matrix Admin-only, DEC-206 audit_log-Reuse, DEC-209 nl-history.ts (SLC-752 MT-8)
- **Reihenfolge-Pflicht:** **letzter V7.5-Slice**. Schliesst Feature ab.

## Goal

Admin-only Listing-Page `/settings/workflow-automation/nl-history` mit Tabelle der letzten 50 Sculpt-Versuche. Filter nach Trigger-Event + Outcome (success/reject/validation_fail). Quelle: `audit_log.action='automation_rule.sculpt_attempt'`.

## Scope

**In Scope:**

- **`cockpit/src/app/(app)/settings/workflow-automation/nl-history/page.tsx` (NEU)** — Server-Component:
  - `assertRole(["admin"])` als first line (V7.1-Permission-Matrix Admin-only)
  - `listNlSculptHistory(50)` aus SLC-752 MT-8
  - Render `<NlHistoryTable rows={...} />`
- **`cockpit/src/components/settings/nl-history-table.tsx` (NEU)** — Client-Component-Tabelle:
  - Spalten: Datum / User (Email-Lookup via Server-Side-Join in page.tsx oder eigenes RPC) / NL-Input-Snippet (truncate 80 chars) / Status (Badge: success=green / reject=amber / validation_fail=red) / Cost-USD / Trigger-Event (bei success) / Reject-Reason (bei reject)
  - Tabelle nutzt bestehende `@/components/ui/table` shadcn-Komponente
  - Optional: Filter-Dropdown "Status" + "Trigger-Event" (client-side filtering der 50 Rows)
- **Sidebar-Eintrag in Settings**: Settings-Sidebar-Page-Liste erweitern um `Workflow-Automation > NL-History` (Pattern aus V6.5 settings-Pages-Auslagern). Permission via V7.1 Settings-Layer (Admin-only).
- **Vitest:**
  - `nl-history-page.test.tsx` — RTL: Member sieht 403, Admin sieht Tabelle
  - `nl-history-table.test.tsx` — RTL: Rendert 3 Rows + Filter-State-Toggle

**Out of Scope:**

- Pagination ueber 50 Rows hinaus — V7.6 wenn Bedarf
- Teamlead-Inspection-Log-Permission — Architecture-DEC: Admin-only, Teamlead sieht eigene NL-Versuche NICHT in Listing-View (V7.6-Erweiterung wenn realer Bedarf)
- Export-CSV der NL-History — V8+
- "Nur NL-erzeugte Regeln"-Filter-Switch-zu-automation_rules (`created_via='nl_sculptor'`) — Architecture-Empfehlung als V7.6-Polish, NICHT in V7.5

## Acceptance Criteria

- **AC1** `/settings/workflow-automation/nl-history` ist erreichbar fuer Admin, **NICHT fuer Teamlead und Member** (assertRole-Server-Side, hard 403/Redirect).
- **AC2** Page rendert Tabelle mit den letzten 50 `audit_log.action='automation_rule.sculpt_attempt'`-Eintraegen, DESC-Order nach `created_at`.
- **AC3** Tabellen-Spalten: Datum / User-Email / NL-Input-Snippet (truncated, hover zeigt full) / Status-Badge / Cost-USD / Trigger-Event (success) oder Reject-Reason (reject).
- **AC4** Status-Badge-Farben: `success` → green, `reject` → amber, `validation_fail` → red (Style-Guide-V2 konform).
- **AC5** User-Email-Lookup: page.tsx joined `audit_log.actor_id` mit `auth.users.email` (Self-hosted-Supabase-RPC oder Direct-Service-Role-Query). Falls Service-Role nicht zulaessig: Email-anonymisiert anzeigen `User <UUID-Prefix>`.
- **AC6** Optional Filter-Dropdown: "Status" (all/success/reject/validation_fail) + "Trigger-Event" (all/deal.stage_changed/deal.created/activity.created). Client-side-Filter auf den 50 Rows, kein Re-Query.
- **AC7** Sidebar-Eintrag "NL-History" unter Workflow-Automation, nur fuer Admin sichtbar (V7.1-Permission-Layer-Reuse).
- **AC8** Vitest `npm run test:all` ~977 → ~977+4 PASS.
- **AC9** Playwright-MCP-Live-Smoke (im /qa-Step):
  - 3-4 Sculpt-Versuche von SLC-753+754-Live-Smokes existieren bereits in audit_log
  - Admin-Login → /settings/workflow-automation/nl-history → Tabelle zeigt 3-4 Rows
  - Member-Login → /settings/workflow-automation/nl-history → 403/Redirect
  - Filter-Toggle "Status=reject" → nur reject-Rows sichtbar

## Micro-Tasks

### MT-0: Settings-Page-Layout-Lookup
- **Goal:** Pattern aus V6.5 settings-Pages-Auslagern verstehen (SLC-653).
- **Files (Review-only):**
  - `cockpit/src/app/(app)/settings/workflow-automation/page.tsx` (Pre-V7.5 Pattern)
  - Bestehende Settings-Sub-Pages (z.B. `/settings/payment-terms`)
- **Verification:** Layout-Pattern klar (PageHeader + Card + Table).
- **Dependencies:** none

### MT-1: nl-history-page.tsx (Server-Component)
- **Goal:** assertRole(["admin"]) + listNlSculptHistory(50) + User-Email-Join.
- **Files:**
  - `cockpit/src/app/(app)/settings/workflow-automation/nl-history/page.tsx` (NEU)
- **Expected behavior:**
  ```typescript
  export default async function NlHistoryPage() {
    await assertRole(["admin"]);
    const rows = await listNlSculptHistory(50);
    const userIds = [...new Set(rows.map(r => r.actor_id))];
    const userEmails = await fetchUserEmailsByIds(userIds);  // service-role RPC oder Direct-Query
    const enrichedRows = rows.map(r => ({...r, actor_email: userEmails[r.actor_id] ?? `User ${r.actor_id.slice(0,8)}`}));
    return <PageContainer>
      <PageHeader title="NL-Workflow-Sculptor — History" />
      <NlHistoryTable rows={enrichedRows} />
    </PageContainer>;
  }
  ```
- **Verification:** TSC clean. Vitest: RTL-Test mit Mock-Session-Role.
- **Dependencies:** SLC-752 MT-8 (nl-history.ts)

### MT-2: NlHistoryTable Client-Component
- **Goal:** Tabelle mit Filter-Dropdowns + Status-Badge + Truncate.
- **Files:**
  - `cockpit/src/components/settings/nl-history-table.tsx` (NEU)
- **Expected behavior:**
  - Props: `rows: NlSculptHistoryRow[]`
  - State: `statusFilter`, `triggerFilter`
  - Render shadcn-Table mit Rows. Truncate NL-Input via Tooltip.
  - Status-Badge: success=green, reject=amber, validation_fail=red.
- **Verification:** RTL-Tests: 3-Row-Render + Status-Filter-Toggle.
- **Dependencies:** MT-1

### MT-3: Sidebar-Eintrag in Settings
- **Goal:** Workflow-Automation-Sidebar-Section um "NL-History" erweitern (Admin-only sichtbar).
- **Files:**
  - `cockpit/src/components/layout/settings-sidebar.tsx` (oder analog — Pfad aus MT-0)
  - Falls keine eigene Settings-Sidebar: Sub-Page-Index in `/settings/workflow-automation/layout.tsx`.
- **Expected behavior:** Eintrag rendert nur fuer Admin (`role==="admin"` Server-Side-Prop).
- **Verification:** Lokal: Admin sieht Eintrag, Teamlead+Member nicht.
- **Dependencies:** MT-1

### MT-4: /qa Playwright-MCP-Live-Smoke
- **Goal:** AC9-Sequenz: Admin sieht Tabelle, Member sieht 403, Filter funktional.
- **Verification:** Screenshot von Tabelle + 403-Screenshot von Member-Sicht.
- **Dependencies:** MT-1..MT-3 done + User-Coolify-Deploy + audit_log enthaelt 3-4 sculpt_attempt-Rows aus SLC-753+754-Smokes

### MT-5: Cockpit-Records-Sync + FEAT-751 finalisieren
- **Goal:** SLC-756 done. FEAT-751 → done (alle 5 SLCs SLC-752..756 done). V7.5 ist damit Feature-vollstaendig (Gesamt-/qa folgt).
- **Files:**
  - `slices/INDEX.md` (MOD) — SLC-756 → done
  - `features/INDEX.md` (MOD) — FEAT-751 → done
  - `planning/backlog.json` (MOD) — BL-435 → done
- **Dependencies:** MT-4 PASS

## Risks & Mitigations

- **R1** User-Email-Lookup ueber `auth.users` braucht Service-Role-Privilege — **Mitigation:** Pattern aus V7 Multi-User-Setup nutzen (Admin hat schon User-Listing-Page, der gleiche RPC kann hier wiederverwendet werden). Falls nicht: Email-anonymisiert wie AC5-Fallback.
- **R2** Filter ueber 50 Rows client-side reicht V7.5 — bei realem Audit-Bedarf >50 wird Pagination V7.6.
- **R3** Sidebar-Erweiterung-Pattern in Codebase nicht standardisiert (V6.5 hat Settings-Pages-Auslagern eingefuehrt) — **Mitigation:** MT-0 prueft, MT-3 folgt bestehendem Pattern.

## Dependencies

- **SLC-752 MT-8** nl-history.ts (Listing-Query)
- **V7.1 FEAT-711** Settings-Permission-Layer (assertRole admin-only fuer Inspection-Log)
- **SLC-753 + SLC-754 + SLC-755** Live-Smokes muessen audit_log-Rows produziert haben (Test-Daten fuer AC9-Live-Smoke)

## Verification & Tests

- TSC clean
- Vitest 4 neue Tests gruen (page-RTL + table-RTL inkl. Filter)
- Live-Smoke MT-4 PASS

## Open Points

- Service-Role-RPC fuer User-Email-Lookup — MT-1 entscheidet konkret.

## Files Reviewed (Slice-Planning)

- `docs/ARCHITECTURE.md` V7.5-Section (DEC-206 audit_log JSONB-Reuse + Listing-Query-Skizze)
- Memory `feedback_v2_sidebar_pflicht.md` (Sidebar-Pattern)
- Memory `feedback_admin_employee_chef_views.md` (Admin-Sicht-First)

## Recommended Implementation Skill

`/backend` MT-1 (Server-Component + Service-Role-RPC).
`/frontend` MT-2 + MT-3 (Table + Sidebar).
`/qa` MT-4 Live-Smoke.
Nach MT-5: **V7.5 Feature-Code complete**. Naechster Schritt: Gesamt-/qa V7.5 → /final-check V7.5 → /go-live V7.5 → /deploy als REL-032.
