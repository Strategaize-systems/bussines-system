# SLC-624 — Campaigns Foundation (Schema + CRUD + Stammdaten-Dropdown)

## Meta
- Feature: FEAT-622
- Priority: Blocker
- Status: planned
- Created: 2026-05-05
- Estimated Effort: 4-6h

## Goal

FEAT-622 Attribution-Block beginnt mit dem Schema-Foundation-Slice. MIG-029 Teil 2 ergaenzt die Migration um `campaigns`-Tabelle + 3 additive `campaign_id`-FKs auf `contacts`/`companies`/`deals` (DEC-136 keine Source-Migration). Server Actions fuer Kampagnen-CRUD. Listing-Page `/settings/campaigns` plus Detail-Page `/campaigns/[id]` mit Header + leerem Tabs-Skelett (Tracking-Links + Click-Logs werden in SLC-625 ergaenzt). Wiederverwendbare Stammdaten-Dropdown-Component fuer Contacts/Companies/Deals-Edit-Forms — User kann ab SLC-624 manuell Kampagnen-Zuordnungen vornehmen, Auto-Mapping via UTM kommt in SLC-625.

Tracking-Links, Click-Log, Reporting-KPIs und Read-API kommen in SLC-625. Hier nur das Daten-Foundation + manuelle Pflege.

## Scope

- **MIG-029 Teil 2** (selbe SQL-File `sql/migrations/029_v62_automation_and_campaigns.sql`, idempotent — wird beim Apply zum 2. Mal ausgefuehrt, alle CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / ALTER TABLE ADD IF NOT EXISTS):
  - `campaigns`-Tabelle: `id, name, type (email|linkedin|event|ads|referral|other), channel, start_date, end_date, status (draft|active|finished|archived), external_ref, notes, created_by, created_at, updated_at`
  - 2 UNIQUE-Constraints: `UNIQUE (LOWER(name))` (case-insensitive name), `UNIQUE (external_ref) WHERE external_ref IS NOT NULL` (partial)
  - 1 Partial-Index: `idx_campaigns_status_active ON (status, start_date) WHERE status='active'`
  - **3 ALTER TABLE ADD COLUMN** auf contacts, companies, deals: `campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL`
  - **3 Partial-Indizes** auf `*.campaign_id WHERE campaign_id IS NOT NULL`
  - RLS `authenticated_full_access` auf campaigns
  - GRANTS auf authenticated, service_role
  - SLC-625 ergaenzt MIG-029 um campaign_links + campaign_link_clicks
- **Type-Definitions** (`cockpit/src/types/campaign.ts` neu):
  - `Campaign`, `CampaignType`, `CampaignStatus`, `CampaignWithStats` (extended-shape mit lead_count, deal_count, won_count berechnet via Server-Action)
- **Server Actions** (`cockpit/src/app/(app)/settings/campaigns/actions.ts` neu):
  - `saveCampaign(input)` — INSERT/UPDATE in campaigns. Validiert: name (NOT NULL, min 2 chars), type Whitelist, status Whitelist, start_date NOT NULL, end_date >= start_date wenn gesetzt, external_ref optional unique partial.
  - `listCampaigns(filter?)` — SELECT mit Filter-Optionen (status, type). LEFT JOIN auf Aggregate-CTE fuer counts (V1: einfache Subquery COUNT(*) FROM contacts WHERE campaign_id=X AS lead_count, analog deals + won_deals).
  - `getCampaign(id)` — SELECT einzelne Campaign + KPIs (lead_count, deal_count, won_count, won_value).
  - `archiveCampaign(id)` — UPDATE status='archived'.
  - `deleteCampaign(id)` — DELETE campaigns WHERE id=$X. ON DELETE SET NULL auf contacts/companies/deals.campaign_id (3 Tables, denormalisiert via CASCADE-Relation).
- **Listing-Page** (`cockpit/src/app/(app)/settings/campaigns/page.tsx` neu):
  - Header: "Kampagnen" + "Neue Kampagne"-Button
  - Filter-Bar: Status-Dropdown (alle|draft|active|finished|archived) + Typ-Dropdown
  - Card-Liste pro Kampagne: name, type-Badge, status-Badge, Zeitraum (start..end), Lead-Count (einfacher COUNT)
  - Empty-State + Loading-State (Style Guide V2)
  - Edit-Link + Delete-Confirm-Dialog
