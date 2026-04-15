# FEAT-404 — Call Intelligence (Jitsi + Jibri + Whisper + Summary)

## Summary

Browser-basierte Video-Meetings mit automatischer Aufzeichnung, Transkription und KI-Summary. Self-hosted Jitsi + Jibri auf Hetzner, Whisper via Adapter-Pattern (OpenAI in V4.1, tauschbar), Bedrock Claude Sonnet 4 fuer Summary. Ergebnis landet als Meeting-Activity in der Deal-Timeline.

## Version

V4.1

## Related Decisions

- DEC-031: V4 Self-Hosted Everything (Cal.com + Jitsi auf Hetzner)
- DEC-035: Whisper-Adapter-Pattern statt direktem SDK-Aufruf
- DEC-036: Jitsi + Jibri als shared Infrastructure (Business + Blueprint)
- DEC-038: DSGVO-Einwilligung einmalig beim Kontakt-Onboarding
- DEC-019: Whisper OpenAI API akzeptabel
- DEC-023: Zentraler LLM-Service-Layer fuer Bedrock

## Dependencies

- FEAT-411 (DSGVO-Einwilligungsflow) — MUSS vor Recording-Start gepruefft sein
- FEAT-308 (Meeting-Management) — `meetings` Tabelle mit `transcript` Feld existiert bereits
- DEC-023 Bedrock LLM-Layer (aus V3)
- Cal.com (FEAT-406) — Jitsi-Link optional in Cal.com Booking-Types einbindbar

## User Story

Als Eigentuemer will ich ein Meeting aus dem Deal-Workspace als Video-Call im Browser starten, automatisch aufzeichnen lassen und nach dem Meeting ohne manuelle Nacharbeit einen strukturierten Summary in der Deal-Timeline sehen — so dass ich mich im Meeting auf das Gespraech konzentrieren kann, nicht auf Notizen.

## Acceptance Criteria

1. **Meeting starten:** Button "Meeting starten" im Deal-Workspace und auf Mein Tag oeffnet Jitsi-Raum im Browser mit automatisch generiertem Raum-Namen (deal-{dealId}-{timestamp}).
2. **Teilnehmer-Einladung:** Meeting-Link wird automatisch an verknuepfte Kontakte gesendet (E-Mail + .ics, siehe FEAT-409) und im Deal-Workspace angezeigt.
3. **Consent-Check:** Vor Recording-Start prueft das System `consent_status` aller Teilnehmer. Nur wenn alle `granted` haben, startet Jibri. Sonst: Meeting laeuft, aber keine Aufzeichnung, UI-Hinweis "Aufzeichnung deaktiviert — fehlende Einwilligung fuer: {Name}".
4. **Recording:** Jibri zeichnet Audio + Video auf. Format: MP4 (Jibri-Default). Aufzeichnung wird nach Meeting-Ende in Supabase Storage (EU) abgelegt.
5. **Transkription:** Aufgezeichnete Datei wird an Whisper-Adapter-Service geschickt. Adapter ruft derzeit OpenAI Whisper API auf. Transkript landet in `meetings.transcript`.
6. **Summary:** Transkript wird an Bedrock LLM-Service (Claude Sonnet 4, Frankfurt) geschickt. Strukturierter Summary-Output: Outcome, Decisions, Action-Items, Next-Step. Summary wird als Meeting-Activity in Deal-Timeline geschrieben (source_type='meeting', ai_generated=true).
7. **Zeitfenster:** Innerhalb von <10 Minuten nach Meeting-Ende liegt Transkript + Summary vor.
8. **Editierbarkeit:** User kann Transkript und Summary im Deal-Workspace einsehen und manuell bearbeiten. Aenderungen werden als "user-edited" geflaggt.
9. **Fehler-Handling:** Wenn Transkription oder Summary scheitern: Aufzeichnung bleibt erhalten, Meeting-Eintrag wird mit `recording_status = failed` markiert, User sieht Retry-Button.
10. **Speicherung:** Meeting-Rohaufzeichnung wird nach 30 Tagen automatisch geloescht (Retention-Cron). Transkript + Summary bleiben permanent.

## Schema-Erweiterungen

### meetings (erweitert)

| Feld | Typ | Beschreibung |
|---|---|---|
| recording_url | TEXT | Supabase Storage Path zur Aufzeichnung |
| recording_status | TEXT | pending / recording / completed / failed / deleted |
| recording_started_at | TIMESTAMPTZ | Start der Aufzeichnung |
| recording_duration_seconds | INT | Dauer in Sekunden |
| transcript_status | TEXT | pending / processing / completed / failed |
| summary_status | TEXT | pending / processing / completed / failed |
| ai_summary | JSONB | Strukturierter Summary: {outcome, decisions[], action_items[], next_step} |
| jitsi_room_name | TEXT | Generierter Raum-Name |

### activities (ai_generated Flag neu, falls nicht vorhanden)

- `ai_generated` BOOLEAN DEFAULT false — markiert KI-erzeugte Eintraege

## Technical Notes

- **Whisper-Adapter-Interface:**
  ```ts
  interface TranscriptionProvider {
    transcribe(audioFile: Buffer | URL, language?: string): Promise<TranscriptionResult>
  }
  ```
  Implementierung in V4.1: `OpenAIWhisperProvider`. Spaeter: `AzureWhisperProvider`, `SelfHostedWhisperProvider`.
- **Jitsi-Setup:** Self-hosted auf Hetzner (gleicher Server oder separater — Architektur-Entscheidung). JWT-Auth pro Tenant (Business, spaeter Blueprint). Prosody + JVB (Jitsi Videobridge) + Jicofo + Jibri als Container-Stack.
- **Jibri Recording:** laeuft in eigenem Container mit Chrome + XOrg + ffmpeg. Recording-Storage: Shared Volume → Cron-Job uploaded nach Supabase Storage.
- **Bedrock-Summary-Prompt:** Strukturiert als System-Prompt mit JSON-Schema-Anforderung. Context-Window-Check: Lange Meetings (>1h = ca. 15k Tokens) passen in Sonnet 4 200k Context.
- **Idempotenz:** Summary-Generation ist idempotent — Retry erzeugt keinen Duplicate-Activity-Eintrag.

## Out of Scope (V4.2+)

- Telefon-Integration via SIP/PSTN (Jigasi, BL-206)
- Automatische Action-Item-zu-Task-Konvertierung (V4.3 Queue)
- Sprecher-Erkennung / Diarization im Transkript
- Echtzeit-Transkription waehrend Meeting
- Cross-Source-Suche im Transkript (das ist FEAT-401 Wissensbasis in V4.2)
- Meeting-Vorlagen / wiederkehrende Agenda-Patterns

## Open Questions (fuer /architecture)

- Jitsi auf gleichem Hetzner-Server wie Business App oder separatem Meeting-Server?
- Jibri Resource-Bedarf: Chrome + XOrg pro Recording = ca. 2GB RAM. Wie viele parallele Recordings muessen moeglich sein?
- Storage-Retention: Rohaufzeichnungen 30 Tage fest, oder konfigurierbar?
- Fallback wenn Whisper-API 429 Rate-Limit: Retry mit Backoff oder Queue?
- Sprach-Erkennung: Auto-Detect oder Default "de"?
