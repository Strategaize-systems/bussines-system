# SLC-512 — Asterisk Docker-Setup + Traefik-WSS

## Meta
- Feature: FEAT-511
- Priority: Blocker
- Status: planned
- Created: 2026-04-22

## Goal

Asterisk 20 LTS als Docker-Container im Compose-Stack. WebSocket-Transport ueber Traefik (sip.strategaizetransition.com). Interne Test-Calls (Echo-Test, Browser-zu-Browser) funktionieren. MixMonitor-Aufnahme aktiv.

## Scope

- Dockerfile fuer Asterisk 20 LTS (Debian Bookworm)
- PJSIP-Konfiguration: WebRTC-Endpunkt, Transports (WSS + UDP)
- Dialplan: webrtc-outbound, from-trunk, internal-test, Echo-Test
- MixMonitor-Konfiguration (WAV, UUID-basierter Dateiname)
- rtp.conf: Port-Range 16384-16484
- http.conf: WebSocket auf Port 8089
- entrypoint.sh: ENV-Variablen in Config-Dateien rendern
- docker-compose.yml: asterisk Service + Volume + Labels
- Traefik-Labels fuer sip.strategaizetransition.com (WSS → WS Proxy)
- DNS A-Record fuer sip.strategaizetransition.com
- Hetzner Cloud Firewall: UDP 16384-16484 oeffnen

## Out of Scope

- SIP.js Browser-Integration (SLC-513)
- Call-Processing-Pipeline (SLC-514)
- SMAO-Adapter (SLC-515)
- SIP-Trunk-Verbindung (Go-Live)

## Acceptance Criteria

- AC1: Asterisk-Container startet und ist healthy im Docker-Stack
- AC2: `asterisk -rx "pjsip show endpoints"` zeigt webrtc-user Endpunkt
- AC3: `asterisk -rx "pjsip show transports"` zeigt WSS + UDP Transports
- AC4: WSS-Verbindung ueber sip.strategaizetransition.com erreichbar (TLS via Traefik)
- AC5: Echo-Test (Extension 600) funktioniert ueber WebRTC
- AC6: MixMonitor schreibt WAV-Datei in /var/spool/asterisk/monitor/
- AC7: rtp.conf zeigt Range 16384-16484
- AC8: Hetzner-Firewall hat UDP 16384-16484 eingehend offen
- AC9: SIP-Trunk-Config ist vorbereitet aber deaktiviert (SIP_TRUNK_ENABLED=false)
- AC10: SMAO-Routing ist im Dialplan vorbereitet aber deaktiviert (SMAO_ENABLED=false)

## Dependencies

- SLC-511 (calls-Tabelle fuer spaetere Verifikation, aber Docker-Setup selbst ist unabhaengig)

## Risks

- Asterisk + Traefik WSS-Routing: Traefik muss WebSocket-Upgrade durchlassen. Gleiche Coolify-Label-Strategie wie Jitsi.
- Asterisk-ENV-Templating in entrypoint.sh: PJSIP-Config akzeptiert keine ENV-Variablen nativ. entrypoint.sh muss envsubst oder sed nutzen.
- Hetzner-Firewall: UDP-Ports muessen auf Hypervisor-Level geoeffnet werden (nicht ufw).

## Micro-Tasks

### MT-1: Asterisk Config-Dateien erstellen
- Goal: Alle Asterisk .conf-Dateien im Repo unter /asterisk/config/
- Files: `asterisk/config/pjsip.conf`, `asterisk/config/extensions.conf`, `asterisk/config/rtp.conf`, `asterisk/config/http.conf`, `asterisk/config/modules.conf`, `asterisk/config/logger.conf`, `asterisk/config/musiconhold.conf`
- Expected behavior: Valide Asterisk-Konfiguration mit WebRTC-Endpunkt, Dialplan, RTP-Range 16384-16484, HTTP/WS auf 8089
- Verification: Asterisk-Config-Syntax-Check (nach Container-Build)
- Dependencies: none

### MT-2: Dockerfile + entrypoint.sh
- Goal: Docker-Image das Asterisk 20 LTS mit allen benoetigten Modulen startet
- Files: `asterisk/Dockerfile`, `asterisk/entrypoint.sh`
- Expected behavior: Container baut sauber, startet Asterisk mit gerenderten Config-Dateien (ENV → Config)
- Verification: `docker build` erfolgreich, `docker run` startet Asterisk ohne Fehler
- Dependencies: MT-1

### MT-3: docker-compose.yml erweitern
- Goal: asterisk Service, Volume, Traefik-Labels, App-Container-Volume-Mount hinzufuegen
- Files: `docker-compose.yml`
- Expected behavior: asterisk Service startet im Stack, Recordings-Volume geteilt mit App
- Verification: `docker compose up asterisk` startet ohne Fehler
- Dependencies: MT-2

### MT-4: DNS + Hetzner-Firewall + Coolify-Domain
- Goal: sip.strategaizetransition.com erreichbar, RTP-Ports offen
- Files: keine Repo-Aenderung (Infrastruktur-Konfiguration)
- Expected behavior: WSS-Verbindung zu sip.strategaizetransition.com moeglich, RTP-Traffic durchgelassen
- Verification: `curl -I https://sip.strategaizetransition.com` antwortet (101 Switching Protocols oder aehnlich), Firewall-Regel sichtbar in Hetzner Console
- Dependencies: MT-3

### MT-5: Deploy + Smoke-Test
- Goal: Asterisk laeuft auf Hetzner, Echo-Test funktioniert
- Files: keine Repo-Aenderung
- Expected behavior: `docker exec asterisk asterisk -rx "pjsip show endpoints"` zeigt webrtc-user. Browser-WebSocket-Test gegen sip.strategaizetransition.com erfolgreich.
- Verification: Endpoint-Liste korrekt, WSS-Handshake erfolgreich, Echo-Test (Extension 600) mit Test-WebRTC-Client
- Dependencies: MT-4
