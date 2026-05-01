# Architecture

## Summary

Das StrategAIze Business Development System ist ein internes Revenue- und Relationship-System, deployed als Docker Compose Stack (Next.js + Supabase + Kong) auf Hetzner via Coolify.

**V2-Strategie:** Erweitern, nicht neu bauen. Die bestehende Infrastruktur (Supabase, Docker, Auth, Kong, Next.js) bleibt. Schema wird erweitert.

**V3-Strategie:** Vom Feature-CRM zum kontextzentrierten BD-Betriebssystem. Workspace-Pattern fuer Deals/Firmen/Kontakte. LLM-Integration via AWS Bedrock. Governance-Basis (Rollen, RLS, Audit). Die bestehende Infrastruktur bleibt, wird um einen AI-Service-Layer und neue Tabellen erweitert.

## Main Components — V3

```
Browser (HTTPS)
  │
  ├─ business.strategaizetransition.com
  │
Coolify / Caddy (Reverse Proxy, SSL/TLS)
  │
  ├─ / → app:3000 (Next.js BD Cockpit)
  │
  ├──────────────────────────────────────────────────────────┐
  │                                                          │
Next.js App (BD Cockpit)                    Supabase Stack   │
  │                                          Kong :8000      │
  ├── Workspace-Pages (V3 NEU)               GoTrue :9999    │
  │   ├── /deals/[id]                        PostgREST :3000 │
  │   ├── /companies/[id] (erweitert)        Storage :5000   │
  │   └── /contacts/[id] (erweitert)         PostgreSQL:5432 │
  │                                                          │
  ├── Operative Pages                                        │
  │   ├── /mein-tag (V3 erweitert)                           │
  │   ├── /pipeline/[view]                                   │
  │   └── /dashboard                                         │
  │                                                          │
  ├── Fallback/Verwaltung                                    │
  │   ├── /aufgaben                                          │
  │   ├── /termine (V3 NEU)                                  │
  │   ├── /emails                                            │
  │   ├── /proposals                                         │
  │   ├── /handoffs, /referrals                              │
  │   └── /settings (+ Audit-Log V3)                         │
  │                                                          │
  ├── Server Actions (bestehend + erweitert)                 │
  │                                                          │
  ├── /lib/ai/ (V3 NEU — LLM Service Layer)                 │
  │   ├── bedrock-client.ts                                  │
  │   ├── prompts/                                           │
  │   ├── parser.ts                                          │
  │   └── confirm.ts                                         │
  │                                                          │
  ├── /api/ai/query (V3 NEU — LLM API Route)                │
  ├── /api/transcribe (bestehend — Whisper)                  │
  │                                                          │
  ├── nodemailer (SMTP)                                      │
  └── /lib/calcom/ (V4 NEU — Cal.com API Client)             │
                                                             │
Cal.com Stack (V4 NEU):                                      │
  ├── calcom:3000 (Cal.com Self-Hosted)                      │
  ├── calcom-db:5432 (PostgreSQL 15 — eigene Instanz)        │
  └── Webhooks → /api/webhooks/calcom                        │
                                                             │
Docker Network: business-net ────────────────────────────────┘

Extern (kein Docker):
  SMTP Server (Gmail/eigener) ← nodemailer
  AWS Bedrock (eu-central-1) ← @aws-sdk/client-bedrock-runtime (V3 NEU)
  OpenAI Whisper API ← Transkription (bestehend)
  cal.strategaizetransition.com ← Cal.com Self-Hosted (V4, DEC-031)
```

## Responsibilities — V3

| Component | Verantwortung |
|---|---|
| **Next.js BD Cockpit** | UI, Server Actions, Auth, SMTP-Versand, SSR, Workspace-Pages |
| **Supabase Stack** | API Gateway, Auth, REST API, Storage, DB, RLS |
| **/lib/ai/** | Bedrock Client, Prompt-Templates, Response-Parser, Confirm-before-write |
| **/api/ai/query** | LLM-Query-Endpoint (authentifiziert, rate-limited) |
| **SMTP (extern)** | E-Mail-Versand |
| **AWS Bedrock (extern)** | LLM-Inference (Claude Sonnet 4.6, eu-central-1) |
| **OpenAI Whisper (extern)** | Audio-Transkription |

## Data Model — V3

### Uebersicht: 18 Tabellen (15 bestehend + 3 neu)

```
BESTEHEND (unveraendert):        BESTEHEND (erweitert V3):
├── companies                    ├── activities (+2: source_type, source_id)
├── contacts                     └── profiles (+2: role, team)
├── pipelines
├── pipeline_stages              NEU (V3):
├── deals                        ├── meetings
├── emails                       ├── calendar_events
├── proposals                    └── audit_log
├── fit_assessments
├── tasks
├── handoffs
├── referrals
├── signals
└── documents
```

### Neue Tabelle: meetings (FEAT-308, DEC-021)

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  location TEXT,
  participants TEXT,
  agenda TEXT,
  outcome TEXT,
  notes TEXT,
  transcript TEXT,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'planned',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX idx_meetings_deal ON meetings(deal_id);
CREATE INDEX idx_meetings_contact ON meetings(contact_id);
```

**Status-Werte:** planned, completed, cancelled
**transcript:** Leer in V3, vorbereitet fuer V4 (Call Intelligence)
**participants:** Freitext in V3, spaeter ggf. JSON-Array mit Contact-IDs

### Neue Tabelle: calendar_events (FEAT-309, DEC-026)

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'other',
  description TEXT,
  location TEXT,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
```

**type-Werte:** meeting, call, block, personal, other
**meeting_id:** Automatische Verknuepfung wenn Event aus Meeting erzeugt wird

### Neue Tabelle: audit_log (FEAT-307, DEC-024)

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

**action-Werte:** stage_change, status_change, create, update, delete, approval, rejection
**changes:** JSONB mit `{ before: {...}, after: {...} }` fuer diff-faehiges Audit
**context:** Optionaler Freitext (z.B. "Moved from Angebot vorbereitet to Verhandlung")

### Tabellen-Erweiterung: activities (DEC-021)

```sql
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE INDEX idx_activities_source ON activities(source_type, source_id)
  WHERE source_type IS NOT NULL;
```

**source_type-Werte:** meeting, call, email, audit (Rueckverlinkung)
**Bestehende Activities:** Bekommen source_type = NULL (kein Migrationsbedarf)

### Tabellen-Erweiterung: profiles (FEAT-307)

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team TEXT;
```

**role-Werte:** admin, operator
**Default admin:** Bestehender Single-User bleibt Admin. Neue User koennen als Operator angelegt werden.
**team:** Nullable, fuer spaetere Team-Zuordnung (V5)

## RLS-Strategie — V3 (FEAT-307)

### Aktuell (V2): Alle authentifizierten User haben vollen Zugriff

```sql
-- Aktuell auf allen Tabellen:
CREATE POLICY "authenticated_full_access" ON [table]
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### V3: Rollenbasierte RLS

```sql
-- Muster fuer alle geschaeftsrelevanten Tabellen:
-- (deals, activities, tasks, emails, proposals, meetings, calendar_events, etc.)

-- Admin: Voller Zugriff
CREATE POLICY "admin_full_access" ON [table]
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Operator: Nur eigene Daten (created_by = auth.uid())
CREATE POLICY "operator_own_data" ON [table]
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Tabellen mit RLS-Aenderung

| Tabelle | V2 Policy | V3 Policy |
|---|---|---|
| deals | full_access | operator_own_data |
| activities | full_access | operator_own_data |
| tasks | full_access | operator_own_data |
| emails | full_access | operator_own_data |
| proposals | full_access | operator_own_data |
| meetings | full_access | operator_own_data |
| calendar_events | full_access | operator_own_data |
| audit_log | full_access | admin_full_access (Operator: nur lesend eigene) |
| companies | full_access | bleibt full_access (Stammdaten) |
| contacts | full_access | bleibt full_access (Stammdaten) |
| pipelines | full_access | bleibt full_access (Konfiguration) |
| pipeline_stages | full_access | bleibt full_access (Konfiguration) |
| fit_assessments | full_access | bleibt full_access (Bewertungen) |
| signals | full_access | bleibt full_access (Qualifizierung) |
| referrals | full_access | bleibt full_access (Stammdaten) |
| handoffs | full_access | bleibt full_access (Stammdaten) |
| documents | full_access | operator_own_data |
| profiles | full_access | eigenes Profil lesen, Admin alle |

### Migration-Strategie RLS

1. Bestehende Rows: `created_by` auf aktuellen Owner setzen (einmalige Migration)
2. Alte Policies droppen, neue Policies anlegen
3. Reihenfolge: Erst profiles.role migrieren, dann RLS-Policies

## LLM-Integration Layer — V3 (FEAT-305, DEC-023)

### Architektur

```
UI Component (React)
  │
  ├── Client-Side: fetch('/api/ai/query', { type, context })
  │
/api/ai/query (Next.js API Route)
  │
  ├── Auth-Check (Supabase Session)
  ├── Rate-Limit-Check (Token-Bucket, 10 req/min)
  ├── Prompt-Assembly (/lib/ai/prompts/)
  ├── Bedrock-Call (/lib/ai/bedrock-client.ts)
  ├── Response-Parse (/lib/ai/parser.ts)
  │
  └── Return structured JSON
```

### /lib/ai/ Struktur

```
/lib/ai/
├── bedrock-client.ts     — AWS SDK v3 InvokeModel Wrapper
├── prompts/
│   ├── deal-briefing.ts  — Prompt + Schema fuer Deal-Zusammenfassung
│   └── daily-summary.ts  — Prompt + Schema fuer Tages-Summary
├── parser.ts             — JSON-Response-Validator
├── confirm.ts            — Confirm-before-write Utility
├── rate-limiter.ts       — Token-Bucket Rate Limiter
└── types.ts              — Shared Types (PromptType, AIResponse, etc.)
```

### Bedrock Client

```typescript
// /lib/ai/bedrock-client.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: 'eu-central-1' })

export async function queryLLM(prompt: string, maxTokens: number = 2048) {
  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
    contentType: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const response = await client.send(command)
  return JSON.parse(new TextDecoder().decode(response.body))
}
```

### Prompt-Templates

**Deal-Briefing (FEAT-301):**
- Input: Deal-Daten, letzte 10 Activities, Company, Contact, Stage, Proposals
- Output-Schema: `{ summary: string, keyFacts: string[], openRisks: string[], suggestedNextSteps: string[], confidence: 'high'|'medium'|'low' }`

**Tages-Summary (FEAT-302):**
- Input: Heutige Tasks, Calendar-Events, stagnierte Deals, ueberfaellige Items
- Output-Schema: `{ greeting: string, priorities: string[], meetingPrep: { title, context, dealId }[], warnings: string[], suggestedFocus: string }`

### Confirm-before-write Pattern

```
Ablauf:
1. KI generiert Vorschlag (z.B. E-Mail-Entwurf, Task-Vorschlag)
2. UI zeigt Vorschlag in einem Confirm-Dialog
3. User kann: Bestaetigen / Bearbeiten / Verwerfen
4. Erst nach Bestaetigung: Server Action schreibt Daten
5. Audit-Log-Eintrag mit action='ai_confirmed'
```

V3 nutzt nur Query-Modus (read-only). KI-generierte Schreibaktionen (Action-Modus) kommen in V3.1.

### Env Vars (V3 neu)

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1
```

Bestehend: `OPENAI_API_KEY` (Whisper), `SMTP_*` (E-Mail)

## Workspace-Pattern — V3 (FEAT-301, DEC-022)

### Routing

```
V2 (Sheet-based):                V3 (Route-based):
Pipeline → Kanban-Card Klick     Pipeline → Kanban-Card Klick
  → DealDetailSheet (Overlay)      → /deals/[id] (eigene Route)

/companies/[id] (bestehend)      /companies/[id] (erweitert)
/contacts/[id] (bestehend)       /contacts/[id] (erweitert)
```

### Deal-Workspace Layout (/deals/[id])

```
┌─────────────────────────────────────────────────────────┐
│ ← Zurueck zur Pipeline    Deal: [Titel]    [Aktionen ▼]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── Deal-Header ──────────────────────────────────────┐│
│ │ Stage: [Badge]  Wert: €XX.XXX  Wahrsch: XX%         ││
│ │ Firma: [Link]   Kontakt: [Link]   Status: [Badge]   ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─── KI-Briefing ─────────┐ ┌─── Prozess-Check ──────┐│
│ │ [LLM-Summary]           │ │ ✓ Wert gesetzt          ││
│ │ Key Facts: ...           │ │ ✓ Kontakt zugeordnet   ││
│ │ Risiken: ...             │ │ ✗ Angebot fehlt        ││
│ │ Naechste Schritte: ...   │ │ ✗ Follow-up ueberfaellig││
│ └─────────────────────────┘ └─────────────────────────┘│
│                                                         │
│ ┌─── Tabs ─────────────────────────────────────────────┐│
│ │ Timeline │ Aufgaben │ Angebote │ Dokumente │ Edit    ││
│ ├──────────────────────────────────────────────────────┤│
│ │ [Tab-Inhalt]                                         ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─── Direktaktionen ──────────────────────────────────┐│
│ │ [+ Task] [+ E-Mail] [+ Notiz] [+ Meeting] [Stage ▼]││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Firmen-Workspace Erweiterung (/companies/[id])

Bestehende Seite + neue Sektion:

```
[Bestehende Sektionen: Firmendaten, Tags, Eignungsbewertung, Fit, Signals, Kontakte, Timeline, Dokumente]

+ NEU: Deal-Liste
┌─── Deals ──────────────────────────────────────────────┐
│ Aktive Deals:                                          │
│  ● Blueprint-Verkauf Firma X  │ Angebot offen │ €15k  │
│  ● Beratungsprojekt           │ Vertiefung    │ €8k   │
│                                                        │
│ Vergangene Deals:                                      │
│  ✓ Erstprojekt 2025           │ Gewonnen      │ €12k  │
│  ✗ Umsetzungsprojekt          │ Verloren      │ €20k  │
└────────────────────────────────────────────────────────┘

+ NEU: KI-Summary Slot (Platzhalter)
┌─── KI-Zusammenfassung ────────────────────────────────┐
│ [Verfuegbar ab V3.1]                                   │
└────────────────────────────────────────────────────────┘
```

### Kontakt-Workspace Erweiterung (/contacts/[id])

Analog zu Firmen-Workspace: + Deal-Liste + KI-Summary-Slot

## Navigation — V3 (FEAT-306)

### Neue Sidebar-Struktur

```
┌─────────────────────────┐
│ [Logo]                  │
│                         │
│ OPERATIV                │
│   📋 Mein Tag           │
│   🔀 Pipeline ▸        │
│      Multiplikatoren    │
│      Chancen            │
│      Leads              │
│                         │
│ WORKSPACES              │
│   💼 Alle Deals         │
│   🏢 Alle Firmen        │
│   👤 Alle Kontakte      │
│   🤝 Multiplikatoren    │
│                         │
│ ANALYSE                 │
│   📊 Dashboard          │
│                         │
│ ▸ VERWALTUNG            │
│   ✅ Aufgaben           │
│   📅 Termine            │
│   ✉️ E-Mails            │
│   📄 Proposals          │
│   🔄 Handoffs           │
│   👥 Referrals          │
│   ⚙️ Settings           │
│   📝 Audit-Log (Admin)  │
│                         │
│ [User Profile / Logout] │
└─────────────────────────┘
```

### Routing-Aenderungen V3

| Route | V2 | V3 |
|---|---|---|
| /deals/[id] | (neu) | Deal-Workspace |
| /mein-tag | bestehend | erweitert (Kalender, Meeting-Prep, KI) |
| /companies/[id] | bestehend | erweitert (Deal-Liste, KI-Slot) |
| /contacts/[id] | bestehend | erweitert (Deal-Liste, KI-Slot) |
| /termine | stub | calendar_events CRUD |
| /settings/audit | (neu) | Audit-Log-Viewer (Admin) |
| Sidebar | flach | 4-Gruppen-Hierarchie |

Alle bestehenden Routen bleiben funktional. Keine Routen werden entfernt.

## Mein Tag V2 — Datenfluss (FEAT-302)

```
Page Load:
  ├── getTodayItems()         → Tasks + Deal-Actions (bestehend)
  ├── getCalendarEvents()     → Heutige Events (V3 NEU)
  ├── getNextMeeting()        → Naechstes Meeting + Deal/Kontakt-Kontext (V3 NEU)
  ├── getStagnatdeDeals()     → Deals mit updated_at > 14d (V3 NEU)
  ├── getOverdueCount()       → Ueberfaellige Tasks/Deals (bestehend)
  │
  └── Optional (async):
      └── fetchDailySummary() → Bedrock LLM Tages-Summary (V3 NEU)
```

### Meeting-Prep Logik

```
1. Naechstes calendar_event mit type='meeting' heute/morgen
2. Falls meeting_id verknuepft: Meeting-Details laden (Teilnehmer, Agenda)
3. Falls deal_id verknuepft: Deal-Kopfdaten laden (Stage, Wert, letzte Activity)
4. Falls contact_id verknuepft: Kontakt-Kurzprofil laden
5. Anzeige als Meeting-Prep-Card in Mein Tag
```

### Exception-Hinweise Logik

```
Stagnierte Deals:  SELECT * FROM deals WHERE status = 'active'
                   AND updated_at < now() - interval '14 days'

Ueberfaellige Tasks: SELECT * FROM tasks WHERE status = 'open'
                     AND due_date < CURRENT_DATE

Fehlende Follow-ups: SELECT * FROM emails WHERE follow_up_status = 'pending'
                     AND follow_up_date < CURRENT_DATE
```

## Audit-Trail — V3 (FEAT-307, DEC-024)

### Audit-Trigger-Punkte

| Aktion | entity_type | action | Was wird geloggt |
|---|---|---|---|
| Deal Stage-Wechsel | deal | stage_change | before/after Stage |
| Deal Status-Wechsel | deal | status_change | before/after Status |
| Deal erstellt | deal | create | Neue Deal-Daten |
| Deal geloescht | deal | delete | Geloeschte Deal-Daten |
| Meeting erstellt | meeting | create | Meeting-Daten |
| Meeting abgeschlossen | meeting | update | outcome, notes |
| Task erledigt | task | status_change | before/after Status |
| Proposal Status | proposal | status_change | before/after Status |
| KI-Aktion bestaetigt | * | ai_confirmed | Was KI vorgeschlagen hat |

### Implementation

Audit-Logging wird in Server Actions implementiert (nicht als DB-Trigger), weil:
- `actor_id` muss aus Supabase Session kommen
- Kontext-Information (z.B. Stage-Name) ist in Server Action verfuegbar
- Selective Logging (nicht jede DB-Aenderung, nur kritische)

```typescript
// /lib/audit.ts
export async function logAudit(
  supabase: SupabaseClient,
  action: string,
  entityType: string,
  entityId: string,
  changes?: { before?: any; after?: any },
  context?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_log').insert({
    actor_id: user?.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
    context
  })
}
```

## Prozess-Check — V3 (FEAT-301)

### Regelbasierte Pflichtschritte

Bestehende Logik aus `moveDealToStage()` wird als eigene Funktion extrahiert:

```typescript
// /lib/process-check.ts
export function getProcessCheck(deal: Deal, currentStage: Stage): ProcessCheckResult {
  const checks = [
    { label: 'Wert gesetzt', passed: deal.value != null && deal.value > 0 },
    { label: 'Kontakt zugeordnet', passed: deal.contact_id != null },
    { label: 'Firma zugeordnet', passed: deal.company_id != null },
    { label: 'Naechste Aktion definiert', passed: deal.next_action != null },
    // Stage-spezifische Checks:
    ...getStageSpecificChecks(deal, currentStage)
  ]
  return { checks, allPassed: checks.every(c => c.passed) }
}
```

Dies ist ein regelbasierter Check. KI-gestuetzte Prozessempfehlungen kommen in V3.1.

## Migration Plan — V3

### MIG-005 — V3 Schema-Erweiterungen

```sql
-- 1. Neue Tabellen
CREATE TABLE meetings (...);
CREATE TABLE calendar_events (...);
CREATE TABLE audit_log (...);

-- 2. Activities erweitern
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_id UUID;
CREATE INDEX idx_activities_source ON activities(source_type, source_id)
  WHERE source_type IS NOT NULL;

-- 3. Profiles erweitern
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team TEXT;

-- 4. RLS auf neuen Tabellen
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (neue Tabellen)
-- meetings, calendar_events: operator_own_data Pattern
-- audit_log: admin liest alles, operator liest eigene

-- 6. Grants
GRANT ALL ON meetings TO authenticated;
GRANT ALL ON calendar_events TO authenticated;
GRANT ALL ON audit_log TO authenticated;
```

### MIG-006 — V3 RLS-Umbau (bestehende Tabellen)

```sql
-- Erst: created_by auf bestehenden Owner setzen
UPDATE deals SET created_by = '[owner-uuid]' WHERE created_by IS NULL;
UPDATE tasks SET created_by = '[owner-uuid]' WHERE created_by IS NULL;
UPDATE emails SET created_by = '[owner-uuid]' WHERE created_by IS NULL;
UPDATE activities SET created_by = '[owner-uuid]' WHERE created_by IS NULL;
UPDATE documents SET created_by = '[owner-uuid]' WHERE created_by IS NULL;

-- Dann: Alte Policies droppen, neue anlegen
-- (Pro Tabelle: DROP POLICY, CREATE POLICY operator_own_data)
```

**Reihenfolge:** MIG-005 zuerst (additive Aenderungen), dann MIG-006 (RLS-Umbau).
**MIG-006 ist optional in V3 MVP** — kann nach Deal-Workspace und LLM-Layer kommen.

## Bestehende Architektur-Elemente (unveraendert)

### Pipeline Seed-Daten (3 Pipelines)
- **Multiplikatoren (10 Stufen):** Identifiziert → ... → Strategischer Multiplikator → Inaktiv
- **Unternehmer-Chancen (12 Stufen):** Signal → ... → Gewonnen → Verloren → Geparkt
- **Lead-Management (7 Stufen):** Identifiziert → ... → Qualifiziert → In Pipeline verschoben

### E-Mail Architecture
```
Next.js Server Action → nodemailer → SMTP Server (Gmail)
                      → Supabase INSERT → emails Tabelle
```

### Docker Networking
- Alle Container im `business-net` Docker Network
- Inter-Service-Kommunikation ueber Container-Namen (kein externes URL)
- Kong als API Gateway fuer Supabase-Services
- Next.js kommuniziert mit Supabase ueber interne URLs

### Auth Flow
- Supabase Auth (GoTrue) — server-seitig via Middleware
- SSR Cookie-basierte Sessions
- Middleware checkt Session auf jedem Request
- Oeffentliche Pfade: /login, /auth/callback, /auth/set-password

## Env Vars — Vollstaendige Liste V3

```bash
# Supabase (bestehend)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# SMTP (bestehend)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...

# Whisper (bestehend)
OPENAI_API_KEY=...

# AWS Bedrock (V3 NEU)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1
```

## Constraints & Tradeoffs — V3

| Entscheidung | Tradeoff |
|---|---|
| Bedrock statt lokales LLM | Abhaengigkeit von AWS, aber DSGVO-konform (Frankfurt), kein GPU-Server noetig |
| Meetings als eigene Tabelle | Extra Join in Timeline, aber reichere Datenstruktur fuer Transkription/Agenda |
| RLS pro created_by | Einfach, aber Shared-Deals (mehrere Bearbeiter) brauchen spaeter team-basierte RLS |
| Audit in Server Actions statt DB-Trigger | Flexibler, aber Entwickler muss dran denken |
| calendar_events statt Cal.com-Sync | Keine automatische Sync, aber volle Kontrolle und einfacher |
| Prozess-Check regelbasiert | Nicht so smart wie KI, aber vorhersagbar und schnell |
| KI nur Query-Modus in V3 | Keine schreibenden KI-Aktionen, dafuer sicher und kontrolliert |

## Technische Risiken — V3

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Bedrock-Latenz >5s | Mittel | Hoch (UX) | Async-Loading mit Skeleton, Caching |
| RLS-Umbau bricht bestehende Queries | Niedrig | Hoch | Single-User, created_by Migration vorher |
| AWS Credentials Management in Docker | Niedrig | Mittel | Env Vars in Coolify, nicht im Image |
| LLM-Output unbrauchbar/halluziniert | Mittel | Mittel | Strukturierter Output mit JSON Schema, Fallback-UI |

---

# V4 Architektur — KI-Gatekeeper + Externe Integrationen

## V4 Architecture Summary

V4 erweitert das System um drei neue Infrastruktur-Schichten:

1. **IMAP-Sync-Layer** — Eingehende E-Mails von IONOS synchronisieren und speichern
2. **KI-Klassifikation-Layer** — Zwei-Pass E-Mail-Analyse (Regelbasiert + Bedrock)
3. **Cal.com-Integration-Layer** — Self-Hosted Kalender-Sync und Buchungs-Engine

Zentrale neue Konzepte:
- **Background Processing** via Cron-API-Routes (kein separater Worker-Container)
- **ai_action_queue** als universelle Human-in-the-Loop Queue
- **Suggest-Approve-Execute Pattern** fuer alle KI-Aktionen

## V4 Main Components

```
Browser (HTTPS)
  │
  ├─ business.strategaizetransition.com
  │
Coolify / Caddy (Reverse Proxy, SSL/TLS)
  │
  ├─ / → app:3000 (Next.js BD Cockpit)
  ├─ /calcom → calcom:3000 (Cal.com Self-Hosted)           ← V4 NEU
  │
  ├───────────────────────────────────────────────────────────────────┐
  │                                                                   │
Next.js App (BD Cockpit)                              Supabase Stack  │
  │                                                    Kong :8000     │
  ├── Workspace-Pages (bestehend)                      GoTrue :9999   │
  ├── Operative Pages (bestehend + erweitert)          PostgREST:3000 │
  │   ├── /mein-tag (V4: Gatekeeper, Wiedervorlagen)   Storage :5000  │
  │   ├── /emails (V4: IMAP-Inbox + Klassifikation)    PostgreSQL:5432│
  │   └── /kalender (V4 NEU: Gesamtkalender)                         │
  │                                                                   │
  ├── Server Actions (bestehend + erweitert)                          │
  │                                                                   │
  ├── /lib/ai/ (erweitert)                                            │
  │   ├── bedrock-client.ts (bestehend)                               │
  │   ├── prompts/ (erweitert: email-classify, followup-suggest)      │
  │   ├── classifiers/ (V4 NEU)                                       │
  │   │   ├── rule-based.ts  — Header-Analyse, Absender-Matching     │
  │   │   └── llm-based.ts   — Bedrock Kontext-Klassifikation        │
  │   └── action-queue.ts (V4 NEU — ai_action_queue Service)         │
  │                                                                   │
  ├── /lib/imap/ (V4 NEU)                                             │
  │   ├── sync-service.ts    — imapflow Verbindung + Sync-Logik      │
  │   ├── parser.ts          — E-Mail-Parsing (Header, Body, Thread) │
  │   ├── contact-matcher.ts — Auto-Zuordnung via E-Mail-Adresse     │
  │   └── retention.ts       — 90-Tage Cleanup                       │
  │                                                                   │
  ├── /lib/calcom/ (V4 NEU)                                           │
  │   ├── api-client.ts      — Cal.com REST API Client               │
  │   ├── webhook-handler.ts — Cal.com Webhook Events verarbeiten    │
  │   └── sync.ts            — Bidirektionaler Event-Sync            │
  │                                                                   │
  ├── /api/cron/ (V4 NEU — Background Jobs)                          │
  │   ├── imap-sync/route.ts — IMAP Polling (alle 5 Min)             │
  │   ├── classify/route.ts  — E-Mail Batch-Klassifikation           │
  │   ├── followups/route.ts — KI-Wiedervorlagen generieren          │
  │   └── retention/route.ts — E-Mail Retention Cleanup (taeglich)   │
  │                                                                   │
  ├── /api/webhooks/ (V4 NEU)                                         │
  │   └── calcom/route.ts    — Cal.com Webhook Receiver              │
  │                                                                   │
  ├── /api/ai/query (bestehend — erweitert)                           │
  ├── /api/transcribe (bestehend — Whisper)                           │
  │                                                                   │
  ├── nodemailer (SMTP — bestehend)                                   │
  │                                                                   │
Cal.com (V4 NEU)                                                      │
  ├── calcom:3000 (Web UI + API)                                      │
  ├── calcom-db:5432 (eigene PostgreSQL)                              │
  │                                                                   │
Docker Network: business-net ─────────────────────────────────────────┘

Extern (kein Docker):
  IONOS IMAP (imap.ionos.de:993, SSL) ← imapflow           ← V4 NEU
  SMTP Server (Gmail/eigener) ← nodemailer (bestehend)
  AWS Bedrock (eu-central-1) ← @aws-sdk/client-bedrock-runtime
  OpenAI Whisper API ← Transkription (bestehend)
  Coolify Cron ← triggert /api/cron/* Endpoints              ← V4 NEU
```

## V4 Responsibilities

| Component | Verantwortung |
|---|---|
| **/lib/imap/** | IMAP-Verbindung, E-Mail-Sync, Parsing, Kontakt-Matching, Retention |
| **/lib/ai/classifiers/** | Regelbasierte + LLM-gestuetzte E-Mail-Klassifikation |
| **/lib/ai/action-queue.ts** | ai_action_queue CRUD, Freigabe-Workflow |
| **/lib/calcom/** | Cal.com API Client, Webhook-Verarbeitung, Event-Sync |
| **/api/cron/** | Background Jobs (IMAP-Sync, Klassifikation, Wiedervorlagen, Retention) |
| **/api/webhooks/calcom/** | Cal.com Webhook Empfaenger |
| **Cal.com Container** | Terminbuchung, Verfuegbarkeit, externe Kalender-Sync |

## V4 Background Processing — Cron-API-Routes (DEC-033)

### Warum Cron-API-Routes statt Worker-Container

Fuer ein internes Single-User-Tool ist ein separater Worker-Container mit Queue-System (Bull, RabbitMQ) ueberdimensioniert. Stattdessen:

- Next.js API Routes als Cron-Endpoints
- Coolify Cron Job (oder System-Cron) ruft Endpoints periodisch auf
- Schutz via CRON_SECRET Header (kein oeffentlicher Zugang)
- Bei Fehler: naechster Cron-Lauf versucht es erneut

```
Coolify Cron
  │
  ├── alle 5 Min  → POST /api/cron/imap-sync           (Header: x-cron-secret)
  ├── alle 5 Min  → POST /api/cron/meeting-transcript  (Header: x-cron-secret)  ← V4.1
  ├── alle 5 Min  → POST /api/cron/meeting-summary     (Header: x-cron-secret)  ← V4.1
  ├── alle 5 Min  → POST /api/cron/meeting-reminders   (Header: x-cron-secret)  ← V4.1
  ├── alle 15 Min → POST /api/cron/classify            (Header: x-cron-secret)
  ├── alle 6h     → POST /api/cron/followups           (Header: x-cron-secret)
  └── taeglich    → POST /api/cron/retention            (Header: x-cron-secret)
```

### Cron-Endpoint Schutz

```typescript
// /api/cron/middleware.ts
export function verifyCronSecret(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}
```

### Cron-Endpoints Detail

| Endpoint | Intervall | Aufgabe | Max Laufzeit |
|---|---|---|---|
| `/api/cron/imap-sync` | 5 Min | Neue E-Mails via IMAP holen, parsen, speichern, Kontakte matchen | 30s |
| `/api/cron/classify` | 15 Min | Unklassifizierte E-Mails batch-klassifizieren (Rule + optional Bedrock) | 60s |
| `/api/cron/followups` | 6h | KI-Wiedervorlagen-Vorschlaege generieren | 60s |
| `/api/cron/retention` | 24h | E-Mails aelter als 90 Tage loeschen | 30s |

## V4 Data Model

### Uebersicht: 23 Tabellen (18 bestehend + 5 neu)

```
BESTEHEND (unveraendert):              NEU (V4):
├── companies                          ├── email_messages
├── contacts                           ├── email_threads
├── pipelines                          ├── email_sync_state
├── pipeline_stages                    ├── ai_action_queue
├── deals                              └── ai_feedback
├── emails (outbound SMTP)
├── proposals                          BESTEHEND (erweitert V4):
├── fit_assessments                    └── calendar_events (+3: source, external_id, sync_status)
├── tasks
├── handoffs
├── referrals
├── signals
├── documents
├── activities
├── profiles
├── meetings
├── calendar_events
└── audit_log
```

### Neue Tabelle: email_messages (FEAT-405)

```sql
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,          -- RFC 822 Message-ID
  in_reply_to TEXT,                          -- fuer Thread-Erkennung
  references_header TEXT,                    -- fuer Thread-Erkennung
  thread_id UUID REFERENCES email_threads(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  -- Zuordnung
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  -- KI-Klassifikation (FEAT-408)
  classification TEXT DEFAULT 'unclassified',  -- anfrage, antwort, auto_reply, newsletter, intern, spam, unclassified
  priority TEXT DEFAULT 'normal',              -- dringend, normal, niedrig, irrelevant
  gatekeeper_summary TEXT,                     -- KI-generierte Zusammenfassung
  is_auto_reply BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMPTZ,
  -- Attachments (Metadaten)
  attachments JSONB DEFAULT '[]',             -- [{filename, mime_type, size_bytes}]
  -- Retention
  synced_at TIMESTAMPTZ DEFAULT now(),
  retention_expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  -- Roh-Header fuer Debugging
  headers_json JSONB,
  created_by UUID
);

CREATE INDEX idx_email_messages_received ON email_messages(received_at DESC);
CREATE INDEX idx_email_messages_contact ON email_messages(contact_id);
CREATE INDEX idx_email_messages_company ON email_messages(company_id);
CREATE INDEX idx_email_messages_deal ON email_messages(deal_id);
CREATE INDEX idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX idx_email_messages_classification ON email_messages(classification);
CREATE INDEX idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX idx_email_messages_from ON email_messages(from_address);
CREATE INDEX idx_email_messages_retention ON email_messages(retention_expires_at)
  WHERE retention_expires_at IS NOT NULL;
```

### Neue Tabelle: email_threads (FEAT-405)

```sql
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,                     -- normalisierter Subject (ohne Re:/Fwd:)
  first_message_at TIMESTAMPTZ NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL,
  message_count INT DEFAULT 1,
  -- Zuordnung (vom neuesten Message uebernommen)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_threads_last_message ON email_threads(last_message_at DESC);
CREATE INDEX idx_email_threads_contact ON email_threads(contact_id);
```

### Neue Tabelle: email_sync_state (FEAT-405)

```sql
CREATE TABLE email_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder TEXT NOT NULL UNIQUE,               -- z.B. 'INBOX'
  last_uid INT DEFAULT 0,                    -- IMAP UID fuer inkrementellen Sync
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'idle',                -- idle, syncing, error
  error_message TEXT,
  emails_synced_total INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Neue Tabelle: ai_action_queue (FEAT-407, FEAT-408)

```sql
CREATE TABLE ai_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Was
  type TEXT NOT NULL,                         -- reply, followup, meeting, assign_contact, reclassify, task
  action_description TEXT NOT NULL,           -- Menschenlesbarer Vorschlag
  reasoning TEXT,                             -- KI-Begruendung
  -- Worauf bezogen
  entity_type TEXT NOT NULL,                  -- email_message, deal, contact, company
  entity_id UUID NOT NULL,
  -- Kontext
  context_json JSONB,                         -- Zusaetzliche Daten fuer die Aktion
  -- Prioritaet
  priority TEXT DEFAULT 'normal',             -- dringend, normal, niedrig
  -- Quelle
  source TEXT NOT NULL,                       -- gatekeeper, followup_engine, auto_reply_detector
  -- Status-Workflow
  status TEXT DEFAULT 'pending',              -- pending, approved, rejected, executed, expired
  suggested_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  execution_result TEXT,
  -- Deduplizierung
  dedup_key TEXT,                             -- Verhindert doppelte Vorschlaege
  expires_at TIMESTAMPTZ,                     -- Auto-Expire nach X Tagen
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_queue_status ON ai_action_queue(status) WHERE status = 'pending';
CREATE INDEX idx_ai_queue_entity ON ai_action_queue(entity_type, entity_id);
CREATE INDEX idx_ai_queue_source ON ai_action_queue(source);
CREATE INDEX idx_ai_queue_dedup ON ai_action_queue(dedup_key) WHERE dedup_key IS NOT NULL;
```

### Neue Tabelle: ai_feedback (FEAT-407)

```sql
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_queue_id UUID REFERENCES ai_action_queue(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,                -- approved, rejected, modified
  reason TEXT,                                -- Optionaler Ablehnungsgrund
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_feedback_queue ON ai_feedback(action_queue_id);
```

### Tabellen-Erweiterung: calendar_events (FEAT-406)

```sql
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
  -- Werte: manual, calcom, google, outlook
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS external_id TEXT;
  -- Cal.com Booking ID oder Google Event ID
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
  -- Werte: synced, pending_sync, conflict
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS booking_link TEXT;
  -- Cal.com Booking-Link fuer den Event

CREATE INDEX idx_calendar_events_source ON calendar_events(source);
CREATE INDEX idx_calendar_events_external ON calendar_events(external_id)
  WHERE external_id IS NOT NULL;
```

## IMAP-Sync Flow (FEAT-405)

```
/api/cron/imap-sync (alle 5 Min)
  │
  ├── 1. Cron-Secret pruefen
  ├── 2. email_sync_state laden (last_uid fuer INBOX)
  ├── 3. IMAP-Verbindung oeffnen (imapflow → imap.ionos.de:993)
  ├── 4. FETCH neue UIDs seit last_uid
  │      └── Limit: max 50 Mails pro Sync-Lauf
  ├── 5. Pro E-Mail:
  │      ├── Header parsen (From, To, CC, Subject, Message-ID, In-Reply-To, References)
  │      ├── Body parsen (Text + HTML)
  │      ├── Attachments: nur Metadaten (Filename, MIME, Size)
  │      ├── Auto-Reply erkennen (Header: Auto-Submitted, X-Auto-Response-Suppress)
  │      ├── Thread zuordnen/erstellen (via In-Reply-To/References oder Subject-Match)
  │      ├── Kontakt matchen (from_address → contacts.email)
  │      │   └── wenn match: company_id + deal_id uebernehmen
  │      └── INSERT email_messages
  ├── 6. email_sync_state aktualisieren (last_uid, last_sync_at)
  └── 7. Response: { synced: N, errors: N, duration_ms: N }
```

### Initial-Sync Strategie

Beim ersten Sync (last_uid = 0):
- Nur E-Mails der letzten 90 Tage holen (SINCE-Filter)
- Max 500 E-Mails beim Initial-Sync
- Danach normaler inkrementeller Sync

### Kontakt-Matching Algorithmus

```
1. from_address exakt in contacts.email? → match
2. from_address Domain in companies.website/email? → company match (kein contact match)
3. Kein Match → contact_id = NULL (landet in "Unzugeordnet"-Queue)
```

## KI-Gatekeeper Classification Flow (FEAT-408)

```
/api/cron/classify (alle 15 Min)
  │
  ├── 1. Cron-Secret pruefen
  ├── 2. Unklassifizierte E-Mails laden (classification = 'unclassified', LIMIT 20)
  │
  ├── 3. PASS 1: Regelbasierte Klassifikation (kostenlos, schnell)
  │      ├── Auto-Submitted Header → classification = 'auto_reply'
  │      ├── List-Unsubscribe Header → classification = 'newsletter'
  │      ├── from_address in Spam-Liste → classification = 'spam'
  │      ├── from_address = bekannter Kontakt + offener Deal → priority = 'dringend'
  │      ├── from_address = bekannter Kontakt → classification = 'antwort', priority = 'normal'
  │      └── Subject enthaelt 'Re:'/'AW:' → classification = 'antwort'
  │
  ├── 4. Wenn classification noch 'unclassified' ODER priority unklar:
  │      └── PASS 2: Bedrock Klassifikation (kosten-relevant)
  │           ├── Prompt: E-Mail-Inhalt + CRM-Kontext (Deal, Kontakt, letzte Interaktion)
  │           ├── Output: { classification, priority, summary, suggested_actions[] }
  │           └── INSERT ai_action_queue fuer suggested_actions
  │
  ├── 5. email_messages UPDATE (classification, priority, gatekeeper_summary, analyzed_at)
  │
  └── 6. Wenn priority = 'dringend': (spaetere Erweiterung: Push-Notification)
```

### Bedrock Prompt fuer E-Mail-Klassifikation

```
Input:
- E-Mail Subject, Body (max 2000 Zeichen), From, Date
- Kontakt-Info (wenn gemacht): Name, Firma, Rolle, letzte Interaktion
- Deal-Info (wenn vorhanden): Stage, Wert, offene Angebote

Output-Schema:
{
  classification: 'anfrage' | 'antwort' | 'auto_reply' | 'newsletter' | 'intern' | 'spam',
  priority: 'dringend' | 'normal' | 'niedrig' | 'irrelevant',
  summary: string (max 100 Zeichen),
  suggested_actions: [
    { type: 'reply' | 'followup' | 'meeting' | 'task', description: string }
  ]
}
```

## KI-Wiedervorlagen Flow (FEAT-407)

```
/api/cron/followups (alle 6h)
  │
  ├── 1. Cron-Secret pruefen
  ├── 2. Bestehende pending Vorschlaege zaehlen (max 20 aktive)
  ├── 3. CRM-Daten analysieren:
  │      ├── Deals ohne Aktion seit >14 Tagen
  │      ├── Offene Angebote seit >7 Tagen
  │      ├── Kontakte ohne Interaktion seit >30 Tagen
  │      ├── Unbeantwortete E-Mails seit >3 Tagen (FEAT-405)
  │      └── Multiplikatoren ohne Follow-up seit >21 Tagen
  │
  ├── 4. Deduplizierung: dedup_key pruefen (kein Vorschlag wenn identischer pending)
  │
  ├── 5. Pro Kandidat: Bedrock-Begruendung generieren
  │      └── "Deal X seit 14 Tagen ohne Aktion, Angebot seit 5 Tagen offen"
  │
  ├── 6. INSERT ai_action_queue (source = 'followup_engine')
  │
  └── 7. Response: { generated: N, skipped_dedup: N }
```

### Freigabe-Workflow (UI in Mein Tag)

```
Mein Tag → KI-Wiedervorlagen Sektion
  │
  ├── Vorschlag anzeigen: Beschreibung + Begruendung + Kontext-Link
  │
  ├── [Freigeben] → status = 'approved' → Task erstellen (tasks Tabelle)
  ├── [Verschieben] → Datum-Picker → expires_at aktualisieren
  └── [Abbrechen] → status = 'rejected' → ai_feedback INSERT (reason optional)
```

## Cal.com Integration Flow (FEAT-406)

### Docker-Setup

```yaml
# docker-compose.yml Erweiterung
calcom:
  image: calcom/cal.com:latest
  environment:
    - DATABASE_URL=postgresql://calcom:password@calcom-db:5432/calcom
    - NEXTAUTH_SECRET=${CALCOM_SECRET}
    - CALENDSO_ENCRYPTION_KEY=${CALCOM_ENCRYPTION_KEY}
    - NEXT_PUBLIC_WEBAPP_URL=https://cal.strategaizetransition.com
  ports:
    - "3100:3000"
  depends_on:
    - calcom-db
  networks:
    - business-net

calcom-db:
  image: postgres:15-alpine
  environment:
    - POSTGRES_USER=calcom
    - POSTGRES_PASSWORD=${CALCOM_DB_PASSWORD}
    - POSTGRES_DB=calcom
  volumes:
    - calcom-db-data:/var/lib/postgresql/data
  networks:
    - business-net
```

### Cal.com eigene PostgreSQL (DEC-034)

Cal.com bekommt eine **eigene PostgreSQL-Instanz** (nicht shared mit Supabase):
- Cal.com hat eigenes Prisma-Schema das mit Supabase-Schema kollidieren wuerde
- Isolation: Cal.com-Probleme betreffen nicht die Business-DB
- Upgrade: Cal.com kann unabhaengig aktualisiert werden
- RAM-Kosten: PostgreSQL 15 Alpine braucht ca. 50-100 MB zusaetzlich

### Sync-Flow

```
Cal.com Webhook → POST /api/webhooks/calcom
  │
  ├── Event: BOOKING_CREATED
  │   ├── Booking-Daten parsen (Titel, Zeit, Teilnehmer, Meeting-Link)
  │   ├── Teilnehmer-E-Mail → Kontakt matchen (contact_matcher.ts)
  │   └── INSERT calendar_events (source='calcom', external_id=booking_id)
  │
  ├── Event: BOOKING_CANCELLED
  │   └── calendar_events DELETE WHERE external_id = booking_id
  │
  └── Event: BOOKING_RESCHEDULED
      └── calendar_events UPDATE (start_time, end_time)
```

### Gesamtkalender-Ansicht

```
/kalender (V4 NEU)
  │
  ├── Datenquellen:
  │   ├── calendar_events WHERE source = 'manual' (bestehend)
  │   ├── calendar_events WHERE source = 'calcom' (Cal.com Sync)
  │   └── meetings (bestehende Meetings → als Events darstellen)
  │
  ├── Ansichten:
  │   ├── Tagesansicht (Default)
  │   ├── Wochenansicht
  │   └── Monatsansicht
  │
  └── Aktionen:
      ├── Event erstellen (manual)
      ├── Event bearbeiten (nur manual)
      ├── Booking-Link kopieren (Cal.com Events)
      └── Klick auf Event → Detail mit Deal-/Kontakt-Kontext
```

## Auto-Reply Detection Flow (FEAT-410)

```
Teil des Classify-Cron (/api/cron/classify)
  │
  ├── Wenn classification = 'auto_reply':
  │   ├── 1. Abwesenheits-Zeitraum extrahieren
  │   │      ├── Regex: "vom X bis Y", "until DATE", "zurueck am DATE"
  │   │      └── Fallback: Bedrock-Extraktion wenn Regex fehlschlaegt
  │   │
  │   ├── 2. Kontakt identifizieren (from_address → contact_id)
  │   │
  │   ├── 3. Aktive Wiedervorlagen fuer Kontakt suchen
  │   │      └── ai_action_queue WHERE entity_type='contact' AND entity_id=contact_id
  │   │                           AND status='pending' AND type='followup'
  │   │
  │   └── 4. Wenn Wiedervorlage existiert + Rueckkehr-Datum bekannt:
  │          ├── Wiedervorlage verschieben (expires_at = rueckkehr_datum + 1 Tag)
  │          └── INSERT ai_action_queue (type='info', description='Auto-Reply erkannt...')
  │
  └── Kein Rueckkehr-Datum → Default: Wiedervorlage + 7 Tage
```

## Mein Tag V4 — Erweiterungen

```
┌─────────────────────────────────────────────────────────────┐
│ Mein Tag                                     [KI-Workspace] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─── KI-Gatekeeper ───────────────────────────── V4 NEU ──┐│
│ │ 📧 3 dringende │ 5 normale │ 2 irrelevante E-Mails      ││
│ │ [Alle anzeigen →]                                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─── KI-Wiedervorlagen ──────────────────────── V4 NEU ──┐│
│ │ Deal "Firma X": Seit 14d ohne Aktion    [✓] [⏰] [✗]   ││
│ │ Kontakt "Herr Y": Follow-up faellig     [✓] [⏰] [✗]   ││
│ │ Angebot "Projekt Z": 7d offen           [✓] [⏰] [✗]   ││
│ │                                     [Alle freigeben]     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─── Kalender (bestehend, Daten jetzt aus Cal.com) ──────┐│
│ │ 09:00 Meeting Firma A (Cal.com)                         ││
│ │ 11:00 Call Herr B                                       ││
│ │ 14:00 Workshop (blockiert)                              ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─── Meeting-Prep │ Aufgaben │ Tageseinschaetzung ───────┐│
│ │ (bestehend, unveraendert)                                ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## V4 API Routes

### Neue API Routes

| Route | Methode | Zweck | Auth |
|---|---|---|---|
| `/api/cron/imap-sync` | POST | IMAP E-Mail-Sync | CRON_SECRET |
| `/api/cron/classify` | POST | E-Mail Batch-Klassifikation | CRON_SECRET |
| `/api/cron/followups` | POST | KI-Wiedervorlagen generieren | CRON_SECRET |
| `/api/cron/retention` | POST | E-Mail Retention Cleanup | CRON_SECRET |
| `/api/cron/meeting-recording-poll` | POST | Jibri-MP4 Upload nach Supabase Storage (alle 2 Min) | CRON_SECRET |
| `/api/cron/call-processing` | POST | Asterisk-WAV → Upload + Whisper + Bedrock Summary + Activity (alle 2 Min, V5.1/SLC-514) | CRON_SECRET |
| `/api/cron/recording-retention` | POST | Meeting + Call Recordings >30d loeschen (taeglich 04:00 UTC, V5.1-Erweiterung) | CRON_SECRET |
| `/api/webhooks/calcom` | POST | Cal.com Webhook Receiver | CALCOM_WEBHOOK_SECRET |

### Bestehende API Routes (erweitert)

| Route | Erweiterung |
|---|---|
| `/api/ai/query` | Neue Query-Types: `email-classify`, `followup-suggest`, `management-analysis` |

## V4 Docker Compose Aenderungen

```yaml
# Neue Services in docker-compose.yml

calcom:
  image: calcom/cal.com:latest
  environment:
    DATABASE_URL: postgresql://calcom:${CALCOM_DB_PASSWORD}@calcom-db:5432/calcom
    NEXTAUTH_SECRET: ${CALCOM_SECRET}
    CALENDSO_ENCRYPTION_KEY: ${CALCOM_ENCRYPTION_KEY}
    NEXT_PUBLIC_WEBAPP_URL: https://cal.strategaizetransition.com
  ports:
    - "3100:3000"
  depends_on:
    - calcom-db
  networks:
    - business-net
  restart: unless-stopped

calcom-db:
  image: postgres:15-alpine
  environment:
    POSTGRES_USER: calcom
    POSTGRES_PASSWORD: ${CALCOM_DB_PASSWORD}
    POSTGRES_DB: calcom
  volumes:
    - calcom-db-data:/var/lib/postgresql/data
  networks:
    - business-net
  restart: unless-stopped

# Neue Volumes
volumes:
  calcom-db-data:
```

### Neue Dependencies (package.json)

```json
{
  "imapflow": "^1.0.160",
  "mailparser": "^3.7.1"
}
```

## V4 Env Vars — Neue Variablen

```bash
# IMAP (V4 NEU)
IMAP_HOST=imap.ionos.de
IMAP_PORT=993
IMAP_USER=...                          # IONOS E-Mail-Adresse
IMAP_PASSWORD=...                      # IONOS Passwort
IMAP_TLS=true

# Cron (V4 NEU)
CRON_SECRET=...                        # Schutz fuer /api/cron/* Endpoints

# Cal.com (V4 NEU)
CALCOM_SECRET=...                      # NextAuth Secret fuer Cal.com
CALCOM_ENCRYPTION_KEY=...              # Cal.com Encryption Key
CALCOM_DB_PASSWORD=...                 # Cal.com PostgreSQL Passwort
CALCOM_API_KEY=...                     # Cal.com API Key fuer Sync
CALCOM_WEBHOOK_SECRET=...              # Webhook-Verifizierung
CALCOM_BASE_URL=http://calcom:3000     # Interner URL (Container-zu-Container)
NEXT_PUBLIC_CALCOM_URL=https://cal.strategaizetransition.com  # Externer URL

# Recording (V4.1 SLC-415 NEU; V5.2 FEAT-521: Default auf 7 reduziert, DSGVO-Datensparsamkeit)
RECORDING_RETENTION_DAYS=7             # Tage bis Recording-Loeschung (V5.2 Default 7, vorher 30, DEC-043)
```

## V4 Server Sizing

### Aktuell (CPX32): 4 vCPU, 8 GB RAM

| Container | RAM (geschaetzt) |
|---|---|
| Next.js App | ~500 MB |
| PostgreSQL (Supabase) | ~500 MB |
| Kong | ~100 MB |
| GoTrue | ~50 MB |
| PostgREST | ~50 MB |
| Storage | ~100 MB |
| Studio | ~200 MB |
| **Summe bestehend** | **~1.5 GB** |

### V4 Zusaetzlich

| Container | RAM (geschaetzt) |
|---|---|
| Cal.com | ~500-800 MB |
| Cal.com PostgreSQL | ~100 MB |
| IMAP-Sync (kein eigener Container, laeuft in Next.js) | ~50 MB |
| **Summe V4 neu** | **~650-950 MB** |

### Gesamt-Schaetzung: ~2.2-2.5 GB von 8 GB

**Empfehlung:** CPX32 reicht fuer V4 Start. Upgrade auf CPX42 (8 vCPU, 16 GB) empfohlen wenn:
- Cal.com + Business System gleichzeitig hohe Last erzeugen
- E-Mail-Volumen >100 E-Mails/Tag
- LLM-Batch-Klassifikation regelmaessig >20 E-Mails verarbeitet

## V4 Security / Privacy

### EU-only Datenhaltung

```
E-Mail-Empfang:  IONOS (Deutschland) → imap.ionos.de
E-Mail-Speicher: Hetzner (Deutschland) → PostgreSQL
KI-Analyse:      AWS Bedrock (Frankfurt, eu-central-1)
Kalender:        Hetzner (Deutschland) → Cal.com Self-Hosted
```

### IMAP-Credentials
- In Docker Environment Variables (Coolify Secrets)
- Nicht im Image, nicht im Repository
- IONOS regulaeres Passwort oder App-Passwort

### E-Mail-Retention
- 90-Tage Default (konfigurierbar via IMAP_RETENTION_DAYS)
- Automatische Loeschung via Cron
- Body und Attachments werden geloescht, Metadaten (Subject, From, Date) optional behalten

### Cron-Endpoint-Schutz
- CRON_SECRET Header auf allen /api/cron/* Routes
- Kein oeffentlicher Zugang zu Background Jobs
- Coolify Cron Jobs senden Secret automatisch

### Cal.com Webhook-Verifizierung
- CALCOM_WEBHOOK_SECRET fuer Signatur-Check
- Nur verifizierte Webhooks werden verarbeitet

## V4 Constraints & Tradeoffs

| Entscheidung | Tradeoff |
|---|---|
| Cron-API statt Worker-Container | Einfacher, aber kein garantiertes Delivery. Fuer Single-User akzeptabel. |
| Eigene Cal.com PostgreSQL | Extra Container, aber saubere Isolation von Supabase |
| IMAP Polling statt PUSH (IDLE) | Bis zu 5 Min Delay. IDLE ist komplexer (dauerhafte Verbindung). Fuer Single-User OK. |
| E-Mail-Body in PostgreSQL statt Object Storage | Einfacher, aber DB waechst. Retention Policy begrenzt auf 90 Tage. |
| Zwei-Pass-Klassifikation | Regelbasiert zuerst spart Bedrock-Kosten, aber doppelte Logik zu pflegen |
| imapflow statt imap-simple | Modernere Library, besser maintained, aber weniger Stack-Overflow-Antworten |
| email_messages neben bestehender emails Tabelle | Zwei E-Mail-Tabellen (inbound vs outbound). Spaeter: Migration in eine Tabelle. |

## V4 Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| IONOS IMAP-Rate-Limiting | Niedrig | Mittel | 5-Min-Intervall ist konservativ, Retry bei 429 |
| Cal.com Self-Hosted Instabilitaet | Mittel | Mittel | Community Edition ist stabil, Monitoring, Fallback auf manuellen Kalender |
| IMAP-Threading falsche Zuordnung | Mittel | Niedrig | In-Reply-To ist zuverlaessig, Subject-Fallback als Backup |
| Cron-Job verpasst (Coolify Restart) | Niedrig | Niedrig | Inkrementeller Sync holt alles nach, kein Datenverlust |
| Bedrock-Kosten bei vielen E-Mails | Mittel | Mittel | Zwei-Pass: Regel zuerst, Bedrock nur fuer unklare, Max 20/Batch |
| Zwei PostgreSQL-Instanzen auf einem Server | Niedrig | Niedrig | Cal.com DB ist klein, Alpine Image minimal |

## Recommended Next Step

`/slice-planning` — Die 6 V4-Features in implementierbare Slices schneiden. Empfohlene Reihenfolge: IMAP-Sync → Gatekeeper → Wiedervorlagen → Auto-Reply → Cal.com → Management-Cockpit.

---

# V4.1 Architektur — Meeting Intelligence Basis

> **Status 2026-04-16:** Jitsi-Stack (jitsi-web, prosody, jicofo, jvb, jibri auf stable-9258) **deployed** auf `meet.strategaizetransition.com`. Jibri-Server-Recording produziert MP4 im `jitsi-recordings` Shared-Volume. SLC-412 done, QA PASS (RPT-120). Host-Prerequisite: `linux-modules-extra` mit snd-aloop Kernel-Modul installiert (Hetzner-Cloud-Default fehlt). Weitere V4.1-Slices (Whisper-Adapter, Meeting-Start, Upload, Summary, Reminders, Push, KI-Agenda) folgen.

## V4.1 Architecture Summary

V4.1 erweitert die Hetzner-Business-Instanz um eine Meeting-Aufzeichnungs-, Transkriptions- und Summary-Pipeline. Self-hosted **Jitsi + Jibri** liefern Browser-Video-Meetings inkl. Recording. Ein **Whisper-Adapter** (Library-Abstraktion in `/lib/ai/transcription`) speist Aufzeichnungen an OpenAI Whisper API (V4.1) — Provider-Switch auf Azure/Self-hosted via ENV ohne Code-Rewrite (DEC-035, DEC-041). Bedrock Claude Sonnet 4 (bestehender LLM-Layer) erzeugt strukturierte Summaries, die als Meeting-Activity in der Deal-Timeline landen.

Parallel dazu: **DSGVO-Einwilligungsflow** (Public-Page `/consent/{token}`, Audit-Log, Consent-Check vor Recording-Start) und **Meeting-Erinnerungen** (extern via .ics+E-Mail, intern via Browser-Push, KI-Agenda via Bedrock).

Alle neuen Services laufen auf dem bestehenden CPX32 (Upgrade auf CPX42 bei Engpass). Die bestehende Infrastruktur (Supabase, Kong, Bedrock, SMTP, IMAP, Cal.com) bleibt unveraendert — V4.1 ist additiv.

## V4.1 Main Components

```
Browser (User)                           Hetzner CPX32 (shared)
─────────────────                        ────────────────────────────────
Business App UI      ───────► Next.js App (Port 3000)
  ├── Deal-Workspace                     ├── /app/consent/[token]  (NEU V4.1)
  │    └── "Meeting starten"             ├── /app/deals/[id]/meeting/new (NEU)
  ├── Meeting-Detail                     ├── /lib/ai/transcription/     (NEU)
  │    └── Recording-Status              │     ├── provider.ts (Interface)
  ├── Settings                           │     ├── openai.ts   (V4.1)
  │    └── Reminder + Agenda             │     └── factory.ts  (ENV-Switch)
  └── Push-Subscription                  ├── /lib/ai/bedrock/meeting-summary.ts (NEU)
        (Service Worker)                 ├── /lib/meetings/
                                         │     ├── reminders.ts (.ics-Builder)
                                         │     └── agenda.ts    (KI-Agenda)
Jitsi Meet UI (separater Pfad)           └── /api/cron/meeting-reminders (NEU)
  meet.strategaizetransition.com         └── /api/cron/meeting-recording-poll (NEU)
  ├── Video / Audio                      └── /api/cron/recording-retention (NEU)
  ├── Share Screen                       └── /api/push/subscribe (NEU)
  └── Jibri-Start (JWT-signed)           └── /api/meetings/[id]/start (NEU)

                                         Jitsi Stack (NEU V4.1, Docker Compose)
                                         ├── jitsi-web        (nginx)
                                         ├── jitsi-prosody    (XMPP)
                                         ├── jitsi-jicofo     (focus)
                                         ├── jitsi-jvb        (videobridge)
                                         └── jitsi-jibri      (recording)
                                               ├── Chrome headless
                                               ├── XOrg
                                               └── ffmpeg → /recordings volume

                                         Cron Worker (NEU)
                                         └── jibri-upload-watch: shared volume
                                              → Supabase Storage (EU)

External
────────
OpenAI Whisper API (US, DEC-019)  ◄──── /lib/ai/transcription/openai.ts
AWS Bedrock (Frankfurt)           ◄──── /lib/ai/bedrock (bestehend)
SMTP (IONOS)                      ◄──── /lib/email (bestehend)
Web Push Service (Browser/FCM)    ◄──── /lib/push (NEU, web-push npm)
```

## V4.1 Responsibilities

| Komponente | Verantwortung |
|---|---|
| Next.js App | Meeting-Create, Consent-Page, Deal-UI, Settings-UI, Cron-Endpoints, LLM-Orchestrierung |
| Jitsi Web + Prosody + Jicofo + JVB | Browser-Meeting-Session (Video/Audio/Screen-Share) mit JWT-Auth |
| Jibri | Headless-Chrome-basierte Aufzeichnung in MP4 auf Shared Volume (DEC-045) |
| Whisper-Adapter (Library) | Abstrakter `transcribe(audioFile)` Call, Provider-Switch via ENV |
| OpenAI Whisper API | Deutsche Transkription in V4.1 (DEC-019, akzeptiert) |
| Bedrock Claude Sonnet 4 | Summary-Generation (Outcome/Decisions/Actions/Next-Step), KI-Agenda-Vorbereitung |
| Supabase Storage (EU) | Persistente Ablage von Rohaufzeichnungen (30d-Retention) + permanente Artefakte |
| Audit-Log Tabelle | Consent-Lifecycle-Events mit IP-Hash |
| Cron-API-Routes | Reminder-Versand, Recording-Upload-Watch, Retention-Cleanup |

## V4.1 Data Model — Schema-Erweiterungen

### Tabellen-Erweiterung: contacts (FEAT-411, DEC-038)

| Feld | Typ | Beschreibung |
|---|---|---|
| consent_status | TEXT | `pending` (Default) / `granted` / `declined` / `revoked` |
| consent_date | TIMESTAMPTZ | Zeitpunkt letzter Aenderung |
| consent_source | TEXT | `email_link` / `manual` / `imported` / `ad_hoc` |
| consent_token | TEXT | URL-safe 32-byte hex, nullbar (null = abgelaufen) |
| consent_token_expires_at | TIMESTAMPTZ | Ablauf 30 Tage nach Anfrage |
| consent_requested_at | TIMESTAMPTZ | Zeitpunkt der Consent-Anfrage |

Bestand-Kontakte erhalten `consent_status = 'pending'` per Default nach MIG-011.

### Tabellen-Erweiterung: meetings (FEAT-404 + FEAT-409)

| Feld | Typ | Beschreibung |
|---|---|---|
| jitsi_room_name | TEXT | Generierter Raum-Name `deal-{dealId}-{ts}` |
| recording_url | TEXT | Supabase Storage Path (null bis Upload abgeschlossen) |
| recording_status | TEXT | `not_recording` / `pending` / `recording` / `uploading` / `completed` / `failed` / `deleted` |
| recording_started_at | TIMESTAMPTZ | Start Jibri-Recording |
| recording_duration_seconds | INT | Dauer (nach Upload) |
| transcript_status | TEXT | `pending` / `processing` / `completed` / `failed` |
| summary_status | TEXT | `pending` / `processing` / `completed` / `failed` |
| ai_summary | JSONB | `{outcome, decisions[], action_items[], next_step}` |
| ai_agenda | TEXT | Vorgenerierte KI-Agenda (bei Setting `auto`) |
| ai_agenda_generated_at | TIMESTAMPTZ | Zeitpunkt Generierung |
| reminders_sent | JSONB | `[{type, recipient, sent_at}]` fuer Idempotenz |

Das bestehende `transcript TEXT`-Feld aus MIG-005 wird aktiviert (war bisher leer).

### Tabellen-Erweiterung: activities

| Feld | Typ | Beschreibung |
|---|---|---|
| ai_generated | BOOLEAN | Default `false`. `true` bei KI-erzeugten Timeline-Eintraegen (Meeting-Summary, Insights). |

### Neue Tabelle: user_settings (FEAT-409)

1:1-Relation zu `profiles.id`. Separater Table statt `profiles`-Erweiterung, damit zukuenftige User-Settings additiv wachsen koennen.

| Feld | Typ | Beschreibung |
|---|---|---|
| user_id | UUID PRIMARY KEY REFERENCES profiles(id) | |
| meeting_reminder_external_hours | INT[] | Default `{24, 2}` |
| meeting_reminder_internal_enabled | BOOLEAN | Default `false` (nicht nerven) |
| meeting_reminder_internal_minutes | INT | Default `30` |
| meeting_agenda_mode | TEXT | `auto` / `on_click` / `off`, Default `on_click` (Bedrock-Kosten) |
| push_subscription | JSONB | Web-Push Subscription-Object (endpoint + keys), null = nicht abonniert |
| created_at / updated_at | TIMESTAMPTZ | |

### Audit-Log-Erweiterung (bestehende audit_log-Tabelle, DEC-024)

Neue `action`-Werte: `consent_requested`, `consent_granted`, `consent_declined`, `consent_revoked`, `recording_started`, `recording_completed`, `recording_failed`, `transcript_generated`, `summary_generated`.

`audit_log.changes` JSONB enthaelt bei Consent-Events zusaetzlich: `ip_hash` (SHA256), `user_agent_hash` (SHA256).

Public-Page-Aktionen (kein authentifizierter User) werden mit `actor_id = null` und `changes.actor_label = 'public'` geloggt.

## V4.1 Recording-Pipeline (Flow)

```
1. User klickt "Meeting starten" im Deal-Workspace
   └── POST /api/meetings/[id]/start
        ├── Erzeugt meetings-Row (falls neu)
        ├── Generiert jitsi_room_name = deal-{id}-{ts}
        ├── Prueft consent_status aller verknuepften contacts
        ├── Baut JWT fuer Jitsi (tenant=business, room, moderator-flag)
        ├── Sendet Einladung + .ics an externe Teilnehmer (FEAT-409)
        └── Redirect: https://meet.strategaizetransition.com/{room}?jwt={token}

2. Jitsi-Meeting laeuft im Browser
   └── Wenn alle consent_status='granted': Server-seitig "start recording"
        ├── Jicofo instruiert Jibri via XMPP
        ├── Jibri startet Chrome headless, verbindet als Lurker-Teilnehmer
        ├── ffmpeg schreibt MP4 nach /recordings/{room}.mp4 (shared volume)
        └── meetings.recording_status = 'recording', recording_started_at = now()

3. Meeting endet (letzter Teilnehmer verlaesst Raum)
   └── Jibri stoppt automatisch, finalisiert MP4

4. Cron /api/cron/meeting-recording-poll (alle 2 Minuten)
   └── Liest /recordings Volume, sucht neue MP4s
        ├── Upload nach Supabase Storage (Bucket: meeting-recordings, EU)
        ├── meetings.recording_url = storage_path
        ├── meetings.recording_status = 'completed'
        ├── recording_duration_seconds aus ffprobe
        └── Triggert Transkription

5. Transkription (Background-Job im gleichen Cron oder separate Route)
   └── transcriptionProvider.transcribe(recording_url)
        ├── meetings.transcript_status = 'processing'
        ├── Whisper-Adapter laedt File, ruft OpenAI Whisper API
        ├── transcript TEXT → meetings.transcript
        ├── meetings.transcript_status = 'completed'
        └── Triggert Summary

6. Summary-Generation
   └── bedrockClient.meetingSummary(transcript, deal_context)
        ├── meetings.summary_status = 'processing'
        ├── Bedrock Claude Sonnet 4, JSON-structured Output
        ├── meetings.ai_summary = {...}
        ├── meetings.summary_status = 'completed'
        └── Activity-Insert: {source_type='meeting', source_id=meetingId, ai_generated=true, body=ai_summary.outcome}

7. Retention-Cron /api/cron/recording-retention (taeglich)
   └── Loescht recording_url wenn recording_started_at < now() - RECORDING_RETENTION_DAYS
        ├── Supabase Storage Remove
        ├── meetings.recording_status = 'deleted'
        └── transcript + ai_summary bleiben permanent
```

**Fehler-Handling:** Bei Whisper 429 / 5xx: Exponential Backoff (3 Versuche, 10s/30s/90s). Bei finaler Fehlschlag: `transcript_status = 'failed'`, User sieht Retry-Button im Deal-Workspace. Aufzeichnung bleibt erhalten (nicht vor manueller Freigabe loeschen).

## V4.1 Whisper-Adapter-Layer (DEC-035, DEC-041)

### Interface

```ts
// /lib/ai/transcription/provider.ts
export interface TranscriptionProvider {
  transcribe(
    audio: Buffer | ReadableStream | URL,
    options?: { language?: string; meetingId?: string }
  ): Promise<TranscriptionResult>
}

export interface TranscriptionResult {
  transcript: string
  language: string
  durationSeconds: number
  providerMetadata?: Record<string, unknown>
}
```

### Provider-Implementierungen

| Provider | Datei | Aktiv in V4.1 |
|---|---|---|
| OpenAI Whisper | `/lib/ai/transcription/openai.ts` | Ja |
| Azure Whisper (EU) | `/lib/ai/transcription/azure.ts` | Platzhalter, nicht implementiert |
| Self-hosted (Blueprint-Style) | `/lib/ai/transcription/selfhosted.ts` | Platzhalter, nicht implementiert |

### Factory + ENV

```ts
// /lib/ai/transcription/factory.ts
export function getTranscriptionProvider(): TranscriptionProvider {
  switch (process.env.TRANSCRIPTION_PROVIDER) {
    case 'azure':       return new AzureWhisperProvider(...)       // V4.x+ später
    case 'selfhosted':  return new SelfHostedWhisperProvider(...)  // V4.x+ später
    case 'openai':
    default:            return new OpenAIWhisperProvider(...)
  }
}
```

Business-Code ruft ausschliesslich `getTranscriptionProvider().transcribe(...)`. Kein direkter OpenAI-SDK-Import ausserhalb von `openai.ts`.

### Language-Detection

Default `de`. OpenAI Whisper unterstuetzt Auto-Detect. V4.1 setzt `language='de'` explizit (User hat deutschsprachiges Business). Auto-Detect wird in V4.x+ aktiviert, wenn erste englische Meetings auftreten.

## V4.1 DSGVO-Consent-Flow (FEAT-411)

### URL-Struktur

Public-Consent-Page unter `/consent/{token}`. Widerruf unter `/consent/{token}/revoke`. Next.js App-Router: `app/consent/[token]/page.tsx` + `app/consent/[token]/revoke/page.tsx`.

Middleware-Whitelist: `/consent/*` ist nicht-authentifizierter Pfad (wie bereits `/api/cron/*`). Kein Supabase-Session-Check.

### Token-Format

`crypto.randomBytes(32).toString('hex')` → 64-char URL-safe Token. Kryptografisch zufaellig, nicht ratbar, kollisionsarm (2^256 Raum).

### Rate-Limiting

In-Memory-Rate-Limiter fuer Next.js Server Actions: 100 Requests/IP/Stunde auf `/consent/*`. IP aus `x-forwarded-for` Header (Coolify-Proxy setzt diesen). Bei Ueberschreitung: HTTP 429 mit `Retry-After`.

### IP-Minimierung

`ip_hash = SHA256(ip + DAILY_SALT)` wird in `audit_log.changes.ip_hash` gespeichert. Plain-IP wird nicht persistiert. `DAILY_SALT` rotiert taeglich (Env Var oder abgeleitet aus Datum + Secret) — verhindert Cross-Day-Korrelation.

### Flow

```
1. User auf Kontakt-Detail-Seite klickt "Einwilligung anfragen"
   └── Server Action createConsentRequest(contactId)
        ├── token = crypto.randomBytes(32).toString('hex')
        ├── contact.consent_token = token
        ├── contact.consent_token_expires_at = now() + 30 days
        ├── contact.consent_status = 'pending' (falls noch nicht)
        ├── contact.consent_requested_at = now()
        ├── audit_log insert (consent_requested)
        └── SMTP-Versand: Template 'consent-request-de' mit Link
             https://business.strategaizetransition.com/consent/{token}

2. Kontakt oeffnet Link → /consent/{token}
   └── Server-side load: Kontakt via token, prueft expiry
        ├── Zeigt: Kontakt-Name, DSGVO-Erklaerung, Datenschutz-Link, Widerruf-Hinweis
        └── Zwei Buttons: "Ich stimme zu" / "Ich lehne ab"

3. Klick "Ich stimme zu"
   └── Server Action grantConsent(token)
        ├── Rate-Limit-Check
        ├── contact.consent_status = 'granted'
        ├── contact.consent_date = now()
        ├── contact.consent_source = 'email_link'
        ├── audit_log insert (consent_granted, ip_hash, ua_hash)
        └── Bestaetigungsseite

4. Widerruf via /consent/{token}/revoke
   └── Analog, setzt consent_status = 'revoked', audit_log (consent_revoked)

5. Manueller Widerruf durch User im Kontakt-Workspace
   └── Server Action revokeConsent(contactId)
        ├── contact.consent_status = 'revoked'
        ├── consent_source = 'manual'
        └── audit_log (consent_revoked, actor_id=userId)
```

### Ad-hoc-Teilnehmer ohne Kontakt (DEC-044)

Wenn im Jitsi-Meeting ein E-Mail-Teilnehmer auftaucht, der nicht in `contacts` existiert (z.B. geleitetes Meeting-Invite):
- Beim Meeting-Start: System erkennt unbekannte E-Mail-Adresse
- Automatisches Anlegen: `INSERT INTO contacts (email, display_name, consent_status='pending', consent_source='ad_hoc')`
- Recording startet **nicht** (mindestens ein Teilnehmer ohne `granted`)
- UI-Hinweis im Deal-Workspace: "Aufzeichnung deaktiviert — Einwilligung fehlt fuer {ad-hoc-Email}"
- User kann den Ad-hoc-Kontakt anschliessend mit Deal verknuepfen und Consent-Anfrage ausloesen

Das haelt Consent-Status konsistent zur bestehenden V4-IMAP-Logik (neue E-Mail-Adressen werden auch dort auto-angelegt).

## V4.1 Meeting-Reminder-Pipeline (FEAT-409)

### Cron-Endpunkt

`/api/cron/meeting-reminders` laeuft alle 5 Minuten (Coolify Cron). Geschuetzt via `CRON_SECRET`.

### Logik

```
For each meeting WHERE scheduled_at BETWEEN now() AND now() + 25h
  AND recording_status != 'deleted':

  # A) Externe Reminder
  For each contact in meeting.contacts:
    For each hours in user.meeting_reminder_external_hours (Default [24, 2]):
      If (scheduled_at - now()) ≈ hours * 3600s (+- 5min Fenster)
         AND reminders_sent NOT CONTAINS {type: 'external', contact_id, hours}:
         - SMTP-Versand Reminder-Template
         - append {type, contact_id, hours, sent_at} to reminders_sent

  # B) Interne Reminder
  user_setting = user_settings WHERE user_id = meeting.owner_id
  If user_setting.meeting_reminder_internal_enabled
     AND (scheduled_at - now()) ≈ user_setting.meeting_reminder_internal_minutes * 60s
     AND reminders_sent NOT CONTAINS {type: 'internal', user_id}:
     - Wenn user_setting.push_subscription: web-push.sendNotification(...)
     - Sonst: SMTP-Fallback
     - append to reminders_sent

  # C) KI-Agenda (auto)
  If user_setting.meeting_agenda_mode = 'auto'
     AND (scheduled_at - now()) < 25h
     AND meeting.ai_agenda IS NULL:
     - Bedrock-Call buildAgenda(dealId, meetingId)
     - meetings.ai_agenda = result
     - meetings.ai_agenda_generated_at = now()
```

Idempotenz durch `reminders_sent`-JSONB-Check. Cron kann verpasst werden (Coolify Restart) — naechster Lauf holt auf, keine Doppelung.

### .ics-Generation

Library: `ical-generator` (MIT, ~50KB). Pro Meeting: ein VEVENT mit:
- UID: `meeting-{meetingId}@business.strategaizetransition.com`
- DTSTART / DTEND mit `TZID=Europe/Berlin`
- SUMMARY (Meeting-Titel)
- DESCRIPTION (Kurzinfo + Meeting-Link)
- LOCATION (Jitsi-URL oder physischer Ort)
- ATTENDEE (alle Teilnehmer mit CN und MAILTO)

**DSGVO-Note:** `ATTENDEE`-Liste enthaelt alle Teilnehmer (E-Mail + Name). Das ist Standard-Praxis bei Business-Meeting-Einladungen und wird vom Empfaenger erwartet (sieht er auch in Google/Outlook). Keine sensitiveren Daten.

### Browser-Push

- Library: `web-push` npm package (MIT)
- VAPID-Keys: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` (mailto) in Env
- User abonniert ueber Settings-Seite: Frontend ruft Service Worker Push-Subscription → POST `/api/push/subscribe` → speichert in `user_settings.push_subscription`
- Service Worker (`/public/sw.js`) zeigt Notification-Popup mit Meeting-Titel + Link
- Fallback: wenn `push_subscription IS NULL` oder Push-Versand fehlschlaegt → SMTP

### KI-Agenda-Generation

Bedrock-Call via bestehendem LLM-Service-Layer. System-Prompt verlangt JSON-Output:

```json
{
  "last_communication": "...",
  "open_points": ["..."],
  "decision_makers": [{"name": "...", "role": "..."}],
  "suggested_goal": "..."
}
```

Context: Deal-Historie (Activities letzte 14d), Task-Liste (offen), Kontakte-Rollen. Single-Call, keine Agent-Loops. Typische Kosten: <0.10 EUR pro Agenda (gemaess FEAT-409 AC-13).

## V4.1 API Routes

### Neue API Routes

| Route | Zweck |
|---|---|
| `POST /api/meetings/[id]/start` | Meeting erstellen/aktivieren, JWT fuer Jitsi erzeugen, Einladungen triggern |
| `POST /api/meetings/[id]/generate-agenda` | On-click Bedrock-Agenda-Generation |
| `POST /api/meetings/[id]/retry-transcript` | Manueller Retry fuer failed transcripts |
| `POST /api/consent/[token]/grant` | Server Action: Einwilligung erteilen |
| `POST /api/consent/[token]/decline` | Server Action: Ablehnen |
| `POST /api/consent/[token]/revoke` | Server Action: Widerrufen |
| `POST /api/consent/request` | Authentifiziert: Consent-Anfrage fuer Kontakt anstossen |
| `POST /api/push/subscribe` | Web-Push-Subscription speichern |
| `DELETE /api/push/subscribe` | Push-Abo loeschen |
| `POST /api/cron/meeting-reminders` | Cron: 5-Min-Lauf fuer Reminder |
| `POST /api/cron/meeting-recording-poll` | Cron: 2-Min-Lauf fuer Jibri-Upload-Watch |
| `POST /api/cron/recording-retention` | Cron: taegliche Retention-Bereinigung |
| `POST /api/cron/pending-consent-renewal` | Cron: taeglich, Hinweis bei Pending >7 Tage |

### Neue Server Actions

- `createConsentRequest(contactId)` — Token generieren + Mail-Versand
- `startMeeting(dealId, contactIds[])` — Jitsi-Raum + JWT + Einladungen
- `saveUserSettings(settings)` — User-Einstellungen speichern

## V4.1 Docker Compose Aenderungen

Neue Services im `docker-compose.yml` (addditiv, auf shared `coolify` Network):

```yaml
# Jitsi Stack (shared mit Blueprint spaeter, DEC-036)
jitsi-web:
  image: jitsi/web:stable-9258
  ports:
    - "8443:443"  # hinter Traefik/Coolify Labels
  environment:
    - PUBLIC_URL=https://meet.strategaizetransition.com
    - ENABLE_AUTH=1
    - AUTH_TYPE=jwt
    - JWT_APP_ID=${JITSI_JWT_APP_ID}
    - JWT_APP_SECRET=${JITSI_JWT_APP_SECRET}
  volumes:
    - jitsi-web-config:/config

jitsi-prosody:
  image: jitsi/prosody:stable-9258
  volumes:
    - jitsi-prosody-config:/config
    - jitsi-prosody-plugins:/prosody-plugins-custom

jitsi-jicofo:
  image: jitsi/jicofo:stable-9258
  depends_on:
    - jitsi-prosody

jitsi-jvb:
  image: jitsi/jvb:stable-9258
  ports:
    - "10000:10000/udp"   # WebRTC Media (UDP, muss auf Hetzner-Firewall offen sein)
  depends_on:
    - jitsi-prosody

jitsi-jibri:
  image: jitsi/jibri:stable-9258
  restart: unless-stopped
  shm_size: 2gb                # Chrome braucht grossen /dev/shm
  cap_add: [SYS_ADMIN]         # Chrome sandbox
  volumes:
    - jitsi-recordings:/recordings
  depends_on:
    - jitsi-prosody
```

**Volumes:** `jitsi-web-config`, `jitsi-prosody-config`, `jitsi-prosody-plugins`, `jitsi-recordings` (shared zwischen Jibri und App fuer Upload-Watch).

**Coolify-Config:** `meet.strategaizetransition.com` als zweite Domain auf demselben Coolify-Projekt. Traefik-Labels fuer `jitsi-web` analog zu bestehenden Services.

**Firewall:** Port 10000/udp muss auf Hetzner-Cloud-Firewall eingehend offen sein (JVB Media).

**TURN/STUN:** In V4.1 kein eigener TURN-Server. Jitsi nutzt Public STUN (meet-jit-si-turnrelay.jitsi.net) als Fallback. Falls User hinter strengen NATs haengt: spaeter eigenen coturn Container nachruesten (BL-206-Nachbar).

### Neue Dependencies (package.json)

```json
{
  "ical-generator": "^7.0.0",
  "web-push": "^3.6.0",
  "fluent-ffmpeg": "^2.1.2",      // ffprobe fuer duration
  "jsonwebtoken": "^9.0.0",       // Jitsi JWT (evtl. schon da)
  "openai": "^4.x"                 // falls noch nicht in Deps
}
```

## V4.1 Env Vars — Neue Variablen

```
# Jitsi (V4.1 NEU)
JITSI_DOMAIN=meet.strategaizetransition.com
JITSI_JWT_APP_ID=business
JITSI_JWT_APP_SECRET=...                    # 32-byte random
JITSI_XMPP_DOMAIN=meet.jitsi

# Whisper (V4.1 NEU, DEC-035 Adapter)
TRANSCRIPTION_PROVIDER=openai               # openai | azure | selfhosted
OPENAI_API_KEY=sk-...                       # schon aus V3/V4 vorhanden
# Azure-Variables bleiben leer in V4.1
AZURE_WHISPER_ENDPOINT=
AZURE_WHISPER_KEY=

# Recording Retention (V4.1 NEU; V5.2 FEAT-521: Default auf 7 reduziert)
RECORDING_RETENTION_DAYS=7                  # konfigurierbar (V5.2 Default 7, vorher 30, DEC-043)
SUPABASE_STORAGE_RECORDINGS_BUCKET=meeting-recordings

# Browser Push (V4.1 NEU)
VAPID_PUBLIC_KEY=...                        # einmalig via web-push generate-vapid-keys
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@strategaizetransition.com

# Consent (V4.1 NEU)
CONSENT_DAILY_SALT=...                      # 32-byte random, rotiert via Cron
CONSENT_RATE_LIMIT_PER_HOUR=100
```

## V4.1 Server Sizing

### Aktuell (CPX32): 4 vCPU, 8 GB RAM

V4-Bestand (IMAP + Cal.com + Supabase + Next.js + Bedrock-Client): ~2.5 GB

### V4.1 Zusaetzlich

| Komponente | RAM | CPU |
|---|---|---|
| Jitsi Web (nginx) | ~50 MB | wenig |
| Jitsi Prosody | ~100 MB | wenig |
| Jitsi Jicofo (JVM) | ~300 MB | moderat waehrend Meeting |
| Jitsi JVB (JVM, media) | ~500-700 MB | hoch waehrend Meeting (1-2 vCPU Peak) |
| Jitsi Jibri (Chrome + XOrg + ffmpeg) | ~2.0-2.5 GB **pro Recording** | hoch (1 vCPU Peak) |
| ical-generator / web-push | vernachlaessigbar | |

**Ein paralleles Meeting + Recording:** ~3.5-4 GB zusaetzlich → Gesamt ~6-6.5 GB von 8 GB.

### Gesamt-Schaetzung: CPX32 reicht fuer 1 paralleles Meeting mit Recording

**Upgrade-Pfad:** Wenn regelmaessig 2+ Meetings parallel: Coolify-Server CPX32 → CPX42 (8 vCPU / 16 GB, ~15-20 EUR/Monat Aufpreis). Kein Code-Change, nur Hetzner-Resize + Coolify-Reboot.

**Idle-Kosten:** Jibri im Idle ~100 MB (Chrome noch nicht gestartet). Erst bei Recording-Start steigt der Verbrauch.

## V4.1 Security / Privacy

### EU-only Datenhaltung fuer Recording-Artefakte

- Rohaufzeichnungen: Supabase Storage (Hetzner EU) — nie US
- Transkript: PostgreSQL Hetzner
- Summary: PostgreSQL Hetzner
- **Ausnahme** (DEC-019 akzeptiert): OpenAI Whisper API (US-Region) fuer Transkription. Audio-File wird uebertragen, OpenAI speichert laut DPA nicht dauerhaft. Adapter-Pattern (DEC-035) erlaubt Wechsel auf EU-Provider ohne Feature-Rewrite.

### Jitsi JWT-Auth

Self-Hosted Jitsi ohne Auth wuerde Raeume oeffentlich zugaenglich machen. JWT-Auth (`ENABLE_AUTH=1`, `AUTH_TYPE=jwt`) sorgt dafuer, dass nur vom Business-System signierte Tokens Raum-Zugang erhalten. External invitees bekommen Token via Einladungs-Link.

### Consent-Token-Sicherheit

- 32-byte kryptografisch-zufaellig (`crypto.randomBytes`)
- Einmalig pro Anfrage; Ablauf nach 30 Tagen bei Pending
- Grant / Decline sind einmalige Aktionen (Token invalidiert nach Nutzung)
- Widerruf-Token bleibt wiederverwendbar (sonst kann Kontakt nicht widerrufen)
- Rate-Limit 100/Stunde/IP gegen Brute-Force

### IP-Minimierung

`ip_hash = SHA256(ip + daily_salt)` statt Plain-IP im Audit-Log. Daily-Salt-Rotation verhindert Re-Identifizierung ueber Tage.

### Bedrock-Kosten-Bewusstsein (feedback_bedrock_cost_control)

- KI-Agenda-Default: `on_click` (User muss bewusst klicken) — **nicht** `auto`
- Meeting-Summary ist unvermeidlich automatisch, aber pro Meeting nur 1 Bedrock-Call
- Retry-Logik limitiert auf 3 Versuche gegen Loops

### Recording-Retention (DEC-043, ab V5.2 reduziert via FEAT-521)

Rohaufzeichnungen: `RECORDING_RETENTION_DAYS=7` Default ab V5.2 (vorher 30, DSGVO-Datensparsamkeit), ENV-konfigurierbar. Retention-Cron laeuft taeglich 04:00 UTC, loescht abgelaufene `recording_url`-Dateien in Supabase Storage, markiert Meeting `recording_status='deleted'`. Transkript + Summary + Activities bleiben permanent in DB — nur Rohdaten werden frueher entfernt.

### Cal.com Integration (unveraendert)

V4.1 aendert Cal.com-Integration nicht. Cal.com bucht Meetings, V4.1 kann Jitsi-Raum als Location-URL in Cal.com Event-Type setzen. Verlinkung ist optional und kommt ggf. in einem V4.1-Slice als Polish.

## V4.1 Constraints & Tradeoffs

| Entscheidung | Tradeoff |
|---|---|
| Jitsi auf gleichem Server (DEC-040) | Spart 15-20 EUR/Monat, aber Ressourcen-Konkurrenz bei parallelen Recordings. Upgrade-Pfad dokumentiert. |
| Library-Adapter statt REST-Proxy (DEC-041) | Einfacher, kein Extra-Container; aber bei spaeterem Multi-Tenant schwerer zu sharen. Fuer V4.1 klar. |
| Public-URL unter `/consent/{token}` (DEC-042) | Kurz, lesbar; erfordert Middleware-Whitelist. Alternativ `/p/*` haette klarere Trennung. |
| 30 Tage Recording-Retention (DEC-043) | DSGVO-freundlich minimiert (nicht "unbefristet"). Risiko: User will irgendwann auf 90+ Tage — daher ENV-konfigurierbar. |
| Ad-hoc Auto-Contact (DEC-044) | Konsistent zu IMAP-Verhalten, aber erzeugt leichte Daten-"Reibung" (Pending-Kontakte ohne Deal-Verknuepfung). |
| Jibri-MP4 (DEC-045) | Jibri-Default, gute Kompatibilitaet mit ffprobe + OpenAI. WebM waere kleiner, aber nicht nativ unterstuetzt. |
| OpenAI Whisper in US (DEC-019 bestehend) | Qualitaet + Geschwindigkeit akzeptiert; Migrations-Pfad ueber Adapter offen. |
| Kein eigener TURN-Server in V4.1 | Einfacher Setup, funktioniert fuer ueblichen Netzwerk-Kontext. Risiko: manche Kunden-Netzwerke brauchen TURN — spaeter coturn nachruesten. |

## V4.1 Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| JVB UDP-Port 10000 blockiert (Hetzner Firewall) | Mittel | Blocker | Vor Slice-Start Firewall-Regel pruefen + anlegen |
| Jibri-Recording schlaegt fehl (Chrome crasht) | Mittel | Mittel | Jibri-Restart-Policy, Recording-Status failed, Retry-Button |
| Whisper 429 bei parallelem Meeting | Niedrig | Niedrig | Exponential Backoff 3x, OpenAI limits pro Minute sind hoch genug |
| Bedrock Context-Overflow bei 2h-Meetings | Niedrig | Niedrig | Sonnet 4 hat 200k Context, 2h deutsch = ~20k Tokens, OK |
| .ics falsch geparst in Outlook | Mittel | Mittel | ical-generator erzeugt RFC-5545; Test mit Outlook/Google/Apple vor Rollout |
| Push-Notification-Support in Safari iOS | Hoch | Niedrig | Safari Web Push funktioniert ab iOS 16.4 (add-to-home). Fallback SMTP. |
| Shared Volume /recordings wird voll | Niedrig | Mittel | Upload-Cron loescht lokale MP4 nach Upload; Volume-Monitoring |
| Consent-Mail landet im Spam | Mittel | Mittel | IONOS-SPF/DKIM existiert seit V3.1; Template-Wortwahl seriös halten |
| Ad-hoc Auto-Kontakt erzeugt "Geister"-Kontakte | Mittel | Niedrig | Wochentliches Cleanup-Report: Pending >30d und ohne Deal |
| Jitsi Updates brechen Config | Niedrig | Mittel | Pin `stable-9258`, Upgrades bewusst pro Slice, Config-Volumes sichern |

## V4.1 Open Points (fuer /slice-planning)

- Slice-Reihenfolge (Empfehlung unten)
- Ob `user_settings`-Tabelle in einem eigenen Slice oder mit FEAT-409 zusammen migriert wird
- Jitsi-JWT-Library: `jsonwebtoken` vs. `jose` — Entscheidung in Infrastruktur-Slice

## V4.1 Empfohlene Slice-Reihenfolge

1. **SLC-411 Consent-Schema + Public-Page** (FEAT-411, additiv, kein Infra-Dependency)
2. **SLC-412 Jitsi+Jibri Deployment + Firewall** (FEAT-404, schwerster Infra-Slice, low-code, blockiert folgende Slices)
3. **SLC-413 Whisper-Adapter-Layer + OpenAI-Provider** (FEAT-404, TypeScript-only)
4. **SLC-414 Meeting-Start + Jitsi-JWT + Consent-Check** (FEAT-404 Core)
5. **SLC-415 Recording-Upload-Cron + Retention-Cron** (FEAT-404)
6. **SLC-416 Transkript + Summary-Pipeline** (FEAT-404 Endgame)
7. **SLC-417 user_settings + Reminder-Cron + .ics** (FEAT-409 A/B)
8. **SLC-418 Browser-Push + Service Worker** (FEAT-409 B)
9. **SLC-419 KI-Agenda (on-click + auto)** (FEAT-409 C)

Geschaetzt 9 Slices. Jedes nach 1-2 Tagen implementierbar.

## V4.1 Recommended Next Step

`/slice-planning` — V4.1-Slices strukturiert ausdefinieren (Acceptance, Dependencies, QA-Fokus, Testfaelle). Danach pro Slice `/backend` oder `/frontend` + `/qa`.

---

# V4.2 Architektur — Wissensbasis Cross-Source (RAG)

## V4.2 Architecture Summary

V4.2 fuegt eine RAG-Pipeline (Retrieval-Augmented Generation) hinzu, die alle geschaeftsrelevanten Textdaten semantisch durchsuchbar macht. Vier Quellen — Meeting-Transkripte (V4.1), E-Mails (V4 IMAP), Deal-Activities (V2+) und Dokumente — werden in Vektor-Embeddings umgewandelt und via pgvector in der bestehenden PostgreSQL durchsucht.

**Kern-Entscheidung (DEC-046):** RAG statt Context-Window-Stuffing, weil: skaliert unbegrenzt, findet semantisch verwandte Inhalte, ~10x guenstiger pro Query.

**Infrastruktur-Footprint:** Minimal. pgvector ist bereits in `supabase/postgres:15.6.1.145` enthalten (ein `CREATE EXTENSION`). Titan Embeddings V2 laeuft ueber denselben Bedrock-Account in Frankfurt. Kein neuer Container, kein neuer Service.

## V4.2 Main Components

```
Browser (User)                           Hetzner CPX32 (bestehend)
─────────────────                        ────────────────────────────────
Deal-Workspace UI    ───────► Next.js App (Port 3000)
  └── "Wissen"-Tab (NEU)                 ├── /app/deals/[id]/wissen (NEU V4.2)
       ├── Text-Query                    │
       ├── Voice-Query (Whisper)         ├── /lib/ai/embeddings/       (NEU V4.2)
       └── Ergebnis + Quellen           │     ├── provider.ts  (Interface)
                                         │     ├── titan.ts     (V4.2 Implementierung)
                                         │     └── factory.ts   (ENV-Switch)
                                         │
                                         ├── /lib/knowledge/            (NEU V4.2)
                                         │     ├── chunker.ts   (Quelltypspezifisch)
                                         │     ├── indexer.ts   (Chunk → Embed → Insert)
                                         │     ├── search.ts    (Query → Embed → pgvector)
                                         │     └── backfill.ts  (Einmaliger Bestandsimport)
                                         │
                                         ├── /api/knowledge/query (NEU V4.2)
                                         ├── /api/cron/embedding-sync  (NEU V4.2)
                                         │
                                         ├── /lib/ai/bedrock-client.ts (bestehend)
                                         ├── /lib/ai/transcription/    (bestehend V4.1)
                                         └── /api/transcribe           (bestehend)

                                         PostgreSQL (supabase/postgres:15.6.1.145)
                                         ├── pgvector Extension (NEU V4.2, bereits im Image)
                                         ├── knowledge_chunks Tabelle (NEU V4.2)
                                         │     └── HNSW-Index auf embedding vector(1024)
                                         └── Bestehende Tabellen (unveraendert)

External (bestehend, keine Aenderung)
────────
AWS Bedrock (Frankfurt, eu-central-1)
  ├── Claude Sonnet 4   ← Antwortgenerierung (bestehend)
  └── Titan Text V2     ← Embedding-Generierung (NEU V4.2)
OpenAI Whisper API      ← Voice-Input Transkription (bestehend)
SMTP (IONOS)            ← bestehend
```

## V4.2 Responsibilities

| Komponente | Verantwortung |
|---|---|
| `/lib/ai/embeddings/` | Embedding-Adapter-Pattern: Interface + Titan-V2-Provider + Factory (DEC-047) |
| `/lib/knowledge/chunker.ts` | Quelltypspezifische Text-Zerlegung in Chunks |
| `/lib/knowledge/indexer.ts` | Chunks embedden und in knowledge_chunks speichern |
| `/lib/knowledge/search.ts` | Query embedden, pgvector Similarity Search, Context Assembly |
| `/lib/knowledge/backfill.ts` | Einmaliger Embedding-Import aller Bestandsdaten |
| `/api/knowledge/query` | Authentifizierte API-Route fuer RAG-Queries |
| `/api/cron/embedding-sync` | Cron: Verpasste Auto-Embeddings nachholen (alle 15 Min) |
| pgvector + knowledge_chunks | Vektor-Speicher + Similarity Search in bestehender PostgreSQL |
| Bedrock Titan Text V2 | Embedding-Generierung (eu-central-1) |
| Bedrock Claude Sonnet 4 | Antwortgenerierung aus RAG-Context (bestehend) |

## V4.2 Data Model

### Neue Tabelle: knowledge_chunks (FEAT-401a)

```sql
-- Voraussetzung: pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,              -- 'meeting', 'email', 'deal_activity', 'document'
  source_id UUID NOT NULL,                -- FK zur Quell-Tabelle (meetings.id, email_messages.id, etc.)
  chunk_index INTEGER NOT NULL,           -- Position innerhalb des Quelldokuments (0-basiert)
  chunk_text TEXT NOT NULL,               -- Der tatsaechliche Text-Chunk
  embedding vector(1024) NOT NULL,        -- Titan V2 Embedding (DEC-048)
  metadata JSONB DEFAULT '{}' NOT NULL,   -- Kontextuelle Metadaten (siehe unten)
  embedding_model TEXT NOT NULL,          -- 'amazon.titan-embed-text-v2:0'
  status TEXT DEFAULT 'active' NOT NULL,  -- 'active', 'pending', 'failed', 'deleted'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW-Index fuer schnelle Approximate Nearest Neighbor Search
-- m=16: Konnektivitaet pro Knoten (Standard, guter Tradeoff)
-- ef_construction=64: Build-Qualitaet (hoeher = besser, langsamer Build)
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Lookup-Indizes
CREATE INDEX idx_knowledge_chunks_source ON knowledge_chunks(source_type, source_id);
CREATE INDEX idx_knowledge_chunks_status ON knowledge_chunks(status)
  WHERE status != 'active';
CREATE INDEX idx_knowledge_chunks_deal ON knowledge_chunks((metadata->>'deal_id'))
  WHERE metadata->>'deal_id' IS NOT NULL;

-- Unique Constraint: kein doppeltes Embedding fuer gleichen Source+Chunk
CREATE UNIQUE INDEX idx_knowledge_chunks_unique
  ON knowledge_chunks(source_type, source_id, chunk_index);

-- RLS
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON knowledge_chunks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON knowledge_chunks TO authenticated;
GRANT ALL ON knowledge_chunks TO service_role;
```

### Tabellen-Uebersicht V4.2: 29 Tabellen (28 bestehend + 1 neu)

```
BESTEHEND (unveraendert):                NEU (V4.2):
├── companies                            └── knowledge_chunks (+ pgvector Extension)
├── contacts
├── pipelines
├── pipeline_stages
├── deals
├── emails (outbound SMTP)
├── email_messages (IMAP, V4)
├── email_threads (V4)
├── email_sync_state (V4)
├── proposals
├── fit_assessments
├── tasks
├── handoffs
├── referrals
├── signals
├── documents
├── activities
├── profiles
├── meetings
├── calendar_events
├── audit_log
├── email_templates (V3.1)
├── ai_action_queue (V4)
├── ai_feedback (V4)
└── user_settings (V4.1)
```

Keine bestehende Tabelle wird geaendert. V4.2 ist rein additiv.

### metadata JSONB Schema

Jeder Chunk traegt in `metadata` kontextuelle Informationen fuer Quellenangabe und Scope-Filterung:

```json
{
  "title": "Meeting mit Firma X - Vertragsverhandlung",
  "date": "2026-04-15T10:00:00Z",
  "deal_id": "uuid-or-null",
  "contact_id": "uuid-or-null",
  "company_id": "uuid-or-null",
  "source_url": "/deals/abc-123"
}
```

- `title`: Lesbarer Titel fuer Quellen-Card (Meeting-Titel, E-Mail-Betreff, Dokument-Name, Activity-Summary)
- `date`: ISO 8601 Zeitstempel der Quelle
- `deal_id`, `contact_id`, `company_id`: FK-UUIDs fuer Scope-Filterung (pgvector WHERE-Clause)
- `source_url`: Relative URL fuer Klick-Navigation zum Original

## V4.2 Embedding-Pipeline (Flow)

```
Datenquelle           Trigger                     Verarbeitung
────────────────────  ─────────────────────────   ────────────────────────────────
Meeting-Transkript    summary_status = completed  1. meetings.transcript laden
                      (nach V4.1 Summary-Pipeline) 2. chunker.chunkMeeting(transcript, metadata)
                                                   3. indexer.embedAndStore(chunks)

E-Mail synchronisiert  IMAP-Sync INSERT           1. email_messages.body_text + subject laden
                                                   2. chunker.chunkEmail(body, metadata)
                                                   3. indexer.embedAndStore(chunks)

Activity erstellt      Server Action INSERT        1. activities.body laden
                                                   2. chunker.chunkActivity(body, metadata)
                                                   3. indexer.embedAndStore(chunks)

Dokument hochgeladen   Upload Server Action        1. document Content laden (PDF→Text / DOCX→Text)
                                                   2. chunker.chunkDocument(text, metadata)
                                                   3. indexer.embedAndStore(chunks)
```

### Embedding-Trigger-Implementierung

Die Trigger werden als Post-Processing-Calls in bestehende Server Actions / Cron-Endpoints integriert:

1. **Meetings**: In `/api/cron/meeting-summary` (V4.1 bestehend) — nach `summary_status = 'completed'` einen `indexer.indexMeeting(meetingId)` Call anhaengen
2. **E-Mails**: In `/api/cron/imap-sync` (V4 bestehend) — nach jedem INSERT einen `indexer.indexEmail(emailId)` Call anhaengen
3. **Activities**: In die bestehenden Activity-Create-Actions — `indexer.indexActivity(activityId)` Call anhaengen
4. **Dokumente**: In die Upload-Action — `indexer.indexDocument(documentId)` Call anhaengen

Alle Trigger sind fire-and-forget mit Error-Handling: Bei Fehler wird `status = 'failed'` gesetzt und der Embedding-Sync-Cron holt es nach.

### Embedding-Sync-Cron

```
/api/cron/embedding-sync (alle 15 Minuten)
  │
  ├── 1. Cron-Secret pruefen
  ├── 2. knowledge_chunks mit status = 'pending' oder 'failed' laden (LIMIT 50)
  ├── 3. Retry-Logik: failed Chunks max 3 Versuche (Zaehler in metadata.retry_count)
  ├── 4. embeddingProvider.embedBatch(chunk_texts)
  ├── 5. UPDATE knowledge_chunks SET embedding = ..., status = 'active'
  └── 6. Response: { processed: N, failed: N, skipped: N }
```

## V4.2 Chunking-Strategie (DEC-048)

### Design-Entscheidung: DEC-048 — Sentence-Boundary-Aware Chunking mit quelltypspezifischen Limits

Chunks werden an Satzgrenzen (`.`, `!`, `?` gefolgt von Whitespace) geschnitten, nicht mitten im Satz. Ueberlappung am Anfang jedes Chunks stellt Kontext-Erhalt sicher.

| Quelltyp | Strategie | Target-Groesse | Overlap | Begründung |
|---|---|---|---|---|
| Meeting-Transkripte | Absatz-basiert, sentence-boundary | ~600-800 Tokens | 100 Tokens | Lange Texte, Kontext-Erhalt wichtig |
| E-Mails | Pro E-Mail als Single-Chunk; Split bei >800 Tokens | Max 800 Tokens | Kein Overlap | Meiste Mails sind kurz genug |
| Activities | Pro Activity als Single-Chunk | Meist <500 Tokens | Kein Overlap | Kurze strukturierte Eintraege |
| Dokumente | Seiten-/Absatz-basiert, sentence-boundary | ~600-800 Tokens | 100 Tokens | Analog zu Meeting-Transkripten |

### Chunker-Implementierung

```typescript
// /lib/knowledge/chunker.ts

interface Chunk {
  text: string;
  index: number;
  metadata: Record<string, unknown>;
}

function chunkMeeting(meetingId: string, transcript: string, meeting: Meeting): Chunk[] {
  // 1. Transcript + ai_summary.outcome als Kontext-Header pro Chunk
  // 2. Sentence-boundary split bei ~700 Tokens
  // 3. 100-Token Overlap
  // 4. Metadata: {title, date, deal_id, contact_id, company_id, source_url}
}

function chunkEmail(email: EmailMessage): Chunk[] {
  // 1. Subject + Body als ein Text
  // 2. Wenn <800 Tokens: Single-Chunk
  // 3. Wenn >800 Tokens: sentence-boundary split
  // 4. Metadata: {title: subject, date: received_at, deal_id, contact_id, company_id}
}

function chunkActivity(activity: Activity): Chunk[] {
  // 1. activity.body als Single-Chunk (fast immer <500 Tokens)
  // 2. Metadata: {title: activity.type, date: activity.created_at, deal_id, contact_id}
}

function chunkDocument(doc: Document, extractedText: string): Chunk[] {
  // 1. Seiten-/Absatz-Split
  // 2. sentence-boundary bei ~700 Tokens
  // 3. 100-Token Overlap
  // 4. Metadata: {title: doc.name, date: doc.created_at, deal_id}
}
```

### Token-Zaehlung

Fuer V4.2 wird eine einfache Heuristik verwendet: `tokens ≈ text.length / 4` (fuer deutsche Texte). Keine externe Tokenizer-Library noetig — die Ungenauigkeit (+/- 10%) ist fuer Chunk-Groessen-Steuerung akzeptabel. Titan V2 unterstuetzt max 8.192 Tokens pro Embedding-Call — bei Target 800 Tokens gibt es grossen Sicherheitspuffer.

## V4.2 Embedding-Adapter-Layer (DEC-047)

Analog zum Whisper-Adapter-Pattern (DEC-035, DEC-041):

```
/lib/ai/embeddings/
  ├── provider.ts     — EmbeddingProvider Interface
  ├── titan.ts        — Amazon Titan Text Embeddings V2 (V4.2 aktiv)
  ├── cohere.ts       — Cohere Embed Multilingual V3 (Platzhalter)
  └── factory.ts      — Factory: liest EMBEDDING_PROVIDER ENV
```

### Interface

```typescript
// /lib/ai/embeddings/provider.ts
export interface EmbeddingProvider {
  /** Single text → embedding vector */
  embed(text: string): Promise<number[]>;
  /** Batch texts → embedding vectors (efficient) */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Number of dimensions this provider produces */
  dimensions(): number;
  /** Model identifier for storage tracking */
  modelId(): string;
}

export interface EmbeddingProviderConfig {
  region?: string;     // Default: eu-central-1
  dimensions?: number; // Default: 1024
}
```

### Titan V2 Provider

```typescript
// /lib/ai/embeddings/titan.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export class TitanEmbeddingProvider implements EmbeddingProvider {
  private client: BedrockRuntimeClient;
  private dim: number;
  private model = "amazon.titan-embed-text-v2:0";

  constructor(config?: EmbeddingProviderConfig) {
    this.dim = config?.dimensions ?? 1024;
    this.client = new BedrockRuntimeClient({
      region: config?.region ?? process.env.EMBEDDING_REGION ?? "eu-central-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
  }

  async embed(text: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: this.model,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        inputText: text,
        dimensions: this.dim,
        normalize: true,
      }),
    });
    const response = await this.client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Titan V2 unterstuetzt kein natives Batch-Embedding
    // Sequential mit Rate-Limiting (max 10 concurrent)
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  dimensions(): number { return this.dim; }
  modelId(): string { return this.model; }
}
```

### Factory

```typescript
// /lib/ai/embeddings/factory.ts
export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER ?? "titan";
  const dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS ?? "1024");
  const region = process.env.EMBEDDING_REGION ?? "eu-central-1";

  switch (provider) {
    case "cohere":
      return new CohereEmbeddingProvider({ region, dimensions });
    case "titan":
    default:
      return new TitanEmbeddingProvider({ region, dimensions });
  }
}
```

Business-Code ruft ausschliesslich `getEmbeddingProvider().embed(...)`. Kein direkter Bedrock-Import ausserhalb des Adapter-Moduls.

## V4.2 RAG Query Pipeline (Flow)

```
User-Frage ("Hat Kunde X die Vollmacht unterschrieben?")
  │
  ├── 1. Optional: Voice-Input → Whisper-Transkription (bestehendes Pattern)
  │
  ├── 2. Query-Embedding: embeddingProvider.embed(query)
  │      └── Titan V2 → 1024-dim Vektor (~50ms)
  │
  ├── 3. pgvector Similarity Search
  │      └── SELECT chunk_text, metadata, similarity
  │          FROM knowledge_chunks
  │          WHERE status = 'active'
  │            AND (metadata->>'deal_id' = $dealId OR $scope = 'all')
  │          ORDER BY embedding <=> $queryVector
  │          LIMIT 20
  │      └── Ergebnis: Top-20 relevanteste Chunks (~20ms)
  │
  ├── 4. Context Assembly
  │      ├── Top-20 Chunks als nummerierte Quellen-Liste formatieren
  │      ├── Deal-Metadaten hinzufuegen (Name, Stage, Kontakt, Firma)
  │      └── Gesamt-Context: ~5.000-15.000 Tokens (statt 100k+ bei Context-Stuffing)
  │
  ├── 5. Bedrock Claude Sonnet 4 — Antwortgenerierung
  │      ├── System-Prompt: "Beantworte die Frage basierend auf den Quellen..."
  │      ├── User-Prompt: Context + Query
  │      └── Output-Schema:
  │           {
  │             "answer": "Ja, Kunde X hat die Vollmacht am 12.04. unterschrieben...",
  │             "sources": [
  │               {"index": 3, "type": "meeting", "relevance": "high"},
  │               {"index": 7, "type": "email", "relevance": "medium"}
  │             ],
  │             "confidence": "high"
  │           }
  │      └── Latenz: ~3-5 Sekunden (Embedding 50ms + pgvector 20ms + Bedrock 3-5s)
  │
  └── 6. Response Assembly
         ├── answer: Markdown-formatierter Antworttext
         ├── sources: Angereichert mit title, date, snippet, source_url aus Chunk-Metadata
         └── confidence: high / medium / low (basierend auf Top-Chunk-Similarity-Score)
```

### System-Prompt fuer RAG-Antworten

```
Du bist ein Business-Intelligence-Assistent. Du beantwortest Fragen basierend auf
den bereitgestellten Quellen aus einem CRM-System.

REGELN:
- Antworte auf Deutsch, praezise und direkt.
- Beziehe dich NUR auf die bereitgestellten Quellen. Erfinde keine Informationen.
- Wenn die Frage nicht aus den Quellen beantwortet werden kann, sag das ehrlich.
- Nenne Quellen-Nummern [1], [2] etc. in deiner Antwort.
- Gib bei Datumsangaben das konkrete Datum an.

Antworte als JSON:
{
  "answer": "Deine Antwort mit [Quellen-Nummern]",
  "sources": [{"index": N, "type": "meeting|email|...", "relevance": "high|medium|low"}],
  "confidence": "high|medium|low"
}

Confidence-Regeln:
- high: Mindestens eine Quelle beantwortet die Frage direkt
- medium: Quellen enthalten relevante Informationen, aber keine direkte Antwort
- low: Keine der Quellen scheint relevant zu sein
```

### Scope-Logik

| Scope | WHERE-Clause | Anwendungsfall |
|---|---|---|
| `deal` (Default) | `metadata->>'deal_id' = $dealId` | "Hat dieser Kunde..." |
| `contact` | `metadata->>'contact_id' = $contactId` | "Was hat Kontakt X je gesagt..." |
| `company` | `metadata->>'company_id' = $companyId` | "Alle Informationen zu Firma Y..." |
| `all` | Kein Filter (nur `status = 'active'`) | "Hat irgendein Kontakt ueber Thema Z gesprochen?" |

Default im Deal-Workspace: `deal`. Toggle auf `all` ueber UI-Switch.

## V4.2 Document Text-Extraktion

Fuer die `documents`-Tabelle: Textextraktion aus hochgeladenen Dateien.

| Dateiformat | Library | Ansatz |
|---|---|---|
| PDF | `pdf-parse` (npm) | Buffer → Text pro Seite |
| DOCX | `mammoth` (npm) | Buffer → Plain-Text |
| TXT / MD | — | Direkter Zugriff |
| Bilder (PNG, JPG) | — | **Out of Scope** (kein OCR in V4.2) |
| Excel / CSV | — | **Out of Scope** (strukturierte Daten, nicht fuer RAG geeignet) |

Extraktion wird beim Indexing ausgefuehrt: `backfill.ts` und `indexer.ts` laden den Datei-Inhalt aus Supabase Storage, extrahieren Text, chunken und embedden.

## V4.2 Deal-Workspace UI (FEAT-401c)

### Neues "Wissen"-Tab

```
Deal-Workspace (/deals/[id])
  ├── Timeline │ Aufgaben │ Angebote │ Dokumente │ Edit │ Wissen (NEU V4.2)
  │
  └── Wissen-Tab:
      ┌─────────────────────────────────────────────────────────────┐
      │ 🔍 Frage zur Wissensbasis stellen...            [🎤] [➤]  │
      │                                    [Nur dieser Deal ▾]     │
      ├─────────────────────────────────────────────────────────────┤
      │                                                             │
      │ Antwort:                                                    │
      │ Ja, Kunde X hat die Vollmacht am 12.04. unterschrieben.    │
      │ Das wurde im Meeting vom 12.04. [1] besprochen und per     │
      │ E-Mail am 13.04. [2] bestaetigt.                           │
      │                                                             │
      │ ┌─── Quellen ──────────────────────────────────────────┐   │
      │ │ [1] 🎥 Meeting: Vertragsverhandlung Firma X          │   │
      │ │     12.04.2026 │ "...die Vollmacht wurde von..."     │   │
      │ │     [Zum Meeting →]                                   │   │
      │ │                                                       │   │
      │ │ [2] 📧 E-Mail: Re: Vollmacht + Unterlagen            │   │
      │ │     13.04.2026 │ "...anbei die unterschriebene..."   │   │
      │ │     [Zur E-Mail →]                                    │   │
      │ └──────────────────────────────────────────────────────┘   │
      │                                                             │
      │ Vertrauen: ●●●○ hoch                                       │
      └─────────────────────────────────────────────────────────────┘
```

### UI-Komponenten

- `KnowledgeQueryInput`: Text-Input + Mikrofon-Button (Whisper, bestehendes Pattern aus V2.1+) + Submit-Button
- `KnowledgeAnswer`: Markdown-Renderer fuer Antworttext
- `KnowledgeSourceCard`: Pro Quelle: Typ-Icon (Meeting/E-Mail/Activity/Dokument), Titel, Datum, Snippet, Klick-Link
- `ScopeToggle`: Dropdown "Nur dieser Deal" / "Alle Daten"
- `ConfidenceBadge`: Visueller Indikator (hoch/mittel/niedrig)

On-click, kein auto-load (konsistent mit DEC-030 / BL-330 Kostenschutz).

## V4.2 API Routes

### Neue API Routes

| Route | Methode | Zweck | Auth |
|---|---|---|---|
| `POST /api/knowledge/query` | POST | RAG-Query: Embed → Search → LLM → Response | Authenticated |
| `POST /api/cron/embedding-sync` | POST | Verpasste Embeddings nachholen | CRON_SECRET |
| `POST /api/knowledge/backfill` | POST | Einmaliger Backfill aller Bestandsdaten | Authenticated (Admin) |

### Bestehende Endpoints (erweitert)

| Route | Erweiterung |
|---|---|
| `/api/cron/imap-sync` | + Embedding-Trigger nach E-Mail-INSERT |
| `/api/cron/meeting-summary` | + Embedding-Trigger nach Summary-Completion |

## V4.2 Cron-Konfiguration

```
Coolify Cron (erweitert)
  │
  ├── bestehend (unveraendert):
  │   ├── alle 5 Min  → POST /api/cron/imap-sync
  │   ├── alle 5 Min  → POST /api/cron/meeting-transcript
  │   ├── alle 5 Min  → POST /api/cron/meeting-summary
  │   ├── alle 5 Min  → POST /api/cron/meeting-reminders
  │   ├── alle 15 Min → POST /api/cron/classify
  │   ├── alle 6h     → POST /api/cron/followups
  │   ├── taeglich    → POST /api/cron/retention
  │   ├── alle 2 Min  → POST /api/cron/meeting-recording-poll
  │   ├── taeglich    → POST /api/cron/recording-retention
  │   └── taeglich    → POST /api/cron/pending-consent-renewal
  │
  └── NEU (V4.2):
      └── alle 15 Min → POST /api/cron/embedding-sync  (Header: x-cron-secret)
```

## V4.2 Env Vars — Neue Variablen

```bash
# Embedding Provider (V4.2 NEU, DEC-047)
EMBEDDING_PROVIDER=titan                    # titan | cohere
EMBEDDING_DIMENSIONS=1024                   # 256 | 512 | 1024 (DEC-048)
EMBEDDING_REGION=eu-central-1               # Immer EU

# Bestehende AWS-Credentials werden wiederverwendet:
# AWS_ACCESS_KEY_ID (bestehend)
# AWS_SECRET_ACCESS_KEY (bestehend)
# AWS_REGION (bestehend, eu-central-1)
```

Keine neuen AWS-Credentials noetig — Titan Embeddings V2 laeuft ueber dasselbe IAM-Konto wie Bedrock Claude. Die IAM-Policy muss `bedrock:InvokeModel` fuer `amazon.titan-embed-text-v2:0` erlauben (pruefen in erster Slice-QA).

## V4.2 Backfill-Strategie

### Einmaliger Bestandsimport

Bei V4.2-Deploy werden alle bestehenden Daten embedded:

```
/api/knowledge/backfill (einmaliger Admin-Call)
  │
  ├── 1. Meetings mit transcript IS NOT NULL
  │      └── Geschaetzt: <20 Meetings (System ist seit V4.1 aktiv)
  │
  ├── 2. email_messages mit body_text IS NOT NULL
  │      └── Geschaetzt: 500-2.000 E-Mails (90-Tage-IMAP-Bestand)
  │
  ├── 3. activities mit body IS NOT NULL
  │      └── Geschaetzt: 200-500 Activities
  │
  ├── 4. documents (Textextraktion + Embedding)
  │      └── Geschaetzt: <50 Dokumente
  │
  └── Gesamt-Schaetzung: ~1.000-3.000 Chunks, ~$1-3 Embedding-Kosten
```

Idempotent: Unique Constraint auf `(source_type, source_id, chunk_index)` verhindert Duplikate bei erneutem Aufruf.

### Re-Embedding bei Quell-Aenderungen

Wenn ein Meeting-Transkript nachtraeglich korrigiert wird oder ein Dokument aktualisiert wird:
1. Bestehende Chunks fuer diese `source_id` werden auf `status = 'deleted'` gesetzt
2. Neue Chunks werden erstellt und embedded
3. Alte Chunks werden endgueltig geloescht (DELETE WHERE status = 'deleted' AND source_id = ...)

## V4.2 Server Sizing

### Kein zusaetzlicher RAM-Bedarf

pgvector laeuft in der bestehenden PostgreSQL-Instanz. Der HNSW-Index fuer ~50.000 Chunks mit 1024 Dimensionen benoetigt ca. 200-300 MB RAM. Bei aktuellem Sizing (CPX32, 8 GB RAM, ~6-6.5 GB unter V4.1-Last) ist das unkritisch.

| Komponente | RAM-Delta |
|---|---|
| pgvector HNSW-Index (~50k Chunks) | +200-300 MB |
| Embedding-Client (in Next.js) | vernachlaessigbar |
| **Gesamt V4.2 zusaetzlich** | **~300 MB** |

Gesamt-Schaetzung: ~6.5-7 GB von 8 GB unter V4.1+V4.2-Last (ohne aktives Jibri-Recording). Reicht fuer V4.2.

## V4.2 Security / Privacy

### EU-only Datenhaltung fuer Embeddings

```
Quell-Daten:           Hetzner PostgreSQL (Deutschland)
Embedding-Generierung: AWS Bedrock Titan V2 (Frankfurt, eu-central-1)
Vektor-Speicher:       Hetzner PostgreSQL pgvector (Deutschland)
LLM-Antwort:           AWS Bedrock Claude Sonnet (Frankfurt, eu-central-1)
```

Kein Datenfluss in US-Regionen. Titan Embeddings V2 in eu-central-1 ist DPA-abgedeckt durch bestehendes AWS-DPA (gleicher Account wie Bedrock Claude).

### Audit-Trail

Jeder Embedding-API-Call wird geloggt (konsistent mit Data-Residency-Regel):
- Provider: "Amazon Titan"
- Region: "eu-central-1"
- Modell-ID: "amazon.titan-embed-text-v2:0"
- Chunk-Count
- Zeitstempel

RAG-Query-Calls werden in bestehende `/api/ai/query`-Logging-Logik integriert.

### Keine zusaetzlichen Privacy-Risiken

knowledge_chunks enthaelt Textfragmente aus bestehenden Tabellen (Meetings, E-Mails, Activities, Dokumente). Dieselben RLS-Policies und Zugangskontrollen gelten. Keine neuen personenbezogenen Daten werden erhoben — nur bestehende Daten werden als Vektoren indiziert.

## V4.2 Constraints & Tradeoffs

| Entscheidung | Tradeoff |
|---|---|
| pgvector in bestehender DB statt separater Vektor-Service | Einfacher, kein neuer Container. Aber: HNSW-Index-Rebuild bei grossen Aenderungen kann langsam sein. Fuer V4.2-Volume OK. |
| Titan V2 statt Cohere Embed Multilingual V3 | Gleicher Provider = einfacher. Deutsch-Performance ist Open Question — Evaluierung in QA, Cohere als Fallback via Adapter. |
| 1024 Dimensionen statt 512 (DEC-048) | Beste Qualitaet, mehr Speicher. Bei <50k Chunks ist Speicher-Unterschied irrelevant (~50 MB). |
| Token-Heuristik statt Tokenizer-Library | Einfacher, +/-10% Ungenauigkeit. Fuer Chunk-Groessen-Steuerung ausreichend. |
| Kein Multi-Turn-Chat in V4.2 | Einzelne Fragen, kein persistenter Gespraechskontext. Reduziert Komplexitaet erheblich. Spaeter erweiterbar. |
| Embedding im Cron-Fallback statt in-Request | Async ist richtig fuer I/O-bound Embedding. Aber: bis zu 15 Min Delay bei verpasstem Inline-Trigger. Fuer Single-User akzeptabel. |

## V4.2 Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| pgvector Extension fehlt in Supabase-Image | Niedrig | Blocker | `supabase/postgres:15.6.1.145` enthaelt pgvector. Im ersten Slice via `CREATE EXTENSION IF NOT EXISTS vector` verifizieren. |
| Titan V2 Deutsch-Qualitaet unzureichend | Mittel | Hoch | Evaluierung mit echten Meeting-Transkripten in Slice-QA. Fallback: Cohere Embed Multilingual V3 via Bedrock Frankfurt (ebenfalls verfuegbar). Adapter-Pattern macht Switch einfach. |
| IAM-Policy fehlt fuer Titan Embeddings | Mittel | Blocker | AWS IAM Policy muss `bedrock:InvokeModel` fuer `amazon.titan-embed-text-v2:0` erlauben. Im ersten Slice pruefen. |
| HNSW-Index zu langsam bei >100k Chunks | Niedrig | Niedrig | Fuer V4.2 Volume (<50k Chunks) kein Problem. Bei Wachstum: `ef_search`-Parameter tunen. |
| PDF-Extraktion scheitert bei komplexen Layouts | Mittel | Niedrig | `pdf-parse` funktioniert gut fuer Text-PDFs. Gescannte PDFs/Bilder sind explizit Out-of-Scope. |
| Bedrock Rate-Limiting bei Backfill | Niedrig | Niedrig | Backfill verarbeitet Chunks sequentiell mit Pausen. ~3.000 Chunks bei ~50ms/Embedding = ~2.5 Minuten total. |

## V4.2 Migration Plan

### MIG-014 — V4.2 pgvector + knowledge_chunks Schema

```sql
-- 1. pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. knowledge_chunks Tabelle (siehe Data Model oben)
-- 3. HNSW-Index
-- 4. Lookup-Indizes + Unique Constraint
-- 5. RLS + Grants
```

Rein additiv. Kein Impact auf bestehende Tabellen. Kein Downtime noetig.

## V4.2 Dependencies (package.json)

```json
{
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.8.0"
}
```

`@aws-sdk/client-bedrock-runtime` ist bereits installiert (V3 Bedrock Client). Titan Embeddings V2 nutzt denselben SDK-Client mit anderem `modelId`.

## V4.2 Empfohlene Slice-Reihenfolge

1. **SLC-421 pgvector + Schema + Embedding-Adapter** — Extension aktivieren, knowledge_chunks Tabelle, EmbeddingProvider Interface + TitanProvider + Factory. Basis-Slice, blockiert alle folgenden.
2. **SLC-422 Chunking-Service + Indexer** — Quelltypspezifischer Chunker, Indexer (Chunk → Embed → Store). Unit-Tests mit echten Texten.
3. **SLC-423 Backfill + Embedding-Sync-Cron** — Bestehende Daten embedden, Cron fuer verpasste Embeddings. Danach: echte Vektoren in DB fuer Query-Tests.
4. **SLC-424 RAG Query API** — `/api/knowledge/query` mit Scope-Logik, Context Assembly, Bedrock-Prompt, strukturierte Response. Kern-Feature.
5. **SLC-425 Deal Knowledge Query UI** — "Wissen"-Tab im Deal-Workspace, Text+Voice-Input, Ergebnis-Darstellung mit Quellen-Cards.
6. **SLC-426 Auto-Embedding Trigger** — Integration in bestehende Cron-Jobs und Server Actions (IMAP-Sync, Meeting-Summary, Activity-Create, Document-Upload).

Geschaetzt 6 Slices. Jeder nach 1-2 Tagen implementierbar.

## V4.2 Recommended Next Step

`/slice-planning` — V4.2-Slices strukturiert ausdefinieren (Acceptance Criteria, Dependencies, QA-Fokus, Micro-Tasks). Danach pro Slice `/backend` oder `/frontend` + `/qa`.

# V4.3 Architektur — Insight Governance

## V4.3 Architecture Summary

V4.3 macht die KI schreibfaehig — kontrolliert. Die bisherige Architektur erzeugt informative KI-Outputs (Summaries, Klassifikationen, RAG-Antworten), die der User liest. V4.3 ergaenzt einen zweiten Pfad: Die KI erkennt in Meetings und E-Mails aktiv Handlungsbedarf und schlaegt konkrete Property-Aenderungen vor. Alle Vorschlaege landen in der bestehenden `ai_action_queue` (DEC-049) — nie direkt auf dem Entity. Der User reviewt in Mein Tag und entscheidet per Klick.

**Zwei Features:**
- **FEAT-402 Insight-Review-Queue:** Erweitert ai_action_queue + Unified Freigabe-UI + Batch-Approval + Confidence/Reasoning/Source + KI-Badge + Auto-Expire
- **FEAT-412 Signal-Extraktion:** Zweiter LLM-Call nach Meeting-Summary und E-Mail-Classify — extrahiert Property-Vorschlaege und speist sie in die Queue

**Infrastruktur-Footprint:** Minimal. Kein neuer Container, kein neuer Service. Schema-Migration erweitert bestehende Tabelle, neues Signal-Modul in `/lib/ai/signals/`, UI-Erweiterung in Mein Tag. Bestehende Cron-Jobs (meeting-summary, classify) erhalten einen zusaetzlichen Schritt am Ende.

## V4.3 Main Components

```
Browser (User)                           Hetzner CPX32 (bestehend)
─────────────────                        ────────────────────────────────
Mein Tag                 ───────► Next.js App (Port 3000)
  └── KI-Wiedervorlagen (bestehend)      │
       ├── Followup-Suggestions          │  BESTEHEND (unveraendert):
       ├── Gatekeeper-Actions            │  ├── /lib/ai/action-queue.ts
       └── Insight-Suggestions (NEU)     │  ├── /lib/ai/prompts/meeting-summary.ts
            ├── Property-Change Cards    │  ├── /lib/ai/prompts/email-classify.ts
            ├── Confidence + Reasoning   │  ├── /api/cron/meeting-summary
            ├── Source-Link              │  └── /api/cron/classify
            ├── Approve / Reject         │
            └── Batch-Approve            │  NEU (V4.3):
                                         ├── /lib/ai/signals/          (NEU V4.3)
Deal-Workspace           ───────►        │     ├── extractor.ts  (Kern-Logik)
  ├── KI-Badge auf Properties (NEU)      │     ├── prompts.ts    (Signal-Prompts)
  └── "Signale extrahieren" (NEU)        │     └── applier.ts    (Approve → Write)
                                         │
                                         ├── /api/cron/signal-extract  (NEU V4.3)
                                         ├── /api/signals/extract      (NEU V4.3)
                                         │
                                         └── action-queue.ts (ERWEITERT)
                                              └── applyAction() (NEU)

                                         PostgreSQL (bestehend)
                                         ├── ai_action_queue (ERWEITERT: +4 Spalten)
                                         ├── ai_feedback (bestehend, unveraendert)
                                         └── deals, contacts, etc. (bestehend)

External (bestehend, keine Aenderung)
────────
AWS Bedrock (Frankfurt, eu-central-1)
  ├── Claude Sonnet 4   ← Signal-Extraktion + Antworten (bestehend)
  └── Titan Text V2     ← RAG-Kontext fuer Signale (bestehend)
```

## V4.3 Responsibilities

| Komponente | Verantwortung |
|---|---|
| `/lib/ai/signals/extractor.ts` | Kern-Logik: nimmt Text (Summary/E-Mail) + Deal-Kontext, ruft Bedrock, parst Signal-Vorschlaege, schreibt in ai_action_queue |
| `/lib/ai/signals/prompts.ts` | Signal-Extraktion-Prompts mit Zod-Schema fuer strukturierte Antwort |
| `/lib/ai/signals/applier.ts` | Fuehrt genehmigte Aenderungen aus: UPDATE deals/contacts + KI-Badge-Tracking |
| `/lib/ai/action-queue.ts` | ERWEITERT: `applyAction()` fuer property_change/status_change/tag_change/value_change |
| `/api/cron/signal-extract` | Cron-Route: findet verarbeitete Meetings/E-Mails ohne Signale, ruft Extractor |
| `/api/signals/extract` | On-Demand-API: manueller Trigger "Signale extrahieren" pro Deal |
| `/api/cron/meeting-summary` | ERWEITERT: nach Summary-Completion → Signal-Extraktion einreihen |
| `/api/cron/classify` | ERWEITERT: nach Klassifikation relevanter E-Mails → Signal-Extraktion einreihen |
| Mein Tag UI | ERWEITERT: Unified Queue zeigt alle Typen, Batch-Approve, Confidence/Reasoning/Source |
| Deal-Workspace UI | ERWEITERT: KI-Badge auf Properties, "Signale extrahieren" Button |

## V4.3 Data Model

### Schema-Erweiterung: ai_action_queue (DEC-049)

4 neue Spalten, alle nullable (bestehende Eintraege sind nicht betroffen):

```sql
-- V4.3 Schema-Erweiterung ai_action_queue
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS target_entity_type TEXT;
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS target_entity_id UUID;
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS proposed_changes JSONB;
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS confidence FLOAT;

-- Index fuer Target-Entity-Lookups (KI-Badge-Anzeige)
CREATE INDEX IF NOT EXISTS idx_ai_queue_target
  ON ai_action_queue(target_entity_type, target_entity_id)
  WHERE target_entity_id IS NOT NULL;

-- Index fuer Cron: Signal-Status-Tracking
-- meetings.signal_status und email_messages.signal_status (neue Spalten)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS signal_status TEXT;
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS signal_status TEXT;
```

### Spalten-Semantik

| Spalte | Typ | Zweck |
|---|---|---|
| `target_entity_type` | TEXT | Ziel der vorgeschlagenen Aenderung: `deal`, `contact` |
| `target_entity_id` | UUID | ID des Ziel-Deals/Kontakts |
| `proposed_changes` | JSONB | Strukturierte Aenderung, z.B. `{"field": "stage", "old": "Qualifiziert", "new": "Verhandlung"}` |
| `confidence` | FLOAT | 0.0–1.0, LLM-Confidence fuer diesen Vorschlag |
| `signal_status` (meetings) | TEXT | `null` → `pending` → `completed` / `no_signals` |
| `signal_status` (email_messages) | TEXT | `null` → `pending` → `completed` / `no_signals` |

### proposed_changes JSONB-Format

```jsonc
// stage_suggestion
{"field": "stage", "old": "Qualifiziert", "new": "Verhandlung"}

// value_update
{"field": "value", "old": null, "new": 75000, "currency": "EUR"}

// tag_addition
{"field": "tags", "action": "add", "tag": "Wettbewerb: ABC"}

// priority_change
{"field": "priority", "old": "mittel", "new": "hoch"}
```

### Type-Erweiterungen

Neue `AIActionType`-Werte: `property_change`, `status_change`, `tag_change`, `value_change`
Neue `AIActionSource`-Werte: `signal_meeting`, `signal_email`, `signal_manual`

### Tabellen-Uebersicht V4.3: 29 Tabellen (keine neuen, 3 erweitert)

```
ERWEITERT (V4.3):
├── ai_action_queue  (+4 Spalten: target_entity_type, target_entity_id, proposed_changes, confidence)
├── meetings         (+1 Spalte: signal_status)
└── email_messages   (+1 Spalte: signal_status)

BESTEHEND (unveraendert): alle 26 weiteren
```

## V4.3 Signal-Extraktion — Architektur-Detail

### Hook-Punkte in bestehende Pipelines

Signal-Extraktion wird NICHT als separater Cron implementiert der Meetings/E-Mails erneut sucht. Stattdessen wird sie am Ende der bestehenden Pipelines eingehaengt:

**Meeting-Pipeline (meeting-summary Cron):**
```
Meeting fertig transkribiert
  → [bestehend] Cron: meeting-summary → LLM → ai_summary gespeichert
  → [NEU] Signal-Status auf "pending" setzen
  → [NEU] Cron: signal-extract → findet pending Meetings → LLM → Signale → ai_action_queue
```

**E-Mail-Pipeline (classify Cron):**
```
E-Mail synchronisiert + unklassifiziert
  → [bestehend] Cron: classify → Rule-based + LLM → classification gespeichert
  → [NEU] Bei classification = anfrage|antwort: Signal-Status auf "pending"
  → [NEU] Cron: signal-extract → findet pending E-Mails → LLM → Signale → ai_action_queue
```

**Manueller Trigger:**
```
User klickt "Signale extrahieren" im Deal-Workspace
  → POST /api/signals/extract { deal_id }
  → Laedt letzte 5 Meetings + 10 E-Mails des Deals
  → LLM-Call mit RAG-Kontext → Signale → ai_action_queue
```

### Warum separater signal-extract Cron statt inline

Die Signal-Extraktion ist ein eigener LLM-Call mit eigenem Prompt. Inline in meeting-summary oder classify wuerde:
- die bestehenden Cron-Timeouts ueberlasten (bereits 120s/60s)
- die Fehlerisolation verletzen (Summary-Fehler ≠ Signal-Fehler)
- das Retry-Verhalten verkomplizieren

Eigener Cron (alle 5 Min, DEC-050) haelt die Pipelines sauber getrennt.

### Signal-Extraktion-Prompt (DEC-051)

**Ein generischer Prompt** fuer alle Signal-Typen statt je ein spezialisierter Prompt. Gruende:
- Kontextuelle Signale ueberlappen: ein Satz kann Stage UND Value erwaehnen
- Ein Call statt vier spart ~75% Bedrock-Kosten
- Schema-basierte Extraktion (Zod) erzwingt Struktur unabhaengig von Prompt-Count

```typescript
// Zod-Schema fuer Signal-Extraktion-Response
const SignalSchema = z.object({
  signals: z.array(z.object({
    type: z.enum(["stage_suggestion", "value_update", "tag_addition", "priority_change"]),
    field: z.string(),
    current_value: z.string().nullable(),
    proposed_value: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().max(300),
  })),
});
```

Prompt erhaelt: Source-Text (Summary oder E-Mail-Body) + Deal-Kontext (Stage, Value, Tags, Kontakte) + optional RAG-Chunks (letzte relevante Wissensbasis-Eintraege).

### RAG-Kontext fuer bessere Signale

Signal-Extraktion profitiert von Deal-Historie. Beispiel: "Kunde erwaehnt 75k" ist nur dann ein Value-Signal, wenn der aktuelle Deal-Wert anders ist.

```
Signal-Prompt Input:
  1. Source-Text (Meeting-Summary oder E-Mail-Body)
  2. Deal-Kontext (aktuelle Properties: stage, value, tags, priority)
  3. RAG-Chunks (Top-5 aus knowledge_chunks WHERE deal_id = X)
```

RAG-Lookup ist optional — wenn keine Chunks fuer den Deal existieren, wird ohne gearbeitet. Kein Blocker.

### Confidence-Schwelle (DEC-052)

Signale mit Confidence < 0.4 werden NICHT in die Queue geschrieben. Sie wuerden den User mit niedrig-qualitativen Vorschlaegen ueberfluten. Der Schwellwert ist als ENV-Variable konfigurierbar: `AI_SIGNAL_MIN_CONFIDENCE=0.4`.

### E-Mail-Signal-Schwelle (DEC-053)

Nur E-Mails mit `classification IN ('anfrage', 'antwort')` werden fuer Signal-Extraktion beruecksichtigt. Andere Klassifikationen (newsletter, spam, intern, auto-reply, info) enthalten keine geschaeftsrelevanten Deal-Signale. Der Classify-Cron setzt `signal_status = 'pending'` nur bei diesen beiden Klassen.

## V4.3 Queue-UI — Architektur-Detail

### Unified Queue in Mein Tag

Die bestehende `followup-suggestions.tsx` Komponente rendert aktuell nur Followup-Vorschlaege (`source = 'followup_engine'`). V4.3 erweitert die Queue-Ansicht:

```
KI-Wiedervorlagen (Mein Tag)
  ├── Followup-Suggestions (bestehend, source=followup_engine)
  ├── Gatekeeper-Actions (bestehend, source=gatekeeper)
  └── Insight-Suggestions (NEU, source=signal_meeting|signal_email|signal_manual)
       ├── PropertyChangeCard (NEU)
       │    ├── Entity-Name + Link
       │    ├── Vorgeschlagene Aenderung (old → new)
       │    ├── Confidence-Badge (hoch/mittel/niedrig)
       │    ├── Reasoning-Text
       │    ├── Source-Link (Meeting/E-Mail)
       │    ├── Approve-Button
       │    └── Reject-Button (mit optionalem Grund)
       └── Batch-Approve-Bar (NEU)
            └── Checkbox-Selection + "X Vorschlaege genehmigen"
```

### Approve-Flow (Server Action)

```
User klickt "Approve"
  → Server Action: approveInsightAction(id)
    → 1. ai_action_queue.status = 'approved', decided_at, decided_by
    → 2. applyAction(item):
         reads proposed_changes JSONB
         → UPDATE deals SET stage = 'Verhandlung' WHERE id = target_entity_id
         → INSERT activities (type='ai_applied', ai_generated=true, source_type='signal', source_id=queue_item_id)
    → 3. ai_action_queue.execution_result = 'applied'
    → 4. revalidatePath (Mein Tag + Deal-Workspace)
```

### KI-Badge-Tracking (DEC-054)

KI-angewandte Aenderungen werden NICHT als separate Spalte auf der Entity-Tabelle getrackt (`ai_applied_at` wuerde nur den letzten Wert speichern). Stattdessen:

**Activities als Audit-Trail:** Jede angewandte Queue-Aktion erzeugt eine Activity (type=`ai_applied`, ai_generated=true) im Deal. Die Activity enthaelt in description was geaendert wurde und in metadata das Queue-Item-Referenz.

**KI-Badge im UI:** Der Deal-Workspace prueft beim Laden: `SELECT * FROM activities WHERE deal_id = X AND type = 'ai_applied' AND created_at > now() - interval '30 days'`. Gibt es Eintraege, werden die betroffenen Felder mit einem KI-Badge markiert (kleines Icon + Tooltip mit Datum und Quelle).

Vorteil: Keine Schema-Aenderung an deals/contacts, volle Historie, natuerlich ablaufend (Badge verschwindet nach 30 Tagen).

## V4.3 Docker Compose Aenderungen

Keine. V4.3 ist rein additiver Anwendungs-Code + Schema-Migration. Kein neuer Container, kein neuer Service, keine neuen Ports, keine neuen Volumes.

## V4.3 Env Vars — Neue Variablen

```bash
# Signal-Extraktion
AI_SIGNAL_MIN_CONFIDENCE=0.4     # Minimum Confidence fuer Queue-Eintrag (0.0-1.0)
AI_SIGNAL_EXPIRE_DAYS=7          # Auto-Expire fuer nicht-bearbeitete Vorschlaege
```

Beide optional mit sinnvollen Defaults. Keine Aenderung an bestehenden ENV-Variablen.

## V4.3 Cron-Jobs

| Name | Route | Frequenz | Neu/Bestehend |
|---|---|---|---|
| signal-extract | POST /api/cron/signal-extract | alle 5 Min | NEU |
| meeting-summary | POST /api/cron/meeting-summary | alle 5 Min | ERWEITERT (setzt signal_status) |
| classify | POST /api/cron/classify | alle 5 Min | ERWEITERT (setzt signal_status bei anfrage/antwort) |

Der signal-extract Cron pickt Meetings mit `signal_status = 'pending'` und E-Mails mit `signal_status = 'pending'`, verarbeitet max 3 pro Durchlauf (Bedrock-Rate-Limit-Schutz), setzt Status auf `completed` oder `no_signals`.

## V4.3 Kosten-Schaetzung

| Operation | Kosten/Einheit | Geschaetztes Volumen | Monatlich |
|---|---|---|---|
| Signal-Extraktion (Meeting) | ~$0.02/Call | ~20 Meetings/Monat | ~$0.40 |
| Signal-Extraktion (E-Mail) | ~$0.01/Call | ~80 relevante E-Mails/Monat | ~$0.80 |
| RAG-Kontext-Lookup | ~$0.0001/Query | ~100 Lookups/Monat | ~$0.01 |
| **Gesamt V4.3** | | | **~$1.20/Monat** |

Vernachlaessigbar. Kein Cost-Control-Mechanismus noetig ueber die Confidence-Schwelle hinaus.

## V4.3 Risiken

| Risiko | Mitigation |
|---|---|
| LLM-Halluzinationen (falscher Wert, falsche Stage) | Queue-Pflicht + Confidence-Score + kein Auto-Approve |
| Queue-Ueberflutung bei vielen Meetings/E-Mails | Confidence-Schwelle 0.4 + Auto-Expire 7 Tage |
| Signal-Extraktion verlangsamt Meeting-Summary-Cron | Entkoppelt als eigener Cron (signal-extract) |
| Bestehende Followup/Gatekeeper-Queue bricht | Neue Spalten nullable, Type-Union erweitert, kein Breaking Change |
| KI-Badge-Ueberlast (zu viele Badges im Deal) | 30-Tage-Fenster fuer Badge-Anzeige |

## V4.3 Empfohlene Slice-Reihenfolge

1. **SLC-431 Schema-Migration + Type-Erweiterung** — ALTER ai_action_queue (+4 Spalten), ALTER meetings + email_messages (+signal_status), TypeScript-Types erweitern. Basis-Slice, blockiert alle folgenden.
2. **SLC-432 Signal-Extraktion-Modul** — `/lib/ai/signals/` (extractor.ts, prompts.ts), Zod-Schema, Bedrock-Call, RAG-Kontext-Lookup. Rein Backend, kein UI.
3. **SLC-433 Signal-Cron + Pipeline-Hooks** — `/api/cron/signal-extract`, meeting-summary Hook (signal_status=pending), classify Hook (signal_status=pending bei anfrage/antwort). Integration mit bestehenden Pipelines.
4. **SLC-434 Applier + Approve-Flow** — `/lib/ai/signals/applier.ts`, Server Action approveInsightAction/rejectInsightAction, Activity-Eintrag bei Approve.
5. **SLC-435 Unified Queue UI** — Mein Tag: PropertyChangeCard, Confidence/Reasoning/Source, Batch-Approve. Erweitert bestehende followup-suggestions.tsx.
6. **SLC-436 Deal-Workspace KI-Badge + Manual Trigger** — KI-Badge-Anzeige, "Signale extrahieren" Button, `/api/signals/extract`.

Geschaetzt 6 Slices, je 1-1.5 Tage. Gesamtschaetzung: ~6-9 Tage.

## V4.3 Recommended Next Step

`/slice-planning` — V4.3-Slices strukturiert ausdefinieren (Acceptance Criteria, Dependencies, QA-Fokus, Micro-Tasks). Danach pro Slice `/backend` oder `/frontend` + `/qa`.

---

# V6 — Zielsetzung, Performance-Tracking & Produkttypen

## V6 Architecture Summary

V6 bringt den Uebergang von Reporting zu Performance Management. Vier neue Tabellen, ein neuer Cron-Job, eine neue Seite, ein neuer Settings-Bereich. Kein neuer externer Service. Die bestehende Bedrock-Integration wird fuer KI-Empfehlungen wiederverwendet.

**Strategie:** Rein additiv. Keine bestehende Tabelle wird strukturell geaendert. Deals bekommen ueber eine n:m-Verknuepfungstabelle (`deal_products`) eine optionale Produkt-Zuordnung. Alle neuen Tabellen folgen dem bestehenden RLS-Pattern.

## V6 Main Components

```
Bestehende Infrastruktur (unveraendert):
  Next.js BD Cockpit → Supabase Stack → PostgreSQL
  Bedrock Claude Sonnet (eu-central-1) → KI-Empfehlungen
  Coolify Cron-Jobs → KPI-Snapshot-Cron (NEU)

Neue Komponenten (V6):
  /app/(app)/products/         → Produkt-Verwaltung (Settings-Bereich)
  /app/(app)/performance/      → Performance-Cockpit (Analyse-Bereich)
  /lib/goals/                  → Ziel-Berechnung, Prognose-Engine, CSV-Parser
  /api/cron/kpi-snapshot       → Taeglicher KPI-Snapshot-Cron
```

## V6 Data Model

### Tabellen-Uebersicht V6: 33 Tabellen (29 bestehend + 4 neu)

```
BESTEHEND (unveraendert):                NEU (V6):
├── companies                            ├── products
├── contacts                             ├── deal_products (n:m Verknuepfung)
├── pipelines                            ├── goals
├── pipeline_stages                      └── kpi_snapshots
├── deals
├── emails (outbound SMTP)
├── email_messages (IMAP, V4)
├── email_threads (V4)
├── email_sync_state (V4)
├── proposals
├── fit_assessments
├── tasks
├── handoffs
├── referrals
├── signals
├── documents
├── activities
├── profiles
├── meetings
├── calendar_events
├── audit_log
├── email_templates (V3.1)
├── ai_action_queue (V4)
├── ai_feedback (V4)
├── user_settings (V4.1)
└── knowledge_chunks (V4.2)
```

### Neue Tabelle: products (FEAT-601, DEC-055)

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  standard_price NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category) WHERE category IS NOT NULL;

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;
```

**status-Werte:** `active`, `inactive`, `archived`
**category:** Freitext mit Autocomplete (wie Branchen auf Firmen — DEC-056). Kein Enum, weil Produkt-Kategorien sich schnell aendern koennen.
**standard_price:** Optionaler Richtpreis. Der Deal-spezifische Preis lebt auf `deal_products.price`.

### Neue Tabelle: deal_products (FEAT-601, DEC-057)

```sql
CREATE TABLE deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  price NUMERIC(12,2),
  quantity INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_products_deal ON deal_products(deal_id);
CREATE INDEX idx_deal_products_product ON deal_products(product_id);
CREATE UNIQUE INDEX idx_deal_products_unique ON deal_products(deal_id, product_id);

-- RLS
ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON deal_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON deal_products TO authenticated;
GRANT ALL ON deal_products TO service_role;
```

**Warum n:m statt Array-Feld (DEC-057):**
- SQL-Joins fuer Auswertungen (Umsatz pro Produkt) sind mit Tabelle trivial, mit Array komplex
- Price/Quantity pro Zuordnung moeglich (ein Deal kann 2x Blueprint haben)
- Unique Constraint verhindert versehentliche Doppelzuordnung desselben Produkts
- `ON DELETE RESTRICT` auf product_id: Produkte mit bestehenden Deal-Zuordnungen koennen nicht geloescht werden (nur archiviert)

### Neue Tabelle: goals (FEAT-602, DEC-058)

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  period TEXT NOT NULL,
  period_start DATE NOT NULL,
  target_value NUMERIC(12,2) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goals_user_period ON goals(user_id, period_start);
CREATE INDEX idx_goals_type ON goals(type);
CREATE INDEX idx_goals_status ON goals(status) WHERE status = 'active';
CREATE INDEX idx_goals_product ON goals(product_id) WHERE product_id IS NOT NULL;

-- Unique: Ein User kann pro Typ+Zeitraum+Produkt nur ein Ziel haben
CREATE UNIQUE INDEX idx_goals_unique ON goals(user_id, type, period, period_start, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON goals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goals TO service_role;
```

**type-Werte:** `revenue`, `deal_count`, `win_rate`
**period-Werte:** `month`, `quarter`, `year`
**period_start:** Erster Tag des Zeitraums (z.B. 2026-01-01 fuer Januar, 2026-04-01 fuer Q2, 2026-01-01 fuer Jahresziel)
**product_id:** NULL = Gesamtziel, sonst produktspezifisch
**source-Werte:** `manual`, `imported`
**status-Werte:** `active`, `completed`, `cancelled`

**Unique Constraint (DEC-058):** Ein User kann nicht zwei Revenue-Jahresziele fuer 2026 fuer dasselbe Produkt haben. Der COALESCE-Trick erlaubt aber separate Gesamtziele (product_id=NULL) und produktspezifische Ziele gleichzeitig.

### Neue Tabelle: kpi_snapshots (FEAT-604, DEC-059)

```sql
CREATE TABLE kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  kpi_type TEXT NOT NULL,
  kpi_value NUMERIC(14,4) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  period TEXT NOT NULL DEFAULT 'day',
  calculation_basis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotenz: Doppelter Cron-Run ueberschreibt statt dupliziert
CREATE UNIQUE INDEX idx_kpi_snapshots_unique ON kpi_snapshots(
  snapshot_date, user_id, kpi_type, period,
  COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

CREATE INDEX idx_kpi_snapshots_lookup ON kpi_snapshots(user_id, kpi_type, snapshot_date DESC);
CREATE INDEX idx_kpi_snapshots_date ON kpi_snapshots(snapshot_date DESC);

-- RLS
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON kpi_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON kpi_snapshots TO authenticated;
GRANT ALL ON kpi_snapshots TO service_role;
```

**kpi_type-Werte (DEC-059):**
- `revenue_won` — Umsatz aus Won-Deals im laufenden Monat/Quartal/Jahr
- `deal_count_won` — Anzahl Won-Deals
- `win_rate` — Won / (Won + Lost) in Prozent
- `pipeline_value_weighted` — Summe (Deal-Wert × Stage-Probability) aller offenen Deals
- `pipeline_value_unweighted` — Summe Deal-Wert aller offenen Deals
- `avg_deal_value` — Durchschnittlicher Deal-Wert (Won-Deals)
- `activity_count` — Anzahl Activities (Meetings + Anrufe + E-Mails)
- `product_revenue` — Umsatz pro Produkt (mit product_id)
- `product_deal_count` — Deal-Anzahl pro Produkt (mit product_id)

**period-Werte:** `day` (taeglicher Snapshot), `week`, `month` (aggregiert)
**calculation_basis:** JSONB mit Details zur Nachvollziehbarkeit, z.B.:
```json
{
  "deals_included": 12,
  "date_range": "2026-01-01..2026-01-31",
  "calculation": "SUM(deals.value) WHERE status='won' AND closed_at IN range"
}
```

**Warum eine generische Tabelle statt separate pro KPI (DEC-059):**
- Eine Tabelle = ein Cron-Job, ein Index-Pattern, ein Query-Pattern
- Neue KPIs hinzufuegen = nur neuer kpi_type-Wert, kein Schema-Change
- Speicherverbrauch: ~10 KPIs × 365 Tage × 5 Produkte = ~18.000 Zeilen/Jahr — vernachlaessigbar

## V6 Prognose-Engine

Die Prognose-Engine berechnet fuer jedes aktive Ziel eine realistische Erreichungsprognose.

### Berechnungslogik

```
Fuer ein Revenue-Ziel (z.B. 500.000 EUR / Jahr):

1. IST-Wert:
   SELECT SUM(d.value)
   FROM deals d
   WHERE d.status = 'won'
     AND d.closed_at >= goal.period_start
     AND d.closed_at < goal.period_end
     [AND dp.product_id = goal.product_id]  -- nur bei produktspezifischen Zielen

2. Pipeline-gewichtete Prognose:
   SELECT SUM(d.value * ps.probability / 100)
   FROM deals d
   JOIN pipeline_stages ps ON d.stage_id = ps.id
   WHERE d.status = 'active'
     [AND dp.product_id = goal.product_id]

3. Historische Prognose:
   ist_pro_tag = IST-Wert / vergangene_tage_im_zeitraum
   hochrechnung = ist_pro_tag * gesamt_tage_im_zeitraum

4. Kombinierte Prognose:
   prognose = IST-Wert + Pipeline-gewichtete Prognose
   (konservativer als historisch, weil nur reale Pipeline-Deals gezaehlt werden)

5. Delta:
   delta = goal.target_value - prognose
   delta_deals = delta / avg_deal_value  -- "Du brauchst noch N Deals"
```

### Fuer Deal-Count-Ziele:
Analog, aber COUNT statt SUM, und Pipeline-gewichtet = COUNT × probability.

### Fuer Win-Rate-Ziele:
```
win_rate = COUNT(won) / COUNT(won + lost) * 100
prognose_win_rate = (won + pipeline_expected_wins) / (won + lost + pipeline_total) * 100
```

### Mindest-Schwelle
Prognose wird erst angezeigt wenn:
- Fuer Revenue: mindestens 1 Won-Deal im Zeitraum ODER mindestens 3 aktive Pipeline-Deals
- Fuer Deal-Count: mindestens 1 abgeschlossener Deal im Zeitraum
- Fuer Win-Rate: mindestens 5 abgeschlossene Deals (Won + Lost) im Zeitraum

Darunter: "Nicht genug Daten fuer eine Prognose".

## V6 KI-Empfehlung (FEAT-603)

Die KI-Empfehlung nutzt den bestehenden Bedrock-Client (`/lib/ai/bedrock-client.ts`) und ein neues Prompt-Template.

### Prompt-Struktur

```
/lib/ai/prompts/performance-recommendation.ts

System: Du bist ein Vertriebsberater. Analysiere die Ziel-Erreichung und gib eine
konkrete, actionable Empfehlung. Maximal 3 Saetze. Keine Floskeln.

Context:
- Ziel: {type} {target_value} bis {period_end}
- IST: {current_value} ({percent}%)
- Pipeline: {pipeline_weighted} gewichtet, {pipeline_count} aktive Deals
- Abschlussquote: {win_rate}%
- Durchschn. Deal-Wert: {avg_deal_value} EUR
- Verbleibende Tage: {days_remaining}

Frage: Was muss der User konkret tun, um sein Ziel zu erreichen?
```

**Kosten:** ~$0.01 pro Empfehlung (kurzer Context, kurze Antwort). On-click (DEC-028), nicht auto-load.

## V6 KPI-Snapshot-Cron

### Cron-Konfiguration (Coolify)

```
Job: kpi-snapshot
Schedule: 0 2 * * * (taeglich um 02:00 UTC)
Command: node -e "fetch('http://localhost:3000/api/cron/kpi-snapshot', {method:'POST', headers:{'Authorization':'Bearer '+process.env.CRON_SECRET}})"
Container: app
```

### Cron-Ablauf

```
1. Authentifizierung pruefen (CRON_SECRET)
2. Aktuellen User laden (Single User — spaeter: alle aktiven User)
3. Fuer jeden KPI-Typ:
   a. Wert aus DB berechnen (SQL-Query)
   b. UPSERT in kpi_snapshots (Idempotenz via Unique Index)
4. Fuer jedes aktive Produkt:
   a. product_revenue + product_deal_count berechnen
   b. UPSERT mit product_id
5. Response: { snapshotsCreated: N, date: "2026-04-19" }
```

### Woechentliche/monatliche Aggregation

Keine separate Cron-Job. Die Aggregation wird on-demand im Performance-Cockpit berechnet:

```sql
-- Monatsdurchschnitt
SELECT AVG(kpi_value) FROM kpi_snapshots
WHERE kpi_type = 'pipeline_value_weighted'
  AND snapshot_date >= '2026-03-01' AND snapshot_date < '2026-04-01';

-- Wochenvergleich
SELECT snapshot_date, kpi_value FROM kpi_snapshots
WHERE kpi_type = 'revenue_won'
  AND snapshot_date >= now() - interval '8 weeks'
ORDER BY snapshot_date;
```

## V6 CSV-Import (FEAT-602)

### Import-Ablauf

```
1. User waehlt CSV-Datei im Browser (File Input)
2. Client-Side: Papa Parse (bestehend, keine neue Dependency noetig) liest CSV
3. Client-Side: Validierung pro Zeile:
   - type muss in [revenue, deal_count, win_rate] sein
   - period muss in [month, quarter, year] sein
   - period_start muss gueltiges Datum sein
   - target_value muss positive Zahl sein
   - product_name muss existierendem Produkt entsprechen (oder leer fuer Gesamtziel)
4. Ergebnis-Preview: Tabelle mit "wird importiert" / "Fehler" pro Zeile
5. User bestaetigt Import
6. Server Action: Bulk-Insert in goals-Tabelle, source='imported'
7. Ergebnis-Report: N importiert, M Fehler
```

### CSV-Template

```csv
type,period,period_start,target_value,product_name
revenue,year,2026-01-01,500000,
revenue,year,2026-01-01,200000,Blueprint Classic
deal_count,quarter,2026-04-01,15,
win_rate,year,2026-01-01,30,
```

**Implementation:** Server Action (kein separater API-Endpoint — DEC-060). Fuer Internal Tool ist eine Server Action ausreichend und einfacher.

## V6 UI-Architektur

### Navigation

```
ANALYSE (bestehend)
  Dashboard (bestehend)
  Meine Performance (V6 NEU)    ← /performance

VERWALTUNG (bestehend)
  Pipeline-Verwaltung (bestehend)
  Produkte (V6 NEU)             ← /settings/products
  ... (bestehende Settings)
```

### Performance-Cockpit Seite (/performance)

```
┌─────────────────────────────────────────────────────────┐
│ Meine Performance                    [Monat|Quartal|Jahr] │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│ │ Umsatz   │ │ Deals    │ │ Quote    │  ← KPI-Cards    │
│ │ ████░░░  │ │ ████████ │ │ ██░░░░░  │     mit Ring    │
│ │ 320k/500k│ │ 12/10    │ │ 22%/30%  │                 │
│ │ 64% ↑    │ │ 120% ✓   │ │ 73% ↓    │                 │
│ └──────────┘ └──────────┘ └──────────┘                 │
├─────────────────────────────────────────────────────────┤
│ Prognose                                                │
│ Pipeline-gewichtet: 420.000 EUR (+100k offen)           │
│ Historisch:         480.000 EUR (bei aktuellem Tempo)    │
│ Delta:              -80.000 EUR (noch 4 Deals noetig)   │
├─────────────────────────────────────────────────────────┤
│ [KI-Empfehlung abrufen]                   (on-click)   │
│ "Du brauchst noch 4 Abschluesse. Bei 22% Quote         │
│  brauchst du 18 aktive Deals. Du hast 11 — generiere   │
│  7 weitere Opportunities."                              │
├─────────────────────────────────────────────────────────┤
│ Pro Produkt                                             │
│ Blueprint Classic  ████████░░  180k/200k  90%           │
│ Blueprint Premium  ███░░░░░░░   90k/150k  60%           │
│ Consulting         ██░░░░░░░░   50k/150k  33%           │
├─────────────────────────────────────────────────────────┤
│ Trend (vs. Vorperiode)                                  │
│ Umsatz:  +15% vs. letzter Monat                        │
│ Deals:   +2 vs. letzter Monat                          │
│ Quote:   -3pp vs. letzter Monat                        │
└─────────────────────────────────────────────────────────┘
```

### Mein-Tag-Widget (optional, Entscheidung bei /slice-planning)

Kurze Ziel-Zusammenfassung als Card auf "Mein Tag":
```
┌─────────────────────────────────┐
│ Ziele diesen Monat              │
│ Umsatz: 64% ████░░░ (320k/500k)│
│ Deals:  120% ████████ ✓         │
│ [→ Meine Performance]           │
└─────────────────────────────────┘
```

### Produkt-Verwaltung (/settings/products)

Standard-CRUD-Seite im Settings-Bereich:
- Tabelle mit Produkten (Name, Kategorie, Preis, Status)
- Inline-Edit oder Modal fuer Anlegen/Bearbeiten
- Status-Toggle (aktiv → inaktiv → archiviert)
- Kein komplexes UI noetig (Internal Tool)

### Deal-Workspace Erweiterung

Im bestehenden Deal-Workspace (/deals/[id]):
- Neues Feld/Section: "Produkte" mit Dropdown-Zuordnung
- Preis pro Zuordnung editierbar
- Kein separater Tab — eingebettet in bestehenden "Bearbeiten"-Tab oder als eigene Section

## V6 Server Actions

```
/app/actions/
  products.ts           (NEU)
    createProduct()
    updateProduct()
    archiveProduct()
    listProducts()

  goals.ts              (NEU)
    createGoal()
    updateGoal()
    cancelGoal()
    listGoals()
    importGoalsFromCSV()
    getGoalProgress()     ← Prognose-Berechnung

  deal-products.ts      (NEU)
    assignProduct()
    removeProduct()
    updateDealProduct()
    listDealProducts()

  kpi-snapshots.ts      (NEU)
    getSnapshotTrend()
    getSnapshotComparison()
```

## V6 API Routes

```
/api/cron/kpi-snapshot   (NEU — POST, CRON_SECRET-Auth)
```

Keine weiteren API-Routes. Alles andere laeuft ueber Server Actions.

## V6 Lib-Module

```
/lib/goals/              (NEU)
  calculator.ts          ← Soll-Ist-Berechnung, Prognose-Engine
  csv-parser.ts          ← CSV-Validierung + Parsing
  types.ts               ← Goal, GoalProgress, KpiSnapshot Types

/lib/ai/prompts/
  performance-recommendation.ts  (NEU — Prompt-Template)
```

## V6 Entscheidungen

### DEC-055 — Produkt-Stammdaten als eigenstaendige Tabelle
- Status: accepted
- Reason: Produkte sind eigenstaendige Entitaeten mit eigenem Lebenszyklus (aktiv/inaktiv/archiviert), eigenen Feldern und eigenen Auswertungen. Kein JSON-Feld auf Deals, sondern normalisierte Tabelle.
- Consequence: Neue Tabelle `products` mit Standard-CRUD. Zuordnung zu Deals ueber `deal_products` (n:m).

### DEC-056 — Produkt-Kategorien als Freitext mit Autocomplete
- Status: accepted
- Reason: Produkt-Kategorien aendern sich mit dem Geschaeft. Ein festes Enum wuerde staendig Migrationen erfordern. Freitext mit Autocomplete (wie Branchen auf Firmen) ist flexibler und bereits erprobtes UI-Pattern.
- Consequence: `products.category` ist TEXT, kein Enum. Frontend bietet Autocomplete basierend auf bestehenden Werten.

### DEC-057 — Deal-Produkt-Zuordnung als n:m-Tabelle
- Status: accepted
- Reason: (1) SQL-Joins fuer Umsatz-pro-Produkt-Auswertungen sind trivial mit Tabelle, komplex mit Array. (2) Preis und Menge pro Zuordnung moeglich. (3) Referentielle Integritaet (FK-Constraints). Array-Feld waere denormalisiert und wuerde jede Auswertung verkomplizieren.
- Consequence: Neue Tabelle `deal_products` mit deal_id, product_id, price, quantity. Unique Constraint auf (deal_id, product_id).

### DEC-058 — Ziel-Unique-Constraint mit COALESCE
- Status: accepted
- Reason: Ein User soll nicht zwei Umsatz-Jahresziele fuer 2026 fuer dasselbe Produkt haben koennen. Gleichzeitig muss ein Gesamtziel (product_id=NULL) neben produktspezifischen Zielen existieren koennen. PostgreSQL behandelt NULL != NULL bei Unique Constraints, daher COALESCE auf einen Sentinel-UUID.
- Consequence: `CREATE UNIQUE INDEX ... ON goals(user_id, type, period, period_start, COALESCE(product_id, '00000000-...'::UUID))`.

### DEC-059 — KPI-Snapshots als generische Tabelle
- Status: accepted
- Reason: Eine Tabelle mit kpi_type-Spalte statt separate Tabellen pro KPI. (1) Ein Cron-Job, ein Index-Pattern, ein Query-Pattern. (2) Neue KPIs hinzufuegen = nur neuer kpi_type-Wert, kein Schema-Change. (3) Speicherverbrauch vernachlaessigbar (~18.000 Zeilen/Jahr).
- Consequence: Neue Tabelle `kpi_snapshots` mit kpi_type TEXT. Idempotenz ueber Unique Index auf (date, user, type, period, product).

### DEC-060 — CSV-Import als Server Action
- Status: accepted
- Reason: Fuer Internal Tool ist eine Server Action einfacher als ein separater API-Endpoint. Client-Side CSV-Parsing (Papa Parse), Validierung und Preview, dann Server Action fuer den tatsaechlichen Insert. Kein File-Upload an Server noetig.
- Consequence: Server Action `importGoalsFromCSV()` empfaengt validierte Daten, kein File. CSV-Parsing und Validierung passieren im Browser.

## V6 Migration

### MIG-017 — V6 Schema (Produkte, Ziele, KPI-Snapshots)

- Date: TBD (bei Implementation)
- Scope: 4 neue Tabellen (products, deal_products, goals, kpi_snapshots), Indexes, RLS-Policies, Grants
- Reason: Datenbasis fuer Produkt-Stammdaten, Ziel-Tracking und KPI-History
- Affected Areas: Deal-Workspace (Produkt-Zuordnung), neue Performance-Seite, neuer Settings-Bereich, neuer Cron-Job
- Risk: Gering — rein additiv, keine bestehenden Tabellen werden geaendert
- Rollback Notes: `DROP TABLE kpi_snapshots, goals, deal_products, products CASCADE;`

**Migrations-Datei:** `sql/17_v6_migration.sql`

Die Migration enthaelt:
1. `CREATE TABLE products` + Indexes + RLS
2. `CREATE TABLE deal_products` + Indexes + RLS
3. `CREATE TABLE goals` + Indexes + RLS (inkl. COALESCE Unique)
4. `CREATE TABLE kpi_snapshots` + Indexes + RLS (inkl. COALESCE Unique)

Keine bestehende Tabelle wird veraendert. V6 ist rein additiv.

## V6 Kosten-Schaetzung

| Operation | Kosten/Einheit | Geschaetztes Volumen | Monatlich |
|---|---|---|---|
| KI-Empfehlung (on-click) | ~$0.01/Call | ~30 Aufrufe/Monat | ~$0.30 |
| KPI-Snapshot-Cron | Kein API-Call | 1x taeglich | $0.00 |
| **Gesamt V6** | | | **~$0.30/Monat** |

Vernachlaessigbar. Kein Cost-Control-Mechanismus noetig.

## V6 Risiken

| Risiko | Mitigation |
|---|---|
| Produkt-Zuordnung auf Altdaten fehlt | Produkt-Zuordnung ist optional auf Deals. Altdaten koennen schrittweise zugeordnet werden. Gesamtziele (ohne Produkt) funktionieren sofort. |
| Prognose bei wenigen Daten unzuverlaessig | Mindest-Schwelle: Prognose erst ab N Datenpunkten. Darunter: "Nicht genug Daten". |
| CSV-Import mit fehlerhaften Daten | Client-Side Validierung + Zeilen-basierter Fehler-Report + Preview vor Import. |
| KPI-Snapshot-Cron faellt aus | Idempotenz: Naechster Run holt nach. Keine kumulative Berechnung, sondern Point-in-Time-Snapshot. Fehlender Tag = Luecke im Trend, kein Datenverlust. |
| Zu viele KPI-Typen fuellen Tabelle | Bei 10 KPIs × 365 Tage × 5 Produkte = ~18.000 Zeilen/Jahr — PostgreSQL handhabt das problemlos. Kein Cleanup noetig. |

## V6 Empfohlene Slice-Reihenfolge

1. **SLC-601 Schema-Migration + Produkt-CRUD** — 4 Tabellen anlegen (MIG-017), Produkt-Server-Actions, Produkt-Verwaltungsseite (/settings/products). Basis-Slice, blockiert alle folgenden.
2. **SLC-602 Deal-Produkt-Zuordnung** — deal_products Server Actions, Produkt-Zuordnung im Deal-Workspace (Bearbeiten-Tab), Umsatz-pro-Produkt-Query.
3. **SLC-603 Ziel-CRUD + CSV-Import** — goals Server Actions, Ziel-Verwaltung (manuell anlegen/bearbeiten/stornieren), CSV-Import mit Preview und Validierung.
4. **SLC-604 Prognose-Engine** — `/lib/goals/calculator.ts`, Soll-Ist-Berechnung, Pipeline-gewichtete + historische Prognose, Delta-Berechnung. Rein Backend/Logik.
5. **SLC-605 KPI-Snapshot-Cron** — `/api/cron/kpi-snapshot`, Cron-Job-Konfiguration, Idempotenz-Tests, Snapshot-Query-Funktionen.
6. **SLC-606 Performance-Cockpit UI** — `/performance`-Seite, Hero-KPI-Cards mit Ring/Balken, Prognose-Block, Produkt-Aufschluesselung, Trend-Vergleich.
7. **SLC-607 KI-Empfehlung + Mein-Tag-Widget** — Bedrock-Prompt, On-click-Empfehlung im Cockpit, optionales Ziel-Widget auf Mein Tag.

Geschaetzt 7 Slices, je 1-1.5 Tage. Gesamtschaetzung: ~7-10.5 Tage.

## V6 Recommended Next Step

`/slice-planning` — V6-Slices strukturiert ausdefinieren (Acceptance Criteria, Dependencies, QA-Fokus, Micro-Tasks). Danach pro Slice `/backend` oder `/frontend` + `/qa`.

---

# V6.1 — Performance Premium UI

## V6.1 Summary

Reine Frontend-Arbeit: Premium Look auf /performance, kompakteres Layout, Label-Korrektur, Wochen-Check-Erweiterung. Kein neues Schema, keine Migration, keine neuen externen Dependencies.

## V6.1 Architektur-Entscheidungen

### DEC-061 — GoalCard wird nicht durch KPICard ersetzt, sondern an dessen Muster angepasst

GoalCard hat komplexere Logik als KPICard (Progress-Ring, Prognose-Integration, abgeleitete Ziele). Statt GoalCard durch KPICard zu ersetzen, wird GoalCard mit dem KPICard-Styling aufgeruestet: Gradient-Akzentlinie, Brand-Icon-Container, hover-shadow-xl, -translate-y-0.5 Transition.

### DEC-062 — Prognose als ForecastCard statt separater ForecastBlock

Der bisherige ForecastBlock (Full-Width-Card mit 3 Sub-Spalten) wird ersetzt durch eine kompakte ForecastCard, die als 4. Kachel in die Goal-Card-Reihe passt. Die ForecastCard zeigt nur den kombinierten Forecast + Delta + "Noch X Deals noetig" — die Details (Pipeline-gewichtet, historisch, kombiniert) sind bei Bedarf per Klick/Hover erreichbar, nicht dauerhaft sichtbar.

### DEC-063 — Wochen-Check als Tab-Toggle statt separater Komponente

DailyActivityCheck wird erweitert um einen "Heute | Woche" Toggle. Die Wochen-Ansicht zeigt ein 5-Spalten-Raster (Mo-Fr) mit Ist/Soll pro KPI pro Tag. Die bestehende Tages-Ansicht bleibt unveraendert. Kein separater Route oder Seitenwechsel.

## V6.1 Aenderungsarchitektur

```
Betroffene Dateien — Uebersicht
================================

FRONTEND (Aendern):
  /components/performance/goal-card.tsx       — Premium-Styling, kompakter
  /components/performance/forecast-block.tsx  — Umbau zu ForecastCard (kompakt)
  /components/performance/daily-activity-check.tsx — Heute/Woche Toggle + Tagesraster
  /components/performance/weekly-comparison.tsx — ENTFAELLT (in DailyActivityCheck integriert)
  /app/(app)/performance/page.tsx             — Grid 4-spaltig, WeeklyComparison entfernt

FRONTEND (Label-Fix, search+replace):
  /components/performance/goal-card.tsx       — "Win-Rate" → "Abschlussquote"
  /components/performance/forecast-block.tsx  — "Win-Rate" → "Abschlussquote"
  /components/goals/goal-form.tsx             — "Win-Rate" → "Abschlussquote"
  /components/goals/goal-list.tsx             — "Win-Rate" → "Abschlussquote"
  /components/goals/csv-import-dialog.tsx     — "Win-Rate" → "Abschlussquote"

BACKEND (Kleine Erweiterung):
  /app/actions/activity-kpis.ts               — neue Funktion getWeeklyActivityKpisPerDay()
  /lib/goals/activity-kpi-queries.ts          — Hilfsfunktion dayRangesForWeek()

TYPES (Erweiterung):
  /types/activity-kpis.ts                     — neuer Typ WeekDayKpiStatus
```

## V6.1 Datenfluss — Wochen-Check

```
DailyActivityCheck (Toggle: "Woche")
    |
    v
getWeeklyActivityKpisPerDay()        ← neue Server Action
    |
    v
dayRangesForWeek()                   ← generiert Mo..Fr Tages-Ranges
    |
    v
getActivityKpiActual(admin, key, dayRange)  ← bestehende Query, pro Tag aufgerufen
    |
    v
WeekDayKpiStatus[]                   ← Array mit 5 Eintraegen (Mo-Fr)
    |
    v
DailyActivityCheck rendert 5-Spalten-Raster
```

## V6.1 Neuer Typ: WeekDayKpiStatus

```typescript
export type WeekDayKpiStatus = {
  kpiKey: ActivityKpiKey;
  label: string;
  dailyTarget: number;
  days: {
    date: string;      // ISO-Datum
    dayLabel: string;   // "Mo", "Di", "Mi", "Do", "Fr"
    actual: number;
    isToday: boolean;
  }[];
};
```

## V6.1 Premium-Styling-Pattern

Alle Performance-Cards folgen dem KPICard-Muster:

```
┌──────────────────────────────────────────┐
│ ████████████████████████████████  ← Gradient-Akzentlinie (h-1)
│                                          │
│  [Icon]  Label                    [Ring] │ ← Brand-Gradient Icon-Container
│          Sublabel                        │
│                                          │
│  Wert  Einheit                          │ ← text-2xl font-bold
│  Ziel: X                                │
│                                          │
│  [Badge: abgeleitet / nicht genug Daten]│
└──────────────────────────────────────────┘
```

CSS-Tokens aus KPICard:
- `border-2 border-slate-200`
- `rounded-xl`
- `shadow-lg` → `hover:shadow-xl hover:-translate-y-0.5`
- `transition-all duration-300`
- Gradient-Akzentlinie: `h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]`
- Icon-Container: `w-10 h-10 rounded-lg bg-gradient-to-br ${gradient}`

## V6.1 Layout-Aenderung

### Vorher (V6):
```
[Goal 1] [Goal 2] [Goal 3]     ← 3 Spalten
[    Forecast Block (full)    ] ← volle Breite
[    KI-Empfehlung            ]
[    Tages-Check              ]
[    Weekly Comparison        ] ← separate Komponente
[    Product Breakdown        ]
[    Trend Comparison         ]
```

### Nachher (V6.1):
```
[Goal 1] [Goal 2] [Goal 3] [Forecast] ← 4 Spalten
[    KI-Empfehlung                   ]
[    Tages-Check (Heute|Woche Toggle)]  ← integriert
[    Product Breakdown               ]
[    Trend Comparison                ]
```

## V6.1 Risiko-Matrix

| Risiko | Mitigation |
|--------|------------|
| 4 Kacheln passen nicht auf schmale Screens | `lg:grid-cols-4 sm:grid-cols-2 grid-cols-1` — responsive Fallback |
| Wochen-Check 5×N Queries (pro Tag pro KPI) | Max 5 KPIs × 5 Tage = 25 Queries. Parallelisiert via Promise.all. Bei Single-User akzeptabel. |
| ForecastCard zu kompakt fuer alle Infos | Nur kombinierter Forecast + Delta + Deals-noetig. Details bei Hover oder als Tooltip. |

## V6.1 Empfohlene Slice-Reihenfolge

1. **SLC-611 Label-Fix + Premium-Styling** — "Win-Rate" → "Abschlussquote" (5 Dateien), GoalCard Premium-Styling (Gradient-Akzentlinie, Shadows, Icon-Container). Kleiner Slice, schnell testbar.
2. **SLC-612 ForecastCard + 4-Kachel-Layout** — ForecastBlock → ForecastCard Umbau, Grid auf 4-spaltig, Page-Layout anpassen, WeeklyComparison entfernen.
3. **SLC-613 Wochen-Check mit Tagesaufloesung** — Server Action Erweiterung (getWeeklyActivityKpisPerDay), DailyActivityCheck mit Heute/Woche Toggle, 5-Spalten-Tagesraster.

Geschaetzt 3 Slices, je 2-3 Stunden. Gesamtschaetzung: ~1 Tag.

## V6.1 Recommended Next Step

`/slice-planning` — 3 Slices ausdefinieren mit Acceptance Criteria, Micro-Tasks, QA-Fokus.

---

# V5 — Automatisierung + Vertriebsintelligenz

## V5 Architecture Summary

V5 bringt vier neue Faehigkeiten: automatisierte Follow-up-Ketten (Cadences), automatische E-Mail-Kontakt-Zuordnung, Open/Click-Tracking fuer ausgehende E-Mails, und eine strukturierte Export-API fuer System 4 (Intelligence Studio).

**Strategie:** Rein additiv. 5 neue Tabellen, 2 bestehende Tabellen erweitert. Ein neuer Cron-Job. Eine neue oeffentliche API-Route (Tracking). 5 neue geschuetzte API-Routes (Export). Kein neuer externer Service. Bestehende Infrastruktur (SMTP, IMAP-Sync, Bedrock, Cron-Pattern) wird wiederverwendet und erweitert.

**Kern-Architektur-Entscheidungen:**
- Eigener Cadence-Execute-Cron (DEC-064)
- E-Mail-Zuordnung 3-Stufen im bestehenden Pipeline (DEC-065)
- Self-hosted Tracking via eigene API-Route (DEC-066)
- Export-API-Key als ENV-Variable (DEC-067)
- Cadence-Abbruch via Thread-ID + From-Address (DEC-068)
- Shared Email-Send-Layer mit Tracking-Injection (DEC-069)

## V5 Main Components

```
Bestehende Infrastruktur (unveraendert):
  Next.js BD Cockpit → Supabase Stack → PostgreSQL
  Bedrock Claude Sonnet (eu-central-1) → KI-Match fuer E-Mail-Zuordnung
  Coolify Cron-Jobs → Cadence-Execute-Cron (NEU)
  nodemailer / SMTP → Cadence-E-Mail-Versand (via Shared Layer)

Neue Komponenten (V5):
  /app/(app)/cadences/              → Cadence-Verwaltung (Templates + Builder)
  /app/(app)/emails/unassigned/     → Nicht-zugeordnete E-Mails Queue
  /lib/email/send.ts                → Shared Email-Send-Layer (NEU — DEC-069)
  /lib/email/tracking.ts            → Tracking-Pixel + Link-Wrapping Injection
  /lib/cadence/                     → Cadence-Engine (Execution, Abort-Check, Template-Rendering)
  /api/track/[id]/route.ts          → Tracking-Endpoint (oeffentlich, kein Auth)
  /api/cron/cadence-execute         → Cadence-Ausfuehrungs-Cron (NEU — DEC-064)
  /api/export/deals                 → Export-Endpoint (API-Key-Auth)
  /api/export/contacts              → Export-Endpoint
  /api/export/activities            → Export-Endpoint
  /api/export/signals               → Export-Endpoint
  /api/export/insights              → Export-Endpoint
```

## V5 Responsibilities

| Component | Verantwortung |
|---|---|
| `/lib/email/send.ts` | Zentraler E-Mail-Versand: SMTP via nodemailer, Tracking-Injection, DB-Logging. Ersetzt direkte nodemailer-Aufrufe in actions.ts |
| `/lib/email/tracking.ts` | Tracking-Pixel (1x1 GIF) in HTML einbetten, Link-Wrapping (Redirect-URLs), Tracking-ID-Generierung |
| `/lib/cadence/` | Cadence-Logik: Template-Rendering mit Variablen, Enrollment-Management, Step-Execution, Abort-Check |
| `/api/track/[id]` | Oeffentlicher Endpoint: Open-Event (liefert 1x1 GIF) + Click-Event (loggt + Redirect). Kein Auth. |
| `/api/cron/cadence-execute` | Faellige Enrollments laden, Schritte ausfuehren (E-Mail/Task/Wait), Abort-Bedingungen pruefen |
| `/api/cron/classify` (erweitert) | ZUSAETZLICH: KI-Match fuer nicht-zugeordnete E-Mails (Stufe 2, DEC-065) |
| `/api/export/*` | 5 read-only JSON-Endpoints mit API-Key-Auth, Pagination, Zeitraum-Filter |

## V5 Data Model

### Tabellen-Uebersicht V5: 38 Tabellen (33 bestehend + 5 neu)

```
BESTEHEND (unveraendert):              NEU (V5):
├── companies                          ├── cadences
├── contacts                           ├── cadence_steps
├── pipelines                          ├── cadence_enrollments
├── pipeline_stages                    ├── cadence_executions
├── deals                              └── email_tracking_events
├── proposals
├── fit_assessments                    BESTEHEND (erweitert V5):
├── tasks                              ├── emails (+2: tracking_id, tracking_enabled)
├── handoffs                           └── email_messages (+2: assignment_source, ai_match_confidence)
├── referrals
├── signals
├── documents
├── activities
├── profiles
├── meetings
├── calendar_events
├── audit_log
├── email_templates (V3.1)
├── email_messages (IMAP, V4)
├── email_threads (V4)
├── email_sync_state (V4)
├── ai_action_queue (V4)
├── ai_feedback (V4)
├── user_settings (V4.1)
├── knowledge_chunks (V4.2)
├── products (V6)
├── deal_products (V6)
├── goals (V6)
└── kpi_snapshots (V6)
```

### Neue Tabelle: cadences (FEAT-501)

```sql
CREATE TABLE cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cadences_status ON cadences(status);

-- RLS
ALTER TABLE cadences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON cadences
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON cadences TO authenticated;
GRANT ALL ON cadences TO service_role;
```

**status-Werte:** `active`, `paused`, `archived`

### Neue Tabelle: cadence_steps (FEAT-501)

```sql
CREATE TABLE cadence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES cadences(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL,
  delay_days INT NOT NULL DEFAULT 0,
  -- E-Mail-Schritt
  email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  email_subject TEXT,
  email_body TEXT,
  -- Aufgaben-Schritt
  task_title TEXT,
  task_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cadence_steps_cadence ON cadence_steps(cadence_id, step_order);

-- RLS
ALTER TABLE cadence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON cadence_steps
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON cadence_steps TO authenticated;
GRANT ALL ON cadence_steps TO service_role;
```

**step_type-Werte:** `email`, `task`, `wait`
**delay_days:** Wartezeit in Tagen vor Ausfuehrung dieses Schritts (0 = sofort nach vorherigem Schritt)
**email_template_id:** Referenz auf bestehendes email_templates. Alternativ: Inline email_subject + email_body fuer einfache Cadences ohne Template.
**task_title/task_description:** Werden bei Ausfuehrung in die bestehende tasks-Tabelle geschrieben.

### Neue Tabelle: cadence_enrollments (FEAT-501)

```sql
CREATE TABLE cadence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES cadences(id) ON DELETE CASCADE,
  -- Enrollment-Target: entweder Deal oder Kontakt
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  current_step_order INT NOT NULL DEFAULT 1,
  next_execute_at TIMESTAMPTZ NOT NULL,
  -- Tracking
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  stop_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Constraint: mindestens Deal oder Kontakt
  CONSTRAINT enrollment_target CHECK (deal_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE INDEX idx_cadence_enrollments_active ON cadence_enrollments(status, next_execute_at)
  WHERE status = 'active';
CREATE INDEX idx_cadence_enrollments_cadence ON cadence_enrollments(cadence_id);
CREATE INDEX idx_cadence_enrollments_deal ON cadence_enrollments(deal_id)
  WHERE deal_id IS NOT NULL;
CREATE INDEX idx_cadence_enrollments_contact ON cadence_enrollments(contact_id)
  WHERE contact_id IS NOT NULL;
-- Kein doppeltes Enrollment desselben Targets in dieselbe Cadence
CREATE UNIQUE INDEX idx_cadence_enrollments_unique ON cadence_enrollments(
  cadence_id,
  COALESCE(deal_id, '00000000-0000-0000-0000-000000000000'::UUID),
  COALESCE(contact_id, '00000000-0000-0000-0000-000000000000'::UUID)
) WHERE status = 'active';

-- RLS
ALTER TABLE cadence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON cadence_enrollments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON cadence_enrollments TO authenticated;
GRANT ALL ON cadence_enrollments TO service_role;
```

**status-Werte:** `active`, `completed`, `stopped`, `paused`
**stop_reason-Werte:** `reply_received`, `deal_won`, `deal_lost`, `manual`, `cadence_paused`
**next_execute_at:** Zeitpunkt, wann der naechste Schritt faellig ist. Wird bei jedem Schritt-Advance um `delay_days` des naechsten Schritts vorwaerts gesetzt.
**Unique-Constraint:** Verhindert, dass ein Deal/Kontakt gleichzeitig zweimal in derselben Cadence eingebucht ist (nur fuer aktive Enrollments).

### Neue Tabelle: cadence_executions (FEAT-501)

```sql
CREATE TABLE cadence_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES cadence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES cadence_steps(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL,
  -- Ergebnis
  status TEXT NOT NULL DEFAULT 'executed',
  result_detail TEXT,
  -- Referenzen auf erstellte Objekte
  email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cadence_executions_enrollment ON cadence_executions(enrollment_id);
CREATE INDEX idx_cadence_executions_step ON cadence_executions(step_id);

-- RLS
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON cadence_executions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON cadence_executions TO authenticated;
GRANT ALL ON cadence_executions TO service_role;
```

**status-Werte:** `executed`, `skipped`, `failed`
**email_id:** Referenz auf die gesendete E-Mail (bei email-Schritten)
**task_id:** Referenz auf die erstellte Aufgabe (bei task-Schritten)

### Neue Tabelle: email_tracking_events (FEAT-506)

```sql
CREATE TABLE email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL,
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- Click-spezifisch
  link_url TEXT,
  link_index INT,
  -- Metadaten
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tracking_events_tracking ON email_tracking_events(tracking_id);
CREATE INDEX idx_tracking_events_email ON email_tracking_events(email_id);
CREATE INDEX idx_tracking_events_type ON email_tracking_events(event_type);

-- RLS
ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON email_tracking_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON email_tracking_events TO authenticated;
GRANT ALL ON email_tracking_events TO service_role;
```

**event_type-Werte:** `open`, `click`
**tracking_id:** UUID, generiert beim E-Mail-Versand, verbindet Pixel-/Link-Events mit der E-Mail
**link_url:** Original-URL des geklickten Links (bei click-Events)
**link_index:** Position des Links im E-Mail-Body (fuer Auswertung welcher Link geklickt wurde)
**ip_address + user_agent:** Fuer grundlegende Engagement-Analyse, keine Personen-Identifikation

### Tabellen-Erweiterung: emails (FEAT-506)

```sql
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tracking_id UUID;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT TRUE;

CREATE UNIQUE INDEX idx_emails_tracking ON emails(tracking_id) WHERE tracking_id IS NOT NULL;
```

**tracking_id:** Generiert beim Versand durch den Shared Email-Send-Layer. Verbindet E-Mail mit Tracking-Events.
**tracking_enabled:** Default TRUE. Erlaubt Opt-out pro E-Mail.

### Tabellen-Erweiterung: email_messages (FEAT-505)

```sql
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS assignment_source TEXT;
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS ai_match_confidence NUMERIC(3,2);

CREATE INDEX idx_email_messages_unassigned ON email_messages(contact_id)
  WHERE contact_id IS NULL AND classification NOT IN ('spam', 'newsletter', 'auto_reply');
```

**assignment_source-Werte:** `exact_match`, `domain_match`, `ki_match`, `manual`, `null` (noch nicht zugeordnet)
**ai_match_confidence:** 0.00-1.00, nur bei `ki_match` gesetzt. Confidence des Bedrock-Match.
**Index:** Optimiert die "Unzugeordnet"-Queue-Abfrage.

## V5 Shared Email-Send-Layer (DEC-069)

Aktuell sendet `emails/actions.ts` direkt via nodemailer. V5 zentralisiert den E-Mail-Versand in `/lib/email/send.ts`, damit sowohl manueller Versand als auch Cadence-Execution denselben Pfad nutzen — inklusive Tracking-Injection.

```
Ausloeser (manuell oder Cadence)
    |
    v
/lib/email/send.ts — sendEmail(params)
    |
    ├── 1. tracking_id generieren (UUID)
    ├── 2. HTML-Body erzeugen (Text → HTML Wrapping)
    ├── 3. Tracking-Pixel einbetten (1x1 GIF am Ende des Body)
    │       <img src="https://business.strategaizetransition.com/api/track/{tracking_id}?t=open" width="1" height="1" />
    ├── 4. Links wrappen (jede <a href="..."> → /api/track/{tracking_id}?t=click&url={encoded_original})
    ├── 5. nodemailer.sendMail({ from, to, subject, html })
    ├── 6. INSERT emails { ..., tracking_id, tracking_enabled, status: 'sent' }
    └── 7. Return { emailId, trackingId }
```

### Template-Rendering (Cadence)

Cadence-E-Mail-Schritte rendern Templates mit Kontakt-/Deal-Variablen:

```
Verfuegbare Variablen:
  {{kontakt.vorname}}     → contacts.first_name
  {{kontakt.nachname}}    → contacts.last_name
  {{kontakt.email}}       → contacts.email
  {{kontakt.firma}}       → companies.name (via contact.company_id)
  {{deal.name}}           → deals.name
  {{deal.wert}}           → deals.value
  {{deal.stage}}          → pipeline_stages.name
  {{absender.name}}       → profiles.full_name (Eigentuemer)
```

Rendering ist einfaches String-Replace (`{{key}}` → Wert). Kein Template-Engine-Framework noetig fuer V5.

## V5 Cadence-Execution Flow (FEAT-501)

```
/api/cron/cadence-execute (alle 15 Min)
  │
  ├── 1. Cron-Secret pruefen
  ├── 2. Aktive Enrollments laden WHERE status='active' AND next_execute_at <= now()
  │      └── LIMIT 20 pro Lauf (Batching bei Single-User ausreichend)
  │
  ├── 3. Pro Enrollment:
  │      │
  │      ├── 3a. Abort-Check (VOR Schritt-Ausfuehrung):
  │      │      ├── Antwort empfangen? (DEC-068)
  │      │      │   ├── Primaer: email_messages WHERE thread_id IN (threads der Cadence-E-Mails)
  │      │      │   │   AND from_address != SMTP_FROM_EMAIL AND received_at > enrollment.started_at
  │      │      │   └── Fallback: email_messages WHERE from_address = enrollment.contact.email
  │      │      │       AND received_at > enrollment.started_at
  │      │      ├── Deal gewonnen? (deals.status = 'won')
  │      │      └── Deal verloren? (deals.status = 'lost')
  │      │      │
  │      │      └── Wenn Abort → enrollment.status='stopped', stop_reason setzen, SKIP
  │      │
  │      ├── 3b. Aktuellen Schritt laden (cadence_steps WHERE cadence_id AND step_order = current_step_order)
  │      │
  │      ├── 3c. Schritt ausfuehren:
  │      │      ├── email: Template rendern → sendEmail() → cadence_executions INSERT
  │      │      ├── task: tasks INSERT → cadence_executions INSERT
  │      │      └── wait: Kein Seiteneffekt (Wartezeit ist im delay_days des naechsten Schritts)
  │      │
  │      └── 3d. Naechsten Schritt vorbereiten:
  │             ├── Naechster Schritt existiert?
  │             │   ├── Ja: current_step_order++, next_execute_at = now() + naechster.delay_days
  │             │   └── Nein: enrollment.status='completed', completed_at=now()
  │             └── UPDATE cadence_enrollments
  │
  └── 4. Response: { processed: N, stopped: N, completed: N, errors: N }
```

### Enrollment-Lifecycle

```
[Nicht eingebucht]
       │
       v  (Einbuchen-Aktion auf Deal/Kontakt-Workspace)
     active ──────────────────────────────────────────── stopped
       │                                                   ^
       │  (Schritte werden nacheinander ausgefuehrt)       │
       │                                                   ├── reply_received
       │                                                   ├── deal_won
       │                                                   ├── deal_lost
       │                                                   ├── manual
       v                                                   └── cadence_paused
   completed
```

## V5 E-Mail Auto-Zuordnung Flow (FEAT-505, DEC-065)

### Stufe 1: Exakter Match — im IMAP-Sync (bestehend, erweitert)

Der bestehende IMAP-Sync (`/api/cron/imap-sync`) macht bereits Kontakt-Matching:
```
from_address → contacts.email → match → contact_id setzen
```

**Erweiterung V5:** Bei Match → `assignment_source = 'exact_match'` setzen.
Bei Domain-Match → `assignment_source = 'domain_match'` setzen.
Kein Match → `assignment_source = NULL` (fuer Stufe 2).

### Stufe 2: KI-Match — im Classify-Cron (bestehend, erweitert)

```
/api/cron/classify (bestehend, alle 15 Min)
  │
  ├── ... bestehende Klassifikation ...
  │
  ├── NEU: Nach Klassifikation, falls contact_id IS NULL
  │        UND classification IN ('anfrage', 'antwort'):
  │
  │   ├── 1. Name aus From-Header extrahieren (from_name)
  │   ├── 2. Name aus E-Mail-Signatur extrahieren (body_text, letzte 5 Zeilen)
  │   ├── 3. Kontakt-Kandidaten laden:
  │   │      SELECT id, first_name, last_name, email, company_id
  │   │      FROM contacts WHERE status != 'archived' LIMIT 200
  │   ├── 4. Bedrock-Match-Prompt:
  │   │      Input: { from_name, from_address, signature_name, subject, kontakt_liste }
  │   │      Output: { contact_id: UUID|null, confidence: 0.0-1.0, reasoning: string }
  │   ├── 5. Wenn confidence >= 0.7 → automatisch zuordnen:
  │   │      email_messages UPDATE SET contact_id, company_id, assignment_source='ki_match', ai_match_confidence
  │   └── 6. Wenn confidence 0.3-0.69 → ai_action_queue INSERT (type='assign_contact', Vorschlag)
  │          Wenn confidence < 0.3 → assignment_source bleibt NULL (Stufe 3)
  │
  └── ...
```

### Stufe 3: Manuelle Zuordnung — Unassigned-Queue UI

```
/app/(app)/emails/unassigned/
  │
  ├── Tabelle: email_messages WHERE contact_id IS NULL
  │           AND classification NOT IN ('spam', 'newsletter', 'auto_reply')
  │           ORDER BY received_at DESC
  │
  ├── Pro E-Mail: From, Subject, Preview, KI-Vorschlag (wenn vorhanden aus ai_action_queue)
  │
  └── Aktionen:
      ├── Kontakt zuordnen (Dropdown/Suche) → assignment_source='manual'
      ├── Als irrelevant markieren → classification='spam' oder 'newsletter'
      └── Neuen Kontakt erstellen (Out of Scope V5, aber Platzhalter-Button)
```

## V5 Tracking Flow (FEAT-506, DEC-066)

### Open-Tracking

```
E-Mail-Empfaenger oeffnet E-Mail
    │
    v
E-Mail-Client laedt Pixel-Bild:
  GET /api/track/{tracking_id}?t=open
    │
    v
/api/track/[id]/route.ts
    ├── 1. tracking_id aus URL
    ├── 2. email_id via tracking_id Lookup (emails.tracking_id)
    ├── 3. INSERT email_tracking_events { tracking_id, email_id, event_type: 'open', ip, user_agent }
    └── 4. Response: 1x1 transparent GIF (image/gif), Cache-Control: no-cache
```

### Click-Tracking

```
E-Mail-Empfaenger klickt Link
    │
    v
Browser laedt Redirect-URL:
  GET /api/track/{tracking_id}?t=click&url={encoded_original_url}&idx={link_index}
    │
    v
/api/track/[id]/route.ts
    ├── 1. tracking_id + url + idx aus URL
    ├── 2. email_id via tracking_id Lookup
    ├── 3. INSERT email_tracking_events { tracking_id, email_id, event_type: 'click', link_url, link_index, ip, user_agent }
    └── 4. Response: 302 Redirect → original_url
```

### Tracking-API-Route Sicherheit

- **Kein Auth**: E-Mail-Clients senden keine Cookies oder Bearer-Tokens. Der Endpoint muss oeffentlich sein.
- **Keine PII**: IP-Adresse und User-Agent werden gespeichert, aber nicht mit Personen korreliert. Dient nur der Engagement-Analyse.
- **Rate-Limiting**: Kein aktives Rate-Limiting noetig (Single-User, geringes Volumen). Bei Abuse: Cloudflare/Hetzner-Firewall.
- **Middleware-Whitelist**: `/api/track/*` wird zur bestehenden Auth-Middleware-Whitelist hinzugefuegt (wie bereits `/api/cron/*` und `/consent/*`).

### Tracking-Aggregation (UI)

Auf E-Mail-Detail und in der Timeline:
```
Aggregation: SELECT event_type, COUNT(*) FROM email_tracking_events
             WHERE email_id = $1 GROUP BY event_type

Anzeige: "3× geoeffnet, 1 Link geklickt" oder "Nicht geoeffnet"
```

## V5 Export-API Flow (FEAT-504, DEC-067)

```
System 4 (Intelligence Studio)
    │
    v
GET /api/export/deals?since=2026-01-01&until=2026-04-21&page=1&limit=50
  Header: Authorization: Bearer {EXPORT_API_KEY}
    │
    v
/api/export/[entity]/route.ts
    ├── 1. API-Key pruefen (Bearer Token == process.env.EXPORT_API_KEY)
    │      Fehler: 401 Unauthorized
    ├── 2. Query-Parameter parsen (since, until, page, limit)
    ├── 3. Supabase-Query mit service_role (kein User-Auth noetig)
    ├── 4. Pagination: OFFSET = (page-1) * limit, LIMIT = limit (max 100)
    └── 5. Response: { data: [...], pagination: { page, limit, total, hasMore } }
```

### Export-Endpoints Detail

| Endpoint | Daten | Join-Tabellen |
|---|---|---|
| `GET /api/export/deals` | Deals mit Stage, Value, Products, Status | pipeline_stages, deal_products, products |
| `GET /api/export/contacts` | Kontakte mit Firma, Beziehungstyp, Qualitaetsfelder | companies |
| `GET /api/export/activities` | Activities mit Typ, Entity-Referenz | — |
| `GET /api/export/signals` | Extrahierte Signale (V4.3) | meetings, email_messages |
| `GET /api/export/insights` | Genehmigte KI-Insights aus ai_action_queue | — |

### Export-API Sicherheit

- API-Key als `EXPORT_API_KEY` ENV-Variable (DEC-067). Single-User, ein Key reicht.
- Kein OAuth2 (nachruestbar in V7 bei Multi-User oder externem Zugriff).
- Rate-Limiting: 100 Requests/Minute (einfacher In-Memory-Counter, kein Redis noetig).
- service_role Client fuer DB-Zugriff (kein User-Auth-Context, da System-zu-System).

## V5 API Routes

| Route | Methode | Beschreibung | Auth |
|---|---|---|---|
| `/api/cron/cadence-execute` | POST | Faellige Cadence-Schritte ausfuehren | CRON_SECRET |
| `/api/track/[id]` | GET | Tracking-Event erfassen (Open/Click) | Keine (oeffentlich) |
| `/api/export/deals` | GET | Deals exportieren | EXPORT_API_KEY |
| `/api/export/contacts` | GET | Kontakte exportieren | EXPORT_API_KEY |
| `/api/export/activities` | GET | Aktivitaeten exportieren | EXPORT_API_KEY |
| `/api/export/signals` | GET | Signale exportieren | EXPORT_API_KEY |
| `/api/export/insights` | GET | Insights exportieren | EXPORT_API_KEY |

### Bestehende Routes — Erweiterungen

| Route | Aenderung |
|---|---|
| `/api/cron/imap-sync` | + assignment_source setzen bei Kontakt-Match (Stufe 1) |
| `/api/cron/classify` | + KI-Match fuer nicht-zugeordnete E-Mails (Stufe 2) |

## V5 Cron-Konfiguration

```
Coolify Cron
  │
  ├── BESTEHEND (unveraendert):
  │   ├── alle 5 Min  → POST /api/cron/imap-sync           (ERWEITERT: assignment_source)
  │   ├── alle 5 Min  → POST /api/cron/meeting-transcript
  │   ├── alle 5 Min  → POST /api/cron/meeting-summary
  │   ├── alle 5 Min  → POST /api/cron/meeting-reminders
  │   ├── alle 5 Min  → POST /api/cron/signal-extract
  │   ├── alle 15 Min → POST /api/cron/classify             (ERWEITERT: KI-Match Stufe 2)
  │   ├── alle 15 Min → POST /api/cron/embedding-sync
  │   ├── alle 6h     → POST /api/cron/followups
  │   ├── taeglich    → POST /api/cron/retention
  │   ├── alle 2 Min  → POST /api/cron/meeting-recording-poll
  │   ├── taeglich    → POST /api/cron/recording-retention
  │   ├── taeglich    → POST /api/cron/pending-consent-renewal
  │   └── taeglich    → POST /api/cron/kpi-snapshot
  │
  └── NEU (V5):
      └── alle 15 Min → POST /api/cron/cadence-execute      (Header: x-cron-secret)
```

### Coolify Cron-Job Setup

```
Cron Expression: */15 * * * *
Container: app
Command: node -e "fetch('http://localhost:3000/api/cron/cadence-execute', {method:'POST', headers:{'Authorization':'Bearer '+process.env.CRON_SECRET}})"
```

## V5 Env Vars — Neue Variablen

```bash
# Export-API (DEC-067)
EXPORT_API_KEY=...                    # API-Key fuer System 4 Export-Endpoints (generiert via openssl rand -hex 32)

# Tracking (DEC-066)
TRACKING_BASE_URL=...                 # Optional. Default: APP_URL. Base-URL fuer Tracking-Pixel/Links.
                                      # Format: https://business.strategaizetransition.com
                                      # Wird nur gesetzt wenn Tracking ueber andere Domain laufen soll.
```

Bestehende Variablen die weiterverwendet werden:
- `CRON_SECRET` — fuer cadence-execute Cron
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` — fuer Cadence-E-Mail-Versand
- `BEDROCK_REGION`, `BEDROCK_ACCESS_KEY_ID`, `BEDROCK_SECRET_ACCESS_KEY` — fuer KI-Match (Stufe 2)

## V5 Security / Privacy

### Tracking-Daten

- Tracking-Events erfassen IP-Adresse und User-Agent. Diese Daten sind technisch notwendig fuer die Engagement-Analyse, aber keine personenbezogenen Daten im engeren Sinne (kein Login, keine Cookies).
- Tracking-Events werden mit der E-Mail verknuepft, nicht mit einer Person. Die Zuordnung Person → E-Mail existiert bereits im CRM.
- Retention: Tracking-Events werden mit der E-Mail geloescht (ON DELETE CASCADE).

### Export-API

- API-Key-Authentifizierung schuetzt vor unautorisiertem Zugriff.
- service_role Zugriff umgeht RLS — akzeptabel, weil die API nur System-zu-System ist und keine User-Session hat.
- Export-Endpoints liefern nur Daten, die der Eigentuemer sowieso im CRM sieht. Kein zusaetzliches Datenschutzrisiko.

### Cadence-E-Mails

- Cadence-E-Mails werden ueber denselben SMTP-Pfad gesendet wie manuelle E-Mails. Kein zusaetzlicher Sicherheitsaspekt.
- Cadence-Abbruch bei Antwort schuetzt davor, dass ein Kontakt trotz Antwort weiter bombardiert wird.
- Cadences haben kein automatisches Volumen-Limit in V5. Bei Single-User und 20-50 Deals ist das Risiko gering. Bei Skalierung: Rate-Limit nachruestbar.

### Middleware-Whitelist Erweiterung

Bestehende oeffentliche Routen: `/api/cron/*`, `/consent/*`
Neu: `/api/track/*`

## V5 Constraints & Tradeoffs

| Entscheidung | Konsequenz |
|---|---|
| Eigener Cadence-Cron (DEC-064) | Saubere Trennung, aber ein Cron mehr in Coolify. Bei Single-User kein Performance-Problem. |
| KI-Match im Classify-Cron (DEC-065) | Keine zusaetzliche Cron-Route noetig, aber Classify-Cron wird komplexer. Max-Laufzeit von 60s beachten. |
| Self-hosted Tracking (DEC-066) | Volle Kontrolle, aber keine Zuverlaessigkeits-Garantie (Pixel-Blocking ~30-50%). Akzeptabel als Indikator. |
| ENV-API-Key (DEC-067) | Simpel, aber Key-Rotation erfordert Redeploy. Bei Single-User akzeptabel. |
| Thread-ID + From-Address Fallback (DEC-068) | Zwei Pfade fuer Abort-Erkennung. Robuster als nur Thread-ID, aber kann False-Positives bei From-Address-Fallback haben (Kontakt schreibt unabhaengige E-Mail → Cadence stoppt). Akzeptabel fuer V5. |
| Shared Email-Send-Layer (DEC-069) | Refactoring des bestehenden sendEmail. Einmaliger Aufwand, spart Code-Duplikation zwischen manuell und Cadence. |
| emails Tabelle erweitert (nicht neue Tabelle) | Tracking als Erweiterung der bestehenden outbound-Tabelle, nicht als separate Tabelle. Weniger Joins, sauberer. |
| Cadence-Variablen als String-Replace | Simpel, aber keine Verschachtelung, keine Conditionals. Fuer V5-Scope ausreichend. |

## V5 Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Pixel-Blocking durch E-Mail-Clients (Apple Mail, Outlook) | Hoch | Niedrig | Tracking ist Indikator, nicht absolute Metrik. UI zeigt "nicht geoeffnet" als Default. |
| IMAP-Delay bei Cadence-Abort | Mittel | Mittel | 5-Min-Sync-Intervall. Im Worst Case wird ein Schritt ausgefuehrt bevor die Antwort synchronisiert ist. Bei 15-Min-Cadence-Intervall: max 20 Min Verzoegerung. |
| Classify-Cron-Laufzeit mit KI-Match | Niedrig | Mittel | KI-Match nur fuer E-Mails ohne Kontakt UND classification anfrage/antwort. Typisch <5 E-Mails pro Lauf. |
| Export-API-Performance bei grossen Datenmengen | Niedrig | Niedrig | Pagination mit max 100 Items pro Request. Bei Single-User-Datenvolumen (~500 Deals, ~2000 Kontakte) kein Problem. |
| Cadence-E-Mail als Spam klassifiziert | Mittel | Mittel | Selber SMTP-Pfad wie manuelle E-Mails. SPF/DKIM vom bestehenden Provider (IONOS). |

## V5 Empfohlene Slice-Reihenfolge

1. **SLC-501 Schema-Migration + Types** — Alle 5 neuen Tabellen, 2 Tabellen-Erweiterungen, TypeScript-Types. Basis-Slice, blockiert alle folgenden.
2. **SLC-502 Shared Email-Send-Layer + Tracking-API** — `/lib/email/send.ts`, `/lib/email/tracking.ts`, `/api/track/[id]`, Refactoring von emails/actions.ts, email_tracking_events INSERT. Grundlage fuer Cadence-Versand und Tracking-UI.
3. **SLC-503 E-Mail Auto-Zuordnung** — IMAP-Sync-Erweiterung (assignment_source), Classify-Cron-Erweiterung (KI-Match), Unassigned-Queue UI, manuelle Zuordnung.
4. **SLC-504 Cadence-Backend** — CRUD Server Actions fuer cadences/steps/enrollments, Cadence-Execute-Cron, Abort-Check-Logik, Template-Rendering.
5. **SLC-505 Cadence-Frontend** — Cadence-Builder UI, Enrollment-Aktion auf Deal/Kontakt-Workspace, Enrollment-Status-Anzeige, Cadence-Uebersichtsseite.
6. **SLC-506 Export-API** — 5 Export-Endpoints, API-Key-Middleware, Pagination, Zeitraum-Filter. Unabhaengig von Slices 2-5.
7. **SLC-507 Tracking-UI + Engagement-Indikatoren** — Open/Click-Status auf E-Mail-Detail, Engagement-Badge in Timeline/Workspace, Cadence-Enrollment-Status auf Deal/Kontakt-Workspace.

### Abhaengigkeiten

```
SLC-501 (Schema)
  ├── SLC-502 (Tracking-Layer)
  │     ├── SLC-504 (Cadence-Backend) — benoetigt sendEmail mit Tracking
  │     │     └── SLC-505 (Cadence-Frontend)
  │     └── SLC-507 (Tracking-UI) — benoetigt Tracking-Events
  ├── SLC-503 (Auto-Zuordnung) — unabhaengig von Tracking/Cadence
  └── SLC-506 (Export-API) — unabhaengig von Tracking/Cadence
```

SLC-503 und SLC-506 koennen parallel zu SLC-502 implementiert werden.

Geschaetzt 7 Slices, je 0.5-1.5 Tage. Gesamtschaetzung: ~5-8 Tage.

## V5 Recommended Next Step

`/slice-planning` — V5-Slices strukturiert ausdefinieren (Acceptance Criteria, Dependencies, QA-Fokus, Micro-Tasks). Danach pro Slice `/backend` oder `/frontend` + `/qa`.

---

# V5.1 Architektur — Asterisk Telefonie + SMAO Voice-Agent-Vorbereitung

## V5.1 Architecture Summary

V5.1 bringt eine eigene Asterisk-basierte Telefonanlage als Docker-Container auf den bestehenden Hetzner-Server. Browser-Telefonie ueber WebRTC (SIP.js → WSS → Asterisk) ermoeglicht Click-to-Call direkt aus dem Deal-Workspace. Jedes Gespraech wird automatisch aufgezeichnet (MixMonitor), durch die bestehende Whisper-Transkriptions-Pipeline und Bedrock-Summary geschickt und als Call-Activity in der Deal-Timeline angezeigt.

**Strategie:** Additiv. Ein neuer Docker-Container (Asterisk), eine neue Tabelle (`calls`), eine neue Subdomain (WSS), ein neuer Cron-Job. Bestehende Infrastruktur (Whisper-Adapter, Bedrock, Supabase Storage, Activity-System, Retention-Cron) wird wiederverwendet. Kein externer Kostenblock — alles intern testbar ohne SIP-Trunk.

**Kern-Architektur-Entscheidungen:**
- Asterisk 20 LTS als Docker-Container (DEC-070)
- SIP.js als WebRTC-Library im Browser (DEC-071)
- WSS ueber eigene Subdomain sip.strategaizetransition.com (DEC-072)
- WAV-Aufnahme via MixMonitor (DEC-073)
- Calls als eigene Tabelle, Activity fuer Timeline (DEC-074, erweitert DEC-021)
- Generisches VoiceAgentProvider-Interface fuer SMAO (DEC-075)
- Statische Asterisk-Konfiguration, kein ARI (DEC-076)
- RTP-Port-Range 16384-16484, kein Konflikt mit Jitsi JVB (DEC-077)

## V5.1 Main Components

```
Browser (User)                           Hetzner CPX32 (bestehend)
─────────────────                        ────────────────────────────────
Deal-Workspace UI    ───────► Next.js App (Port 3000)
  └── "Anrufen"-Button                   ├── /app/(app)/deals/[id]/   (ERWEITERT)
       ├── Click-to-Call                  │     └── CallWidget (NEU V5.1)
       ├── In-Call-Widget                 │
       │   (Waehlen/Klingeln/            ├── /lib/telephony/            (NEU V5.1)
       │    Verbunden/Beendet)           │     ├── sip-config.ts
       ├── Call-Verlauf                   │     └── call-manager.ts
       └── Summary in Timeline           │
                                         ├── /lib/telephony/voice-agent/ (NEU V5.1)
SIP.js (im Browser)                      │     ├── provider.ts  (Interface)
  ├── UserAgent                          │     ├── smao.ts      (V5.1 Implementierung)
  ├── Registerer                         │     ├── synthflow.ts (Platzhalter)
  ├── Inviter (ausgehend)                │     └── factory.ts   (ENV-Switch)
  └── Session (In-Call)                  │
       │                                 ├── /api/webhooks/voice-agent   (NEU V5.1)
       │ WSS                             ├── /api/cron/call-processing   (NEU V5.1)
       │                                 │
       └──────► Traefik (TLS-Terminierung)
                   │                     Asterisk PBX (NEU V5.1, Docker)
                   └──► asterisk:8089    ├── PJSIP (res_pjsip)
                        (WebSocket)      ├── WebSocket Transport (res_pjsip_transport_websocket)
                                         ├── Dialplan (extensions.conf)
                                         │   ├── [webrtc-outbound] → SIP-Trunk (wenn enabled)
                                         │   ├── [from-trunk]      → Eingehend (Asterisk oder SMAO)
                                         │   └── [internal-test]   → Echo-Test, Browser-zu-Browser
                                         ├── MixMonitor → /var/spool/asterisk/monitor/{callId}.wav
                                         └── SIP-Trunk-Endpoint (via ENV, deaktiviert in V5.1)

                                         Bestehend (unveraendert):
                                         ├── /lib/ai/transcription/    (Whisper-Adapter V4.1)
                                         ├── /lib/ai/bedrock/          (LLM-Layer)
                                         ├── /lib/ai/embeddings/       (RAG V4.2)
                                         └── Jitsi Stack (5 Container, V4.1)

External
────────
SIP-Trunk (sipgate/easybell)  ◄──── Asterisk (ERST BEI GO-LIVE, nicht V5.1)
SMAO Voice-Agent              ◄──── Asterisk SIP + Webhook (VORBEREITET, nicht verbunden)
OpenAI Whisper API            ◄──── /lib/ai/transcription/ (bestehend)
AWS Bedrock (Frankfurt)       ◄──── /lib/ai/bedrock/ (bestehend)
```

## V5.1 Responsibilities

| Komponente | Verantwortung |
|---|---|
| Asterisk PBX (Docker) | SIP-Server, WebRTC-Endpunkt via WSS, Dialplan-Routing, MixMonitor-Aufnahme, SIP-Trunk-Gateway (spaeter) |
| SIP.js (Browser-Library) | WebRTC SIP User Agent: Registrierung, INVITE/BYE, Audio-Stream, Call-Status-Events |
| Traefik (bestehend) | TLS-Terminierung fuer sip.strategaizetransition.com, WSS → WS-Proxy zu Asterisk:8089 |
| `/lib/telephony/` | SIP-Verbindungs-Config, Call-Lifecycle-Management, Server Actions fuer Call-CRUD |
| `/lib/telephony/voice-agent/` | VoiceAgentProvider-Interface, SMAO-Adapter, Synthflow-Platzhalter |
| `/api/webhooks/voice-agent` | Empfaengt SMAO-Webhooks: Transkript, Klassifikation, Kontakt-Zuordnung |
| `/api/cron/call-processing` | WAV-Upload → Supabase Storage → Whisper → Bedrock Summary → Activity-Insert |
| CallWidget (React) | In-Call-UI: Waehlen, Klingeln, Verbunden, Beendet. Mikrofon-Zugriff. Im Deal-Workspace eingebettet. |
| Bestehende Pipeline | Whisper-Adapter (DEC-035), Bedrock-Summary, Supabase Storage, Activity-System, Retention-Cron |

## V5.1 Data Model

### Neue Tabelle: calls (FEAT-512, FEAT-513, DEC-074)

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Call-Metadata
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'initiated',
  phone_number TEXT,
  caller_id TEXT,
  -- Zeitstempel
  started_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  -- Recording (gleiches Pattern wie meetings)
  recording_url TEXT,
  recording_status TEXT DEFAULT 'not_recording',
  -- Transcription + Summary (gleiches Pattern wie meetings)
  transcript TEXT,
  transcript_status TEXT DEFAULT 'pending',
  ai_summary JSONB,
  summary_status TEXT DEFAULT 'pending',
  -- Voice-Agent (SMAO/Synthflow)
  voice_agent_handled BOOLEAN DEFAULT FALSE,
  voice_agent_classification TEXT,
  voice_agent_transcript TEXT,
  -- Asterisk-Referenz
  asterisk_channel_id TEXT,
  sip_call_id TEXT,
  -- Ownership
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indizes
CREATE INDEX idx_calls_deal ON calls(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_calls_contact ON calls(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_recording ON calls(recording_status)
  WHERE recording_status IN ('pending', 'processing');
CREATE INDEX idx_calls_direction ON calls(direction);

-- RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON calls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON calls TO authenticated;
GRANT ALL ON calls TO service_role;
```

**direction-Werte:** `outbound` (Click-to-Call), `inbound` (SIP-Trunk/SMAO)
**status-Werte:** `initiated`, `ringing`, `connected`, `completed`, `failed`, `missed`
**recording_status-Werte:** `not_recording`, `pending`, `recording`, `uploading`, `completed`, `failed`, `deleted` (konsistent mit meetings)
**transcript_status / summary_status:** `pending`, `processing`, `completed`, `failed` (konsistent mit meetings)
**voice_agent_classification-Werte:** `urgent`, `callback`, `info`, `meeting_request` (null bei manuellen Calls)
**asterisk_channel_id:** Asterisk Unique-ID, fuer MixMonitor-Dateiname-Matching (Fallback)

### Tabellen-Uebersicht V5.1: 39 Tabellen (38 bestehend + 1 neu)

```
BESTEHEND (unveraendert):              NEU (V5.1):
├── companies                          └── calls
├── contacts
├── pipelines                          BESTEHEND (keine Schema-Aenderung):
├── pipeline_stages                    └── activities (type='call' nutzt bestehendes source_type/source_id)
├── deals
├── proposals
├── fit_assessments
├── tasks
├── handoffs
├── referrals
├── signals
├── documents
├── activities
├── profiles
├── meetings
├── calendar_events
├── audit_log
├── email_templates
├── email_messages
├── email_threads
├── email_sync_state
├── ai_action_queue
├── ai_feedback
├── user_settings
├── knowledge_chunks
├── products
├── deal_products
├── goals
├── kpi_snapshots
├── cadences
├── cadence_steps
├── cadence_enrollments
├── cadence_executions
├── email_tracking_events
├── emails
└── ...
```

### Activity-Integration (bestehend, keine Schema-Aenderung)

Jeder abgeschlossene Call erzeugt eine Activity:
```sql
INSERT INTO activities (
  type, body, source_type, source_id, ai_generated,
  deal_id, contact_id, company_id, created_by
) VALUES (
  'call',
  '{ai_summary.outcome}',
  'call', '{call.id}', true,
  '{call.deal_id}', '{call.contact_id}', '{contact.company_id}', '{call.created_by}'
);
```

Das bestehende `source_type` + `source_id` Pattern (V3, DEC-021) verlinkt die Activity zurueck zur `calls`-Tabelle. Die Deal-Timeline rendert Call-Activities mit Dauer, Summary-Preview und Link zum Detail.

## V5.1 Asterisk Docker-Container

### Dockerfile-Anforderungen

- **Basis:** Debian Bookworm Slim + Asterisk 20 LTS (aus Asterisk-Repo oder Build)
- **Benoetigte Module:**
  - `res_pjsip` — PJSIP SIP-Stack
  - `res_pjsip_transport_websocket` — WebSocket-Transport fuer WebRTC
  - `res_http_websocket` — HTTP-WebSocket-Support
  - `codec_opus` — Opus-Codec fuer WebRTC-Audio
  - `app_mixmonitor` — Gespraechsaufnahme
  - `app_echo` — Echo-Test fuer interne Tests
  - `res_musiconhold` — Music-on-Hold (Warteton)
- **Config-Mount:** `/asterisk/config/` aus dem Repo → `/etc/asterisk/` im Container
- **Recording-Volume:** `/var/spool/asterisk/monitor/` → `asterisk-recordings` Volume

### Asterisk Config-Dateien (im Repo unter /asterisk/config/)

| Datei | Zweck |
|---|---|
| `pjsip.conf` | PJSIP-Endpunkte: WebRTC-User, SIP-Trunk (ENV), SMAO-Endpoint (ENV) |
| `extensions.conf` | Dialplan: Ausgehend, Eingehend, Intern-Test, Echo-Test |
| `rtp.conf` | RTP-Port-Range: 16384-16484 |
| `http.conf` | HTTP-Server fuer WebSocket auf Port 8089 |
| `modules.conf` | Modul-Loading (PJSIP, kein chan_sip) |
| `musiconhold.conf` | Warteton-Konfiguration |
| `logger.conf` | Logging-Konfiguration |

### PJSIP-Konfiguration (Kern-Auszug)

```ini
; === Transports ===

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; === WebRTC-Endpunkt (Browser-Telefonie) ===

[webrtc-user]
type=endpoint
transport=transport-wss
context=webrtc-outbound
disallow=all
allow=opus
allow=ulaw
webrtc=yes
dtls_auto_generate_cert=yes
media_encryption=dtls

[webrtc-user]
type=auth
auth_type=userpass
username=webrtc-user
password=${ASTERISK_WEBRTC_PASSWORD}    ; aus ENV

[webrtc-user]
type=aor
max_contacts=5
remove_existing=yes

; === SIP-Trunk (ENV-konfigurierbar, V5.1 deaktiviert) ===
; Wird per entrypoint-Script nur geschrieben wenn SIP_TRUNK_ENABLED=true

; === SMAO SIP-Endpoint (V5.1 deaktiviert) ===
; Wird per entrypoint-Script nur geschrieben wenn SMAO_ENABLED=true
```

### Dialplan (extensions.conf, Kern-Auszug)

```ini
; === Ausgehend (vom Browser) ===
[webrtc-outbound]
; Externer Anruf (wenn SIP-Trunk enabled)
exten => _+X.,1,NoOp(Outbound call to ${EXTEN})
 same => n,Set(CALL_UUID=${PJSIP_HEADER(read,X-Call-ID)})
 same => n,MixMonitor(/var/spool/asterisk/monitor/${CALL_UUID}.wav,b)
 same => n,Set(CALLERID(num)=${SIP_CALLER_ID})
 same => n,Dial(PJSIP/${EXTEN}@trunk,60,g)
 same => n,Hangup()

; Interne Test-Extension (Echo-Test)
exten => 600,1,Answer()
 same => n,Set(CALL_UUID=${PJSIP_HEADER(read,X-Call-ID)})
 same => n,MixMonitor(/var/spool/asterisk/monitor/${CALL_UUID}.wav,b)
 same => n,Echo()
 same => n,Hangup()

; Interne Test-Extension (Browser-zu-Browser)
exten => 1001,1,Set(CALL_UUID=${PJSIP_HEADER(read,X-Call-ID)})
 same => n,MixMonitor(/var/spool/asterisk/monitor/${CALL_UUID}.wav,b)
 same => n,Dial(PJSIP/webrtc-user,30)
 same => n,Hangup()

; === Eingehend (vom SIP-Trunk) ===
[from-trunk]
exten => _X.,1,NoOp(Incoming call from ${CALLERID(num)})
 same => n,GotoIf($[${SMAO_ENABLED}=true]?smao-route,${EXTEN},1)
 same => n,Set(CALL_UUID=${UNIQUEID})
 same => n,MixMonitor(/var/spool/asterisk/monitor/${CALL_UUID}.wav,b)
 same => n,Dial(PJSIP/webrtc-user,30)
 same => n,VoiceMail(1001@default,u)
 same => n,Hangup()

; === SMAO-Weiterleitung (wenn aktiviert) ===
[smao-route]
exten => _X.,1,Dial(PJSIP/${EXTEN}@smao-endpoint,60)
 same => n,Hangup()
```

### MixMonitor Filename-Strategie

Das Call-UUID wird als Custom SIP-Header `X-Call-ID` vom Browser (SIP.js) mitgeschickt. Der Dialplan liest diesen Header und verwendet ihn als Dateinamen:

```
Set(CALL_UUID=${PJSIP_HEADER(read,X-Call-ID)})
MixMonitor(/var/spool/asterisk/monitor/${CALL_UUID}.wav,b)
```

Der `call-processing`-Cron matched WAV-Dateien direkt ueber `calls.id` = Dateiname (ohne Extension). Kein Asterisk-Channel-ID-Matching noetig.

**Fallback:** Falls der Header nicht gesetzt ist (z.B. eingehende Anrufe ohne Custom-Header), wird `UNIQUEID` als Dateiname verwendet und in `calls.asterisk_channel_id` gespeichert.

## V5.1 WebRTC Click-to-Call Flow

```
1. User oeffnet Deal-Workspace
   └── Deal hat Kontakt mit Telefonnummer → "Anrufen"-Button sichtbar

2. User klickt "Anrufen"
   └── Browser: Mikrofon-Zugriff anfragen (getUserMedia)
   └── Server Action: createCall(dealId, contactId, phoneNumber)
        ├── INSERT calls (status='initiated', direction='outbound')
        └── Return { callId, sipConfig }

3. SIP.js initiiert Anruf
   └── UserAgent registriert sich bei Asterisk (WSS)
        ├── WSS: wss://sip.strategaizetransition.com
        ├── Credentials: webrtc-user / ASTERISK_WEBRTC_PASSWORD
        └── Traefik terminiert TLS → Proxy zu asterisk:8089 (WS)
   └── Inviter sendet INVITE mit:
        ├── Target: phone_number (Dialplan routet via Trunk/Intern)
        ├── Header X-Call-ID: callId (fuer MixMonitor-Dateiname)
        └── Media: Opus codec via DTLS-SRTP

4. Asterisk verarbeitet INVITE
   └── Dialplan [webrtc-outbound]:
        ├── Liest X-Call-ID Header
        ├── Startet MixMonitor (WAV-Aufnahme)
        ├── Setzt CallerID aus ENV
        └── Dial() via SIP-Trunk (oder Intern-Test)

5. In-Call (Browser zeigt CallWidget)
   └── Status-Updates via SIP.js Session Events:
        ├── 'trying' → UI: "Waehlen..."
        ├── 'ringing' → UI: "Klingeln..."
        ├── 'accepted' → UI: "Verbunden" + Timer
        │    └── Server Action: updateCallStatus(callId, 'connected')
        └── 'terminated' → UI: "Beendet"
             └── Server Action: updateCallStatus(callId, 'completed')
                  ├── calls.ended_at = now()
                  ├── calls.duration_seconds = berechnet
                  └── calls.recording_status = 'pending'

6. User kann jederzeit auflegen
   └── SIP.js sendet BYE → Asterisk stoppt MixMonitor → WAV finalisiert
```

### SIP.js Integration (Browser-seitig)

```typescript
// Vereinfachter Flow — tatsaechliche Implementierung im /frontend Slice

import { UserAgent, Registerer, Inviter } from 'sip.js'

const userAgent = new UserAgent({
  uri: UserAgent.makeURI('sip:webrtc-user@sip.strategaizetransition.com'),
  transportOptions: {
    server: 'wss://sip.strategaizetransition.com'
  },
  authorizationUsername: 'webrtc-user',
  authorizationPassword: sipConfig.password,  // aus Server Action
  sessionDescriptionHandlerFactoryOptions: {
    peerConnectionConfiguration: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }
  }
})

// Registrierung
const registerer = new Registerer(userAgent)
await userAgent.start()
await registerer.register()

// Anruf starten
const target = UserAgent.makeURI(`sip:${phoneNumber}@sip.strategaizetransition.com`)
const inviter = new Inviter(userAgent, target, {
  extraHeaders: [`X-Call-ID: ${callId}`]
})
await inviter.invite()

// Session-Events → UI-Status-Updates
inviter.stateChange.addListener((state) => {
  // 'Initial' → 'Establishing' → 'Established' → 'Terminated'
})
```

### SIP.js-Authentifizierung (Single-User V5.1)

- Ein WebRTC-Endpunkt `webrtc-user` mit Passwort aus ENV
- Passwort wird per Server Action an den authentifizierten Browser-User uebergeben
- Server Action prueft Supabase-Auth bevor SIP-Credentials zurueckgegeben werden
- Kein SIP-Credential-Leak: Passwort ist nur fuer registrierte App-User sichtbar

Fuer Multi-User (V7): Jeder User bekommt eigenen PJSIP-Endpunkt mit individuellen Credentials.

## V5.1 Call-Processing Pipeline (Flow)

```
1. Call endet → WAV-Datei liegt in /var/spool/asterisk/monitor/{callId}.wav
   └── Volume: asterisk-recordings (shared mit App-Container)

2. Cron /api/cron/call-processing (alle 2 Minuten)
   └── SELECT * FROM calls WHERE recording_status = 'pending'
        │
        ├── Pro Call:
        │   ├── 2a. WAV-Datei pruefen: /recordings-calls/{callId}.wav existiert?
        │   │      └── Nein → Skip (Datei noch nicht finalisiert, naechster Cron-Lauf)
        │   │      └── Ja → Weiter
        │   │
        │   ├── 2b. Upload → Supabase Storage (Bucket: call-recordings)
        │   │      ├── calls.recording_url = storage_path
        │   │      ├── calls.recording_status = 'uploading' → 'completed'
        │   │      └── calls.duration_seconds aus WAV-Header (oder ffprobe)
        │   │
        │   ├── 2c. Transkription (bestehender Whisper-Adapter)
        │   │      ├── calls.transcript_status = 'processing'
        │   │      ├── getTranscriptionProvider().transcribe(recording_url)
        │   │      ├── calls.transcript = result.transcript
        │   │      └── calls.transcript_status = 'completed'
        │   │
        │   ├── 2d. Summary (bestehender Bedrock-Layer)
        │   │      ├── calls.summary_status = 'processing'
        │   │      ├── bedrockClient.callSummary(transcript, deal_context)
        │   │      │   → Strukturierter Output: {outcome, action_items[], next_step, key_topics[]}
        │   │      ├── calls.ai_summary = result
        │   │      └── calls.summary_status = 'completed'
        │   │
        │   └── 2e. Activity-Insert (Timeline)
        │          └── INSERT activities (type='call', source_type='call', source_id=callId,
        │              body=ai_summary.outcome, ai_generated=true, deal_id, contact_id)
        │
        └── Response: { processed: N, errors: N }

3. Retention (bestehender /api/cron/recording-retention erweitert)
   └── ZUSAETZLICH: calls WHERE recording_status = 'completed'
        AND ended_at < now() - RECORDING_RETENTION_DAYS
        ├── Supabase Storage Remove (call-recordings bucket)
        ├── calls.recording_status = 'deleted'
        └── transcript + ai_summary bleiben permanent
```

**Fehler-Handling:** Identisch zum Meeting-Pattern (V4.1): Bei Whisper 429/5xx → Exponential Backoff (3 Versuche). Bei finalem Fehlschlag → `transcript_status = 'failed'`, User sieht Retry-Option im Deal-Workspace.

## V5.1 SMAO Voice-Agent Adapter (FEAT-514, DEC-075)

### Provider-Interface

```typescript
// /lib/telephony/voice-agent/provider.ts

export interface VoiceAgentProvider {
  /** Webhook-Signatur validieren */
  validateWebhook(request: Request, secret: string): Promise<boolean>
  /** Payload in generisches Format parsen */
  parsePayload(body: unknown): VoiceAgentCallResult
  /** Provider-Name fuer Logging/Audit */
  getProviderName(): string
}

export interface VoiceAgentCallResult {
  callerNumber: string
  callerName?: string
  transcript: string
  classification: 'urgent' | 'callback' | 'info' | 'meeting_request'
  confidence: number
  durationSeconds: number
  recordingUrl?: string
  metadata?: Record<string, unknown>
}
```

### Provider-Implementierungen

| Provider | Datei | Status V5.1 |
|---|---|---|
| SMAO | `/lib/telephony/voice-agent/smao.ts` | Implementiert (nicht verbunden) |
| Synthflow | `/lib/telephony/voice-agent/synthflow.ts` | Platzhalter |

### Factory + ENV

```typescript
// /lib/telephony/voice-agent/factory.ts
export function getVoiceAgentProvider(): VoiceAgentProvider {
  switch (process.env.VOICE_AGENT_PROVIDER) {
    case 'synthflow': return new SynthflowProvider()
    case 'smao':
    default:          return new SmaoProvider()
  }
}
```

### Webhook-Endpoint

```
POST /api/webhooks/voice-agent
  │
  ├── 1. SMAO_ENABLED pruefen (false → 404)
  ├── 2. Webhook-Secret validieren (SMAO_WEBHOOK_SECRET)
  ├── 3. Provider-Adapter: parsePayload(body) → VoiceAgentCallResult
  ├── 4. Kontakt-Zuordnung:
  │      └── callerNumber → contacts.phone Match
  │         └── Wenn Match: contact_id + deal_id (aktuellster offener Deal)
  │         └── Kein Match: contact_id = null (manuell zuordnen)
  │
  ├── 5. Call-Record erstellen:
  │      └── INSERT calls (direction='inbound', voice_agent_handled=true,
  │          voice_agent_classification, voice_agent_transcript, phone_number,
  │          contact_id, deal_id, status='completed')
  │
  ├── 6. Klassifikations-basierte Aktionen:
  │      ├── urgent:
  │      │   └── Push-Notification an User (bestehender web-push aus V4.1)
  │      │   └── Activity (type='call', body='DRINGEND: {summary}')
  │      ├── callback:
  │      │   └── Task erstellen (tasks INSERT: 'Rueckruf: {callerName}, {reason}')
  │      │   └── Activity (type='call', body='Rueckruf erbeten: {summary}')
  │      ├── info:
  │      │   └── Activity (type='call', body='Info-Anruf: {summary}')
  │      └── meeting_request:
  │          └── Task erstellen ('Meeting-Anfrage: {callerName}')
  │          └── Activity (type='call', body='Meeting-Anfrage: {summary}')
  │          └── Konzept: Cal.com-Buchungslink zuruecksenden (V5.2+)
  │
  └── 7. Response: 200 OK

Fehler: 401 (Secret falsch), 404 (SMAO_ENABLED=false), 500 (Verarbeitungsfehler)
```

### Asterisk-Dialplan fuer SMAO-Routing

Im Dialplan `[from-trunk]` ist die SMAO-Weiterleitung vorbereitet:
- `SMAO_ENABLED=false` (Default): Eingehende Anrufe → direkt an WebRTC-User (Browser klingelt)
- `SMAO_ENABLED=true`: Eingehende Anrufe → zuerst an SMAO SIP-URI (SMAO handled den Anruf, sendet Webhook)

ENV-Variablen werden beim Container-Start in die Asterisk-Config geschrieben (entrypoint.sh Template-Rendering).

## V5.1 Docker Compose Aenderungen

### Neuer Service: asterisk

```yaml
asterisk:
  build:
    context: ./asterisk
    dockerfile: Dockerfile
  restart: unless-stopped
  expose:
    - "8089"   # WebSocket (Traefik-routed via sip.strategaizetransition.com)
    - "5060"   # SIP (intern, fuer SMAO-Routing spaeter)
  ports:
    - "16384-16484:16384-16484/udp"   # RTP Media (Hetzner-Firewall oeffnen!)
    - "5060:5060/udp"                  # SIP Trunk (erst bei Go-Live relevant)
  labels:
    - "traefik.docker.network=k9f5pn5upfq7etoefb5ukbcg"
    - "traefik.http.services.asterisk-wss-svc.loadbalancer.server.port=8089"
    - "traefik.http.routers.http-0-k9f5pn5upfq7etoefb5ukbcg-asterisk.service=asterisk-wss-svc"
    - "traefik.http.routers.https-0-k9f5pn5upfq7etoefb5ukbcg-asterisk.service=asterisk-wss-svc"
  volumes:
    - asterisk-recordings:/var/spool/asterisk/monitor
  environment:
    ASTERISK_WEBRTC_PASSWORD: ${ASTERISK_WEBRTC_PASSWORD}
    SIP_TRUNK_ENABLED: ${SIP_TRUNK_ENABLED:-false}
    SIP_TRUNK_HOST: ${SIP_TRUNK_HOST:-}
    SIP_TRUNK_USER: ${SIP_TRUNK_USER:-}
    SIP_TRUNK_PASS: ${SIP_TRUNK_PASS:-}
    SIP_CALLER_ID: ${SIP_CALLER_ID:-}
    SMAO_ENABLED: ${SMAO_ENABLED:-false}
    SMAO_SIP_URI: ${SMAO_SIP_URI:-}
  depends_on:
    - jitsi-prosody    # Nur fuer Netzwerk-Reihenfolge, keine funktionale Abhaengigkeit
  networks:
    - business-net
```

### App-Container Erweiterung

```yaml
app:
  volumes:
    - jitsi-recordings:/recordings:ro           # bestehend (Meetings)
    - asterisk-recordings:/recordings-calls:ro   # NEU (Calls)
  environment:
    # ... bestehende Env Vars ...
    ASTERISK_WEBRTC_PASSWORD: ${ASTERISK_WEBRTC_PASSWORD}
    SIP_CALLER_ID: ${SIP_CALLER_ID:-}
    SMAO_ENABLED: ${SMAO_ENABLED:-false}
    SMAO_WEBHOOK_SECRET: ${SMAO_WEBHOOK_SECRET:-}
    VOICE_AGENT_PROVIDER: ${VOICE_AGENT_PROVIDER:-smao}
```

### Neue Volumes

```yaml
volumes:
  # ... bestehende Volumes ...
  asterisk-recordings:
    driver: local
```

### Coolify-Domain-Setup

1. DNS: A-Record `sip.strategaizetransition.com` → gleiche Server-IP (91.98.20.191)
2. Coolify UI → Configuration → Domains fuer `asterisk`: `https://sip.strategaizetransition.com`
3. Nach Compose-Change: "Reload Compose File" → "Redeploy" (wie bei Jitsi)

## V5.1 API Routes

### Neue API Routes

| Route | Methode | Beschreibung | Auth |
|---|---|---|---|
| `/api/cron/call-processing` | POST | WAV-Upload, Whisper, Summary, Activity | CRON_SECRET |
| `/api/webhooks/voice-agent` | POST | SMAO/Synthflow Webhook empfangen | SMAO_WEBHOOK_SECRET |

### Bestehende Routes — Erweiterungen

| Route | Aenderung |
|---|---|
| `/api/cron/recording-retention` | + calls-Recordings loeschen (gleiche Retention wie Meetings) |

### Middleware-Whitelist Erweiterung

Bestehende oeffentliche Routen: `/api/cron/*`, `/consent/*`, `/api/track/*`
Neu: `/api/webhooks/voice-agent` (Secret-validiert, kein Supabase-Auth)

## V5.1 Cron-Konfiguration

```
Coolify Cron
  │
  ├── BESTEHEND (unveraendert):
  │   ├── alle 5 Min  → POST /api/cron/imap-sync
  │   ├── alle 5 Min  → POST /api/cron/meeting-transcript
  │   ├── alle 5 Min  → POST /api/cron/meeting-summary
  │   ├── alle 5 Min  → POST /api/cron/meeting-reminders
  │   ├── alle 5 Min  → POST /api/cron/signal-extract
  │   ├── alle 15 Min → POST /api/cron/classify
  │   ├── alle 15 Min → POST /api/cron/embedding-sync
  │   ├── alle 15 Min → POST /api/cron/cadence-execute
  │   ├── alle 6h     → POST /api/cron/followups
  │   ├── taeglich    → POST /api/cron/retention
  │   ├── alle 2 Min  → POST /api/cron/meeting-recording-poll
  │   ├── taeglich    → POST /api/cron/recording-retention   (ERWEITERT: + calls)
  │   ├── taeglich    → POST /api/cron/pending-consent-renewal
  │   └── taeglich    → POST /api/cron/kpi-snapshot
  │
  └── NEU (V5.1):
      └── alle 2 Min  → POST /api/cron/call-processing       (Header: x-cron-secret)
```

### Coolify Cron-Job Setup

```
Cron Expression: */2 * * * *
Container: app
Command: node -e "fetch('http://localhost:3000/api/cron/call-processing', {method:'POST', headers:{'Authorization':'Bearer '+process.env.CRON_SECRET}})"
```

## V5.1 Env Vars — Neue Variablen

```bash
# Asterisk PBX (V5.1 NEU)
ASTERISK_WEBRTC_PASSWORD=...           # Passwort fuer Browser-SIP-Registrierung (openssl rand -hex 16)
SIP_TRUNK_ENABLED=false                # true erst bei Go-Live mit SIP-Provider
SIP_TRUNK_HOST=                        # z.B. sip.sipgate.de oder sip.easybell.de
SIP_TRUNK_USER=                        # SIP-Account-Username
SIP_TRUNK_PASS=                        # SIP-Account-Passwort
SIP_CALLER_ID=                         # Ausgehende Rufnummer (z.B. +4930123456)

# SMAO Voice-Agent (V5.1 vorbereitet, nicht verbunden)
SMAO_ENABLED=false                     # true erst bei Go-Live
SMAO_SIP_URI=                          # SIP-URI fuer Anruf-Weiterleitung
SMAO_WEBHOOK_SECRET=                   # Webhook-Signatur-Validierung
SMAO_API_KEY=                          # API-Key (falls SMAO REST-API benoetigt)
VOICE_AGENT_PROVIDER=smao              # smao | synthflow

# Call Recording (V5.1 NEU)
SUPABASE_STORAGE_CALLS_BUCKET=call-recordings
# RECORDING_RETENTION_DAYS wird fuer Meetings UND Calls gemeinsam verwendet (V5.2 Default 7, vorher 30)
```

Bestehende Variablen die wiederverwendet werden:
- `CRON_SECRET` — fuer call-processing Cron
- `TRANSCRIPTION_PROVIDER`, `OPENAI_API_KEY` — fuer Whisper (bestehend)
- `RECORDING_RETENTION_DAYS` — fuer Call-Retention (gleicher Wert wie Meetings)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — fuer Push-Notifications bei urgent-Calls

## V5.1 Server Sizing

### Aktuell (CPX32): 4 vCPU, 8 GB RAM

V5-Bestand (Supabase + Next.js + IMAP + Cal.com + Jitsi + Crons): ~2.5 GB idle, ~6-6.5 GB bei aktivem Jibri-Recording

### V5.1 Zusaetzlich

| Komponente | RAM idle | RAM aktiv | CPU |
|---|---|---|---|
| Asterisk Container | ~50-80 MB | ~100-150 MB (waehrend Call) | minimal |
| SIP.js (Browser) | 0 (Client-seitig) | 0 | 0 |

### Gesamt-Schaetzung

| Szenario | RAM-Verbrauch | Bewertung |
|---|---|---|
| Idle (kein Meeting, kein Call) | ~2.6 GB | Komfortabel |
| 1 aktiver Call (kein Meeting) | ~2.7 GB | Komfortabel |
| 1 aktives Jitsi-Meeting + Recording (kein Call) | ~6.5 GB | Eng, funktioniert |
| 1 Jitsi-Meeting + 1 Call gleichzeitig | ~6.7 GB | Eng, aber moeglich |
| 1 Jibri-Recording + 1 Call gleichzeitig | ~7.0 GB | Grenze (8 GB Max) |

**Schluessel-Einsicht:** Asterisk ist extrem leichtgewichtig verglichen mit Jitsi/Jibri. Ein Telefonat verbraucht ~100 MB; ein Jibri-Recording ~2.5 GB. Gleichzeitige Nutzung ist bei Single-User unwahrscheinlich (gleiche Person kann nicht gleichzeitig telefonieren und im Jitsi-Meeting sein).

**Upgrade-Pfad:** Bleibt CPX32 → CPX42 (8 vCPU / 16 GB) bei Bedarf. Kein Code-Change, nur Hetzner-Resize.

## V5.1 Security / Privacy

### Audio-Verschluesselung

- **Browser → Asterisk:** DTLS-SRTP (WebRTC-Standard, in pjsip.conf konfiguriert)
- **Asterisk → SIP-Trunk:** SRTP wenn Provider unterstuetzt (TLS+SRTP bei sipgate/easybell Standard)
- **WSS:** TLS-terminiert durch Traefik (Let's Encrypt Zertifikat)

### Aufnahme-Speicherung

- WAV-Dateien temporaer auf Docker-Volume (Hetzner DE)
- Nach Upload: Supabase Storage (Hetzner DE) — gleicher Pfad wie Meeting-Recordings
- Retention: identisch zu Meetings (RECORDING_RETENTION_DAYS, V5.2 Default 7, vorher 30)
- Transkript + Summary permanent in PostgreSQL (Hetzner DE)

### Whisper-Transkription

Bestehender Adapter (DEC-035): OpenAI Whisper API (US-Region, DEC-019 akzeptiert). Audio wird uebertragen, OpenAI speichert laut DPA nicht dauerhaft. Provider-Wechsel auf EU via Adapter moeglich.

### SIP-Credentials

- WebRTC-Passwort aus ENV (nicht hardcoded)
- SIP-Trunk-Credentials aus ENV (nicht hardcoded)
- Browser erhaelt SIP-Password nur nach Supabase-Auth-Check (Server Action)
- Kein SIP-Password im Client-Bundle oder localStorage

### SMAO-Webhook

- Secret-basierte Validierung (SMAO_WEBHOOK_SECRET)
- Middleware-Whitelist fuer `/api/webhooks/voice-agent` (kein Supabase-Auth, Secret stattdessen)
- Keine PII-Speicherung ueber das hinaus was im Call-Record steht

### DSGVO-Aufnahme-Einwilligung

V5.1 zeichnet Telefonate automatisch auf. Anders als bei Video-Meetings (FEAT-411 Consent-Flow) gibt es bei Telefonaten keine bestehende Consent-Mechanik.

**V5.1-Ansatz:** Fuer internes Testing (keine externen Anrufe) ist kein Consent-Flow noetig. Bei Go-Live mit SIP-Trunk muss vor dem ersten echten Telefonat ein Ansage-basierter Consent implementiert werden (z.B. "Dieses Gespraech wird zu Qualitaetszwecken aufgezeichnet"). Das ist ein separater Slice fuer Go-Live, nicht Teil der V5.1-Implementierung.

**Risiko-Mitigation:** Solange `SIP_TRUNK_ENABLED=false`, werden keine externen Telefonate gefuehrt. Interne Echo-Tests und Browser-zu-Browser-Tests sind nicht DSGVO-relevant.

## V5.1 Constraints & Tradeoffs

| Entscheidung | Tradeoff |
|---|---|
| Asterisk auf gleichem Server (DEC-070) | Kein Extra-Server-Kosten. Asterisk ist leichtgewichtig (~100 MB). Kein RAM-Problem. |
| SIP.js statt JsSIP (DEC-071) | Groesseres Bundle (~200 KB), aber bessere Wartung und TypeScript-Support. |
| Eigene Subdomain fuer WSS (DEC-072) | Extra DNS-Record + TLS-Cert. Sauberere Trennung als Pfad-basiert. |
| WAV statt Opus fuer Recording (DEC-073) | Groessere Dateien (~10 MB/Min). Direkte Whisper-Kompatibilitaet. Konvertierung spaeter moeglich. |
| Statische Asterisk-Config (DEC-076) | Config-Aenderungen erfordern Container-Rebuild. Fuer Single-User ausreichend. ARI fuer V7. |
| 100-Port RTP-Range (DEC-077) | Enger als Default, aber 50x mehr als noetig. Kein Portkonflikt mit Jitsi JVB. |
| SMAO vorbereitet aber nicht verbunden | Code existiert, wird bei Go-Live per ENV aktiviert. Kein Risiko, kein Kostenblock. |
| Kein DSGVO-Consent fuer Telefonate in V5.1 | Kein externer Traffic in V5.1 (SIP_TRUNK_ENABLED=false). Consent-Slice bei Go-Live. |

## V5.1 Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Traefik WSS-Proxy zu Asterisk funktioniert nicht | Mittel | Blocker | Traefik unterstuetzt WebSocket nativ. Test vor Full-Implementation. Gleiche Coolify-Label-Strategie wie Jitsi. |
| Asterisk 20 Docker-Image nicht verfuegbar/stabil | Niedrig | Mittel | Custom Dockerfile auf Debian Bookworm. Asterisk 20 ist LTS und stabil. |
| RTP-Ports blockiert (Hetzner-Firewall) | Mittel | Blocker | Vor Slice-Start Firewall-Regel fuer 16384-16484/UDP anlegen. Gleicher Prozess wie Port 10000/UDP fuer Jitsi. |
| SIP.js Browser-Kompatibilitaet | Niedrig | Niedrig | SIP.js 0.21+ unterstuetzt Chrome, Firefox, Safari, Edge. WebRTC ist Standard seit 2018. |
| MixMonitor WAV-Dateien zu gross | Niedrig | Niedrig | ~10 MB/Min. 30 Min Call = 300 MB. Upload-Cron + Retention begrenzt Speicher. |
| SMAO-API aendert sich vor Integration | Mittel | Niedrig | Adapter-Pattern isoliert Aenderungen. Generic Interface bleibt stabil. Synthflow als Backup. |
| Browser-Mikrofon-Zugriff verweigert | Niedrig | Mittel | Standard getUserMedia-Prompt. HTTPS ist Voraussetzung (gegeben). UI zeigt Hinweis bei Verweigerung. |
| Asterisk-PJSIP-ENV-Templating scheitert | Mittel | Mittel | entrypoint.sh mit envsubst oder sed fuer Config-Rendering. Ausfuehrlich testen im Infra-Slice. |

## V5.1 Hetzner Firewall

### Bestehende Regeln

```
TCP  443   eingehend  (HTTPS — Traefik)
TCP  80    eingehend  (HTTP → HTTPS Redirect)
UDP  10000 eingehend  (Jitsi JVB Media)
```

### Neue Regeln (V5.1)

```
UDP  16384-16484 eingehend  (Asterisk RTP Media — WebRTC Audio)
UDP  5060        eingehend  (SIP Trunk — ERST bei Go-Live aktivieren)
```

**Wichtig:** RTP-Ports muessen auf **Hetzner Cloud Firewall** (Hypervisor-Level) geoeffnet werden, nicht nur auf `ufw`. Gleicher Prozess wie Port 10000/UDP fuer Jitsi.

## V5.1 Dependencies (package.json)

```json
{
  "sip.js": "^0.21.2"
}
```

Keine weiteren neuen Dependencies. Bestehende werden wiederverwendet:
- `openai` — Whisper-Adapter (bestehend)
- `@aws-sdk/client-bedrock-runtime` — Summary (bestehend)
- `web-push` — Push-Notifications fuer urgent-Calls (bestehend V4.1)
- `fluent-ffmpeg` — WAV-Dauer-Ermittlung (bestehend V4.1)

## V5.1 Empfohlene Slice-Reihenfolge

1. **SLC-511 Schema-Migration + Types** — calls-Tabelle, TypeScript-Types, RLS, Supabase Storage Bucket. Basis-Slice, blockiert alle folgenden.
2. **SLC-512 Asterisk Docker-Setup + Traefik-WSS** — Dockerfile, Config-Files, Volumes, Traefik-Labels, DNS, Firewall, Echo-Test-Verifikation. Schwerster Infra-Slice.
3. **SLC-513 WebRTC Click-to-Call + In-Call-Widget** — SIP.js-Integration, CallWidget-Komponente, Server Actions (createCall, updateCallStatus), Deal-Workspace-Button.
4. **SLC-514 Call-Recording-Pipeline** — call-processing Cron, WAV-Upload, Whisper-Transkription, Bedrock-Summary, Activity-Insert, Retention-Erweiterung.
5. **SLC-515 SMAO Voice-Agent Adapter + Webhook** — VoiceAgentProvider-Interface, SMAO-Adapter, Webhook-Endpoint, Klassifikations-Aktionen, Dialplan-Vorbereitung.

### Abhaengigkeiten

```
SLC-511 (Schema)
  ├── SLC-512 (Asterisk Docker) — benoetigt calls-Tabelle fuer Verifikation
  │     └── SLC-513 (Click-to-Call) — benoetigt laufenden Asterisk
  │           └── SLC-514 (Recording-Pipeline) — benoetigt Calls mit WAV-Dateien
  └── SLC-515 (SMAO-Adapter) — unabhaengig von SLC-512..514, benoetigt nur Schema
```

SLC-515 kann parallel zu SLC-512..514 implementiert werden.

Geschaetzt 5 Slices, je 1-2 Tage. Gesamtschaetzung: ~5-8 Tage.

## V5.1 Open Points (fuer /slice-planning)

- Asterisk-Docker-Image: Debian Bookworm + Asterisk-PPA oder Custom-Build. Entscheidung im Infra-Slice.
- SIP.js-Version: 0.21.x (stable) vs. neuere Pre-Releases. Entscheidung im Frontend-Slice.
- SMAO Webhook-Payload-Format: Muss bei Go-Live gegen echte SMAO-Dokumentation validiert werden. V5.1 implementiert generisches Interface.
- Asterisk-Ansage bei aufgenommenen Gespraechen: Erst bei Go-Live mit SIP-Trunk relevant (DSGVO). Nicht in V5.1-Scope.
- STUN/TURN fuer WebRTC: V5.1 nutzt Google Public STUN (stun.l.google.com:19302). Eigener TURN bei NAT-Problemen spaeter.

## V5.1 Recommended Next Step

`/slice-planning` — V5.1-Slices strukturiert ausdefinieren (Acceptance Criteria, Dependencies, Micro-Tasks, QA-Fokus). Danach pro Slice `/backend` oder `/frontend` + `/qa`.

---

## V5.2 — Compliance-Sprint Architecture

### Architecture Summary

V5.2 ist ein DSGVO-Hardening-Sprint vor dem ersten externen Go-Live. Es entstehen:
- 1 neue DB-Tabelle (`compliance_templates`)
- 1 neue Settings-Seite (`/settings/compliance`)
- 1 neue UI-Komponente (`MeetingTimelineItem`)
- 1 voll implementierter Adapter (`AzureWhisperProvider`, nicht aktiviert)
- 1 reduzierter ENV-Default (`RECORDING_RETENTION_DAYS=7`)
- 1 generierte Compliance-Doku (`docs/COMPLIANCE.md`)

Keine neuen Services, keine neuen Container, keine Schema-Aenderungen an bestehenden Tabellen.

### V5.2 Main Components

```
V5.2 — neu hinzukommend

Next.js App (BD Cockpit)
  |
  +-- /settings/compliance/page.tsx          (V5.2 NEU — FEAT-523)
  |   +-- ComplianceTemplateBlock x3
  |   |   +-- Edit-Form
  |   |   +-- Variable-Helper (Token-Liste)
  |   |   +-- Copy-to-Clipboard
  |   |   +-- Reset-to-Default
  |   +-- ServerActions: get/update/resetComplianceTemplate
  |
  +-- /lib/compliance/                        (V5.2 NEU)
  |   +-- consent-templates.ts                (Default-Markdown fuer 3 Blocks)
  |   +-- variables.ts                        (Mini Token-Replacer, DEC-084)
  |   +-- tokens.ts                           (Erlaubte-Tokens-Liste + Doku)
  |
  +-- /lib/ai/transcription/azure.ts          (V5.2 GEFUELLT — DEC-085, DEC-086)
  |   +-- AzureOpenAI-Client aus openai-NPM-SDK
  |
  +-- /components/meetings/
  |   +-- meeting-timeline-item.tsx           (V5.2 NEU — FEAT-524, DEC-087)
  |       +-- Render-Logic 1:1 zu CallTimelineItem,
  |           nur Icon/Type-Badge/Direction-Logic angepasst
  |
  +-- /components/timeline/unified-timeline.tsx (V5.2 GEAENDERT)
  |   +-- Rendert MeetingTimelineItem fuer activity_type=meeting
  |
  +-- /api/cron/recording-retention/route.ts  (V5.2 GEAENDERT — FEAT-521)
      +-- Default 30 -> 7 Tage

Supabase
  +-- compliance_templates                    (V5.2 NEU — MIG-022)
      +-- template_key TEXT PK
      +-- body_markdown TEXT
      +-- default_body_markdown TEXT
      +-- updated_by UUID NULL FK profiles
      +-- updated_at TIMESTAMPTZ

Doku
  +-- docs/COMPLIANCE.md                      (V5.2 NEU — FEAT-525)
      +-- 8 Sektionen via /compliance Skill

Docker Compose
  +-- RECORDING_RETENTION_DAYS: ${...:-7}     (V5.2 GEAENDERT — FEAT-521)
```

### V5.2 Responsibilities

| Component | Verantwortung |
|---|---|
| `compliance_templates`-Tabelle | Persistenter Speicher fuer 3 Template-Blocks mit Reset-Default |
| `lib/compliance/variables.ts` | Token-Ersetzung `{user_name}` -> Wert; unbekannte Tokens bleiben sichtbar |
| `lib/compliance/consent-templates.ts` | Lieferung der 3 Default-Markdown-Texte (Skill-mitgeliefert, nicht user-editierbar) |
| `/settings/compliance` Page | UI fuer Lesen/Editieren/Copy/Reset der 3 Template-Blocks |
| `AzureWhisperProvider` | Voll funktionsfaehiger Adapter, ENV-aktivierbar, derzeit nicht im Default-Pfad |
| `MeetingTimelineItem` | Identische Render-Logik wie CallTimelineItem, nur Icon + Type-Badge angepasst |
| Retention-Cron | Default-Retention auf 7d, ENV-Override bleibt |
| `docs/COMPLIANCE.md` | Generiertes DSGVO-Dokument fuer externe Kunden-Anfragen |

### V5.2 Data Flow

#### Compliance-Template-Edit-Flow

```
User -> /settings/compliance Page
     -> Edit-Form (Markdown-Body bearbeiten)
     -> "Speichern"-Click
       -> ServerAction updateComplianceTemplate(key, body)
         -> Supabase UPDATE compliance_templates
            SET body_markdown=..., updated_by=auth.uid()
         -> Return updated row
     -> UI re-render mit neuem Body
```

#### Compliance-Template-Copy-Flow

```
User -> /settings/compliance Page
     -> "Kopieren"-Click auf Block X
       -> Frontend: applyTemplateVariables(body, currentUserVars)
         -> text.replace(/\{(\w+)\}/g, ...)
       -> navigator.clipboard.writeText(processed)
     -> Toast "In Zwischenablage kopiert"
```

#### Azure-Whisper-Aktivierungs-Flow (Pre-Go-Live, NICHT in V5.2)

```
1. Azure-Account anlegen, OpenAI-Resource in westeurope/germanywestcentral
2. Whisper-Deployment erstellen, Deployment-ID notieren
3. Coolify ENVs setzen (alle als compose-injected ENV-Vars unterstuetzt):
   AZURE_OPENAI_ENDPOINT=https://<resource>.<region>.openai.azure.com
   AZURE_OPENAI_API_KEY=<key>
   AZURE_OPENAI_WHISPER_DEPLOYMENT_ID=<deployment-id>
   AZURE_OPENAI_API_VERSION=2024-06-01    (optional, Default ist 2024-06-01)
   TRANSCRIPTION_PROVIDER=azure
4. Coolify "Restart" (kein Code-Change noetig — Adapter ist ab V5.2 ready)
5. Smoke-Test: Click-to-Call -> Recording -> Activity-Timeline mit Transkript

Verhalten bei fehlenden ENVs: Adapter liefert strukturierten Fehler
`Azure-Konfiguration unvollstaendig: <feldname>` (kein Stack-Trace, kein Crash).
```

### V5.2 Database Changes — MIG-022

```sql
CREATE TABLE IF NOT EXISTS compliance_templates (
  template_key TEXT PRIMARY KEY
    CHECK (template_key IN ('meeting_invitation', 'email_footer', 'calcom_booking')),
  body_markdown TEXT NOT NULL,
  default_body_markdown TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON compliance_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_templates TO service_role;

INSERT INTO compliance_templates (template_key, body_markdown, default_body_markdown)
VALUES
  ('meeting_invitation', '<default>', '<default>'),
  ('email_footer',       '<default>', '<default>'),
  ('calcom_booking',     '<default>', '<default>')
ON CONFLICT (template_key) DO NOTHING;
```

Die 3 Default-Markdown-Bodies werden in `lib/compliance/consent-templates.ts` als TypeScript-Konstanten gefuehrt und beim Migration-Aufruf via Skript-Generator in das SQL eingesetzt — alternativ direkt als Multi-Line-String im Migration-File.

### V5.2 External Dependencies

- **Keine neue Dependency.** Das `openai`-NPM-Package ist bereits installiert (V4.1) und exportiert `AzureOpenAI`-Client.
- **Keine neue Service-Container.** Azure-Whisper waere ein externer Endpoint, nicht im Stack.

### V5.2 Security / Privacy

- **Compliance-Templates sind nicht sensitiv** — sie enthalten Standardtexte, kein PII. RLS auf `authenticated_full_access` ist ausreichend.
- **Azure-API-Key** kommt aus Coolify-ENV, nie ins Repo. Adapter validiert Existenz und liefert klaren Konfig-Fehler bei fehlendem Key.
- **Retention 7d**: WAV + Roh-Transkripte. AI-Summary (Activity) bleibt — das ist der "anonymisierte" operative Wert. Vollstaendige Personenbezugs-Loeschung erfolgt ueber Loeschung des Deals/Kontakts (CASCADE), nicht ueber Retention.
- **Audit-Log fuer Compliance-Template-Aenderungen**: optional. Nicht-V5.2-Scope, falls noetig in V5.2-Open-Points dokumentiert.
- **Audit-Log fuer Whisper-API-Calls**: AzureWhisperProvider loggt analog OpenAIWhisperProvider (Anbieter, Region, Modell, Request-ID) per `data-residency.md`-Regel. Implementierung in SLC-522.

### V5.2 Constraints & Tradeoffs

| Entscheidung | Tradeoff |
|---|---|
| Eigene Tabelle `compliance_templates` statt user_settings-JSONB | Ein zusaetzliches Migration-File, dafuer sauberer Schema und Reset-Default trivial |
| Mini-Variablen-Engine statt Library | 15 Zeilen eigener Code, dafuer null Bundle-Kost und volle Kontrolle |
| Azure ENV-API-Version statt Hardcode | 1 zusaetzliche ENV, dafuer Update-Pfad ohne Code-Aenderung |
| MeetingTimelineItem ohne Mapping-Layer | Direkter Datenzugriff, dafuer Annahme dass Schemas synchron bleiben — wird durch DEC-082-Pattern (Cross-Source-Konsistenz) abgesichert |
| Azure-Adapter ohne Live-Switch in V5.2 | Code ist ready, aber QA kann den End-to-End-Pfad gegen Azure-Live nicht verifizieren — Risiko: Azure-API-Drift wird erst beim Pre-Go-Live-Switch sichtbar |
| Settings-Page ohne Auto-Anhaengen an Workflows | Manueller Copy-Schritt fuer User, dafuer keine Workflow-Disruption und kein UI-Risiko in laufenden Pipelines |

### V5.2 Risks & Open Decisions

- **Azure-API-Drift:** AzureOpenAI-Client koennte sich von OpenAI-Client minimal unterscheiden (z.B. in Whisper-Modell-Namen — Azure nutzt Deployment-IDs, nicht "whisper-1"). Mitigation: SLC-522 Tests gegen Azure-Doku, nicht gegen OpenAI-Doku.
- **Default-Compliance-Texte juristisch unverbindlich:** Skill liefert pragmatische DE-Standardtexte, kein Anwalts-Output. User-Verantwortung: Vor Produktion-Einsatz anwaltlich pruefen lassen. Hinweis im Settings-UI sichtbar.
- **MeetingTimelineItem fuer alte Meetings:** Backwards Compatibility ist gegeben (siehe call-timeline-item.tsx Z.35-39 — `hasSummary`-Pruefung filtert leere Felder). Aber: alte Meetings ohne Bedrock-Summary haben gar kein `ai_summary` — Component muss das robust behandeln (`summary == null` -> nur Title + Datum).
- **Retention 7d zu kurz?** 7d ist Pflicht fuer Datensparsamkeit. Falls technische Pipeline-Fehler erst nach >7d sichtbar werden, geht Recording verloren. Mitigation: Cron laeuft taeglich, Pipeline-Fehler werden in den ersten 24h sichtbar; 7d ist Puffer.

### V5.2 Open Questions (auf /architecture geklaert — keine offen)

Alle 4 Open Questions aus /requirements sind jetzt entschieden:

| Open Question | Entscheidung | DEC |
|---|---|---|
| Speicherort Compliance-Templates | Eigene Tabelle `compliance_templates` | DEC-083 |
| Variablen-Engine | Eigene Mini-Implementation in `lib/compliance/variables.ts` | DEC-084 |
| Azure-API-Version-Pinning | ENV `AZURE_OPENAI_API_VERSION` mit Default `2024-06-01` | DEC-086 |
| MeetingTimelineItem-Mapping | Keine — Schemas sind bit-identisch | DEC-087 |

Plus eine Architektur-Entscheidung die in /requirements nicht offen war:

| Architektur-Entscheidung | DEC |
|---|---|
| Azure via openai-NPM-SDK (AzureOpenAI-Client), kein eigener HTTP-Client | DEC-085 |

### V5.2 Empfohlene Slice-Struktur

5 Slices, in dieser Reihenfolge:

```
SLC-521 (Retention 7d)              <- klein, kein DB, kein Risiko
SLC-522 (Azure-Whisper-Adapter)     <- parallel zu SLC-521
SLC-523 (Compliance-Templates)      <- MIG-022 + Backend + Frontend (Vertical Slice)
SLC-524 (MeetingTimelineItem)       <- parallel zu SLC-523
SLC-525 (DSGVO-Compliance-Doku)     <- LAST, weil Doku auf Endzustand referenziert
```

#### Abhaengigkeiten

```
SLC-521 -- unabhaengig
SLC-522 -- unabhaengig
SLC-523 -- benoetigt MIG-022 vor Frontend-MTs
SLC-524 -- unabhaengig (kann parallel zu SLC-523)
SLC-525 -- benoetigt SLC-521+522+523+524 fuer aktuelle Doku-Werte
```

Geschaetzte Slice-Groessen:
- SLC-521 ~0.5 Tag (Defaults aendern + Doku)
- SLC-522 ~1.5 Tage (Adapter implementieren + Tests + Doku)
- SLC-523 ~2 Tage (Migration + Server Actions + Settings-Page + Variables-Engine + Tests)
- SLC-524 ~1 Tag (Component + Integration in unified-timeline)
- SLC-525 ~0.5 Tag (Skill ausfuehren + Output reviewen)

Gesamtschaetzung: ~5-6 Tage.

### V5.2 Recommended Next Step

`/slice-planning` — V5.2-Slices strukturiert ausdefinieren (Acceptance Criteria, Dependencies, Micro-Tasks, QA-Fokus). Danach pro Slice `/backend` oder `/frontend` + `/qa`.

## V5.3 — E-Mail Composing Studio Architecture

### Architecture Summary

V5.3 ist eine **UI-zentrische Erweiterung** der bestehenden E-Mail-Pipeline. Der Versand-Layer (`send.ts`, Tracking, IMAP-Sync, Auto-Zuordnung, Cadence-Engine) bleibt unangetastet. Neu sind:

1. Eine zentrale **Branding-Engine** (`renderBrandedHtml`) als einzige Quelle der Wahrheit fuer HTML-Output. Live-Preview im neuen Composing-Studio und tatsaechlicher Versand rufen denselben Renderer — kein Drift moeglich.
2. Eine eigenstaendige Vollbild-Seite **`/emails/compose`** mit 3-Panel-Layout (Vorlagen-Liste links, Erfassen-Form mitte, Live-Preview rechts) als primaerer E-Mail-Erstellungs-Ort, ersetzt die schmale `EmailCompose`-Sheet als Default-Einstieg aus Deal-Workspace, Mein Tag und Focus.
3. **Schema-Erweiterung** auf `email_templates` (`is_system`, `category`, `language`, `layout`) plus eine neue **`branding_settings`-Tabelle** (single-row) fuer Logo, Markenfarben, Schrift, Footer.
4. **6+ Systemvorlagen** als Seed via SQL-Migration, plus ein **KI-Vorlagen-Generator** (Voice-Prompt + Bedrock) und ein **Inline-Edit-Diktat** (Voice-Befehl gezielte Modifikation am Body mit Diff-Preview).

Alle KI-Aufrufe folgen DEC-052 (on-click, nicht auto-load) und Datenresidenz (Bedrock Frankfurt, Whisper via bestehendem Adapter — V5.2 openai-default, V5.2 Azure-Code-Ready).

### V5.3 Main Components

| Komponente | Pfad | Typ | Verantwortung |
|---|---|---|---|
| Branding-Settings-Page | `cockpit/src/app/(app)/settings/branding/page.tsx` | Page (Server) | Read+Write `branding_settings`-Row |
| Branding-Form | `cockpit/src/app/(app)/settings/branding/branding-form.tsx` | Client | Logo-Upload, Farb-Picker, Schrift-Dropdown, Footer-Markdown |
| Branding-Actions | `cockpit/src/app/(app)/settings/branding/actions.ts` | Server Actions | `getBranding`, `updateBranding`, `uploadLogo` |
| Branding-Renderer | `cockpit/src/lib/email/render.ts` | Pure Function | `renderBrandedHtml(body, branding, vars)` → vollstaendiges HTML mit Inline-CSS |
| Send-Layer (bestehend) | `cockpit/src/lib/email/send.ts` | Server | Erweitert um Renderer-Hook (faellt auf `textToHtml` zurueck wenn Branding leer) |
| Composing-Studio Route | `cockpit/src/app/(app)/emails/compose/page.tsx` | Page (Server) | Laedt Templates, Branding, Deal-Kontext aus Query-Params |
| Composing-Studio Layout | `cockpit/src/app/(app)/emails/compose/compose-studio.tsx` | Client | 3-Panel-Layout, Mobile-Tabs, State-Management |
| Templates-Panel | `cockpit/src/app/(app)/emails/compose/templates-panel.tsx` | Client | Liste + Filter (System/Eigene), Klick wendet Vorlage an |
| Compose-Form | `cockpit/src/app/(app)/emails/compose/compose-form.tsx` | Client | An, Betreff, Body + bestehende KI-Improve-Buttons + Voice |
| Live-Preview | `cockpit/src/app/(app)/emails/compose/live-preview.tsx` | Client | Debounce 250ms, ruft `renderBrandedHtml` |
| KI-Empfaenger-Vorschlag | `cockpit/src/app/(app)/emails/compose/recipient-suggest.ts` | Server Action | Letzter schreibender Kontakt aus Deal, Fallback Primary-Contact |
| Template-Generator-Modal | `cockpit/src/app/(app)/emails/compose/new-template-dialog.tsx` | Client | Manuell + KI-Diktat (Voice/Text) |
| KI-Vorlagen-Prompt | `cockpit/src/lib/ai/prompts/email-template-generate.ts` | Pure Function | System-Prompt + JSON `{title, subject, body, suggestedCategory}` |
| Inline-Edit-Modal | `cockpit/src/app/(app)/emails/compose/inline-edit-dialog.tsx` | Client | Voice → Whisper → Bedrock → Diff-Preview → Akzeptieren/Verwerfen |
| KI-Inline-Edit-Prompt | `cockpit/src/lib/ai/prompts/email-inline-edit.ts` | Pure Function | System-Prompt + JSON `{newBody, summary}` mit klaren Constraints |
| Template-Actions (bestehend) | `cockpit/src/app/(app)/settings/template-actions.ts` | Server Actions | Erweitert um `is_system`/`category`/`language`-Felder + `duplicateSystemTemplate` |

**Bewusst NICHT geaendert:**
- `cockpit/src/lib/email/send.ts` — Tracking, DB-Logging, Draft-Fallback bleiben Bit-fuer-Bit gleich. Renderer-Hook ist additiv.
- `cockpit/src/lib/email/tracking.ts` — Pixel-Injection, Link-Wrapping, `textToHtml`-Fallback bleiben.
- `cockpit/src/app/(app)/emails/email-compose.tsx` — bleibt funktional als Mini-Variante in der bestehenden Sheet (`email-sheet.tsx`); kein Breaking Change.
- IMAP-Sync, Cadence-Engine, Tracking-API.

### V5.3 Responsibilities

**`renderBrandedHtml(body, branding, vars)` (lib/email/render.ts):**
- Input: `body: string` (Markdown/Plain), `branding: Branding | null`, `vars: Record<string, string>` (Deal-Kontext fuer Variablen-Ersetzung).
- Output: vollstaendiges `<!DOCTYPE html>...<body>...</body></html>` mit Inline-CSS.
- Fallback: wenn `branding === null` oder alle Branding-Felder leer → `textToHtml(body)` aus `tracking.ts` (V5.2-Verhalten).
- Email-Client-Kompatibilitaet: nur table-Layout + Inline-Styles, keine Flex/Grid, keine externen CSS-Dateien.
- Variablen-Ersetzung passiert **vor** dem HTML-Render — gleiche Token wie heute (`{{vorname}}`, `{{nachname}}`, `{{firma}}`, `{{position}}`, `{{deal}}`).
- Pure Function (kein I/O) — Snapshot-Tests sind trivial.

**`/emails/compose` Page (Server-Side):**
- Liest Query-Params `dealId`, `contactId`, `companyId`, `templateId`.
- Laedt parallel: `branding_settings` (1 Row), `email_templates` (alle), Deal-Kontext (wenn `dealId` gesetzt).
- Liefert initiale Werte an Client-Komponente. Kein KI-Call bei Page-Load (DEC-052).

**Compose-Studio (Client):**
- State: `to`, `subject`, `body`, `templateId`, `language`.
- Effects:
  - Template-Auswahl → wendet Subject + Body an, Variablen werden mit Deal-Vars ersetzt.
  - Body/Subject-Aenderung → Live-Preview rendert mit Debounce 250ms.
  - "KI-Vorschlag An/Betreff"-Button → Server Action `recipient-suggest.ts` (on-click).
- Mobile (<768px): 3 Panels werden zu Tabs (Vorlagen / Erfassen / Preview) in derselben Route.

**`recipient-suggest.ts` (Server Action):**
- Input: `dealId`.
- Logik:
  1. Lade letzte 10 Mails fuer den Deal sortiert nach `created_at DESC`.
  2. Erste Mail mit `direction='inbound'` und `from_address` → Vorschlag (letzter schreibender Kontakt).
  3. Fallback: Primary-Contact des Deals (`deals.primary_contact_id`).
  4. Subject-Vorschlag: deterministisch nach Stage (`Erstansprache`, `Follow-up`, `Nach Termin`, etc.) — KEIN LLM-Call. Stage-Mapping ist hartkodiert.
- Output: `{to: string, subject: string, contactId: string}`.

**`email-template-generate.ts` (Pure Function):**
- Wie `email-improve.ts`, anderer System-Prompt.
- JSON: `{title, subject, body, suggestedCategory}`.
- Categories: `erstansprache | follow-up | nach-termin | angebot | danke | reaktivierung | sonstige`.
- Sprache aus User-Prompt geraten (default `de`).

**`email-inline-edit.ts` (Pure Function):**
- Wie `email-improve.ts`, strikter Prompt.
- Constraints im System-Prompt:
  - "Aendere nur den Teil, den der User explizit nennt."
  - "Erfinde keine Fakten, keine Namen, keine Zahlen."
  - "Behalte Sprache und Ton bei."
  - "Wenn die Anweisung mehrdeutig ist, waehle die wahrscheinlichste Interpretation."
- JSON: `{newBody, summary}`.
- Frontend zeigt Diff-Vorschau (Library: `diff-match-patch` oder simple Line-Diff) vor Uebernahme.

### V5.3 Data Flow

**Flow 1: User schreibt Mail aus Deal-Workspace**

```
Deal-Workspace "E-Mail schreiben"
    |
    +--> Navigate to /emails/compose?dealId=DEAL_ID
    |
    +--> Server: page.tsx
    |     - SELECT * FROM branding_settings LIMIT 1
    |     - SELECT * FROM email_templates ORDER BY is_system DESC, title
    |     - SELECT deal + primary_contact + last_inbound_email FROM joined views
    |
    +--> Client: ComposeStudio mounts
    |     - Initial body/subject leer
    |     - Templates-Panel zeigt System + Eigene
    |     - User klickt "KI-Vorschlag An/Betreff"
    |          |
    |          +--> Server Action recipient-suggest.ts (on-click)
    |          |    - Query letzte Inbound-Mail fuer Deal
    |          |    - Fallback Primary-Contact
    |          |    - Stage-basiertes Subject
    |          +--> Form-State updated
    |
    +--> User waehlt Vorlage (Klick links)
    |     - Body + Subject aus Vorlage uebernommen
    |     - Variablen mit Deal-Vars ersetzt
    |
    +--> User aendert Body
    |     - Debounced (250ms) → Live-Preview rendert
    |          |
    |          +--> renderBrandedHtml(body, branding, vars)
    |          |    - Inline-CSS, Table-Layout
    |          |    - Logo via Public-URL aus Storage Bucket
    |
    +--> User klickt "Senden"
          |
          +--> Server Action sendComposedEmail
          |    - renderBrandedHtml(body, branding, vars) → html
          |    - sendEmailWithTracking({to, subject, body, html, dealId, contactId, ...})
          |        - injectTracking(html, trackingId)
          |        - SMTP send
          |        - INSERT INTO emails (status='sent', tracking_id, ...)
          |
          +--> redirect("/emails/SENT_ID") oder Toast
```

**Flow 2: User erstellt neue Vorlage per KI-Diktat**

```
Composing-Studio "+ Neue Vorlage" Button
    |
    +--> NewTemplateDialog opens
    |
    +--> User waehlt "KI-Diktat"-Modus
    |     - Voice: Whisper-Adapter (bestehend) → Transcript
    |     - Text: direkt
    |
    +--> Server Action generateTemplate(prompt, language)
    |     - email-template-generate.ts → Bedrock
    |     - Returns {title, subject, body, suggestedCategory}
    |
    +--> Client: Form gefuellt, User editiert
    |
    +--> User klickt "Speichern"
          |
          +--> Server Action createEmailTemplate
          |    - INSERT INTO email_templates (is_system=false, category, language, ...)
```

**Flow 3: User macht Inline-Edit-Diktat**

```
Composing-Studio "Inline-Edit-Diktat"-Button
    |
    +--> InlineEditDialog opens
    |
    +--> User spricht Befehl
    |     - Whisper-Adapter → Transcript
    |
    +--> Server Action applyInlineEdit(originalBody, transcript)
    |     - email-inline-edit.ts → Bedrock
    |     - System-Prompt verbietet Erfindung, erzwingt minimale Modifikation
    |     - Returns {newBody, summary}
    |
    +--> Client: Diff-Vorschau (alter vs neuer Body)
    |
    +--> User klickt "Akzeptieren" oder "Verwerfen"
          - Akzeptieren: setBody(newBody)
          - Verwerfen: keine Aenderung
```

### V5.3 Database Changes — MIG-023

**Neue Tabelle `branding_settings` (single-row):**

```sql
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT NULL,
  primary_color TEXT NULL,         -- Hex z.B. "#0F172A"
  secondary_color TEXT NULL,       -- Hex
  font_family TEXT NULL DEFAULT 'system', -- system | inter | sans | serif
  footer_markdown TEXT NULL,
  contact_block JSONB NULL,        -- {name, company, phone, web}
  updated_by UUID NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON branding_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON branding_settings TO authenticated;

-- Single-row enforcement at app level (UPSERT auf erste Row, keine zweite anlegen)
INSERT INTO branding_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
```

**Erweiterung `email_templates`:**

```sql
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS category TEXT NULL;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS language TEXT NULL DEFAULT 'de';
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS layout JSONB NULL;
CREATE INDEX IF NOT EXISTS idx_email_templates_is_system ON email_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
```

Alle bestehenden Rows: `is_system=false` (Default), `category=null`, `language='de'` (Default), `layout=null` — Backwards Compatibility.

**Seed Systemvorlagen (mind. 6 DE + 1-2 EN/NL):**

```sql
INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders)
VALUES
  ('System: Erstansprache Multiplikator', true, 'erstansprache', 'de', '...', '...', '[...]'),
  ('System: Erstansprache Unternehmer-Lead', true, 'erstansprache', 'de', '...', '...', '[...]'),
  ('System: Follow-up nach Erstgespraech', true, 'follow-up', 'de', '...', '...', '[...]'),
  ('System: Follow-up Angebot ausstehend', true, 'follow-up', 'de', '...', '...', '[...]'),
  ('System: Danke nach Termin', true, 'danke', 'de', '...', '...', '[...]'),
  ('System: Re-Aktivierung kalter Lead', true, 'reaktivierung', 'de', '...', '...', '[...]'),
  ('System: Cold Outreach (EN)', true, 'erstansprache', 'en', '...', '...', '[...]'),
  ('System: Eerste contact (NL)', true, 'erstansprache', 'nl', '...', '...', '[...]')
ON CONFLICT DO NOTHING;
```

(Konkrete Body-Texte werden in der Slice-Implementierung ausformuliert — Architektur-Entscheidung ist nur die Seed-Strategie via SQL.)

**Keine Schema-Aenderung** an `emails`, `contacts`, `deals`, `companies`, `cadences`.

### V5.3 Storage — Branding Bucket

Neuer Supabase Storage Bucket **`branding`** (Public-Read, Authenticated-Write):

- **Pfad-Schema:** `branding/logo-{timestamp}.{ext}` (Versionierung via Timestamp, alte Files werden bei neuem Upload geloescht).
- **Maximale Dateigroesse:** 2 MB (App-Level-Validierung).
- **Erlaubte MIME-Types:** `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`.
- **Public-URL:** `https://<supabase-host>/storage/v1/object/public/branding/logo-XXX.png` — wird in `branding_settings.logo_url` persistiert.
- **Bucket-Erstellung:** Via SQL-Migration (`storage.buckets`-Insert) oder Supabase-CLI in Pre-Deploy-Script.

Begruendung gegen Data-URI (siehe DEC-089):
- Logos sind oft 50-300 KB — Data-URI in DB wuerde jede Branding-Read-Query verlangsamen.
- Public-URL ist stabiler in E-Mail-Clients (Outlook blockt Data-URIs in manchen Konfigurationen).
- Storage Bucket ist bereits Pattern (siehe `documents`, `recordings`, `call-recordings`).

### V5.3 External Dependencies

| Dependency | Status | Verwendung |
|---|---|---|
| Bedrock Claude Sonnet (Frankfurt) | bestehend (DEC-005) | KI-Vorlagen-Generator + Inline-Edit-Prompt |
| Whisper-Adapter (openai-default) | bestehend (V5.2 DEC-085) | Voice-Input fuer Vorlagen-Diktat + Inline-Edit |
| Supabase Storage | bestehend | Branding-Logo Bucket (neu) |
| `nodemailer` | bestehend | Versand-Layer (unveraendert) |
| `diff-match-patch` (oder eigener Line-Diff) | NEU | Diff-Vorschau im Inline-Edit-Modal |

**Keine** neuen externen Services. Keine neuen Auth-Pfade. Keine neue Region.

### V5.3 Security / Privacy

**Branding-Daten:**
- Logo + Farben sind nicht-sensitiv (Marketing-Material).
- Footer-Markdown kann Telefonnummer enthalten — RLS verhindert nicht-authentifizierten Zugriff.
- Storage Bucket Public-Read: Logos sind ohnehin in jeder versendeten Mail enthalten.

**KI-Calls (Bedrock):**
- Body + Vorlagen-Inhalte werden an Bedrock Frankfurt gesendet (DEC-005, data-residency.md).
- Keine PII-Felder im System-Prompt — System-Prompt enthaelt nur Anweisungen, keine Kunden-/Kontakt-Daten ueber den User-Body hinaus.
- DEC-052: KI-Calls on-click, keine Auto-Loads → User-kontrollierte Kostenverursachung.

**Voice-Input (Whisper):**
- Audio geht via bestehendem Adapter (V5.2 openai-default, Azure-EU-Switch ausstehend).
- Internal-Test-Mode bleibt bis Anwalts-Pruefung + Azure-EU-Switch (V5.2-Pre-Pflicht).

**E-Mail-Tracking:**
- Tracking-Pixel + Link-Wrapping bleiben unveraendert (V4 FEAT-506, DEC-066).
- Live-Preview rendert OHNE Tracking-Injection (Preview ist nur fuer User-Eyes; Injection passiert in `sendEmailWithTracking` → `injectTracking`).

### V5.3 Constraints & Tradeoffs

**Constraint: Email-Client-Kompatibilitaet**
- Renderer darf nur table-Layout + Inline-CSS produzieren. Flex/Grid funktioniert in Outlook nicht.
- Tradeoff: Code-mehr im Renderer (verbose Tables) vs. zuverlaessige Darstellung. → Renderer ist verbose, dafuer testbar via Snapshots.

**Constraint: Backwards Compatibility**
- Bestehende Mails (heute via `textToHtml`) muessen weiterhin funktionieren wenn `branding_settings` leer.
- Tradeoff: Doppel-Pfad in `send.ts` (Branding vorhanden → Renderer / leer → `textToHtml`). → Akzeptiert, Pfad ist klein und gut testbar.

**Constraint: Live-Preview Performance**
- Bei jedem Body-Keystroke darf nicht der gesamte HTML-Tree neu gemounted werden.
- Tradeoff: Debounce 250ms (User merkt minimalen Lag) + React-Memo auf Renderer-Output. → Akzeptiert.

**Constraint: KI-Inline-Edit Halluzinationen**
- LLMs erfinden gerne Inhalte, wenn der Prompt vage ist.
- Tradeoff: Strenger System-Prompt + zwingende Diff-Vorschau (User akzeptiert vor Uebernahme). → Akzeptiert, plus Smoke-Test an min. 3 Beispielen vor Release.

**Tradeoff: Mobile-Composing-Studio = Tabs in derselben Route (DEC-093)**
- Alternative waere: Mobile bekommt das alte `email-sheet.tsx` weiterhin.
- Entscheidung: einheitlicher Code-Pfad + responsive-Tabs. → Vermeidet Routing-Split + Doppel-Maintenance.

**Tradeoff: Empfaenger-Vorschlag ohne LLM (DEC-092)**
- Alternative waere: LLM rankt mehrere Kontakte aus Deal.
- Entscheidung: deterministische Logik (letzter schreibender Kontakt → Primary-Contact), kein LLM.
- Begruendung: schneller, deterministisch, keine Bedrock-Kosten, ausreichend fuer V5.3-Scope. KI-Ranking kann V7-Topic werden.

### V5.3 Open Questions (alle aus PRD geklaert)

| PRD-Question | Entscheidung | DEC |
|---|---|---|
| Branding-Storage-Tabelle | Eigene Tabelle `branding_settings` (single-row) | DEC-088 |
| Logo-Storage | Supabase Storage Bucket `branding/`, kein Data-URI | DEC-089 |
| `layout`-Feld auf `email_templates` | Nullable JSONB ohne Schema, V5.3 ungenutzt | DEC-090 |
| Systemvorlagen-Seed | SQL-Migration mit INSERT, MIG-023 | DEC-091 |
| Empfaenger-KI-Vorschlag | Deterministisch (letzter Inbound-Kontakt → Primary-Contact), kein LLM | DEC-092 |
| Mobile-Routing | Tabs in derselben Route `/emails/compose`, kein Sheet-Routing-Split | DEC-093 |
| Inline-Edit-Konfidenz | Pragmatisch raten, Diff-Vorschau ist Sicherheitsnetz | DEC-094 |
| Slice-Schnitt | 5 Slices, FEAT-532 in 2 Slices (siehe naechster Abschnitt) | siehe Empfohlene Slice-Struktur |

Zusaetzliche Architektur-Entscheidung: Renderer als Single-Source-of-Truth (DEC-095) — Live-Preview und Send rufen denselben `renderBrandedHtml`, kein Drift moeglich.

### V5.3 Empfohlene Slice-Struktur

**5 Slices (FEAT-532 in 2 Slices zerlegt — DEC-093):**

**SLC-531 — Branding Foundation**
- FEAT-531 vollstaendig
- MIG-023 Tabelle `branding_settings` + Storage Bucket `branding`
- `cockpit/src/lib/email/render.ts` mit `renderBrandedHtml` (Pure Function + Snapshot-Tests)
- `/settings/branding`-Page + Form + Server Actions (`getBranding`, `updateBranding`, `uploadLogo`)
- `send.ts`-Hook: ruft Renderer wenn Branding gepflegt, sonst `textToHtml`
- Acceptance: Mail mit Branding wird in Gmail/Outlook sichtbar gerendert, ohne Branding bleibt heutiger Output bit-fuer-bit gleich.
- Schaetzung: ~1.5-2 Tage

**SLC-532 — Email-Templates Schema + Systemvorlagen + KI-Generator**
- FEAT-533 vollstaendig
- MIG-023 Erweiterung `email_templates` (`is_system`, `category`, `language`, `layout`) + Seed 6+ Systemvorlagen
- `template-actions.ts` Erweiterung: Filter `is_system`/`category`, neue Action `duplicateSystemTemplate`
- `email-template-generate.ts` Prompt + Server Action `generateTemplate`
- Acceptance: 6+ Systemvorlagen sichtbar, Filter funktioniert, KI-Generator produziert valides JSON.
- Schaetzung: ~1 Tag

**SLC-533 — Composing-Studio Layout + KI-Vorausfuellung** (FEAT-532 Teil 1)
- Route `/emails/compose/page.tsx` + Server-Side-Loader (Branding, Templates, Deal-Kontext)
- 3-Panel-Layout-Komponente (`compose-studio.tsx` + 3 Panel-Komponenten)
- Mobile-Tabs-Variante in derselben Route
- KI-Empfaenger/Betreff-Vorschlag (`recipient-suggest.ts`, deterministisch)
- Templates-Panel mit Filter + Klick-Anwendung + Variablen-Replace
- Compose-Form mit bestehenden KI-Improve-Buttons + Voice (heute angehaengt)
- KEINE Live-Preview, KEIN Send (in SLC-534)
- Acceptance: Seite laedt mit Deal-Kontext, Vorlage anwendbar, KI-Vorschlag funktioniert.
- Schaetzung: ~1.5 Tage

**SLC-534 — Live-Preview + Send-Integration + Einstiegspunkte** (FEAT-532 Teil 2)
- Live-Preview-Komponente mit Debounce 250ms + `renderBrandedHtml`-Aufruf
- Send-Server-Action `sendComposedEmail` (Renderer → `sendEmailWithTracking`)
- Variablen-Resolver mit Deal-Kontext
- Einstiegspunkte umstellen: Deal-Workspace, Mein Tag, Focus → Link auf `/emails/compose?dealId=...`
- Acceptance: Senden produziert dieselben DB-Eintraege wie heute, Preview = versendete Mail bit-identisch.
- Schaetzung: ~1.5 Tage

**SLC-535 — Inline-Edit-Diktat**
- FEAT-534 vollstaendig
- `email-inline-edit.ts` Prompt mit Constraints
- Server Action `applyInlineEdit`
- Inline-Edit-Modal mit Voice-Recording + Diff-Vorschau
- Smoke-Test an min. 3 Beispielen (3 Test-Faelle dokumentiert in QA-Report)
- Acceptance: Inline-Edit aendert nur den geforderten Teil, KI erfindet keine Fakten, Diff-Vorschau zwingend.
- Schaetzung: ~1 Tag

**Gesamtschaetzung: ~6-7 Tage**

Abhaengigkeiten:
- SLC-532 ist unabhaengig von SLC-531 (kann parallel implementiert werden, falls 2 Sessions).
- SLC-533 braucht SLC-531 (Branding) + SLC-532 (Templates).
- SLC-534 braucht SLC-533 (Layout) + SLC-531 (Renderer fuer Live-Preview + Send).
- SLC-535 braucht SLC-533 (Composing-Studio-Layout fuer Modal-Trigger).

Empfohlene Reihenfolge: SLC-531 → SLC-532 → SLC-533 → SLC-534 → SLC-535.

### V5.3 Risks & Open Decisions

**Risk: Email-Client-Snapshot-Tests nicht ausreichend.**
- Mitigation: Smoke-Test in SLC-531 mit echtem Versand an Gmail/Outlook/Apple Mail (ein Test-Postfach, dokumentiert im QA-Report).

**Risk: Live-Preview-Debounce zu langsam/zu schnell.**
- Mitigation: 250ms als Default, in SLC-534 QA validieren, ggf. anpassen.

**Risk: KI-Inline-Edit halluziniert trotz strengem System-Prompt.**
- Mitigation: Diff-Vorschau ist mandatory (User MUSS akzeptieren), 3 Test-Faelle in SLC-535 QA dokumentiert.

**Risk: Bestehende Vorlagen ohne `language`-Wert produzieren `null`-Bugs.**
- Mitigation: Migration setzt Default `'de'` + ALL nullable. Code muss `language || 'de'` an allen Lesepfaden defensiv sein.

**Open Decision (deferred):** Block-basierter Mail-Builder (`layout`-Feld) — bewusst ungenutzt in V5.3, Schema vorbereitet. Aktivierung in V7+ als eigenes Feature.

**Open Decision (deferred):** KI-Empfaenger-Ranking via LLM (mehrere Kontakte) — V5.3 nutzt deterministische Logik. Aktivierung wenn User-Feedback zeigt dass deterministisch nicht reicht.

### V5.3 Recommended Next Step

`/slice-planning` V5.3 — die 5 Slices SLC-531..SLC-535 strukturiert ausdefinieren mit Acceptance Criteria, Micro-Tasks, QA-Fokus und Cross-Slice-Dependencies. Danach pro Slice `/backend` (SLC-531, SLC-532) und `/frontend` (SLC-533, SLC-534, SLC-535) mit `/qa` nach jedem Slice.

## V5.4 — Composing-Studio Polish + E-Mail-Anhaenge Architecture

### V5.4 Architecture Summary

V5.4 ist eine Polish + Inkrement-Version. Ein Slice schliesst V5.3-Hygiene ab (Color-Picker AC9-Drift-Fix, ESLint-Cleanup, COMPLIANCE.md-Update, Coolify-Cron-Cleanup-Doku), der zweite Slice erweitert das Composing-Studio um PC-Direkt-Anhaenge mit eigenem Storage-Bucket, Junction-Table und Multipart-SMTP. Versand-Layer bleibt rueckwaertskompatibel — `sendEmailWithTracking` ohne `attachments`-Parameter ist bit-identisch zu V5.3 (Cadences, Auto-Reply unbeeintraechtigt).

### V5.4 Main Components

```
/settings/branding (UPDATED)
  <ConditionalColorPicker>
    Toggle "Markenfarbe verwenden" + native <input type=color>
    Toggle aus -> null persistiert; Toggle an -> Hex

/emails/compose (UPDATED)
  Compose-Form (Mitte)
    <Body Textarea>
    <AttachmentsSection>
      Drag&Drop Zone + File-Picker
      <AttachmentsList>
        PDF | whitepaper.pdf | 2.4 MB | [x]
        PNG | screenshot.png | 0.8 MB | [x]
  Live-Preview (Rechts)
    <BrandedHTML>...</BrandedHTML>
    -- Anhaenge --
    Icon whitepaper.pdf (2.4 MB)
    Icon screenshot.png (0.8 MB)

Storage / DB:
- Bucket "email-attachments" (privat, service_role-only) -> files
- Tabelle "email_attachments" (Junction): email_id <-> storage_path

Send-Pipeline:
sendComposedEmail(...) -> load attachments from Storage ->
  sendEmailWithTracking({..., attachments: [...]}) ->
  Nodemailer Multipart -> SMTP ->
  on success: INSERT email_attachments rows
```

### V5.4 Data Model (MIG-025)

**Neue Tabelle `email_attachments`:**
```sql
CREATE TABLE email_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id     UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON email_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

**Storage-Bucket `email-attachments`:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('email-attachments', 'email-attachments', false)
  ON CONFLICT DO NOTHING;
```
Storage-Policies: nur service_role darf insert/select. V5.4 tunnelt alles ueber Server Actions (kein direkter Browser-Read).

**Path-Schema (DEC-098):** `{user_id}/{compose_session_id}/{filename}`. Keine Path-Migration nach Send — Junction-Table mappt `email_id` <-> `storage_path` direkt.

**Branding-Settings — keine Schema-Aenderung:** Color-Picker-Toggle wirkt rein UI-seitig. `branding_settings.primary_color` und `secondary_color` sind bereits NULL-faehig (MIG-023). Toggle "aus" = UPDATE auf NULL. Bestehende Daten unveraendert (DEC-102 Defensive-Migration-Verzicht).

### V5.4 Architecture Decisions (DEC-097..104)

#### DEC-097 — Junction-Table `email_attachments` statt JSON-Spalte auf `emails`

**PRD-Question:** Junction-Table-Schema final, oder JSON-Spalte auf `emails`?

**Entscheidung:** Eigene Junction-Table.

**Reason:** Aggregat-Queries moeglich (z.B. "alle PDFs der letzten 30 Tage"), Index-Performance, sauberes Schema, passt zu bestehenden Datenmodell-Patterns (Activities, Documents). JSON-Spalte waere kompakter, aber Queries und Cleanup operativ unangenehm.

**Consequence:** MIG-025 legt die Tabelle an. Insert nach erfolgreichem SMTP-Send in `sendEmailWithTracking`. Cascade `ON DELETE CASCADE` von `emails.id`. Storage-Files NICHT cascade — Audit-Spur bleibt im Bucket.

#### DEC-098 — Storage-Path mit `compose_session_id`, kein Post-Send-Move

**PRD-Question:** Path-Struktur `compose_session_id` vs. `email_id`?

**Entscheidung:** `compose_session_id` Pre-Send, Path bleibt nach Send unveraendert. Junction-Table mappt `email_id` <-> `storage_path`.

**Reason:** Post-Send-Move waere zusaetzlicher Storage-Roundtrip pro Anhang fuer reine Path-Hygiene — kein operativer Gewinn. Junction-Table ist der Index, nicht der Path.

**Consequence:** Server Action `uploadEmailAttachment(file, composeSessionId)` schreibt direkt in finalen Path. `sendComposedEmail` erstellt nach Send Junction-Rows mit exaktem Upload-Pfad. Keine Move-Operation.

#### DEC-099 — MIME-Whitelist als shared Konstante, nicht Server-only

**PRD-Question:** Wo wohnt die Whitelist-Konstante?

**Entscheidung:** `cockpit/src/lib/email/attachments-whitelist.ts` — kein Server-only-Import. Browser- und Server-Code importieren dieselbe Konstante.

**Reason:** Source-of-Truth einmal. Drift zwischen Browser-Filter und Server-Validierung ist klassische Bug-Quelle.

**Consequence:** Datei exportiert `MIME_WHITELIST`, `EXTENSION_WHITELIST`, `MAX_FILE_SIZE_BYTES` (10 MB), `MAX_TOTAL_SIZE_BYTES` (25 MB). Browser nutzt Konstanten in `<input accept>` und onChange-Validation. Server Action ruft `validateAttachment(file)` mit derselben Konstante.

#### DEC-100 — ZIP wird akzeptiert, Inhalt nicht inspiziert

**PRD-Question:** ZIP-Inhalt server-seitig pruefen?

**Entscheidung:** ZIP rein, kein Inhalt-Inspection.

**Reason:** B2B-Vertriebs-Realitaet hat ZIPs (Multi-File-Pakete, Bilder-Sets, Angebote). User packt selbst, kennt den Inhalt — kein Forwarding-Use-Case. Empfaenger-Mailserver-Filter ist zweite Linie. Server-side Unzip waere zusaetzliche Library, Edge-Cases (verschluesselte ZIPs, geschachtelte ZIPs, Bombs) und V5.4-Overkill.

**Consequence:** Whitelist enthaelt `application/zip` + Endung `.zip`. Keine Unzip-Logik. Akzeptiertes Restrisiko ist im PRD V5.4 dokumentiert.

#### DEC-101 — Anhang-UI als Sektion unter Body, nicht Tab

**PRD-Question:** Anhang-Bereich Sektion oder Tab?

**Entscheidung:** Eigene Sektion direkt unter Body-Textarea.

**Reason:** Flachere UX — User sieht Body und Anhaenge ohne Klick. Tab-Variante = 1 Klick mehr + Erinnerungs-Risiko "ich hatte einen Anhang dran". B2B-Mails haben oft 1-2 Anhaenge — Sektion bleibt visuell erfassbar.

**Consequence:** Compose-Form-Layout vertikal verlaengert. Kein zusaetzlicher Tab-State. `<AttachmentsSection>` direkt unter `<BodyTextarea>` in `compose-form.tsx`.

#### DEC-102 — Color-Picker via wiederverwendbare `<ConditionalColorPicker>`-Komponente

**PRD-Question:** Toggle vs. Reset-Button?

**Entscheidung:** Toggle-Variante, gekapselt in wiederverwendbarer Komponente `<ConditionalColorPicker>`.

**Reason:** Toggle ist semantisch klar ("Markenfarbe verwenden: ja/nein") und lokal pro Color-Picker. Reset-Button waere global. Toggle als wiederverwendbare Komponente macht spaetere Branding-Erweiterungen (Hover-Color, Background) trivial.

**Consequence:** Neue Komponente `cockpit/src/components/branding/conditional-color-picker.tsx` mit Props `{ label, value, onChange, defaultColor }`. State `enabled = value !== null`. Toggle-Click setzt entweder NULL oder `defaultColor`. Form-Submit-Mapping: NULL bei Toggle aus, Hex bei Toggle an.

**Defensive-Migration-Verzicht:** Bestehende Branding-Eintraege werden NICHT in der Migration auf NULL gesetzt. User-Mental-Model: "wenn Wert da ist, ist es aktiv". Kein automatischer Reset.

#### DEC-103 — V5.4-Polish in einen Slice (SLC-541), kein Code/Doku-Split

**PRD-Question:** Polish ein Slice oder zwei?

**Entscheidung:** Ein Slice (SLC-541).

**Reason:** Die 4 Themen (Color-Picker, ESLint, COMPLIANCE.md, Coolify-Crons) sind zusammen ~3-4h Arbeit. Aufteilung waere Slicing-Overhead ohne Gewinn. Ein Slice = ein QA-Lauf = ein Commit-Bundle = ein Release-Eintrag.

**Consequence:** SLC-541 hat 5 logische Micro-Tasks (MT-1..MT-5). QA fokussiert sich auf Color-Picker-Verhalten Live-Smoke, ESLint-Build-Output, COMPLIANCE.md-Existenz, REL-019-Notes-Existenz. Coolify-Cron-Cleanup wird als User-Aktion in REL-019-Notes geliefert; QA verifiziert nur die Anleitung.

#### DEC-104 — Verwaiste-Anhaenge-Cleanup deferred (kein V5.4-Cron)

**PRD-Question:** Compose-Session-Lebensdauer + Cleanup-Strategie fuer verwaiste Anhaenge.

**Entscheidung:** Compose-Session-ID = UUID beim Page-Open, Lebensdauer = Tab-Session. Bei Page-Reload ohne Send bleiben Anhaenge im Storage als verwaiste Files. Kein V5.4-Cleanup-Cron.

**Reason:** Cleanup-Cron ist zusaetzliche Komplexitaet (welche Sessions verwaist? Wartezeit? Junction-Row-Existenz-Check?). V5.4-Scope eng. Storage-Volumen-Druck nicht akut.

**Consequence:** Tech-Debt im PRD V5.4 dokumentiert. Kein Code-Aufwand in V5.4. Monitoring-Punkt: bei `email-attachments`-Bucket >2 GB → Cleanup-Slice planen.

### V5.4 MIG-025 — Storage-Bucket + Junction-Table

**MIG-025 — V5.4 SLC-542 Email-Attachments Schema**
- **Date:** TBD (bei /backend SLC-542 anwenden auf Hetzner)
- **Scope:**
  1. Storage-Bucket `email-attachments` (privat, `public=false`)
  2. Tabelle `email_attachments` (Junction)
  3. Index `idx_email_attachments_email_id`
  4. RLS auf `email_attachments` mit `authenticated_full_access`-Policy
  5. Storage-Policies — Service-Role-Access only
- **Reason:** FEAT-542 braucht Persistenz fuer Anhaenge und Verknuepfung zur `emails`-Tabelle.
- **Affected Areas:** Neuer Storage-Bucket, neue Tabelle, neue Server Actions `uploadEmailAttachment`/`deleteEmailAttachment` in `cockpit/src/app/(app)/emails/compose/attachment-actions.ts`, `sendEmailWithTracking` Erweiterung um `attachments`-Parameter.
- **Risk:** Niedrig — additive Aenderungen. FK auf `emails(id)` mit `ON DELETE CASCADE`. Bucket-Anlage idempotent.
- **Rollback Notes:**
  - `DROP TABLE email_attachments CASCADE;`
  - `DELETE FROM storage.objects WHERE bucket_id='email-attachments'; DELETE FROM storage.buckets WHERE id='email-attachments';`
  - `send.ts`-Aenderung rein additiv (Default `attachments=[]`) — kein Code-Rollback noetig.

### V5.4 Constraints & Tradeoffs

**Constraint: V5.3-Send-Pfad bit-identisch.**
- `sendEmailWithTracking({...rest})` ohne `attachments`-Property bleibt funktional gleich. Cadences, Auto-Reply, Mein-Tag-Compose unangetastet.
- Tradeoff: Doppel-Pfad in `send.ts` (Anhaenge vorhanden = Multipart / leer = Bestehender HTML-Path). Akzeptiert — Pfad ist klein.

**Constraint: Tracking-Pixel bei Multipart-Mail.**
- Tracking-Pixel-Injection passiert im HTML-Body wie bisher. Multipart-Mail hat einen HTML-Body-Part und ein/mehrere `attachment`-Parts. Pixel bleibt im HTML-Body-Part eingebettet.
- Tradeoff: Manche Mailclients koennten Multipart-Mails strenger filtern. Akzeptiert — Smoke-Test in QA verifiziert bei Gmail.

**Constraint: Storage-Volumen waechst.**
- File bleibt nach Versand im Bucket (Auditspur).
- Tradeoff: ohne Cleanup-Cron waechst der Bucket monoton. Akzeptiert — Cleanup als separater Slice wenn Druck entsteht.

**Tradeoff: Eigener Bucket statt Subfolder im `documents`-Bucket.**
- Eigener Bucket: saubere Lifecycle-Trennung, eigene Policies, konsistent mit Branding-Bucket-Pattern.
- Akzeptiert (User-Entscheidung in /requirements).

### V5.4 Open Questions (alle aus PRD geklaert)

| PRD-Question | Entscheidung | DEC |
|---|---|---|
| Junction-Table-Schema | Eigene Tabelle `email_attachments` mit FK + Cascade | DEC-097 |
| Storage-Path-Struktur | `{user_id}/{compose_session_id}/{filename}`, kein Post-Send-Move | DEC-098 |
| Compose-Session-Lebensdauer + Cleanup | UUID beim Page-Open, Tab-Session, kein V5.4-Cleanup-Cron | DEC-104 |
| MIME-Whitelist-Konstante-Sharing | Plain TS-Datei in `cockpit/src/lib/email/attachments-whitelist.ts` | DEC-099 |
| Tracking-Pixel-Behavior bei Multipart | Kein Spezial-Handling, Smoke-Test verifiziert | (Risk, kein DEC) |
| Compose-Form-Integration | Sektion unter Body (nicht Tab) | DEC-101 |
| Polish-Slicing | Ein Slice SLC-541 fuer alle 4 Polish-Themen | DEC-103 |
| Color-Picker-Toggle vs. Reset-Button | Toggle-Variante als `<ConditionalColorPicker>` | DEC-102 |
| ZIP-Inhalt-Inspection | ZIP rein, Inhalt nicht pruefen | DEC-100 |

### V5.4 Empfohlene Slice-Struktur

**2 Slices (DEC-103: Polish gebuendelt):**

**SLC-541 — V5.4-Polish (FEAT-541)**
- MT-1: `<ConditionalColorPicker>`-Komponente in `cockpit/src/components/branding/conditional-color-picker.tsx`. Toggle-Checkbox + native Color-Input.
- MT-2: `/settings/branding`-Form auf `<ConditionalColorPicker>` umstellen (primary + secondary). Form-Submit-Mapping: NULL bei Toggle aus, Hex bei Toggle an. Acceptance: Live-Smoke mit Browser zeigt Toggle-Verhalten.
- MT-3: ESLint Hook-Order-Cleanup in `cockpit/src/components/email/new-template-dialog.tsx` und `inline-edit-dialog.tsx`. Hooks unconditional am Top-Level. Acceptance: `npm run lint` produziert keine Hook-Warnings mehr in den 2 Dateien.
- MT-4: `docs/COMPLIANCE.md` V5.3-Section ergaenzen — Composing-Studio-Datenfluesse, Inline-Edit-Whisper-Provider, Branding-Storage-Verhalten.
- MT-5: `docs/RELEASES.md` REL-019-Notes mit Coolify-Cron-Cleanup-User-Anleitung (Klick-Anleitung, Schritt-fuer-Schritt).
- Schaetzung: ~3-4h
- QA-Fokus: Color-Picker Toggle-Verhalten Live-Smoke, AC9-Verifikation (Mail ohne aktivierte Branding-Farben = bit-identisch zu V5.2), ESLint-Build-Output, COMPLIANCE.md-Existenz, REL-019-Notes-Existenz.

**SLC-542 — E-Mail-Anhaenge-Upload PC-Direkt (FEAT-542)**
- MT-1: MIG-025 — Bucket + Junction-Table + Index + RLS + Storage-Policies. Auf Hetzner anwenden via SSH.
- MT-2: `cockpit/src/lib/email/attachments-whitelist.ts` mit MIME_WHITELIST + EXTENSION_WHITELIST + Size-Konstanten. Validation-Helper `validateAttachment(file)`.
- MT-3: Server Actions `uploadEmailAttachment(file, composeSessionId)` und `deleteEmailAttachment(storagePath)` in `cockpit/src/app/(app)/emails/compose/attachment-actions.ts`. Service-Role-Storage-Client.
- MT-4: `<AttachmentsSection>`-Komponente in `cockpit/src/components/email/attachments-section.tsx`. Drag&Drop-Zone + File-Picker-Button + AttachmentsList mit Icon/Filename/Size/Loeschen. Browser-side Validation.
- MT-5: Compose-Form-Integration — `<AttachmentsSection>` unter Body-Textarea in `compose-form.tsx`. Compose-Session-ID via `useState(() => crypto.randomUUID())`. State `attachments: AttachmentMeta[]` mit Storage-Path nach Upload.
- MT-6: Live-Preview-Indikator — `<AttachmentsPreview>` in `live-preview.tsx` unterhalb Body-Render. Icon + Filename + Size pro Anhang.
- MT-7: `sendEmailWithTracking` Erweiterung um `attachments?: { storagePath, filename, mimeType }[]`-Parameter. Storage-File-Download via service_role, Nodemailer `attachments`-Array, Multipart-Body. Default leer = bit-identisches V5.3-Verhalten.
- MT-8: `sendComposedEmail` Server Action erweitert — laedt `attachments` aus Compose-Form-State, ruft `sendEmailWithTracking` mit Anhaengen, persistiert nach Erfolg `email_attachments`-Junction-Rows.
- MT-9: Smoke-Test mit echter Mail an Gmail (PDF + PNG + ZIP, 3 verschiedene MIME-Types). Tracking-Pixel-Event muss feuern. Anhaenge muessen in Gmail downloadbar sein.
- Schaetzung: ~1-1.5 Tage
- QA-Fokus: MIME-Whitelist Browser-Block + Server-Block, Size-Limits (10/25 MB), Drag&Drop + File-Picker, Loeschen entfernt Storage-File, Multipart-Mail in Gmail mit Tracking-Pixel-Event, Cadence-Engine-Regression-Check.

**Gesamtschaetzung: ~1.5-2 Tage** (ein Vormittag Polish + ein Tag Anhaenge inkl. QA + Smoke).

Abhaengigkeiten:
- SLC-541 unabhaengig von SLC-542 (kann separat deployt werden).
- SLC-542 setzt SLC-541 nicht voraus.
- User-Entscheidung in /requirements: nacheinander durchlaufen.

Empfohlene Reihenfolge: SLC-541 → /qa → SLC-542 → /qa → Gesamt-/qa V5.4 → /final-check → /go-live → /deploy → /post-launch.

### V5.4 Risks & Open Decisions

**Risk: Tracking-Pixel bei Multipart-Mail wird ignoriert.**
- Mitigation: Smoke-Test in SLC-542 QA. Test-Mail an Gmail mit Anhang + Tracking-Pixel. Open-Event muss in `email_tracking_events`-Tabelle sichtbar werden.

**Risk: 25 MB Total-Limit ueberschreitet SMTP-Provider-Limit.**
- Mitigation: aktueller Outbound-Provider erlaubt 25 MB Default. Falls Send fehlschlaegt: Server-Action liefert klare Fehlermeldung an UI.

**Risk: Color-Picker-Toggle-State-Ableitung initial falsch.**
- Mitigation: SLC-541 MT-2 Live-Smoke verifiziert: User mit `primary_color=NULL` sieht Toggle aus, mit `#abc123` sieht Toggle an.

**Risk: Verwaiste Storage-Files akkumulieren bei Page-Reload-Abandonments.**
- Mitigation: Monitoring-Punkt — bei Bucket >2 GB → Cleanup-Slice planen (siehe DEC-104).

**Risk: ESLint-Cleanup deckt Render-Bugs auf.**
- Mitigation: SLC-541 QA verifiziert visuell die zwei Dialoge nach Cleanup. Keine Funktional-Aenderung erwartet.

**Risk: Coolify-Cron-Cleanup-Anleitung verwirrt User.**
- Mitigation: Klick-fuer-Klick-Anleitung mit konkreten Cron-Namen. Pre-Snapshot-Empfehlung. Optional separater Schritt nach SLC-541-Deploy.

**Risk: ZIP-Anhang mit Schadcode wird unbemerkt rausgesendet.**
- Mitigation: User selbst legt Files aus, kein Forwarding-Use-Case. Empfaenger-Spam-Filter ist zweite Linie. Akzeptiertes B2B-Restrisiko (DEC-100).

**Open Decision (deferred):** Anhang-Auswahl aus Document-Library — nicht V5.4-Anforderung.

**Open Decision (deferred):** Cadences mit Anhaengen — keine V5.4-UI-Anforderung.

### V5.4 Recommended Next Step

`/slice-planning` V5.4 — die 2 Slices SLC-541 + SLC-542 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Danach `/backend SLC-541` → `/qa` → `/backend+frontend SLC-542` → `/qa`.

## V5.5 — Angebot-Erstellung Architecture

### V5.5 Architecture Summary

V5.5 baut die operative Angebot-Schreibumgebung auf den Foundations von V2 (`proposals`-Stub), V3 (`audit_log`), V5.3 (Branding-Renderer) und V5.4 (`email_attachments`-Junction + Storage-Pattern). Drei zentrale Pipelines: (1) Schreibumgebung `/proposals/[id]/edit` mit 3-Panel-UI (Position-Liste links, Editor mitte, Live-Preview rechts), (2) Server-side PDF-Generierung via pdfmake mit Branding-Header und Internal-Test-Mode-Watermark, (3) Composing-Studio-Hookup als zweiter Anhang-Pfad neben PC-Direkt-Upload (DEC-097/098 erweitert um source_type-Diskriminator).

Alle Komponenten sind additiv. Bestehende V2-Stub-Daten in `proposals` bleiben funktional. Bestehender V5.4 PC-Upload-Pfad bleibt regression-frei. KEIN externer API-Call (kein PDF-as-a-Service, kein OCR) — alles serverseitig in der Coolify-Container-Runtime.

### V5.5 Components

#### 1. Datenmodell (FEAT-551, MIG-026)

Drei Tabellen-Aenderungen + ein Storage-Bucket:

| Tabelle | Aenderung | Warum |
|---|---|---|
| `proposals` | +11 nullable Spalten (Brutto/Netto-Berechnung, Versionierung, Lifecycle-Timestamps, PDF-Pfad) | Stub aus V2 wird operativ |
| `proposal_items` | NEU — Position-Items mit Snapshot-Feldern (DEC-107) | Strukturierte Berechnungs-Basis |
| `email_attachments` | +`source_type` (`upload`/`proposal`) + `proposal_id` FK + CHECK-Constraint | FEAT-555 Composing-Studio-Hookup |
| `proposal-pdfs` Storage-Bucket | NEU privat, RLS auf Path-Folder=user_id | DEC-111 Pfad-Schema |

Snapshot-Pattern: `proposal_items.snapshot_name`, `snapshot_description`, `snapshot_unit_price_at_creation` werden beim INSERT aus `products` mit-kopiert. Aenderungen an `products` brechen alte Angebote nicht. FK `ON DELETE SET NULL` auf `products` schuetzt Audit-Wahrheit.

#### 2. Angebot-Workspace (FEAT-552)

Route: `/proposals/[id]/edit`

Architektur-Schichten:

- **Server Component**: Initial-Page laedt `proposal` + `proposal_items` + Branding + Deal-Kontext via `getProposalForEdit(id)` Server Action (Promise.all)
- **Client Component `<ProposalWorkspace>`**: Form-State via React-Hook-Form, Validierung Zod, Auto-Save debounced (500ms) per Server Action `updateProposal`
- **Panel links `<PositionList>`**: Drag-and-Drop via `@dnd-kit/sortable`, Add-Button oeffnet `<ProductPicker>` Dialog (filtert nach `products.status='active'`)
- **Panel mitte `<ProposalEditor>`**: Empfaenger-Combobox aus Deal-Kontext, Tax-Rate Dropdown (0/7/19), Date-Picker fuer `valid_until` (Default +30d aus Branding-Settings), Textarea fuer `payment_terms` (Default aus Branding)
- **Panel rechts `<ProposalPreviewPanel>`**: HTML-Approximation des PDF-Layouts (DEC-106), debounced Re-Render bei Form-Change. "PDF generieren"-Button triggert Server Action `generateProposalPdf` und zeigt Result in `<iframe>`. "Neue Version erstellen"-Button triggert `createProposalVersion`.

Einstiegspunkte:
- `cockpit/src/app/(app)/deals/[id]/page.tsx` Quickaction-Bar: "Angebot erstellen" -> `createProposal({deal_id, contact_id, company_id})` -> Redirect zu `/proposals/{newId}/edit`
- `cockpit/src/app/(app)/pipeline/*` Card-Kontextmenue: "Angebot erstellen"
- `cockpit/src/app/(app)/proposals/page.tsx` Tabellen-Zeile: "Bearbeiten"-Link auf `draft`-Angeboten

#### 3. PDF-Pipeline (FEAT-553, DEC-105)

Renderer-Pipeline:

```
[ProposalEditor "PDF generieren"]
        |
        v
[Server Action generateProposalPdf]
        |
        v
[lib/pdf/proposal-renderer.ts]
        | renderProposalPdf(proposal, items, branding) -> Buffer
        v
[pdfmake DocumentDefinition]
        | Header (Logo + Markenfarbe-Linie)
        | Empfaenger-Block
        | Angebot-Header (Titel, V{n}, Datum, Gueltig bis)
        | Position-Tabelle (Pos|Produkt|Menge|Preis|Discount|Summe)
        | Summary (Subtotal, Steuer, Brutto)
        | Konditionen (payment_terms)
        | Footer (Branding-Footer + Test-Mode-Zeile DEC-113)
        v
[Storage-Bucket proposal-pdfs]
        | path = {user_id}/{proposal_id}/v{version}.pdf
        | Filename Suffix .testmode.pdf wenn DEC-113 aktiv
        v
[proposals.pdf_storage_path persist]
```

Adapter-Interface:

```typescript
// lib/pdf/proposal-renderer.ts
export interface ProposalRenderer {
  renderProposalPdf(input: {
    proposal: Proposal;
    items: ProposalItem[];
    branding: BrandingSettings;
    deal: Deal;
    company: Company;
    contact: Contact;
    testMode: boolean;
  }): Promise<{ buffer: Buffer; filename: string }>;
}
```

Standard-Schriften via pdfmake's `Roboto` (built-in, kein Custom-Font-Loading). Layout-Tabelle nutzt pdfmake's `table.layout='lightHorizontalLines'` als Standard. Branding-Markenfarbe wird als `fillColor` der Header-Zeile genutzt.

#### 4. Status-Lifecycle + Versionierung (FEAT-554)

Zustands-Diagramm:

```
[draft] --send/markSent--> [sent] --accept--> [accepted]
                              |--reject--> [rejected]
                              |--cron-expire--> [expired]

[any] --createVersion--> [new draft, parent_proposal_id=any.id, version=any.version+1]
```

Server Actions (alle in `cockpit/src/app/(app)/proposals/actions.ts`):

- `transitionProposalStatus(proposalId: string, newStatus: 'sent'|'accepted'|'rejected'|'expired'): Promise<void>`
  - Whitelist-Pruefung: nur `draft->sent`, `sent->accepted`, `sent->rejected`, `sent->expired` erlaubt
  - Setzt entsprechenden Timestamp (`accepted_at`, `rejected_at`, `expired_at`)
  - Idempotent (DEC-108): aktuelles Status==newStatus -> No-op, kein Audit-Eintrag
  - Audit-Eintrag in `audit_log`: `action='status_change'`, `entity_type='proposal'`, `entity_id=proposalId`, `changes={before:oldStatus, after:newStatus}`
- `createProposalVersion(parentProposalId: string): Promise<{newProposalId: string}>`
  - Liest parent + alle parent_items
  - INSERT neue `proposals`-Row mit `parent_proposal_id=parentId`, `version=parent.version+1`, `status='draft'`, alle anderen Felder kopiert ausser `pdf_storage_path` (NULL)
  - INSERT alle `proposal_items` neu mit neuer `proposal_id`, alle Snapshot-Felder kopiert
  - Audit-Eintrag mit `action='create'`, `context='Version V{n+1} of proposal V{n}'`
  - DEC-109: parent_proposal bleibt unangetastet
- `expireOverdueProposals()` (Cron-only, kein UI-Trigger)
  - SELECT alle `proposals` mit `status='sent'` AND `valid_until < CURRENT_DATE`
  - UPDATE Batch
  - Audit-Eintrag pro Row mit `actor_id=NULL`, `context='Auto-expire by cron'`

Cron-Endpoint: `cockpit/src/app/api/cron/expire-proposals/route.ts` (DEC-110, Pattern aus `recording-retention/route.ts`):

```typescript
// route.ts
import { verifyCronSecret } from "../verify-cron-secret";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) return new Response("unauthorized", { status: 401 });
  const supabase = createServiceRoleClient();
  // ... batch update + audit insert
  return Response.json({ ok: true, expiredCount });
}
```

Coolify-Cron: `expire-proposals` mit `0 2 * * *` (02:00 Berlin), `process.env.CRON_SECRET` als Auth-Header.

#### 5. Composing-Studio-Hookup (FEAT-555)

Bestehender V5.4-Pfad:
```
[<AttachmentsSection> in compose-form] -> uploadEmailAttachment() -> Storage email-attachments + Junction-Insert (source_type='upload')
```

Neuer V5.5-Pfad:
```
[<AttachmentsSection> "Angebot anhaengen"-Button]
  -> oeffnet <ProposalAttachmentPicker>-Dialog
  -> Liste aus getProposalsForDeal(currentDealId) (alle Status, DEC-112)
  -> Auswahl ruft attachProposalToCompose(proposalId)
  -> Server Action liest pdf_storage_path aus proposals
  -> Junction-Insert in email_attachments mit source_type='proposal', proposal_id=...
  -> Beim Send: lib/email/send.ts liest Junction-Rows, unterscheidet via source_type, holt Buffer aus proposal-pdfs-Bucket statt email-attachments-Bucket
  -> nach Send: transitionProposalStatus(proposalId, 'sent') (DEC-108, idempotent)
```

Filename-Pattern beim Send: `Angebot-{slug(deal.title)}-V{version}.pdf` (oder `.testmode.pdf` wenn DEC-113 aktiv).

`<AttachmentsSection>` zeigt beide Anhang-Typen einheitlich, aber mit Icon-Differenzierung: PC-Upload = Generic-File-Icon, Proposal = Branding-Document-Icon. Loeschen-Button entfernt Junction-Row (keine Storage-Loeschung — DEC-097 Cascade-Verhalten).

### V5.5 Data Model Direction

```
   [products]                   [deals]                [contacts]
       |                            |                       |
       v                            v                       v
[deal_products]              [proposals]<-----[parent_proposal_id]
                                   ^                       |
                                   |                       |  (Versionsreferenz, DEC-109)
                            [proposal_items]               |
                                   |
                            [snapshot_*  Audit, DEC-107]
                                   |
                                   v
                            [proposal-pdfs Storage Bucket]
                                  ^
                                  |
                            [proposals.pdf_storage_path]


   [emails]
      |
      v
[email_attachments] -- source_type=upload --> [email-attachments Bucket]
                   -- source_type=proposal --> [proposal-pdfs Bucket]
                                                       ^
                                                       |
                                              (gleiche Files, neue Read-Path)
```

### V5.5 Request Flow — "PDF generieren" Beispiel

```
1. User klickt "PDF generieren" im Workspace
2. Browser ruft Server Action generateProposalPdf(proposalId)
3. Server Action:
   a. SELECT proposals + proposal_items + branding_settings + deal + company + contact (Promise.all)
   b. Pruefung Status: nur draft|sent erlaubt PDF-Generierung
   c. Berechnung: subtotal_net = SUM(quantity * unit_price_net * (1 - discount_pct/100))
                  tax_amount = subtotal_net * tax_rate / 100
                  total_gross = subtotal_net + tax_amount
   d. UPDATE proposals SET subtotal_net, tax_amount, total_gross
   e. Aufruf renderProposalPdf(...) -> Buffer
   f. Upload in Storage: bucket=proposal-pdfs, path=`{user_id}/{proposalId}/v{version}.pdf`
   g. UPDATE proposals SET pdf_storage_path
   h. Audit-Eintrag: action='update', context='PDF generated'
   i. Return {pdfUrl: signed-url-fuer-iframe}
4. Browser zeigt PDF in <iframe> per signed URL
```

### V5.5 External Dependencies

- **pdfmake** — neues npm-Package, ~700 KB. Add via `npm install pdfmake @types/pdfmake`.
- **@dnd-kit/sortable** — bereits vorhanden? Pruefung: falls nicht, neu hinzufuegen fuer Position-Liste.
- KEINE externen API-Calls. Kein Bedrock-Call in V5.5 (DEC-052 Cost Control).
- KEINE neuen Coolify-Container. PDF-Generierung im bestehenden Next.js-Container.

### V5.5 Security / Privacy

- **RLS**: Alle 3 Tabellen-Erweiterungen + neue Tabelle haben `authenticated_full_access`-Policy (Single-User-Modus, V7-Multi-User-Erweiterung folgt). Storage-Bucket `proposal-pdfs` hat Path-Scope-Policy auf erstes Folder-Segment = `user_id`.
- **Audit-Trail**: Alle Status-Aenderungen + PDF-Generierung + Versions-Erstellung schreiben in `audit_log`. System-Aktionen (Cron) haben `actor_id=NULL`.
- **Datenresidenz** (`data-residency.md`): pdfmake laeuft serverseitig in Coolify-Container (Hetzner Frankfurt). Kein externer PDF-Service. Kein Logo-Upload zu CDN. Branding-Logo bleibt in Self-hosted Storage.
- **Internal-Test-Mode**: DEC-113 Watermark + Filename-Suffix machen Risiko sichtbar fuer Demo-Calls vor V5.6 Compliance-Gate.
- **Bedrock Cost Control** (DEC-052): Keine LLM-Calls in V5.5. KI-Generierter Angebotstext ist explizit out-of-scope (PRD).

### V5.5 Constraints & Tradeoffs

**Constraint 1: pdfmake-Layout-Limitierung.** pdfmake's Layout-Engine ist nicht so flexibel wie HTML/CSS. Multi-Spalten-Layouts mit Float-around-Image, komplexe Tabellen mit Merged-Cells sind muehsam. Tradeoff: Standard-Angebot-Layout (Briefkopf + Position-Tabelle + Summary) ist gut machbar — Marketing-Brochure-Layouts fuer V6+ erfordern dann Puppeteer-Migration als bewusste Architektur-Entscheidung.

**Constraint 2: Live-Preview-Drift.** HTML-Approximation und pdfmake-Server-Render unterscheiden sich in Schrift-Metriken, Tabellen-Spaltenbreiten, Zeilen-Umbruechen. Tradeoff: Live-Editing-UX bevorzugt vor Bit-Genauigkeit. User-Hinweis "Vorschau (HTML) — finales PDF kann minimal abweichen" macht das transparent.

**Constraint 3: Snapshot-Pflicht.** `proposal_items` koennen nicht ohne Snapshot-Felder existieren (DEC-107). Mehraufwand beim Insert (3 zusaetzliche Spalten lesen aus `products`). Tradeoff: Audit-Wahrheit > Insert-Speed (mikroskopisch).

**Constraint 4: Versions-Datenmenge.** Jede Version dupliziert alle Position-Items (DEC-109). Bei 5 Versionen mit je 10 Items = 50 `proposal_items`-Rows. Tradeoff: Datenintegritaet > Speicher-Effizienz. Bei 1000 Angeboten mit Avg 2 Versionen + 8 Items = 16.000 Rows — vernachlaessigbar.

**Constraint 5: Internal-Test-Mode-Sichtbarkeit.** Footer-Zeile + `.testmode.pdf`-Suffix ist subtil — empfaengerseitig verbergbar wenn User Filename umbenennt nach Download. Tradeoff: subtle-but-deterring vs. invasive-and-ugly. Bei tatsaechlichem Production-Use-Case (V5.6+) wird Watermark-Logik per ENV-Flag deaktiviert (DEC-113).

### V5.5 Technische Risiken

**Risk: pdfmake Memory-Druck bei vielen Position-Items.**
- Mitigation: PDF-Generierung ist on-demand, kein Auto-Render bei jedem Edit. Standard-Angebot hat 5-10 Items. Bei >50 Items: nicht V5.5-Use-Case (Out-of-Scope).

**Risk: Storage-Volumen-Wachstum durch verworfene Draft-PDFs.**
- Mitigation: PDF wird nur bei explizitem "PDF generieren"-Klick oder Send geschrieben (DEC-106). Cleanup-Cron-Strategie ist V5.6+ Folge-Slice. Monitoring-Punkt: bei `proposal-pdfs`-Bucket >2 GB.

**Risk: Versions-Erstellung dupliziert grosse Item-Mengen.**
- Mitigation: Items als Snapshot kopiert (DEC-107). Bei 50 Items: ~50 INSERTs in einer Transaction, <100ms.

**Risk: Composing-Studio-Hookup bricht V5.4 PC-Upload-Pfad.**
- Mitigation: Source-Type-Diskriminator in `email_attachments`. CHECK-Constraint stellt Konsistenz sicher. SLC-555 QA explizit Regression-Smoke.

**Risk: PDF-Format-Probleme bei alternativen Mailclients.**
- Mitigation: Standard-PDF-Spec, Roboto/Helvetica-Subset (keine Custom-Fonts). Smoke-Test in SLC-553 mit Adobe Reader, Chrome-PDF, Outlook, Gmail.

**Risk: Cron-Auto-Expire feuert bei Stundengrenze (Sommerzeit-Wechsel).**
- Mitigation: `valid_until DATE` ist Tagesgranularitaet — Stunde irrelevant. Cron-Lauf 02:00 Berlin gibt 2h-Puffer.

**Risk: Tax-Rate-Snapshot bei Steuerreform mid-Verhandlung.**
- Mitigation: `proposals.tax_rate` ist Snapshot beim Sent. Bei Aenderung: User erstellt neue Version mit aktuellem Satz (DEC-109).

### V5.5 Dependencies (package.json delta)

```json
{
  "dependencies": {
    "pdfmake": "^0.2.10",
    "@dnd-kit/sortable": "^8.0.0"
  },
  "devDependencies": {
    "@types/pdfmake": "^0.2.9"
  }
}
```

(Versionen final in SLC-553 Backend-Implementation pruefen — neueste stable.)

### V5.5 Empfohlene Slice-Reihenfolge (DEC-114)

| Slice | Feature | Scope | Schaetzung | QA-Fokus |
|---|---|---|---|---|
| SLC-551 | FEAT-551 | MIG-026 + RLS + Bucket | 3-4h | Migration idempotent, V2-Stub-Daten unveraendert lesbar, Bucket-Policy korrekt |
| SLC-552 | FEAT-552 | Workspace UI (3-Panel, Position-Liste, Editor, HTML-Preview) | 6-8h | Drag-Sortierung, Brutto/Netto-Live-Berechnung, Auto-Save, Einstiegspunkte |
| SLC-553 | FEAT-553 | pdfmake-Adapter + Branding-Layout + Storage-Write + Watermark | 5-7h | PDF in Adobe/Chrome/Outlook/Gmail oeffnet, Test-Mode-Footer sichtbar, Storage-Pfad korrekt |
| SLC-554 | FEAT-554 | Status-Lifecycle Server Actions + Versionierung + Cron-Endpoint | 4-6h | Whitelist greift, Audit-Eintraege da, Versions-Duplikat sauber, Cron-UPDATE-Query korrekt |
| SLC-555 | FEAT-555 | Composing-Studio Proposal-Picker + Send-Pfad-Erweiterung | 3-4h | PC-Upload-Regression, Multipart-Mail mit Proposal-PDF in Gmail, Auto-Sent-Status, Tracking-Pixel feuert |

Gesamt: ~21-29h. Reihenfolge zwingend (jeder Slice baut auf Vorgaenger). Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-020 nach SLC-555.

### V5.5 Open Points (fuer /slice-planning)

- **Worker-Erstellungs-Pfad in SLC-552 vs. SLC-551:** "Angebot erstellen aus Deal-Workspace" braucht Server Action `createProposal`, die SLC-551 fertig haben muss bevor SLC-552 die Einstiegspunkte verlinkt. Empfehlung: `createProposal` in SLC-551 mit-implementieren als Teil des Schema-Slices (Backend-Setup), `<ProposalWorkspace>`-Render in SLC-552. Final in `/slice-planning` entscheiden.
- **PDF-Preview-Cache-Strategie:** "PDF generieren" ueberschreibt vorheriges PDF in Storage. Preview-iFrame zeigt latest. Wenn User mehrfach generiert: alte PDFs werden ueberschrieben (kein Versionschronik im Storage, nur in `audit_log`). Tradeoff im Architecture beschlossen — Slice-Planning kann nicht weiter splitten.
- **Auto-Save-Granularitaet:** debounced 500ms beim Form-Edit, oder Click-to-Save explicit? Empfehlung: 500ms-debounced fuer Workspace-Felder, Add/Remove/Reorder-Item-Operationen sind sofort persistent (analog Composing-Studio). Final in SLC-552 SLC-Planning.
- **Cron-Setup-Anleitung in REL-020-Notes:** Coolify-Cron `expire-proposals` muss vom User manuell angelegt werden (Pattern wie SLC-541). Anleitung in REL-020-Notes mit konkreter Cron-Expression.

### V5.5 Recommended Next Step

`/slice-planning V5.5` — die 5 Slices SLC-551..555 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Danach pro Slice `/backend|/frontend` -> `/qa` -> Coolify-Redeploy in fester Reihenfolge.

## V5.6 — Zahlungsbedingungen + Pre-Call Briefing

### V5.6 Architecture Summary

V5.6 erweitert zwei orthogonale Bereiche der bestehenden Architektur:

1. **Angebot-Konditionen (FEAT-561):** Strukturierte Zahlungsbedingungen statt Freitext-Drift. Drei Sub-Themen — wiederverwendbare Templates (`payment_terms_templates`), Teilzahlungen (`proposal_payment_milestones`), und optionales Skonto (`proposals.skonto_*`). Erweitert die V5.5-Proposal-Pipeline ohne Schema-Bruch (alle bestehenden Proposals rendern bit-identisch).
2. **Pre-Call Briefing (FEAT-562):** Neuer Cron `meeting-briefing` (5-Min-Takt) der den existierenden Deal-Briefing-LLM-Stack (FEAT-301) wiederverwendet, das Output als Activity (`type='briefing'`) persistiert und ueber den existierenden Push-Service-Worker (FEAT-409) + SMTP-Stack delivert. KEIN neuer LLM-Adapter, KEINE neue Push-Infrastruktur.

Die zwei Features teilen sich nur die gemeinsame Schema-Migration MIG-027 — sie sind operationell unabhaengig und in separaten Slices implementierbar.

### V5.6 Main Components

```
                     V5.6 Erweiterungen (additiv zu V5.5)
                     =====================================

    [Settings UI]                    [Proposal Editor]                [Cron Pipeline]
         |                                  |                                |
         v                                  v                                v
  /settings/payment-terms        Bedingungs-Dropdown          /api/cron/meeting-briefing
  /settings/briefing             Skonto-Toggle                       (5-min)
                                 Split-Plan-Section                       |
         |                                  |                                v
         v                                  v                       buildDealBriefingPrompt
  payment_terms_templates       proposal_payment_milestones        (FEAT-301 Reuse)
  user_settings (extended)      proposals.skonto_*                        |
                                                                          v
                                          |                       Bedrock Claude Sonnet
                                          v                       (Frankfurt EU)
                            [pdfmake-Renderer (DEC-120)]                  |
                            Conditional-Block-Rendering                   v
                            V5.5-Fallback bit-identisch              [activity insert]
                                                                     type='briefing'
                                                                     source_type='meeting'
                                                                          |
                                                                          v
                                                                  [Push + Email Delivery]
                                                                  Service Worker (FEAT-409)
                                                                  SMTP (V5.4 send.ts)
```

### V5.6 Component Responsibilities

| Component | Responsibility | New / Reuse |
|---|---|---|
| `payment_terms_templates` Tabelle | CRUD-Source fuer Bedingungs-Vorauswahl | New (MIG-027) |
| `/settings/payment-terms` Page | Templates anlegen/editieren/loeschen, Default setzen | New (SLC-561) |
| `proposal_payment_milestones` Tabelle | Teilzahlungen pro Proposal mit Sequence + Trigger | New (MIG-027) |
| `proposals.skonto_*` Spalten | Optionales Skonto pro Proposal | New (MIG-027) |
| Bedingungs-Dropdown im Editor | Template auswaehlen, Freitext vor-fuellen | New (SLC-562) |
| Skonto-Toggle im Editor | Toggle + 2 Felder, UI-Mutex zu Vorkasse | New (SLC-562) |
| Split-Plan-Section im Editor | Add/Remove/Reorder + Live-Sum-Indikator | New (SLC-563) |
| pdfmake-Adapter | Conditional-Block fuer Konditionen + Skonto | Extend V5.5 (DEC-120, SLC-563) |
| `meetings.briefing_generated_at` | Idempotenz-Marker | New (MIG-027) |
| `/api/cron/meeting-briefing` Endpoint | 5-Min-Cron fuer Briefing-Generierung | New (SLC-564) |
| `buildDealBriefingPrompt` + `validateDealBriefing` | LLM-Prompt + Validation | Reuse (FEAT-301) |
| `cockpit/src/lib/ai/bedrock-client.ts` | Bedrock Claude Sonnet Call | Reuse (DEC-007) |
| Activity (`type='briefing'`) | Persistierung am Deal | Reuse (V3 activities) |
| Push Service Worker | Briefing-Push-Delivery | Reuse (FEAT-409) |
| SMTP via `cockpit/src/lib/email/send.ts` | Briefing-E-Mail-Delivery | Reuse (V5.3 send.ts) |
| `/settings/briefing` Page | Trigger-Zeit + Toggle Push/Email | New (SLC-564) |
| `user_settings.briefing_*` Spalten | User-Konfiguration | Extend (MIG-027) |

### V5.6 Data Model Direction

```
   [proposals]<-----[parent_proposal_id]
      |                     |
      | + skonto_percent    | (Versionsreferenz, V5.5 DEC-109)
      | + skonto_days       |
      |                     |
      |                     |
      v                     v
 [proposal_payment_milestones]   [proposal_items]   <-- bestehend V5.5
      |
      | (proposal_id FK ON DELETE CASCADE)
      | (UNIQUE (proposal_id, sequence))
      | (CHECK percent > 0 AND <= 100)
      | (App-Level Sum-Validation strict 100% — DEC-115)
      v
 [pdfmake-Renderer]
      |
      | (Conditional-Block — DEC-120)
      v
 [proposal-pdfs Bucket]   <-- bestehend V5.5



   [payment_terms_templates]   <-- neu, single-User-Tabelle
      |
      | (UNIQUE WHERE is_default=true — max 1 Default)
      | Seed: "30 Tage netto" als initial-default
      v
   [Editor-Dropdown]   --> proposals.payment_terms (Freitext-Override bleibt)



   [meetings]
      |
      | + briefing_generated_at (Idempotenz-Marker — DEC-118)
      | (Partial-Index: WHERE briefing_generated_at IS NULL AND deal_id IS NOT NULL)
      |
      v
 [meeting-briefing Cron]
      |
      | (UPDATE WHERE NULL — winner-takes-all)
      v
 [buildDealBriefingPrompt(deal_context)]   <-- Reuse FEAT-301
      |
      v
 [Bedrock Claude Sonnet Frankfurt]   <-- Reuse DEC-007
      |
      | (validateDealBriefing — Reuse FEAT-301)
      v
 [activities] INSERT type='briefing', source_type='meeting', source_id=meeting_id
      |
      |---> [Push Notification] (Reuse FEAT-409 Service Worker)
      |---> [SMTP E-Mail]       (Reuse V5.3 send.ts compact-HTML-Variante)



   [user_settings]
      | + briefing_trigger_minutes INT (15/30/45/60, default 30)
      | + briefing_push_enabled BOOLEAN default true
      | + briefing_email_enabled BOOLEAN default true
      |
      v
   [/settings/briefing Page]   <-- neu, single-Section-Page
```

### V5.6 Request Flow — Beispiel "Split-Plan + Skonto im Editor"

```
1. User oeffnet /proposals/{id}/edit
2. Browser laedt: proposal + items + milestones + branding (parallel via Promise.all)
3. Editor rendert:
   - Bedingungs-Dropdown (Server Action: listPaymentTermsTemplates)
   - Skonto-Toggle (off wenn skonto_percent IS NULL)
   - Split-Plan-Section (collapsed wenn milestones.length === 0)
4. User aktiviert Split-Plan:
   - Add Milestone (Inline-State, noch nicht persisted)
   - Add Milestone 2
   - Live-Summen-Indikator: "75% — fehlt 25%"
   - User correctd: Milestone 1 percent=50, Milestone 2 percent=50
   - Live-Indikator: "100% — gueltig" (gruen)
5. User aktiviert Skonto-Toggle:
   - 2 Felder erscheinen: percent=2, days=7
6. User klickt "Speichern":
   - Server Action: saveProposalPaymentMilestones(proposalId, milestones[])
     - Validation: SUM(percent) === 100.00 (strict, DEC-115)
     - DELETE existing + INSERT new in Transaction
     - Audit-Log Eintrag pro Milestone
   - Server Action: updateProposalSkonto(proposalId, percent, days)
     - UPDATE proposals SET skonto_percent=2, skonto_days=7
     - Audit-Log Eintrag
7. User klickt "PDF generieren":
   - generateProposalPdf(proposalId) ruft renderProposalPdf(proposal+items+milestones+skonto+branding)
   - Conditional-Block "Konditionen / Teilzahlungen" rendert (DEC-120)
   - PDF wird in proposal-pdfs-Bucket geschrieben (V5.5-Pfad-Schema, DEC-111)
   - User sieht PDF in iframe-Preview mit Konditionen-Block
```

### V5.6 Request Flow — Beispiel "Pre-Call Briefing Cron-Lauf"

```
0. Coolify-Cron triggert /api/cron/meeting-briefing alle 5 Min mit CRON_SECRET-Header
1. Cron-Endpoint:
   - verifyCronSecret(request) -> 401 wenn falsch
   - createServiceRoleClient()
2. SELECT user_settings (Single-User, Single-Row): briefing_trigger_minutes, briefing_push_enabled, briefing_email_enabled
   - Wenn beide Toggles false: return {ok: true, skippedReason: 'all-channels-disabled'}
3. SELECT meetings JOIN deals WHERE
   meetings.briefing_generated_at IS NULL
   AND meetings.deal_id IS NOT NULL
   AND meetings.start_time BETWEEN now() AND now() + (briefing_trigger_minutes + 5) * INTERVAL '1 minute'
   ORDER BY meetings.start_time
4. Fuer jedes candidate-meeting:
   a. UPDATE meetings SET briefing_generated_at = now() WHERE id = $1 AND briefing_generated_at IS NULL RETURNING id
      - Wenn 0 rows: skip (concurrent run won, oder Marker bereits gesetzt)
      - Wenn 1 row: continue
   b. SELECT deal_context (deal + contacts + activities + proposals) -> DealBriefingContext
   c. Bedrock-Call: queryLLM(buildDealBriefingPrompt(context), DEAL_BRIEFING_SYSTEM_PROMPT)
   d. validateDealBriefing(json) -> on-fail: UPDATE meetings SET briefing_generated_at=NULL (re-arm fuer naechsten Lauf), audit-log briefing-fail, continue
   e. INSERT activities (deal_id, type='briefing', title=..., description=JSON.stringify(briefing), source_type='meeting', source_id=meeting.id, ai_generated=true, created_by=NULL)
   f. Wenn briefing_push_enabled: send Push via Service Worker (FEAT-409 Pattern)
   g. Wenn briefing_email_enabled: send Mail via send.ts (kompakte HTML-Variante mit Briefing-Summary)
   h. audit-log: action='create', entity_type='activity', context='Auto-briefing for meeting {id}'
5. Return {ok: true, processedCount, skippedCount, failedCount}
```

### V5.6 External Dependencies

- **KEINE neuen npm-Packages.** pdfmake bleibt (DEC-105). bedrock-client bleibt (DEC-007). web-push fuer Service Worker bleibt (FEAT-409).
- **KEINE neuen Coolify-Container.** Cron `meeting-briefing` ist analog `expire-proposals`-Pattern: `node -e "fetch(...)"` Container `app` mit `CRON_SECRET` Header.
- **Bedrock Claude Sonnet** (Frankfurt EU, DEC-007) — Reuse fuer Briefing-Calls. Cost-Estimate: 5 Meetings/Tag * ~5k input + 1k output Tokens * Sonnet-Preis = ~$0.25/Tag (PRD V5.6 Risks).
- **Service Worker Push (FEAT-409)** — bestehender Pfad. `user_settings.push_subscription` ist die Anker-Spalte (V4.1).
- **SMTP (V5.3 send.ts)** — bestehender Pfad. Briefing-E-Mail nutzt eine kompakte HTML-Variante (NEU: `cockpit/src/lib/email/templates/briefing-html.ts`), KEINE Branding-Render-Engine-Aenderung (PRD V5.6 Out-of-Scope).

### V5.6 Security / Privacy

- **RLS:** Alle neuen/erweiterten Tabellen erhalten `authenticated_full_access`-Policy (Single-User-Modus, V7-Multi-User-Erweiterung folgt). `payment_terms_templates` analog `compliance_templates` (V5.2). `proposal_payment_milestones` analog `proposal_items`.
- **Audit-Trail:** Alle Operations schreiben in `audit_log`:
  - Template-CRUD: action='create'/'update'/'delete', entity_type='payment_terms_template'
  - Milestone-Save: action='update', entity_type='proposal', context='Milestones updated'
  - Skonto-Update: action='update', entity_type='proposal', context='Skonto updated'
  - Cron-Briefing: action='create', entity_type='activity', actor_id=NULL (System), context='Auto-briefing for meeting {id} generated at T-{minutes}min'
- **Datenresidenz** (`data-residency.md`): Bedrock-Calls weiterhin Frankfurt (DEC-007). Briefing-Output enthaelt Deal-Daten + KI-Analyse — bleibt in EU-Region. Push-Notification enthaelt Briefing-Summary (KI-generierter Text) — verlaesst die Infra ueber Web-Push-Endpoint (Browser-spezifisch, nicht-zentralisiert). E-Mail enthaelt Briefing-HTML — geht ueber den eigenen SMTP-Server (V5.3 send.ts), nicht extern.
- **Internal-Test-Mode** (DEC-113 V5.5): Watermark-Logik gilt weiterhin fuer V5.6-PDFs. Briefing-E-Mail bekommt KEINEN Test-Mode-Watermark — Empfaenger ist der User selbst (Single-User-Annahme), nicht externer Geschaeftspartner. Bei spaeter Multi-User-Erweiterung re-evaluieren.
- **Bedrock Cost Control** (DEC-052): LLM-Calls sind Cron-getriggert, nicht user-getriggert. Max 1 Call pro Meeting pro Tag (Idempotenz-Marker). Bei Bedrock-503/Timeout: Marker-Reset, max 1 Re-Try im naechsten 5-Min-Tick. Nach 3 fehlgeschlagenen Versuchen (UPDATE briefing_generated_at='ERROR' Sentinel): kein weiterer Versuch, Audit-Log mit Failure-Activity. (Sentinel-Mechanik finalisieren in SLC-564 Implementation.)

### V5.6 Constraints & Tradeoffs

**Constraint 1: Sum-Validation strict 0% (DEC-115).** Pattern wie Lohnabrechnungs-Tools — User uebernimmt Verantwortung. Kein 0.5%-Rundungs-Puffer wie initial empfohlen. Tradeoff: Eingabe-Komfort vs. Daten-Integritaet. Frontend-Mitigation via Live-Summen-Indikator macht Anspruch klar bedienbar.

**Constraint 2: Skonto-UI-Mutex ohne DB-Constraint (DEC-116).** UI verhindert das Setzen von Skonto bei `on_signature 100%` Vorkasse-Trigger. DB-seitig sind beide unabhaengig — User koennte via direkten DB-Access beides setzen. Tradeoff: Implementierungs-Aufwand vs. Edge-Case-Schutz. Single-User-Modus macht das vertretbar; bei V7-Multi-User re-evaluieren.

**Constraint 3: Briefing-Trigger diskret 15/30/45/60 Min (DEC-117).** Nicht beliebiger Integer. Tradeoff: Flexibilitaet vs. Settings-UI-Komplexitaet. Diskrete Optionen schuetzen vor User-Edge-Cases (0, 9999) und vereinfachen Cron-Fenster-Berechnung.

**Constraint 4: Cron-Idempotenz nach UPDATE-WHERE-NULL-Pattern (DEC-118).** Pattern aus V5.5 expire-proposals + V5.5 transitionProposalStatus uebernommen. Bei Bedrock-Fehler: Marker-Reset = Re-Try beim naechsten 5-Min-Tick. Bei dauerhaftem Fehler: nach N Retries Sentinel-Wert + Failure-Activity. Sentinel-Mechanik finalisieren in SLC-564 Implementation. Tradeoff: Implementierungs-Komplexitaet vs. dauerhaftes Retry-Loop.

**Constraint 5: PDF-Renderer-Erweiterung mit V5.5-Fallback bit-identisch (DEC-120).** Snapshot-Test in SLC-563 muss bewiesen, dass Proposals ohne Milestones+Skonto bit-identisch zum V5.5-PDF rendern. Tradeoff: Implementierungs-Sorgfalt vs. spaeterer Drift bei Versionserstellung. Snapshot-Diff ist Regression-Schutz.

**Constraint 6: Briefing-E-Mail kompakte HTML-Variante (PRD V5.6 Out-of-Scope).** Branding-Render-Engine (V5.3) wird NICHT angefasst. Briefing-Mail-Template ist eigenes File `cockpit/src/lib/email/templates/briefing-html.ts` — minimale HTML-Struktur ohne Branding-Logo/Farben. Tradeoff: Briefing-Mail sieht nicht "wie Marken-Mail" aus, dafuer keine Render-Engine-Komplexitaet. Single-User: User schickt sich Briefing selbst, Branding-Konsistenz weniger relevant.

### V5.6 Technische Risiken

**Risk: Bedrock-Latency macht Cron-Tick-Window knapp.**
- Bedrock-Call dauert 3-15s pro Briefing. Bei 5 Meetings im Fenster und 5-Min-Tick-Toleranz: max ~150s pro Lauf — innerhalb Tick-Budget.
- Mitigation: Sequenzieller Loop (kein Promise.all auf Bedrock-Calls) — Rate-Limit-freundlich. Bei mehr als 5 Meetings im Fenster: Warning im Audit-Log, naechster Tick holt Rest auf.

**Risk: Briefing-Activity-Description groesser als bisherige Activities.**
- Briefing-JSON ist ~2-5 KB Stringified. Bestehende `activities.description` ist `TEXT` — kein Limit.
- Mitigation: TEXT-Spalte ist Postgres-TOAST-faehig, kein Performance-Problem.

**Risk: Push-Notification-Payload-Limit.**
- Web-Push erlaubt ~4 KB Payload. Briefing-Summary muss komprimiert werden.
- Mitigation: Push-Payload enthaelt nur `{title, body: summary[0..200], deal_id, meeting_id}` + Click-Through-Link zum Workspace. Vollstaendige Briefing-Daten in Activity, Push ist nur Notification.

**Risk: Sum-Validation-Edge-Case bei 33+33+33 (=99) als User-Versehen.**
- DEC-115 Strict-Strategie blockt das. Frontend-Hinweis "fehlt 1%" zwingt User zur Korrektur.
- Mitigation: Live-Summen-Indikator + Disabled-Save-Button. Pattern wie SLC-552 Brutto/Netto-Live-Berechnung.

**Risk: Skonto-Mutex-Bypass bei Editor-Reload.**
- User aktiviert erst Skonto, dann Vorkasse-Milestone. UI-Mutex sollte Skonto auto-disablen — was passiert mit bereits gesetztem `skonto_percent`?
- Mitigation: Editor-Reaktion auf Milestone-Change clearts Skonto-Toggle UND ruft `updateProposalSkonto(id, NULL, NULL)`. Ist State-Management-Sache in SLC-562 + SLC-563.

**Risk: payment_terms_templates Default-Toggle-Race.**
- User klickt schnell "Default" auf Template A und gleichzeitig auf Template B. UNIQUE-Index `WHERE is_default=true` schuetzt — der zweite UPDATE schlaegt mit Constraint-Violation fehl.
- Mitigation: `setDefaultPaymentTermsTemplate(id)` Server Action macht das Update in Transaction: erst `UPDATE payment_terms_templates SET is_default=false WHERE is_default=true`, dann `UPDATE payment_terms_templates SET is_default=true WHERE id=$1`. Race-Condition zwischen zwei parallelen Calls produziert sauberen Fehler "Default bereits gesetzt".

**Risk: Briefing-Cron triggert fuer Meeting OHNE deal_id.**
- PRD V5.6 schliesst aus: Meetings ohne Deal-Zuordnung werden nicht briefed.
- Mitigation: Partial-Index `WHERE briefing_generated_at IS NULL AND deal_id IS NOT NULL` filtert beim DB-Lookup. Cron-Query hat zusaetzliches `AND deal_id IS NOT NULL`. Defense-in-Depth.

**Risk: V5.5-PDF-Snapshot-Drift durch DEC-120.**
- DEC-120 Conditional-Block-Logik koennte bei "Proposal ohne Milestones+Skonto" doch minimal andere Bytes produzieren (z.B. zusaetzliche Whitespace-Zeile in DocDef).
- Mitigation: SLC-563 erweitert die V5.5-Snapshot-Tests aus SLC-553 um den expliziten "ohne Konditionen-Block"-Fall. Snapshot-Diff zu V5.5 = 0 Bytes Pflicht.

**Risk: Bedrock-Cost-Drift bei Single-User mit vielen Meetings.**
- 5 Meetings/Tag = $0.25/Tag akzeptabel. Bei 20 Meetings/Tag = $1.00/Tag — auch akzeptabel.
- Mitigation: Audit-Log zaehlt Briefing-Calls. Bei Anomalie (>$3/Tag): manuelle Pruefung. Spaeter ggf. Briefing-Trigger nur fuer aktive Pipeline-Stages (V7+).

### V5.6 Dependencies (package.json delta)

KEIN delta. Alle V5.6-Funktionalitaet nutzt bestehende Dependencies.

### V5.6 Empfohlene Slice-Reihenfolge (DEC-121)

| Slice | Feature | Scope | Schaetzung | QA-Fokus |
|---|---|---|---|---|
| SLC-561 | FEAT-561 (Sub-Theme A) | MIG-027 Teil 1 + 2 + `/settings/payment-terms` Page + CRUD + Default-Toggle | 3-4h | Migration idempotent, V5.5-Proposals unveraendert lesbar, UNIQUE-Constraint default-Race greift, Settings-Page CRUD-Pfade korrekt |
| SLC-562 | FEAT-561 (Sub-Themes A + C UI) | Bedingungs-Dropdown im Editor + Skonto-Toggle + Skonto-Felder + UI-Mutex zu Vorkasse | 3-4h | Dropdown-Auswahl fuellt Freitext, Skonto-Toggle setzt skonto_*, UI-Mutex disablt Skonto bei on_signature 100%, Save persistiert sauber |
| SLC-563 | FEAT-561 (Sub-Theme B + PDF) | Split-Plan-Section + Live-Sum-Indikator + saveProposalPaymentMilestones strict 100% + pdfmake-Conditional-Block | 5-7h | Sum-Validation strict 100% greift app-side, PDF-Snapshot ohne Milestones bit-identisch zu V5.5, PDF mit Milestones rendert Konditionen-Block sauber, Audit-Eintraege da |
| SLC-564 | FEAT-562 | `/api/cron/meeting-briefing` + buildDealBriefingPrompt-Reuse + Activity-Insert + Push + Email + `/settings/briefing` Page | 4-6h | Cron-Idempotenz greift (UPDATE WHERE NULL), Bedrock-Call sauber, Activity-Insert mit V3-source_type-Pattern, Push-Delivery in Browser, Mail-Delivery via SMTP, Settings-Page persistiert in user_settings, Meetings ohne Deal werden ignoriert |

Gesamt: ~15-21h. Reihenfolge zwingend (561 -> 562 -> 563 -> 564). Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-022 nach SLC-564.

### V5.6 Open Points (fuer /slice-planning)

- **Cron-Setup-Anleitung in REL-022-Notes:** Coolify-Cron `meeting-briefing` muss vom User analog zu `expire-proposals` (V5.5 REL-020) angelegt werden. Anleitung mit Cron-Expression `*/5 * * * *` (alle 5 Min) und CRON_SECRET-Header.
- **Briefing-Sentinel bei dauerhaftem Fehler (DEC-118-Erweiterung):** Wie viele Re-Tries bevor `briefing_generated_at='ERROR'` als Sentinel gesetzt wird? Empfehlung: 3 Re-Tries mit exponential-Backoff (5min, 10min, 20min). Final in SLC-564 SLC-Planning.
- **Briefing-E-Mail-Template-Inhalt:** Welche Sections in der kompakten HTML? Empfehlung: Title (Meeting-Name + Zeit), Summary (Briefing-Summary 2-3 Saetze), Top-3-keyFacts, Top-3-suggestedNextSteps, Click-Through-Link zum Deal-Workspace. Final in SLC-564 SLC-Planning.
- **Push-Payload-Inhalt:** Welche Felder in der ~4-KB-Push-Payload? Empfehlung: `{title: "Briefing fuer {meeting.title}", body: summary[0..150], data: {deal_id, meeting_id, briefing_activity_id}}`. Final in SLC-564 SLC-Planning.
- **`/settings/branding` und `/settings/payment-terms` als gemeinsame Settings-Sub-Navigation?** Empfehlung: ja, beide unter Settings-Layout-Wrapper mit Sidebar-Nav. SLC-561 ergaenzt die Nav-Struktur entsprechend (kleiner Layout-Touch). Final in SLC-561 SLC-Planning.
- **Wenn beide Briefing-Toggles (Push + E-Mail) off sind, soll der Cron das Meeting trotzdem als Activity persistieren?** Empfehlung: NEIN — wenn beide Channels off, Cron skippt komplett (kein Bedrock-Call, kein Activity-Insert). User-Mental-Model: "Briefing-Feature komplett deaktivieren". Wenn nur ein Channel off, Briefing wird trotzdem generiert + persistiert + nur ueber den aktiven Channel deliverd. Final in SLC-564 SLC-Planning.

### V5.6 Recommended Next Step

`/slice-planning V5.6` — die 4 Slices SLC-561..564 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Danach pro Slice `/backend|/frontend` -> `/qa` -> Coolify-Redeploy in fester Reihenfolge.
