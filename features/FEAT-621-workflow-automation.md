# FEAT-621 — Workflow-Automation Rule Builder

## Status
planned

## Version
V6.2

## Purpose
Heute erfolgen wiederkehrende operative Reaktionen im Business System manuell: Deal rutscht in "Angebot" → Aufgabe "Angebot vorbereiten" anlegen, Activity vom Typ "Disqualifizierung" → Stage auf "Lost" setzen, Meeting durchgefuehrt → Follow-up-Mail-Template auf Deal-Aktivitaet legen. Das ist mit zunehmender Deal-Anzahl mehrfach pro Tag. V6.2 fuehrt einen einfachen Wenn-Dann-Regel-Builder ein, der diese repetitiven Aktionen automatisiert ausloest, ohne neue KI-Logik einzufuehren und ohne mit den vorhandenen Cadences (FEAT-501) oder KI-Wiedervorlagen (FEAT-407) zu kollidieren.

## Context
- **FEAT-501 Cadences** (V5) liefert sequenzielle Outreach-Ketten fuer Deals/Kontakte. Generische Wenn-Dann-Workflows sind dort explizit Out-of-Scope.
- **FEAT-407 KI-Wiedervorlagen** (V4) erzeugt KI-vorgeschlagene Wiedervorlagen mit User-Freigabe. Das ist KI-getrieben und freigabepflichtig — nicht regelbasiert und nicht automatisch.
- **FEAT-402 Insight-Review-Queue** (V4.3) ist die KI-Insight-Pipeline mit Freigabe.
- BL-135 (V6.2) deckt die fehlende rein deterministische Schicht ab: User definiert die Regel, Regel laeuft ohne KI und ohne Freigabe.

## V1 Scope

### Trigger-Events (V1, Whitelist)
- **`deal.stage_changed`** — Deal wechselt in eine bestimmte Pipeline-Stage
- **`deal.created`** — Neuer Deal wird angelegt
- **`activity.created`** — Neue Activity an Deal/Kontakt/Firma mit Typ-Filter (`call`, `email`, `meeting`, `note`, `task`, `briefing`, ...)

Nicht in V1: Time-based-Trigger (z.B. "wenn Deal 7 Tage in Stage X"), E-Mail-Empfangs-Trigger, externe Webhook-Trigger.

### Conditions (V1)
Zu jedem Trigger optionale Bedingungen, die ALLE erfuellt sein muessen (AND-only, kein OR/Gruppierung):
- Pipeline-ID gleich X
- Deal-Wert >= / <= X
- Stage-Name gleich X
- Activity-Typ in {liste}
- Owner-User-ID gleich X (oder "current user")

Conditions werden auf der Entity referenziert (Deal/Contact/Company-Felder), keine Cross-Entity-Joins.

### Action-Types (V1, Whitelist)
- **`create_task`** — Neue Aufgabe anlegen mit Titel-Template + Faelligkeit (relativ: heute/+1/+3/+7 Tage) + Owner (Trigger-User oder fest)
- **`send_email_template`** — V5.3-E-Mail-Template (`email_templates`) als Draft oder direkt versenden, optional an Trigger-Entity-Kontakt
- **`create_activity`** — Activity anlegen (z.B. internal Note mit fixem Text)
- **`update_field`** — Whitelist von editierbaren Feldern: `deal.stage_id`, `deal.value`, `deal.expected_close_date`, `contact.tags`, `company.tags`. Keine PII-/System-Felder.

Actions laufen sequenziell innerhalb einer Regel. 1 Trigger → 1..N Actions. Kein Branching.

Nicht in V1: Wartezeit-Action, Multi-Step-Sequence (das machen Cadences), KI-getriebene Actions (Auto-Reply etc. machen FEAT-407/408/410).

### Rule-Modell
- **Aktiv-Toggle** — Regel laesst sich pausieren ohne loeschen.
- **Owner-Scope V1** — Regeln sind global fuer den Single-User-Tenant. Kein per-User-Scope (wird bei V7 Multi-User relevant).
- **Audit-Log** — Jede Regelausfuehrung schreibt in Audit-Log: Trigger, Conditions-Match-Result, Actions-Outcome (success/failed/skipped) + Trigger-Entity-ID. Reuse `audit_log` Pattern aus V5.7.
- **Trockenlauf-Modus** — Beim Speichern einer Regel: Optional "letzte 30 Tage durchsimulieren" → zeigt vorab welche Entities in welchen Actions gelandet waeren, ohne tatsaechlich zu schreiben.

### Builder-UI
- Forms-basiert, kein Drag&Drop-Node-Graph (zu hoher UI-Aufwand fuer V1).
- 4 Steps: (1) Trigger waehlen, (2) Conditions hinzufuegen, (3) Actions hinzufuegen, (4) Aktivieren.
- Liste aller Regeln unter `/settings/automation` mit Status-Badge (aktiv/pausiert), letzte Ausfuehrung, Erfolgs-Quote.

