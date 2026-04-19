# SLC-433 — Signal-Cron + Pipeline-Hooks

## Slice Info
- **Feature:** FEAT-412
- **Version:** V4.3
- **Priority:** High
- **Estimated Effort:** 1 Tag
- **Dependencies:** SLC-431, SLC-432

## Goal

Signal-Extraktion in bestehende Pipelines einhaengen: meeting-summary Cron setzt signal_status=pending nach Summary, classify Cron setzt signal_status=pending bei relevanten E-Mails. Neuer signal-extract Cron verarbeitet pending Eintraege und ruft den Extractor.

## Scope

- meeting-summary Cron erweitern (signal_status setzen)
- classify Cron erweitern (signal_status setzen bei anfrage/antwort)
- Neuer `/api/cron/signal-extract` Cron
- Max 3 Items pro Cron-Durchlauf (Rate-Limit-Schutz)
- Coolify Cron-Job Registration

## Out of Scope

- Manueller Trigger (SLC-436)
- UI (SLC-435)
- Approve-Flow (SLC-434)

## Acceptance Criteria

1. meeting-summary Cron setzt signal_status='pending' nach erfolgreicher Summary-Generierung
2. classify Cron setzt signal_status='pending' nur bei classification IN ('anfrage', 'antwort')
3. signal-extract Cron findet pending Meetings + E-Mails, ruft extractSignals, setzt Status auf completed/no_signals
4. Max 3 pro Durchlauf
5. Error-Handling: bei Extraktion-Fehler bleibt Status pending (Retry beim naechsten Durchlauf)
6. Bestehende Cron-Funktionalitaet unveraendert
7. Coolify Cron registriert (alle 5 Min)

## Micro-Tasks

### MT-1: meeting-summary Hook
- Goal: Nach erfolgreicher Summary signal_status='pending' setzen
- Files: `cockpit/src/app/api/cron/meeting-summary/route.ts`
- Expected behavior: Am Ende der Summary-Pipeline: UPDATE meetings SET signal_status='pending' WHERE id=X
- Verification: Meeting nach Summary hat signal_status='pending'
- Dependencies: SLC-431/MT-2

### MT-2: classify Hook
- Goal: Bei relevanter E-Mail-Klassifikation signal_status='pending' setzen
- Files: `cockpit/src/app/api/cron/classify/route.ts`
- Expected behavior: Wenn classification IN ('anfrage', 'antwort'): UPDATE email_messages SET signal_status='pending' WHERE id=X
- Verification: E-Mail nach Klassifikation hat signal_status='pending' (nur bei anfrage/antwort)
- Dependencies: SLC-431/MT-2

### MT-3: signal-extract Cron erstellen
- Goal: Neuer Cron-Job der pending Meetings und E-Mails verarbeitet
- Files: `cockpit/src/app/api/cron/signal-extract/route.ts`
- Expected behavior: SELECT pending meetings (LIMIT 3) + pending emails (LIMIT 3), fuer jedes: Deal laden, extractSignals aufrufen, signal_status auf completed/no_signals setzen
- Verification: Cron-Route antwortet mit 200, verarbeitet Items korrekt
- Dependencies: SLC-432, MT-1, MT-2

### MT-4: Coolify Cron registrieren
- Goal: signal-extract als Cron-Job in Coolify einrichten
- Files: —
- Expected behavior: `node -e "fetch('http://localhost:3000/api/cron/signal-extract', {method:'POST'})"` alle 5 Minuten
- Verification: Cron laeuft in Coolify, keine Fehler im Log
- Dependencies: MT-3

## QA Focus

- Bestehende meeting-summary Pipeline laeuft weiterhin korrekt
- Bestehende classify Pipeline laeuft weiterhin korrekt
- signal-extract verarbeitet max 3 Items (kein Rate-Limit-Problem)
- Error in Signal-Extraktion blockiert NICHT die bestehenden Pipelines
