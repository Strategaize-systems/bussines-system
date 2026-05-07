# FEAT-643 — UI-Hygiene-Audit (Inventur + selektives Cleanup)

**Status:** planned
**Version:** V6.4
**Created:** 2026-05-07
**Sources:** User-Wunsch 2026-05-07 ("Oberflaeche aufraeumen"), V6.2-Hotfix ISSUE-056 (Settings-Landing-Karten-Inkonsistenz), V6.3 BL-426 (Workflow-Polish)

## Purpose

Strukturierter Audit der bestehenden UI nach 23 Releases. Ziel: identifizieren wo die Oberflaeche unuebersichtlich, redundant oder inkonsistent geworden ist. **Keine** pauschale UI-Erneuerung — nur User-bestaetigte Cleanup-Items werden umgesetzt.

## Audit-Scope

### Pflicht in V6.4:

**1. Settings-Landing-Page (`cockpit/src/app/(app)/settings/page.tsx`):**
- Aktuell: 5 Link-Karten (Meeting, Branding, Zahlungsbedingungen, Workflow-Automation, Kampagnen, Compliance) + Inline-Sections (ImapStatus, PipelineConfig, TemplatesConfig)
- Pruefen:
  - Reihenfolge / Hierarchie sinnvoll?
  - Inline-Sections (Pipeline, Templates) auf eigene Page umsiedeln statt Inline?
  - Visuelle Differenzierung der Karten (Icons, Farb-Tints) konsistent?
  - Welche Sub-Pages werden tatsaechlich besucht (per Server-Logs oder User-Erinnerung)?

**2. Sidebar-Navigation:**
- Aktuelle Eintraege (z.B. Mein Tag, Pipeline, Kontakte, Firmen, Multiplikatoren, Proposals, Composing, Performance, Audit-Log, Settings...)
- Pruefen:
  - Welche Eintraege werden noch benutzt?
  - Sind Reihenfolge + Gruppierung logisch?
  - Doppelte Pfade (z.B. Pipeline ueber Sidebar UND ueber Mein Tag)?

**3. Button-Konsistenz (cross-page):**
- Primary-Action-Position (rechts oben? unten zentriert? variiert je Page?)
- Primary-Action-Label-Stil (Verb-zuerst? Nomen? variiert?)
- Destructive-Actions (Loeschen-Buttons) — einheitlich rot? Mit Confirm-Dialog?
- Secondary-Actions (Abbrechen, Zurueck) — einheitlich position + Stil?

**4. Pipeline-Stages (`cockpit/src/app/(app)/pipeline/`):**
- Aktuelle Stage-Anzahl pro Pipeline (Multiplikatoren 10 Stufen, Endkunden 12 Stufen — historisch)
- Pruefen:
  - Sind alle Stages aktiv genutzt (Deal-Count pro Stage in DB)?
  - Gibt es Stage-Beschriftungen die unklar sind?
  - Sollte Stage-Anzahl reduziert werden?

**5. Page-Header-Pattern (cross-page):**
- Header-Hoehe einheitlich?
- Title + Subtitle + Actions in gleicher Position?
- Breadcrumbs einheitlich verwendet?

### Out of Audit-Scope (V6.4):

- Vollstaendige Page-Restrukturierungen (z.B. Mein Tag komplett neu) — eigener V6.5-Slice falls Audit das rechtfertigt
- Color-Palette-Wechsel — Style Guide V2 ist verbindlich
- Mobile-Optimierung — separater Sprint
- Accessibility-Audit (WCAG) — separater Compliance-Sprint
- Performance-Optimierung (Code-Split, Image-Compression) — kein UI-Hygiene-Thema

## Audit-Output

Ein einziger strukturierter Report (RPT-XXX) mit Vorher/Nachher-Beschreibung pro Item.

### Per-Item-Format:

```
## UA-001 — [Titel]
- Bereich: settings-landing | sidebar | button-konsistenz | pipeline-stages | page-header
- Aktuell: [Beschreibung des Status quo, ggf. Screenshot]
- Beobachtung: [warum ist das Item Cleanup-Kandidat]
- Vorschlag: [konkreter Vorher/Nachher-Vorschlag]
- Aufwand: [klein <1h | mittel 1-3h | gross 3+h]
- Risiko: [was kann schief gehen]
- User-Entscheidung: [ ] umsetzen [ ] spaeter [ ] nicht
```

## Cleanup-Implementation (FEAT-643 Teil 2 in SLC-645)

Nach User-Sign-Off:
- "umsetzen": UI-Aenderung wird durchgefuehrt (nur klein/mittel Items in V6.4, gross-Items als BL)
- "spaeter": als BL fuer V6.5 oder Folgesprint
- "nicht": Item wird als "OK so" archiviert

**Mindest-Quote:** mindestens 2 UI-Items in V6.4 umgesetzt.

## Acceptance Criteria

**AC1:** Audit-Report (RPT-XXX) existiert mit Inventur ueber alle 5 Bereiche.

**AC2:** Pro Bereich mindestens 1 Item klassifiziert.

**AC3:** Vorher/Nachher-Beschreibung pro Item ist konkret genug fuer Implementation.

**AC4:** Aufwands-Schaetzung pro Item ist plausibel (klein/mittel/gross).

**AC5:** User hat Item-by-Item Sign-Off durchgefuehrt.

**AC6:** Mindestens 2 UI-Items wurden in V6.4 tatsaechlich umgesetzt.

**AC7:** Live-Smoke ueber 5 Haupt-Pages (Mein Tag, Pipeline, Kontakte, Settings-Landing, Proposals) — keine sichtbaren Brueche.

**AC8:** Style Guide V2 wurde bei allen Aenderungen befolgt — keine neuen Color-Klassen ausserhalb der Token-Liste.

## Out of Scope

- Komplette Page-Redesigns
- Mobile-First-Audits
- Animation-/Micro-Interaction-Audits
- Accessibility-Audit
- Performance-Audit
- Browser-Compatibility-Audit

## Risiken & Mitigationen

- **UI-Drift gegen V5.3-V6.3-Pattern:** UI-Audit fuehrt zu Stil-Bruechen. **Mitigation:** Style Guide V2 als Referenz fuer alle Aenderungen.
- **Audit-Scope-Explosion:** 30+ Cleanup-Items gefunden. **Mitigation:** User-Sign-Off pro Item.
- **User-Erwartungs-Drift:** User hat sich an aktuellen Layout gewoehnt. **Mitigation:** Vorher/Nachher-Beschreibung explizit, User-Sign-Off pro Item.
- **Touch-Conflict mit V7-Multi-User-Sprint:** UI-Audit findet Items die in V7 ohnehin neu gemacht werden muessen. **Mitigation:** V7-bezogene Items als "spaeter" markieren, nicht in V6.4 umsetzen.

## References

- ISSUE-056 (V6.2-Hotfix Kampagnen-Karte fehlte) als Beispiel-Inkonsistenz
- BL-426 (V6.3 Workflow-Polish) als Beispiel-Cleanup-Vorgehen
- Style Guide V2 (verbindlich)
- `feedback_style_guide_v2_mandatory.md` (User-Direktive 2026-05-01)
- `feedback_v2_sidebar_pflicht.md` (Sidebar-Layout-Pflicht 2026-05-06)
