# Architecture

## Summary

Das Business System ist eine Next.js-Anwendung mit Supabase-Backend, deployed als Docker Compose Stack auf einem dedizierten Hetzner-Server via Coolify. Die Architektur folgt dem bewährten Blueprint-Platform-Pattern (Self-Hosted Supabase, Server-Side Auth, Dual-URL-Strategie, RLS).

NextCRM wird nicht geforkt, sondern als Referenz-Katalog für UI-Patterns genutzt (DEC-010). Das Projekt wird frisch aufgesetzt — nur V1-relevante Tabellen und Komponenten.

Claude Code Skills (Max Subscription) erledigen die operative Arbeit. Das Cockpit ist die Sichtbarkeits- und Steuerungsschicht. Skills laufen außerhalb der Web-App in Claude Code direkt (V1).

## Main Components

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│  https://business.strategaizetransition.com          │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS
┌───────────────────────┴─────────────────────────────┐
│                   Coolify / Traefik                   │
│              (Reverse Proxy, SSL/TLS)                │
│                                                       │
│  /           → app:3000        (Next.js Cockpit)     │
│  /supabase/  → supabase-kong:8000  (Supabase API)   │
└───────┬──────────────────────┬──────────────────────┘
        │                      │
┌───────┴──────────┐  ┌───────┴──────────────────────┐
│   Next.js App    │  │     Supabase Stack           │
│   (Cockpit)      │  │                               │
│                  │  │  Kong (API Gateway) :8000     │
│  Pages:          │  │    ├── /auth/v1 → GoTrue     │
│  - Dashboard     │  │    ├── /rest/v1 → PostgREST  │
│  - Kontakte      │  │    ├── /storage/v1 → Storage │
│  - Pipeline EK   │  │    └── /realtime → Realtime  │
│  - Pipeline MP   │  │                               │
│  - Kalender      │  │  GoTrue (Auth) :9999          │
│  - Kontakt-Detail│  │  PostgREST (API) :3001        │
│                  │  │  Storage API :5000             │
│  Server Actions  │  │  PostgreSQL :5432              │
│  (Supabase       │  │  Studio :3000 (SSH only)      │
│   Client)        │  │                               │
└──────────────────┘  └───────────────────────────────┘
        │                      │
        │    Docker Network: business-net (internal)
        │                      │
┌───────┴──────────────────────┴──────────────────────┐
│                Shared PostgreSQL                      │
│           (Teil des Supabase Stacks)                 │
└─────────────────────────────────────────────────────┘

Außerhalb des Stacks (V1):
┌─────────────────────────────────────────────────────┐
│              Claude Code Skills (lokal)               │
│                                                       │
│  Laufen auf dem Rechner des Eigentümers              │
│  Lesen/Schreiben: Dateien im Repository              │
│  Lesen: Supabase-Daten (optional, via API)           │
│  Keine direkte Verbindung zum Docker Stack           │
└─────────────────────────────────────────────────────┘
```

## Responsibilities per Component

| Component | Verantwortung |
|---|---|
| **Next.js Cockpit** | UI, Server Actions, Server-Side Auth, Routing, SSR |
| **Supabase Kong** | API Gateway, Key-Auth, Request-Routing an GoTrue/PostgREST/Storage |
| **GoTrue (Auth)** | Login, Session, JWT, Invite-Flow, Passwort-Reset |
| **PostgREST** | Auto-generierte REST API auf PostgreSQL mit RLS |
| **Supabase Storage** | Datei-Upload/-Download pro Kontakt (Dokumente, Vorlagen) |
| **PostgreSQL** | Alle Daten, RLS Policies, Functions |
| **Coolify/Traefik** | Reverse Proxy, SSL-Terminierung, Domain-Routing |
| **Claude Code Skills** | Content-Erstellung, Proposals, Analyse — laufen lokal, nicht im Stack |

## Data Model (V1)

### Tabellen

```sql
-- ============================================================
-- AUTH (von Supabase bereitgestellt)
-- ============================================================
-- auth.users              — Supabase-managed, nicht manuell anlegen

