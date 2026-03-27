# SLC-011 — Hetzner Deployment

## Meta
- Feature: FEAT-001..005
- Priority: High
- Status: planned
- Dependencies: SLC-001 bis SLC-007 (Cockpit muss funktional sein)

## Goal
Business System auf dedizierten Hetzner-Server deployen. Coolify einrichten, Docker Compose Stack deployen, Domain konfigurieren, SSL, Seed-Daten.

## Scope
- Hetzner CX31 Server bestellen und einrichten
- Coolify installieren
- Docker Compose Stack deployen (Next.js + Supabase)
- Domain `business.strategaizetransition.com` → Server IP
- SSL via Let's Encrypt (Coolify/Traefik)
- Supabase Studio über Coolify mit Basic Auth exponieren
- Production .env konfigurieren (Dual-URL-Strategie)
- Seed-Daten einspielen (Pipelines, Stages, Admin-User)
- Smoke Test: Login, Dashboard, Kontakte, Pipeline

## Out of Scope
- pg_dump Backup-Cronjob (V2+)
- Monitoring/Alerting (V2+)

### Micro-Tasks

#### MT-1: Hetzner Server + Coolify
- Goal: Server aufsetzen, Coolify installieren
- Files: — (Server-Konfiguration, nicht im Repo)
- Expected behavior: Coolify-Dashboard erreichbar, Docker läuft
- Verification: Coolify-UI erreichbar über Server-IP
- Dependencies: keine

#### MT-2: Docker Compose deployen
- Goal: Business System Stack über Coolify deployen
- Files: `docker-compose.yml` (ggf. Anpassungen für Coolify), `.env.deploy`
- Expected behavior: Alle Services laufen (app, supabase-db, supabase-auth, supabase-rest, supabase-storage, supabase-kong)
- Verification: `docker ps` zeigt alle Container running
- Dependencies: MT-1

#### MT-3: Domain + SSL
- Goal: DNS konfigurieren, SSL-Zertifikat einrichten
- Files: — (DNS bei Domain-Provider, Coolify-Config)
- Expected behavior: `https://business.strategaizetransition.com` erreichbar, gültiges SSL
- Verification: Browser zeigt grünes Schloss
- Dependencies: MT-2

#### MT-4: Production Config + Seed
- Goal: Production env vars setzen, Seed-Daten einspielen, Admin-User anlegen
- Files: `.env.deploy` (Template), `sql/03_seed.sql`
- Expected behavior: Admin-User kann sich einloggen, 2 Pipelines mit Stages vorhanden
- Verification: Login → Dashboard → Pipelines sichtbar
- Dependencies: MT-2, MT-3

#### MT-5: Smoke Test
- Goal: Alle V1-Features auf Production durchklicken
- Files: — (manueller Test)
- Expected behavior: Login, Dashboard, Kontakte CRUD, Firmen CRUD, Pipeline Kanban, Kalender, Dokument-Upload — alles funktioniert
- Verification: Checkliste aller FEAT-Acceptance-Criteria
- Dependencies: MT-4
