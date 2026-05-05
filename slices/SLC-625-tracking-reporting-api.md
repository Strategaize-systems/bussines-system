# SLC-625 — Tracking-Links + Reporting + Read-API + Funnel-Filter

## Meta
- Feature: FEAT-622
- Priority: High
- Status: planned
- Created: 2026-05-05
- Estimated Effort: 5-8h

## Goal

Den letzten V6.2-Slice live schalten: Tracking-Link-CRUD pro Kampagne, Public Redirect-Endpoint `/r/[token]` mit Click-Log + IP-Hash, UTM→Campaign-Mapping (DEC-135 hybrid), First-Touch-Lock auf contacts.campaign_id (DEC-138), Reporting-Page-KPIs mit echten Klickzahlen, Funnel-Report-Filter (existing `/pipeline`-Page erweitern), neue Read-API `/api/campaigns/[id]/performance` mit Bearer-Auth (DEC-140 FEAT-504-Pattern), und neuer Lead-Intake-Endpoint `/api/leads/intake` (existiert nicht, Public mit eigenem Bearer-Token).

Mit Abschluss von SLC-625 ist FEAT-622 vollstaendig — V6.2 bereit fuer Gesamt-/qa + Final-Check + Go-Live + Deploy als REL-024.

## Scope

- **MIG-029 Teil 3** (selbe SQL-File, idempotent — wird zum 3. Mal applied):
  - `campaign_links`-Tabelle: `id, campaign_id (FK CASCADE), token (UNIQUE), target_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, label, click_count, created_at`
  - 1 Index: `idx_campaign_links_campaign ON (campaign_id)`
  - `campaign_link_clicks`-Tabelle: `id, link_id (FK CASCADE), clicked_at, ip_hash, user_agent (truncated 200), referer (truncated 500)`
  - 1 Index: `idx_campaign_link_clicks_link_time ON (link_id, clicked_at DESC)` (Vorbereitung fuer 90-Tage-Cleanup BL-XXX V6.3+)
  - RLS `authenticated_full_access` auf beide
  - GRANTS auf authenticated, service_role
- **Token-Generator** (`cockpit/src/lib/campaigns/token.ts` neu, DEC-137):
  - `generateCampaignToken(): string` via Node-stdlib `crypto.randomBytes(6).toString('base64url')` → 8 chars URL-safe
  - Retry-Logic: bei UNIQUE-Conflict in saveCampaignLink → max 5x retry mit neuen Token
- **Tracking-Link Server Actions** (`cockpit/src/app/(app)/campaigns/[id]/actions.ts` neu):
  - `createCampaignLink(campaignId, params)` — INSERT campaign_links mit generateCampaignToken. Validation: target_url ist absolute URL, utm_source+medium+campaign NOT NULL, utm_content+term optional.
  - `listCampaignLinks(campaignId)` — SELECT campaign_links + click_count.
  - `deleteCampaignLink(linkId)` — DELETE (CASCADE entfernt clicks).
- **Public Redirect-Endpoint** (`cockpit/src/app/r/[token]/route.ts` neu, **public KEIN Auth**):
  - GET-Handler: SELECT campaign_links WHERE token=$X
  - Wenn nicht gefunden: 302 Redirect zu `https://strategaize.com/404` (oder konfigurierbar)
  - Click-Log async (kein await — Redirect first):
    - `void logClick(link.id, req).catch(logErr)`
    - logClick macht 2 Parallel-INSERTs: `campaign_link_clicks` + `UPDATE campaign_links SET click_count=click_count+1`
  - UTM-Params an target_url anhaengen (oder beibehalten falls schon da):
    - Helper `appendUtmIfMissing(url, link)` — pure-function
  - 302-Redirect mit Cache-Control: no-store
- **IP-Hashing** (DSGVO-konform, V5.2-Pattern):
  - `cockpit/src/lib/campaigns/ip-hash.ts` neu — `hashIp(ip: string): string` via `crypto.createHash('sha256').update(ip + IP_HASH_SALT).digest('hex')`
  - IP-Source: `req.headers.get('x-forwarded-for')` oder `x-real-ip` (Coolify-Traefik liefert beides), erstes IP aus comma-separated Liste, NULL wenn nicht vorhanden
  - SALT als ENV `IP_HASH_SALT` (rotation-bar). Default-Constant fuer V1-Internal-Test, Pre-Production-Env-Setup vor erstem Kunden.