-- ============================================================
-- PROFILES (Bridge: auth.users → App-Daten)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'owner',        -- owner | member | viewer (V2+)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CRM KERN
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  address_country TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',         -- PostgreSQL Array, einfacher als Junction Table
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  linkedin_url TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PIPELINE
-- ============================================================
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,               -- 'Endkunden' | 'Multiplikatoren'
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- z.B. 'Neu', 'Kontaktiert', 'Qualifiziert', 'Proposal', 'Gewonnen', 'Verloren'
  color TEXT,                       -- Hex-Color für Kanban
  sort_order INT DEFAULT 0,
  probability INT DEFAULT 0,        -- 0-100, für späteres Reporting
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value DECIMAL(12,2),              -- Dealwert in EUR
  expected_close_date DATE,
  next_action TEXT,                 -- Freitext: was ist der nächste Schritt
  next_action_date DATE,
  status TEXT DEFAULT 'active',     -- active | won | lost
  lost_reason TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AKTIVITÄTEN (Unified Activity Log)
-- ============================================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  type TEXT NOT NULL,               -- 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'task'
  title TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOKUMENTE
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,          -- Supabase Storage Pfad
  file_type TEXT,                   -- MIME type
  file_size BIGINT,
  category TEXT,                    -- 'proposal' | 'contract' | 'presentation' | 'other'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONTENT KALENDER
-- ============================================================
CREATE TABLE content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL,       -- 'blog' | 'linkedin' | 'ad' | 'email' | 'presentation' | 'other'
  channel TEXT,                     -- 'linkedin' | 'website' | 'newsletter' | 'other'
  status TEXT DEFAULT 'planned',    -- planned | in_progress | review | published
  planned_date DATE,
  published_date DATE,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabellen-Übersicht

| Tabelle | Zweck | Zeilen V1 |
|---|---|---|
| `profiles` | User-Profil (Bridge zu auth.users) | 1 (Single User) |
| `companies` | Firmen | 10-100 |
| `contacts` | Kontaktpersonen | 50-500 |
| `pipelines` | Pipeline-Definitionen | 2 (Endkunden + Multiplikatoren) |
| `pipeline_stages` | Kanban-Spalten | 10-12 (5-6 pro Pipeline) |
| `deals` | Deals in der Pipeline | 20-200 |
| `activities` | Aktivitäten-Log | 100-2000 |
| `documents` | Datei-Verknüpfungen | 50-500 |
| `content_calendar` | Redaktionsplan | 20-100 |

**Gesamt: 9 eigene Tabellen + auth.users (Supabase-managed)**

### RLS Policies (V1 — Single User, vorbereitet für Multi-User)

```sql
-- V1: Einfache Policy — eingeloggter User sieht alles
-- V2+: Erweitern um tenant_id oder team-basierte Isolation

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- V1: Authenticated user has full access
CREATE POLICY "authenticated_full_access" ON companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- (gleiche Policy für alle Tabellen)

-- V2+: Ersetzen durch team/tenant-basierte Policies
-- CREATE POLICY "team_access" ON companies
--   FOR ALL TO authenticated
--   USING (created_by IN (SELECT id FROM team_members WHERE team_id = auth.user_team_id()));
```

## Auth Architecture

Folgt 1:1 dem bewährten Blueprint-Platform-Pattern:

| Aspekt | Entscheidung |
|---|---|
| **Auth Provider** | Supabase Auth (GoTrue), self-hosted |
| **Auth Mode** | Server-Side (SSR) — kein Client-Side Token-Handling |
| **Session** | Cookie-basiert via `@supabase/ssr` |
| **Middleware** | Next.js Middleware prüft Session auf jedem Request |
| **Login** | E-Mail + Passwort (V1), OAuth optional V2+ |
| **Signup** | Deaktiviert (`GOTRUE_DISABLE_SIGNUP=true`) — nur Invite |
| **Client-Init** | Browser: `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, ANON_KEY)` |
| **Server-Init** | Server: `createServerClient(SUPABASE_URL, ANON_KEY, { cookies })` |
| **Admin-Init** | Admin: `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` |

## URL Strategy (Dual-URL)

| Kontext | URL | Warum |
|---|---|---|
| **Server-Side** (Server Actions, API Routes) | `http://supabase-kong:8000` | Internes Docker-Netzwerk, kein Hairpin-NAT |
| **Client-Side** (Browser) | `https://business.strategaizetransition.com/supabase` | Reverse Proxy zu Kong |
| **App** | `https://business.strategaizetransition.com` | Next.js Cockpit |
| **Studio** | `http://localhost:3000` via SSH Tunnel | Nicht öffentlich exponiert |

