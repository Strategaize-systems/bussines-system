# Known Issues

## Blocker

### ISSUE-001 — Dockerfile für Cockpit fehlt
- Status: resolved
- Severity: Blocker
- Area: Infrastructure / Docker
- Summary: `/cockpit/Dockerfile` existiert nicht, wird aber in `docker-compose.yml` Zeile 25 referenziert. Docker Compose kann ohne Dockerfile nicht bauen.
- Impact: Stack kann nicht gestartet werden.
- Next Action: Erledigt — Multi-Stage Dockerfile erstellt (2026-03-27).

### ISSUE-002 — Dockerfile.kong für Kong Env-Var-Substitution fehlt
- Status: resolved
- Severity: Blocker
- Area: Infrastructure / Kong
- Summary: Kong 2.x ersetzt `${ENV_VAR}` in deklarativer Config nicht automatisch. Das Blueprint-Projekt nutzt `config/Dockerfile.kong` mit `envsubst`. Business System referenziert stattdessen `image: kong:2.8.1` direkt.
- Impact: Kong startet, aber Auth-Keys werden nicht eingesetzt. API entweder komplett offen oder komplett blockiert.
- Next Action: Erledigt — Dockerfile.kong + docker-entrypoint.sh erstellt, docker-compose.yml auf build umgestellt (2026-03-27).

## High

### ISSUE-003 — Supabase DB Init-Scripts werden durch Volume-Mount überschrieben
- Status: resolved
- Severity: High
- Area: Infrastructure / Database
- Summary: `docker-compose.yml` mapped `./sql:/docker-entrypoint-initdb.d` als Volume. Das überschreibt die Supabase-internen Init-Scripts die Rollen wie `supabase_auth_admin`, `authenticator`, `anon` anlegen.
- Impact: PostgREST, GoTrue und Storage können sich nicht authentifizieren.
- Next Action: Erledigt — sql/Dockerfile.db + sql/00_roles.sh erstellt, docker-compose.yml auf build umgestellt (2026-03-27).

### ISSUE-004 — Kontakt-Bearbeiten UI fehlt
- Status: resolved
- Severity: High
- Area: Frontend / CRM
- Summary: `updateContact` Server Action existiert, aber keine UI nutzt sie. Kein Bearbeiten-Button auf Kontakt-Detail oder in der Liste.
- Impact: Acceptance Criterion "Kontakte bearbeiten" (FEAT-001) nicht erfüllt.
- Next Action: Erledigt — ContactSheet nutzt jetzt updateContact bei vorhandenem contact-Prop, Bearbeiten-Button auf Detail-Seite (2026-03-27).

### ISSUE-005 — Firmen-Bearbeiten UI fehlt
- Status: resolved
- Severity: High
- Area: Frontend / CRM
- Summary: Gleich wie ISSUE-004 für Firmen. `updateCompany` existiert, aber keine UI.
- Impact: Acceptance Criterion "Firmen bearbeiten" nicht erfüllt.
- Next Action: Erledigt — CompanySheet nutzt jetzt updateCompany bei vorhandenem company-Prop, Bearbeiten-Button auf Detail-Seite (2026-03-27).

### ISSUE-006 — Skills nicht als Claude Code Slash-Commands registriert
- Status: resolved
- Severity: High
- Area: Skills / Claude Code
- Summary: 8 SKILL.md Dateien liegen unter `/skills/`. Claude Code erwartet Skills unter `.claude/commands/`. Ohne korrekte Registrierung sind Skills nicht als `/skill-name` aufrufbar.
- Impact: Acceptance Criterion "Skills sind über Claude Code als `/skill-name` aufrufbar" unsicher.
- Next Action: Erledigt — 8 Skills nach `.claude/commands/` kopiert (blog-post, cold-email, competitor-analysis, content-strategy, copywriting, create-proposal, linkedin-post, sales-enablement). Quell-Dateien bleiben in `/skills/` (2026-03-27).

## Medium

### ISSUE-007 — Kontakt-Detail enthält Stub für Aktivitäten
- Status: resolved
- Severity: Medium
- Area: Frontend / CRM
- Summary: Platzhalter-Text "Aktivitäten-Timeline wird in SLC-005 implementiert" in Production-Code.
- Next Action: Erledigt — Stub ersetzt durch ActivityTimeline + DocumentList (2026-03-27).