- **UTM→Campaign-Mapper** (`cockpit/src/lib/campaigns/mapper.ts` neu, DEC-135):
  ```typescript
  export async function resolveCampaignFromUtm(utm: UtmParams): Promise<string | null>;
  ```
  - Priority 1: external_ref Match — wenn `utm_source='system4'` AND `utm_content`-set, lookup campaigns WHERE external_ref=utm_content
  - Priority 2: utm_campaign = campaigns.name (case-insensitive trim) — lookup campaigns WHERE LOWER(name)=LOWER(trim(utm_campaign))
  - Returnt campaign.id oder null
- **Lead-Intake-Endpoint** (`cockpit/src/app/api/leads/intake/route.ts` neu):
  - POST mit Bearer-Auth via `verifyExportApiKey(req)` (FEAT-504-Pattern). System 4 nutzt EXPORT_API_KEY (existing ENV).
  - Body-Schema: `{ first_name, last_name, email, phone?, company_name?, company_website?, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, notes? }`
  - Pflicht: first_name + last_name + email
  - Logic:
    1. Lookup existierender Contact via email (case-insensitive)
    2. Resolve campaign_id via resolveCampaignFromUtm(utm-Felder)
    3. Wenn neuer Contact: INSERT contacts mit campaign_id (kein First-Touch-Konflikt)
    4. Wenn existierender Contact: UPDATE contacts SET campaign_id = COALESCE(campaign_id, $new), source = COALESCE(source, $utm_source) (First-Touch-Lock DEC-138)
    5. Optional: Wenn company_name vorhanden, gleicher Lookup auf companies (oder Insert), contact.company_id setzen, company.campaign_id mit COALESCE
    6. Audit-Log Insert: action='lead_intake', actor_id=NULL, context='Lead-Intake from System 4'
  - Response: `{ contact_id, was_new: bool, campaign_id?: string }`
- **First-Touch-Lock** (DEC-138, in Lead-Intake-Endpoint integriert):
  - SQL-Pattern: `UPDATE contacts SET campaign_id = COALESCE(campaign_id, $new) WHERE id=$id`
  - Konsequenz: existierender Contact mit campaign_id behaelt seine first-touch attribution. Click-Log enthaelt Multi-Touch-Visibility ohne campaign_id-Override (BL-XXX V6.3+ Multi-Touch-Tab).
- **Reporting-Page Tracking-Links-Tab live** (`cockpit/src/app/(app)/campaigns/[id]/_components/tracking-links-tab.tsx` MODIFY):
  - Coming-Soon-Skelett aus SLC-624 wird ersetzt
  - Liste der Tracking-Links pro Campaign (existing campaign_links + click_count)
  - "Neuer Link"-Button → Modal mit Form (target_url, utm_source/medium/campaign/content/term, label)
  - Bei Save: createCampaignLink Server-Action, Token wird automatisch generiert, vollstaendige `https://app.../r/<token>` URL angezeigt + Copy-Button
  - Pro Link: target_url, utm-Params, Token, click_count, "Loeschen"-Button mit Confirm-Dialog
  - Klicks-Chart letzte 30 Tage (sparkline oder einfacher Bar-Chart, Style Guide V2 chart-Pattern wenn vorhanden, sonst plain numbers + Counter)
- **Funnel-Filter Integration** (DEC-139):
  - Existing `/pipeline`-Page hat funnel-report.tsx als Component eingebettet (NICHT eigener `/funnel`-Pfad, korrigiert nach OTQ-Audit)
  - Filter-Bar in `/pipeline` bekommt einen neuen Dropdown "Kampagne" zwischen "Pipeline" und Suche
  - Backend-Query in `cockpit/src/app/(app)/pipeline/actions.ts:listDealsForBoard` (oder analog) erweitert um optionalen `WHERE deals.campaign_id=$X` Filter
  - URL-Param `?campaign=<id>` persistiert die Auswahl (deep-link-able)
  - Funnel-Report-Component zeigt scoped-Daten wenn Filter gesetzt