- **Editor-Page** (`cockpit/src/app/(app)/settings/campaigns/new/page.tsx` + `cockpit/src/app/(app)/settings/campaigns/[id]/edit/page.tsx` neu):
  - Single-Form (kein Wizard, da nur 8 Felder): name, type, channel, start_date, end_date, status, external_ref, notes
  - Form-Validation client-side (date-range, name-min) + Server-Action-Validation
  - Save persistiert + redirect zu /settings/campaigns
- **Detail-Page Skelett** (`cockpit/src/app/(app)/campaigns/[id]/page.tsx` neu):
  - Header-Block: name, type-Badge, channel, Zeitraum, Status-Badge, external_ref + "Edit" Link
  - **5 KPI-Cards** (Server-Component-Render via getCampaign):
    - Leads (Anzahl Contacts mit campaign_id=X)
    - Deals (Anzahl Deals mit campaign_id=X)
    - Won-Deals (deals.status='won' AND campaign_id=X)
    - Won-Value (SUM(deals.value) WHERE status='won' AND campaign_id=X)
    - Conversion-Rate (Won-Deals / Leads * 100, oder "—" wenn 0 Leads)
  - Tabs-Skelett (Card-Layout mit drei Tabs):
    - **Leads-Tab** — Tabellenliste verknuepfter Contacts mit name + last_activity + Stage-Filter
    - **Deals-Tab** — Tabellenliste verknuepfter Deals mit title + stage + value + status
    - **Tracking-Links-Tab** — leeres Skelett mit "Tracking-Links werden in V6.2 SLC-625 ergaenzt" Placeholder (oder einfach Coming-Soon-Card als Style Guide V2 Variante)
- **Stammdaten-Dropdown-Component** (`cockpit/src/components/campaigns/campaign-picker.tsx` neu, wiederverwendbar):
  - Combobox mit Suche (existing Combobox-Pattern aus `/contacts/[id]/edit`-Form Reuse)
  - Loading per Server-Action listCampaigns({status:'active|draft'}) (excludiert archived/finished)
  - Empty-State: "Keine Kampagnen vorhanden — Lege eine an unter /settings/campaigns" + Link
  - onChange-Handler setzt rule.campaign_id (oder direkt entity.campaign_id im Form)
- **Integration in Stammdaten-Edit-Forms** (3 Pfade):
  - `cockpit/src/app/(app)/contacts/[id]/edit-form.tsx` (oder analog) — Field "Kampagne" nach `address_country` oder analog. CampaignPicker-Component.
  - `cockpit/src/app/(app)/companies/[id]/edit-form.tsx` — analog.
  - **Deal-Create-Form** (`cockpit/src/app/(app)/deals/new/...` oder im Pipeline-Modal): campaign_id Field. Bei Auswahl eines Primary-Contacts (existing Field): Auto-Vorbelegung von deal.campaign_id mit contact.campaign_id (manuell override-bar).
- **Schema-Smoke-Test** (`cockpit/src/__tests__/campaigns-schema.test.ts` neu): Vitest gegen Coolify-DB. Idempotenz, FK-Constraints, ON DELETE SET NULL Test (Campaign-Delete setzt contacts/deals.campaign_id auf NULL).
- **Cockpit-Records-Update**:
  - `slices/INDEX.md`: SLC-624 Status `planned -> done`
  - `features/INDEX.md`: FEAT-622 Status `planned -> in_progress` (V6.2 1/2 Attribution-Slices done)
  - `planning/backlog.json`: BL-139 Status bleibt `in_progress`
  - `docs/STATE.md`: naechste = SLC-625

## Out of Scope

