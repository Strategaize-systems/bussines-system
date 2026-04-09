# SLC-307 — Deal-Workspace KI + Prozess-Check

## Slice Info
- Feature: FEAT-301 (completion)
- Version: V3
- Priority: High
- Dependencies: SLC-304 (LLM Service), SLC-306 (Deal-Workspace Basis)
- Type: Frontend

## Goal
KI-Briefing-Panel und regelbasierten Prozess-Check zum Deal-Workspace hinzufuegen. Komplettiert FEAT-301.

## Scope

### Included
1. KI-Briefing-Panel: LLM-generierte Deal-Zusammenfassung (Summary, Key Facts, Risiken, Naechste Schritte, Confidence)
2. Prozess-Check-Panel: Regelbasierte Pflichtschritte-Pruefung (Wert gesetzt?, Kontakt zugeordnet?, Firma zugeordnet?, Stage-spezifische Checks)
3. Async-Loading mit Skeleton fuer KI-Briefing (Bedrock-Latenz 3-8s)
4. Refresh-Button fuer KI-Briefing
5. Fallback-UI wenn Bedrock nicht erreichbar

### Excluded
- KI-generierte naechste Schritte (V3.1 Action-Modus)
- Prozesshinweise via LLM (V3.1)
- Confirm-before-write UI fuer schreibende Aktionen (V3.1)

## Backlog Items
- BL-302: Deal KI-Briefing via Bedrock
- BL-303: Deal Prozess-Check (regelbasiert)

## Acceptance Criteria
1. KI-Briefing-Panel zeigt strukturierte Deal-Zusammenfassung
2. Briefing laedt async mit Skeleton-Platzhalter
3. Refresh-Button laedt neues Briefing
4. Prozess-Check zeigt Check/X-Liste der Pflichtschritte
5. Prozess-Check aktualisiert sich bei Deal-Aenderungen
6. Fallback bei Bedrock-Fehler zeigt sinnvolle Meldung
7. Kein Page-Block durch LLM-Latenz

## Micro-Tasks

### MT-1: Prozess-Check Logik + Panel
- Goal: Regelbasierte Prozess-Pruefung als eigene Funktion + UI-Panel
- Files: `lib/process-check.ts`, `components/deals/process-check-panel.tsx`
- Expected behavior: getProcessCheck(deal, stage) liefert Array von { label, passed }. Panel zeigt Checklist.
- Verification: Browser-Check — Checks stimmen mit Deal-Daten ueberein
- Dependencies: SLC-306 (Deal-Workspace muss existieren)

### MT-2: KI-Briefing Panel
- Goal: LLM-generiertes Briefing im Deal-Workspace anzeigen
- Files: `components/deals/ai-briefing-panel.tsx`
- Expected behavior: Panel ruft /api/ai/query mit type='deal-briefing' und Deal-Kontext auf. Zeigt Summary, Key Facts, Risiken, Naechste Schritte mit Confidence-Indikator.
- Verification: Browser-Check — Briefing wird geladen und angezeigt
- Dependencies: SLC-304 (LLM Service muss funktionieren), MT-1

### MT-3: Async-Loading + Fallback
- Goal: Skeleton-Loading waehrend Bedrock-Call, Fehler-Fallback
- Files: `components/deals/ai-briefing-panel.tsx`
- Expected behavior: Skeleton waehrend Laden, "Briefing konnte nicht geladen werden" bei Fehler, Refresh-Button
- Verification: Bedrock blockieren/simulieren → Fallback pruefen
- Dependencies: MT-2

## Technical Notes
- Prozess-Check wiederverwendet Logik aus bestehender moveDealToStage Required-Fields-Validierung
- Deal-Briefing Prompt braucht: Deal-Daten, letzte 10 Activities, Company, Contact, Stage-Name
- Daten werden server-side gesammelt und an /api/ai/query gesendet
- KI-Briefing wird client-side async geladen (useEffect + fetch), nicht SSR
