# FEAT-407 — KI-Wiedervorlagen mit Freigabe

## Purpose
KI schlaegt proaktiv Wiedervorlagen vor basierend auf CRM-Kontext. Mensch entscheidet: Freigeben / Verschieben / Abbrechen. Morgens 5 Minuten Wiedervorlagen-Liste durchgehen — kein manuelles Durchsuchen nach vergessenen Kontakten.

## Feature Type
Backend + Frontend

## Version
V4

## Dependencies
- Bestehende Tasks-Infrastruktur (FEAT-109)
- Bestehender Bedrock LLM-Layer (FEAT-305)
- `ai_action_queue` Tabelle (geteilt mit FEAT-408)

## Abgrenzung zu V3.1 Auto-Wiedervorlagen (FEAT-316)
- V3.1 = **regelbasiert**, fest definierte Trigger (Stagnation >14d, ueberfaellige Tasks)
- V4 = **KI-basiert**, kontextuell, mit Begruendung, mit Freigabe-Workflow
- V4 ergaenzt V3.1, ersetzt es nicht

## Database Changes
- `ai_action_queue` (geteilt mit FEAT-408, siehe dort)
- Erweiterung: `ai_feedback` Tabelle (action_queue_id, feedback_type [approved/rejected/modified], reason, created_at) — fuer Lern-Effekt

## Funktionen

### Vorschlags-Generierung
- Batch-Analyse der CRM-Daten (nicht Echtzeit)
- Trigger-Kontexte:
  - Deal seit X Tagen ohne Aktion (konfigurierbar)
  - Angebot offen seit X Tagen
  - Kontakt seit X Wochen nicht kontaktiert
  - Multiplikator-Beziehung braucht Pflege
  - E-Mail empfangen aber nicht beantwortet (mit FEAT-405)
- Jeder Vorschlag mit KI-Begruendung: "Deal X seit 14 Tagen ohne Aktion, Angebot offen"

### Freigabe-Workflow
- Vorschlaege erscheinen in Mein Tag als eigene Sektion ("KI-Wiedervorlagen")
- Pro Vorschlag drei Aktionen:
  - **Freigeben** → wird zu echtem Task mit Datum und Kontext
  - **Verschieben** → neues Datum waehlen, Vorschlag bleibt aktiv
  - **Abbrechen** → Vorschlag wird verworfen, aehnlicher Vorschlag wird unterdrueckt
- Quick-Action: "Alle normalen freigeben" fuer Batch-Bearbeitung

### Bidirektionalitaet
- User kann eigene Wiedervorlagen an KI delegieren: "Erinnere mich in 3 Tagen"
- KI-Wiedervorlagen koennen zurueck zum User: "Kontakt hat geantwortet, Wiedervorlage faellig"

### Lern-Effekt
- Abgelehnte Vorschlaege beeinflussen zukuenftige Vorschlaege
- Einfaches Feedback-Tracking (nicht ML-basiert, sondern regelbasiert)
- Beispiel: "User lehnt Wiedervorlagen fuer Kontakt-Typ X regelmaessig ab → Schwelle erhoehen"

## Kostenkontrolle
- Batch-Generierung (morgens oder bei Login, nicht Echtzeit)
- Maximal 20 Vorschlaege pro Batch (konfigurierbar)
- Regelbasierte Vor-Filterung → Bedrock nur fuer Begruendung und Priorisierung

## Nicht V4
- ML-basiertes Retraining
- Automatische Ausfuehrung ohne Freigabe
- Cross-System Wiedervorlagen (nur Business System Kontext)

## Akzeptanzkriterien
1. KI generiert Wiedervorlagen-Vorschlaege basierend auf CRM-Kontext
2. Vorschlaege erscheinen in Mein Tag mit Begruendung
3. Drei Aktionen pro Vorschlag: Freigeben / Verschieben / Abbrechen
4. Freigegebene Vorschlaege werden zu echten Tasks
5. Abgelehnte Vorschlaege werden nicht wiederholt (gleicher Kontext)
6. Vorschlaege werden batch-generiert (Kostenkontrolle)
7. User kann eigene Wiedervorlagen an KI delegieren

## Risiken
- Vorschlags-Qualitaet → Einfache Heuristiken + Bedrock Begruendung, Feedback-Loop
- Zu viele Vorschlaege → Limit + Priorisierung, nur Top-20 pro Tag
- User-Ermuedung → "Alle freigeben" Quick-Action fuer Routine-Items