- Tracking-Links + Click-Log (SLC-625)
- Token-Generator (SLC-625)
- Public Redirect-Endpoint /r/[token] (SLC-625)
- UTM-Mapping (SLC-625)
- First-Touch-Lock (SLC-625)
- Read-API /api/campaigns/[id]/performance (SLC-625)
- Funnel-Filter Integration (SLC-625)
- Auto-Source-Migration (DEC-136 — out-of-V6.2-scope, BL-XXX V6.3+ angelegt in /slice-planning)
- Multi-Touch-Attribution (DEC-138 — V1 ist First-Touch-only, BL-XXX V6.3+)
- Cross-Session-Cookie-Tracking (V6.2 Out-of-Scope)
- Auto-UTM-Link-Generator-UI in System 4 (System 4 selbst macht das)
- A/B-Testing (V6.2 Out-of-Scope)

## Acceptance Criteria

- AC1: MIG-029 Teil 2 idempotent — kann zweimal ausgefuehrt werden ohne Fehler.
- AC2: `campaigns`-Tabelle existiert mit allen 11 Spalten + 2 UNIQUE + 1 Partial-Index + RLS.
- AC3: `contacts.campaign_id`, `companies.campaign_id`, `deals.campaign_id` FKs existieren mit ON DELETE SET NULL.
- AC4: `saveCampaign({name:"X", type:"linkedin", start_date:"2026-05-05", status:"draft"})` persistiert in DB.
- AC5: `saveCampaign` mit duplikat-name (case-insensitive) wird abgelehnt mit klarer Fehlermeldung.
- AC6: `saveCampaign` mit end_date < start_date wird abgelehnt.
- AC7: `listCampaigns({status:"active"})` filtert korrekt.
- AC8: `getCampaign(id)` returnt Campaign + KPIs (lead_count, deal_count, won_count, won_value, conversion_rate).
- AC9: `deleteCampaign(id)` setzt contacts/deals.campaign_id auf NULL (verifiziert via Vitest gegen Coolify-DB).
- AC10: `/settings/campaigns` Listing rendert mit Filter-Bar.
- AC11: Empty-State zeigt sinnvollen Hint + Primary-Button.
- AC12: Editor `/new` und `/[id]/edit` rendern Form mit allen 8 Feldern.
- AC13: Form-Validation client-side fuer date-range + name-min greift.
- AC14: `/campaigns/[id]` Detail-Page rendert Header + 5 KPI-Cards + 3 Tabs (Leads, Deals, Tracking-Links Skelett).
- AC15: KPI-Cards zeigen korrekte Counts via getCampaign Server-Action (manueller Test mit Test-Daten).
- AC16: Conversion-Rate zeigt "—" wenn 0 Leads.
- AC17: CampaignPicker-Component rendert in Contact-Edit-Form, Company-Edit-Form, Deal-Create-Form.
- AC18: Auto-Vorbelegung bei Deal-Create — wenn Primary-Contact eine campaign_id hat, wird sie als Default fuer deal.campaign_id gesetzt.
- AC19: User kann manuell override (z.B. andere Kampagne waehlen oder leer lassen).
- AC20: TypeScript-Build (`npm run build`) gruen.
- AC21: Vitest (`npm run test`) gruen — neue Tests fuer Schema-Smoke + Server-Actions.
- AC22: ESLint (`npm run lint`) gruen.
- AC23: Browser-Smoke Desktop: Workflow durchfuehrbar (Listing → New → Save → Detail-Page rendert KPIs → Stammdaten-Edit hat Picker → Lead-Count im Detail aktualisiert).

## Dependencies

- SLC-621 + SLC-622 + SLC-623 idealerweise abgeschlossen, aber NICHT zwingend — Attribution-Block ist unabhaengig von Workflow-Block
- V2 Stammdaten-Edit-Forms (Contacts, Companies) — Reuse + Erweiterung
- V2.1+ Deal-Create-Form (existing Pipeline-Modal oder /deals/new-Page)
- V5.6 BL-403 Style Guide V2 — Card/Badge/Form-Field-Patterns
- V3 Combobox-Component (Reuse-Pattern aus Contact-Picker)
- Coolify-DB-Zugriff fuer MIG-029 Teil 2 Apply

## Risks