- **Read-API Endpoint** (`cockpit/src/app/api/campaigns/[id]/performance/route.ts` neu, DEC-140):
  - GET mit Bearer-Auth via `verifyExportApiKey(req)` (FEAT-504-Pattern aus existing `cockpit/src/lib/export/auth.ts`)
  - Returns JSON: `{ campaign_id, name, external_ref, leads, deals, won_deals, won_value, conversion_rate, click_count_total, click_count_last_30d, first_lead_at, last_activity_at }`
  - Berechnung via getCampaign + JOINs auf campaign_link_clicks fuer Klickzahlen
- **CSV-Export** (Reuse `/api/export/*`-Pattern):
  - Detail-Page bekommt "Export Leads als CSV" + "Export Deals als CSV" Buttons (wenn Tab aktiv)
  - Reuse existing CSV-Helper fuer Contacts/Deals (V5.x), filter scoped auf campaign_id
- **Cron-Endpoint Coolify-Setup-Hinweis**:
  - SLC-625 fuegt KEINEN neuen Cron — der `automation-runner`-Cron aus SLC-622 ist der einzige neue
  - Click-Log-Cleanup-Cron `campaign-cleanup` ist als **BL-XXX V6.3+** angelegt (NICHT V1-Scope, Index ist nur vorbereitet)
- **REL-024-Notes Final**:
  - Cron-Setup-Anleitung (SLC-622 hat das schon vorbereitet)
  - SQL-Migration-Apply-Reihenfolge (1x finale Apply mit allen drei Teilen)
  - System-4-Integration-Hinweis: EXPORT_API_KEY ENV teilen, Lead-Intake-Endpoint erklaeren
  - Pre-Production-Hint: IP_HASH_SALT ENV setzen vor erstem Kunden (DSGVO-Compliance, BL-XXX als Polish-Item)
- **Schema-Smoke-Test erweitern** (`cockpit/src/__tests__/campaigns-schema.test.ts` MODIFY):
  - Tests fuer campaign_links + campaign_link_clicks Schema
  - CASCADE-Delete-Test: Campaign-Delete entfernt links + clicks
- **Cockpit-Records-Update**:
  - `slices/INDEX.md`: SLC-625 Status `planned -> done`
  - `features/INDEX.md`: FEAT-622 Status `in_progress -> done`
  - `planning/backlog.json`: BL-139 Status `in_progress -> done`
  - `docs/STATE.md`: naechste = Gesamt-/qa V6.2 + /final-check + /go-live + /deploy

## Out of Scope

- Multi-Touch-Attribution (BL-XXX V6.3+)
- Click-Log-Cleanup-Cron (BL-XXX V6.3+, nur Index vorbereiten)
- Auto-Source-Migration (BL-XXX V6.3+)
- A/B-Testing (V6.2 Out-of-Scope)
- Push-Webhooks zu System 4 (Read-API reicht V1)
- Cookie-basiertes Cross-Session-Tracking (V6.2 Out-of-Scope)
- Eigener Form-Builder (V6.2 Out-of-Scope, System 4 macht das)
- Real-time Dashboard-Updates (Polling reicht)
- Rate-Limiting auf /r/[token]-Endpoint (BL-XXX wenn Brute-Force-Verdacht)
- IP-Hash-Salt-Rotation-Mechanismus (BL-XXX wenn Pre-Production-Compliance)

## Acceptance Criteria

