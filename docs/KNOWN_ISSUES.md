# Known Issues

### ISSUE-049 — SLC-562 UI-State-Drift im SkontoSection nach Auto-Save-Error
- Status: open
- Severity: Low
- Area: UI / Proposals-Editor
- Summary: Nach mehreren Server-rejected Auto-Saves im SkontoSection (z.B. Prozent=10 ausserhalb Range) flippt der Toggle visuell in OFF-Zustand, obwohl die DB den vorherigen gueltigen State haelt.
- Impact: Cosmetic-Drift zwischen UI und DB. Selbstheilend nach Page-Reload. DB-State immer korrekt. Validation greift korrekt mit Inline-Error.
- Workaround: Page-Reload zeigt aktuellen DB-State.
- Next Action: Backlog BL-419 — optimistic-update-Reset oder explicit-revert-on-error im patchAndSave-Pfad pruefen.

### ISSUE-048 — SLC-562 PaymentTermsDropdown initial Display-Bug
- Status: resolved
- Severity: Medium
- Area: UI / Proposals-Editor
- Summary: Bei initial render zeigt der Bedingungs-Dropdown den Raw-Value '__custom__' statt des Labels '(eigene Eingabe)'. base-ui SelectValue-Placeholder greift nicht weil useState<string>(CUSTOM_VALUE) gesetzt ist.
- Impact: UX-Anomalie beim Erstmount des Editors. Nach erstem Klick + Auswahl funktioniert es korrekt. Cosmetic, nicht release-blockierend.
- Resolution: 2026-05-02 in BL-418 Hotfix. `useState<string>(CUSTOM_VALUE)` → `useState<string>("")` in `cockpit/src/app/(app)/proposals/[id]/edit/payment-terms-dropdown.tsx`. Empty-String matched kein SelectItem, daher greift der base-ui-Placeholder "(eigene Eingabe)" beim Initial-Mount korrekt. Nach User-Auswahl wird der echte Wert (Template-ID oder CUSTOM_VALUE) gesetzt und das passende SelectItem-Label angezeigt. TypeScript clean.

### ISSUE-047 — F1 React Hydration #418 auf /proposals (Listing-Card Datums-Drift)
- Status: resolved
- Severity: Medium
- Area: UI / Hydration
- Summary: Auf `/proposals` (Listing-Seite) feuert React Hydration Error #418. Ursache war NICHT wie vermutet ein Datums-Format-Drift — Code-Audit (RPT-268) zeigte: Listing rendert kein Datum, kein `Math.random`/`Date.now`/`toLocale` im Render-Pfad. Wahrscheinliche Quelle: Browser-Extension am `<body>`-Element (Standard-Pattern).
- Impact: UI funktional unauffaellig (kein User-sichtbarer Bruch), aber Console-Warning + potenzielle Performance-Degradation bei Re-Render.
- Resolution: 2026-05-01 in V5.5.1 Polish-Patch (Commit `42495cc`). `suppressHydrationWarning` auf `<html>` + `<body>` im Root-Layout (`cockpit/src/app/layout.tsx`). Standard-Pattern fuer extension-induzierten Top-Level-Diff. Limitation: falls #418 weiterhin auftritt, ist die Quelle tiefer (Provider-Race, Auth-State-Drift) und braucht Live-Console-Inspection.

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

### ISSUE-039 — Recording-Volume fuer nextjs-User nicht lesbar (Call-Pipeline blockiert)
- Status: resolved
- Severity: Blocker
- Area: V5.1 / Call-Pipeline / Container-Permissions
- Summary: `/var/spool/asterisk/monitor` (gemounted als `/recordings-calls:ro` im app-Container) ist mit `drwxr-x---` (0750) owned by UID 101 (asterisk). App-Container laeuft als `nextjs` (UID 1001, group nogroup). Kein Lesezugriff moeglich.
- Impact: `/api/cron/call-processing` findet keine WAVs, ALLE Calls werden mit "WAV not yet available" skipped. Gesamte SLC-514 Pipeline (Upload + Whisper + Summary + Timeline) steht still. Verifiziert via manueller Cron-Trigger am 2026-04-24 — 1 vorhandener Test-Call blieb in recording_status='not_recording'.
- Workaround: Keiner ohne Code-Fix. Manuelle chmod 0755 auf Volume koennte funktionieren, ist aber nicht persistent.
- Next Action: Erledigt 2026-04-24 — `asterisk/entrypoint.sh` ergaenzt um `chmod 0755 /var/spool/asterisk/monitor/` + `umask 022` vor `exec asterisk`. Asterisk-Container-Redeploy erforderlich, damit neuer Entrypoint greift.

