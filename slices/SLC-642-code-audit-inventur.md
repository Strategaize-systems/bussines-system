# SLC-642 — Code-Audit Inventur

## Metadata
- **Slice ID:** SLC-642
- **Version:** V6.4
- **Feature:** FEAT-642
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-07
- **Estimated Effort:** ~2-3h Inventur (PLUS User-Sign-Off-Pause unbestimmter Dauer)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (Begruendung: keine Code-Aenderung in diesem Slice — nur Audit-Report-Erstellung)

## Goal

Strukturierte Inventur ueber 5 Hot-Spots im Code-Base nach 23 Releases. Output: 1 RPT-XXX-Code-Audit mit Per-Item-Liste + Severity-Klassifikation. **KEIN Cleanup in diesem Slice** — Cleanup-Implementation ist SLC-643. Zwischen SLC-642 und SLC-643 ist eine zwingende User-Sign-Off-Pause (Item-by-Item-Klassifikation: loeschen/umsetzen/spaeter/nicht).

## Scope

**In Scope (6 MTs Inventur):**
- MT-1: Coolify-Cron-Liste vs. Code-Endpoint-Diff (Cron-Job-Inventur)
- MT-2: Cron-Job-Aktivitaet 24h-Log-Stichprobe pro Endpoint
- MT-3: AI-Engine-Inventur (FollowupEngine, Briefing-Engine, Signal-Extract, Bedrock-Adapter, Whisper-Adapter)
- MT-4: Source-Schema-Konsumenten-Pruefung (alte source/source_detail vs. neue campaign_id)
- MT-5: Tote-Code-Inventur (Server-Actions + API-Routes ohne Caller)
- MT-6: Audit-Report-Erstellung mit Severity-Klassifikation pro Item

**Out of Scope:**
- Cleanup-Implementation (SLC-643)
- DB-Schema-Audit (V6.5 separat per DEC-148)
- AI-Engine-Konsolidierungs-Refactor (V6.5 separat per DEC-149)
- Performance-Profiling
- Security-/Compliance-Audit
- Test-Coverage-Audit

## Acceptance

- AC-1: Coolify-Cron-Liste vom Server gepullt + gegen `cockpit/src/app/api/cron/`-Verzeichnis-Inhalt verglichen. Diff-Liste dokumentiert: aktive Crons, registrierte aber nicht eingeplante Crons, Code-Endpoints ohne Coolify-Cron.
- AC-2: Pro aktivem Cron-Endpoint 24h-Container-Log-Stichprobe inspiziert + Aktivitaets-Klassifikation (`picked=N`, `processed=N`, errors) dokumentiert.
- AC-3: AI-Engine-Inventur enthaelt fuer jede der 5 Engines: Datei-Pfad, Trigger-Source, Eingabe-Typ, Ausgabe-Typ, identifizierte Logik-Ueberlappung mit anderen Engines (falls vorhanden).
- AC-4: Source-Schema-Konsumenten-Liste enthaelt: Reader-Stellen pro Feld (`contacts.source/source_detail/campaign_id`, `companies.source_type/source_detail/campaign_id`, `deals.campaign_id`), Writer-Stellen pro Feld, Stellen wo BEIDE parallel geschrieben werden.
- AC-5: Tote-Code-Inventur enthaelt: Server-Actions ohne Caller (Liste mit Pfaden), API-Routes ohne Caller (Liste mit Pfaden), grep-Beweis pro Item.
- AC-6: Audit-Report (RPT-XXX) ist erstellt mit:
  - mindestens 3 Items pro Hot-Spot (= mindestens 15 Items total) klassifiziert
  - Pro Item: Typ, Pfad, Severity (Klar-obsolet / Verdacht / Behalten), Beobachtung, Cleanup-Vorschlag, Risiko, User-Entscheidung-Checkbox
- AC-7: Audit-Log-Pfade sind explizit als "Behalten" markiert (Compliance-Schutz).
- AC-8: AI-Engine-Konsolidierungs-Items sind explizit auf "spaeter (V6.5)" gesetzt (DEC-149).
- AC-9: Audit-Report ist committed + gepusht. User-Sign-Off-Pause beginnt.

## Reuse

- **Container-Log-Inspektion** via `ssh root@91.98.20.191 "docker logs $APP --tail 1000 ..."` — Pattern aus Post-Launch (RPT-331).
- **Coolify-Cron-Liste** via Coolify-UI oder via Coolify-API (Container-ENV-Vars zeigen `COOLIFY_RESOURCE_*`-Tags).
- **ripgrep-Patterns** — Standard fuer Code-Konsumenten-Suche (`rg -t ts "from\(\"proposals\""`).
- **Audit-Per-Item-Format** — DEC-145.

