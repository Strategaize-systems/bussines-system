# Architecture

## Summary

Das StrategAIze Business Development System ist ein internes Revenue- und Relationship-System, deployed als Docker Compose Stack (Next.js + Supabase + Kong) auf Hetzner via Coolify.

**V2-Strategie: Erweitern, nicht neu bauen.** Die bestehende Infrastruktur (Supabase, Docker, Auth, Kong, Next.js) bleibt. Das Schema wird erweitert (neue Felder + neue Tabellen). Content-Kalender und Marketing-Bezüge werden entfernt.

## Main Components

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│  https://business.strategaizetransition.com          │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS
┌───────────────────────┴─────────────────────────────┐
│                   Coolify / Caddy                     │
│              (Reverse Proxy, SSL/TLS)                │
│  /  → app:3000 (Next.js BD Cockpit)                 │
└───────┬──────────────────────┬──────────────────────┘
        │                      │
┌───────┴──────────┐  ┌───────┴──────────────────────┐
│   Next.js App    │  │     Supabase Stack           │
│   (BD Cockpit)   │  │  Kong :8000                  │
│                  │  │  GoTrue :9999                 │
│  Pages:          │  │  PostgREST :3000              │
│  - Dashboard     │  │  Storage :5000                │
│  - Kontakte      │  │  PostgreSQL :5432             │
│  - Firmen        │  │  Studio :3000 (SSH)           │
│  - Multiplik.    │  │                               │
│  - Pipeline EK   │  │                               │
│  - Pipeline MP   │  │                               │
│  - Aufgaben      │  │                               │
│  - E-Mail        │  │                               │
│  - Settings      │  │                               │
│                  │  │                               │
│  Server Actions  │  │                               │
│  + nodemailer    │  │                               │
└──────────────────┘  └───────────────────────────────┘
        │                      │
        │    Docker Network: business-net
        │                      │
┌───────┴──────────────────────┴──────────────────────┐
│                Shared PostgreSQL                      │
└─────────────────────────────────────────────────────┘

Extern (kein Docker):
  SMTP Server (Gmail/eigener) ← nodemailer
  Cal.com/Calendly ← nur Link
```

## Responsibilities

| Component | Verantwortung |
|---|---|
| **Next.js BD Cockpit** | UI, Server Actions, Auth, SMTP-Versand, SSR |
| **Supabase Stack** | API Gateway, Auth, REST API, Storage, DB |
| **SMTP (extern)** | E-Mail-Versand — kein Docker-Service |
| **Cal.com/Calendly** | Meeting-Buchung — nur Link |

## Data Model — V2

### Übersicht: 15 Tabellen (8 bestehend + 7 neu)

```
BESTEHEND (erweitert):          NEU:
├── profiles                    ├── emails
├── companies (+12 Felder)      ├── proposals
├── contacts (+15 Felder)       ├── fit_assessments
├── pipelines                   ├── tasks
├── pipeline_stages             ├── handoffs
├── deals (+4 Felder)           ├── referrals
├── activities (+8 Felder)      └── signals
├── documents
│
ENTFERNT:
└── content_calendar
```

### companies — +12 Eignungsfelder

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exit_relevance TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_readiness TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ownership_structure TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS decision_maker_access BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS budget_potential TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS complexity_fit BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS willingness BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS champion_potential BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS strategic_relevance TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS blueprint_fit TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS revenue_range TEXT;
```

### contacts — +15 Beziehungsfelder

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role_in_process TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'de';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_capability TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS access_to_targets TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS thematic_relevance TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trust_level TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_multiplier BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS multiplier_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS follow_up_rhythm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cooperation_feedback TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_interaction_date DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS meeting_link TEXT;
```

### deals — +4 Felder

```sql
ALTER TABLE deals ADD COLUMN IF NOT EXISTS opportunity_type TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS won_lost_reason TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS won_lost_details TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS referral_source_id UUID;
```

### activities — +8 Gesprächs-Felder

```sql
ALTER TABLE activities ADD COLUMN IF NOT EXISTS conversation_type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS participants TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS objections TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS opportunities TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS risks TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS next_steps TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS qualification_signals TEXT;
```

### Neue Tabellen

#### emails
```sql
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  direction TEXT DEFAULT 'outbound',
  from_address TEXT, to_address TEXT,
  subject TEXT, body TEXT,
  status TEXT DEFAULT 'draft',
  follow_up_status TEXT DEFAULT 'none',
  follow_up_date DATE,
  template_used TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);
