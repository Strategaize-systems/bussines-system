# SLC-707 — Polish + Bulk-Reassign-UI + Mobile-Hamburger + VERWALTUNG-Split

## Metadata
- **Slice ID:** SLC-707
- **Version:** V7
- **Feature:** FEAT-502 (Bulk-Reassign), FEAT-701 (VERWALTUNG-Split + Mobile-Hamburger)
- **Status:** planned
- **Priority:** Medium (Closing-Slice, loest BL-437 + BL-457 + Bulk-Reassign-UI-Restbedarf)
- **Created:** 2026-05-12
- **Estimated Effort:** ~5-7h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-184 (Bulk-Reassign + Audit-Trail), DEC-189 (Mutate-Lockdown), DEC-192 (Mobile-Hamburger zentralisiert)
- **Reihenfolge-Pflicht:** **letzter V7-Slice** — nach SLC-701..706. Vor Gesamt-/qa V7 + /final-check + /go-live + /deploy.

## Goal

V7 schliessen mit drei Closing-Themen:
1. **Bulk-Reassign-Werkzeug** — UI + Preview-Mode + Atomic-Transaction + Audit-Trail (DEC-184). Loest finale Verwaltungs-Funktion in /settings/team.
2. **Mobile-Hamburger** (BL-457) — Sheet-Drawer im (app)/layout.tsx (DEC-192) fuer <md:768px.
3. **VERWALTUNG-Split** (BL-437) — Sidebar VERWALTUNG-Sektion split in `Mein Profil` + `Setup` (Mein Profil sichtbar fuer alle 3 Rollen, Setup nur fuer admin/teamlead).

Plus Slice-uebergreifender Style-Guide-V2-Sweep (alle V7-Pages auf Brand-Tokens pruefen, falls Hex-Drift entdeckt: fixen).

## Scope

**In Scope:**
- `cockpit/src/app/(app)/settings/team/invite-dialog.tsx` (MOD) — ISSUE-063 Display-Resolver-Fix (Team-Dropdown zeigt Team-Name statt UUID)
- `cockpit/src/app/(app)/team/[user_id]/_components/drilldown-sub-nav.tsx` (NEU) — Tab-Strip mein-tag/pipeline/aufgaben (Polish aus SLC-706 OpenPoints)
- `cockpit/src/app/(app)/team/[user_id]/layout.tsx` (MOD oder NEU) — Sub-Nav-Strip in Drilldown-Layout integriert
- `cockpit/src/lib/team/bulk-reassign.ts` (NEU) — Server Action mit assertRole, Preview-Mode + Apply-Mode, Two-Phase-Audit (AC2c), Atomic-Transaction mit SET LOCAL ROLE postgres, audit_log pro Tabelle
- `cockpit/src/app/(app)/settings/team/bulk-reassign-dialog.tsx` (NEU) — UI mit Source-Owner-Select + Target-Owner-Select + Filter (Pipeline, Status, Date-Range) + Preview-Button + Apply-Button + Confirm-Dialog
- `cockpit/src/lib/navigation/sidebar-config.ts` (MOD) — VERWALTUNG-Sektion split in `VERWALTUNG_MEIN` + `VERWALTUNG_SETUP`, Eintraege migriert
- `cockpit/src/components/layout/mobile-top-bar.tsx` (NEU) — Sticky-Top-Bar fuer <md mit Logo + Hamburger-Icon
- `cockpit/src/components/layout/sidebar.tsx` (MOD) — Mobile-Variant rendert in Sheet, Section-Headers + Sub-Group-Headers (`Mein Profil` / `Setup`)
- `cockpit/src/app/(app)/layout.tsx` (MOD) — Mobile-Top-Bar + Sheet-Drawer-Wrap, State-Management (useState fuer mobileSidebarOpen, kein localStorage)
- `cockpit/__tests__/team/bulk-reassign.test.ts` (NEU) — Vitest fuer Preview + Apply + Audit
- `cockpit/__tests__/playwright/mobile-sidebar.spec.ts` (NEU) — Mobile-Smoke 3 Rollen × Hamburger-Open/Close
- `cockpit/__tests__/playwright/verwaltung-split.spec.ts` (NEU) — VERWALTUNG-Split-Sicht-Test 3 Rollen
- Style-Guide-V2-Sweep ueber alle V7-Pages: V7-Verzeichnis grep nach `hex` und `bg-#`, fixen falls gefunden