- **Risk:** ALTER TABLE ADD COLUMN mit FK auf grossen contacts/companies/deals-Tables triggert Long-Lock.
  Mitigation: V1 Single-User-Tenant hat <10k Rows in jedem Table — ALTER ist Metadata-Change ohne Daten-Touch (nullable Default-NULL). Verified in V5.x Migrations. Lock-Time vernachlaessigbar.
- **Risk:** UNIQUE (LOWER(name)) verbietet Re-Use von Namen die nur Case unterscheiden.
  Mitigation: Bewusst gewollt (DEC-135 — utm_campaign-Match case-insensitive). User-Hint im Editor "Name muss eindeutig sein (case-insensitive)".
- **Risk:** ON DELETE SET NULL auf contacts/deals.campaign_id ist destruktiv — User loescht Kampagne und verliert Attribution.
  Mitigation: Delete-Confirm-Dialog warnt explizit "Loeschen entfernt die Verknuepfung von N Leads und M Deals — Empfohlen: Status auf 'archived' setzen". archive-Action als Default-Option im UI.
- **Risk:** KPI-Counts via Subquery COUNT(*) sind langsam wenn contacts/deals waechst.
  Mitigation: Single-User <10k Rows — Subquery <50ms. V7 Multi-Tenant koennte Materialized-View brauchen, V1 nicht.
- **Risk:** CampaignPicker zeigt zu viele Kampagnen (alle status='active') und User scrollt.
  Mitigation: Combobox-Search filtert per Eingabe. Empty-State + Limit 100 in Server-Action listCampaigns.
- **Risk:** Auto-Vorbelegung bei Deal-Create greift nicht weil Primary-Contact noch nicht gesetzt ist.
  Mitigation: useEffect in Deal-Create-Form watcht primary_contact_id, bei Aenderung lookup contact.campaign_id und setzt deal.campaign_id (nur wenn deal.campaign_id noch leer/unangefasst). Override-Pfad bleibt explicit. Test-AC verifiziert das.
- **Risk:** MIG-029 muss zwei Mal applied werden (SLC-621 + SLC-624) und Inkonsistenz zwischen den Apply-Zustaenden.
  Mitigation: SQL-File ist 1 File mit allen IF NOT EXISTS — Apply ist idempotent. SLC-621-Test apply nur Workflow-Anteil, SLC-624-Test apply alles inkl. Campaigns-Anteil. Kein Konflikt.