### ISSUE-008 — Native select statt shadcn Select im Kontakt-Formular
- Status: open
- Severity: Medium
- Area: Frontend / UI-Konsistenz
- Summary: Firma-Auswahl in `contact-form.tsx` nutzt natives `<select>` statt shadcn Select. Funktional korrekt, visuell inkonsistent.
- Next Action: Durch shadcn Combobox oder Select ersetzen.

### ISSUE-009 — Keine Fehlermeldungen bei CRUD-Operationen
- Status: resolved
- Severity: Medium
- Area: Frontend / UX
- Summary: Contact-Sheet und Company-Sheet prüfen Fehler für Close-Logik, zeigen aber keinen Fehler-Text an. User bekommt bei fehlgeschlagenem Create/Update kein Feedback.
- Next Action: Erledigt — Error-State + Anzeige in allen 5 Sheets (Contact, Company, Deal, DealEdit, Calendar Entry) (2026-03-27).

### ISSUE-012 — updateDeal setzt stage_id nicht
- Status: resolved
- Severity: High
- Area: Frontend / Pipeline
- Summary: `updateDeal` in `pipeline/actions.ts` enthält `stage_id` nicht im Update-Objekt. Stage-Änderung über das Bearbeiten-Formular wird ignoriert.
- Impact: Acceptance Criterion "Deals bearbeiten" teilweise nicht erfüllt.
- Next Action: Erledigt — stage_id in updateDeal aufgenommen (2026-03-27).

### ISSUE-013 — Drag-Cancel revertiert optimistischen State nicht
- Status: resolved
- Severity: High
- Area: Frontend / Kanban
- Summary: Wenn ein Drag abgebrochen wird (Drop außerhalb aller Columns), wird der optimistische State nicht zurückgesetzt. Card bleibt visuell in der falschen Column bis Page-Refresh.
- Impact: UX-Vertrauen in Kanban-Board.
- Next Action: Erledigt — State-Reset auf initialDeals bei !over in handleDragEnd (2026-03-27).

### ISSUE-014 — Click vs. Drag Konflikt auf Deal-Cards
- Status: resolved
- Severity: High
- Area: Frontend / Kanban
- Summary: KanbanCard hat sowohl Drag-Listeners als auch onClick. Nach einem Drag könnte onClick zusätzlich feuern. Kein Tracking ob Drag stattfand.
- Impact: Unbeabsichtigtes Öffnen des Edit-Sheets nach Drag.
- Next Action: Erledigt — isDragging-Check vor onClick (2026-03-27).

## Medium

### ISSUE-015 — Letzte Aktivität fehlt auf Deal-Cards
- Status: open
- Severity: Medium
- Area: Frontend / Pipeline
- Summary: Slice-Spec verlangt "letzte Aktivität" auf Deal-Karten. getDealsForPipeline jointed nicht die activities-Tabelle. Activity-Infrastruktur existiert jetzt (SLC-005), aber Join auf Deal-Cards fehlt noch.
- Next Action: getDealsForPipeline um activities-Join erweitern, KanbanCard um letzte Aktivität ergänzen.

### ISSUE-016 — reorderStages definiert aber nie aufgerufen
- Status: resolved
- Severity: Medium
- Area: Frontend / Settings
- Summary: `reorderStages()` existiert in actions.ts, wird aber nie aufgerufen. GripVertical-Icon in Settings ist rein dekorativ.
- Next Action: Erledigt — GripVertical-Icons und reorderStages-Funktion entfernt (2026-03-27).

### ISSUE-017 — getContactsForSelect dupliziert in Pipeline-Seiten
- Status: resolved
- Severity: Medium
- Area: Frontend / Code Quality
- Summary: Gleiche Funktion `getContactsForSelect` in endkunden/page.tsx und multiplikatoren/page.tsx statt in shared actions.
- Next Action: Erledigt — Funktion in contacts/actions.ts extrahiert, Pipeline-Seiten importieren sie (2026-03-27).

### ISSUE-018 — Supabase Storage Bucket "documents" wird nirgends erstellt
- Status: resolved
- Severity: High
- Area: Infrastructure / Storage
- Summary: `uploadDocument` referenziert `supabase.storage.from("documents")`, aber kein Storage Bucket existiert in Init-Scripts oder Migrations. Upload schlägt zur Laufzeit fehl.
- Impact: Dokument-Upload funktioniert nicht ohne manuelles Erstellen des Buckets.
- Next Action: Erledigt — Storage Bucket + RLS Policies in 02_rls.sql hinzugefügt (2026-03-27).

