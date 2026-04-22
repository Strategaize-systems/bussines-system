# SLC-515 — SMAO Voice-Agent Adapter + Webhook

## Meta
- Feature: FEAT-514
- Priority: Medium
- Status: planned
- Created: 2026-04-22

## Goal

VoiceAgentProvider-Interface definieren. SMAO als erste Implementierung (nicht verbunden). Webhook-Endpoint fuer eingehende Call-Daten. Klassifikations-basierte Aktionen (Task, Notification, Activity). Dialplan-Vorbereitung fuer SMAO-Routing (per ENV aktivierbar).

## Scope

- VoiceAgentProvider Interface + Types
- SMAO-Adapter Implementierung
- Synthflow-Platzhalter
- Factory mit ENV-Switch
- Webhook-Endpoint POST /api/webhooks/voice-agent
- Webhook-Secret-Validierung
- Kontakt-Zuordnung (Telefonnummer → contacts.phone)
- Klassifikations-Aktionen: urgent (Push), callback (Task), info (Activity), meeting_request (Task)
- Middleware-Whitelist fuer Webhook-Route
- Asterisk-Dialplan SMAO-Routing vorbereitet (GotoIf SMAO_ENABLED)

## Out of Scope

- SMAO-Account-Aktivierung (Go-Live)
- Tatsaechliche SIP-Verbindung zu SMAO (Go-Live)
- Synthflow-Implementierung (spaeter)
- Cal.com-Buchungslink-Ruecksendung (V5.2+)

## Acceptance Criteria

- AC1: VoiceAgentProvider Interface ist definiert und exportiert
- AC2: SmaoProvider implementiert validateWebhook + parsePayload + getProviderName
- AC3: SynthflowProvider existiert als Platzhalter (throws "not implemented")
- AC4: Factory liefert korrekten Provider basierend auf VOICE_AGENT_PROVIDER ENV
- AC5: Webhook-Endpoint validiert SMAO_WEBHOOK_SECRET korrekt
- AC6: Webhook erstellt Call-Record (direction='inbound', voice_agent_handled=true)
- AC7: urgent-Klassifikation loest Push-Notification aus (bestehender web-push)
- AC8: callback-Klassifikation erstellt Task mit Transkript
- AC9: Kontakt-Zuordnung funktioniert (Telefonnummer-Match)
- AC10: Dialplan [from-trunk] routet an SMAO wenn SMAO_ENABLED=true (Config-Verifikation)
- AC11: Middleware erlaubt /api/webhooks/voice-agent ohne Supabase-Auth

## Dependencies

- SLC-511 (calls-Tabelle)
- SLC-512 (Dialplan-Erweiterung, aber Adapter ist unabhaengig vom Container)

## Risks

- SMAO-Webhook-Format unbekannt: Generisches Interface, SMAO-Adapter parst nach Best-Guess. Bei Go-Live gegen echte SMAO-Doku validieren.
- Push-Notification bei urgent: Setzt voraus dass User push_subscription in user_settings hat (V4.1 Feature).

## Micro-Tasks

### MT-1: VoiceAgentProvider Interface + Types
- Goal: Interface-Definition, VoiceAgentCallResult-Type, Export
- Files: `cockpit/src/lib/telephony/voice-agent/provider.ts`
- Expected behavior: Interface definiert validateWebhook, parsePayload, getProviderName
- Verification: TypeScript kompiliert
- Dependencies: none

### MT-2: SMAO-Adapter + Synthflow-Platzhalter + Factory
- Goal: SmaoProvider implementiert Interface, SynthflowProvider als Platzhalter, Factory liest ENV
- Files: `cockpit/src/lib/telephony/voice-agent/smao.ts`, `cockpit/src/lib/telephony/voice-agent/synthflow.ts`, `cockpit/src/lib/telephony/voice-agent/factory.ts`, `cockpit/src/lib/telephony/voice-agent/index.ts`
- Expected behavior: getVoiceAgentProvider() liefert SmaoProvider (default) oder SynthflowProvider
- Verification: Unit-Test oder manueller Aufruf: Provider-Name korrekt, parsePayload verarbeitet Test-Payload
- Dependencies: MT-1

### MT-3: Webhook-Endpoint + Middleware
- Goal: POST /api/webhooks/voice-agent mit Secret-Validierung, Payload-Verarbeitung, Call-Insert
- Files: `cockpit/src/app/api/webhooks/voice-agent/route.ts`, `cockpit/src/middleware.ts` (Whitelist erweitern)
- Expected behavior: Webhook empfaengt Test-Payload, validiert Secret, erstellt Call-Record
- Verification: curl-Test mit korrektem Secret → 200 + Call in DB. Ohne Secret → 401.
- Dependencies: MT-2

### MT-4: Klassifikations-Aktionen
- Goal: urgent → Push, callback → Task, info → Activity, meeting_request → Task
- Files: `cockpit/src/app/api/webhooks/voice-agent/route.ts` (erweitern)
- Expected behavior: Je nach classification wird korrekte Aktion ausgefuehrt
- Verification: Test-Payloads mit verschiedenen Classifications → korrekte DB-Eintraege (tasks, activities) + Push-Versuch
- Dependencies: MT-3

### MT-5: Dialplan SMAO-Routing Verifikation
- Goal: Asterisk-Dialplan [from-trunk] mit GotoIf SMAO_ENABLED Bedingung verifizieren
- Files: `asterisk/config/extensions.conf` (bereits in SLC-512 vorbereitet, hier nur Verifikation)
- Expected behavior: Mit SMAO_ENABLED=false: Anrufe gehen an webrtc-user. Mit SMAO_ENABLED=true: Anrufe gehen an smao-endpoint.
- Verification: Asterisk CLI: `dialplan show from-trunk` zeigt GotoIf-Logik
- Dependencies: SLC-512
