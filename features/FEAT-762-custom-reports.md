# FEAT-762 — Custom-Reports im KI-Workspace

**Version:** V7.6
**Sprint:** V7.6 NL-Workspace-Integration + Custom-Reports
**Status:** planned (requirements done 2026-05-19)
**Geschaetzter Aufwand:** ~1-2 Slices, eine additive Schema-Migration (custom_reports-Tabelle)
**Vorgaenger:** FEAT-761 NL-Builder im Workspace
**Nachfolger:** V7.7+ (BL-478 ISSUE-078 Sonner-Toast, ggf. NL-Builder-auf-Deal-Detail, externes-API V8+)
**Quelle:** BL-442, V6.6-Discovery 2026-05-09

## Problem Statement

V6.6 hat das KI-Workspace-Hybrid-Pattern etabliert: 5 fixe Berichts-Buttons + freie Frage + Antwort-Fenster. V7.5 hat den NL-Workflow-Sculptor hinzugefuegt (Bedrock kann NL-Beschreibung in Workflow-Schema umwandeln). Bisher fehlt aber der naechste logische Schritt: **wiederverwendbare KI-Abfragen**.

### Konkrete Symptome
1. **Berichts-Set ist hartcodiert.** `MEIN_TAG_REPORTS` / `DEAL_DETAIL_REPORTS` / `COCKPIT_REPORTS` haben jeweils 5-6 fixe Eintraege. Wenn ein User eine wiederkehrende Frage stellt ("Welche Multiplikatoren-Termine sind in 7 Tagen?", "Welche Deals haben keine Aktivitaet seit 14 Tagen?"), muss er sie immer wieder neu tippen.
2. **Tribal Knowledge.** Erfahrene User entwickeln gute Prompt-Formulierungen. Diese gehen verloren, weil sie nicht persistiert sind.
3. **Skalierungs-Problem.** Wenn man fuer jeden Wunsch einen neuen Standard-Button hinzufuegt, entsteht "Button-Inflation" (Memory `feedback_ki_workspace_pattern` warnt explizit davor).

### Warum jetzt
Custom-Reports brauchen das **refactorierte Workspace** aus FEAT-761 als Foundation. Ohne FEAT-761 wuerde Custom-Reports entweder in einer separaten Card landen (V6.6-Pattern-Verletzung) oder doppelt refactoriert werden muessen. Plus: V7.5-Architektur (Bedrock Claude Sonnet eu-central-1) und Cost-Audit-Pattern sind verfuegbar.

## Goal / Intended Outcome

Nach FEAT-762:
- **User legt eigene Berichts-Vorlagen an** durch:
  1. Freie Frage stellen im KI-Workspace
  2. Antwort gefaellt → Klick "Als Bericht speichern" auf der Antwort
  3. Berichtsnamen vergeben → speichern
- **Custom-Reports erscheinen** in einem "Meine Berichte"-Dropdown rechts neben den Standard-Buttons (KEINE Button-Inflation per V6.6-Direktive).
- **Dropdown-UX:** Type-Ahead-Filter (fuer User mit >5 Custom-Reports) + Klick auf Eintrag triggert Bericht-Ausfuehrung im Antwort-Fenster.
- **Persistenz:** custom_reports-Tabelle mit RLS (owner-scope).
- **Versionierung in V1:** keine. Nur create / rename / delete. Edit kommt in V7.7+ wenn benoetigt.

## Primary User

- Alle Rollen (Admin / Teamlead / Member) auf `/mein-tag` und `/dashboard`.
- **Out-of-Scope V7.6:** `/deal/[id]` Custom-Reports — Deal-spezifische Custom-Reports brauchen Deal-Context-Persistenz (template_text + scope_hint resolve auf konkreten Deal). Komplexer. Defer V7.7+.

## V1 Scope (V7.6-FEAT-762)

### In-Scope

**MT-1 — MIG-037 custom_reports-Tabelle**