### ISSUE-019 — Aktivitäten + Dokumente fehlen auf Deal-Ebene
- Status: resolved
- Severity: Medium
- Area: Frontend / Pipeline
- Summary: Behoben durch SLC-202 (Deal-Detail-Popup mit 4 Tabs: Übersicht, Aktivitäten, Angebote, Bearbeiten). getDealWithRelations lädt Activities, Proposals, Emails, Signals parallel.

### ISSUE-020 — deleteDocument prüft Storage-Delete-Ergebnis nicht
- Status: open
- Severity: Medium
- Area: Backend / Storage
- Summary: Storage-Remove Ergebnis wird in document-actions.ts ignoriert. DB-Record wird gelöscht auch wenn Storage-Delete fehlschlägt.
- Next Action: Storage-Delete Ergebnis prüfen oder zumindest loggen.

## Low

### ISSUE-023 — Monatsende-Berechnung ist Zeitzonen-abhängig
- Status: resolved
- Severity: Medium
- Area: Backend / Calendar
- Summary: `new Date(y, m, 0).toISOString()` in getEntries month filter gibt UTC zurück. In CET kann der Vortag resultieren, wodurch Einträge am Monatsletzten nicht angezeigt werden.
- Next Action: Erledigt — String-basierte Berechnung mit getDate() (2026-03-27).

### ISSUE-024 — Keine Filter-UI in Kalender-Tabellenansicht
- Status: wontfix
- Severity: Medium
- Area: Frontend / Calendar
- Summary: Spec verlangt Filter nach Typ, Status, Kanal. Server Action unterstützt Filter, aber Table-UI hat keine Filter-Dropdowns.
- Next Action: Content-Kalender in V2 entfernt (zu System 4 verschoben). Issue obsolet.

### ISSUE-025 — Status-Advance hat kein Undo
- Status: wontfix
- Severity: Low
- Area: Frontend / Calendar
- Summary: Status-Badge-Klick geht nur vorwärts. Kein Zurücksetzen möglich. Akzeptabel für internal-tool.
- Next Action: Content-Kalender in V2 entfernt. Issue obsolet.

### ISSUE-021 — any-Typ in RecentActivities
- Status: resolved
- Severity: Medium
- Area: Frontend / TypeScript
- Summary: `activities: any[]` in recent-activities.tsx statt typisiert. Funktional korrekt, schwächt TypeScript-Schutz.
- Next Action: Erledigt — DashboardActivity-Typ definiert (2026-03-27).

### ISSUE-026 — TopBar Logout-Button hat keinen Handler
- Status: resolved
- Severity: High
- Area: Frontend / Auth
- Summary: Logout DropdownMenuItem hatte weder onClick noch Form Action. Klick auf Logout machte nichts.
- Next Action: Erledigt — signout Action als Form Action im DropdownMenu verdrahtet (2026-03-27).

### ISSUE-029 — NEXT_PUBLIC_* Variablen fehlen beim Docker Build
- Status: resolved
- Severity: Blocker
- Area: Infrastructure / Docker
- Summary: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY werden client-seitig verwendet und beim Next.js Build inline. Dockerfile hatte keine ARG-Deklarationen, Build lief mit undefined Werten.
- Impact: Supabase-Verbindung im Browser funktioniert nicht.
- Next Action: Erledigt — ARG im Dockerfile + args in docker-compose.yml (2026-03-27).

### ISSUE-027 — /auth/set-password Route fehlt
- Status: open
- Severity: Medium
- Area: Frontend / Auth
- Summary: Invite-Flow redirected auf /auth/set-password, Route existiert aber nicht. Invite-Links enden in 404.
- Impact: Einladungs-Flow für neue User funktioniert nicht. Login per Password funktioniert.
- Next Action: V2 — Invite-Flow ist nicht V1-Scope. Password-Login deckt V1 ab.

### ISSUE-028 — Root Layout hat Scaffold-Metadata
- Status: resolved
- Severity: Medium
- Area: Frontend / Meta
- Summary: title "Create Next App", description "Generated by create next app" im Root Layout.
- Next Action: Erledigt — Metadata auf "Business Cockpit — Strategaize" gesetzt (2026-03-27).