**Out of Scope:**
- Auto-Routing-Logik (Round-Robin, PLZ-Mapping) → V7.5+
- Mobile-Drawer-State persistent ueber Sessions → NEIN (memory-only, DEC OTQ 10)
- Bulk-Reassign mit Cross-Team-Move → V7.x (V7-Constraint: nur within-Team)
- Sidebar-Notifications-Badges → V7.5+

## Acceptance Criteria

**AC1 (Bulk-Reassign Server Action — Preview-Mode):** `bulkReassignPreview({from, to, filter})` returnt `{tables: [{name, count}], total}`. Pro 8 Kerntabelle: COUNT(*) WHERE owner_user_id = $from AND match-filter. Read-Only-Query, kein UPDATE. Vitest mit Seed-Daten verifiziert Count-Korrektheit.

**AC2 (Bulk-Reassign Server Action — Apply-Mode):** `bulkReassignApply({from, to, filter})` mit `assertRole(['admin','teamlead'])`. Teamlead darf nur within-Team (`from.team_id == to.team_id == get_my_team_id()`). Pseudo-SQL:
```
BEGIN;
SET LOCAL ROLE postgres;
UPDATE companies SET owner_user_id = $to WHERE owner_user_id = $from AND <filter>;
INSERT INTO audit_log (event, ...) VALUES ('bulk_reassign', ...);
-- repeat fuer 8 Tabellen
COMMIT;
```
Audit-Eintrag pro Tabelle mit `affected_rows`, `from`, `to`, `filter`, `triggered_by_user_id`. Vitest verifiziert: Apply ueberschreibt owner_user_id, audit_log enthaelt **9 Eintraege** (1x `bulk_reassign_initiated` siehe AC2c + 8x `bulk_reassign_applied` pro Tabelle).

**AC2b (Bulk-Reassign Security — Defense-in-Depth):** Die Privileg-Eskalation via `SET LOCAL ROLE postgres` (RLS-Umgang fuer Bulk-Operation) ist nur zulaessig nach 4 Pflicht-Gates in dieser Reihenfolge:

1. **assertRole-Gate (BEFORE SET LOCAL):** `await assertRole(['admin','teamlead'])` als erste Zeile der Apply-Function. Member-Rolle wird mit `403 Forbidden` abgewiesen, bevor irgendeine DB-Verbindung aufgebaut wird.
2. **Team-Scope-Gate (BEFORE SET LOCAL):** Fuer `teamlead`-Rolle: `from.team_id === get_my_team_id() === to.team_id`. Cross-Team-Reassign wird abgelehnt. `admin`-Rolle uebersteuert (sieht alle Teams).
3. **Parametrisierte Filter (NO String-Concat):** Pipeline-IDs, Status-Werte, Date-Range gehen als parametrisierte Bind-Params (`$3, $4, ...`) in die UPDATE-Statements. Kein String-Concat von User-Input in SQL. Filter-Whitelist: nur `pipeline_id`, `status`, `created_at_from`, `created_at_to`.
4. **Initiated-Audit-Pre-Tx (siehe AC2c):** Vor `BEGIN` wird in **separater DB-Connection (ausserhalb der Tx)** ein `audit_log`-Eintrag `bulk_reassign_initiated` mit `triggered_by_user_id`, `requested_from`, `requested_to`, `filter_snapshot` geschrieben. Dieser Eintrag ueberlebt einen Transaction-Rollback (Forensik-Trail).