- AC1: MIG-029 Teil 3 idempotent — Apply zweimal hintereinander ohne Fehler.
- AC2: campaign_links + campaign_link_clicks-Tabellen existieren mit FKs, Indizes, RLS.
- AC3: `generateCampaignToken()` returnt 8-char base64url-String. UNIQUE-Constraint greift.
- AC4: `createCampaignLink({campaignId, target_url, utm_source, utm_medium, utm_campaign})` persistiert mit Token, returnt Link.
- AC5: `createCampaignLink` mit invalidem target_url (z.B. "ftp://...") wird abgelehnt.
- AC6: `/r/<token>` GET → 302 zu target_url mit utm-Params angehaengt.
- AC7: `/r/<unknown-token>` → 302 zu 404-Page.
- AC8: Klick auf `/r/<token>` inserted campaign_link_clicks-Eintrag mit ip_hash (SHA-256 + Salt).
- AC9: campaign_links.click_count wird bei jedem Klick um 1 erhoeht.
- AC10: Klick-Log-Insert ist async (kein blockierender Redirect — verifiziert via Latency-Test <100ms).
- AC11: ip_hash NICHT als Klartext-IP — verifiziert via DB-SELECT.
- AC12: `resolveCampaignFromUtm({utm_source:'system4', utm_content:'sys4-camp-42'})` lookups external_ref.
- AC13: `resolveCampaignFromUtm({utm_campaign:'My Campaign'})` lookups LOWER(name) case-insensitive.
- AC14: `resolveCampaignFromUtm({})` returnt null.
- AC15: POST `/api/leads/intake` mit gueltigen Bearer-Token + Body persistiert neuen Contact mit campaign_id.
- AC16: POST `/api/leads/intake` mit existierendem Contact (gleiche email) updates contact, behaelt original campaign_id (First-Touch-Lock via COALESCE).
- AC17: POST `/api/leads/intake` ohne Bearer-Token → 401.
- AC18: Tracking-Links-Tab in Detail-Page zeigt Liste vorhandener Links + click_count.
- AC19: "Neuer Link"-Modal-Form persistiert mit Save → Token wird angezeigt + Copy-Button vorhanden.
- AC20: Klicks-Chart letzte 30 Tage rendert (auch wenn 0 Klicks — Empty-State).
- AC21: Funnel-Report-Filter "Kampagne" rendert in `/pipeline`-Filter-Bar.
- AC22: Filter-Auswahl scopt Funnel-Report-Daten + URL-Param `?campaign=<id>` persistiert.
- AC23: GET `/api/campaigns/[id]/performance` mit Bearer-Token returnt JSON mit allen 11 Feldern.
- AC24: GET ohne Bearer-Token → 401.
- AC25: CSV-Export "Leads" + "Deals" funktioniert auf Detail-Page.
- AC26: TypeScript-Build (`npm run build`) gruen.
- AC27: Vitest (`npm run test`) gruen — neue Tests fuer token, mapper, ip-hash, lead-intake-endpoint, redirect-endpoint, performance-endpoint.
- AC28: ESLint (`npm run lint`) gruen.
- AC29: Browser-Smoke Desktop: Vollstaendiger Workflow (Detail → Neuer Tracking-Link → URL kopieren → URL im neuen Tab oeffnen → 302-Redirect → Click-Count um 1 hoch).
- AC30: Smoke-Test System-4-Mock: curl POST /api/leads/intake mit Bearer-Token + UTM-Body → Contact + campaign_id persistiert; curl GET /api/campaigns/[id]/performance mit Bearer-Token → JSON-KPIs.

## Dependencies

- SLC-624 — campaigns-Tabelle, campaign_id-FKs, CampaignPicker, Server-Actions, Detail-Page-Skelett mit Tabs
- V4.1 audit_log Pattern fuer System-Inserts (`actor_id=NULL`)
- V5.2 IP-Hash-Salt-Pattern (existing oder neu in V6.2)
- V5.x verifyExportApiKey-Helper aus FEAT-504 (`cockpit/src/lib/export/auth.ts`)
- V3.3 Funnel-Report Component (existing `cockpit/src/app/(app)/pipeline/funnel-report.tsx`)
- V2 Pipeline-Page + Filter-Bar (existing)
- V5.x CSV-Export-Helpers (Reuse fuer scoped-Export)
- Coolify-DB-Zugriff fuer MIG-029 Teil 3 Apply
- Coolify-ENV `EXPORT_API_KEY` (existing) + `IP_HASH_SALT` (neu, V1 Default-Constant)