### ISSUE-022 — getPipelineSummaries hat N+1 Query-Pattern
- Status: open
- Severity: Low
- Area: Backend / Performance
- Summary: Pro Pipeline 2 separate Queries (Stages + Deals). Bei 2 Pipelines = 5 Queries total. Akzeptabel für V1.
- Next Action: Bei Skalierung auf eine aggregierte Query umstellen.

### ISSUE-010 — Dashboard ist nur Stub
- Status: resolved
- Severity: Low
- Area: Frontend / Dashboard
- Summary: Dashboard-Seite zeigt nur "Willkommen im Business Cockpit". Geplant für SLC-006.
- Next Action: Erledigt — Dashboard mit Stats, Pipeline-Summary, Aktivitäten-Feed, Upcoming Actions (2026-03-27).

### ISSUE-011 — .env.local enthält Platzhalter-Werte
- Status: open
- Severity: Low
- Area: Configuration
- Summary: Platzhalter wie "placeholder-will-be-replaced" in .env.local. Akzeptabel für Dev, .gitignore schützt vor Commit.
- Next Action: Bei Deployment echte Werte einsetzen (SLC-011).

### ISSUE-031 — SLC-414 JWT-fuer-Externe-Teilnehmer inkonsistent zur Architecture
- Status: resolved
- Severity: High
- Area: Planning / V4.1 / FEAT-404
- Summary: ARCHITECTURE.md zeigt Redirect mit `?jwt={token}` in URL fuer externe Teilnehmer. SLC-414 MT-5 sagt explizit "ohne JWT im Link". Jitsi laeuft mit `ENABLE_AUTH=1` (SLC-412), externe ohne JWT koennen nicht in den Raum.
- Impact: SLC-414 implementiert wuerde fuer Host funktionieren, externe Teilnehmer wuerden HTTP 401 erhalten. Meeting-Flow kaputt fuer den Hauptanwendungsfall.
- Workaround: Vor SLC-414 Implementation klaeren. Empfehlung: Per-Recipient-JWT mit `moderator=false`, eingebettet in Einladungs-URL.
- Next Action: Erledigt 2026-04-15 — SLC-414 MT-1 bietet jetzt 2 JWT-Varianten (Moderator + Participant), MT-4 erzeugt pro Teilnehmer individuellen JWT, MT-5 baut Einladungs-URL mit `?jwt=<participant-jwt>`. AC-6 + AC-7 + AC-8 ergaenzt. Verifikation in SLC-414 Implementation.

### ISSUE-032 — contacts.opt_out_communication-Flag fehlt fuer FEAT-409 AC-5 Respect-Logik
- Status: resolved
- Severity: Medium
- Area: Planning / V4.1 / FEAT-409
- Summary: FEAT-409 AC-5 verlangt Respect-Flag am Kontakt, das verhindert Reminder-Versand bei Opt-out. SQL-Migrations (V1-V4) zeigen kein solches Feld. SLC-411 MT-1 (MIG-011) fuegt es nicht hinzu. SLC-417 erwaehnt es nur als Scope-Notiz, ohne Schema-Zuordnung.
- Impact: SLC-417 implementierbar, aber ohne Opt-out-Check verletzt es spaeter FEAT-409 AC-5. Zweite Migration noetig wenn nicht in MIG-011 mit aufgenommen.
- Workaround: Spalte `opt_out_communication BOOLEAN DEFAULT false` zu MIG-011 (SLC-411 MT-1) hinzufuegen + UI-Toggle in SLC-411 MT-7.
- Next Action: Erledigt 2026-04-15 — SLC-411 MT-1 (MIG-011) enthaelt jetzt `contacts.opt_out_communication BOOLEAN DEFAULT false`. SLC-411 MT-7 UI zeigt Opt-out-Toggle. SLC-414 MT-5 respektiert Flag beim Einladungs-Versand. Neuer AC-7 + AC-9 in SLC-411. Verifikation in SLC-411 Implementation.