Vitest-Pflicht-Tests in `__tests__/team/bulk-reassign.test.ts`:
- `member-blocked-403` — Member ruft `bulkReassignApply`, erwartet Error mit `403`/`forbidden`-Marker, kein UPDATE ausgefuehrt
- `cross-team-blocked` — Teamlead ruft Apply mit `from.team_id !== to.team_id`, erwartet Error, kein UPDATE
- `filter-injection-safe` — Apply mit Filter-Wert `'; DROP TABLE companies; --` als Pipeline-ID-String, erwartet entweder Validation-Error oder leeres Result (keine ausgefuehrte SQL-Injection)

**AC2c (Bulk-Reassign Audit-Trail-Integrity — Two-Phase-Audit):** Audit-Trail ueberlebt Transaction-Failures, damit Forensik gescheiterte Bulk-Reassign-Versuche erkennt.

**Phase 1 — Initiated (ausserhalb Tx, eigene Connection):**
- Vor `BEGIN` wird ein `audit_log`-Eintrag mit `event = 'bulk_reassign_initiated'` ueber eine **separate DB-Connection (eigener Pool-Acquire, kein Reuse der Tx-Connection)** geschrieben.
- Felder: `triggered_by_user_id`, `requested_from`, `requested_to`, `filter_snapshot` (JSONB), `timestamp = now()`.
- Diese Zeile bleibt unabhaengig vom Tx-Outcome bestehen.

**Phase 2 — Applied (innerhalb Tx, pro Tabelle):**
- Pro UPDATE-Statement folgt ein `audit_log`-INSERT mit `event = 'bulk_reassign_applied'`, `table_name`, `affected_rows`, `triggered_by_user_id`.
- 8 Eintraege bei Erfolg, 0 bei Rollback.

**Ergebnis:**
- **Happy Path:** 9 Audit-Eintraege (1x initiated + 8x applied).
- **Failure Path:** 1 Audit-Eintrag (initiated, ohne applied-Follow-ups). User sieht Error-Toast, audit_log zeigt "tried at T".

Vitest-Pflicht-Tests in `__tests__/team/bulk-reassign.test.ts`:
- `audit-happy-path-9-entries` — Apply success, `SELECT * FROM audit_log WHERE event LIKE 'bulk_reassign_%'` returnt 9 Rows (1 initiated + 8 applied).
- `audit-failure-leaves-initiated-only` — Apply mit forciertem Constraint-Failure auf Tabelle 7 (z.B. invalid `to`-UUID), erwartet Rollback. Danach `SELECT * FROM audit_log WHERE event = 'bulk_reassign_initiated'` enthaelt 1 Row, `WHERE event = 'bulk_reassign_applied'` enthaelt 0 Rows.

**AC3 (Bulk-Reassign UI):** Dialog mit:
- Source-Owner-Select (alle Team-Mitglieder)
- Target-Owner-Select (alle Team-Mitglieder, ohne Source)
- Filter-Sub-Section: Pipeline-Multi-Select, Status-Multi-Select (`open` / `won` / `lost`), Date-Range-Picker
- "Vorschau"-Button → ruft Preview, zeigt Table mit Counts pro Tabelle
- "Reassign starten"-Button → erst nach Preview aktiv, oeffnet Confirm-Dialog mit Sum
- Confirm-Dialog → "Wirklich X Records von A zu B verschieben?" → Apply

Native-HTML-Form-Pattern, useTransition fuer Submit, Toasts fuer Success/Error.

**AC4 (Mobile-Hamburger Layout):** `(app)/layout.tsx` rendert `<MobileTopBar>` mit `className="md:hidden"`. Hamburger-Icon-Click oeffnet `<Sheet side="left">` mit Sidebar-Content (Mobile-Mode). Sheet schliesst bei Route-Change (Next.js `usePathname()` + `useEffect`) und bei Esc + Backdrop-Click (Sheet-Default).