## Risks

- **Risiko AC-2 unvollstaendig:** 24h Container-Logs koennten nicht alle Cron-Trigger zeigen wenn Logs rotiert wurden. Mitigation: bei Verdacht-Faellen direkt 7-Tage-Sample ziehen (Coolify-Log-Retention pruefen).
- **Risiko AC-5 grep-Falsch-Positiv:** Server-Action wird via dynamic-import oder string-konstruiertem Pfad aufgerufen, ist nicht statisch greppable. Mitigation: nur als "Verdacht" klassifizieren, nicht "Klar-obsolet". Vor Hart-Loeschung in SLC-643 Live-Smoke.
- **Risiko Audit-Scope-Explosion:** Mehr als 50 Items gefunden, Audit-Report wird unuebersichtlich. Mitigation: pro Hot-Spot Mindest-Quote = 3 (=15 total) als Floor, KEIN Maximum. Wenn 50+ Items: Audit-Report kategorisieren (Top-15 mit User-Sign-Off, Rest als "spaeter (V6.5)"-BL).
- **Risiko Falsche Stilllegung kritischer Crons:** "picked=0 ueber 24h" reicht nicht zwingend fuer Cleanup-Decision. Mitigation: Severity konservativ — wenig genutzte Crons als "Verdacht", nicht "Klar-obsolet".

## Verification Strategy

### Pre-Implementation
- SSH-Zugang Hetzner (91.98.20.191) verifiziert.
- Coolify-Cron-Setup verstehen (UI vs. Container-ENV).

### Per-MT Verification
Siehe Micro-Tasks unten.

### Slice-Level Verification
- Audit-Report enthaelt mindestens 15 klassifizierte Items.
- Pro Item: alle Felder ausgefuellt (Typ, Pfad, Severity, Beobachtung, Cleanup-Vorschlag, Risiko, User-Entscheidung-Checkbox).
- Audit-Log-Pfade als "Behalten" markiert.
- Report committed, User-Sign-Off-Pause aktiv.

---

## Micro-Tasks

### MT-1: Coolify-Cron-Liste vs. Code-Endpoint-Diff
- **Goal:** Inventur welche Cron-Endpoints aktiv eingeplant sind.
- **Files:**
  - Audit-Report-Section "1. Cron-Jobs" (NEU im RPT)
- **Expected behavior:**
  - SSH zu Hetzner, Coolify-Cron-Liste pullen (UI oder Container-ENV)
  - `ls cockpit/src/app/api/cron/` — Code-Endpoint-Liste (sollte 19 sein laut RPT-331)
  - Diff: 3-Spalten-Tabelle (aktive Crons, registriert aber nicht eingeplant, Code ohne Cron)
- **Verification:**
  - Audit-Report enthaelt 3-Spalten-Tabelle
  - Mindestens 19 Code-Endpoints abgedeckt
- **Dependencies:** none

### MT-2: Cron-Aktivitaet 24h-Log-Stichprobe
- **Goal:** Pro Cron-Endpoint Aktivitaet messen.
- **Files:**
  - Audit-Report-Section "1. Cron-Jobs" (EXTEND, pro Cron eine Sub-Sektion)
- **Expected behavior:**
  - `ssh root@91.98.20.191 "docker logs $APP 2>&1 | grep '\[Cron/...]' | sort | uniq -c"` (Pattern aus RPT-331)
  - Pro Cron-Endpoint: letzte 24h Output-Stichprobe (`picked=N`, `processed=N`, errors)
  - Klassifikation: Aktiv (>0 picked/processed), Idle (alle 0), Error (errors>0)
- **Verification:**
  - Audit-Report enthaelt Aktivitaets-Klassifikation pro Cron-Endpoint
- **Dependencies:** MT-1

### MT-3: AI-Engine-Inventur
- **Goal:** Pruefen ob FollowupEngine + Briefing-Engine + Signal-Extract + Bedrock-Adapter + Whisper-Adapter Logik teilen.
- **Files:**
  - Audit-Report-Section "2. AI-Engines" (NEU)
- **Expected behavior:**
  - Pro Engine grep auf Trigger-Source (welcher Cron oder Server-Action ruft sie?)
  - Pro Engine: Eingabe (Deal-Context? Meeting? E-Mail? Audio?), Ausgabe (KI-Vorschlag, Activity-Insert, Voice-Recording-Path?)
  - Logik-Ueberlappung: Wer laedt Deal-Context? Wer ruft Bedrock? Wer schreibt Audit-Log? Tabelle zeigen wo gemeinsame Pfade existieren
