# Known Issues

## Blocker

### ISSUE-001 — Dockerfile für Cockpit fehlt
- Status: open
- Severity: Blocker
- Area: Infrastructure / Docker
- Summary: `/cockpit/Dockerfile` existiert nicht, wird aber in `docker-compose.yml` Zeile 25 referenziert. Docker Compose kann ohne Dockerfile nicht bauen.
- Impact: Stack kann nicht gestartet werden.
- Next Action: Dockerfile erstellen (Multi-Stage Build: npm install → npm run build → serve).

### ISSUE-002 — Dockerfile.kong für Kong Env-Var-Substitution fehlt
- Status: open
- Severity: Blocker
- Area: Infrastructure / Kong
- Summary: Kong 2.x ersetzt `${ENV_VAR}` in deklarativer Config nicht automatisch. Das Blueprint-Projekt nutzt `config/Dockerfile.kong` mit `envsubst`. Business System referenziert stattdessen `image: kong:2.8.1` direkt.
- Impact: Kong startet, aber Auth-Keys werden nicht eingesetzt. API entweder komplett offen oder komplett blockiert.
- Next Action: `config/Dockerfile.kong` aus Blueprint kopieren und `docker-compose.yml` auf Build-Context umstellen.

## High

### ISSUE-003 — Supabase DB Init-Scripts werden durch Volume-Mount überschrieben
- Status: open
- Severity: High
- Area: Infrastructure / Database
- Summary: `docker-compose.yml` mapped `./sql:/docker-entrypoint-initdb.d` als Volume. Das überschreibt die Supabase-internen Init-Scripts die Rollen wie `supabase_auth_admin`, `authenticator`, `anon` anlegen.
- Impact: PostgREST, GoTrue und Storage können sich nicht authentifizieren.
- Workaround: `sql/Dockerfile.db` erstellen das Supabase-Rollen zuerst anlegt (wie Blueprint-Pattern).
- Next Action: Dockerfile.db aus Blueprint adaptieren.

### ISSUE-004 — Kontakt-Bearbeiten UI fehlt
- Status: open
- Severity: High
- Area: Frontend / CRM
- Summary: `updateContact` Server Action existiert, aber keine UI nutzt sie. Kein Bearbeiten-Button auf Kontakt-Detail oder in der Liste.
- Impact: Acceptance Criterion "Kontakte bearbeiten" (FEAT-001) nicht erfüllt.
- Next Action: Edit-Sheet oder Edit-Button auf Kontakt-Detail-Seite einbauen.

### ISSUE-005 — Firmen-Bearbeiten UI fehlt
- Status: open
- Severity: High
- Area: Frontend / CRM
- Summary: Gleich wie ISSUE-004 für Firmen. `updateCompany` existiert, aber keine UI.
- Impact: Acceptance Criterion "Firmen bearbeiten" nicht erfüllt.
- Next Action: Edit-Sheet auf Firmen-Detail einbauen.

### ISSUE-006 — Skills nicht als Claude Code Slash-Commands registriert
- Status: open
- Severity: High
- Area: Skills / Claude Code
- Summary: 8 SKILL.md Dateien liegen unter `/skills/`. Claude Code erwartet Skills unter `.claude/skills/`. Ohne korrekte Registrierung sind Skills nicht als `/skill-name` aufrufbar.
- Impact: Acceptance Criterion "Skills sind über Claude Code als `/skill-name` aufrufbar" unsicher.
- Next Action: Prüfen ob Pfad-Mapping in CLAUDE.md ausreicht oder ob Skills nach `.claude/skills/` verschoben werden müssen.

## Medium

### ISSUE-007 — Kontakt-Detail enthält Stub für Aktivitäten
- Status: open
- Severity: Medium
- Area: Frontend / CRM
- Summary: Platzhalter-Text "Aktivitäten-Timeline wird in SLC-005 implementiert" in Production-Code.
- Next Action: Nach SLC-005 entfernen.

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

## Low

### ISSUE-010 — Dashboard ist nur Stub
- Status: open
- Severity: Low
- Area: Frontend / Dashboard
- Summary: Dashboard-Seite zeigt nur "Willkommen im Business Cockpit". Geplant für SLC-006.
- Next Action: SLC-006 implementieren.

### ISSUE-011 — .env.local enthält Platzhalter-Werte
- Status: open
- Severity: Low
- Area: Configuration
- Summary: Platzhalter wie "placeholder-will-be-replaced" in .env.local. Akzeptabel für Dev, .gitignore schützt vor Commit.
- Next Action: Bei Deployment echte Werte einsetzen (SLC-011).
