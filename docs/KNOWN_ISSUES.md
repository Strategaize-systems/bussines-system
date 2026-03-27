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
- Status: open
- Severity: Medium
- Area: Frontend / UX
- Summary: Contact-Sheet und Company-Sheet prüfen Fehler für Close-Logik, zeigen aber keinen Fehler-Text an. User bekommt bei fehlgeschlagenem Create/Update kein Feedback.
- Next Action: Fehler-Anzeige in Sheets einbauen.

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
- Status: open
- Severity: Medium
- Area: Frontend / Settings
- Summary: `reorderStages()` existiert in actions.ts, wird aber nie aufgerufen. GripVertical-Icon in Settings ist rein dekorativ.
- Next Action: DnD-Reorder in Settings einbauen oder Icon entfernen.

### ISSUE-017 — getContactsForSelect dupliziert in Pipeline-Seiten
- Status: open
- Severity: Medium
- Area: Frontend / Code Quality
- Summary: Gleiche Funktion `getContactsForSelect` in endkunden/page.tsx und multiplikatoren/page.tsx statt in shared actions.
- Next Action: In contacts/actions.ts oder pipeline/actions.ts auslagern.

### ISSUE-018 — Supabase Storage Bucket "documents" wird nirgends erstellt
- Status: open
- Severity: High
- Area: Infrastructure / Storage
- Summary: `uploadDocument` referenziert `supabase.storage.from("documents")`, aber kein Storage Bucket existiert in Init-Scripts oder Migrations. Upload schlägt zur Laufzeit fehl.
- Impact: Dokument-Upload funktioniert nicht ohne manuelles Erstellen des Buckets.
- Next Action: Bei SLC-011 (Deployment) als Post-Deploy-Step oder SQL-Migration adressieren.

### ISSUE-019 — Aktivitäten + Dokumente fehlen auf Deal-Ebene
- Status: open
- Severity: Medium
- Area: Frontend / Pipeline
- Summary: Actions unterstützen dealId, aber kein Deal-Detail-View existiert. Deal-bezogene Aktivitäten/Dokumente können nicht eingesehen werden.
- Next Action: Deal-Detail-Seite als eigenen Slice oder Erweiterung planen.

### ISSUE-020 — deleteDocument prüft Storage-Delete-Ergebnis nicht
- Status: open
- Severity: Medium
- Area: Backend / Storage
- Summary: Storage-Remove Ergebnis wird in document-actions.ts ignoriert. DB-Record wird gelöscht auch wenn Storage-Delete fehlschlägt.
- Next Action: Storage-Delete Ergebnis prüfen oder zumindest loggen.

## Low

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
