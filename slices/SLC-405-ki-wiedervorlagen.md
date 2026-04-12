# SLC-405 — KI-Wiedervorlagen mit Freigabe

## Slice Info
- Feature: FEAT-407
- Priority: High
- Delivery Mode: internal-tool

## Goal
KI-gestuetzte Wiedervorlagen-Vorschlaege basierend auf CRM-Kontext. Freigabe-Workflow in Mein Tag (Freigeben / Verschieben / Abbrechen). Batch-Generierung via Cron.

## Scope
- /api/cron/followups Route
- Wiedervorlagen-Logik (Deal-Stagnation, offene Angebote, fehlende Follow-ups)
- Bedrock-Begruendung pro Vorschlag
- Mein Tag: Wiedervorlagen-Sektion mit 3 Aktionen
- Freigabe → Task erstellen
- ai_feedback fuer abgelehnte Vorschlaege
- Deduplizierung (dedup_key)

## Out of Scope
- Bidirektionale Wiedervorlagen (User → KI delegieren) — spaetere Erweiterung
- Auto-Reply-basierte Anpassung (SLC-406)

### Micro-Tasks

#### MT-1: Followup-Generierung Engine
- Goal: CRM-Daten analysieren und Wiedervorlagen-Kandidaten identifizieren
- Files: `cockpit/src/lib/ai/followup-engine.ts`
- Expected behavior: Identifiziert Deals ohne Aktion >14d, offene Angebote >7d, Kontakte ohne Interaktion >30d, unbeantwortete E-Mails >3d
- Verification: Test mit bekannten Testdaten
- Dependencies: none

#### MT-2: Bedrock-Begruendung + Queue-Eintraege
- Goal: Pro Kandidat KI-Begruendung generieren und in ai_action_queue einfuegen
- Files: `cockpit/src/lib/ai/prompts/followup-suggest.ts`, `cockpit/src/lib/ai/followup-engine.ts` (erweitert)
- Expected behavior: Begruendung wie "Deal X seit 14 Tagen ohne Aktion, Angebot offen seit 5 Tagen"
- Verification: Bedrock-Call + DB-Eintrag pruefen
- Dependencies: MT-1

#### MT-3: Followups Cron-Route
- Goal: /api/cron/followups Endpoint (Batch-Generierung alle 6h)
- Files: `cockpit/src/app/api/cron/followups/route.ts`
- Expected behavior: Max 20 Vorschlaege pro Lauf, Deduplizierung via dedup_key
- Verification: curl POST, ai_action_queue Eintraege pruefen
- Dependencies: MT-1, MT-2

#### MT-4: Wiedervorlagen-Sektion in Mein Tag
- Goal: UI in Mein Tag mit Vorschlags-Liste und 3 Aktionen pro Eintrag
- Files: `cockpit/src/app/(app)/mein-tag/followup-suggestions.tsx`, `cockpit/src/app/(app)/mein-tag/actions.ts` (erweitert)
- Expected behavior: Vorschlaege mit Begruendung + Kontext-Link, Buttons: Freigeben / Verschieben / Abbrechen
- Verification: Browser-Check auf Mein Tag
- Dependencies: MT-3

#### MT-5: Freigabe-Workflow
- Goal: Freigeben → Task erstellen, Verschieben → Datum aktualisieren, Abbrechen → Status rejected + Feedback
- Files: `cockpit/src/app/(app)/mein-tag/followup-actions.ts`
- Expected behavior: Freigegebene Vorschlaege werden zu echten Tasks, abgelehnte werden in ai_feedback gespeichert
- Verification: Browser-Test aller 3 Aktionen, Tasks-Tabelle pruefen
- Dependencies: MT-4

## Acceptance Criteria
1. KI generiert Wiedervorlagen-Vorschlaege basierend auf CRM-Kontext
2. Vorschlaege erscheinen in Mein Tag mit Begruendung
3. 3 Aktionen funktionieren: Freigeben / Verschieben / Abbrechen
4. Freigegebene Vorschlaege werden zu echten Tasks
5. Abgelehnte Vorschlaege werden nicht wiederholt (Deduplizierung)
6. Max 20 Vorschlaege pro Batch
