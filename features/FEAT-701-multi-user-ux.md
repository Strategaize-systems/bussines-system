# FEAT-701 — Multi-User-UX (Sidebar-Restruktur + Mobile-Hamburger + Rollen-Sichtbarkeit)

## Status
planned

## Version
V7

## Abhaengig von
FEAT-502 (Rollen-Modell vorhanden), idealerweise parallel zu FEAT-503 (Sidebar-Sektion TEAM kommt aus FEAT-503).

## Problem
V6.6 hat eine Single-User-Sidebar mit 4 Sektionen (ANALYSE / OPERATIV / ARBEITSBEREICHE / VERWALTUNG). Multi-User-Welt braucht:
- Rollen-konditionale Sichtbarkeit: Member sieht KEIN Dashboard (per Memory `feedback_admin_employee_chef_views.md`), Teamlead sieht TEAM-Sektion, Admin sieht alles.
- Sidebar-VERWALTUNG ist mit 11 Eintraegen heute schon ueberfuellt (BL-437) — Multi-User addiert weitere Eintraege (Team-Verwaltung, Profile).
- Mobile-Sidebar fehlt komplett (BL-457 aus SLC-667 QA RPT-385) — auf <768px ist die Sidebar versteckt, ohne Hamburger-Toggle.

Ohne diese Arbeit sieht die V7-Erfahrung fuer Member uebervoll/verwirrend aus.

## Goal
Sidebar wird rollen-konditional und mobile-faehig. Spezifisch:
- **Member-Sidebar** ist deutlich verkuerzt (Mein Tag + Pipeline + Aktivitaeten + eigene Verwaltung).
- **Teamlead-Sidebar** kommt mit TEAM-Sektion.
- **Admin-Sidebar** bleibt voll (wie V6.6 + neue Multi-User-Eintraege).
- **Mobile**: Hamburger-Button im PageHeader, Sidebar als Sheet/Drawer mit Sektion-Headern.

## Users
Alle 3 Rollen — jeder sieht eine andere Sidebar.

## In Scope V1 (V7)

### Rollen-konditionale Sidebar
- Single-Source-Konfig: `lib/navigation/sidebar-config.ts` mit Eintraegen `{href, label, icon, section, visibleFor: ['admin'|'teamlead'|'member']}`.
- Komponente `<Sidebar />` filtert Eintraege via aktueller `profiles.role` (server-side im Layout, kein Client-Flash).
- Sektionen werden ausgeblendet, wenn keine sichtbaren Eintraege uebrig.

**Member-Sicht (nach Memory `feedback_admin_employee_chef_views`):**
- OPERATIV: Mein Tag, Pipeline, Aktivitaeten, Meetings, Anrufe, Mails, Angebote
- ARBEITSBEREICHE: Multiplikatoren, Unternehmer, Leads (nur eigene)
- VERWALTUNG: Mein Profil, Einstellungen (nur Profile + Mail-Branding)
- **NICHT sichtbar:** Dashboard, KI-Analyse-Cockpit, Workflow-Automation, Kampagnen, Team-Cockpit, Team-Verwaltung

**Teamlead-Sicht:**
- ANALYSE: Pipeline-Funnel, Win/Loss, KI-Analyse-Cockpit (auf Team-Scope)
- TEAM: Team-Cockpit (FEAT-503), Team-Verwaltung (FEAT-502)
- OPERATIV: alles wie Member
- ARBEITSBEREICHE: alles
- VERWALTUNG: Profile, Branding, Compliance, Team-Verwaltung

**Admin-Sicht:** Vollumfang wie V6.6 + neue Multi-User-Eintraege (Team-Verwaltung, Mitglieder-Liste).

### Sidebar-VERWALTUNG-Split (loest BL-437)
VERWALTUNG-Sektion wird in 2 Sub-Gruppen aufgeteilt:
- **"Mein Profil"** (kollabierbar): Mein Profil, Mail-Signatur, eigene Branding-Preferences.
- **"Setup"** (Admin/Teamlead-only): Einstellungen, Pipelines, Produkte, Workflows, Kampagnen, Team-Verwaltung, Compliance, Whisper.

### Mobile-Hamburger (loest BL-457)
- Auf Viewport <md (Tailwind `md:` Breakpoint, 768px): `<MobileTopBar />` mit Logo + Hamburger-Icon.
- Hamburger oeffnet Sidebar als `<Sheet />` von links (shadcn/ui Pattern, V6.5 Theming-Foundation kompatibel).
- Mobile-Drawer zeigt vollstaendige rollen-konditionale Sidebar-Struktur (Sektionen + Eintraege).
- Backdrop-Klick + Esc + Eintrag-Klick schliessen den Drawer.