```sql
CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('mein-tag', 'cockpit')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  prompt_template TEXT NOT NULL CHECK (length(prompt_template) BETWEEN 10 AND 2000),
  description TEXT,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_reports_owner ON custom_reports(owner_user_id, context_type);
CREATE UNIQUE INDEX idx_custom_reports_owner_name ON custom_reports(owner_user_id, name);

-- RLS
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_reports_owner_select ON custom_reports
  FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY custom_reports_owner_insert ON custom_reports
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY custom_reports_owner_update ON custom_reports
  FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY custom_reports_owner_delete ON custom_reports
  FOR DELETE USING (owner_user_id = auth.uid());
```

**MT-2 — Save-Action: `saveCustomReport` Server-Action**

- Input: `{ name, prompt_template, context_type, description? }`.
- Validierung: name 2-80 chars, prompt_template 10-2000 chars, context_type in Whitelist.
- UNIQUE constraint catch: `name` darf nicht doppelt sein pro Owner — bei Duplicate-Insert HTTP 409 mit "Name bereits vergeben".
- audit_log INSERT mit `action='custom_report.created'`, `entity_id=custom_reports.id`.
- Result-Pattern: `{ ok: true, id } | { ok: false, code, message }`.

**MT-3 — List + Run-Actions: `listCustomReports` + `runCustomReport`**

- `listCustomReports({ context_type })` returnt Owner-scoped, sortiert by last_used_at DESC NULLS LAST, dann created_at DESC.
- `runCustomReport({ id })`:
  1. RLS-Load (Owner-Check implicit)
  2. Bedrock-Call mit `prompt_template` + Owner-Scope-Daten (analog Standard-Reports — context-spezifischer Datenkontext aus existierender Workspace-Logik)
  3. UPDATE custom_reports SET usage_count = usage_count + 1, last_used_at = now()
  4. audit_log INSERT mit `action='custom_report.executed'`, `entity_id=custom_reports.id`, `context.cost_usd=...`
  5. Result: gleiches `ReportResult = { markdown, completedAt, model, refreshable }`-Format wie Standard-Reports.

**MT-4 — UI: "Als Bericht speichern" auf AnswerPane**

- AnswerPane bekommt einen neuen Action-Button neben dem "Aktualisieren"-Button: "Als Bericht speichern".
- Sichtbarkeitsregel: nur wenn `result` rendered AND `result` kommt aus freier Frage (NICHT aus Standard-Bericht und NICHT aus NL-Builder-Mode — sonst Buttons-Spam).
- Klick oeffnet kleinen Modal/Inline-Form mit:
  - Name-Field (Pflicht)
  - Description-Field (optional)
  - Speichern-Button → Server-Action `saveCustomReport` → bei Success Modal schliesst + Custom-Reports-Dropdown refreshet.

**MT-5 — UI: "Meine Berichte"-Dropdown im Workspace**

- Rechts neben den Standard-Buttons (nach NL-Builder-Button aus FEAT-761).
- Dropdown-Trigger: Button mit Label "Meine Berichte" + chevron-icon. Bei 0 Custom-Reports: leerer Dropdown-State mit Hint "Stelle eine freie Frage und speichere die Antwort als Bericht."
- Bei 1-5 Custom-Reports: einfache Liste.
- Bei 6+ Custom-Reports: Type-Ahead-Filter-Input oben.
- Item-Eintrag: Name + last_used_at als Zeit-Postfix ("vor 3 Tagen").
- Klick auf Item: triggert `runCustomReport({ id })` → AnswerPane rendert Ergebnis.
- Context-Filter: Dropdown auf `/mein-tag` zeigt nur `context_type='mein-tag'`-Reports. Dropdown auf `/dashboard` zeigt nur `context_type='cockpit'`-Reports.

**MT-6 — UI: Custom-Report-Verwaltung (Rename + Delete)**

- Im Dropdown-Item: kleines "⋮"-Icon → Sub-Menu "Umbenennen" + "Loeschen".
- Umbenennen: Inline-Input oder kleiner Modal.
- Loeschen: Confirm-Dialog ("Bericht 'XYZ' loeschen?") + Server-Action `deleteCustomReport({ id })` + audit_log `custom_report.deleted`.

**MT-7 — Doc-Hygiene**