- **Verification:**
  - Pro 5 Engines: Pfad + Trigger + Input + Output + Ueberlappungs-Markierung
  - Falls Ueberlappung gefunden: Item mit User-Decision "spaeter (V6.5)" pro DEC-149
- **Dependencies:** none (parallel zu MT-1/MT-2 moeglich)

### MT-4: Source-Schema-Konsumenten
- **Goal:** Pruefen ob alte und neue Source-Konzepte parallel geschrieben werden.
- **Files:**
  - Audit-Report-Section "3. Source-Schema-Inkonsistenzen" (NEU)
- **Expected behavior:**
  - 7 Felder durchgehen: `contacts.source`, `contacts.source_detail`, `contacts.campaign_id`, `companies.source_type`, `companies.source_detail`, `companies.campaign_id`, `deals.campaign_id`
  - Pro Feld grep auf Reader (`SELECT ... source` etc.) und Writer (`UPDATE ... source = ...`, `.update({ source: ... })`)
  - Tabelle: Feld | Reader-Stellen | Writer-Stellen | Doppel-Writer-Stellen (kritisch)
- **Verification:**
  - Audit-Report enthaelt Source-Konsumenten-Tabelle
  - Items mit "umsetzen"-Vorschlag NUR fuer trivial Cleanups (z.B. Reader-only Code mit Migration auf neue Spalte). BL-424 Migration-Tool bleibt deferred.
- **Dependencies:** none

### MT-5: Tote-Code-Inventur
- **Goal:** Server-Actions + API-Routes ohne Caller identifizieren.
- **Files:**
  - Audit-Report-Section "4. Tote Server-Actions" (NEU)
  - Audit-Report-Section "5. Tote API-Routes" (NEU)
- **Expected behavior:**
  - `cockpit/src/**/actions.ts` durchgehen, pro exportierter Action grep auf Aufrufer (Imports + Form-Action-Bindings)
  - `cockpit/src/app/api/**/route.ts` durchgehen, pro Route grep auf fetch-Caller + Coolify-Cron-Liste
  - 0-Caller-Items als "Verdacht" oder "Klar-obsolet" je nach Confidence
- **Verification:**
  - Mindestens 3 Items in jeder Section (kann mehr sein)
- **Dependencies:** MT-1 (Cron-Liste fuer API-Routes-Cross-Check)

### MT-6: Audit-Report mit Severity-Klassifikation + Sign-Off-Pause
- **Goal:** Konsolidierter Audit-Report mit Per-Item-Format + User-Sign-Off-Checkbox-Liste.
- **Files:**
  - `reports/RPT-XXX.md` (NEU, type: audit)
- **Expected behavior:**
  - Frontmatter: `type: audit`, `status: pending-signoff`, `slice: SLC-642`, `feature: FEAT-642`, `title: "V6.4 Code-Audit Inventur"`
  - Body: 5 Sections aus MT-1..MT-5, jede mit Per-Item-Format pro Eintrag:
    ```
    ## CA-NNN — [Titel]
    - Typ: cron-job | ai-engine | server-action | api-route | schema-inkonsistenz
    - Pfad: cockpit/src/...
    - Severity: Klar-obsolet | Verdacht | Behalten
    - Beobachtung: ...
    - Cleanup-Vorschlag: delete | soft-disable | refactor | keep
    - Risiko: ...
    - User-Entscheidung: [ ] loeschen [ ] umsetzen [ ] spaeter [ ] nicht
    ```
  - audit_log-Pfade explizit als "Behalten" markiert (Compliance-Schutz)
  - AI-Engine-Konsolidierungs-Items als "spaeter (V6.5)" markiert (DEC-149)
  - Mindestens 15 Items total, mindestens 3 pro Hot-Spot
- **Verification:**
  - Report committed
  - Slice-Status `pending-signoff` in slices/INDEX.md
  - User-Pause-Phase: User klassifiziert pro Item, schliesst danach SLC-642 als done
- **Dependencies:** MT-1, MT-2, MT-3, MT-4, MT-5

---

## Definition of Done

- 6 MTs durchgefuehrt
- Audit-Report (RPT-XXX) committed mit mindestens 15 klassifizierten Items
- audit_log-Pfade als "Behalten" markiert
- AI-Engine-Konsolidierungs-Items auf "spaeter (V6.5)"
- User-Sign-Off-Pause aktiv (Slice-Status `pending-signoff` oder `done` nach Sign-Off)
- /qa-Skip akzeptiert (kein Code-Aenderung in diesem Slice, keine Vitest noetig — User-Pruefung des Audit-Reports ist die Verifikation)
- Naechster Schritt nach User-Sign-Off: SLC-643 Code-Cleanup-Implementation
