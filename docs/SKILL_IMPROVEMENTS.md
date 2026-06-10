# Skill Improvements

### IMP-005 — Cross-Repo-Tabellen-Annahme (`ai_cost_ledger`) lief ungeprueft durch 4 Workflow-Steps
- Date: 2026-06-10
- Source: /backend SLC-909 A-V812-2 Pre-Check (V8.12 LLM-Cost-Cap)
- Observation: SLC-909/DEC-281/ARCHITECTURE haben durchgehend angenommen, dass eine per-Tenant-Cost-Ledger-Tabelle `ai_cost_ledger.tenant_id` in BS existiert ("existing seit V6.4"). Tatsaechlich existiert die Tabelle in BS nicht (Live-Check `to_regclass` → NULL), und KEINE Tabelle hat eine `tenant_id`-Spalte — `ai_cost_ledger`/`ai_jobs` ist eine Intelligence-Studio-Konstruktion. Die Annahme stammt aus Cross-Repo-Pattern-Notizen (BL-504-Description: "identisches Pattern in OP V8.0.3 + IS V1.2, alle 3 Repos haben Bedrock-Adapter") — aber "hat einen Bedrock-Adapter" ≠ "hat einen Cost-Ledger". Die falsche Annahme lief ungeprueft durch /discovery → /requirements → /architecture → /slice-planning und wurde erst beim Pre-Coding-Live-Check (richtig vom Slice vorgesehen) entdeckt. ~Eine halbe /backend-Session ging in Diagnose + Records-Korrektur statt Implementation.
- Suggested Improvement: (1) /requirements + /architecture: jede Aussage "Tabelle/Spalte X existing" die aus einem ANDEREN Strategaize-Repo stammt, MUSS per Live-Schema-Check (`to_regclass('public.X')` / `information_schema.columns`) gegen die Ziel-Repo-DB bestaetigt werden, BEVOR sie als "existing" in einen DEC/ARCHITECTURE-Eintrag eingeht — nicht erst im /backend-Pre-Check. (2) strategaize-pattern-reuse.md: Cross-Repo-Pattern-Reuse-Notizen muessen zwischen "Code-Pattern portierbar" (Adapter, Helper) und "Schema-Abhaengigkeit vorhanden" (Tabelle, Spalte, RPC) unterscheiden — Schema-Abhaengigkeiten sind NICHT automatisch cross-repo vorhanden. (3) /slice-planning: ein "Pre-Check"-MT der eine Tabelle voraussetzt sollte auch den Fall "Tabelle existiert gar nicht" als Verzweigung haben (nicht nur "tenant_id IS NULL > 0").
- Affected Area: /requirements + /architecture (Cross-Repo-"existing"-Claims), strategaize-pattern-reuse.md (Schema-vs-Code-Reuse-Unterscheidung), /slice-planning (Pre-Check-MT-Verzweigungen). Dev-System-Kandidat.
- Status: open

### IMP-001 — KI-Analyse Cockpit ersetzt statisches Dashboard-Konzept

- Date: 2026-04-08
- Source: User-Feedback bei V2.2 Dashboard Redesign
- Observation: Klassisches Dashboard mit 4 festen KPI-Kacheln + 2 Tabellen wurde als zu statisch empfunden. User arbeitet nicht mit vorgefertigten Ansichten, sondern will ad-hoc fragen was ihn interessiert. Paradigmenwechsel: Das Dashboard wird zum KI-gesteuerten Analyse-Cockpit. Natürlichsprachliche Fragen (Text + Voice) → dynamisch generierte Darstellungen (Charts, Tabellen, KPIs). Voraussetzung: alle Business-Daten müssen cross-module verknüpft und per LLM abfragbar sein.
- Suggested Improvement: Nächste Implementationsschritte:
  1. LLM-Query-Layer: Natürliche Sprache → SQL/API-Abfragen (Claude Sonnet via Bedrock)
  2. Dynamic Rendering Engine: Abfrage-Ergebnisse als Chart, Tabelle oder KPI-Card darstellen
  3. Gespeicherte Abfragen + Preset-Filter als Quick-Access
  4. Cross-System-Integration (Blueprint, OS, Intelligence Studio Daten einbeziehen)
- Affected Area: Dashboard, Datenmodell (Verknüpfung aller Module), API-Layer, LLM-Integration
- Status: open

### IMP-003 — SQL-Migration Workflow: Container-Discovery vor SQL-Ausgabe

