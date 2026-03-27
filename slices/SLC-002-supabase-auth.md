# SLC-002 — Supabase Stack + Schema + Auth

## Meta
- Feature: FEAT-001
- Priority: Blocker
- Status: planned
- Dependencies: SLC-001

## Goal
Docker Compose Stack mit Supabase aufsetzen (local dev), SQL-Schema für alle 9 V1-Tabellen erstellen, RLS Policies einrichten, Auth-Flow implementieren (Login, Middleware, Logout).

## Scope
- docker-compose.yml für lokale Entwicklung (Supabase Stack)
- SQL-Schema: profiles, companies, contacts, pipelines, pipeline_stages, deals, activities, documents, content_calendar
- RLS Policies (V1: authenticated full access)
- Kong Config (aus Blueprint-Pattern kopieren + anpassen)
- Auth-Flow: Login Server Action, Middleware (Session Check + Redirect), Logout
- Seed-Daten: 2 Pipelines (Endkunden + Multiplikatoren), Default-Stages

## Out of Scope
- Production Deployment (SLC-011)
- CRUD UI (SLC-003+)

### Micro-Tasks

#### MT-1: Docker Compose für Supabase (lokal)
- Goal: Lokaler Supabase-Stack lauffähig (DB, Auth, REST, Storage, Kong)
- Files: `docker-compose.yml`, `config/kong.yml`, `.env.local`
- Expected behavior: `docker compose up` startet alle Services, Kong erreichbar auf localhost:8000
- Verification: `curl http://localhost:8000/rest/v1/` antwortet
- Dependencies: keine

#### MT-2: SQL Schema (alle 9 Tabellen)
- Goal: Alle V1-Tabellen in PostgreSQL erstellen
- Files: `sql/01_schema.sql`
- Expected behavior: Tabellen existieren in Supabase DB
- Verification: Via Supabase Studio oder psql: alle 9 Tabellen sichtbar
- Dependencies: MT-1

#### MT-3: RLS Policies
- Goal: Row Level Security auf allen Tabellen aktivieren
- Files: `sql/02_rls.sql`
- Expected behavior: RLS aktiv, authenticated User hat vollen Zugriff
- Verification: Query über PostgREST mit anon key → leer. Mit auth token → Daten sichtbar.
- Dependencies: MT-2

#### MT-4: Auth-Flow (Login + Middleware + Logout)
- Goal: Funktionierender Login mit E-Mail/Passwort, Session-Check, Protected Routes
- Files: `cockpit/app/(auth)/login/actions.ts`, `cockpit/middleware.ts`, `cockpit/lib/supabase/middleware.ts`, `cockpit/app/(app)/layout.tsx` (Update)
- Expected behavior: Unauthenticated → Redirect zu /login. Login → Redirect zu /dashboard. Logout → zurück zu /login.
- Verification: Manueller Test: Login/Logout-Flow funktioniert
- Dependencies: MT-1, SLC-001/MT-3

#### MT-5: Seed-Daten (Pipelines + Stages + Test-User)
- Goal: Default-Daten einspielen für Entwicklung
- Files: `sql/03_seed.sql`
- Expected behavior: 2 Pipelines mit je 5-6 Stages existieren. Test-User ist eingeloggt.
- Verification: Via Studio: Pipelines und Stages sichtbar
- Dependencies: MT-2
