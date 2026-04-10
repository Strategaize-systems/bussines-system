# SLC-313 — KI on-click Pattern

## Slice Info
- Feature: FEAT-305
- Version: V3.1
- Priority: Blocker
- Dependencies: keine
- Type: Frontend + API

## Goal
Alle KI-Features von auto-load auf on-click umstellen. Bedrock-Kosten nur bei bewusster Nutzer-Interaktion, nicht bei jedem Page-Load. Das ist Voraussetzung fuer alle weiteren KI-Features in V3.1.

## Scope

### Included
1. Deal-Workspace KI-Briefing: Nur bei Klick auf "KI-Analyse laden"
2. Mein Tag KI-Summary: Nur bei Klick auf "Tageseinschaetzung laden"
3. Einheitliches UI-Pattern: Button mit Sparkles-Icon → Loading-Skeleton → Ergebnis
4. Ergebnis bleibt sichtbar bis Page-Leave (kein Re-Fetch bei Tab-Wechsel)
5. Optional: Refresh-Button fuer manuelles Neuladen

### Excluded
- Client-Side-Caching (kommt spaeter wenn noetig)
- Token-Tracking / Kosten-Dashboard
- Neue KI-Features (nur bestehende umstellen)

## Backlog Items
- BL-330: KI-Features on-click statt auto-load

## Acceptance Criteria
1. Deal-Workspace: KI-Briefing laedt NICHT automatisch beim Oeffnen
2. Deal-Workspace: Button "KI-Analyse laden" triggert Bedrock-Call
3. Mein Tag: KI-Summary laedt NICHT automatisch beim Oeffnen
4. Mein Tag: Button "Tageseinschaetzung laden" triggert Bedrock-Call
5. Loading-State mit Skeleton waehrend Bedrock-Call
6. Ergebnis bleibt nach Laden persistent (kein Flicker bei Tab-Wechsel)
7. Kein Bedrock-Call ohne expliziten User-Klick

## Micro-Tasks

### MT-1: On-Click-Pattern Komponente
- Goal: Wiederverwendbare AiLoadButton + AiResultPanel Komponente
- Files: `components/ai/ai-load-button.tsx` (neu), `components/ai/ai-result-panel.tsx` (neu)
- Expected behavior: Button mit Sparkles-Icon, onClick triggert fetch, zeigt Skeleton, dann Ergebnis
- Verification: Isolierter Test — Button klicken, Loading sichtbar
- Dependencies: keine

### MT-2: Deal-Workspace umstellen
- Goal: KI-Briefing von useEffect-auto-load auf AiLoadButton umstellen
- Files: Deal-Workspace KI-Briefing Komponente (bestehend)
- Expected behavior: Kein auto-fetch mehr. Button → Klick → Briefing laden → anzeigen.
- Verification: Browser-Check — Deal oeffnen, kein Network-Call. Button klicken, Call + Ergebnis.
- Dependencies: MT-1

### MT-3: Mein Tag umstellen
- Goal: KI-Summary von auto-load auf AiLoadButton umstellen
- Files: Mein-Tag KI-Summary Komponente (bestehend)
- Expected behavior: Kein auto-fetch mehr. Button → Klick → Summary laden → anzeigen.
- Verification: Browser-Check — Mein Tag oeffnen, kein Network-Call. Button klicken, Call + Ergebnis.
- Dependencies: MT-1

## Technical Notes
- Aktuell: `useEffect(() => { fetchAI(...) }, [])` — das muss weg
- Neu: `const [result, setResult] = useState(null)` + onClick-Handler
- Ergebnis in Component-State halten (bleibt bei Tab-Wechsel innerhalb der Seite erhalten)
- Bei Page-Navigation geht State verloren — das ist gewollt (Kosten-Kontrolle)
- Rate-Limiter bleibt bestehen als Sicherheitsnetz