- Date: 2026-04-09
- Source: SLC-301 V3 Schema-Migration — User musste Container-Namen manuell nachsuchen
- Observation: Bei SQL-Migrationen auf Hetzner wurde das komplette SQL zusammen mit einem hardcodierten Container-Namen (supabase-db) ausgegeben. Der Container heißt aber dynamisch (Coolify generiert z.B. supabase-db-k9f5pn5upfq7etoefb5ukbcg-124113196331). User musste mehrfach nachfragen und die Schritte manuell durchgehen.
- Suggested Improvement: Fester 4-Schritt-Workflow bei jeder SQL-Migration: (1) SSH-Befehl geben + warten, (2) Container-Discovery-Befehl geben + warten auf Antwort, (3) docker exec mit gemeldetem Container-Namen + warten auf psql-Prompt, (4) erst dann SQL-Block liefern. Nie das SQL zusammen mit den Verbindungsbefehlen in einem Rutsch rausgeben. Nie Container-Namen hardcoden.
- Affected Area: /backend Skill (SQL-Migrationen), Memory feedback_sql_on_hetzner.md, Memory reference_hetzner_ssh.md
- Status: resolved

### IMP-002 — Mein Tag KI-Assistent: Voice-Driven Workflow Assistant

- Date: 2026-04-08
- Source: User-Vision bei V2.2 "Mein Tag" KI-Assistent Einbau
- Observation: Das KI-Analyse-Cockpit-Konzept (IMP-001, Dashboard, read-only) hat eine deutlich mächtigere Variante: ein operativer KI-Assistent in "Mein Tag", der nicht nur Daten abfragt sondern **Arbeit erledigt** — E-Mails schreiben und senden, Aufgaben umplanen, Meeting-Zusammenfassungen verarbeiten, CRM-Einträge aktualisieren. Komplett sprachgesteuert. Konkretes Szenario: Meeting beenden → Summary fließt ein → "Erstell E-Mail auf Basis Rückruf-Vorlage" → KI generiert Text → "Überarbeite, sende raus, Aufgabe erledigt" → alles in einem Flow ohne Keyboard. Voraussetzung: Intent-Erkennung (read vs. write), Action-Engine, E-Mail-Template-System, Meeting-Integration, Cross-System-Daten.
- Suggested Improvement: Architektur muss zwei KI-Modi unterscheiden:
  1. **Query-Modus** (Dashboard): Natürliche Sprache → SQL/API → Darstellung (read-only)
  2. **Action-Modus** (Mein Tag): Natürliche Sprache → Intent → Bestätigung → Ausführung (read+write+execute)
  Action-Modus braucht: Tool-Calling/Function-Calling Pattern, Bestätigungs-Loop, Undo-Fähigkeit, Audit-Trail
- Affected Area: Gesamtarchitektur (LLM-Layer), E-Mail-System, Aufgaben-System, Meeting-System, Voice-Pipeline
- Status: open

### IMP-004 — Logger-Redaction ist Strategaize-Cross-Repo-Origin-Pattern (BS V8.12)

- Date: 2026-06-10
- Source: SLC-907 /backend (BL-503, FEAT-922 Phase 2.1) — Cross-Repo-Audit ergab, dass Secret-/PII-Keys via unstrukturiertem `console.*`-Log in Coolify-Container-Logs landen koennen, und kein Strategaize-Repo bisher eine Redaction-Schicht hatte (RPT-608 Pattern-Reuse-Audit: 0% reuse, BS V8.12 ist Origin).
- Observation: `redactSecrets(obj, opts?)` (pure, deep-recursive, WeakSet-circular-guard, MAX_DEPTH=10) + top-level `logSafe(level, ...args)` Wrapper (DEC-286, kein `console.*` Drop-In) loesen das Problem mechanisch. 12 Default-Keys per DEC-280 (Security-Core 10 + PII-Minimal 2). `redactSecrets` ist Named Export fuer SLC-911 Sentry-`beforeSend`-Reuse. Implementiert unter `cockpit/src/lib/logger/{redact.ts,index.ts}`, 17 critical Caller-Sites migriert, 20 Vitest GREEN.
- Suggested Improvement: Pattern in die Dev-System-Registry aufnehmen: (1) Tabellen-Eintrag "Logger-Redaction / logSafe" in `.claude/rules/strategaize-pattern-reuse.md` (Origin: BS V8.12 SLC-907, Quelle `cockpit/src/lib/logger/redact.ts` + `index.ts`); (2) Memory-File `feedback_logger_redaction_logsafe.md`; (3) Cross-Repo-Nachzug auf OP V9.x+ / IS V4.x+ / immoscheckheft V3.x+ als 1:1-Port mit Quell-Pfad-Header-Kommentar. Empfehlung: Registry-Eintrag erst nach SLC-907 /qa-PASS, damit andere Repos nicht auf unverifizierten Code zeigen.
- Affected Area: `.claude/rules/strategaize-pattern-reuse.md` (Dev-System), neue Memory `feedback_logger_redaction_logsafe.md`, OP/IS/immoscheckheft Logger-Layer
- Status: open