### ISSUE-040 — Supabase Storage Uploads broken (latent seit Supabase-Upgrade)
- Status: resolved
- Severity: Blocker
- Area: Supabase Self-Hosted / Storage / Role Delegation
- Summary: `supabase_storage_admin` konnte `set_config('role','service_role',...)` nicht ausfuehren, weil die Role-Membership fehlte. ZUSAETZLICH fehlten Schema-Grants auf `storage` und der `search_path` der Request-Rollen. Jeder Upload an irgendeinem Bucket (Meeting + Call) schlug fehl mit PostgreSQL-Error 42501, von der storage-api als "new row violates row-level security policy" gemeldet.
- Impact: SLC-514 Call-Recording-Pipeline blockiert beim Upload-Schritt. Meeting-Recording-Upload (V4.1) war seit letztem Supabase-Upgrade LATENT kaputt — bisher nicht bemerkt, weil kein Meeting-Recording seit dem Upgrade stattfand. Storage-Buckets `meeting-recordings` und `call-recordings` waren beide objektleer.
- Workaround: Keiner — ohne die Grants geht kein Upload durch service_role.
- Next Action: Erledigt 2026-04-24 via MIG-021 (sql/migrations/021_v51_storage_grants_fix.sql): GRANT anon/authenticated/service_role TO supabase_storage_admin, GRANT USAGE ON SCHEMA storage, GRANT CRUD auf storage-Tabellen, search_path=storage,public fuer die Supabase-Request-Rollen. Zusaetzlich MIG-020 um die fehlerhaften call_recordings RLS-Policies bereinigt — wir nutzen BYPASSRLS auf service_role genauso wie meeting-recordings es schon immer tut. E2E-Test am 2026-04-24 gruen: Upload+Whisper+Summary+Activity durchgelaufen.

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

### ISSUE-041 — Call-Processing-Cron interferiert mit SMAO-Calls (latent bis SMAO_ENABLED=true)
- Status: resolved
- Severity: Medium
- Area: V5.1 / Call-Processing / SMAO-Integration
- Summary: Der Cron `/api/cron/call-processing` wuerde SMAO-Calls ohne `recording_url` aufgreifen. Query filtert auf `recording_url IS NULL AND status='completed' AND ended_at IS NOT NULL`. Mein SLC-515 Webhook-Insert setzt exakt diese Felder (status='completed', ended_at=now) und `recording_url=null` wenn SMAO keine URL liefert. Der Cron-Worker versucht dann eine nicht-existente WAV-Datei unter `/recordings-calls/{id}.wav` zu lesen (SMAO-Calls laufen nicht ueber Asterisk-MixMonitor).
- Impact: Keiner in V5.1-Release (SMAO_ENABLED=false default, keine SMAO-Webhooks). Bei SMAO-Go-Live wuerde der Cron bei jedem SMAO-Call in "WAV not yet available" bzw. "file not found" laufen und eventuell `recording_status='failed'` setzen.
- Workaround: SMAO_ENABLED=false beibehalten (aktueller Zustand).
- Resolution: 2026-04-25 — Option (a) umgesetzt. Cron-Query in `cockpit/src/app/api/cron/call-processing/route.ts` um `.eq("voice_agent_handled", false)` ergaenzt. SMAO-Calls werden jetzt vom Asterisk-Pipeline-Cron ignoriert. Pre-SMAO-Go-Live-Blocker entfernt.

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

### ISSUE-038 — VAPID_SUBJECT zeigt auf nicht-existierende E-Mail-Adresse
- Status: resolved
- Severity: Low
- Area: Push Notifications / ENV
- Summary: VAPID_SUBJECT in Coolify stand auf `mailto:admin@strategaizetransition.com` — diese Adresse existierte nicht. Geaendert auf `mailto:immo@bellaerts.de` am 2026-04-18 vor V4.1 Redeploy.
- Next Action: Erledigt.