```

#### proposals
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL, version INT DEFAULT 1,
  status TEXT DEFAULT 'draft',
  scope_notes TEXT, price_range TEXT,
  objections TEXT, negotiation_notes TEXT,
  won_lost_reason TEXT, won_lost_details TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### fit_assessments
```sql
CREATE TABLE fit_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, entity_id UUID NOT NULL,
  -- Firma: 8 Kriterien (1-5 Score)
  exit_relevance_score INT, ai_readiness_score INT,
  decision_maker_score INT, budget_score INT,
  complexity_score INT, willingness_score INT,
  champion_score INT, strategic_score INT,
  -- Multiplikator: 7 Kriterien
  target_access_score INT, trust_score INT,
  professionalism_score INT, referral_quality_score INT,
  cooperation_score INT, conflict_score INT, brand_fit_score INT,
  -- Ergebnis
  overall_score INT, traffic_light TEXT, verdict TEXT, reason TEXT,
  assessed_at TIMESTAMPTZ DEFAULT now(), assessed_by UUID
);
```

#### tasks
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT,
  due_date DATE, priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID, completed_at TIMESTAMPTZ,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);
```

#### handoffs
```sql
CREATE TABLE handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  entry_track TEXT, contacts_transferring TEXT,
  pre_information TEXT, conversation_insights TEXT,
  expectations TEXT, documents_included TEXT,
  status TEXT DEFAULT 'pending',
  handed_off_at TIMESTAMPTZ,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);
```

#### referrals
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referred_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referred_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  referral_date DATE, quality TEXT, outcome TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### signals
```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL, description TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);
```

## Pipeline Seed-Daten

**Multiplikatoren (10 Stufen):** Identifiziert → Recherchiert → Erstansprache geplant → Erstkontakt → Gespräch → Potenzial → Aktive Beziehungspflege → Erste Empfehlung → Strategischer Multiplikator → Inaktiv

**Unternehmer-Chancen (12 Stufen):** Signal → Einordnung → Qualifikation geplant → Erstgespräch → Fit wahrscheinlich → Vertiefung → Angebot vorbereitet → Angebot offen → Verhandlung → Gewonnen → Verloren → Geparkt

## E-Mail Architecture

```
Next.js Server Action → nodemailer → SMTP Server (Gmail)
                      → Supabase INSERT → emails Tabelle
```

Env Vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Navigation (V2)

```
├── Dashboard (BD-Metriken)
├── Kontakte
├── Firmen
├── Multiplikatoren
├── Pipeline: Multiplikatoren
├── Pipeline: Unternehmer
├── Aufgaben
├── E-Mail (V2.1)
├── Settings
```

## Migration Strategy

SQL-Migration-Script: ALTER TABLE → CREATE TABLE → DROP content_calendar → neue Seeds → GRANT + RLS für neue Tabellen. Bestehende Daten bleiben erhalten.

## Constraints & Tradeoffs

| Entscheidung | Tradeoff |
|---|---|
| Multiplikatoren als Kontakte (is_multiplier Flag) | Einfacher, Filter nötig |
| SMTP nur Ausgang (kein IMAP) | Kein Inbox-Sync in V2 |
| Cal.com nur als Link | Manuelle Timeline-Einträge |
| Fit-Scores als eigene Tabelle | Flexibel, extra Join |

## Recommended Next Step

`/slice-planning` — Module in implementierbare Slices schneiden.
