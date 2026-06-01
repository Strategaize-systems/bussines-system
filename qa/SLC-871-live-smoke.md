# SLC-871 — Live-Smoke (AC-871-10, 5 Pflicht-Pfade)

## Purpose

Bestaetigt nach BS-Coolify-Redeploy + IS-Knowledge-Service-Key-Konfiguration, dass der V8.7-A KI-Workspace-IS-Knowledge-Integrations-Pfad gegen die echte IS V3.5 Knowledge-API auf `is.strategaizetransition.com` funktioniert.

Erfordert: qa/SLC-871-coolify-env-setup.md komplett durchgefuehrt (Service-Key + Base-URL gesetzt, Redeploy abgeschlossen, Bundle-Leak-Check sauber).

## Test-Konto

- Login als Admin oder Vertriebsmitarbeiter mit Zugriff auf mindestens 1 Deal.
- Deal-Detail-Workspace muss IS-Knowledge-Hits sichtbar machen — andere Workspaces (Mein Tag, Cockpit, Team) sind V8.7-A out-of-scope (DEC-249).

---

## Pfad 1 — Frage mit Vollmacht-Klausel zieht IS-Hits + audit_log

**Schritte:**
1. Browser zu `https://cockpit.strategaizetransition.com/deals/<deal-id>` navigieren.
2. KI-Workspace findet sich rechts (oder unter den Deal-Details).
3. Im Frage-Feld eingeben: `Wie behandeln wir das Thema Vollmacht-Klausel mit dem Mandanten?`
4. Send-Button (Pfeil) klicken.
5. Antwort abwarten (max ~6s).

**Erwartet:**
- AnswerPane zeigt Bedrock-Antwort als Markdown.
- Unter der Antwort: Block "Aus Strategaize-Wissens-Basis" mit mind. 1 Item (Titel + Prozent-Score), sortiert absteigend.
- Footer "Diese Antwort nutzt Strategaize-Wissen + Mandanten-Daten".
- DevTools Network-Tab: 1 Request an `https://is.strategaizetransition.com/api/knowledge/search?q=...` (PII-redacted), 200-Response.

**audit_log-Check (SSH zu BS-Server):**
```sql
docker exec <bs-postgres-container> psql -U postgres -d postgres -c \
  "SELECT action, entity_type, changes->'after' FROM audit_log
   WHERE action = 'knowledge_queried'
   ORDER BY created_at DESC LIMIT 1;"
```
Erwartet:
- `action = "knowledge_queried"`
- `entity_type = "is_knowledge_api"`
- `changes.after.workspace_page = "deal-detail"`
- `changes.after.consumer = "business-system"`
- `changes.after.cost_usd > 0`
- `changes.after.item_count > 0`

---

## Pfad 2 — risiken-einwaende-Report zieht IS-Context

**Schritte:**
1. Im selben Deal-Workspace: Button "Risiken & Einwaende" klicken.
2. Antwort abwarten.

**Erwartet:**
- AnswerPane zeigt Markdown-Antwort mit den drei Sektionen "Identifizierte Risiken / Bekannte Einwaende / Konter-Strategien".
- "Aus Strategaize-Wissens-Basis"-Block sichtbar mit Hits.
- audit_log-Eintrag analog Pfad 1 (zweiter Eintrag jetzt).

---

## Pfad 3 — Soft-Cap-Trigger nach 20 IS-Calls

**Schritte:**
1. Im selben Workspace: 21x hintereinander eine Frage stellen (z.B. immer dieselbe Frage). Pro Frage abwarten, dass die Antwort erscheint, dann erneut.
2. Beim 21. Klick (Counter ist dann genau 20, weil 20 erfolgreiche Calls den Counter auf 20 incrementiert haben).

**Erwartet:**
- Frage 1-20: jeweils Hits + Footer-Hinweis.
- Frage 21: AnswerPane zeigt Footer "Strategaize-Wissens-Quote fuer diese Session aufgebraucht (20/20). Frage trotzdem stellen — Antwort basiert nur auf Mandanten-Daten."
- DevTools Network-Tab: KEIN Request an is.strategaizetransition.com fuer Frage 21.
- audit_log-Tabelle hat 20 neue knowledge_queried-Eintraege (Pfad 1+2 mitgezaehlt: 20 minus dem aus Pfad 1+2 minus Pfad 1+2-Eintraege).
- Tab schliessen + neu oeffnen: sessionStorage["isKnowledgeCallCount"] ist zurueckgesetzt, Frage funktioniert wieder normal.

---

## Pfad 4 — PII-Redact: Email/Phone werden NICHT an IS gesendet

**Schritte:**
1. Frage eingeben: `Wie behandeln wir den Mandanten test@example.com bei +49 30 12345?`
2. Send.

**Erwartet:**
- DevTools Network-Tab Request-URL contains `q=Wie+behandeln+wir+den+Mandanten+%5Bemail%5D+bei+%5Bphone%5D%3F` (URL-encoded `[email]` und `[phone]`).
- DevTools Network-Tab Request-URL contains NICHT die Strings `test@example.com` oder `123456`.

**audit_log-Check:**
```sql
docker exec <bs-postgres-container> psql -U postgres -d postgres -c \
  "SELECT changes->'after'->>'query_excerpt' FROM audit_log
   WHERE action = 'knowledge_queried' ORDER BY created_at DESC LIMIT 1;"
```
Erwartet: query_excerpt enthaelt `[email]` und `[phone]`, NICHT die Original-Werte.

---

## Pfad 5 — Service-Key falsch -> Graceful-Degradation

**Schritte:**
1. SSH zum BS-Server.
2. `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` in Coolify-UI temporaer auf einen wrong-value setzen (z.B. ersten 4 Chars veraendern). Save → Redeploy.
3. Nach Redeploy: Workspace-Frage erneut stellen.
4. Nach erfolgreichem Test: Service-Key wieder auf den korrekten Wert zuruecksetzen, Save → Redeploy.

**Erwartet:**
- AnswerPane zeigt Bedrock-Antwort weiter (BS-only-Context, kein IS-Hits-Block).
- Italic-Hinweis: "Strategaize-Wissens-Basis Authentifizierungs-Fehler, bitte System-Admin informieren".
- Workspace bleibt funktional, kein Page-Crash.
- audit_log: KEIN neuer knowledge_queried-Eintrag fuer diesen Call (Failure-Pfad triggert keinen Log per DEC-258).
- Nach Service-Key-Reset (Step 4): Frage funktioniert wieder normal.

---

## Pass-Bedingung

5/5 Pfade gruen. Bei 1+ Failure: in KNOWN_ISSUES.md als ISSUE-XXX dokumentieren und Sub-Slice oder Hotfix-Slice einplanen.

## Cleanup nach Smoke

- sessionStorage des Test-Browsers leeren (Soft-Cap-Counter resetten).
- audit_log-Eintraege aus Smoke-Phase ggf. in einem separaten Report markieren (`changes.after.workspace_page = "deal-detail"` + Zeitstempel der Smoke-Session).