### Env Vars

```env
# App
NEXT_PUBLIC_APP_URL=https://business.strategaizetransition.com

# Supabase — Dual URL
SUPABASE_URL=http://supabase-kong:8000                                    # Server-side (intern)
NEXT_PUBLIC_SUPABASE_URL=https://business.strategaizetransition.com/supabase  # Client-side (extern)

# Auth
NEXT_PUBLIC_SUPABASE_ANON_KEY=<generated_jwt>
SUPABASE_SERVICE_ROLE_KEY=<generated_jwt>
JWT_SECRET=<min_32_chars>

# GoTrue
GOTRUE_SITE_URL=${NEXT_PUBLIC_APP_URL}
GOTRUE_DISABLE_SIGNUP=true

# Database
POSTGRES_PASSWORD=<strong_password>

# Storage
STORAGE_FILE_SIZE_LIMIT=209715200   # 200MB
```

## Docker Compose Stack (V1)

```yaml
services:
  # --- Next.js Cockpit ---
  app:
    build: ./cockpit
    ports: ["3000:3000"]
    depends_on: [supabase-kong]
    environment:
      - SUPABASE_URL=http://supabase-kong:8000
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      # ... weitere env vars
    networks: [business-net]

  # --- Supabase Stack ---
  supabase-db:
    image: supabase/postgres:15.6.1.145
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./sql:/docker-entrypoint-initdb.d
    networks: [business-net]

  supabase-auth:
    image: supabase/gotrue:v2.160.0
    depends_on: [supabase-db]
    networks: [business-net]

  supabase-rest:
    image: postgrest/postgrest:v12.2.3
    depends_on: [supabase-db]
    networks: [business-net]

  supabase-storage:
    image: supabase/storage-api:v1.11.13
    depends_on: [supabase-db]
    volumes:
      - storage-data:/var/lib/storage
    networks: [business-net]

  supabase-kong:
    image: kong:2.8.1
    volumes:
      - ./config/kong.yml:/var/lib/kong/kong.yml
    networks: [business-net]

  # --- V3: Firecrawl (vorbereitet) ---
  # firecrawl:
  #   image: mendableai/firecrawl:latest
  #   depends_on: [firecrawl-redis]
  #   networks: [business-net]
  # firecrawl-redis:
  #   image: redis:7-alpine
  #   networks: [business-net]

networks:
  business-net:
    driver: bridge

volumes:
  db-data:
  storage-data:
```