- `docs/AUDIT_SERVER_ACTIONS_V7.md` Section ergaenzen mit FEAT-762-Server-Actions (saveCustomReport, listCustomReports, runCustomReport, deleteCustomReport, renameCustomReport).
- `docs/MIGRATIONS.md` MIG-037-Eintrag.

### Acceptance Criteria

**AC-1** MIG-037 idempotent applied auf Hetzner-DB. `custom_reports`-Tabelle existiert mit RLS + 4 Policies + 2 Indizes.
**AC-2** User stellt freie Frage im Workspace, Klick "Als Bericht speichern", vergibt Namen → Bericht ist in DB persistiert (RLS-isoliert, owner_user_id = auth.uid()).
**AC-3** "Meine Berichte"-Dropdown zeigt den neuen Bericht nach Modal-Close (Listing refreshed).
**AC-4** Klick auf Custom-Report-Dropdown-Item triggert `runCustomReport`, AnswerPane rendert Bedrock-Antwort, audit_log enthaelt `custom_report.executed`-Eintrag mit Cost-Wert.
**AC-5** Owner-Isolation: User A sieht User B's Custom-Reports nicht (RLS-Live-DB-Test).
**AC-6** Type-Ahead-Filter funktioniert ab 6+ Eintraegen (Filter case-insensitive auf `name`).
**AC-7** Context-Filter: `/mein-tag`-Dropdown zeigt keine `cockpit`-Reports und umgekehrt.
**AC-8** UNIQUE-Constraint catch: Speichern mit Duplicate-Name liefert HTTP 409 mit User-friendly Fehler.
**AC-9** Rename + Delete funktionieren end-to-end mit audit_log-Trail.
**AC-10** Vitest 1100+/1100+ PASS (V7.6-Tests addieren).
**AC-11** Live-Smoke: User legt 3 Custom-Reports an, ruft 1x ab, loescht 1x, sieht Dropdown korrekt aktualisiert.

### Out-of-Scope V7.6 (Defer)

- **Custom-Reports auf `/deal/[id]`.** Deal-Context-Persistenz ist komplexer (template_text muss deal-spezifische Felder substituieren). Defer V7.7+.
- **Custom-Reports auf `/team` (Team-Cockpit).** TEAM_COCKPIT_REPORTS hat eigene Bedrock-Pipeline. Defer V7.7+.
- **Team-Sharing.** User koennen Reports nicht teilen / nicht exportieren. Defer V8.
- **Versionierung.** Edit von prompt_template ueberschreibt — kein History-Trail. Defer V7.7+ wenn benoetigt.
- **Bulk-Operations.** Kein Bulk-Delete, kein Import/Export von Reports. V7.7+.
- **Pre-Built-Vorlagen** ("Multiplikator-Aktivitaeten letzte 30 Tage", "Stagnierende Deals nach Phase"). Diese koennten als Initialisierungs-Set kommen, defer V7.7+.

## Constraints

- **EU-Region pflicht:** Bedrock Claude Sonnet `eu-central-1` (Memory `data-residency`).
- **Strategaize-Pattern-Reuse:** Native HTML Form-Pattern, V2-Sidebar-Layout, Brand-Tokens, Owner-Scope-RLS.
- **MIG-037 muss idempotent sein:** `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS`.
- **Cost-Audit-Trail:** Jeder `runCustomReport`-Call muss `audit_log` mit `cost_usd` + `model_id` schreiben.
- **No Free-Form-Bedrock-Call ohne Save-Persistenz.** Die "Speichern"-Funktion gilt nur fuer **bereits ausgefuehrte** Bedrock-Antworten (User sieht Ergebnis vorher).

## Risks / Assumptions