### Rollen-Sichtbarkeit in Pages (uebergreifend)
- **Mein Tag (FEAT-661):** KI-Workspace-Hybrid feuert Bedrock-Prompts auf eigene Daten — fuer alle 3 Rollen. Admin sieht KEINEN globalen Aggregat-Mode auf Mein Tag (das ist `/team` in FEAT-503).
- **Cockpit (FEAT-665):** Member sieht es nicht (Sidebar-Filter). Admin/Teamlead sieht Owner-eigene Sicht; Team-Sicht in `/team`.
- **Pipeline + Aktivitaeten:** Member sieht NUR eigene (RLS aus FEAT-502). Admin/Teamlead sieht Team-Daten.
- **Settings-Sub-Pages:** rollen-konditionaler Server-Side-Guard (`assertRole(['admin'])` an Workflow- / Kampagnen-Settings).

## Out of Scope V1 (V7)
- **Multi-Touch-Journey-Tab (BL-425)** auf Lead-Detail — Polish, low prio, V7.5 oder later.
- **Kalender Pre/Post-Stauchung (BL-458)** — V7.5 oder later.
- **Personalisierbare Sidebar-Order** durch User — V8.
- **Theme-Switching (Dark Mode)** — wurde mehrfach diskutiert, nicht V7.
- **Sidebar-Notifications-Badges** (z.B. "5 neue Aktivitaeten") — V7.5.

## Constraints
- **Single-Source-Konfig** ist verbindlich. Keine geteilten Sidebar-Configs zwischen Mobile + Desktop.
- **Server-side Rollen-Filter** verhindert Client-Flash (Member sieht NIE kurz "Dashboard" beim Page-Load).
- **Style Guide V2 / Brand-Tokens** (V6.5) bleiben verbindlich.
- **Bestehende V6.6-Layouts** (Mein Tag, KI-Analyse-Cockpit) bleiben funktional unveraendert fuer Admin.

## Risks / Assumptions
- **R1 — Refactor-Risiko:** Sidebar-Component wird zentral umgebaut. Regression-Risiko bei Admin-Sicht hoch. QA-Plan: Browser-Smoke auf alle 4 Sidebar-Sektionen, alle vorhandenen Eintraege, Admin-Sicht.
- **R2 — Server-Side-Layout:** `(authenticated)/layout.tsx` muss `profile.role` server-side resolven; bei vielen Server Actions in der Layout-Chain Cache-Drift moeglich.
- **R3 — Mobile-Drawer-Pattern:** shadcn `<Sheet />` muss auf Brand-Token-Pflicht angepasst werden.
- **A1 — Bestehende Routes** bleiben unveraendert; nur Sichtbarkeits-Layer kommt dazu (kein Route-Rename).
- **A2 — `profiles.role` ist nach FEAT-502-Migration immer gesetzt** (CHECK-Constraint NOT NULL).

## Success Criteria
- Drei Rollen-Sessions zeigen drei verschiedene Sidebars (Visual Diff).
- Mobile-Hamburger oeffnet rollen-korrekte Sidebar als Drawer auf <768px.
- Member-Session laedt Mein Tag in <2s ohne Sidebar-Flash.
- Manueller Member-Request auf `/cockpit` liefert 404 / Redirect zu Mein Tag (Server-Guard greift).
- Browser-Smoke 3 Rollen x 5 Top-Routes = 15 Pages, alle PASS.
- VERWALTUNG-Split sichtbar (Mein Profil + Setup als 2 separate Sub-Gruppen).

## Open Questions (fuer /architecture)
- Q1 — Sidebar-Config: TypeScript-Array oder JSON-Datei? Wie wird "Sektion-Header"-Rendering generiert?
- Q2 — Server-Side-Guard auf Routes: middleware.ts oder pro Page `await assertRole()`? V6.6 hat schon `getProfile()` in Layouts — erweitern oder ersetzen?
- Q3 — Mobile-Top-Bar: in jedem Page-Layout einbauen oder im `(authenticated)/layout.tsx` zentralisieren?
- Q4 — Sidebar-State (offen/zu, Sub-Gruppen kollabiert): localStorage pro User oder global?
- Q5 — Brand-Tokens fuer Mobile-Drawer: `<Sheet />`-Override schreiben oder direkt im Brand-Token-Layer ergaenzen?

## Acceptance
- `lib/navigation/sidebar-config.ts` zentralisiert.
- Rollen-konditionaler Server-Side-Filter live.
- VERWALTUNG-Split aktiv.
- Mobile-Hamburger funktional <768px.
- 3 Rollen-Browser-Smokes PASS.
- Style-Guide-V2-konform.