### ISSUE-034 — 6 V2/V3-Tabellen RLS-enabled ohne Policy (Insert implizit verboten)
- Status: resolved
- Severity: High
- Area: Database / RLS
- Summary: `emails`, `fit_assessments`, `handoffs`, `proposals`, `referrals`, `signals` hatten RLS enabled (`relrowsecurity=true`), aber keine einzige Policy (`pg_policy` = 0 rows). Postgres-Verhalten: RLS an + keine Policy = alles implizit verboten fuer authenticated. Bei SLC-411 Live-Test durch Klick auf "E-Mail senden" als "new row violates row-level security policy for the table 'emails'" sichtbar geworden. Historisch: V2/V3-Migrationen haben RLS aktiviert, aber die `authenticated_full_access`-Policy wurde nur in `sql/02_rls.sql` fuer V1-Tabellen per DO-Block angelegt — nachtraeglich hinzugefuegte Tabellen blieben policy-los.
- Impact: Insert/Update/Delete auf 6 Tabellen war fuer authenticated User gebrochen. E-Mail-Versand-Logging, Fit-Assessment-Speichern, Handoff-Erstellung, Proposal-Speichern, Referral-Tracking, Signal-Insert aus der Cockpit-UI waren alle betroffen. adminClient (service_role mit BYPASSRLS) war nicht betroffen — das erklaert warum bestimmte Code-Pfade (IMAP-Sync, Cron-Jobs) trotzdem liefen.
- Next Action: Erledigt 2026-04-16 — `sql/14_fix_missing_rls_policies.sql` legt `authenticated_full_access` Policy auf alle 6 Tabellen an (idempotent via DROP POLICY IF EXISTS + CREATE POLICY) und setzt explizite Grants. Auf Hetzner angewendet, verifiziert: alle 6 Tabellen haben jetzt genau 1 Policy.

### ISSUE-033 — Public-Revoke-Link nach Grant funktionslos (Token-Invalidierung)
- Status: open
- Severity: Medium
- Area: FEAT-411 / Consent-Flow
- Summary: SLC-411 invalidiert `consent_token` nach grant/decline (QA-Focus "Token nach Grant invalidiert"). Der Widerruf-Link in der Consent-Mail nutzt aber denselben Token. Nach Grant geht der Widerruf-Link aus der Mail ins Leere ("Link nicht gefunden"). Public-Widerruf nach Zustimmung ist damit nur ueber manuelle UI (revokeConsentManual) moeglich, nicht ueber den Link in der Original-Mail.
- Impact: User, die granted haben und spaeter per Mail-Link widerrufen wollen, bekommen "Link nicht gefunden". Das ist ein DSGVO-Komfort-Gap (Widerruf muss leicht moeglich sein). Interner User kann Widerruf manuell ueber Kontakt-Detail ausloesen.
- Workaround: Widerruf-Prozess: User per Mail an Besitzer → Besitzer klickt "Widerrufen" im Kontakt-Workspace. Langfristig (V4.2+): Separater persistenter `revoke_token` in contacts oder Re-Generation des Tokens mit jedem Mail-Versand.
- Next Action: In V4.2-Planning aufnehmen. Architektur-Entscheidung noetig: dauerhafter revoke_token vs. pro-Mail-Token-Rotation. Bis dahin ist manueller Widerruf der offizielle Weg.

### ISSUE-035 — Jibri finalize-script Placeholder-Error nach Recording
- Status: open
- Severity: Low
- Area: FEAT-404 / SLC-412 / Recording
- Summary: Nach erfolgreichem MP4-Write versucht Jibri `/path/to/finalize` auszufuehren (Default-Platzhalter aus jibri.conf). `java.io.IOException: Cannot run program "/path/to/finalize": error=2, No such file or directory`. MP4 ist bereits geschrieben und valide, Error kommt rein post-processing.
- Impact: Keine auf Recording-Qualitaet. Log-Noise "SEVERE" in Jibri, koennte Monitoring-Alerts ausloesen.
- Workaround: SLC-415 implementiert Poll-basiertes Upload (Cron alle 2 Min liest /recordings, uploaded nach Supabase Storage). Finalize-Script wird dadurch nicht mehr benoetigt fuer Upload. Log-Noise bleibt.
- Next Action: Optional: `JIBRI_FINALIZE_RECORDING_SCRIPT_PATH=""` in Jibri-ENV setzen um Log-Noise zu eliminieren. Kein funktionaler Blocker mehr.

