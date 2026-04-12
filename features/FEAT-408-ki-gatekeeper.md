# FEAT-408 — KI-Gatekeeper (E-Mail-Analyse)

## Purpose
KI analysiert eingehende E-Mails, klassifiziert sie nach Prioritaet und Kategorie, ordnet sie Kontakten/Deals zu und schlaegt Aktionen vor. Der Gatekeeper ersetzt das manuelle E-Mail-Postfach-Durcharbeiten.

## Feature Type
Backend + Frontend

## Version
V4

## Dependencies
- FEAT-405 (IMAP Mail-Integration) — zwingend

## Architecture (aus Recherche RPT-047)
- Suggest-Approve-Execute Pattern (DEC-018, Confirm-before-act)
- Zwei-Pass-Klassifikation:
  1. Regelbasiert: bekannter Absender? Auto-Reply? Newsletter? Spam-Pattern?
  2. Bedrock Claude: komplexe Klassifikation mit CRM-Kontext
- `ai_action_queue` Tabelle fuer vorgeschlagene Aktionen (geteilt mit FEAT-407)

## Database Changes
- Neue Tabelle: `ai_action_queue` (type, entity_type, entity_id, action, context_json, priority, status [pending/approved/rejected/executed], suggested_at, decided_at, decided_by, execution_result)
- Erweiterung `email_messages`: classification (enum), priority (enum), gatekeeper_summary (text), analyzed_at

## Klassifikations-Schema

### Prioritaets-Stufen
- **Dringend**: Direkte Anfrage von aktivem Deal-Kontakt, offenes Angebot, Deadline-Bezug
- **Normal**: Bekannter Kontakt, Standard-Kommunikation, Follow-up
- **Niedrig**: Newsletter, Info-Mails, automatisierte Benachrichtigungen
- **Irrelevant**: Spam, Werbung, Unrelated

### Kategorien
- Anfrage (Meeting, Info, Angebot)
- Antwort (auf gesendete E-Mail)
- Auto-Reply / Abwesenheit (→ FEAT-410)
- Newsletter / Marketing
- Intern / System
- Unklassifiziert

## Funktionen

### Klassifikation
- Regelbasierte Vor-Klassifikation (schnell, kostenlos)
- Bedrock-Analyse fuer nicht-offensichtliche E-Mails (on-click oder batch)
- Kontextualisierung: Deal-Bezug, offene Angebote, letzte Interaktion einbeziehen
- Batch-Modus: "Alle neuen E-Mails seit letztem Login analysieren"

### Aktions-Vorschlaege
- "Antwort noetig" → ai_action_queue mit Typ "reply"
- "Wiedervorlage erstellen" → ai_action_queue mit Typ "followup"
- "Termin vereinbaren" → ai_action_queue mit Typ "meeting"
- "Kontakt zuordnen" → ai_action_queue mit Typ "assign_contact"
- Jeder Vorschlag mit KI-Begruendung

### Mein Tag Integration
- Gatekeeper-Summary-Karte: "X dringende, Y normale, Z irrelevante E-Mails"
- Klick oeffnet priorisierte E-Mail-Liste
- Dringende E-Mails sofort sichtbar (Badge)

### Feedback-Loop
- Falsch-klassifizierte E-Mails manuell umklassifizieren
- Feedback wird gespeichert (fuer spaetere Verbesserung)
- Keine automatische Retraining in V4 (manuelle Prompt-Anpassung)

## Kostenkontrolle
- Regelbasierte Klassifikation zuerst (kostenlos)
- Bedrock nur fuer komplexe E-Mails oder auf expliziten Klick
- Batch statt Echtzeit (nicht bei jedem E-Mail-Eingang)
- Token-Tracking pro Analyse (Kosten-Transparenz)

## Nicht V4
- Automatische Antwort-Generierung (nur Vorschlaege)
- Automatisches Weiterleiten
- Cross-System E-Mail-Analyse
- ML-basiertes Retraining der Klassifikation

## Akzeptanzkriterien
1. Jede synchronisierte E-Mail bekommt Prioritaet und Kategorie
2. Regelbasierte Klassifikation erkennt Auto-Replies, Newsletter, bekannte Absender
3. Bedrock-Analyse laeuft on-click oder batch (nicht automatisch)
4. Mein Tag zeigt Gatekeeper-Summary
5. Klick auf Summary oeffnet priorisierte E-Mail-Liste
6. Aktions-Vorschlaege erscheinen in ai_action_queue mit Freigabe-Workflow
7. Falsch-klassifizierte E-Mails koennen manuell korrigiert werden

## Risiken
- KI-Klassifikation Fehlraten → Feedback-Loop + regelbasierte Vor-Filterung
- Bedrock-Kosten bei hohem E-Mail-Volumen → Zwei-Pass-Architektur
- Latenz bei Batch-Analyse → Async-Verarbeitung mit Status-Anzeige