## Risks

- **Risk:** Public `/r/[token]`-Endpoint ohne Auth wird brute-force-attacked.
  Mitigation: 8-char Token mit ~2.8e14 Combos. Bei realer Brute-Force (z.B. >100 unknown-tokens/min): BL-XXX V6.3+ fuer Edge-Rate-Limit. V1 Internal-Test-Mode toleriert kein Rate-Limit.
- **Risk:** Click-Log skaliert nicht — bei viralem Link 1000s Clicks/Stunde fuellen DB.
  Mitigation: V1 Single-User mit ~3-5 Kampagnen ist <1000 Clicks/Tag. Cleanup-Cron BL-XXX V6.3+ fuer 90-Tage-Retention. Index `idx_campaign_link_clicks_link_time DESC` ist Cleanup-vorbereitet.
- **Risk:** UTM-Mapping case-insensitive collidiert wenn 2 Kampagnen "ABC" und "abc" existieren.
  Mitigation: campaigns.name UNIQUE auf LOWER(name) (siehe SLC-624) — Konflikt ausgeschlossen.
- **Risk:** First-Touch-Lock laesst Spam-Mass-Submissions auf Contact unveraendert.
  Mitigation: Lead-Intake-Endpoint erfordert Bearer-Token. Spam waere Insider-Threat (System 4 kompromittiert). Out-of-V6.2-Scope, Bedrohungsmodell-Annahme.
- **Risk:** ip_hash ohne Salt ist rainbow-table-attackbar.
  Mitigation: SHA-256 + IP_HASH_SALT-ENV. V1 Internal-Test toleriert Default-Constant-Salt. Pre-Production: User setzt eigenen Salt-Wert.
- **Risk:** Lead-Intake-Endpoint ist nicht idempotent — System 4 sendet zweimal selben Lead.
  Mitigation: email-basierte Deduplikation (UPDATE wenn email existiert). Test-AC16 verifiziert First-Touch-Lock.
- **Risk:** Funnel-Filter scopt nur deals.campaign_id, aber existing funnel-report.tsx filtert auf `s.probability > 0 && s.probability < 100` (ohne campaign).
  Mitigation: actions.ts:listDealsForBoard erweitert mit optionalem campaign-Filter, funnel-report-Komponente bleibt unveraendert (bekommt nur scoped deals als props). Reuse-Pattern.
- **Risk:** /api/leads/intake antwortet langsam wegen 3 INSERTs + audit_log + UTM-Lookup.
  Mitigation: Parallel-Insert wo moeglich (contact + company gemeinsam, audit_log async). <500ms-Ziel. Test-AC verifiziert.
- **Risk:** Read-API gibt Daten heraus, der API-Key kompromittiert ist.
  Mitigation: EXPORT_API_KEY rotation-faehig (existing ENV). User dreht im Pre-Production-Setup. V1 toleriert.