## Cockpit Page Structure (V1)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── auth/callback/route.ts
├── (app)/                          # Authenticated area
│   ├── layout.tsx                  # Sidebar + Top Navigation
│   ├── dashboard/page.tsx          # FEAT-003: Übersicht
│   ├── contacts/
│   │   ├── page.tsx                # Kontakt-Liste (Tabelle)
│   │   └── [id]/page.tsx           # Kontakt-Detail
│   ├── companies/
│   │   ├── page.tsx                # Firmen-Liste
│   │   └── [id]/page.tsx           # Firmen-Detail
│   ├── pipeline/
│   │   ├── endkunden/page.tsx      # Kanban: Endkunden
│   │   └── multiplikatoren/page.tsx # Kanban: Multiplikatoren
│   ├── calendar/page.tsx           # Redaktionskalender
│   └── settings/page.tsx           # Pipeline-Stages konfigurieren
├── api/
│   └── (minimal — Server Actions bevorzugt)
└── layout.tsx                      # Root Layout
```

## Technology Stack (V1)

| Layer | Technologie | Version |
|---|---|---|
| Framework | Next.js | 16.x (App Router) |
| React | React | 19.x |
| Language | TypeScript | 5.x |
| UI | shadcn/ui + Radix UI | Latest |
| CSS | Tailwind CSS | v4 |
| Forms | React Hook Form + Zod | Latest |
| Tables | TanStack React Table | Latest |
| Kanban | dnd-kit | Latest |
| Auth | @supabase/ssr + @supabase/supabase-js | Latest |
| Database | PostgreSQL 15.x (via Supabase) | Self-hosted |
| Storage | Supabase Storage | Self-hosted |
| Hosting | Hetzner + Coolify | Dedizierter Server |
| Skills | Claude Code (Max Subscription) | Lokal |

## External Dependencies (V1)

| Service | Zweck | Integration |
|---|---|---|
| **Supabase** (self-hosted) | DB, Auth, Storage, RLS | Docker Compose |
| **Coolify** | Deployment, Reverse Proxy | Hetzner Server |
| **Claude Code** | Marketing Skills, Content | Lokal, kein API-Call |

### Vorgesehen für spätere Versionen

| Service | Version | Zweck |
|---|---|---|
| **Postiz** (self-hosted) | V2 | Social Media Publishing |
| **Listmonk** (self-hosted) | V2/V3 | E-Mail-Marketing |
| **n8n** (self-hosted) | V3 | Workflow-Orchestrierung |
| **Firecrawl** (self-hosted, AGPL) | V3 | Lead-Enrichment / Web-Scraping |
| **LinkedIn MCP Server** | V2 | LinkedIn API Zugriff |

## Security / Privacy

| Aspekt | Maßnahme |
|---|---|
| **Auth** | Supabase Auth, Server-Side, Cookie-basiert, Signup deaktiviert |
| **RLS** | Auf allen Tabellen aktiv, V1 einfach (authenticated=full access), V2 team-basiert |
| **DSGVO** | Kontaktdaten in eigener DB auf eigenem Server, kein Cloud-Transfer |
| **Secrets** | Env vars, nie in Repo. `.env.example` Dateien als Vorlage |
| **Studio** | Nur via SSH Tunnel, nicht öffentlich |
| **Storage** | Supabase Storage mit Auth-Check, keine öffentlichen Buckets |
| **HTTPS** | Coolify/Traefik mit Let's Encrypt |

## Constraints and Tradeoffs

| Entscheidung | Tradeoff |
|---|---|
| Frisch bauen statt NextCRM forken | Mehr initialer Code, aber sauberer und kein Ballast |
| Supabase statt Prisma | Auth+Storage+RLS inklusive, aber ORM-Komfort von Prisma fehlt (Supabase Client ist simpler) |
| Single User V1 mit RLS vorbereitet | Einfache Policies jetzt, Umbau nötig wenn Multi-User kommt |
| Skills laufen lokal (Claude Code) | Keine Server-Infrastruktur für Skills, aber kein automatischer Cockpit→Skill Trigger (V2/V3) |
| Tags als PostgreSQL Array | Einfacher als Junction Table, aber kein Tag-Management-UI (reicht für V1) |
| Kein Realtime V1 | Cockpit refresht manuell, kein Live-Update wenn Skills Daten ändern |

## Resolved Technical Questions

1. **Domain:** `business.strategaizetransition.com` — bestätigt
2. **Hetzner Server:** CX31 (4 vCPU, 8 GB) zum Start. Bei V3 (Firecrawl, n8n, Postiz) hochskalieren — IP-Austausch in Coolify + DNS ist trivial.
3. **Supabase Studio:** Über Coolify mit Basic Auth exponieren (wie Blueprint-Pattern).
4. **Backup V1:** Hetzner Snapshots. Ab V2+: ergänzend pg_dump Cronjob → Hetzner Storage Box.

## Recommended Implementation Direction

1. **Hetzner-Server aufsetzen** mit Coolify
2. **Docker Compose** mit Supabase Stack deployen (bewährtes Blueprint-Pattern kopieren)
3. **SQL Schema** erstellen (9 Tabellen + RLS)
4. **Next.js Cockpit** frisch aufsetzen (App Router, shadcn/ui, Tailwind v4, Supabase Client)
5. **Auth** einrichten (Login, Middleware, Server/Browser Client)
6. **CRM-Kern** bauen: Kontakte, Firmen, Deals (CRUD + Tabellen)
7. **Pipeline-Kanban** bauen (dnd-kit + Pipeline-Stages)
8. **Dashboard** bauen (Pipeline-Summary, Aktivitäten, Kalender)
9. **Marketing-Skills** adaptieren (8 Skills ins Strategaize-Format)
10. **Brand System Skill** bauen

## Recommended Next Step

`/slice-planning` — Die 5 V1-Features in umsetzbare Slices zerlegen.