## Out of Scope V1
- Time-based-Trigger ("wenn 7 Tage nichts passiert")
- E-Mail-Empfangs-Trigger (das macht FEAT-408 KI-Gatekeeper)
- Multi-Step-Sequenzen mit Wartezeiten (das machen Cadences FEAT-501)
- KI-Branchen ("KI entscheidet ob Action laeuft")
- Cross-Entity-Conditions (Deal-Stage UND Contact-Tag)
- A/B-Testing von Regel-Varianten
- Drag&Drop-Node-Graph-Editor
- OR-Conditions / verschachtelte Boolesche Logik
- Webhook-Actions (HTTP-Call an externes System)
- Regel-Templates-Marketplace (eigene Liste oder Bibliothek)
- User-Scoped-Regeln (kommt in V7 Multi-User)

## Acceptance Criteria
- AC1: User kann unter `/settings/automation` eine neue Regel anlegen mit Form-basiertem 4-Step-Builder.
- AC2: Trigger-Dropdown zeigt 3 Trigger-Typen (deal.stage_changed, deal.created, activity.created) mit kontext-spezifischen Sub-Optionen.
- AC3: Conditions koennen AND-verknuepft hinzugefuegt werden, mindestens 0..N pro Regel.
- AC4: Action-Liste laesst sich aus Whitelist (4 Action-Types) zusammenstellen, Reihenfolge per Up/Down-Buttons.
- AC5: Aktivieren der Regel registriert sie als Trigger-Listener; deaktivieren entfernt sie ohne Loeschen.
- AC6: Bei Trigger-Match laeuft die Regel asynchron im Background (kein blockierender User-Request); Standard-Latenz < 30s nach Trigger-Event.
- AC7: Audit-Log fuer jede Ausfuehrung mit Outcome pro Action (success/failed/skipped + Begruendung).
- AC8: Trockenlauf "letzte 30 Tage durchsimulieren" zeigt Treffer-Liste ohne Write-Side-Effects.
- AC9: Failure einer Action stoppt die Regel-Ausfuehrung NICHT (best-effort) — failed-Action wird im Audit-Log markiert, nachfolgende Actions laufen weiter. Konfigurierbarkeit "stop-on-error" out of scope V1.
- AC10: Listen-View `/settings/automation` zeigt aktive Regeln + letzte Ausfuehrung + Erfolgs-Quote pro Regel.
- AC11: Existierende Cadences (FEAT-501) und KI-Wiedervorlagen (FEAT-407) laufen unveraendert weiter, keine doppelten Aktionen.

## Risks & Assumptions
- **Risiko Endless-Loop:** Eine Regel "wenn Stage = X dann setze Stage = X" oder ueber Cross-Effects. **Mitigation:** Audit-Log-Idempotency-Marker pro (rule_id, entity_id, trigger_event_id) — gleicher Trigger triggert nicht erneut die gleiche Regel. + harter Recursion-Counter (z.B. max 3 Stage-Changes pro Deal pro 60s).
- **Risiko Race-Conditions** mit Cadences/KI-Wiedervorlagen die das gleiche Feld setzen. **Mitigation:** Audit-Log dokumentiert Quelle der letzten Aenderung.
- **Annahme:** User akzeptiert Form-basierten Builder als erste Stufe. Wenn die Komplexitaet der Regeln waechst, kommt Drag&Drop spaeter (BL-Backlog).
- **Annahme:** Deterministisches Rule-Engine, keine LLM-Calls in der Hot-Path → keine API-Kosten pro Regel-Ausfuehrung. Konsistent mit `feedback_no_api_costs.md`.

## Success Criteria
- 5+ produktive Regeln nach 2 Wochen aktiv (eigener Use)
- 0 ausgeloeste Endless-Loops im Audit-Log
- Pro Trigger-Event-Latenz < 30s vom Trigger bis zur ersten Action

## Open Questions (fuer /architecture)
- F1: Werden Trigger als DB-Trigger (Postgres NOTIFY) oder als In-Process-Event-Emitter realisiert? Trade-off Reliability vs. Komplexitaet.
- F2: Welche bestehende Entity-Strukturen reichen aus (Deals/Contacts/Companies/Activities), und ob Field-Whitelist fuer `update_field` per Code-Konfig oder DB-Tabelle gepflegt wird.
- F3: Wo laeuft die Action-Ausfuehrung — synchron im Trigger-Request, asynchron via existierenden Coolify-Cron, oder neuer Worker-Loop?
- F4: Audit-Log-Tabelle erweitern (existierende `audit_log` aus V5.7) oder neue `automation_runs`?
- F5: Trockenlauf "letzte 30 Tage" — wie wird historischer Trigger-Stream rekonstruiert (Activities-Tabelle reicht, oder braucht es Trigger-Replay-Layer)?
- F6: Was passiert mit aktiven Regeln, die auf eine geloeschte Pipeline-Stage referenzieren?
- F7: Owner-Default fuer `create_task`-Action — Trigger-User oder Deal-Owner?