**AC5 (Mobile-Sidebar-Content):** Sidebar im Mobile-Mode rendert vollstaendige Sektion-Struktur mit Sektion-Headers (`ANALYSE`, `TEAM`, `OPERATIV`, `ARBEITSBEREICHE`, `VERWALTUNG`). Innerhalb `VERWALTUNG`: Sub-Group-Header `Mein Profil` + `Setup` mit jeweiligen Items. Eintrag-Click navigiert + schliesst Drawer.

**AC6 (Desktop-Sidebar-VERWALTUNG-Split):** Auf Desktop sieht VERWALTUNG-Sektion 2 Sub-Group-Headers:
- `Mein Profil` (visibleFor: alle 3 Rollen) — Profile, Mail-Signatur, eigene Branding-Preferences
- `Setup` (visibleFor: admin + teamlead) — Einstellungen, Pipelines, Produkte, Workflows, Kampagnen, Team-Verwaltung, Compliance, Whisper, Briefing

Member sieht nur `Mein Profil`, Sub-Group-Header `Setup` ist fuer Member nicht sichtbar. Admin/Teamlead sehen beide Sub-Groups.

**Conditional Sub-Header-Render (Muster 1):** Bei nur **einer** sichtbaren Sub-Group fuer eine Rolle (Member-Fall — nur `Mein Profil`) wird der Sub-Group-Header `Mein Profil` **nicht** gerendert. Items erscheinen direkt unter dem Top-Sektion-Header `VERWALTUNG`. Sub-Group-Headers werden **nur bei ≥2 sichtbaren Sub-Groups** gerendert (Admin/Teamlead-Fall). Vermeidet visuell redundante Doppel-Header bei Member.

**AC7 (Mobile-State Memory-only, OTQ 10):** `mobileSidebarOpen` als React-State `useState(false)`. Kein localStorage. Route-Wechsel resetted auf `false` (via `useEffect([pathname])`).

**AC8 (Style-Guide-V2-Sweep — V7-Touched-Pages):** Sweep ueber alle V7-touched Bereiche:

```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" \
  cockpit/src/app/\(app\)/mein-tag \
  cockpit/src/app/\(app\)/team \
  cockpit/src/app/\(app\)/settings/team \
  cockpit/src/app/\(app\)/verwaltung \
  cockpit/src/app/\(app\)/pipeline \
  cockpit/src/app/\(app\)/dashboard \
  cockpit/src/components/layout
```

Erwartet: **0 Hex-Drift**. Brand-Tokens (z.B. `bg-brand-primary`, `text-brand-foreground`) durchgaengig. Fixes via Brand-Token-Replace falls Drift in V7-Touched-Pages gefunden.

**Pre-V7-Drift-Policy:** Drift in Pages **ausserhalb** V7-Scope (z.B. Legacy-Auth-Pages, alte Activity-Views) → als BL-Item dokumentieren, **nicht im SLC-707 fixen** (Scope-Schutz).

**AC9 (TSC + Vitest + Build + Lint + Playwright):** Alle Outputs clean. Playwright Mobile-Smoke 3-Rollen × Open-Close + VERWALTUNG-Split-Sicht 3-Rollen + Bulk-Reassign-Happy-Path PASS.

**AC10 (Live-Smoke nach Coolify-Redeploy):** 
- Bulk-Reassign: Admin verschiebt 5 Deals von Test-Member-A zu Test-Member-B, Preview zeigt 5, Apply funktioniert, Member-B sieht jetzt 5 mehr Deals, audit_log enthaelt Eintrag, alle 5 Deals sichtbar in Member-B-Session.
- Mobile: Browser-Resize auf 375×667 (iPhone-SE), Hamburger sichtbar, Klick oeffnet Drawer, Eintrag-Klick schliesst + navigiert.
- VERWALTUNG-Split: Admin/Teamlead/Member-Sessions zeigen Split korrekt.

## Reuse

