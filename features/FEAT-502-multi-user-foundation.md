# FEAT-502 — Multi-User-Foundation + Lead/Deal-Ownership

## Status
planned

## Version
V7

## Problem
Das System ist seit V1 fuer einen Single-User-Admin gebaut (User = GF Immo). Skalierung Richtung Pre-Seed-Pilots (Q3-Q4 2026, 5-10 Steuerberater-Kanzleien mit jeweils 2-5 Beratern) braucht echte Multi-User-Faehigkeit: Berater bekommen eigene Logins, sehen NUR ihre eigenen Leads/Deals/Aktivitaeten, der Steuerberater (Teamlead) sieht alle Team-Mitglieder zusammen.

Bestehende `profiles.role`-Spalte (Default `'admin'`) und `profiles.team TEXT` sind als Fundament da (V3 FEAT-307), aber:
- Keine RLS-Policies trennen Daten zwischen Usern derselben Instanz
- Lead/Deal/Activity-Tabellen haben kein `owner_user_id`-Feld (alles ist global sichtbar)
- Es gibt keine Verwaltungs-UI fuer Team-Mitglieder
- Bestandsdaten haben keinen Owner

## Goal
Ein konsistentes 3-Rollen-Modell (`admin` / `teamlead` / `member`) mit echter Daten-Isolation pro Owner, manuell zuweisbarem Ownership pro Lead/Deal/Aktivitaet, Bulk-Reassign fuer Teamlead/Admin und einer sauberen Migration aller V6.6-Bestandsdaten zu User Immo als Owner.

## Users
- **Member (Berater):** Hat einen Login, sieht seine zugewiesenen Leads/Deals, fuehrt seine Aktivitaeten, hat sein Mein-Tag und seine Pipeline.
- **Teamlead (Steuerberater/Chef):** Wie Member plus Aggregat-Sicht ueber Team plus Bulk-Reassign-Werkzeug. (Aggregat + Drilldown wird in FEAT-503 ausgeplant.)
- **Admin (GF/Implementor):** Sieht alles, kann Mitglieder einladen/loeschen, Rollen vergeben, alle Bestandsdaten verwalten.

## In Scope V1 (V7)

### Datenmodell
- `profiles.role` als CHECK-Enum: `'admin' | 'teamlead' | 'member'` (Migration der bestehenden `'admin'`-Defaults).
- `teams`-Tabelle (eine Zeile = ein Team innerhalb der Instanz, `id`, `name`, `created_at`). User Immo wird per Migration in Team `"Strategaize"` aufgenommen.
- `profiles.team_id UUID REFERENCES teams(id)` ersetzt das bestehende `profiles.team TEXT` (Free-Text → Foreign Key).
- `owner_user_id UUID REFERENCES profiles(id)` als ALTER auf den Kerntabellen: `companies`, `contacts`, `deals`, `activities`, `meetings`, `proposals`, `email_messages`, `calls`. NULL erlaubt fuer System-eigene Records (Crons, automatische Inserts ohne User-Kontext).
- Backfill-Migration: alle Bestandsdaten ohne `owner_user_id` werden auf User Immo gesetzt.

### RLS-Policies
- `admin`: Vollzugriff auf alle Daten der Instanz (bestehendes Verhalten).
- `teamlead`: SELECT auf alle Daten, deren `owner_user_id` zu einem Profil im gleichen `team_id` gehoert; UPDATE/DELETE nur auf eigene Records ausser Bulk-Reassign (siehe unten).
- `member`: SELECT/UPDATE/DELETE NUR auf Daten mit `owner_user_id = auth.uid()`.
- System-Records (`owner_user_id IS NULL`): nur `admin` sieht sie.

### Manual Assignment
- Lead-/Deal-Erfassung: Auswahlfeld "Verantwortlich" mit Default = aktueller User. Admin/Teamlead darf auch andere Team-Mitglieder waehlen, Member nur sich selbst.
- Bulk-Reassign-Werkzeug unter `/settings/team`: Admin/Teamlead waehlt Source-Owner + Target-Owner + Filter (Pipeline, Status) → Server Action ueberschreibt `owner_user_id` in einem Transaktions-Block + audit_log-Eintrag pro betroffener Zeile.

### Verwaltungs-UI
- `/settings/team` neue Seite (Admin + Teamlead sichtbar):
  - Tabelle aller Team-Mitglieder mit `display_name`, `role`, Mail, Anzahl offener Deals/Aktivitaeten.
  - "Einladen"-Button (E-Mail + Initial-Rolle) → Supabase-Auth-Invite + Profile-Insert.
  - "Rolle aendern" Dropdown (nur Admin darf).
  - "Bulk-Reassign starten"-Button.
- `/settings/profile` zeigt eigenen Eintrag plus Read-Only `role`, `team_id` (Admin/Teamlead darf editieren).

### Migration
- `MIG-033` (V7-Phase-A-Schema): teams-Tabelle, profiles.team_id, owner_user_id-Spalten in 8 Kerntabellen, CHECK-Constraint auf profiles.role.
- `MIG-034` (V7-Phase-B-Backfill): Default-Team `"Strategaize"`, Immo als admin in Team, owner_user_id-Backfill auf alle Bestandsdaten.
- `MIG-035` (V7-Phase-C-RLS): neue Policies aktiviert, alte authenticated_full_access-Policies entfernt.

