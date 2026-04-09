# FEAT-301 — Deal-Workspace

## Summary
Eigene Route /deals/[id] als zentraler Arbeitsort fuer jeden Deal. Ersetzt das bestehende DealDetailSheet (Side-Panel) durch eine vollwertige Workspace-Seite.

## Version
V3

## Related Decisions
- DEC-022: Workspaces als eigene Routen
- DEC-023: Zentraler LLM-Service-Layer

## Components
1. **Deal-Header:** Status, Stage, Wert, Wahrscheinlichkeit, verknuepfte Firma + Kontakt(e)
2. **KI-Briefing-Panel:** LLM-generierte Deal-Zusammenfassung via Bedrock (FEAT-305)
3. **Timeline:** Activities + E-Mails + Proposals + Signals + Meetings chronologisch
4. **Tasks-Sektion:** Alle Tasks verknuepft mit diesem Deal (CRUD)
5. **Prozess-Check:** Regelbasiert — welche Pflichtschritte fehlen fuer aktuelle Stage
6. **Direktaktionen:** Neue Task, E-Mail, Notiz, Activity, Stage-Wechsel, Meeting erstellen

## Acceptance Criteria
1. /deals/[id] ist eine eigene Route (kein Sheet/Modal)
2. Deal-Header zeigt Status, Stage, Wert, Wahrscheinlichkeit, Firma, Kontakt
3. KI-Briefing-Panel zeigt LLM-generierte Deal-Zusammenfassung
4. Timeline zeigt Activities + E-Mails + Proposals + Signals chronologisch
5. Tasks-Sektion zeigt Deal-verknuepfte Tasks mit Erledigt-Button
6. Prozess-Check zeigt fehlende Pflichtschritte (Validierung aus moveDealToStage wiederverwendet)
7. Direktaktions-Buttons funktional
8. Klick auf Kanban-Card in Pipeline oeffnet /deals/[id]

## Technical Notes
- Bestehende getDealWithRelations() Action liefert Deal + Activities + Proposals + Signals + Emails
- Tasks muessen zusaetzlich per Deal-ID abgefragt werden (getTasks mit deal_id Filter)
- KI-Briefing nutzt FEAT-305 LLM-Service
- Prozess-Check nutzt bestehende Required-Fields-Logik aus moveDealToStage

## Out of Scope
- KI-generierte naechste Schritte (V3.1)
- Automatische Folgeaktivitaeten (V3.1)
- Meeting-Transkription im Workspace (V4)
