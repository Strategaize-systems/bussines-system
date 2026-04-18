# SLC-425 — Deal Knowledge Query UI

## Slice Info
- Feature: FEAT-401 (Wissensbasis Cross-Source)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-357

## Goal
"Wissen"-Tab im Deal-Workspace (/deals/[id]) implementieren. Text-Input + Voice-Input (bestehendes Whisper-Pattern) + Scope-Toggle + Ergebnis-Darstellung mit Antwort-Text, Quellen-Cards und Confidence-Badge. On-click, kein auto-load (DEC-030 Kostenschutz). Der Tab ist der primaere Zugang zur Cross-Source-Wissensbasis.

## Scope
- Neues "Wissen"-Tab im Deal-Workspace Tab-Navigation
- `KnowledgeQueryPanel` — Container-Komponente fuer den Tab-Inhalt
- `KnowledgeQueryInput` — Text-Input + Mikrofon-Button (Whisper, bestehendes Voice-Pattern aus V2.1+) + Submit-Button
- `ScopeToggle` — Dropdown "Nur dieser Deal" / "Alle Daten"
- `KnowledgeAnswer` — Markdown-Renderer fuer Antworttext mit [N]-Quellen-Referenzen
- `KnowledgeSourceCard` — Pro Quelle: Typ-Icon (Meeting/E-Mail/Activity/Dokument), Titel, Datum, Snippet, Klick-Link
- `ConfidenceBadge` — Visueller Indikator (hoch/mittel/niedrig) mit Farbe und Text
- Loading-State: Skeleton waehrend Query laeuft
- Error-State: Fehlermeldung bei API-Fehler oder Rate-Limit
- Empty-State: Hinweistext vor erster Query
- Bestehende UI-Patterns und Komponenten (shadcn/ui) verwenden

## Out of Scope
- Backfill / Embedding-Infrastruktur (SLC-421-423)
- API-Endpoint (SLC-424, muss fertig sein)
- Auto-Embedding (SLC-426)
- Multi-Turn-Chat
- Query-History / gespeicherte Fragen
- Globale Wissenssuche ausserhalb Deal-Workspace

## Micro-Tasks

### MT-1: Tab-Navigation erweitern
- Goal: "Wissen"-Tab zum Deal-Workspace hinzufuegen
- Files: `cockpit/src/app/deals/[id]/page.tsx` (oder Tab-Navigation-Komponente)
- Expected behavior: Neuer Tab "Wissen" nach dem letzten bestehenden Tab (vermutlich nach "Dokumente" oder "Edit"). Tab-Icon: Lupe oder Buch-Symbol (Lucide). Tab zeigt KnowledgeQueryPanel.
- Verification: Browser-Check: Tab sichtbar, klickbar, zeigt leeren Container
- Dependencies: none

### MT-2: KnowledgeQueryInput
- Goal: Text-Input + Voice-Button + Submit-Button
- Files: `cockpit/src/components/knowledge/KnowledgeQueryInput.tsx`
- Expected behavior: Input-Feld mit Placeholder "Frage zur Wissensbasis stellen...". Mikrofon-Button rechts (bestehendes Whisper-Voice-Pattern wiederverwenden — Check wie es in KI-Suchfeld/Mein Tag gemacht ist). Submit-Button (Pfeil/Enter). Keyboard: Enter = Submit. Voice: Mikrofon-Klick startet Aufnahme, stoppt bei erneutem Klick, transkribiert via /api/transcribe, fuellt Input. Disabled waehrend Query laeuft.
- Verification: Browser-Check: Input funktioniert, Enter submitted, Voice-Button startet Aufnahme
- Dependencies: MT-1

### MT-3: ScopeToggle
- Goal: Dropdown zur Scope-Auswahl
- Files: `cockpit/src/components/knowledge/ScopeToggle.tsx`
- Expected behavior: shadcn Select/DropdownMenu mit zwei Optionen: "Nur dieser Deal" (scope=deal, default) und "Alle Daten" (scope=all). Uebergibt scope + dealId an Query-Funktion.
- Verification: Browser-Check: Dropdown oeffnet, Auswahl aendert State
- Dependencies: MT-1

### MT-4: API-Integration + Query-Hook
- Goal: Hook der die /api/knowledge/query aufruft und Response verwaltet
- Files: `cockpit/src/components/knowledge/useKnowledgeQuery.ts`
- Expected behavior: `useKnowledgeQuery()` — (1) `query(text, scope, dealId)` Funktion, (2) States: idle, loading, success, error, (3) Data: answer, sources, confidence, queryTimeMs, (4) Fetch gegen POST /api/knowledge/query mit JSON Body, (5) Error-Handling: 429 → "Zu viele Anfragen, bitte kurz warten", 401 → "Nicht angemeldet", 500 → "Fehler bei der Abfrage"
- Verification: Manueller Test: Query absetzen → Loading → Antwort oder Fehler
- Dependencies: SLC-424 (API muss deployed sein)