- **Risk:** CSV-Export greift auf alle Leads/Deals der Campaign zu — Performance bei vielen.
  Mitigation: V1 Single-User <100 Leads/Campaign, <30 Deals/Campaign. CSV streaming nicht V1-Scope, einfacher full-load OK.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/029_v62_automation_and_campaigns.sql` | MODIFY — campaign_links + campaign_link_clicks-Anteil ergaenzen |
| `cockpit/src/types/campaign.ts` | MODIFY — CampaignLink, CampaignLinkClick, UtmParams, CampaignPerformance |
| `cockpit/src/lib/campaigns/token.ts` | NEU — generateCampaignToken |
| `cockpit/src/lib/campaigns/ip-hash.ts` | NEU — hashIp mit SHA-256 + Salt |
| `cockpit/src/lib/campaigns/mapper.ts` | NEU — resolveCampaignFromUtm (DEC-135 hybrid) |
| `cockpit/src/lib/campaigns/utm-helpers.ts` | NEU — appendUtmIfMissing pure-function |
| `cockpit/src/app/(app)/campaigns/[id]/actions.ts` | NEU — createCampaignLink, listCampaignLinks, deleteCampaignLink |
| `cockpit/src/app/r/[token]/route.ts` | NEU — Public Redirect-Endpoint (kein Auth) |
| `cockpit/src/app/api/leads/intake/route.ts` | NEU — Lead-Intake mit Bearer-Auth |
| `cockpit/src/app/api/campaigns/[id]/performance/route.ts` | NEU — Read-API mit Bearer-Auth |
| `cockpit/src/app/(app)/campaigns/[id]/_components/tracking-links-tab.tsx` | MODIFY — Coming-Soon ersetzen mit Liste + New-Link-Modal |
| `cockpit/src/app/(app)/campaigns/[id]/_components/new-link-modal.tsx` | NEU — Modal-Form fuer createCampaignLink |
| `cockpit/src/app/(app)/campaigns/[id]/_components/clicks-chart.tsx` | NEU — Sparkline / Bar-Chart letzte 30 Tage |
| `cockpit/src/app/(app)/pipeline/page.tsx` | MODIFY — Filter-Bar Campaign-Dropdown ergaenzen |
| `cockpit/src/app/(app)/pipeline/actions.ts` | MODIFY — listDealsForBoard mit optional campaign-Filter |
| `cockpit/src/lib/campaigns/__tests__/token.test.ts` | NEU |
| `cockpit/src/lib/campaigns/__tests__/mapper.test.ts` | NEU |
| `cockpit/src/lib/campaigns/__tests__/ip-hash.test.ts` | NEU |
| `cockpit/src/__tests__/campaigns-schema.test.ts` | MODIFY — campaign_links + campaign_link_clicks Tests + CASCADE-Test |
| `cockpit/src/__tests__/redirect-endpoint.test.ts` | NEU — End-to-End-Test fuer /r/[token] |
| `cockpit/src/__tests__/lead-intake-endpoint.test.ts` | NEU |
| `cockpit/src/__tests__/performance-endpoint.test.ts` | NEU |
| `docs/RELEASES.md` | MODIFY — REL-024-Notes finalisieren |
| `slices/INDEX.md` | MODIFY |
| `features/INDEX.md` | MODIFY — FEAT-622 done |
| `planning/backlog.json` | MODIFY — BL-139 done + 3 neue BL-Items (V6.3+) |
| `docs/STATE.md` | MODIFY — naechste = Gesamt-/qa V6.2 |

## Micro-Tasks

#### MT-1: SQL-Migration Tracking-Anteil
- Goal: campaign_links + campaign_link_clicks Tabellen.
- Files: `sql/migrations/029_v62_automation_and_campaigns.sql`
- Expected behavior: 2 neue Tabellen mit FKs CASCADE, 2 Indizes, RLS, GRANTS. Idempotent.
- Verification: Coolify-DB-Apply ohne Fehler. `\d campaign_links`, `\d campaign_link_clicks`.
- Dependencies: SLC-624 abgeschlossen

#### MT-2: Pure-Functions (Token, IP-Hash, UTM-Helpers, Mapper)
- Goal: 4 zentrale Helpers ohne Side-Effects.
- Files: `cockpit/src/lib/campaigns/{token,ip-hash,utm-helpers,mapper}.ts`, `__tests__/` analog
- Expected behavior: generateCampaignToken (8-char base64url), hashIp (SHA-256 + Salt), appendUtmIfMissing (URL-Param-Merge), resolveCampaignFromUtm (Priority-1 external_ref, Priority-2 LOWER(name)). Alle Pure (resolveCampaignFromUtm hat DB-IO, aber type-pure).
- Verification: Vitest pro File mit happy-path + edge-cases.
- Dependencies: MT-1 (resolveCampaignFromUtm braucht campaign_links nicht, aber will MIG-029 finalised)

#### MT-3: Tracking-Link Server-Actions
- Goal: 3 Server-Actions im campaigns-Scope.
- Files: `cockpit/src/app/(app)/campaigns/[id]/actions.ts`
- Expected behavior: createCampaignLink (mit Token-Retry), listCampaignLinks, deleteCampaignLink. Validation client + serverseitig.
- Verification: Vitest gegen Coolify-DB. Roundtrip create → list → delete + CASCADE-clicks-Delete.
- Dependencies: MT-1, MT-2

#### MT-4: Public Redirect-Endpoint /r/[token]
- Goal: 302-Redirect + async Click-Log.
- Files: `cockpit/src/app/r/[token]/route.ts`
- Expected behavior: GET-Handler, SELECT link, void logClick, 302 zu target_url+utm. Cache-Control: no-store.
- Verification: Vitest mit mock-NextRequest. Latency <100ms (await link-select, void log+update). Manueller Test im Dev-Server: curl -I `/r/<token>` zeigt 302 Location.
- Dependencies: MT-3

#### MT-5: Tracking-Links-Tab UI live
- Goal: Coming-Soon ersetzen, neue Komponenten.
- Files: `cockpit/src/app/(app)/campaigns/[id]/_components/tracking-links-tab.tsx`, `_components/new-link-modal.tsx`, `_components/clicks-chart.tsx`
- Expected behavior: Tab zeigt Liste vorhandener Links + click_count + Loeschen-Button. New-Link-Modal Form (target_url, utm-Params, label). Auf Save: Server-Action createCampaignLink, redirect mit Toast "Link erstellt", Token-URL angezeigt + Copy-Button. Clicks-Chart Sparkline (oder einfacher numbers-Counter wenn kein Sparkline-Lib).
- Verification: Browser-Smoke Detail-Page → Tracking-Links-Tab → Neuer Link → URL kopieren → URL im neuen Tab → 302 Redirect zu target → click_count refresh.
- Dependencies: MT-3, MT-4

#### MT-6: Lead-Intake-Endpoint
- Goal: POST /api/leads/intake mit Bearer-Auth.
- Files: `cockpit/src/app/api/leads/intake/route.ts`, `cockpit/src/__tests__/lead-intake-endpoint.test.ts`
- Expected behavior: verifyExportApiKey, Body-Validation, Lookup contact via email, resolveCampaignFromUtm, INSERT/UPDATE contact mit campaign_id (COALESCE-Pattern fuer First-Touch-Lock), optional company. Audit-Log mit actor_id=NULL.
- Verification: Vitest mit mock-Bearer + utm-Params. 4 Cases: neuer Contact, existierender Contact (campaign_id-Lock), ohne utm (campaign_id=NULL), ohne Auth (401).
- Dependencies: MT-2

#### MT-7: Read-API /api/campaigns/[id]/performance
- Goal: GET-Endpoint mit Bearer-Auth + KPI-JSON.
- Files: `cockpit/src/app/api/campaigns/[id]/performance/route.ts`, `cockpit/src/__tests__/performance-endpoint.test.ts`
- Expected behavior: verifyExportApiKey, getCampaign + JOINs auf clicks fuer click_count_total + click_count_last_30d. Return JSON.
- Verification: Vitest mit mock-Bearer. Manueller curl-Test gegen Live-Test-Campaign.
- Dependencies: SLC-624 abgeschlossen (getCampaign existing)

#### MT-8: Funnel-Filter Integration
- Goal: Campaign-Filter in /pipeline-Page.
- Files: `cockpit/src/app/(app)/pipeline/page.tsx`, `cockpit/src/app/(app)/pipeline/actions.ts`
- Expected behavior: Filter-Bar bekommt Campaign-Dropdown (Reuse CampaignPicker oder einfacher Select). URL-Param `?campaign=<id>` per Next.js searchParams. listDealsForBoard nimmt optional campaign_id und filtert via WHERE.
- Verification: Browser-Smoke /pipeline?campaign=<id> zeigt nur deals der Campaign. Funnel-Report-Komponente reagiert auf prop-Aenderung.
- Dependencies: MT-3

#### MT-9: CSV-Export-Erweiterung
- Goal: Export Leads + Export Deals im Detail-Page.
- Files: `cockpit/src/app/(app)/campaigns/[id]/_components/leads-tab.tsx` (MODIFY), `_components/deals-tab.tsx` (MODIFY) — "Export CSV" Button reuse existing Export-Helpers
- Expected behavior: Buttons triggern existing CSV-Export-Endpoint mit Filter-Param `campaign_id=<id>`. Datei-Download.
- Verification: Browser-Smoke Klick → CSV-Datei downloadet, Inhalt korrekt scoped.
- Dependencies: SLC-624 abgeschlossen (Detail-Page Tabs existing)

#### MT-10: Schema-Smoke-Test erweitern
- Goal: campaign_links + campaign_link_clicks + CASCADE-Tests.
- Files: `cockpit/src/__tests__/campaigns-schema.test.ts` (MODIFY)
- Expected behavior: Tests fuer 2 neue Tabellen + CASCADE-Delete (Campaign-Delete entfernt links + clicks).
- Verification: `vitest run campaigns-schema.test.ts` gegen Coolify-DB gruen.
- Dependencies: MT-1

#### MT-11: REL-024-Notes finalisieren
- Goal: docs/RELEASES.md fertig fuer Deploy.
- Files: `docs/RELEASES.md`
- Expected behavior: REL-024-Eintrag final mit Date=planned, Scope, Risks, Rollback-Notes, Coolify-Cron-Setup-Anleitung (von SLC-622), System-4-Integration-Notes (Bearer-Token, Lead-Intake, Read-API), Pre-Production-Hint (IP_HASH_SALT-ENV setzen).
- Verification: REL-024 liest sich self-explanatory. /deploy-Skill kann das direkt nutzen.
- Dependencies: MT-6, MT-7, MT-8

#### MT-12: Cockpit-Records aktualisieren + commit
- Goal: STATE.md + Indizes + 3 neue BL-Items + RPT.
- Files: `slices/INDEX.md`, `features/INDEX.md`, `planning/backlog.json`, `docs/STATE.md`, `reports/RPT-XXX.md`
- Expected behavior: SLC-625 done, FEAT-622 done, BL-139 done, STATE.md naechste = Gesamt-/qa V6.2. 3 neue BL-Items: Click-Log-Cleanup-Cron, Source-Migration-Tool, Multi-Touch-Tab.
- Verification: git diff + commit-push.
- Dependencies: MT-1..MT-11 abgeschlossen

## QA-Fokus (fuer /qa SLC-625)

- **Schema-Validierung**: campaign_links + campaign_link_clicks existieren mit FKs, Indizes, RLS, GRANTS.
- **Token-Generation**: 100x generateCampaignToken erzeugt 100 unterschiedliche Tokens (kein Collision).
- **Public-Redirect-Smoke**: curl -I `/r/<token>` → 302 + Location-Header korrekt. Click-Count um 1 erhoeht.
- **Click-Log-Smoke**: campaign_link_clicks-Eintrag entstanden mit ip_hash (kein Klartext-IP), user_agent truncated.
- **Lead-Intake-Smoke**: curl POST `/api/leads/intake` mit Bearer-Token + UTM-Body → Contact erstellt mit campaign_id. Zweiter Aufruf mit gleicher email + anderer utm_campaign → campaign_id behalten (First-Touch-Lock).
- **UTM-Mapping**: 3 Cases — system4-external_ref Match, name-Match case-insensitive, no-match → null.
- **Read-API-Smoke**: curl GET `/api/campaigns/<id>/performance` mit Bearer-Token → JSON mit allen 11 Feldern.
- **Auth-Reject**: curl ohne Bearer → 401.
- **Funnel-Filter-Smoke**: `/pipeline?campaign=<id>` zeigt scoped Funnel-Report. URL persistiert.
- **CSV-Export**: Leads + Deals downloaden, Inhalt scoped.
- **DSGVO-Check**: ip_hash ist NICHT Klartext (DB-SELECT zeigt SHA-256-Hash).
- **TypeScript + Vitest + ESLint**: gruen.
- **Live-Smoke nach Coolify-Deploy**: Workflow End-to-End auf Live-System (Test-Campaign, Test-Link, Click, Lead-Intake, Read-API).
- **Performance**: /r/[token] Latency <100ms.
- **Style Guide V2**: Modal, Card, Button, Form-Field konsistent.
