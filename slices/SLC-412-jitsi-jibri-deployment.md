# SLC-412 — Jitsi + Jibri Deployment + Firewall

## Slice Info
- Feature: FEAT-404 (Infrastruktur)
- Priority: Blocker
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-205, BL-343, BL-201 (Umbrella)

## Goal
Self-hosted Jitsi-Stack (Web, Prosody, Jicofo, JVB, Jibri) additiv in den bestehenden Coolify-Business-System-Server (CPX32) einbinden (DEC-040). Subdomain `meet.strategaizetransition.com` ueber Coolify provisionieren, Hetzner-Firewall fuer Port 10000/udp oeffnen, JWT-Auth fuer Tenant `business` aktivieren, Shared Volume `jitsi-recordings` anlegen. Ergebnis: lauffaehiges Meeting-Setup ohne App-Integration (die kommt in SLC-414).

## Scope
- `docker-compose.yml` Erweiterung mit 5 neuen Services (jitsi-web, jitsi-prosody, jitsi-jicofo, jitsi-jvb, jitsi-jibri), pinned auf `stable-9258` (DEC-040)
- Shared Volumes: `jitsi-web-config`, `jitsi-prosody-config`, `jitsi-prosody-plugins`, `jitsi-recordings`
- Env-Vars in `env vars_business.txt` + Coolify: `JITSI_DOMAIN`, `JITSI_JWT_APP_ID`, `JITSI_JWT_APP_SECRET`, `JITSI_XMPP_DOMAIN`
- Coolify Subdomain `meet.strategaizetransition.com` auf jitsi-web (Traefik-Labels)
- Hetzner Cloud Firewall: Regel fuer Port 10000/udp eingehend (dokumentiert in `docs/RELEASES.md`)
- Jibri-Container-Konfig: `shm_size: 2gb`, `cap_add: [SYS_ADMIN]`
- JWT-App-Secret generiert + in Secret Manager (Coolify)
- Smoke-Test: Meeting starten via `meet.strategaizetransition.com/test-room?jwt=<manual-JWT>`, 2 Teilnehmer-Browser, Recording manuell ausloesen, MP4 in `/recordings/` pruefen

## Out of Scope
- App-seitige Meeting-Start-Logik (SLC-414)
- Upload-Cron nach Supabase Storage (SLC-415)
- TURN-Server (Public STUN reicht in V4.1, DEC-040)
- Blueprint-Tenant-Aktivierung (kommt bei Blueprint V4)

## Micro-Tasks

### MT-1: Pre-Flight-Checks
- Goal: Firewall, Subdomain und Server-Ressourcen vorbereiten
- Files: `docs/RELEASES.md` (Eintrag `PRE-V4.1-INFRA`), Hetzner-Firewall (UI)
- Expected behavior: Port 10000/udp eingehend offen; `meet.strategaizetransition.com` als zusaetzliche Domain in Coolify angelegt; freier RAM ~5.5 GB verifiziert
- Verification: `ufw status` auf Hetzner, `dig meet.strategaizetransition.com`, `free -h` zeigt genug Luft
- Dependencies: none

### MT-2: JWT-Secret generieren
- Goal: 32-byte-Secret fuer Jitsi-JWT-App
- Files: Coolify Env Panel (geheim), `env vars_business.txt` (als Platzhalter)
- Expected behavior: `JITSI_JWT_APP_SECRET` persistiert, nicht im Repo
- Verification: `coolify env show jitsi_jwt_app_secret` liefert 64-hex, Repo-Grep findet keinen Klartext
- Dependencies: none

### MT-3: docker-compose.yml erweitern
- Goal: 5 Jitsi-Services additiv einfuegen, shared Network `coolify`, shared Volume `jitsi-recordings`
- Files: `docker-compose.yml`
- Expected behavior: `docker compose config` valide, keine Port-Konflikte
- Verification: `docker compose config` liefert Output ohne Error; Diff mit V4-Version gezielt
- Dependencies: MT-2

### MT-4: Coolify-Deploy + Service-Start
- Goal: Neue Services deployen, alle 5 Container laufen gruen
- Files: — (Coolify UI Deploy)
- Expected behavior: `docker ps | grep jitsi` zeigt 5 Container `Up`, keine Restart-Loops
- Verification: Coolify Service-Logs frei von Errors; Prosody-Log: "Server authenticated"
- Dependencies: MT-3

### MT-5: Smoke-Test Meeting
- Goal: Manueller JWT-Token erzeugen (via Node-Snippet), Raum-URL aufrufen, 2 Browser-Fenster, Recording manuell triggern
- Files: `scripts/gen-test-jwt.ts` (einmal-Helfer, spaeter evtl. loeschen)
- Expected behavior: Meeting laeuft, Video+Audio, "Start Recording" im Jitsi-UI erzeugt MP4 in `/recordings/`
- Verification: `docker exec jitsi-jibri ls /recordings/` zeigt MP4; `ffprobe` liefert Duration >0s
- Dependencies: MT-4

### MT-6: Dokumentation + Release-Eintrag
- Goal: Infra-Slice in RELEASES.md + MIGRATIONS-Hinweis (keine DB-Migration hier) + KNOWN_ISSUES falls auftretend
- Files: `docs/RELEASES.md` (Entry REL-010-pre oder V4.1-Preview), `docs/ARCHITECTURE.md` (Kommentar "deployed")
- Expected behavior: Stand dokumentiert, auch Upgrade-Trigger (CPX42) explizit notiert
- Verification: Review beim `/final-check`
- Dependencies: MT-5

## Acceptance Criteria
1. `meet.strategaizetransition.com` zeigt Jitsi-Startseite (nach JWT-Gate) mit gueltigem TLS
2. Port 10000/udp offen auf Hetzner-Cloud-Firewall (Dokumentation + UI-Screenshot)
3. Alle 5 Jitsi-Container laufen stabil (>30 Min) ohne Restart
4. JWT-geschuetzter Raum erreichbar; ohne Token HTTP 401
5. Jibri-Recording erzeugt MP4 im Shared Volume, `ffprobe` liefert valide Duration
6. Keine Ressourcen-Ueberschreitung auf CPX32 (idle <3.5 GB, 1 aktives Meeting <6.5 GB)
7. Kein Port-Konflikt mit bestehenden Services (Kong, Supabase, Cal.com, IMAP-Sync)

## Dependencies
- MIG-011 nicht noetig (reine Infra)
- Firewall-Zugang + Coolify-Admin-Rechte

## QA Focus
- **Container-Stabilitaet:** Restart-Loops, Log-Errors, Prosody-Auth
- **Ressourcen-Verbrauch:** `docker stats` waehrend Meeting, ob CPX32-Schwelle gehalten wird
- **Auth:** Unauthenticated JWT-frei wird abgelehnt
- **Recording:** MP4-Qualitaet akzeptabel (Audio + Video), Dateigroesse plausibel (~20MB pro 5min)
- **Persistenz:** Container-Restart verliert keine Config (Volumes)
- **Rollback:** Dokumentiert, wie man Services anhaelt ohne V4-Code zu brechen

## Geschaetzter Aufwand
1.5-2 Tage (schwerster Infra-Slice, low-code)
