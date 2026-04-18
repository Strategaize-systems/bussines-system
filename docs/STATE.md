# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: go-live
- Current Focus: V4.2 Wissensbasis Cross-Source — Go-Live GO (RPT-143), bereit fuer /deploy
- Current Phase: V4.2 Deploy

## Immediate Next Steps
1. /deploy V4.2 (Commit+Push, SQL Migrations, Redeploy auf Hetzner)
2. Coolify Cron embedding-sync anlegen (*/5, Container "app")
3. Backfill einmalig ausloesen
4. Browser-Smoke-Test Wissen-Tab nach Redeploy
5. Vor Server-Reboot: `apt install linux-modules-extra-$(uname -r)` fuer kommenden Kernel 6.8.0-107 (ISSUE-037)

## Active Scope
**V4.1 — Meeting Intelligence Basis (released, REL-010):**
- FEAT-404 Call Intelligence — deployed
- FEAT-409 Meeting-Erinnerungen — deployed
- FEAT-411 DSGVO-Einwilligungsflow — deployed

**V4.2 — Wissensbasis Cross-Source (active, Architecture done):**
- FEAT-401 Cross-Source-Wissensbasis mit RAG-Pipeline (pgvector + Bedrock Titan Embeddings V2)
- 4 Datenquellen: Meeting-Transkripte, E-Mails, Deal-Daten, Dokumente
- Query per natuerlicher Sprache (Text + Voice) aus Deal-Workspace
- DEC-046 RAG, DEC-047 Embedding-Adapter, DEC-048 Dimensionen+Chunking
- MIG-014: pgvector Extension + knowledge_chunks Tabelle
- 6 Slices ausdefiniert: SLC-421 (pgvector+Schema+Adapter), SLC-422 (Chunker+Indexer), SLC-423 (Backfill+Cron), SLC-424 (RAG Query API), SLC-425 (Query UI), SLC-426 (Auto-Trigger)
- Backlog: BL-350 (Umbrella) + BL-352..357 (Detail-Items)
- Geschaetzte Gesamt-Implementierung: 7-9.5 Tage

**V4.3 — Insight Governance (planned):** FEAT-402 Queue (nach V4.2 stabil).

## Blockers
- aktuell keine (ISSUE-031 + ISSUE-032 durch Slice-Record-Updates 2026-04-15 resolved)

## Last Stable Version
- V4.1 — 2026-04-18 — deployed auf Hetzner (Meeting Intelligence Basis, 9/9 Slices, REL-010)

## Notes
V4 Deployment in zwei Phasen: SLC-401..403 am 2026-04-12 (IMAP live), SLC-404..409 am 2026-04-14 abends (Redeploy). Smoke-Tests am 2026-04-15 morgen durchgelaufen: Login, IMAP-Inbox, Mein Tag KI-Wiedervorlagen, Gesamtkalender, KI-Analyse Cockpit, Focus 2-Spalten-Layout — alle PASS. Cal.com Self-Hosted läuft seit 2026-04-13 mit Webhook-Integration. CALCOM_API_KEY bewusst leer (AGPLv3). Bedrock Claude Sonnet 4 via Frankfurt-Region.

V4.1 Requirements am 2026-04-15 erstellt: PRD erweitert, 5 neue DECs (DEC-035..039), 3 Feature-Specs (FEAT-404, FEAT-409, FEAT-411), roadmap.json mit V4.2 + V4.3 ergaenzt, backlog.json um BL-342..351 erweitert. Prinzip "wenn wir es machen, machen wir es richtig" — deshalb V4.x-Split statt einer grossen Version.

V4.1 Architecture am 2026-04-15 erstellt: ARCHITECTURE.md um ~420 Zeilen V4.1-Block erweitert (Jitsi-Stack, Recording-Pipeline, Whisper-Adapter-Layer, DSGVO-Consent-Flow, Reminder-Pipeline, Docker-Compose-Aenderungen, Env-Vars, Sizing, Risk-Matrix). 6 neue DECs (DEC-040 Jitsi-CPX32-Sizing, DEC-041 Library-Adapter, DEC-042 /consent-URL, DEC-043 ENV-Retention, DEC-044 Ad-hoc-Kontakte, DEC-045 MP4-Format). MIG-011 Schema-Migration geplant (user_settings-Tabelle neu, contacts+6, meetings+11, activities.ai_generated). 9 Slices empfohlen fuer Implementierung.

V4.1 Slice-Planning am 2026-04-15 abgeschlossen: 9 Slice-Dateien erstellt (SLC-411 Consent-Schema + Public-Page, SLC-412 Jitsi+Jibri Deployment, SLC-413 Whisper-Adapter-Layer, SLC-414 Meeting-Start + JWT + Consent-Check, SLC-415 Recording-Upload + Retention, SLC-416 Transkript + Summary-Pipeline, SLC-417 user_settings + Reminder-Cron + .ics, SLC-418 Browser-Push + Service Worker, SLC-419 KI-Agenda). Jeder Slice mit Micro-Tasks (MT-1..N), Acceptance Criteria, Dependencies, QA-Fokus und Aufwandsschaetzung. Gesamt-Aufwandsschaetzung V4.1: ~13-15 Entwicklungstage. SLC-411 = Blocker-Schema (MIG-011 vollstaendig), SLC-412 = schwerster Infra-Slice mit Firewall/Subdomain-Vorarbeit. Pre-Slice-Checks (Hetzner-Firewall 10000/udp, Coolify-Subdomain, VAPID-Keys, Supabase-Bucket) sind vor SLC-412-Start zu erledigen. MIG-011 wurde vollstaendig in SLC-411 konsolidiert (alle additiven Schema-Aenderungen in einer Migration, analog zu V4/SLC-401 Precedent).

SLC-411 am 2026-04-16 implementiert: MIG-011 via sql/13_v41_migration.sql auf Hetzner angewendet (ALTER auf contacts/meetings/activities, user_settings neu, audit_log.actor_id nullable). Alle 8 Micro-Tasks erledigt: Rate-Limit + IP-Hash-Helper, Middleware-Whitelist fuer /consent, Consent Server Actions (create/grant/decline/revoke manual+public, setOptOutCommunication), 3 Public-Consent-Pages (grant/decline/revoke/confirmed) mit Client-Forms, DE-Consent-Mail-Template + SMTP-Versand, Kontakt-Workspace UI (ConsentBadge + ConsentActions + OptOutToggle), Pending-Renewal-Cron (taeglich, nur Zaehler). `npm run build` gruen. Noch offen: /qa, Browser-Smoke-Test mit echtem Token + SMTP-Versand.