- Style-Guide-V2 Brand-Tokens (V6.5)
- shadcn `<Sheet>` (mit Brand-Token-Override falls notwendig)
- shadcn `<AlertDialog>` fuer Confirm
- `assertRole` + `getProfile` aus SLC-702
- audit_log-Tabelle (V3 + view_as_target_user_id-Spalte aus MIG-033)
- SIDEBAR_CONFIG-Struktur aus SLC-702 (MOD: Sektion-Names umbenennen `VERWALTUNG` → `VERWALTUNG_MEIN` + `VERWALTUNG_SETUP` + Render-Group-Header fuer beide auf gleiches Top-Level-Sektion)
- Native-HTML-Form-Pattern (memory `feedback_native_html_form_pattern`)

## Risks

- **R1 — Bulk-Reassign-Transaction-Failure:** Wenn UPDATE auf 1 Tabelle scheitert, rollt Transaction zurueck. **Mitigation:** Two-Phase-Audit (AC2c) — `bulk_reassign_initiated`-Eintrag wird ausserhalb der Tx geschrieben und ueberlebt Rollback (Forensik-Trail), `bulk_reassign_applied`-Eintraege innerhalb der Tx werden bei Rollback mit-zurueckgerollt (Konsistenz). Server Action Try-Catch um die Tx mit Error-Toast bei Failure. Forensik kann ueber `SELECT event, count(*) FROM audit_log WHERE event LIKE 'bulk_reassign_%' GROUP BY event` die Failure-Versuche rekonstruieren.
- **R2 — Bulk-Reassign-Performance:** Wenn Filter sehr breit (z.B. 10000 Activities), UPDATE-Statement kann lange laufen. **Mitigation:** Preview-Mode zeigt Sum, Confirm-Dialog warnt bei Sum >1000 (`Achtung: Grosse Migration, kann 10+ Sek dauern`). Akzeptabel V7-Scope, V7.5 Async-Job falls noetig.
- **R3 — Mobile-Sheet z-Index-Konflikt:** Wenn Sheet hinter PageHeader oder Toast rendert, ist UX broken. **Mitigation:** shadcn `<Sheet>` hat z-50-Default. Playwright-Smoke verifiziert sichtbar.
- **R4 — VERWALTUNG-Split-Migration-Drift:** Wenn Sektion-Namen-Rename in SLC-702 SIDEBAR_CONFIG bereits anders ist, koennen Items verschwinden. **Mitigation:** SLC-702 MT-2 hat Sektion-Namen bereits gem. DEC-190 gesetzt (`VERWALTUNG_MEIN` + `VERWALTUNG_SETUP`). SLC-707 MOD ist nur Reorganisation + Sub-Group-Header-Render.
- **R5 — Mobile-Drawer-Schliesst-Nicht-Bei-Route-Wechsel:** Wenn `useEffect([pathname])` nicht greift, Drawer bleibt offen. **Mitigation:** AC4 + Playwright-Test inkl. Eintrag-Click-Verify-Closed.

## Verification Strategy

- **Pre:** SLC-702 SIDEBAR_CONFIG-Sektion-Namen verifizieren. SLC-704 8 Tabellen owner_user_id-aware.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** TSC + Build + Lint + Vitest + Playwright + Live-Smoke 3 Themen
- **QA-Pflicht:** /qa nach Slice — verifiziert AC1..AC10
- **Gesamt-/qa V7 NACH SLC-707:** verifiziert alle 7 Slices + Release-Gate aus Architecture-V7-Section + Vitest gegen Coolify-DB-Suite (96 RLS + 50+ Owner-Wiring + V7-Foundation + alle V6.6-Tests)

---

## Micro-Tasks

### MT-0: ISSUE-063 Team-Dropdown-Display-Resolver
- Goal: Bug aus ISSUE-063 fixen — Team-Dropdown im Invite-Dialog zeigt UUID statt Team-Name.
- Files: `cockpit/src/app/(app)/settings/team/invite-dialog.tsx` (MOD)
- Expected behavior: `<SelectValue>` mit Display-Override `{teams.find(t => t.id === teamId)?.name ?? teamId}`. Submit-Verhalten bleibt unveraendert.
- Verification: TSC clean. Manueller Browser-Smoke im Dev-Server: Invite-Dialog oeffnen, Team-Dropdown zeigt Team-Namen.
- Dependencies: none. Erster MT, ~5 min, einzelner File-Edit.
- Reference: KNOWN_ISSUES.md ISSUE-063 (Workaround dort dokumentiert).

