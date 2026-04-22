# SLC-513 — WebRTC Click-to-Call + In-Call-Widget

## Meta
- Feature: FEAT-512
- Priority: High
- Status: planned
- Created: 2026-04-22

## Goal

Anrufen-Button im Deal-Workspace. SIP.js-Client verbindet sich mit Asterisk ueber WSS. In-Call-Widget zeigt Call-Status (Waehlen/Klingeln/Verbunden/Beendet). Anruf-Record wird in calls-Tabelle erstellt und aktualisiert.

## Scope

- SIP.js Dependency installieren
- SIP-Config Server Action (liefert WSS-URL + Credentials an authentifizierten User)
- SIP.js UserAgent + Registerer + Inviter Integration
- CallWidget React-Komponente (In-Call-UI)
- Anrufen-Button im Deal-Workspace (sichtbar wenn Kontakt Telefonnummer hat)
- Call-Lifecycle Server Actions: createCall → updateCallStatus
- X-Call-ID Header an Asterisk (fuer MixMonitor-Dateiname)
- Browser-Mikrofon-Zugriff (getUserMedia)
- Call-Historie in Deal-Workspace Timeline (einfache Anzeige)

## Out of Scope

- Transkription + Summary (SLC-514)
- SMAO-Adapter (SLC-515)
- Eingehende Anrufe (Go-Live)
- Multi-User SIP-Endpunkte (V7)

## Acceptance Criteria

- AC1: Deal-Workspace zeigt "Anrufen"-Button wenn Kontakt eine Telefonnummer hat
- AC2: Klick oeffnet In-Call-Widget (Mikrofon-Zugriff wird angefragt)
- AC3: SIP.js verbindet sich ueber WSS mit Asterisk (sip.strategaizetransition.com)
- AC4: Ausgehender Anruf ueber Asterisk (interner Test: Echo-Extension 600)
- AC5: In-Call-Widget zeigt Status: Waehlen → Klingeln → Verbunden → Beendet
- AC6: Kontakt-Name + Nummer im Widget sichtbar
- AC7: Auflegen beendet den Anruf sauber (keine haengenden Sessions)
- AC8: Call-Record wird in calls-Tabelle erstellt (createCall) und Status-Updates gespeichert
- AC9: X-Call-ID Header wird an Asterisk gesendet (fuer Recording-Dateiname)
- AC10: Deal-Workspace Timeline zeigt abgeschlossene Calls (einfache Liste)

## Dependencies

- SLC-511 (calls-Tabelle)
- SLC-512 (laufender Asterisk mit WSS)

## Risks

- Browser-Mikrofon-Berechtigung: User muss Zugriff erlauben. UI muss Hinweis zeigen bei Verweigerung.
- SIP.js Bundle-Size: ~200 KB. Akzeptabel, aber als dynamischer Import laden.
- SRTP-Aushandlung: Asterisk erwartet DTLS-SRTP, SIP.js muss korrekt konfiguriert sein.

## Micro-Tasks

### MT-1: SIP.js installieren + SIP-Config Server Action
- Goal: SIP.js als Dependency, Server Action die WSS-URL + Credentials liefert (nur fuer authentifizierte User)
- Files: `cockpit/package.json`, `cockpit/src/app/(app)/calls/actions.ts` (erweitern)
- Expected behavior: getSipConfig() liefert {wssUrl, username, password} nach Auth-Check
- Verification: TypeScript kompiliert, Server Action liefert Config
- Dependencies: none (SLC-511 MT-4 fuer Actions-Datei)

### MT-2: SIP.js Hook (useSipPhone)
- Goal: React Hook der SIP.js UserAgent, Registerer, Inviter kapselt
- Files: `cockpit/src/hooks/use-sip-phone.ts`
- Expected behavior: Hook bietet: connect(), call(number, callId), hangup(), status (idle/registering/registered/calling/ringing/connected/ended)
- Verification: Hook kompiliert, Types korrekt
- Dependencies: MT-1

### MT-3: CallWidget Komponente
- Goal: In-Call-UI mit Status-Anzeige, Kontakt-Info, Auflegen-Button, Timer
- Files: `cockpit/src/components/calls/call-widget.tsx`
- Expected behavior: Widget zeigt Status-Transitions, Kontakt-Name + Nummer, Anrufdauer-Timer bei Connected, Auflegen-Button
- Verification: Komponente rendert korrekt, Status-Transitions sichtbar
- Dependencies: MT-2

### MT-4: Anrufen-Button im Deal-Workspace
- Goal: Button im Deal-Workspace Quick-Actions-Bereich, oeffnet CallWidget
- Files: `cockpit/src/app/(app)/deals/[id]/page.tsx` (oder relevante Workspace-Komponente)
- Expected behavior: Button sichtbar wenn Kontakt phone hat. Klick → Mikrofon-Anfrage → CallWidget oeffnet → Call startet
- Verification: Browser-Test: Button sichtbar, Klick startet Call-Flow, Echo-Test (600) funktioniert
- Dependencies: MT-2, MT-3

### MT-5: Call-Lifecycle + Timeline-Anzeige
- Goal: createCall bei Call-Start, updateCallStatus bei Status-Changes, abgeschlossene Calls in Timeline
- Files: `cockpit/src/app/(app)/calls/actions.ts`, `cockpit/src/app/(app)/deals/[id]/` (Timeline-Erweiterung)
- Expected behavior: Call-Record in DB, Status-Updates korrekt, Timeline zeigt Calls mit Dauer + Status
- Verification: calls-Tabelle hat Eintraege nach Test-Call, Timeline zeigt Call-Eintraege
- Dependencies: MT-4