## Out of Scope V1 (V7)
- **Auto-Routing nach PLZ / Branche / Round-Robin** — User-Direktive: "Manual Assignment". Auto-Routing ggf. V7.x oder V8.
- **Multi-Team-Membership** — Ein User in genau einem Team in V7.
- **Cross-Team-Sichtbarkeit** fuer Member (z.B. "ich vertrete einen Kollegen") — bleibt manueller Reassign.
- **Externe Mit-Owner / Shared Records** (mehrere Owner pro Deal) — eindeutiger Owner in V7.
- **Custom-Rollen** ueber die 3-Standard-Rollen hinaus.

## Constraints
- **DSGVO-Daten-Isolation muss durch RLS hart erzwungen sein**, nicht nur UI-seitig. Browser-Test: Member-Session laeuft, manueller Lead-Detail-URL eines anderen Members → 404 / Access-Denied.
- **Audit-Log** schreibt bei jeder Bulk-Reassign-Aktion `entity_type`, `entity_id`, `old_owner`, `new_owner`, `triggered_by_user_id`.
- **Bestehende KI-Features** (RAG-Knowledge-Chunks, Workflow-Rules, Auto-Winloss, Followup-Cron) muessen owner-aware oder dokumentiert team-global werden — Architecture-Entscheidung in `/architecture V7`.
- **Whisper-Pipeline + Bedrock-Calls** bleiben pro-User-context — Audit-Trail muss `user_id` mitloggen.

## Risks / Assumptions
- **R1 — RLS-Backfill-Drift:** Wenn auch nur eine Bestandszeile ohne `owner_user_id` bleibt, wird sie nach RLS-Aktivierung fuer alle ausser Admin unsichtbar. Migration MUSS 100% abdecken, Verifikation via COUNT(*) WHERE owner_user_id IS NULL = 0 fuer jede Tabelle.
- **R2 — Performance:** Owner-gefilterte Queries muessen Index-gestuetzt sein (`CREATE INDEX ON tabelle (owner_user_id)` pro Kerntabelle).
- **R3 — Bestehende Server Actions:** ~80 Server Actions haben aktuell impliziten Admin-Kontext. Audit notwendig, welche `owner_user_id` setzen muessen (Insert) und welche Owner-Check brauchen (Update/Delete).
- **A1 — Supabase Auth-Invite** funktioniert auf self-hosted Coolify-Supabase mit aktueller Konfiguration (Mailer aktiviert).
- **A2 — User Immo bleibt einziger Admin** im V7-Initial-Stand. Erste Steuerberater werden als `teamlead` mit eigenem Team angelegt (eigene Team-Daten, Multi-Tenancy-Trennung kommt in V8+).

## Success Criteria
- Ein als `member` eingeloggter Test-User sieht Mein Tag mit 0 Deals/Aktivitaeten, wenn ihm keine zugewiesen wurden.
- Nach Bulk-Reassign-Aktion (Admin) auf Test-Member sieht der Test-Member die zugewiesenen Deals in seiner Pipeline.
- Manueller Test-Member-URL auf einen Deal eines anderen Team-Members liefert 404, audit_log zeigt keinen Datenleak.
- Teamlead-Session sieht Aggregat (Vorbereitung fuer FEAT-503): SELECT COUNT(*) FROM deals beruecksichtigt alle Team-Member.
- Admin-Session (User Immo) sieht ALLES wie vorher, keine Regression auf V6.6-Feature-Set.
- Vitest-Suite mindestens 30 neue RLS-Tests (3 Rollen x 8+ Tabellen x verschiedene Operationen).

## Open Questions (fuer /architecture)
- Q1 — Eingeladene Member ohne `team_id` bei Sign-Up: Default-Team oder Pending-State?
- Q2 — Workflow-Rules (V6.2): pro Owner, pro Team, oder Admin-only? Beispiel: Auto-Wiedervorlage soll fuer Member feuern, aber Member darf keine Regeln editieren?
- Q3 — Knowledge-Chunks (RAG): rolling pro Owner oder Team-shared? Member darf Team-Daten searchen oder nur eigene?
- Q4 — Meeting/Call mit mehreren Teilnehmern aus dem eigenen Team: wem "gehoert" das Meeting? (Host-User vermutlich, aber Anwesende muessen es sehen)
- Q5 — KI-Workspace-Hybrid (V6.6 Mein Tag): rendert Berichte ueber gefilterte Owner-Daten oder ueber Team-Daten je nach Rolle?
- Q6 — Bulk-Reassign: hard-deletet alte Zuordnung oder erzeugt `previous_owner_user_id`-Trail (DSGVO-Loeschpflicht beachten)?
- Q7 — Profile-Loeschung: was passiert mit Daten gefeuerter Mitarbeiter? Re-Assign-Pflicht vor Delete?
- Q8 — `audit_log.user_id` (existiert) vs. neue `triggered_by_user_id`: Konsolidieren oder beide?

## Acceptance (uebergreifend)
- MIG-033/034/035 idempotent applied auf Hetzner.
- 8 Kerntabellen haben `owner_user_id` + Index.
- RLS-Policies aktiv, Vitest-Suite gruen.
- `/settings/team` voll funktional fuer alle 3 Rollen.
- Bulk-Reassign mit audit_log-Trail.
- Backfill-Verifikation: 0 NULL-Owner in Bestandsdaten.