### MT-1: Bulk-Reassign Server Action
- Goal: Server Action mit Preview + Apply.
- Files: `cockpit/src/lib/team/bulk-reassign.ts` (NEU), `cockpit/__tests__/team/bulk-reassign.test.ts` (NEU)
- Expected behavior: 2 exportierte Functions `bulkReassignPreview` + `bulkReassignApply`. assertRole, Team-Scope-Check, Transaction-Block, Audit-Insert pro Tabelle.
- Verification: Vitest 6+ Tests (preview-count-correct, apply-overwrites-owner, audit-log-8-entries, cross-team-blocked, transaction-rollback-on-error, performance-large-filter).
- Dependencies: SLC-704 abgeschlossen

### MT-2: Bulk-Reassign Dialog
- Goal: UI fuer Preview + Apply.
- Files: `cockpit/src/app/(app)/settings/team/bulk-reassign-dialog.tsx` (NEU)
- Expected behavior: Native-HTML-Form mit Source/Target-Selects + Filter-Section + Preview-Button + Apply-Button + Confirm-Dialog. useTransition fuer pending state.
- Verification: Manueller Dev-Test mit Test-Team-Daten.
- Dependencies: MT-1

### MT-3: Mobile-Top-Bar Component
- Goal: Top-Bar fuer <md.
- Files: `cockpit/src/components/layout/mobile-top-bar.tsx` (NEU)
- Expected behavior: Sticky-Top, Logo links, Hamburger rechts, `onClick={onMenuOpen}` Prop. Brand-Token-Farben.
- Verification: Vitest Render-Snapshot.
- Dependencies: none

### MT-4: Sidebar Mobile-Mode + Sub-Group-Headers
- Goal: Sidebar rendert Sub-Group-Headers `Mein Profil` + `Setup`.
- Files: `cockpit/src/components/layout/sidebar.tsx` (MOD)
- Expected behavior: Sektion VERWALTUNG rendert 2 Sub-Group-Headers, jeweils gefolgt von ihren Items. Beide auf Desktop + Mobile.
- Verification: Vitest Snapshot 3 Rollen.
- Dependencies: MT-3

### MT-5: Layout-Integration Mobile + State
- Goal: Sheet-Drawer im Layout.
- Files: `cockpit/src/app/(app)/layout.tsx` (MOD)
- Expected behavior: `<MobileTopBar onMenuOpen={() => setMobileSidebarOpen(true)} className="md:hidden">`. `<Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>` mit Sidebar als Content. useEffect([pathname]) → setMobileSidebarOpen(false).
- Verification: Lokaler Dev-Test mit Resize.
- Dependencies: MT-3, MT-4

### MT-6: SIDEBAR_CONFIG VERWALTUNG-Split
- Goal: Eintrage in 2 Sub-Sections umsortieren.
- Files: `cockpit/src/lib/navigation/sidebar-config.ts` (MOD)
- Expected behavior: VERWALTUNG-Eintrage bekommen `section: 'VERWALTUNG_MEIN'` oder `'VERWALTUNG_SETUP'`. Sidebar-Component rendert beide unter Top-Sektion-Header `VERWALTUNG` mit Sub-Group-Renders.
- Verification: TSC clean. Vitest snapshot.
- Dependencies: SLC-702 MT-2 (Sektion-Names bereits korrekt)