- **Risk:** prompt_template enthaelt PII oder Geschaeftsgeheimnisse. **Mitigation:** RLS scopt strikt auf owner, Admin-Forensik ueber audit_log moeglich. Im Compliance-Review (Pre-Production-Gate) als Item aufnehmen.
- **Risk:** User speichert "Schrott-Prompts" die immer wieder $0.01 kosten. **Mitigation:** Audit-Log macht Cost transparent fuer Admin. V7.7+ ggf. Per-User-Cost-Cap.
- **Risk:** prompt_template kann Bedrock zu beliebigen Antworten zwingen (Prompt-Injection vom User). **Akzeptiert:** User darf nur seine eigenen Berichte ausfuehren, keine Cross-User-Wirkung. Aehnlich zu freier-Frage-Pfad heute.
- **Assumption:** Standard-Report-Bedrock-Calls (z.B. `runReport` aus `lib/ki-workspace/reports/tagesanalyse.ts`) reichen daten-context-maessig fuer Custom-Reports aus. Wenn nicht, muss Custom-Reports-Runner eigene Data-Loader haben. Im /architecture klaeren.
- **Assumption:** UNIQUE(owner_user_id, name)-Constraint reicht aus — User braucht keine 2 Reports gleichen Namens.

## Success Criteria

FEAT-762 ist erfolgreich wenn:
- alle 11 AC erfuellt sind
- Production-User Richard legt mind. 1 Custom-Report an + ruft ihn 2x ab (audit_log + usage_count beweist)
- Dropdown-UX ist intuitiv genug fuer Erstnutzer ohne Tutorial (kurzer Hint "Stelle eine freie Frage und speichere die Antwort." reicht)
- Cost-Trend im audit_log bleibt im SLC-752-Range (~$0.005-0.015 pro Run)
- Custom-Reports verhindern "Button-Inflation" — Standard-Buttons bleiben bei 5

## Open Questions

**OQ-762-1: Bedrock-Context-Logik fuer runCustomReport**
Heute haben Standard-Reports (z.B. tagesanalyse.ts) jeweils einen eigenen Datenkontext-Loader (Cron-Daten, Activity-Log, Deal-State). Custom-Reports nutzen aber ein **Free-Form-Prompt-Template**. Frage: Welcher Datenkontext wird mitgegeben?
- Option A: **Context-Type-spezifischer Default-Context** (mein-tag = Activity + Deals + Tasks; cockpit = Pipeline-Aggregate). Einfach, vorhersagbar.
- Option B: **NL-Sculpt fuer Datenkontext** (analog V7.5 — Bedrock erkennt aus prompt_template welche Daten gebraucht werden, dann zweiter Bedrock-Call mit den Daten). Maechtig, aber teuer + komplex.
- Empfehlung: Option A in V7.6, Option B als V7.7+-Erweiterung.

**OQ-762-2: Save-Trigger — auf Result oder auf Frage?**
Option A: "Als Bericht speichern" erscheint **nach** Bedrock-Antwort (User sieht Ergebnis, entscheidet). Cleaner UX.
Option B: "Als Bericht speichern" erscheint vor Bedrock-Call (User speichert Prompt vor Aufruf). Spart Bedrock-Call wenn User nur speichern will.
Empfehlung: Option A — User-Flow ist "Frage stellen → probieren → speichern wenn gut".

**OQ-762-3: Sichtbarkeits-Regel fuer "Als Bericht speichern"-Button**
- Standard-Berichte: Button ausblenden (sind nicht Custom).
- Freie Frage: Button anzeigen.
- NL-Builder-Mode (FEAT-761): Button ausblenden (Workflow != Report).
- Empfehlung: Discriminator in AnswerPane analog `reportId === "top-chancen"`-Pattern.

**OQ-762-4: Per-Team-Sharing in V1?**
User-Direktive heute klar: per-Owner-Scope. Defer team-sharing zu V8.

**OQ-762-5: Limit pro User?**
Sollen User unbegrenzt viele Custom-Reports anlegen? Empfehlung: kein Limit in V1, aber Monitoring im audit_log. Bei Misuse-Pattern V7.7+ Per-User-Limit (z.B. 100).

## Delivery Mode

**internal-tool** (Business-System, Internal-Test-Mode bleibt aktiv bis Pre-Production-Compliance-Gate).

## Recommended Next Step

`/architecture` — entscheidet OQ-762-1 (Bedrock-Context-Logik) + OQ-762-3 (Sichtbarkeits-Discriminator) und schreibt DEC-218..220. Dann `/slice-planning` mit ~1-2 Slices fuer FEAT-762.