- **Risk:** Detail-Page rendert "Tracking-Links Coming-Soon" und User irritiert.
  Mitigation: Coming-Soon-Card (Style Guide V2 Variante) erklaert "Kommt mit V6.2 SLC-625 — manuelles Anlegen via Settings reicht fuer V1". Klarer Out-of-Scope-Hint.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/029_v62_automation_and_campaigns.sql` | MODIFY — Campaigns-Anteil ergaenzen (neue Tabelle + 3 ALTER + GRANTS + RLS) |
| `cockpit/src/types/campaign.ts` | NEU — Campaign, CampaignType, CampaignStatus, CampaignWithStats |
| `cockpit/src/app/(app)/settings/campaigns/actions.ts` | NEU — saveCampaign, listCampaigns, getCampaign, archiveCampaign, deleteCampaign |
| `cockpit/src/app/(app)/settings/campaigns/page.tsx` | NEU — Listing-Page |
| `cockpit/src/app/(app)/settings/campaigns/new/page.tsx` | NEU — Editor-Page neue |
| `cockpit/src/app/(app)/settings/campaigns/[id]/edit/page.tsx` | NEU — Editor-Page existing |
| `cockpit/src/app/(app)/settings/campaigns/_components/campaign-form.tsx` | NEU — Single-Form-Component |
| `cockpit/src/app/(app)/campaigns/[id]/page.tsx` | NEU — Detail-Page Skelett (Header + KPIs + 3 Tabs) |
| `cockpit/src/app/(app)/campaigns/[id]/_components/leads-tab.tsx` | NEU — Tab 1 Content |
| `cockpit/src/app/(app)/campaigns/[id]/_components/deals-tab.tsx` | NEU — Tab 2 Content |
| `cockpit/src/app/(app)/campaigns/[id]/_components/tracking-links-tab.tsx` | NEU — Tab 3 Coming-Soon-Skelett |
| `cockpit/src/components/campaigns/campaign-picker.tsx` | NEU — wiederverwendbare Combobox |
| `cockpit/src/app/(app)/contacts/[id]/edit-form.tsx` | MODIFY — CampaignPicker-Field ergaenzen |
| `cockpit/src/app/(app)/companies/[id]/edit-form.tsx` | MODIFY — CampaignPicker-Field |
| `cockpit/src/app/(app)/deals/new-deal-form.tsx` (oder Pipeline-Modal) | MODIFY — CampaignPicker + Auto-Vorbelegung |
| `cockpit/src/__tests__/campaigns-schema.test.ts` | NEU — Schema-Smoke-Test gegen Coolify-DB |
| `cockpit/src/app/(app)/settings/campaigns/_components/__tests__/campaign-form.test.tsx` | NEU — Form-Validation-Tests |
| `slices/INDEX.md` | MODIFY |
| `features/INDEX.md` | MODIFY — FEAT-622 in_progress |
| `docs/STATE.md` | MODIFY — naechste = SLC-625 |

## Micro-Tasks

#### MT-1: TypeScript-Types definieren
- Goal: Single-Source-of-Truth fuer Campaign-Types.
- Files: `cockpit/src/types/campaign.ts`
- Expected behavior: Exports Campaign, CampaignType (literal-union 6 values), CampaignStatus, CampaignWithStats (extends Campaign + lead_count, deal_count, won_count, won_value, conversion_rate).
- Verification: TS-Build gruen. Types werden in MT-3 + MT-4 + MT-7 importiert.
- Dependencies: none

#### MT-2: SQL-Migration Campaigns-Anteil
- Goal: MIG-029 erweitern um Campaigns-Tabelle + 3 ALTER auf contacts/companies/deals.
- Files: `sql/migrations/029_v62_automation_and_campaigns.sql`
- Expected behavior: SQL-File enthaelt jetzt Workflow-Anteil + Campaigns-Anteil. Idempotent via IF NOT EXISTS / DROP CONSTRAINT IF EXISTS / ALTER TABLE ADD IF NOT EXISTS. Apply auf Coolify-DB (zweiter Apply nach SLC-621 — Workflow-Tabellen bestehen schon, jetzt kommen Campaigns dazu).
- Verification: Apply auf Coolify-DB ohne Fehler. `\d campaigns`, `\d contacts | grep campaign_id`, analog companies + deals zeigen FK.
- Dependencies: MT-1

#### MT-3: Server Actions Campaigns
- Goal: 5 Server-Actions fuer Campaign-Lifecycle.
- Files: `cockpit/src/app/(app)/settings/campaigns/actions.ts`
- Expected behavior: saveCampaign (INSERT/UPDATE mit case-insensitive Name-Check), listCampaigns (Filter + Sort), getCampaign (mit KPI-Subqueries), archiveCampaign, deleteCampaign. Validation client-side + serverseitig.
- Verification: Manueller Server-Action-Test (curl oder via Browser-Console). Roundtrip save → list → get (KPIs leer wenn 0 Verknuepfungen) → archive → delete.
- Dependencies: MT-2

#### MT-4: Listing-Page + Editor-Pages
- Goal: `/settings/campaigns` mit Listing + Editor.
- Files: `page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`, `_components/campaign-form.tsx`
- Expected behavior: Listing zeigt Card-Liste mit Filter-Bar. Editor-Form mit 8 Feldern + Validation. Save persistiert + redirect.
- Verification: Browser-Smoke Listing rendert, New-Form save persistiert, Edit-Form Round-Trip.
- Dependencies: MT-3

#### MT-5: Detail-Page Skelett mit KPIs + 3 Tabs
- Goal: `/campaigns/[id]` Page mit Header + 5 KPI-Cards + 3 Tabs.
- Files: `cockpit/src/app/(app)/campaigns/[id]/page.tsx`, `_components/{leads,deals,tracking-links}-tab.tsx`
- Expected behavior: Server-Component holt Campaign + KPIs via getCampaign. Header zeigt name/type/status. KPIs als Card-Grid. Tabs als Card-Layout (3 Tabs nebeneinander). Tracking-Links-Tab zeigt Coming-Soon.
- Verification: Browser-Smoke. KPI-Counts korrekt nach Test-Daten (manuell INSERT contact mit campaign_id, refresh → lead_count=1).
- Dependencies: MT-3

#### MT-6: CampaignPicker-Component
- Goal: Wiederverwendbare Combobox fuer Stammdaten.
- Files: `cockpit/src/components/campaigns/campaign-picker.tsx`
- Expected behavior: Combobox mit Search, lade per listCampaigns({status:'active|draft'}). onChange-Handler. Empty-State + Link.
- Verification: Component-Test (Render mit 0 Campaigns → Empty-State, Render mit 5 → Combobox).
- Dependencies: MT-3

#### MT-7: Stammdaten-Edit-Forms erweitern
- Goal: CampaignPicker in 3 Forms integrieren.
- Files: `cockpit/src/app/(app)/contacts/[id]/edit-form.tsx`, `companies/[id]/edit-form.tsx`, `deals/new-deal-form.tsx` (oder Pipeline-Modal)
- Expected behavior: CampaignPicker-Field nach geeignetem Anker (z.B. nach address_country). Save persistiert campaign_id. Deal-Create: Auto-Vorbelegung via useEffect bei Primary-Contact-Aenderung.
- Verification: Browser-Smoke pro Form. Save persistiert in DB (manueller SELECT).
- Dependencies: MT-6

#### MT-8: Schema-Smoke-Test
- Goal: Vitest gegen Coolify-DB.
- Files: `cockpit/src/__tests__/campaigns-schema.test.ts`
- Expected behavior: Tests fuer Schema-Idempotenz, UNIQUE-Constraints (case-insensitive name, partial external_ref), ON DELETE SET NULL (Campaign-Delete setzt contact.campaign_id NULL).
- Verification: `vitest run campaigns-schema.test.ts` gegen Coolify-DB gruen.
- Dependencies: MT-2, MT-3

#### MT-9: Cockpit-Records aktualisieren + commit
- Goal: STATE.md, slices/INDEX.md, features/INDEX.md + RPT.
- Files: `slices/INDEX.md`, `features/INDEX.md`, `docs/STATE.md`, `reports/RPT-XXX.md`
- Expected behavior: SLC-624 done, FEAT-622 in_progress, STATE.md naechste = SLC-625.
- Verification: git diff + commit-push.
- Dependencies: MT-1..MT-8 abgeschlossen

## QA-Fokus (fuer /qa SLC-624)

- **Schema-Validierung**: campaigns + 3 FK-Spalten existieren, RLS aktiv, GRANTS sauber.
- **CRUD-Roundtrip**: Listing, New, Edit, Archive, Delete vollstaendig durchfuehrbar.
- **Duplikat-Test**: 2 Campaigns mit gleichem Namen unterschiedlicher Case → reject.
- **Date-Range-Test**: end_date < start_date → reject.
- **KPI-Korrektheit**: 1 Test-Campaign anlegen, 3 Test-Contacts mit campaign_id, 1 Test-Deal mit campaign_id+status='won' → KPI-Cards zeigen korrekte Counts.
- **Stammdaten-Picker**: CampaignPicker rendert in allen 3 Edit-Forms (Contact/Company/Deal). Save persistiert.
- **Auto-Vorbelegung**: Deal-Create-Test — Primary-Contact mit Kampagne setzen → Deal-campaign_id wird vorbelegt.
- **Override**: User kann andere Kampagne waehlen oder leeren.
- **Detail-Page**: 3 Tabs rendern, Tracking-Links-Tab zeigt Coming-Soon-Card.
- **Delete-Confirm**: Loeschen-Dialog warnt vor Verlust, archive-Hinweis sichtbar.
- **TypeScript + Vitest + ESLint**: gruen.
- **Style Guide V2**: Card-Layout konsistent, Badge-Color, Form-Field-Spacing.