### MT-6.5: Sub-Nav-Strip im Drilldown (Tab-Links mein-tag/pipeline/aufgaben)
- Goal: Tab-Strip im Drilldown-Layout, der zwischen `mein-tag`, `pipeline`, `aufgaben` Sub-Pages umschaltet. Closing-Polish aus SLC-706 OpenPoints.
- Files (vermutlich, beim Start verifizieren):
  - `cockpit/src/app/(app)/team/[user_id]/_components/drilldown-sub-nav.tsx` (NEU) — Tab-Strip-Komponente
  - `cockpit/src/app/(app)/team/[user_id]/layout.tsx` (MOD oder NEU, falls noch nicht existiert) — rendert Sub-Nav ueber children
- Expected behavior:
  - Drei `<Link>`-basierte Tab-Buttons (`Mein Tag`, `Pipeline`, `Aufgaben`), aktive Route hervorgehoben (`usePathname()` fuer Aktiv-Detection)
  - Brand-Tokens, KEINE Hex-Farben (Style-Guide-V2)
  - Mobile-friendly: horizontal scrollbar oder kompakte Buttons bei <md
  - Persistent visible auf allen drei Sub-Pages des Drilldowns
- Verification: TSC clean. Visual-Check im Dev-Server: alle drei Tabs anklickbar, Aktiv-Highlight wechselt korrekt. Wird in MT-7 Playwright-Suite mit abgedeckt.
- Dependencies: keine zwingenden, parallel zu MT-3..MT-6 implementierbar.
- Estimated effort: ~30-60 min.

### MT-7: Playwright Mobile + VERWALTUNG-Split + Bulk-Reassign-Smokes
- Goal: 3 Browser-Smoke-Suites.
- Files: `cockpit/__tests__/playwright/mobile-sidebar.spec.ts` (NEU), `verwaltung-split.spec.ts` (NEU), Bulk-Reassign-Test in `team-management.spec.ts` (MOD or NEU)
- Expected behavior: 
  - Mobile: 3 Rollen × Resize-to-Mobile + Hamburger-Click + Drawer-Open + Eintrag-Click + Drawer-Closes
  - VERWALTUNG-Split: 3 Rollen sehen korrekte Sub-Groups
  - Bulk-Reassign: Admin Preview + Apply + Verify Member-B-Counts
- Verification: 9+ Tests PASS.
- Dependencies: MT-1..MT-6

### MT-8: Style-Guide-V2-Sweep + TSC + Build + Lint + Live-Smoke
- Goal: Slice-Closing + Style-Guide-Verifikation.
- Files: Verschiedene V7-Pages MOD falls Hex-Drift gefunden
- Expected behavior: `grep -rn "#[0-9a-fA-F]\{3,6\}" cockpit/src/app/(app)/team cockpit/src/app/(app)/settings/team` zeigt 0 Drift. TSC + Build + Lint + Test alle clean. User-Coolify-Redeploy. Live-Smoke 3 Themen.
- Verification: Alle Tool-Outputs clean. Live-Smoke-Schritte dokumentiert in Slice-RPT.
- Dependencies: MT-1..MT-7

---

## Open Technical Questions Answered

- **OTQ 10 (Mobile-Sidebar State):** Memory-only (`useState`), Reset bei Route-Wechsel via `useEffect([pathname])`. AC7 + MT-5.

## QA-Fokus

- Bulk-Reassign happy + cross-team-block + Transaction-Rollback-on-error
- Mobile-Hamburger 3 Rollen × Open/Close + Route-Wechsel-Auto-Close
- VERWALTUNG-Split 3 Rollen-Sichten
- Style-Guide-V2 Hex-Drift = 0
- TSC + Build + Lint clean
- Bestehende V6.6 + V7-foundation-Tests bleiben gruen

## Recommended Next Step nach SLC-707

**/qa SLC-707** — verifiziert AC1..AC10.
Dann **Gesamt-/qa V7** ueber alle 7 Slices (verifiziert V7-Release-Gate aus Architecture).
Dann **/final-check V7** — Hygiene, Dependencies, Security.
Dann **/go-live V7** — Release-Readiness-Check.
Dann **/deploy V7** als REL-029.
Dann **/post-launch V7** — 24h-Live-Beobachtung.