### ISSUE-036 — Jitsi Bridge Channel Qualitaets-Warning bei 1-User-Recording
- Status: open
- Severity: Low
- Area: FEAT-404 / SLC-412 / WebRTC
- Summary: Beim Jibri-Server-Recording-Smoke-Test erschien Jitsi-Toast "Schlechte Videoqualitaet / Bridge Channel Verbindung wurde unterbrochen". Recording lief durch, MP4 korrekt. Ursache vermutet: Hairpin-NAT-UDP-Verlust (JVB-Media-Stream geht Container -> Public-IP -> Hetzner-Firewall -> zurueck zu JVB).
- Impact: UX-Noise bei internen Smoke-Tests. Bei echten Kunden-Meetings (externe Teilnehmer) waere der Pfad anders, aber das gleiche Problem koennte bei strikten Kunden-NATs auftreten.
- Workaround: Internal-Tool ohne externe Teilnehmer OK. Fuer externe Meetings: coturn-Server nachruesten (BL-206-Nachbar).
- Next Action: Bei ersten echten Kunden-Meetings nachmessen. Falls regelmaessig: coturn-Container als eigenen Slice planen. Aktuell kein V4.1-Blocker.

### ISSUE-037 — linux-modules-extra muss nach Kernel-Upgrade nachinstalliert werden
- Status: open
- Severity: Medium
- Area: Infrastructure / Hetzner Host
- Summary: Hetzner-Cloud-Ubuntu liefert `snd-aloop` nicht im Standard-Kernel — musste via `apt install linux-modules-extra-$(uname -r)` nachinstalliert werden, damit Jibri Audio erfasst. Aktueller Kernel: 6.8.0-106-generic, neuer 6.8.0-107 ist im APT verfuegbar. Bei naechstem Reboot wird der neue Kernel geladen — das `linux-modules-extra-6.8.0-107-generic` Paket ist aber nicht installiert, damit faellt snd-aloop aus → Jibri-Recording bricht.
- Impact: Stille Regression nach Kernel-Upgrade + Reboot. Jibri meldet ERR_CONNECTION_REFUSED oder Chrome-Crash, erster Smoke-Test nach Reboot schlaegt fehl.
- Workaround: Vor Reboot `apt install linux-modules-extra-$(uname -r)` fuer den NEUEN Kernel laufen lassen (uname -r dann noch der alte, deshalb explizit den kommenden Kernel angeben). Oder Auto-Hook einrichten: `apt-get install -y linux-modules-extra-\$(uname -r)` in /etc/apt/apt.conf.d/.
- Next Action: In Server-Maintenance-Runbook dokumentieren. Langfristig: APT-Hook fuer automatische Modules-Extra-Installation bei Kernel-Upgrades einrichten (eigener kleiner Infra-Slice oder Doctor-Checklist-Item).

### ISSUE-030 — Fremde Onboarding-Artefakte in Business-DB (Hostname-Kollision)
- Status: resolved
- Severity: High
- Area: Database / Infrastructure
- Summary: Am 2026-04-14 wurden versehentlich 5 Onboarding-Plattform-Tabellen (template, capture_session, block_checkpoint, knowledge_unit, validation_layer) sowie die Funktion `handle_new_user()` und der Trigger `on_auth_user_created` auf Business-DB angelegt. Ursache: beide Hetzner-Server (Business 91.98.20.191, Onboarding 159.69.207.29) haben denselben internen Hostname `coolify-ubuntu-4gb-nbg1-1`, sodass der SSH-Prompt keinen Unterschied zeigte.
- Impact: Neue User-Signups wären gebrochen, weil `handle_new_user()` in Spalten `tenant_id` und `email` schrieb, die Business-`profiles` nicht hat. Bestehender User (richard@bellaerts.de) war nicht betroffen.
- Next Action: Erledigt 2026-04-15 — Trigger, Funktion und die 5 leeren Tabellen gedropped, `_set_updated_at()` Helper mitentfernt. Verifikation: 25 Tabellen im public-Schema (erwartet), User + Profile intakt. Präventiv: SSH-Zugang via Claude-Code-Agent eingerichtet, alle DB-Eingriffe laufen jetzt nur noch via Agent (keine User-Paste-Sessions mehr), Hostname-Kollision kann sich damit nicht wiederholen (Adressierung nur noch per Public-IP).
