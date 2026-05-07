# FEAT-642 — Code-Hygiene-Audit (Inventur + selektives Cleanup)

**Status:** planned
**Version:** V6.4
**Created:** 2026-05-07
**Sources:** User-Wunsch 2026-05-07 ("doppelt und dreifach gebaut"), RPT-331 Container-Log-Beobachtung (19 Cron-Jobs aktiv, viele mit picked=0)

## Purpose

Strukturierte Inventur des Code-Base nach 23 Releases (V2..V6.3). Ziel: identifizieren was doppelt gebaut wurde, was obsolet ist, was nicht mehr genutzt wird. **Keine** pauschale Refactor-Aktion — nur User-bestaetigte Cleanup-Items werden umgesetzt.

## Audit-Scope

### Hot-Spots (Pflicht in V6.4):

**1. Cron-Jobs (19 Endpoints):**
Aktuelle Liste aus `cockpit/src/app/api/cron/`:
- automation-runner, backfill, cadence-execute, calcom-sync, call-processing, classify, embedding-sync, expire-proposals, followups, imap-sync, kpi-snapshot, meeting-briefing, meeting-recording-poll, meeting-reminders, meeting-summary, meeting-transcript, pending-consent-renewal, recording-retention, retention, signal-extract

Pro Cron pruefen:
- Trigger-Source (Coolify-Cron-Eintrag aktiv? Manueller Trigger?)
- Last 24h Output: `picked=N`, `processed=N`, errors
- User-Sichtbarkeit: produziert dieser Cron noch User-relevante Daten?
- Klassifikation: aktiv / verdaechtig (picked=0 ueber 7 Tage) / obsolet (kein Code-Konsument)

**2. AI-Engines (Ueberlappung pruefen):**
- FollowupEngine (`cockpit/src/lib/ai/followup-engine.ts`) — KI-Wiedervorlagen
- Briefing-Engine (`buildDealBriefingPrompt` aus FEAT-301) — Pre-Call-Briefings
- Signal-Extract (V4.3 FEAT-412) — Property-Aenderungen aus Meetings/Mails
- Bedrock-Pfade (verschiedene callBedrock()-Aufrufer)
- Whisper-Adapter

Pro Engine pruefen:
- Was triggert sie?
- Welche Eingaben?
- Welche Ausgaben?
- Gibt es Logik-Ueberlappung mit anderen Engines (z.B. Deal-Context-Loading)?

**3. Schema-Inkonsistenzen (Source-Konzepte):**
- `contacts.source` + `contacts.source_detail` (Freitext, alt)
- `companies.source_type` + `companies.source_detail` (Freitext, alt)
- `contacts.campaign_id` + `companies.campaign_id` + `deals.campaign_id` (V6.2 strukturiert, neu)

Pruefen:
- Welcher Code liest noch alte Felder?
- Welcher Code schreibt in alte Felder?
- Gibt es Stellen wo BEIDE parallel geschrieben werden?

**4. Server-Actions ohne Caller (tot?):**
- `cockpit/src/**/actions.ts` durchgehen
- Pro exportierter Action: grep auf Aufrufer in der gesamten Codebase
- 0 Aufrufer = obsolet-Verdacht

**5. API-Routes ohne Caller (tot?):**
- `cockpit/src/app/api/**/route.ts` durchgehen
- Pro Route: grep auf fetch-Aufrufer + externe Trigger (Cron, Webhooks)
- 0 Caller = obsolet-Verdacht

### Out of Audit-Scope (V6.4):

- Frontend-Komponenten ohne Caller (gehoert zu FEAT-643 UI-Audit)
- DB-Schema-Inventur (ungenutzte Spalten/Indizes) — eigener V6.5-Slice falls relevant
- Performance-Profiling — kein Hygiene-Thema
- Test-Coverage-Audit — kein Hygiene-Thema
- Library-Updates / npm-audit — separater BL-430

## Audit-Output

Ein einziger strukturierter Report (RPT-XXX) mit folgenden Sektionen:

### Per-Item-Format:

```
## CA-001 — [Titel]
- Typ: cron-job | ai-engine | server-action | api-route | schema-inkonsistenz
- Pfad: cockpit/src/...
- Severity: Klar-obsolet | Verdacht | Behalten
- Beobachtung: [konkrete Beweise: log-stichprobe, grep-counts, etc.]
- Cleanup-Vorschlag: [delete | soft-disable | refactor | keep]
- Risiko: [was schief gehen kann wenn Cleanup gemacht wird]
- User-Entscheidung: [ ] loeschen [ ] umsetzen [ ] spaeter [ ] nicht
```

### Severity-Definitionen:

- **Klar-obsolet:** Code hat 0 Aufrufer, kein Cron-Trigger, keine produktive Funktion
- **Verdacht:** Code wird nicht aktiv genutzt (picked=0 ueber 7 Tage), aber theoretisch erreichbar
- **Behalten:** Code ist aktiv ODER ist sicherheits-/compliance-relevant

## Cleanup-Implementation (FEAT-642 Teil 2 in SLC-643)

Nach User-Sign-Off pro Item:
- "loeschen": Code wird im naechsten Slice geloescht
- "umsetzen": Refactor wird durchgefuehrt
- "spaeter": Item geht als BL in V6.5 oder spaeter
- "nicht": Item wird im Audit als "Behalten" reklassifiziert, Begruendung dokumentiert

**Mindest-Quote:** mindestens 3 Code-Items in V6.4 umgesetzt.

## Acceptance Criteria

**AC1:** Audit-Report (RPT-XXX) existiert mit Inventur ueber alle 5 Hot-Spot-Bereiche.

**AC2:** Pro Hot-Spot mindestens 3 Items klassifiziert.

**AC3:** Severity-Klassifikation ist nachvollziehbar (Beobachtung + Cleanup-Vorschlag pro Item).

**AC4:** User hat Item-by-Item Sign-Off durchgefuehrt (loeschen/umsetzen/spaeter/nicht).

**AC5:** Mindestens 3 Code-Items wurden in V6.4 tatsaechlich umgesetzt (nach Sign-Off).

**AC6:** Vitest 393/393 (oder mehr) PASS nach allen Cleanup-Aenderungen.

**AC7:** Live-Smoke nach Cleanup-Deploy: alle Haupt-Pages laden, alle aktiven Cron-Jobs laufen weiter, keine 5xx-Fehler in Container-Log.

## Out of Scope

- Vollstaendige Refactor-Sprints (z.B. AI-Engine-Konsolidierung) — als V6.5-Kandidat falls Audit das rechtfertigt
- DB-Schema-Aufraeumung (ungenutzte Spalten droppen) — eigener V6.5-Slice
- Library-Konsolidierung (mehrere Date-Libraries, mehrere HTTP-Clients) — kein V6.4-Thema
- Performance-Optimierungen — kein V6.4-Thema

## Risiken & Mitigationen

- **Falsch-Positiv "obsolet":** Code ist seltener Edge-Case-Pfad. **Mitigation:** Vor Loeschung mind. 1 Live-Smoke ueber den verdaechtigen Pfad.
- **Audit-Scope-Explosion:** 50+ Cleanup-Items gefunden. **Mitigation:** User-Sign-Off pro Item, Rest als BL.
- **Compliance-Drift:** Cleanup tangiert Audit-Log-Schreiber. **Mitigation:** Audit-Log-Pfade pauschal als "Behalten" klassifizieren.

## References

- RPT-331 Post-Launch-Review (19 Cron-Jobs Aktivitaets-Stichprobe)
- ISSUE-057 als Beispiel-Befund (FollowupEngine Schema-Drift)
- IMP-351 Schema-Migration Downstream-Grep (Dev-System SKILL_IMPROVEMENTS.md)
- `cockpit/src/app/api/cron/` als Hot-Spot-Verzeichnis
- `cockpit/src/lib/ai/` als AI-Engine-Verzeichnis