### ISSUE-046 — Proposal-PDF Signed-URL nutzte internen Kong-Hostname (Mixed-Content)
- Status: resolved
- Severity: Blocker
- Area: V5.5 / SLC-553 / Storage / Self-Hosted-Supabase
- Summary: `admin.storage.from('proposal-pdfs').createSignedUrl(path, 300)` returnte URLs mit dem internen Container-Hostname `http://supabase-kong:8000`. Coolify-Reverse-Proxy hat KEIN Routing zu Kong (`https://business.strategaizetransition.com/supabase` liefert 404). Browser blockierte die HTTP-iframe-URL zusaetzlich mit Mixed-Content auf der HTTPS-Seite. Pattern identisch mit ISSUE-044 (V5.3 Logo) — die Signed-URL-Variante umgeht NICHT die Public-URL-Probleme.
- Impact: PDF-Generierung war serverseitig vollstaendig erfolgreich (Storage + DB-Persistenz + audit_log + Renderer-Performance), aber iframe-Anzeige + Download im Modal komplett broken. AC10 + AC11 verletzt. Nur durch echten externen Browser-Zugriff reproduzierbar.
- Workaround: Keiner ohne Code-Fix.
- Next Action: Erledigt 2026-04-30 via Hotfix Commit `91020b2`:
  1. Neue Route `cockpit/src/app/api/proposals/[id]/pdf/route.ts` (Pattern analog SLC-531 `/api/branding/logo`) — service_role-Download mit Auth-Check, Content-Type `application/pdf`, Content-Disposition inline mit Filename.
  2. `generateProposalPdf` returnt relative URL `/api/proposals/{id}/pdf?v={version}-{timestamp}` statt Signed-URL.
  3. `createSignedUrl` + `PDF_SIGNED_URL_TTL_SECONDS` entfernt.
  4. Cache-Buster verhindert iframe-Re-Use bei erneuter Generierung.
  5. Build + 76/76 Tests gruen, Re-Smoke nach Coolify-Redeploy PASS.

### ISSUE-045 — Server-side Total-Size-Limit fuer E-Mail-Anhaenge ist Client-Convenience
- Status: resolved
- Severity: Low
- Area: V5.4 / SLC-542 / E-Mail-Anhaenge / Storage
- Summary: `uploadEmailAttachment` ruft `validateAttachment(file, totalSizeSoFar=0)` — der Server hatte keinen Cross-Call-State und kannte nicht die kumulierte Anhang-Groesse der Compose-Session. Pro-File-Limit (10 MB) war 3-fach hart enforced (Browser + Upload + Send), aber das Total-Limit (25 MB) war nur Browser-Convenience.
- Impact: Niedrig fuer internal-tool single-user delivery-mode. Storage-Volumen-Verbrauch ohne Cleanup-Cron (DEC-104 deferred). Kein direkter Sicherheits-Impact, kein Daten-Verlust.
- Resolution: 2026-05-01 in V5.5.1 Polish-Patch (Commit `d996307`). `/api/emails/attachments` POST liest jetzt `admin.storage.from('email-attachments').list(${user.id}/${composeSessionId}/)` und summiert `f.metadata.size` als `totalSizeSoFar`. Validation greift, der Client-Bypass-Vektor ist geschlossen. Single list()-Call deckt zusaetzlich Filename-Kollisions-Suffix ab (gemeinsam mit SLC-542 L1).

### ISSUE-044 — Branding-Logo broken-image im Browser (Public-Storage extern nicht erreichbar)
- Status: resolved
- Severity: High
- Area: V5.3 / SLC-531 / Storage / Self-Hosted-Supabase
- Summary: Beim ersten Browser-Smoke-Test SLC-531 (2026-04-27) zeigt `<img src=...>` ein broken-image obwohl Upload + DB-Persistenz erfolgreich. Zwei Ursachen: (a) `admin.storage.getPublicUrl()` baut die URL aus `SUPABASE_URL=http://supabase-kong:8000` (Docker-intern, browser-unerreichbar). (b) `storage.objects` hatte 0 SELECT-Policies fuer den `branding`-Bucket — `public=true` allein reicht bei Self-Hosted-Supabase nicht. Zusaetzlich: das Hosting-Setup hat keinen Reverse-Proxy von `https://business.strategaizetransition.com/supabase/storage/...` zu Kong, d.h. selbst mit korrekter External-URL kommt nichts an.
- Impact: Logo-Anzeige in Form-Vorschau und in versendeten Mails kaputt. AC2/AC3 Browser-Smoke blockiert. AC8 Smoke (echte Mail) waere mit broken image bei Empfaengern angekommen.
- Workaround: Keiner ohne Code-Fix.
- Next Action: Erledigt 2026-04-27 via:
  1. MIG-024 (`024_v53_branding_storage_policy_fix.sql`) — SELECT-Policy `branding_public_read` fuer anon+authenticated; UPDATE alter Logo-URLs auf NULL (User laedt nach Code-Fix neu hoch).
  2. Strategie-Switch: Statt extern erreichbarer Kong-Public-URL liefern wir das Logo via Next.js-API-Route `/api/branding/logo` aus. Service_role-Client laedt das neueste File aus dem `branding`-Bucket und proxiet es mit korrektem Content-Type. Cache-Buster `?v=ts` erzwingt Refresh nach Upload. Middleware ergaenzt um `/api/branding` in publicPaths.
  3. `actions.ts uploadLogo` speichert jetzt `${NEXT_PUBLIC_APP_URL}/api/branding/logo?v=${Date.now()}` statt der Storage-URL.