### MT-5: KnowledgeAnswer
- Goal: Antwort-Text mit Quellen-Referenzen darstellen
- Files: `cockpit/src/components/knowledge/KnowledgeAnswer.tsx`
- Expected behavior: Markdown-Renderer (oder einfacher Text mit [N]-Links). [N]-Referenzen werden als klickbare Links gerendert die zum entsprechenden SourceCard scrollen oder highlighten. Text in lesbarer Groesse, guter Zeilenabstand.
- Verification: Browser-Check: Antwort wird formatiert dargestellt, [N]-Links sind klickbar
- Dependencies: MT-4

### MT-6: KnowledgeSourceCard
- Goal: Quellen-Karte pro referenzierter Quelle
- Files: `cockpit/src/components/knowledge/KnowledgeSourceCard.tsx`
- Expected behavior: Card mit: (1) Nummer [N], (2) Typ-Icon — Meeting: Video-Icon, E-Mail: Mail-Icon, Activity: Edit-Icon, Dokument: File-Icon (Lucide), (3) Titel (aus metadata.title), (4) Datum (formatiert, aus metadata.date), (5) Snippet (erste ~150 Zeichen aus chunk_text, mit "..."), (6) Relevanz-Badge (high=gruen, medium=gelb, low=grau), (7) "Zum Original"-Link (metadata.source_url). Klick auf Link navigiert zur Quell-Seite.
- Verification: Browser-Check: Cards sehen gut aus, Links funktionieren
- Dependencies: MT-4

### MT-7: ConfidenceBadge
- Goal: Visueller Confidence-Indikator
- Files: `cockpit/src/components/knowledge/ConfidenceBadge.tsx`
- Expected behavior: Badge mit Text + Farbe: "hoch" = gruen, "mittel" = gelb, "niedrig" = grau/rot. Kleines Badge-Element unter oder neben der Antwort. Tooltip mit Erklaerung ("Basierend auf der Relevanz der gefundenen Quellen").
- Verification: Browser-Check: Badge zeigt korrekten Confidence-Level
- Dependencies: MT-4

### MT-8: KnowledgeQueryPanel — Container zusammenbauen
- Goal: Alle Komponenten im Panel zusammenfuegen
- Files: `cockpit/src/components/knowledge/KnowledgeQueryPanel.tsx`
- Expected behavior: Layout: (1) Oben: QueryInput + ScopeToggle nebeneinander, (2) Mitte: Loading-Skeleton ODER KnowledgeAnswer + ConfidenceBadge, (3) Unten: SourceCards in Grid/Liste. Empty-State: "Stellen Sie eine Frage zur Wissensbasis dieses Deals. Die KI durchsucht Meeting-Transkripte, E-Mails, Notizen und Dokumente." Responsive: auf kleinen Screens stacked.
- Verification: Browser-Check: Alle States (empty, loading, success, error) sehen gut aus
- Dependencies: MT-2, MT-3, MT-4, MT-5, MT-6, MT-7

### MT-9: Build-Verifikation
- Goal: `npm run build` gruen
- Files: keine neuen Dateien
- Expected behavior: Build fehlerfrei
- Verification: `npm run build` exit code 0
- Dependencies: MT-8

## Acceptance Criteria
1. "Wissen"-Tab im Deal-Workspace sichtbar und funktional
2. Text-Query: Frage eingeben → Antwort mit Quellenangaben
3. Voice-Query: Mikrofon-Button → Aufnahme → Transkription → Antwort
4. Scope-Toggle: "Nur dieser Deal" / "Alle Daten" aendert Ergebnis
5. Quellen-Cards: Typ-Icon, Titel, Datum, Snippet, Klick-Link zum Original
6. Confidence-Badge korrekt dargestellt
7. Loading-State: Skeleton waehrend Query
8. Error-State: Fehlermeldung bei API-Fehler/Rate-Limit
9. Empty-State: Erklaerungstext vor erster Query
10. On-click, kein auto-load (DEC-030)
11. `npm run build` gruen

## Dependencies
- SLC-424 (RAG Query API muss deployed und funktional sein)
- Bestehendes Whisper-Voice-Pattern (V2.1+ / /api/transcribe)
- Bestehende Deal-Workspace-Struktur

## QA Focus
- **Voice-Integration:** Mikrofon → Transkription → Query funktioniert end-to-end
- **Scope-Isolation:** Bei "Nur dieser Deal" erscheinen keine Ergebnisse aus anderen Deals
- **Source-Links:** Klick auf "Zum Meeting" navigiert tatsaechlich zur richtigen Seite
- **Responsive:** Auf 1024px und 768px Breite noch benutzbar
- **Error-Handling:** Rate-Limit (429) zeigt benutzerfreundliche Meldung, nicht technischen Fehler
- **Ladezeit:** Loading-Skeleton erscheint sofort, nicht erst nach Verzoegerung
- **Empty-State:** Kein leerer weisser Tab, sondern erklaerenden Hinweistext

## Geschaetzter Aufwand
1-1.5 Tage (UI-Komponenten + Voice-Integration + States)
