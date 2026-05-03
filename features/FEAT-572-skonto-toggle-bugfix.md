# FEAT-572 — Skonto-Toggle UI-State-Drift nach Auto-Save-Error

## Status
planned

## Version
V5.7

## Purpose
Den in V5.6 Live-Smoke (RPT-277) entdeckten UX-Bug fixen: nach mehreren Auto-Save-Errors in der SkontoSection flippt der Toggle visuell auf OFF, obwohl die DB den vorherigen gueltigen State haelt. Selbstheilend nach Page-Reload, aber irritierend fuer den User. Vermutete Ursache: setState-Race im `handleProposalChange`/`debouncedPersist`-Pfad in `proposal-editor.tsx`.

## Context
- Bug entdeckt waehrend SLC-562 Browser-Smoke 2026-05-02 (RPT-277)
- BL-419 wurde am 2026-05-02 angelegt mit Severity `low` weil **DB-State korrekt bleibt** und das Problem rein UX-cosmetic ist
- Repro: in SkontoSection ungueltigen Wert (z.B. Prozent=10, ueber CHECK-Constraint-Limit 9.99) eingeben, mehrfach hintereinander → nach 2-3 Auto-Save-Errors flippt der Toggle auf OFF im UI
- DB hat zu jedem Zeitpunkt den letzten gueltigen Wert (z.B. Prozent=2.0)

## Scope

### Investigation (~30min)
- `proposal-editor.tsx` Zeile 218ff: `SkontoSection` Component-Aufruf inspizieren
- Use-Skonto-Mutex (Zeile 20-21 import) verstehen — eventuell schon Teil-Mitigation
- `handleProposalChange` und `debouncedPersist` State-Race analysieren
- `validateSkonto` (proposal/skonto-validation.ts) Verhalten bei Fehler verstehen
- Optimistic-Update-Pfad rueckrollen pruefen

### Fix-Optionen (Architektur-Entscheid in /architecture)
**Option A — Optimistic-Update mit Revert-on-Error (recommended):**
- SkontoSection-State wird beim Toggle/Input optimistic gesetzt
- debouncedPersist liefert Result; bei Error → setState rollback auf last-known-good aus DB-State
- Erfordert dass last-known-good als ref oder ueber initialState verfuegbar bleibt

**Option B — Server-State-Sync nach Error:**
- Bei Save-Error: refetch des proposals-Records aus DB
- proposal-editor.tsx setzt proposal-State von DB-Source-of-Truth zurueck
- Mehr Netzwerk-Roundtrips, aber einfacher zu reasonen

**Option C — UI-State-Lock waehrend Pending-Save:**
- Toggle zeigt waehrend Pending-Save weder ON noch OFF, sondern Loading-State
- Nach Save (success oder error) erst Re-Render mit korrektem State
- Eventuell mit useSkontoMutex bereits 50% gebaut

### Implementation
- Eine der drei Optionen umsetzen (Architektur-Entscheid)
- Vitest fuer Save-Error → State-Behavior schreiben
- Browser-Smoke: gleicher Repro wie RPT-277, Toggle muss konsistent bleiben

## Out of Scope
- Refactor der gesamten Save-Pipeline
- Erweiterung auf andere Sections (PaymentTermsDropdown, SplitPlanSection) — nur falls dieselbe Klasse Bug auftritt
- UX-Verbesserung der Skonto-Validation-Errors (separates Backlog-Item falls noetig)

## Acceptance Criteria

1. Toggle zeigt nach 5x Save-Error in Folge weiterhin korrekten DB-State (Browser-Smoke gegen RPT-277-Repro)
2. Vitest-Test fuer Save-Error-Pfad: SkontoSection bleibt im konsistenten State (gruener Toggle wenn DB skonto_percent != null)
3. Page-Reload zeigt unveraenderten DB-State (war schon vorher OK, regression-frei)
4. PaymentTermsDropdown + SplitPlanSection regression-frei
5. Keine neuen ESLint/TSC-Errors

## Dependencies
- V5.6 Code-Stand (REL-022)
- proposal-editor.tsx (V5.5/V5.6)
- use-skonto-mutex.ts (V5.6)
- skonto-section.tsx (V5.6)

## Open Questions

1. **Fix-Option:** A (Optimistic-Revert), B (Server-Refetch), oder C (UI-Lock)? **Default-Empfehlung: Option A wenn last-known-good leicht aus useState/useRef ableitbar — sonst Option B.**

2. **Scope-Erweiterung auf andere Sections:** Hat PaymentTermsDropdown oder SplitPlanSection denselben Klasse-Bug? Pruefen waehrend Investigation. Falls ja: in Scope nehmen (gleiche Fix-Pattern), falls nein: out-of-scope lassen.

3. **Test-Strategie:** Reicht ein Vitest-Unit-Test, oder ist ein Playwright/Browser-Smoke noetig? **Default-Empfehlung: Vitest fuer Save-Error-State + manueller Browser-Smoke wie RPT-277.**

## Related
- BL-419 (low, version=V5.7) — wird mit FEAT-572 erledigt
- RPT-277 (V5.6 SLC-562 Browser-Smoke wo der Bug entdeckt wurde)
- IMP-XXX (eventuell neuer Skill-Improvement: "Save-Error-Pfad immer mit State-Revert oder Lock")