### ISSUE-043 — Branding-Form Color-Picker submitted immer einen Wert (AC9-Drift)
- Status: resolved
- Severity: Medium
- Area: V5.3 / SLC-531 / /settings/branding / Renderer-Fallback
- Summary: `<input type="color">` im Branding-Form submitted IMMER einen gueltigen Hex-Wert (Default `#4454b8`/`#94a3b8`), auch wenn der User die Picker nie bewusst angefasst hat. Sobald der User auf `/settings/branding` einmal "Speichern" klickt, wird `primary_color` (und ggf. `secondary_color`) als nicht-null in `branding_settings` persistiert — `isBrandingEmpty` returnt danach `false`, der Renderer verlaesst den `textToHtml`-Fallback und schaltet auf Branding-Output (Inline-CSS, Footer-Linie). Damit gilt AC9 (Bit-fuer-Bit-Identitaet zum V5.2-Output) nur noch im **Initial-State** (User hat /settings/branding nie besucht).
- Impact: User-Erwartung "ich habe alles geleert, Mail sollte wieder plain rausgehen" wird nicht erfuellt, solange primary_color einen Wert hat. Kein Daten-Verlust und keine Sicherheitsluecke — nur ein latenter UX-Drift gegen die explizit dokumentierte AC9-Garantie. Keine V5.2-Regression im laufenden Production-System (DB-Empty-Row ist initial korrekt seeded).
- Resolution: 2026-04-28 in SLC-541 V5.4-Polish (DEC-102). `ConditionalColorPicker`-Komponente mit Toggle-Checkbox vor dem Color-Picker. Toggle aus → onChange(null), persistierter Wert NULL; Toggle an → onChange(hex), persistierter Wert = Hex. Initial-State leitet sich aus DB-Wert ab. AC9-Bit-Identitaet wieder zuverlaessig — User mit primary_color=NULL bekommt textToHtml-Fallback unabhaengig davon, ob er die Settings-Page besucht hat. Verifiziert in QA SLC-541 (RPT-243).

### ISSUE-042 — OpenAI-API-Key in untrackter Datei am Repo-Root
- Status: open
- Severity: High
- Area: Security / Credentials
- Summary: Datei `open AI Business system.txt` im Repo-Root enthaelt einen produktiven OpenAI-API-Key (`sk-proj-...`). Untracked (NIE in git history), nur lokal im Working-Tree seit ca. 2026-04-06. Risiko: versehentliches Commit via `git add .`, Filesystem-Zugriff durch Dritte, Credential-Leak ueber Backup/Cloud-Sync.
- Impact: OpenAI-Key ist fuer aktuellen V5.2-Whisper-Provider (`TRANSCRIPTION_PROVIDER=openai`) potenziell der Production-Key. Bei Leak: unautorisierte API-Nutzung auf Kosten des OpenAI-Account, unkontrollierte Kosten, Audio-Daten-Exposition durch Dritt-Calls.
- Workaround: Im V5.2 Final-Check (RPT-217) am 2026-04-26 wurde `.gitignore` defensiv um Credential-Patterns (`*api*key*.txt`, `open AI*.txt` u.a.) erweitert. Datei ist nun von Git unsichtbar — kann nicht mehr versehentlich committed werden.
- Next Action:
  1. Key bei OpenAI rotieren (platform.openai.com → API Keys → revoke + create new)
  2. Neuen Key in Coolify-ENV `OPENAI_API_KEY` setzen
  3. Lokale Datei loeschen oder nach `~/credentials/` ausserhalb des Repos verschieben
  4. (Pre-Go-Live Pflicht) Switch auf Azure OpenAI EU per `TRANSCRIPTION_PROVIDER=azure` macht den OpenAI-US-Key irrelevant — diese Massnahme reduziert Blast-Radius dauerhaft.
