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

## V5.7 — NL-Compliance + Polish Architecture

### V5.7 Summary

V5.7 erweitert den V5.5/V5.6-Angebot-Pfad um NL-konforme Steuerlogik. Strategaize Transition GmbH sitzt in den Niederlanden — die heute generierten PDFs sind mit deutschen 19%-Saetzen rechtlich nicht produktionstauglich. V5.7 hebt den Editor + PDF-Renderer auf NL-VAT (21/9/0) und ergaenzt den B2B-EU-Cross-Border-Pfad mit Reverse-Charge ("BTW verlegd"). Plus Skonto-Toggle UI-State-Drift Bugfix aus V5.6 SLC-562.

KEINE neuen Container, KEINE neuen Cron-Jobs, KEINE neuen npm-Dependencies. Alle Aenderungen sind additiv im bestehenden V5.5-Stack.

### V5.7 Main Components — kein Architektur-Sprung

```
Existing V5.5/V5.6 Angebot-Pipeline (unveraendert)
  │
  ├─ /settings/branding (V5.3 FEAT-531) ────┐
  │                                          │
  ├─ /companies/[id] Stammdaten ─────────────┤
  │                                          │
  ├─ /proposals/[id]/edit (V5.5 FEAT-552) ───┤
  │                                          │
  └─ /api/proposals/[id]/pdf (V5.5 FEAT-553) │
                                              │
                                     V5.7 erweitert:
                                              │
                                     • +vat_id Strategaize (branding_settings)
                                     • +vat_id Empfaenger (companies)
                                     • Steuersatz-Dropdown 21/9/0 (Editor)
                                     • Reverse-Charge-Toggle (Editor, gated)
                                     • Reverse-Charge-Block im PDF (Renderer)
                                     • +Format-Validation NL/EU VAT-IDs
                                     • Skonto-Toggle Optimistic-Revert (Editor)
```

### V5.7 Component-Detail — FEAT-571 NL-VAT + Reverse-Charge

#### 1. DB-Schema (MIG-028, DEC-122/123/124)

```
proposals:
  + tax_rate DEFAULT 21.00 (war 19.00)
  + CHECK tax_rate IN (0.00, 9.00, 19.00, 21.00)
  + reverse_charge BOOLEAN NOT NULL DEFAULT false
  + CHECK (reverse_charge = false OR tax_rate = 0.00)

branding_settings:
  + vat_id TEXT NULL                   -- z.B. "NL859123456B01"

companies:
  + vat_id TEXT NULL                   -- z.B. "DE123456789", "AT12345678"
```

19% bleibt fuer Legacy-V5.5/V5.6-Rows in der Whitelist (DEC-122). UI-Dropdown bietet nur 21/9/0. Snapshot-Prinzip aus DEC-107 wird nicht gebrochen.

#### 2. Validation-Layer (DEC-124, neu)

`cockpit/src/lib/validation/vat-id.ts` (neu):
- `EU_COUNTRY_CODES`-Constant mit 27 Mitgliedstaaten 2026 (AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE)
- `validateNlVatId(input): { ok: true } | { ok: false, reason: string }` — Pattern `^NL\d{9}B\d{2}$`
- `validateEuVatId(input): { ok: true, country: string } | { ok: false, reason: string }` — Pattern `^[A-Z]{2}[A-Z0-9]{2,12}$` plus Country-Code-Whitelist-Pruefung

Format-only — KEIN VIES-Online-Lookup (DEC-124). VIES-Lookup ist als BL-420 fuer spaeter angelegt.

#### 3. Settings-Page Erweiterung (DEC-124)

`/settings/branding` (V5.3 FEAT-531) bekommt einen neuen Eingabe-Block nach dem Footer-Markdown:

```
[BTW-Nummer Strategaize]
[NL859123456B01            ]
NL-Format: NL gefolgt von 9 Ziffern, B, 2 Ziffern.
Wird auf der Rechnung gedruckt und qualifiziert das Reverse-Charge-Verfahren.
```

Inline-Format-Error wenn ungueltig. Server Action `saveBranding` speichert in `branding_settings.vat_id`.

#### 4. Company-Stammdaten Erweiterung

Company-Edit-Form (bestehend) bekommt nach `address_country` ein neues Feld:

```
[USt-IdNr / BTW-Nr.]
[DE123456789              ]
EU-Format: 2 Buchstaben Country-Code + 2-12 Zeichen.
Pflicht fuer Reverse-Charge-Verfahren bei EU-Cross-Border.
```

#### 5. Editor-Erweiterung (DEC-122/123)

`cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` bekommt im Bereich der Summary-Section:

```
Steuersatz:  [21% (Standard NL) ▼]
              [21% (Standard NL)]
              [9% (reduziert NL)]
              [0% (steuerfrei / Reverse-Charge)]

Reverse-Charge: [ Aus ●]   (gated)
                Voraussetzungen:
                ✓ BTW-Nummer Strategaize (Settings)
                ✗ BTW-Nummer Empfaenger (Company-Stammdaten)
                ✓ Empfaenger sitzt in EU (nicht NL)
```

Toggle-Aktivierung nur wenn alle 3 Voraussetzungen erfuellt. UI-Hinweis "Reverse-Charge nicht moeglich — Voraussetzung X fehlt" wenn eine Bedingung nicht erfuellt. Bei Toggle-ON wird `tax_rate` auf 0% gelockt + Server-Action validiert beide Felder kombiniert.

#### 6. PDF-Renderer-Erweiterung (DEC-125)

`cockpit/src/lib/pdf/proposal-renderer.ts` Adapter-Erweiterung. Neuer Block direkt unter dem Tax-Row im Summary-Block (Zeile 308 heute):

```
Subtotal Netto                    1.000,00 EUR
Steuer (0%)                            0,00 EUR
─────────────────────────────────────────────
Total Brutto                      1.000,00 EUR

BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC
BTW-Nr. NL859123456B01 — BTW-Nr. DE123456789
```

Wenn `reverse_charge=false`: kein Block, PDF rendert wie heute. Wenn `reverse_charge=true`: Block + beide BTW-Nummern. Phrase ist hardcoded in `cockpit/src/lib/pdf/reverse-charge-block.ts` (DEC-125), kein Branding-Field.

Optional Footer-Erweiterung: bei aktiver `branding_settings.vat_id` wird die Strategaize-BTW-Nr. immer im Footer ergaenzt (auch bei DE-Standard-Rechnung). Konvention NL-Pflicht: Sender muss seine Steuernummer auf jeder Rechnung zeigen.

#### 7. Server-Action-Validation

`saveProposal` Server-Action bekommt:
- Validation: wenn `reverse_charge=true` → `tax_rate` MUSS 0 sein UND `companies.vat_id` MUSS NOT NULL UND `branding_settings.vat_id` MUSS NOT NULL UND `companies.address_country` MUSS in EU_COUNTRY_CODES UND != 'NL'
- Bei Validation-Fehler: rejected mit aussagekraeftiger Fehlermeldung (analog skonto-validation Pattern aus V5.6)
- DB-CHECK-Constraint ist Defense-in-Depth — Server-Action enforced fruehzeitig

### V5.7 Component-Detail — FEAT-572 Skonto-Toggle Bugfix (DEC-126)

`cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` — Pattern-Aenderung:

- Neuer `useRef<{ skonto_percent: number | null; skonto_days: number | null }>`, initialisiert mit DB-State aus `initialProposal`
- Bei jedem erfolgreichen Save wird ref auf neuen DB-State aktualisiert
- Bei Save-Error setzt der `debouncedPersist`-Callback den `proposal`-State (skonto_percent + skonto_days) auf den ref-Wert zurueck
- Toggle bleibt im konsistenten State, weil Source-of-Truth wieder das letzte gespeicherte DB-Bild ist

Vitest-Test in `proposal-editor.test.tsx`: simuliere 5x Save-Error in Folge mit ungueltigem Prozent-Wert (z.B. 10), pruefe dass Toggle weiterhin korrekt rendert. Browser-Smoke gegen RPT-277-Repro.

### V5.7 Data Flow — Reverse-Charge-Pfad

```
1. User oeffnet /settings/branding → traegt Strategaize-BTW ein → save (NL-Format-Validation)
2. User oeffnet Company-Stammdaten → traegt Empfaenger-BTW ein → save (EU-Format-Validation)
3. User oeffnet /proposals/{id}/edit
4. Editor checkt Voraussetzungen:
   - branding.vat_id IS NOT NULL?
   - company.vat_id IS NOT NULL?
   - company.address_country IN EU_COUNTRY_CODES AND != 'NL'?
5. Wenn alle 3 erfuellt → Reverse-Charge-Toggle enabled
6. User aktiviert Toggle → UI lockt tax_rate auf 0% → debouncedPersist → saveProposal
7. Server-Action validiert: reverse_charge=true → tax_rate MUSS 0 + 3 Voraussetzungen
8. DB-CHECK greift als Defense-in-Depth
9. /api/proposals/{id}/pdf → renderProposalPdf → bilingual NL/EN-Block + beide BTW-Nummern
10. PDF-Vorschau zeigt Block korrekt
11. PDF-Send via Composing-Studio (V5.5 FEAT-555) — unveraendert, Block ist im PDF
```

### V5.7 External Dependencies

KEIN delta. Alle V5.7-Funktionalitaet nutzt bestehende Dependencies (pdfmake, Next.js, Supabase). Validation-Regex ist in stdlib.

### V5.7 Security / Privacy Considerations

- **VAT-IDs sind keine sensiblen Daten** — sie stehen pflichtgemaess auf jeder Rechnung. Klartext-Speicherung in DB ist OK.
- **Format-Validation reicht fuer V5.7** (DEC-124) — VIES-Lookup waere ein externer Call mit potentieller Verfuegbarkeits-Abhaengigkeit. Internal-Test-Mode toleriert manuelle Pflege.
- **Reverse-Charge-Status persistiert in `proposals.reverse_charge`** — Audit-Log-Eintrag bei Toggle-Aenderung empfohlen (analog skonto-Audit V5.6). Zu pruefen in `/slice-planning`: ob V5.7 ein Audit-Field `reverse_charge_changed_at` braucht oder ob Standard-`updated_at` reicht.
- **Internal-Test-Mode bleibt aktiv** — keine Aenderung am COMPLIANCE-Gate-Status.
- **DSGVO-Sicht:** VAT-IDs sind oeffentlich (BTW-Nummer kann ueber VIES-Validator fuer alle EU-Mitgliedstaaten geprueft werden) — keine besondere Schutzbeduerftigkeit.

### V5.7 Constraints und Tradeoffs

- **Whitelist {0,9,19,21} statt strict {0,9,21}:** Kompromiss fuer Snapshot-Prinzip. Nachteil: Editor-UI muss filtern (nur 3 Optionen statt 4). Vorteil: keine Daten-Migration noetig, kein Cent-Drift.
- **Reverse-Charge nur fuer EU-Empfaenger:** Drittland-Pfad (UK/CH/US) bleibt out-of-scope. Fuer V5.7 (Internal-Test, primaer DE/AT-Kunden) ausreichend. BL-XXX wenn erster Drittland-Kunde kommt.
- **Format-only-VAT-Validation:** Akzeptiert erfundene Nummern. Mitigationsfaktor: Internal-Test-Mode + nicht-relevant fuer Final-Compliance-Gate. VIES-Lookup BL-420.
- **PDF-Sprache deutsch + Reverse-Charge bilingue NL/EN:** Konvention. Vollstaendige Multi-Language-PDFs (NL/EN-Komplett-Variante) bleiben out-of-scope.
- **ICP-Meldung manuell:** Quartalsweise Reporting-Pflicht des Unternehmers, nicht automatisierbar in V5.7-Scope.

### V5.7 Open Technical Questions (fuer /slice-planning)

1. **Position der vat_id-Anzeige im PDF-Footer:** zusammen mit Adress-Block oder separater Footer-Zeile? Empfehlung: in der Adress-Zeile direkt unter "Strategaize Transition GmbH". Final in SLC-571 Slice-Planning.
2. **Audit-Eintrag bei Reverse-Charge-Toggle?** Empfehlung: ja, `audit_log`-Eintrag mit `entity_type='proposal'`, `action='reverse_charge_toggled'`, `meta={"to": true|false}`. Final in SLC-571 Slice-Planning.
3. **Editor-UI Position des Steuersatz-Dropdown:** unter Position-Items oder im Summary-Bereich? Empfehlung: im Summary-Bereich neben dem Tax-Row, da steuerlogisch nahe. Final in SLC-571 Slice-Planning.
4. **Reverse-Charge-Toggle-Voraussetzungen-UX:** wie wird der disabled-State kommuniziert? Empfehlung: Toggle disabled + Tooltip mit Liste der fehlenden Voraussetzungen + Quick-Links zu den Settings/Stammdaten-Pages. Final in SLC-571 Slice-Planning.
5. **PaymentTermsDropdown / SplitPlanSection mit gleichem Pattern:** ist der Race-Bug auch dort? Empfehlung: in SLC-572 Investigation pruefen, falls ja: Pattern wiederverwenden, falls nein: out-of-scope. Final in SLC-572 Slice-Planning.

### V5.7 Empfohlene Slice-Reihenfolge (DEC-127)

| Slice | Feature | Scope | Schaetzung | QA-Fokus |
|---|---|---|---|---|
| SLC-571 | FEAT-571 | MIG-028 + Validation-Layer + Settings-vat_id + Company-vat_id + Editor-Steuersatz-Dropdown + Reverse-Charge-Toggle + Voraussetzungs-Logik + Server-Action-Validation + PDF-Renderer-Block | 5-7h | MIG-028 idempotent, Whitelist-CHECK greift, Reverse-Charge-Toggle gated korrekt, Server-Action-Validation sauber, PDF-Block bilingual rendert, alte 19%-Angebote regression-frei rendern, neue 21%-Angebote als Default |
| SLC-572 | FEAT-572 | Investigation Skonto-Race + Optimistic-Revert via useRef + Vitest fuer Save-Error-Pfad + Browser-Smoke gegen RPT-277-Repro + ggf. Pattern-Erweiterung auf PaymentTermsDropdown/SplitPlanSection | 30min-1h | Toggle bleibt nach 5x Save-Error in Folge konsistent, Vitest PASS, Browser-Smoke PASS, regression-frei fuer PaymentTermsDropdown/SplitPlanSection |

Gesamt: ~5.5-8h. Reihenfolge: 571 zuerst (groesserer Pfad, eigener QA-Cycle), 572 als Polish. Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-023 nach SLC-572.

### V5.7 Recommended Next Step

`/slice-planning V5.7` — die 2 Slices SLC-571 + SLC-572 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Insbesondere: Voraussetzungs-Logik fuer Reverse-Charge-Toggle als testbare Helper-Funktion ausdefinieren, PDF-Snapshot-Tests erweitern (mit/ohne Reverse-Charge-Block), Skonto-Bugfix-Investigation als ersten Micro-Task in SLC-572.

## V6.2 — Workflow-Automation + Kampagnen-Attribution Architecture

### V6.2 Summary

V6.2 fuegt zwei thematisch unabhaengige aber low-cost-zusammenpassende Bloecke ins bestehende V5.7-System ein: einen deterministischen Wenn-Dann-Workflow-Builder (FEAT-621) und ein strukturiertes Kampagnen-Attribution-Modell (FEAT-622). Beide Bloecke folgen der V6.2-Leitlinie: keine neuen Container, keine neuen npm-Packages, kein neuer LLM-Pfad, alle Patterns wiederverwendet (Cron, Audit, Server Actions, Export-API-Auth, pgvector ist nicht beruehrt).

Die Hot-Path-Latenz fuer Workflows wird ueber ein Hybrid-Pattern erreicht: synchrone Trigger-Dispatch nach erfolgreichem Server-Action-Commit + asynchrone Action-Execution via fire-and-forget Promise + 1-Min-Cron als Defense-in-Depth-Fallback. Das ergibt < 30s Standard-Latenz ohne Worker-Container.

KEINE neuen Container, KEINE neuen Cron-Jobs ueber den fixen `automation-runner`-Cron hinaus, KEINE neuen npm-Dependencies (Token-Generierung via Node-stdlib `crypto.randomBytes`).

### V6.2 Main Components

```
                 ┌───────────────────────────────────────────────┐
                 │           App-Layer (Next.js)                  │
                 │                                                │
  Server Actions ─┤  deals/actions.ts (updateDealStage, create..)│
   (alle Mutate)  │  activities/actions.ts (createActivity)       │
                 │     │                                          │
                 │     │ nach DB-Commit:                          │
                 │     ▼                                          │
                 │  dispatchAutomationTrigger(event, entity)      │
                 │     │                                          │
                 │     ├─ matchActiveRules(event, entity) [SQL]   │
                 │     │                                          │
                 │     ├─ INSERT automation_runs (status=pending) │
                 │     │  UNIQUE(rule_id, trigger_event_audit_id) │
                 │     │  → Anti-Loop-Marker via ON CONFLICT      │
                 │     │                                          │
                 │     └─ Promise.race([executeAutomationRun(id), │
                 │           setTimeout(50ms)])  // fire&forget   │
                 │                                                │
                 │  /api/cron/automation-runner/route.ts          │
                 │     pickup pending runs (>60s old)             │
                 │     → executeAutomationRun(id)                 │
                 │                                                │
                 │  /settings/automation                          │
                 │     CRUD Builder UI + Trockenlauf              │
                 │                                                │
                 │  /settings/campaigns + /campaigns/[id]         │
                 │  /r/[token] (Public Redirect)                  │
                 │  /api/campaigns/[id]/performance (Read-API)    │
                 └───────────────────────────────────────────────┘
                              │
                              ▼
                 ┌───────────────────────────────────────────────┐
                 │           Postgres (Supabase, Coolify)         │
                 │                                                │
  Workflow-Engine │  automation_rules (definitions)               │
                 │  automation_runs (history + idempotency)       │
                 │  audit_log (existing — Action-Side-Effects)    │
                 │                                                │
  Attribution    │  campaigns (Master)                            │
                 │  campaign_links (Tracking-URLs)                │
                 │  campaign_link_clicks (Click-Log, IP-Hash)     │
                 │  contacts.campaign_id (additive FK)            │
                 │  companies.campaign_id (additive FK)           │
                 │  deals.campaign_id (additive FK)               │
                 └───────────────────────────────────────────────┘
```

### V6.2 Component-Detail — FEAT-621 Workflow-Automation

#### 1. DB-Schema (MIG-029 Teil 1, DEC-129..134)

```
automation_rules:
  id UUID PRIMARY KEY
  name TEXT NOT NULL
  description TEXT NULL
  status TEXT NOT NULL CHECK (status IN ('active','paused','disabled')) DEFAULT 'paused'
  trigger_event TEXT NOT NULL CHECK (trigger_event IN
    ('deal.stage_changed','deal.created','activity.created'))
  trigger_config JSONB NOT NULL DEFAULT '{}'  -- z.B. {"stage_id":"...","activity_types":["call","email"]}
  conditions JSONB NOT NULL DEFAULT '[]'      -- Array of {field, op, value} AND-only
  actions JSONB NOT NULL DEFAULT '[]'         -- ordered Array of {type, params, assignee?}
  references_stage_ids UUID[] DEFAULT '{}'   -- denormalisiert fuer Stage-Loesch-Lookup (DEC-133)
  paused_reason TEXT NULL                    -- z.B. "Stage geloescht" (DEC-133)
  created_by UUID NOT NULL
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
  last_run_at TIMESTAMPTZ NULL
  last_run_status TEXT NULL                  -- success|partial_failed|failed (Cache fuer UI)

automation_runs:
  id UUID PRIMARY KEY
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE
  trigger_event TEXT NOT NULL                -- redundant zu rule, aber stable bei Rule-Update
  trigger_entity_type TEXT NOT NULL          -- 'deal'|'activity'
  trigger_entity_id UUID NOT NULL
  trigger_event_audit_id UUID NULL           -- audit_log.id der den Trigger ausgeloest hat (Anti-Loop)
  conditions_match BOOLEAN NULL              -- NULL bis evaluation
  status TEXT NOT NULL CHECK (status IN
    ('pending','running','success','partial_failed','failed','skipped')) DEFAULT 'pending'
  started_at TIMESTAMPTZ DEFAULT now()
  finished_at TIMESTAMPTZ NULL
  action_results JSONB NOT NULL DEFAULT '[]' -- [{action_index, type, outcome, error_message?, audit_log_id?}]
  error_message TEXT NULL                    -- top-level error
  created_at TIMESTAMPTZ DEFAULT now()

  UNIQUE (rule_id, trigger_entity_id, trigger_event_audit_id)
                  -- Anti-Loop-Marker: identischer Trigger triggert nicht erneut

CREATE INDEX idx_automation_runs_pending ON automation_runs(started_at)
  WHERE status='pending' OR status='running';
CREATE INDEX idx_automation_runs_rule ON automation_runs(rule_id, started_at DESC);
CREATE INDEX idx_automation_rules_active ON automation_rules(trigger_event, status)
  WHERE status='active';
```

`automation_runs` ist Engine-Internal (Workflow-Lifecycle, Idempotency, UI-Statistik). Die GESCHAEFTLICHEN Side-Effects (z.B. `update_field` auf `deals.stage_id`) schreiben **zusaetzlich** ins existierende `audit_log` mit `actor_id=NULL` (V4.1-System-Marker), `entity_type=<entity>`, `action='update'`, `context='Automation rule {rule.name} executed'`. Dadurch bleibt das Business-Audit konsistent ohne Duplikat (DEC-131).

#### 2. Trigger-Dispatcher (DEC-129)

`cockpit/src/lib/automation/dispatcher.ts` (neu):

```typescript
export async function dispatchAutomationTrigger(args: {
  event: 'deal.stage_changed' | 'deal.created' | 'activity.created';
  entityType: 'deal' | 'activity';
  entityId: string;
  triggerEventAuditId?: string;  // optional, fuer Anti-Loop
  changes?: Record<string, unknown>;  // before/after, fuer Conditions
}): Promise<void>;
```

Aufgerufen von ALLEN mutating Server Actions die einen Trigger-Event darstellen:
- `cockpit/src/app/(app)/deals/actions.ts` — `updateDealStage`, `createDeal`
- `cockpit/src/app/(app)/activities/actions.ts` — `createActivity`
- (zukuenftig: weitere Server Actions die Triggers darstellen)

Pattern im Aufrufer:
```typescript
// nach erfolgreichem DB-Commit:
const auditId = await insertAuditLog({...});
await dispatchAutomationTrigger({
  event: 'deal.stage_changed',
  entityType: 'deal',
  entityId: dealId,
  triggerEventAuditId: auditId,
  changes: { stage_id: { before: oldStageId, after: newStageId } }
});
```

`dispatchAutomationTrigger` macht:
1. SELECT alle aktiven Regeln mit passendem `trigger_event` (Index `idx_automation_rules_active`)
2. App-side Condition-Match (kompakte JS-Engine, ~50 Zeilen — keine Library)
3. INSERT `automation_runs (status='pending')` mit `ON CONFLICT (rule_id, trigger_entity_id, trigger_event_audit_id) DO NOTHING` → Anti-Loop
4. Fire-and-forget `void executeAutomationRun(runId).catch(logErr)` — Server-Action returnt sofort, nicht-blockierend
5. Cron-Fallback uebernimmt im Worst-Case bei App-Crash

**Latenz-Argument:** Trigger inserted innerhalb der Server-Action-Transaction → executeAutomationRun startet sofort nach Tx-Commit → Actions laufen typisch < 5s ueber DB+Mail. 30s-AC mit Sicherheitsmarge erfuellt.

#### 3. Action-Executor (DEC-129/130/134)

`cockpit/src/lib/automation/executor.ts` (neu):

```typescript
export async function executeAutomationRun(runId: string): Promise<void>;
```

Fuehrt aus:
1. UPDATE run SET status='running' (idempotent via WHERE status='pending')
2. Lade rule + entity via SELECT
3. Re-Evaluate conditions (Defense-in-Depth gegen TOCTOU)
4. Fuer jede Action in rule.actions:
   - Whitelist-Check via `cockpit/src/lib/automation/field-whitelist.ts` (DEC-130, Code-Konfig)
   - Action-Type-Switch:
     - `create_task` → `createActivity({type:'task', deal_id, assignee, due_at})` mit Owner-Resolution (DEC-134: deal_owner default, override moeglich)
     - `send_email_template` → existing V5.3 `email_templates`-Render + send via `cockpit/src/lib/email/send.ts`
     - `create_activity` → `createActivity({type, deal_id, title, description})`
     - `update_field` → Server Action wrapper mit Field-Whitelist + Range-Validation
   - Bei Fehler: action_results[i].outcome='failed', weiter zur naechsten Action (best-effort, AC9)
   - Bei Erfolg: audit_log-Eintrag mit `actor_id=NULL`, context=`Automation rule {rule.name} executed`
5. UPDATE run SET status=<resolved>, finished_at=now(), action_results=<json>

**Field-Whitelist (DEC-130)** in Code-Konfig:
```typescript
export const UPDATE_FIELD_WHITELIST: Record<EntityType, FieldSpec[]> = {
  deal: [
    { field: 'stage_id', validate: validateStageId },
    { field: 'value', validate: v => typeof v === 'number' && v >= 0 },
    { field: 'expected_close_date', validate: validateIsoDate },
  ],
  contact: [
    { field: 'tags', validate: validateTagsArray },
  ],
  company: [
    { field: 'tags', validate: validateTagsArray },
  ],
};
```

#### 4. Cron-Fallback (DEC-129)

`cockpit/src/app/api/cron/automation-runner/route.ts` (neu, Pattern aus `expire-proposals/route.ts`):

```typescript
export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // Pickup runs die >60s in pending oder running haengen (App-Crash-Fallback)
  const stuck = await sb.from('automation_runs')
    .select('id')
    .in('status', ['pending', 'running'])
    .lt('started_at', new Date(Date.now() - 60_000).toISOString())
    .limit(50);

  for (const r of stuck) {
    await executeAutomationRun(r.id).catch(logErr);
  }

  return NextResponse.json({success:true, picked:stuck.length});
}
```

**Coolify-Cron-Setup** (REL-024-Notes): Cron-Expression `* * * * *` (jede Minute), CRON_SECRET-Header. Re-uses existing `verify-cron-secret` Helper. Naechste neuer Cron-Eintrag im Coolify-UI nach Deploy von SLC-622.

#### 5. Trockenlauf (Dry-Run, DEC-132)

`cockpit/src/lib/automation/dry-run.ts` (neu):

```typescript
export async function dryRunRule(rule: AutomationRule, daysBack=30): Promise<DryRunResult[]>;
```

Macht **read-only** SQL-Query gegen Source-Tabellen (kein dedizierter Replay-Layer):
- `deal.stage_changed` → SELECT FROM `audit_log` WHERE entity_type='deal' AND action='stage_change' AND created_at > now() - interval '30 days'
- `deal.created` → SELECT FROM `deals` WHERE created_at > now() - interval '30 days'
- `activity.created` → SELECT FROM `activities` WHERE created_at > now() - interval '30 days'

Fuer jeden Treffer: App-Level-Condition-Match → Liste `[{entity_id, entity_label, would_match: bool, matched_actions: string[]}]`.

Result-Limit 100 Eintraege (UI-Anzeige in Builder-Step-4 als "Vorschau letzte 30 Tage"). KEINE DB-Schreibvorgaenge waehrend Dry-Run.

#### 6. Stage-Delete-Handling (DEC-133)

Server Action `deletePipelineStage(stageId)` (existing oder erweitert) checkt vor Delete:
```typescript
const dependentRules = await sb.from('automation_rules')
  .select('id, name')
  .contains('references_stage_ids', [stageId])
  .eq('status', 'active');
```

Wenn dependent rules: Soft-Disable statt Hard-Block. UPDATE rules SET status='paused', paused_reason=`Pipeline-Stage "${stageName}" wurde geloescht`. Toast-Message zeigt Anzahl pausierter Regeln. UI in `/settings/automation` zeigt paused-Regeln mit Warning-Badge + "Pausiert: <Reason>" + Edit-Link.

`references_stage_ids` ist ein denormalisierter Cache, gepflegt von Server Action `saveAutomationRule` (Walk durch trigger_config + conditions, sammle alle stage_id-References).

#### 7. Builder-UI

`cockpit/src/app/(app)/settings/automation/page.tsx` (neu) — Listing aller Regeln (Status-Badge, last_run_at, Run-Count letzte 7 Tage, Edit/Toggle/Delete-Buttons).

`cockpit/src/app/(app)/settings/automation/[id]/edit/page.tsx` (neu) — 4-Step-Form:
1. **Trigger** — Radio (3 Trigger-Typen) + Sub-Form je nach Auswahl (z.B. Stage-Picker bei stage_changed)
2. **Conditions** — Add-Row-Liste (field-Picker + op-Picker + value-Input), AND-only
3. **Actions** — Add-Row-Liste (4 Action-Type-Buttons + Sub-Form je Action), Reorder via Up/Down
4. **Aktivieren + Trockenlauf** — Save-Draft (status=paused) oder Save-and-Activate (status=active), "Trockenlauf 30 Tage" Button zeigt Dry-Run-Result inline

Style Guide V2 verbindlich (Card-Layout, Badge-Komponenten, Form-Field-Pattern aus `/settings/payment-terms`).

### V6.2 Component-Detail — FEAT-622 Kampagnen-Attribution

#### 1. DB-Schema (MIG-029 Teil 2, DEC-135..138)

```
campaigns:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name TEXT NOT NULL
  type TEXT NOT NULL CHECK (type IN ('email','linkedin','event','ads','referral','other'))
  channel TEXT NULL                          -- z.B. "LinkedIn Ads Q2"
  start_date DATE NOT NULL
  end_date DATE NULL
  status TEXT NOT NULL CHECK (status IN ('draft','active','finished','archived')) DEFAULT 'draft'
  external_ref TEXT NULL                     -- System-4-Campaign-Id (DEC-135 primary match)
  notes TEXT NULL
  created_by UUID NOT NULL
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
  UNIQUE (external_ref) WHERE external_ref IS NOT NULL  -- partial unique
  UNIQUE (LOWER(name))                                  -- case-insensitive name uniqueness

campaign_links:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE
  token TEXT UNIQUE NOT NULL                 -- 8-char base64url (DEC-137)
  target_url TEXT NOT NULL
  utm_source TEXT NOT NULL
  utm_medium TEXT NOT NULL
  utm_campaign TEXT NOT NULL
  utm_content TEXT NULL
  utm_term TEXT NULL
  label TEXT NULL                            -- User-Notiz fuer den Link
  click_count INTEGER NOT NULL DEFAULT 0     -- denormalisiert, gepflegt vom Click-Endpoint
  created_at TIMESTAMPTZ DEFAULT now()

campaign_link_clicks:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  link_id UUID NOT NULL REFERENCES campaign_links(id) ON DELETE CASCADE
  clicked_at TIMESTAMPTZ DEFAULT now()
  ip_hash TEXT NULL                          -- SHA-256 von IP (DSGVO-konform)
  user_agent TEXT NULL                       -- truncated 200 chars
  referer TEXT NULL                          -- truncated 500 chars

CREATE INDEX idx_campaign_links_campaign ON campaign_links(campaign_id);
CREATE INDEX idx_campaign_link_clicks_link_time ON campaign_link_clicks(link_id, clicked_at DESC);
CREATE INDEX idx_campaigns_status_active ON campaigns(status, start_date) WHERE status='active';

-- Additive FK-Spalten (DEC-136 — bestehende source*-Felder unangetastet)
ALTER TABLE contacts  ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE deals     ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_contacts_campaign  ON contacts(campaign_id)  WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_companies_campaign ON companies(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_deals_campaign     ON deals(campaign_id)     WHERE campaign_id IS NOT NULL;
```

Click-Log retention: 90 Tage. Daily-Cron-Cleanup (Reuse-Pattern aus V5.1 `recording-retention/route.ts`). NICHT V1-Scope, BL-XXX angelegt fuer V6.3.

#### 2. Tracking-Link-Generator (DEC-137)

`cockpit/src/lib/campaigns/token.ts` (neu):
```typescript
import { randomBytes } from 'node:crypto';

export function generateCampaignToken(): string {
  return randomBytes(6).toString('base64url'); // 8 chars, ~2.8e14 combos
}
```

Server Action `createCampaignLink(campaignId, params)` ruft `generateCampaignToken()`. Bei UNIQUE-Conflict (extrem selten): retry max 5x. Token wird URL-safe rendered: `https://app.example.com/r/<token>`.

#### 3. Public Redirect-Endpoint

`cockpit/src/app/r/[token]/route.ts` (neu, **public, KEIN Auth**):

```typescript
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const sb = createServiceRoleClient();
  const { data: link } = await sb.from('campaign_links')
    .select('id, target_url')
    .eq('token', params.token)
    .single();

  if (!link) return NextResponse.redirect('https://strategaize.com/404', 302);

  // Click-Log async (kein await — Redirect first)
  void logClick(link.id, req).catch(logErr);

  // UTM-Parameter aus Link an Target-URL anhaengen (oder beibehalten falls schon da)
  const target = appendUtmIfMissing(link.target_url, link);

  return NextResponse.redirect(target, 302);
}
```

`logClick` macht 2 INSERTs: 1x `campaign_link_clicks`, 1x `UPDATE campaign_links SET click_count=click_count+1 WHERE id=...`. Beide non-blocking via `void`.

`ip_hash` = SHA-256 von `req.headers.get('x-forwarded-for')` (oder `x-real-ip`, Coolify-Traefik liefert beides).

#### 4. UTM → Campaign-Mapping (DEC-135)

`cockpit/src/lib/campaigns/mapper.ts` (neu):

```typescript
export async function resolveCampaignFromUtm(utm: UtmParams): Promise<string | null> {
  // Priority 1: external_ref Match (System 4 sendet das)
  if (utm.utm_source === 'system4' && utm.utm_content) {
    const c = await findCampaignByExternalRef(utm.utm_content);
    if (c) return c.id;
  }

  // Priority 2: utm_campaign = campaigns.name (case-insensitive trim)
  if (utm.utm_campaign) {
    const c = await findCampaignByName(utm.utm_campaign.trim());
    if (c) return c.id;
  }

  return null;  // Lead bekommt campaign_id=NULL, source*-Felder bleiben primary lookup
}
```

Aufgerufen von Lead-Insert-Pfaden (Webhook-API `/api/leads/intake`, manueller Contact-Create). NICHT bei Click — Click logged nur, Lead-Resolution erst bei Form-Submit.

#### 5. First-Touch-Lock (DEC-138)

Bei `INSERT INTO contacts (...)` mit utm-Werten:
- Wenn neuer Kontakt: `campaign_id` wird gesetzt aus `resolveCampaignFromUtm`.
- Wenn existierender Kontakt (Update via E-Mail-Match): `campaign_id` bleibt unangetastet wenn schon gesetzt (`UPDATE ... SET campaign_id = COALESCE(campaign_id, $new)`).

Click-Log enthaelt Multi-Touch-Visibility ohne Schema-Aenderung: Funnel-Report kann optional zeigen "Lead X kam ueber Kampagne A (first-touch), hat aber 3x bei Kampagne B geklickt" via JOIN auf `campaign_link_clicks`. Spaetere Multi-Touch-Auswertung bleibt nachruestbar ohne Datenverlust.

#### 6. Reporting-Page `/campaigns/[id]`

`cockpit/src/app/(app)/campaigns/[id]/page.tsx` (neu):

- **Header-Block:** Name, Typ, Channel, Zeitraum (start_date..end_date), Status-Badge
- **KPIs (5 Cards):** Lead-Count (`contacts WHERE campaign_id=X`), Deal-Count (`deals WHERE campaign_id=X`), Won-Count (`deals WHERE campaign_id=X AND stage.type='won'`), Won-Value (SUM(deals.value)), Conversion-Rate (Won-Count / Lead-Count)
- **Tabs:**
  - "Leads" — Liste verknuepfter Contacts mit Stage-Filter
  - "Deals" — Liste verknuepfter Deals mit Status-Filter
  - "Tracking-Links" — Liste der Links + Click-Counts + Klicks-Chart-letzte-30-Tage (kompakt)
- **Actions:** "CSV-Export" Button (Reuse `/api/export/*`-Pattern), "External-Ref editieren"

`/settings/campaigns/page.tsx` (neu) — Listing alle Kampagnen + Create-Button + Status-Filter.

#### 7. Funnel-Report-Filter (FEAT-335 Erweiterung, DEC-139)

Existing `/funnel`-Page bekommt im Filter-Bar einen neuen Dropdown "Kampagne" zwischen "Pipeline" und "Stage". Backend-Query erweitert um `WHERE deals.campaign_id = $X` (optional). UI-Eingriff ~1h, ein zusaetzlicher Filter-Renderer + ein zusaetzlicher Query-Param.

#### 8. Read-API `/api/campaigns/[id]/performance` (DEC-140)

`cockpit/src/app/api/campaigns/[id]/performance/route.ts` (neu):
```typescript
export async function GET(req: NextRequest, { params }) {
  const authError = verifyExportApiKey(req);  // FEAT-504/DEC-067 Pattern
  if (authError) return authError;

  const data = await loadCampaignPerformance(params.id);
  return NextResponse.json(data);
}
```

Response-Schema:
```json
{
  "campaign_id": "...",
  "name": "LinkedIn April 2026",
  "external_ref": "sys4-camp-42",
  "leads": 87,
  "deals": 12,
  "won_deals": 4,
  "won_value": 24500.00,
  "conversion_rate": 0.046,
  "click_count_total": 1432,
  "click_count_last_30d": 521,
  "first_lead_at": "2026-04-02T...",
  "last_activity_at": "2026-04-28T..."
}
```

KEIN Push-Webhook V1 (DEC-140). System 4 polled diesen Endpoint nach eigenem Schedule.

### V6.2 Data Flow — Workflow-Trigger-Pfad

```
1. User aendert Deal-Stage in Workspace-UI
2. Server Action updateDealStage(dealId, newStageId):
   2a. UPDATE deals SET stage_id=$new WHERE id=$id
   2b. INSERT audit_log (actor_id=user, action='stage_change', entity_type='deal', entity_id=$id, changes={...}) RETURNING id AS audit_id
   2c. dispatchAutomationTrigger({ event:'deal.stage_changed', entityType:'deal', entityId:$id, triggerEventAuditId:audit_id, changes:{stage_id:{before,after}} })
3. dispatchAutomationTrigger:
   3a. SELECT FROM automation_rules WHERE trigger_event='deal.stage_changed' AND status='active'
   3b. Fuer jede passende Regel: App-Level-Condition-Match
   3c. Bei Match: INSERT automation_runs (status='pending', UNIQUE-Conflict-Skip)
   3d. void executeAutomationRun(runId).catch(logErr)  -- fire-and-forget
4. Server Action returnt sofort zum User (UI ist responsive)
5. executeAutomationRun (parallel im Hintergrund):
   5a. UPDATE runs SET status='running'
   5b. Re-Eval Conditions
   5c. Fuer jede Action: Whitelist-Check + Action-Switch + audit_log-Eintrag bei Side-Effect
   5d. UPDATE runs SET status='success'|'partial_failed'|'failed', finished_at=now(), action_results=[...]
   5e. UPDATE rules SET last_run_at, last_run_status (Cache fuer UI)
6. Cron-Fallback (1 Min Takt):
   6a. Pickup pending/running runs >60s alt
   6b. executeAutomationRun(runId) erneut versucht (idempotent via status-WHERE)
```

**Anti-Loop-Garantie:** Wenn Action `update_field` `deals.stage_id` aendert, schreibt sie einen NEUEN audit_log-Eintrag. Dieser triggert wieder `dispatchAutomationTrigger`. Aber: das `INSERT automation_runs ... ON CONFLICT (rule_id, trigger_entity_id, trigger_event_audit_id) DO NOTHING` bezieht sich auf den NEUEN audit_id. Damit ist die Loop-Sicherung nicht "ein Run pro audit_id", sondern "ein Run pro (rule, entity, audit_id)" — d.h. 2x Stage-Change auf demselben Deal kann denselben Workflow erneut triggern (was richtig ist), aber dieselbe Stage-Change kann denselben Workflow nicht erneut triggern (auch richtig). Plus: harter Recursion-Counter im Executor: max 3 update_field-Actions pro Deal pro 60s (counter via `automation_runs WHERE trigger_entity_id=X AND started_at > now()-60s`).

### V6.2 Data Flow — Click-zu-Lead-Pfad

```
1. User klickt LinkedIn-Ad mit Tracking-URL https://app.../r/<token>?utm_source=linkedin&utm_campaign=Q2-Spring
2. /r/[token]/route.ts:
   2a. SELECT campaign_links WHERE token=<token>
   2b. logClick (async, non-blocking) → campaign_link_clicks INSERT + click_count++
   2c. Redirect 302 zu Ziel-URL mit utm-Params
3. User landet auf System-4-Form (extern), fuellt Lead-Form aus
4. System 4 POSTed an Business-System-API /api/leads/intake mit utm-Werten + Kontakt-Daten
5. /api/leads/intake/route.ts:
   5a. resolveCampaignFromUtm({utm_source, utm_campaign, ...}) → campaign_id (oder NULL)
   5b. INSERT/UPDATE contacts mit campaign_id (First-Touch-Lock via COALESCE bei UPDATE)
   5c. dispatchAutomationTrigger({event:'deal.created', ...}) — falls Form auch Deal anlegt
6. /campaigns/[id] UI zeigt Lead, Click-Counter, Conversion-Rate
```

### V6.2 External Dependencies

KEIN delta. Alle V6.2-Funktionalitaet nutzt bestehende Dependencies:
- Next.js Server Actions + Route Handlers
- Supabase Service-Role-Client
- Node-stdlib `crypto.randomBytes` fuer Token-Generierung
- Existing pdfmake, Bedrock, Whisper unbeteiligt
- Existing Coolify-Cron-Pattern (`expire-proposals`, `meeting-briefing` als Vorlage)

### V6.2 Security / Privacy Considerations

- **Public `/r/[token]`-Endpoint:** KEIN Auth. Token ist Zugangskontrolle via Obscurity (8-char, ~2.8e14 Combos). Bei Brute-Force: Rate-Limit am Edge (Coolify-Traefik) — V1 ohne, BL-XXX bei Bedarf.
- **IP-Logging:** SHA-256-Hashed (`crypto.createHash('sha256').update(ip).digest('hex')`) — DSGVO-konform, kein Klartext. retention 90 Tage.
- **Read-API:** Bearer-Token via EXPORT_API_KEY ENV (FEAT-504-Pattern). System 4 holt Token aus Coolify-ENV.
- **Workflow-Engine schreibt NICHT in PII-Felder:** Field-Whitelist verbietet `contacts.email`, `contacts.phone`, `companies.name`, `deals.title` als update_field-Targets. NUR `tags`, `value`, `stage_id`, `expected_close_date`. Whitelist DEC-130.
- **Anti-Loop-Marker** schuetzt vor versehentlichen Recursion-Loops UND vor versehentlichen Replay-Loops bei Cron-Fallback.
- **`actor_id=NULL`-Pattern** im audit_log identifiziert system-getriebene Aenderungen (Cron-Konsistenz mit V5.5/V5.6).
- **Internal-Test-Mode bleibt aktiv** — keine Aenderung am COMPLIANCE-Gate.

### V6.2 Constraints und Tradeoffs

- **Hybrid-Trigger statt LISTEN/NOTIFY:** Postgres LISTEN/NOTIFY waere reliability-staerker, braucht aber persistente Connection und Re-Connect-Logic. Next.js Server-Routes sind serverless-tauglich → kein guter Match. Hybrid-Pattern (Sync + Cron-Fallback) erfuellt 30s-AC mit Standard-Patterns.
- **AND-only Conditions:** OR/Gruppierung waere flexibler, aber UI-Aufwand fuer einfache Single-User-V1 nicht gerechtfertigt. Multi-Rule-Workaround moeglich (zwei Regeln mit identischen Actions).
- **First-Touch-Lock:** Multi-Touch-Attribution waere genauer, aber Single-User-V1 mit ~3-5 Kampagnen parallel hat kaum Multi-Touch-Realitaet. Click-Log bewahrt die Daten fuer spaetere Auswertung.
- **`utm_campaign`-Match case-insensitive:** Robust genug fuer Single-Tenant-V1. Multi-Tenant koennte Kollisionen bekommen → V7-Sache.
- **Code-Konfig-Whitelist:** DB-Tabelle waere zur Laufzeit aenderbar, aber Single-User-V1 braucht das nicht. Code-Konfig ist Type-safe, Reviewable in Git, Test-bar.
- **`automation_runs` als Pending-Queue OHNE Worker:** Fire-and-forget reicht weil Server Actions bereits Concurrent-fest sind und Cron-Fallback alles abfaengt was App-Crash-haendisch verloren geht. Keine Bull/BullMQ-Library noetig.
- **Click-Log retention 90 Tage:** Konsistent mit V5.2 COMPLIANCE.md. Cleanup-Cron nicht V1-Scope (BL-XXX V6.3).

### V6.2 Empfohlene Slice-Reihenfolge (DEC-141)

| Slice | Feature | Scope | Schaetzung | QA-Fokus |
|---|---|---|---|---|
| SLC-621 | FEAT-621 (Foundation) | MIG-029 Teil 1 (`automation_rules` + `automation_runs`) + Trigger-Dispatcher + Anti-Loop-Marker + Field-Whitelist + Server Actions saveRule/listRules/deleteRule | 4-6h | Schema idempotent, Anti-Loop-UNIQUE greift, Whitelist verbietet PII-Felder, Server-Action-CRUD persistiert sauber |
| SLC-622 | FEAT-621 (Engine) | Action-Executor (4 Action-Types) + executeAutomationRun + Cron-Endpoint /api/cron/automation-runner + Coolify-Cron-Setup + Stage-Delete-Soft-Disable | 5-7h | 4 Actions live, Cron-Fallback greift, Loop-Test (Endless-Loop-Provokation), Stage-Delete pausiert Regeln, audit_log-Eintraege bei Side-Effects |
| SLC-623 | FEAT-621 (UI) | `/settings/automation` Listing + 4-Step-Builder + Trockenlauf + Aktiv-Toggle | 5-7h | Builder rendert alle Trigger/Conditions/Actions, Trockenlauf zeigt Treffer ohne Schreib-Side-Effects, Toggle aktiviert/pausiert ohne Rule-Save, Listing zeigt last_run_status |
| SLC-624 | FEAT-622 (Foundation) | MIG-029 Teil 2 (`campaigns` + `campaign_links` + `campaign_link_clicks` + 3 FK-Spalten) + `/settings/campaigns` Listing + `/campaigns/[id]` Detail + Stammdaten-Dropdown (Contacts/Companies/Deals) | 4-6h | Schema additiv, FK-Defaults (Deal von Contact-Primary), Stammdaten-Dropdown-Picker live, Detail-Page rendert KPIs |
| SLC-625 | FEAT-622 (Tracking + Reporting + API) | Token-Generator + Tracking-Link-CRUD + `/r/[token]` Public Redirect + Click-Log + Reporting-KPIs auf Detail-Page + Funnel-Report-Filter + Read-API `/api/campaigns/[id]/performance` | 5-8h | `/r/[token]`-Redirect 302, Click-Log mit IP-Hash, KPIs korrekt aggregiert, Funnel-Filter zeigt scoped Funnel, Read-API mit Bearer-Auth gibt JSON |

Gesamt ~23-34h. Reihenfolge zwingend: 621 -> 622 -> 623 (Workflow-Engine zuerst), 624 -> 625 (Attribution danach). 624 koennte parallel zu 623 laufen wenn separater Branch — aber Empfehlung: sequenziell, weil V6.2 ein Single-User-Solo-Build ist und Worktree-Switching Kontext-Kosten hat.

Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-024 nach SLC-625.

### V6.2 Open Technical Questions (fuer /slice-planning)

1. **Trigger-Dispatcher Aufrufer-Liste vollstaendig?** Welche Server Actions heute schreiben Stage-Changes oder Deal-Creates oder Activity-Creates ausserhalb der zentralen Actions? (z.B. IMAP-Sync der eine Activity inserted, Cal.com-Sync der ein Meeting erzeugt das eine Activity inserted, manuelle SQL-Inserts gibt es nicht.) Empfehlung: in SLC-621 explizite Audit-Liste der Trigger-Source-Server-Actions als Code-Konfig.
2. **Anti-Loop bei `update_field`-Cascade:** Eine Regel A aktualisiert `deals.value`. Regel B triggert auf `deal.value_changed` (V1-Out-of-Scope, aber zukuenftig). Recursion-Counter `max 3 update_field per Deal per 60s` reicht? Empfehlung: ja fuer V1-Trigger-Set, V2-Trigger-Erweiterung muss Cascade-Limit feiner kontrollieren.
3. **Trockenlauf-Performance bei viel History:** 30 Tage = ~10k audit_log-Eintraege fuer einen aktiven Single-User. SQL-Query mit App-Side-Match ist OK, aber bei groesseren Tenants (Multi-User V7) wird das langsam. Empfehlung: V1 OK, V7-Erweiterung ueber Background-Materialized-View.
4. **Click-Log Cleanup Cron-Anlage:** 90 Tage Retention via taeglichem Cron `campaign-cleanup` analog `recording-retention`. NICHT V1-Scope, BL-XXX angelegt fuer V6.3. Empfehlung: in SLC-625 nur Schema vorbereiten (Index auf `clicked_at`), Cron-Endpoint kommt im naechsten V6.x-Sprint.
5. **System-4-API-Kontrakt /api/leads/intake:** Wer baut das? Empfehlung: Existing oder neuer Endpoint? In SLC-624 pruefen ob `/api/leads/intake` schon existiert (V4 IMAP-Pfad nutzt potentiell anderen Pfad). Falls neu: in SLC-624 mit aufnehmen oder in SLC-625 ergaenzen.
6. **Conversion-Definition "Won-Deal":** Stage-Type `won` ist im V3-Pipeline-Modell vorhanden. SLC-625 Reporting-Query `JOIN pipeline_stages WHERE stage.type='won'`. Pipeline-Stages haben `is_won BOOLEAN` heute (zu pruefen) oder `stage_type ENUM`. Empfehlung: in SLC-625 SLC-Plan endgueltig festlegen.
7. **Funnel-Report-Page Pfad:** `/funnel` oder `/reports/funnel`? Empfehlung: existing path nutzen, bei Slice-Plan verifizieren.
8. **`audit_log` actor_id=user vs. NULL bei System-actions:** existing Cron-Pattern (recording-retention) nutzt `actor_id=null`. Workflow-Action-Side-Effects sollten dasselbe Pattern: `actor_id=null, context='Automation rule {name} executed'`. Aber Trigger-Source-actor (User der den Stage-Change ausgeloest hat) sollte im audit_log-changes-JSONB-Feld als `triggered_by_user_id: ...` ergaenzt sein, damit Audit-View "von wem ausgeloest" sichtbar bleibt. Empfehlung: in SLC-622 implementieren.

### V6.2 Recommended Next Step

`/slice-planning V6.2` — die 5 Slices SLC-621..625 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Insbesondere: Trigger-Source-Server-Action-Liste in SLC-621 Code-Konfig, Field-Whitelist-Liste mit Validators in SLC-621, Cron-Setup-Anleitung fuer REL-024-Notes in SLC-622, Trockenlauf-UI-Komponente in SLC-623, Stammdaten-Dropdown-Komponente (wiederverwendbar Contacts/Companies/Deals) in SLC-624, `/r/[token]`-Endpoint mit Click-Log-Tests in SLC-625, Read-API-Smoke-Test mit Bearer-Token in SLC-625.

---

## V6.4 — Hygiene-Sprint Architecture

### V6.4 Summary

V6.4 ist ein Hygiene-Sprint, kein Feature-Sprint. Die "Architektur" besteht aus 3 Bloecken:

1. **FEAT-641 Stabilitaet & DSGVO** — 1 Cron-Endpoint + 1 Code-Fix. Reuse vollstaendig: Pattern, Auth, Audit-Log, Coolify-Cron-Mechanik = alles wie `expire-proposals` (V5.5).
2. **FEAT-642 Code-Audit** — neue **Audit-Methodik** (Process), kein neuer Code-Pfad. Audit-Output ist ein RPT mit Per-Item-Format und Severity-Klassifikation.
3. **FEAT-643 UI-Audit** — gleiche Methodik wie FEAT-642, fuer UI-Bereiche.

KEINE neuen Container, KEINE neuen npm-Packages, KEINE Schema-Migration, KEIN neuer LLM-Pfad. Komplett additiv und entfernend (selektive Cleanups).

### V6.4 Main Components

```
                ┌──────────────────────────────────────────────────┐
                │            App-Layer (Next.js, bestehend)         │
                │                                                    │
  FEAT-641 Fix  │  cockpit/src/lib/ai/followup-engine.ts             │
                │     proposals.value -> total_gross (2 Stellen)    │
                │                                                    │
  FEAT-641 Cron │  cockpit/src/app/api/cron/click-log-cleanup/      │
                │     route.ts (NEU, analog expire-proposals)        │
                │     POST + verifyCronSecret                        │
                │     DELETE FROM campaign_link_clicks               │
                │       WHERE created_at < NOW() - INTERVAL '90d'    │
                │     INSERT audit_log (action='click_log_cleanup',  │
                │       changes={deleted_count,oldest_kept,run_at})  │
                │                                                    │
                │  Coolify-Cron (NEU, taeglich 03:00 UTC)            │
                │                                                    │
  FEAT-642 + 643│  /reports/RPT-XXX-code-audit.md (NEU, Inventur)    │
                │  /reports/RPT-XXX-ui-audit.md  (NEU, Inventur)     │
                │     Per-Item-Format mit Severity + User-Sign-Off   │
                │                                                    │
                │  Cleanup-Implementation: Edits in bestehenden      │
                │    Files, atomare Commits pro Item                 │
                └──────────────────────────────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────────────────────────────┐
                │      Postgres (bestehend, keine Schema-Aenderung) │
                │                                                    │
                │  campaign_link_clicks (DELETE pro 90d)             │
                │  audit_log (INSERT pro Cleanup-Lauf)               │
                │  proposals (kein Aenderung — Fix ist Code-side)    │
                └──────────────────────────────────────────────────┘
```

### V6.4 Component-Detail — FEAT-641 System-Stabilitaet

#### 1. ISSUE-057 FollowupEngine-Fix (DEC-142)

**Problem:** `cockpit/src/lib/ai/followup-engine.ts:194-208` selektiert auf nicht-existenter Spalte `proposals.value`. Schema-Drift seit V5.5/MIG-026.

**Fix:**
- Zeile 199: `value` -> `total_gross` (Select-String)
- Zeile 207: `.order("value", ...)` -> `.order("total_gross", ...)` (Sortier-Spalte)
- Begleitend: Pure-Function-Test fuer den Query-Builder mit Mock-Supabase-Client.

**Pattern-Hinweis:** Beim Vitest-Setup ist node-Env (kein React-Testing-Library) ausreichend, weil FollowupEngine reine Server-Logik ist.

#### 2. Click-Log-Cleanup-Cron (DEC-143, DEC-144)

**Pattern:** identisch zu `cockpit/src/app/api/cron/expire-proposals/route.ts` (V5.5, REL-020).

**Endpoint:** `cockpit/src/app/api/cron/click-log-cleanup/route.ts`

```
POST /api/cron/click-log-cleanup
Authorization: Bearer ${CRON_SECRET}

Logic:
1. verifyCronSecret(request) -> 401 if missing
2. const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
3. DELETE FROM campaign_link_clicks WHERE created_at < cutoff (count exact)
4. SELECT MIN(created_at) FROM campaign_link_clicks (oldest_kept)
5. INSERT audit_log (action='click_log_cleanup',
                      changes={deleted_count, oldest_kept, cutoff, run_at})
6. return JSON { success: true, deleted, cutoff }
```

**Idempotent:** 0-Row-Lauf produziert kein Error. Audit-Log-Eintrag bei jedem Lauf.

**Schedule:** Coolify-Cron taeglich 03:00 UTC (analog `expire-proposals` 02:00 UTC, +1h Offset um Konflikte zu vermeiden).

**Hard-Delete:** kein Soft-Delete. Begruendung: Click-Logs sind anonymisiert (IP-Hash + Salt), 90-Tage-Retention ist DSGVO-konformes Maximum, kein Recovery-Pfad benoetigt. Konsistent mit V5.2 COMPLIANCE.md Email-Retention-Pattern.

### V6.4 Component-Detail — FEAT-642 Code-Audit Methodik (DEC-145, DEC-147, DEC-148, DEC-149)

#### Audit-Scope (DEC-148): Code only, KEIN Schema-Audit in V6.4

Schema-Audit (ungenutzte Spalten/Indizes) wird auf V6.5 vertagt. V6.4 inspiziert nur Code-Konsumenten.

#### 5 Hot-Spots:

1. **Cron-Jobs (19 Endpoints in `cockpit/src/app/api/cron/`)** — pro Cron: 24h Container-Log-Stichprobe + Coolify-Cron-Status + Code-Konsumenten-Suche.
2. **AI-Engines (`cockpit/src/lib/ai/`)** — FollowupEngine, Briefing-Engine, Signal-Extract, Bedrock-Adapter, Whisper-Adapter. Pro Engine: Trigger-Source + Eingabe/Ausgabe + Logik-Ueberlappungs-Suche. **Konsolidierungs-Refactor explizit deferred (DEC-149).**
3. **Source-Schema-Inkonsistenzen** — `contacts.source/source_detail/campaign_id`, `companies.source_type/source_detail/campaign_id`, `deals.campaign_id`. Pro Feld: Reader/Writer-Suche im Code. **Migration-Tool BL-424 deferred (unassigned).**
4. **Tote Server-Actions** — `cockpit/src/**/actions.ts` durchgehen. Pro exportierter Action: grep auf Aufrufer.
5. **Tote API-Routes** — `cockpit/src/app/api/**/route.ts` durchgehen. Pro Route: grep auf fetch-Aufrufer + Coolify-Cron-Liste.

#### Audit-Methodik (DEC-145):

**Stichprobe Cron-Jobs:** 24h Container-Logs reicht. Bei Verdacht-Faellen kann man im naechsten Schritt 7-Tage-Sample nachziehen.

**Per-Item-Format:**
```
## CA-001 — [Titel]
- Typ: cron-job | ai-engine | server-action | api-route | schema-inkonsistenz
- Pfad: cockpit/src/...
- Severity: Klar-obsolet | Verdacht | Behalten
- Beobachtung: [konkrete Beweise]
- Cleanup-Vorschlag: [delete | soft-disable | refactor | keep]
- Risiko: [was schief gehen kann]
- User-Entscheidung: [ ] loeschen [ ] umsetzen [ ] spaeter [ ] nicht
```

**Severity-Definitionen:**
- **Klar-obsolet** — Code hat 0 Aufrufer, kein Cron-Trigger, keine Funktion
- **Verdacht** — Code wird nicht aktiv genutzt (picked=0 ueber Sample-Window), aber theoretisch erreichbar
- **Behalten** — Code ist aktiv ODER sicherheits-/compliance-relevant (z.B. audit_log-Schreiber)

#### Cleanup-Strategie (DEC-146): Soft-Disable + 30 Tage Beobachtung

**Cron-Jobs:** Bei Cleanup-Decision "loeschen" passiert in 2 Stufen:
1. **Stufe 1 (V6.4):** Coolify-Cron deaktivieren. Code bleibt unberuehrt. Warten 30 Tage.
2. **Stufe 2 (V6.5+ falls keine User-Beanstandung):** Code + Endpoint geloescht.

**Andere Code-Pfade (Server-Actions, API-Routes, AI-Engine-Methoden):** Kann in V6.4 hart geloescht werden, weil Tests + Live-Smoke direkt zeigen ob etwas bricht. Soft-Disable-Pattern lohnt sich nur fuer Scheduler-getriebene Pfade.

#### Tooling (DEC-147): /doctor erweitern, kein neuer Mechanismus

Bestehender `/doctor`-Skill ist eher fuer "Diagnose unstabiler Releases" gedacht. Wir nutzen ihn trotzdem als Vehikel fuer den V6.4-Audit, ergaenzen die Methodik durch ein neues IMP-Pattern in `strategaize-dev-system/docs/SKILL_IMPROVEMENTS.md`.

### V6.4 Component-Detail — FEAT-643 UI-Audit Methodik (DEC-150)

#### Audit-Scope: Eng — 5 Bereiche, KEINE ganzen Page-Redesigns

1. **Settings-Landing-Page** — 5 Link-Karten + Inline-Sections (ImapStatus, PipelineConfig, TemplatesConfig). Hierarchie + Konsolidierung pruefen.
2. **Sidebar-Navigation** — Eintraege gegen Nutzung. Doppel-Pfade identifizieren.
3. **Button-Konsistenz** — Primary-/Secondary-/Destructive-Verteilung, Position, Label-Stil cross-page.
4. **Pipeline-Stages** — Anzahl + Beschriftung pro Pipeline (Multiplikatoren 10, Endkunden 12) gegen Deal-Count pro Stage.
5. **Page-Header-Pattern** — Header-Hoehe, Title+Subtitle+Actions-Konsistenz.

**Out-of-Scope:** komplette Page-Redesigns, Mobile-Audit, Accessibility, Color-Palette-Wechsel (Style Guide V2 ist verbindlich).

#### Tooling: Bestehender `/ui-update`-Skill

Kein neuer Mechanismus. Audit-Output: strukturierter RPT mit Per-Item-Vorher/Nachher.

#### Per-Item-Format:
```
## UA-001 — [Titel]
- Bereich: settings-landing | sidebar | button-konsistenz | pipeline-stages | page-header
- Aktuell: [Status quo]
- Beobachtung: [warum Cleanup-Kandidat]
- Vorschlag: [konkreter Vorher/Nachher]
- Aufwand: klein <1h | mittel 1-3h | gross 3+h
- Risiko: [was kann brechen]
- User-Entscheidung: [ ] umsetzen [ ] spaeter [ ] nicht
```

#### UI-Polish-Tiefe (DEC-150): Klein in V6.4, Gross-Items deferren

**Klein/Mittel-Items (<3h)** sind V6.4-Cleanup-Kandidaten.
**Gross-Items (>3h, z.B. komplette Settings-Page-Restrukturierung)** werden als BL fuer V6.5 angelegt mit Begruendung.

### V6.4 Data Flow

#### FEAT-641 Click-Log-Cleanup-Cron Flow:

```
Coolify-Cron (03:00 UTC)
       │
       ▼
POST /api/cron/click-log-cleanup
   Authorization: Bearer $CRON_SECRET
       │
       ▼
verifyCronSecret() -> ok | 401
       │
       ▼
DELETE FROM campaign_link_clicks
   WHERE created_at < NOW() - INTERVAL '90 days'
       │
       ▼
SELECT MIN(created_at) FROM campaign_link_clicks
   (oldest_kept fuer audit_log)
       │
       ▼
INSERT audit_log (action='click_log_cleanup', changes=...)
       │
       ▼
return JSON { success, deleted, cutoff }
```

#### FEAT-642/643 Audit Flow:

```
SLC-642 Inventur (Code-Audit)
       │
       ▼ (Tools: ripgrep, Container-Log-Stichprobe, Coolify-Cron-List)
RPT-XXX (Per-Item-Liste, alle Items "User-Entscheidung: [ ]")
       │
       ▼ User-Pause: signed-off pro Item
RPT-XXX (gleicher Report, Sign-Off-Status pro Item ergaenzt)
       │
       ▼
SLC-643 Cleanup-Implementation (nur signed-off Items)
       │
       ▼
Atomare Commits pro Item (Pattern aus .claude/rules/git-release.md)
       │
       ▼
Vitest + Live-Smoke
```

(Gleicher Flow fuer SLC-644 + SLC-645 mit UI-Audit.)

### V6.4 External Dependencies

**Keine neuen Dependencies.** V6.4 nutzt:
- Bestehende Supabase-Client-Lib (admin-Client fuer Cleanup-Cron)
- Bestehender `verifyCronSecret`-Helper (V5.5 SLC-554)
- Bestehende `audit_log`-Tabelle (V5.7+)
- Bestehender Coolify-Cron-Mechanismus
- Bestehender Vitest-Setup

### V6.4 Security & Privacy Considerations

- **Click-Log-Cleanup ist DSGVO-relevant.** Hard-Delete nach 90 Tagen ist konform mit COMPLIANCE.md V5.2. Kein Recovery-Pfad. Audit-Log-Eintrag fuer Compliance-Nachweis bleibt persistent.
- **Cron-Endpoint Bearer-Auth-Schutz.** `verifyCronSecret` prueft `Authorization: Bearer $CRON_SECRET`. Pattern wie alle anderen Cron-Endpoints.
- **Audit-Log-Pfade explizit als "Behalten" klassifiziert.** Cleanup-Items duerfen audit_log-Schreiber NIEMALS loeschen, auch wenn sie wenig genutzt scheinen.
- **Soft-Disable-Strategie reduziert Risiko von versehentlichem Datenverlust.** Cron deaktivieren ist reversibel; Code loeschen erst nach 30 Tagen Beobachtung.

### V6.4 Constraints & Tradeoffs

- **Audit-getriebener Sprint:** Vorab nicht vollstaendig planbar wieviele Cleanup-Items entstehen. **Tradeoff:** Mindest-Quote (>=3 Code, >=2 UI) statt Maximum-Quote. Audit-Scope-Explosion durch User-Sign-Off pro Item begrenzt.
- **Hard-Delete vs. Soft-Disable Asymmetrie:** Click-Logs Hard-Delete (DSGVO-Pflicht), Cron-Jobs Soft-Disable (Reversibilitaet). **Tradeoff:** Konsistenz vs. Compliance vs. Risiko. Begruendet pro Pfad.
- **/doctor-Reuse statt neuer Audit-Mechanismus:** Spart Zeit, aber /doctor passt nur "halb" zum Audit-Use-Case. **Tradeoff:** schneller Sprint vs. perfektes Tooling. IMP fuer Dev-System dokumentiert die Erweiterung.
- **Schema-Audit auf V6.5 deferred:** Schema-Inkonsistenzen werden in V6.4 nur auf Code-Ebene angeschaut, nicht DB-strukturell. **Tradeoff:** kleinerer V6.4-Scope vs. unvollstaendige Hygiene.

### V6.4 Risk Matrix

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Falsch-Positiv "obsolet": Edge-Case-Code wird geloescht | Mittel | Mittel | Soft-Disable-Strategie fuer Cron, Live-Smoke nach jedem Cleanup-Commit, atomare Commits fuer Rollback |
| Audit-Scope-Explosion: 50+ Items, Sprint zu gross | Hoch | Mittel | User-Sign-Off pro Item, Mindest-Quoten als Floor (nicht Maximum), Rest als BL fuer V6.5 |
| Compliance-Drift: Audit-Log-Schreiber versehentlich entfernt | Niedrig | Hoch | Audit-Log-Pfade explizit als "Behalten" klassifizieren, Style-Guide-Pruefung pro Cleanup-Item |
| UI-Audit fuehrt zu Stilbruechen mit V5.3-V6.3 | Mittel | Niedrig | Style Guide V2 verbindlich, /ui-update folgt visuellem Pattern |
| Click-Log-Cleanup-Cron loescht zu wenig (Date-Logik falsch) | Niedrig | Niedrig | Vitest fuer Cron-Logik (Mock-Now), Live-Smoke nach Deploy |
| Click-Log-Cleanup-Cron loescht zu viel | Niedrig | Hoch | Cutoff-Berechnung server-side (NOW()-INTERVAL), nicht client-side, audit_log persistent |

### V6.4 Empfohlene Slice-Reihenfolge (DEC-151)

| Slice | Feature | Scope | Schaetzung | QA-Fokus | User-Sign-Off-Pause |
|---|---|---|---|---|---|
| **SLC-641** | FEAT-641 | ISSUE-057 followup-engine.ts Fix + Click-Log-Cleanup-Cron + Vitest + Audit-Log-Eintrag + Coolify-Cron-Setup | 3-4h | Vitest gruen, Live-Cron-Smoke 1 Lauf, Audit-Log-Insert verifiziert | Nein |
| **SLC-642** | FEAT-642 | Code-Audit Inventur ueber 5 Hot-Spots, RPT-XXX-code-audit erzeugen, KEIN Code-Cleanup | 2-3h Inventur | Audit-Liste komplett, Severity nachvollziehbar | **JA** (User klassifiziert pro Item) |
| **SLC-643** | FEAT-642 | Code-Cleanup-Implementation der >=3 signed-off Items + atomare Commits + Vitest + Live-Smoke | 2-4h je Items | Vitest gruen, kein Regression in 5 Haupt-Pages | Nein |
| **SLC-644** | FEAT-643 | UI-Audit Inventur ueber 5 UI-Bereiche, RPT-XXX-ui-audit erzeugen, KEIN UI-Cleanup | 2h Inventur | Vorher/Nachher pro Item konkret, Aufwand-Schaetzung plausibel | **JA** (User entscheidet pro Item) |
| **SLC-645** | FEAT-643 | UI-Cleanup-Implementation der >=2 signed-off Items + Style Guide V2 + Live-Smoke | 2-4h je Items | Style Guide V2 ohne neue Color-Klassen, kein Regression in 5 Haupt-Pages, Browser-Smoke OK | Nein |

**Gesamt ~14-21h.** Reihenfolge zwingend seriell:
1. SLC-641 — Stabilitaets-Fundament zuerst, klein und bekannt.
2. SLC-642 — Code-Audit
3. **Pause** — User signed-off pro Item.
4. SLC-643 — Code-Cleanup
5. SLC-644 — UI-Audit
6. **Pause** — User signed-off pro Item.
7. SLC-645 — UI-Cleanup

Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-026 nach SLC-645.

### V6.4 Release-Gate (DEC-151)

V6.4 gilt als releaseable wenn alle 5 Bedingungen erfuellt:
- ISSUE-057 resolved (Live-Smoke gegen Followup-Cron PASS, kein "column proposals.value"-Error mehr in Container-Log)
- BL-423 Cleanup-Cron live (Coolify-Cron aktiv, mind. 1 erfolgreicher Lauf in audit_log oder Container-Log sichtbar)
- mindestens 3 Code-Cleanup-Items in V6.4 implementiert (FEAT-642 Mindest-Quote)
- mindestens 2 UI-Cleanup-Items in V6.4 implementiert (FEAT-643 Mindest-Quote)
- Vitest 393/393 (oder mehr) PASS + Live-Smoke ueber 5 Haupt-Pages (Mein Tag, Pipeline, Kontakte, Settings-Landing, Proposals) ohne Regression

Wenn die Mindest-Quoten unterschritten werden (z.B. der Audit findet kaum Cleanup-Kandidaten), gilt V6.4 nicht als gescheitert — der Sprint kann mit angepasster Quote releaseable sein wenn der User explizit signed-off, dass der Audit-Output ausreichend ist (auch wenn nur 2 Code- + 1 UI-Item entstehen). Die Quoten sind defensive Floor, kein Lock.

### V6.4 Open Technical Questions (fuer /slice-planning)

1. **Tatsaechliche Cron-Job-Liste fuer Audit:** 19 Endpoints in `cockpit/src/app/api/cron/`. Welche davon haben einen Coolify-Cron-Eintrag, welche werden nur per externem Trigger aufgerufen, welche sind Dead Code? Empfehlung: in SLC-642 als ersten Schritt Coolify-Cron-Liste vom Server pullen, gegen `cockpit/src/app/api/cron/` matchen.

2. **Audit-Log-Schreiber-Inventur:** Wo schreibt das System ueberall in `audit_log`? Pattern-Liste fuer "Klar Behalten" als Vorab-Check. Empfehlung: `grep -r "audit_log" cockpit/src/` als ersten SLC-642-Schritt.

3. **AI-Engine-Konsolidierung-Markierung:** Wenn der Code-Audit Logik-Ueberlappung zwischen FollowupEngine + Briefing-Engine + Signal-Extract findet — Item wird als "spaeter (V6.5)" markiert, nicht "umsetzen" in V6.4 (DEC-149).

4. **Pipeline-Stage-Daten-Quelle:** Pipeline-Stage-Konsolidierung benoetigt Deal-Count pro Stage. SQL gegen `deals.stage_id` GROUP BY in SLC-644.

5. **Coolify-Cron-Anlage Click-Log-Cleanup:** User legt den Cron-Eintrag manuell an. Cron-Anleitung muss in REL-026-Notes mit konkretem `node -e fetch()`-Snippet inkl. CRON_SECRET. Empfehlung: in SLC-641 vorbereiten, REL-026-Notes-Draft am Slice-Ende.

6. **Audit-RPT-Naming-Convention:** Dateiname strikt `RPT-XXX.md`, aber `title:`-Frontmatter klar mit "V6.4 Code-Audit Inventur" oder "V6.4 UI-Audit Inventur".

### V6.4 Recommended Next Step

`/slice-planning V6.4` — die 5 Slices SLC-641..645 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Insbesondere:
- SLC-641: Cron-Endpoint-Spec mit Vitest-Mock-Pattern + REL-026-Cron-Setup-Anleitung
- SLC-642: Hot-Spot-Schema mit ripgrep-Patterns + 24h-Container-Log-Sample-Methodik
- SLC-643: Atomare-Commit-Strategie pro Cleanup-Item
- SLC-644: UI-Page-Stichproben-Liste (Settings, Sidebar, Pipeline) mit Screenshot-Anleitung
- SLC-645: Style-Guide-V2-Verifikations-Checkliste pro Cleanup-Item

## V6.6 — Pre-V7-Audit-Sprint Architecture (UI-Konsolidierung + KI-Workspace-Hybrid)

### V6.6 Summary

V6.6 ist ein UI-Konsolidierungs-Sprint, der **vor V7 (Multi-User)** ein einheitliches Bedienmodell auf den drei Hauptarbeitsplaetzen (Mein Tag, Deal-Detail, Dashboard) etabliert. Die Architektur-Arbeit besteht aus 4 Bloecken:

1. **Eine reusable `<KIWorkspace>`-Component** (Frontend-Foundation) — gleiche Component, drei kontextualisierte Caller. Fundament fuer alle weiteren V6.6-Slices.
2. **Layout-Restruktur** auf 3 Pages (Mein Tag, Deal-Detail, Dashboard) + eine neue Deals-Listen-Seite (Top-10 + Karten-Grid). Frontend-only.
3. **Backend-Mini-Touch** — Win/Loss-Auto-Trigger als V6.2-Workflow-Action + 1 additive Schema-Migration (working_hours-Cols + auto_winloss_runs-Tabelle).
4. **Hygiene** — Sparkles-Cards entfernen, NL-Suche durch Type-Ahead ersetzen, "KI-Reife" zu "AI-Bereitschaft" umbenennen, Sidebar-Reorder ohne VERWALTUNG-Touch.

KEINE neuen Container, KEINE neuen npm-Packages, KEIN neuer LLM-Provider, KEIN neuer Cron-Job-Typ (Auto-Trigger laeuft synchron im Stage-Wechsel-Pfad ueber V6.2-Workflow-Engine).

V7-Multi-User-Kompatibilitaet ist Pflicht — alle Layout-Entscheidungen erlauben spaetere Rollen-Sichtbarkeits-Filter, ohne V6.6-Caller zu brechen.

### V6.6 Main Components

```
                   ┌────────────────────────────────────────────────────────┐
                   │                  App-Layer (Next.js, bestehend)         │
                   │                                                          │
  V6.6 Foundation  │   cockpit/src/components/ki-workspace/                  │
                   │      KIWorkspace.tsx (NEU, reusable)                     │
                   │      types.ts (Reports, scopeIds, Context-Discriminator) │
                   │      hooks/useReportRun.ts (NEU, Bedrock-Call-Wrapper)   │
                   │      hooks/useVoiceCapture.ts (NEU, extrahiert aus       │
                   │         pipeline-suche, Whisper-Adapter)                 │
                   │      reports/registry.ts (NEU, pro Workspace-Typ)        │
                   │      AnswerPane.tsx (Markdown-Renderer + Spinner)        │
                   │                                                          │
  V6.6 Caller 1    │   cockpit/src/app/(app)/mein-tag/page.tsx                │
                   │      Reuse: <KIWorkspace context="mein-tag" />           │
                   │      Removed: 4-Hinweise-Pill, 4-offene-Punkte-Zeile,    │
                   │         Tagesanalyse-starten-Button                       │
                   │                                                          │
  V6.6 Caller 2    │   cockpit/src/app/(app)/deals/[id]/page.tsx              │
                   │      Reuse: <KIWorkspace context="deal-detail" />        │
                   │      Reuse: <ItemSheet> (extrahierte Task-Sheet aus      │
                   │         FEAT-302) fuer Activity-Detail-Sheet              │
                   │      Removed: Briefing-Sidebar, Wissen-Tab, Signale-     │
                   │         Action, Edit-Tab                                  │
                   │                                                          │
  V6.6 Caller 3    │   cockpit/src/app/(app)/dashboard/page.tsx               │
                   │      Reuse: <KIWorkspace context="cockpit" />            │
                   │      Reuse: KalenderClient (FEAT-309)                    │
                   │      Removed: KPI-Cards, Top-Chancen-Tabelle,            │
                   │         DashboardSearch                                   │
                   │                                                          │
  V6.6 New Page    │   cockpit/src/app/(app)/deals/page.tsx (RESTRUCTURED)    │
                   │      Top-10-Block + Karten-Grid + Won/Lost-Sektionen +   │
                   │         Type-Ahead-Suche + Pipeline-Switcher              │
                   │                                                          │
  V6.6 Backend     │   cockpit/src/lib/automation/actions/                    │
                   │      auto_winloss_extract.ts (NEU, V6.2-Workflow-Action) │
                   │   cockpit/src/lib/winloss/                               │
                   │      runWinLossExtract.ts (NEU, Bedrock-Wrapper)         │
                   │   cockpit/src/app/api/winloss/[deal_id]/route.ts (NEU,   │
                   │      Read-API-Pattern wie FEAT-622-Campaign-Read)        │
                   │                                                          │
  V6.6 Hygiene     │   cockpit/src/app/(app)/firmen/[id]/* (Sparkles-Card     │
                   │      entfernt)                                            │
                   │   cockpit/src/app/(app)/kontakte/[id]/* (Sparkles-Card   │
                   │      entfernt)                                            │
                   │   cockpit/src/lib/labels/ki-readiness.ts (NEU, zentrale  │
                   │      Label-Map "AI-Bereitschaft")                         │
                   │   cockpit/src/components/sidebar.tsx (Reorder ANALYSE/   │
                   │      OPERATIV/ARBEITSBEREICHE, "Meine Performance" raus, │
                   │      VERWALTUNG unangetastet)                             │
                   │   cockpit/src/components/kalender-client.tsx (Range      │
                   │      06:00-21:00 + Working-Hours-Lookup + Toggle)        │
                   │   cockpit/src/app/(app)/settings/working-hours/* (NEU,   │
                   │      Settings-Sektion fuer working_hours_start/end)      │
                   │                                                          │
  V6.6 Removal     │   cockpit/src/app/(app)/performance/page.tsx →           │
                   │      Redirect-Page mit Toast (1 Sprint), spaeter geloescht│
                   └────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                   ┌────────────────────────────────────────────────────────┐
                   │     Postgres (additive Migration MIG-032)                │
                   │                                                          │
                   │   ALTER user_settings ADD working_hours_start TIME NULL  │
                   │   ALTER user_settings ADD working_hours_end TIME NULL    │
                   │   CHECK (start IS NULL AND end IS NULL OR start < end)   │
                   │                                                          │
                   │   CREATE TABLE auto_winloss_runs (                       │
                   │     id, deal_id FK, target_status (won|lost),            │
                   │     triggered_at, triggered_by_user_id,                  │
                   │     bedrock_output TEXT, status pending|succeeded|failed │
                   │   )                                                      │
                   │                                                          │
                   │   INDEX idx_auto_winloss_runs_recent                     │
                   │     (deal_id, target_status, triggered_at DESC)          │
                   │                                                          │
                   │   audit_log (INSERT pro Auto-Trigger-Run, Pattern aus    │
                   │     V6.2 automation_runs)                                │
                   │                                                          │
                   │   automation_rules (Auto-Trigger ist System-Rule mit     │
                   │     trigger=deal.stage_changed +                         │
                   │     action_type=auto_winloss_extract, kein Custom-       │
                   │     Builder-Item)                                        │
                   └────────────────────────────────────────────────────────┘
```

### V6.6 Component-Detail — KI-Workspace (Foundation, SLC-661, DEC-165..168)

#### Reuse-Strategie (DEC-165)

EINE Component `<KIWorkspace>` mit Konfig-Prop, NICHT drei Implementierungen mit Pattern. Begruendung: visuelles Layout (Berichts-Buttons-Reihe + Frage-Eingabe + Antwort-Fenster) ist auf allen drei Hauptarbeitsplaetzen identisch. Unterschiede sind reine Daten-Konfiguration (Berichts-Liste, Kontext-Quelle, Voice-Routing-Pfad). Drift-Risiko bei drei Implementierungen ueber V7+ ist hoch — eine Component mit klarem Konfig-Surface bleibt wartbar.

**Component-Surface:**

```typescript
// cockpit/src/components/ki-workspace/types.ts
export type KIWorkspaceContext = "mein-tag" | "deal-detail" | "cockpit";

export interface KIWorkspaceReport {
  id: string;                       // z.B. "tagesanalyse", "briefing"
  label: string;                    // UI-Label, z.B. "Tagesanalyse"
  serverActionPath: string;         // Server-Action-Import-Pfad, z.B. "@/lib/ki-workspace/reports/tagesanalyse"
  cacheable: boolean;               // 5-min-Cache aktiv (DEC-166)
  // V7-Erweiterung: role_filter?: ("admin"|"employee"|"chef")[] (DEC-174)
}

export interface KIWorkspaceScope {
  userId: string;                   // immer gesetzt (V7-Multi-User-Kompatibilitaet)
  dealId?: string;                  // nur context="deal-detail"
  dateRange?: { start: Date; end: Date }; // optional cockpit-Forecast-Override
}

export interface KIWorkspaceProps {
  context: KIWorkspaceContext;
  reports: KIWorkspaceReport[];     // pro Aufruf, aus reports/registry.ts
  scope: KIWorkspaceScope;
  voiceEnabled: boolean;            // true in V6.6, in V7 evtl. role-conditional
}
```

**Reports-Registry pro Workspace-Typ:**

```typescript
// cockpit/src/components/ki-workspace/reports/registry.ts
export const MEIN_TAG_REPORTS: KIWorkspaceReport[] = [
  { id: "tagesanalyse", label: "Tagesanalyse", serverActionPath: ".../tagesanalyse", cacheable: true },
  { id: "gestern", label: "Gestern", serverActionPath: ".../gestern", cacheable: true },
  { id: "seit-login", label: "Seit Login", serverActionPath: ".../seit-login", cacheable: false },
  { id: "wochen-performance", label: "Wochen-Performance", serverActionPath: ".../wochen-performance", cacheable: true },
  { id: "pipeline-risiko", label: "Pipeline-Risiko", serverActionPath: ".../pipeline-risiko", cacheable: true },
];

export const DEAL_DETAIL_REPORTS: KIWorkspaceReport[] = [
  { id: "briefing", label: "Briefing", serverActionPath: ".../briefing", cacheable: true },
  { id: "signale", label: "Signale extrahieren", serverActionPath: ".../signale", cacheable: true },
  { id: "risiken", label: "Risiken & Einwaende", serverActionPath: ".../risiken", cacheable: true },
  { id: "naechster-schritt", label: "Naechster sinnvoller Schritt", serverActionPath: ".../naechster-schritt", cacheable: true },
  { id: "winloss", label: "Win/Loss-Analyse", serverActionPath: ".../winloss", cacheable: true },
];

export const COCKPIT_REPORTS: KIWorkspaceReport[] = [
  { id: "pipeline-snapshot", label: "Pipeline-Snapshot", ... },
  { id: "top-chancen", label: "Top-Chancen", ... },
  { id: "conversion-rate", label: "Conversion-Rate", ... },
  { id: "forecast", label: "Forecast", ... },
  { id: "winloss-aggregate", label: "Win/Loss-Analyse", ... },
  { id: "stagnierende-deals", label: "Stagnierende Deals", ... },
];
```

#### Bedrock-Call-Pattern (DEC-166)

**Synchroner Spinner+Result, KEIN SSE-Streaming in V6.6.** Begruendung: bestehende Bedrock-Pfade (FEAT-301 briefing, FEAT-412 signal-extract, FEAT-403 cockpit-LLM, FEAT-114 loss-analysis) liefern alle synchron. SSE-Streaming-UI (Token-Append + Partial-State-Error-Handling + Cancel-Pattern) ist eigener Slice — V6.6.x-Backlog (BL anlegen).

**Per-Berichts-Button-Flow:**
```
User-Klick auf [Berichts-Button-X]
       │
       ▼
KIWorkspace.handleReportClick(report)
       │
       ▼
useReportRun(reportId, scope) Hook
       │  - Cache-Check: getCached(reportId, hashScope, userId, 5min)
       │  - Bei Cache-Hit: render direkt
       ▼
Server-Action runReport(reportId, scope)
       │  - Lade Kontext (Deal-Activities ODER Tages-Aggregate ODER Account-Aggregate)
       │  - Build Bedrock-Prompt (Reuse FEAT-301/412/403/114)
       │  - Bedrock-Call (eu-central-1, audit_log-Insert)
       │  - Save Cache (in-Memory pro Server-Process, 5min TTL, scope-hash-key)
       ▼
return { markdown, completedAt, model, refreshable: true }
       │
       ▼
AnswerPane.tsx rendert Markdown + "Aktualisieren"-Button (cache-bypass)
```

**Cache-Strategie (DEC-180-Cockpit):** In-Memory pro Server-Process (Node-Module-Level Map), 5-min TTL, Key = `hash(report_id + JSON.stringify(scope) + user_id)`. Kein Redis, kein DB-Cache — Cockpit ist Single-User, in-Memory reicht. "Aktualisieren"-Button im Answer-Pane bypassed Cache.

#### Voice-Eingabe (DEC-167)

**Whisper-Adapter (existierend, EU-konform via Azure-Code-Ready aus V5.2) wird genutzt.** WebRTC-Audio-Capture-Logik wird aus `pipeline-suche` als neuer Hook `useVoiceCapture` extrahiert — keine duplizierte Implementierung.

```typescript
// cockpit/src/components/ki-workspace/hooks/useVoiceCapture.ts (NEU, extrahiert)
export function useVoiceCapture(): {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<string>; // returns transcribed text via Whisper
  error: string | null;
}
```

`pipeline-suche` wird in SLC-667 (KI-Inventur) entfernt — der Hook bleibt aber als gemeinsame Voice-Foundation. Bedrock-Stress-Test-Plan (R6) ist im Architecture-Risk-Mitigation-Block dokumentiert: V6.6-Internal-Test-Mode-Single-User hat ohnehin <5 Concurrent-Bedrock-Calls; Rate-Limit-Fallback ueber bestehenden Bedrock-Adapter-Retry-Pattern (V4.2 RAG).

#### Kontext-Scope (DEC-168)

Pro Berichts-Button laedt die Server-Action **explizit** den benoetigten Kontext. Kein impliziter "alles laden was gefunden werden kann"-Pfad. Quelle pro Workspace-Typ:

| Workspace | Kontext-Tabellen |
|---|---|
| Mein Tag | `deals` (eigene), `activities` (heute des Users), `tasks` (heute offen), `meetings` (heute) |
| Deal-Detail | `deals.[id]`, `activities` (deal_id), `tasks` (deal_id), `proposals` (deal_id), `companies/contacts` (via FK) |
| Cockpit | `deals` (account-weit), `pipeline_snapshots` (aktuell), `automation_runs` (last 30d, fuer Conversion-Rate), `auto_winloss_runs` (fuer Win/Loss-Aggregate) |

Server-Action-Naming-Convention: `cockpit/src/lib/ki-workspace/reports/<reportId>.ts` exportiert `runReport(scope: KIWorkspaceScope): Promise<ReportResult>`.

### V6.6 Component-Detail — Mein Tag (SLC-662, DEC-169)

#### /performance-Migration (R2 Mitigation)

Vorab-Inventur als Pflicht-Output von SLC-662, **bevor** /performance-Code-Loeschung erfolgt:

| /performance-Funktion | Mapping in V6.6 |
|---|---|
| Goal-Cards (Wochenziel + Forecast) | `[Wochen-Performance]`-Bericht im Mein-Tag-KI-Workspace |
| Wochen-Check (Soll-Ist Pipeline-Bewegung pro Tag) | `[Wochen-Performance]`-Bericht (gleicher Bericht, andere Sektion) |
| Tagesaufloesung (Stunden-Aktivitaet) | `[Tagesanalyse]`-Bericht (Sektion Aktivitaeten-Soll-Ist) |
| Forecast-Chart | `[Forecast]`-Bericht im Cockpit (FEAT-665), NICHT Mein Tag — User-Direktive: Forecast ist account-weite Sicht |
| KI-Empfehlungen pro Goal | Sektion 3 ("KI-Kommentar") des Tagesanalyse-Berichts |

**Migration-Pfad:** `/performance/page.tsx` wird zu Redirect-Page (1 Sprint Toast "Performance ist jetzt im Mein-Tag-KI-Workspace verfuegbar" → redirect /mein-tag). Nach REL-028 wird die Datei (V6.7+ als Cleanup-BL) komplett geloescht.

**KEINE Funktion darf wortlos verschwinden.** Mapping-Tabelle ist Teil der SLC-662-Acceptance-Criteria.

#### Layout-Erhaltung

4-Block-Layout bleibt: Aufgaben (links oben) + Top-Deals (rechts oben) + Kalender (rechts unten) + KI-Workspace (links unten). KI-Workspace-Block waechst von "Tagesanalyse-Button + Hint" zu Hybrid-Block.

Removed im DOM:
- "4 Hinweise"-Pill oben rechts (Wiedervorlagen sind Teil des Tagesanalyse-Berichts)
- "4 offene Punkte"-Zeile unter Kalender
- "Tagesanalyse starten"-Button mitten im Workspace (jetzt durch Berichts-Buttons + Antwort-Fenster ersetzt)
- Sidebar-Eintrag "Meine Performance"

### V6.6 Component-Detail — Deals-Listen-Seite (SLC-663, DEC-178)

Restructured Page mit 4 sichtbaren Bloecken:
1. **Type-Ahead-Suche** (Stammdaten: deals.title + companies.name + contacts.full_name, ILIKE-basiert in V6.6 — DEC-178; trigram-Index als BL falls Performance-Probleme bei >1000 Deals).
2. **Pipeline-Switcher** (Tabs/Dropdown, filtert alle drei darunter).
3. **Top-10-Block** (gewichtet: `value × probability DESC LIMIT 10`, server-side sortiert, Stages won/lost/parked ausgeschlossen).
4. **Karten-Grid** (aktive Deals, kompakt: Title + Wert + Firma + Stage-Badge + Naechste-Aktion mit relativem Datum + Wahrscheinlichkeit-Pill, KEIN Avatar/Foto).
5. **Einklappbare Sektionen** "Gewonnen" (last 90 Tage default + "Mehr anzeigen") und "Verloren" (gleiche Logik).

Klick auf Karte → `/deals/[id]` (Deal-Detail).

### V6.6 Component-Detail — Deal-Detail (SLC-664+665, DEC-170, DEC-179)

#### Layout-Swap (R3 Mitigation)

Konsolidierung von 3 KI-Modulen + 2 statischen Tabs zu **1 KI-Workspace + 4 Tabs**. Risk-Mitigation gegen Regression: SLC-664 inspiziert mind. 6 Components (DealBriefing, DealKnowledgeTab, SignalExtractAction, DealEditTab, DealTimeline, DealActivitySheet) und entfernt sie additiv mit Live-Smoke pro Sub-Block (Header → Action-Bar → KI-Workspace → Tabs). NICHT alles in einem Commit.

**Header (oben):**
- Title + Stage-Dropdown (direkter Wechsel ohne Confirm — DEC-179, Auto-Trigger laeuft im Hintergrund) + Wert (inline editable) + Prozess-Check-Pill (Click → Popover) + Edit-Pencil-Icon (oeffnet Drawer rechts — DEC-179, konsistent mit Sheet-Pattern) + Mein-Tag-Quick-Switch-Button.

**Action-Bar (Desktop):** 7 sichtbare Buttons (Task / E-Mail / Meeting-Dropdown / Anruf / Notiz / Angebot / Mehr-Menue). **Mobile (≤768px):** 5 Hauptbuttons sichtbar (Task/Mail/Meeting/Anruf/Notiz), Angebot+Mehr ins Dropdown — DEC-179.

**Hauptbereich (2/3 + 1/3):**
- **LINKS 2/3** = `<KIWorkspace context="deal-detail" reports={DEAL_DETAIL_REPORTS} scope={{userId, dealId}} />`
- **RECHTS 1/3** = Tabs (Timeline / Tasks / Proposals / Documents)

#### Activity-Sheet (DEC-170)

**Reuse Task-Sheet aus FEAT-302 (Mein Tag) mit Type-Erweiterung.** Task-Sheet wird zu generischem `<ItemSheet>` extrahiert (Refactor in SLC-665, gemeinsame Component).

```typescript
// cockpit/src/components/item-sheet/types.ts
export type ItemSheetData =
  | { kind: "task"; task: Task; ... }
  | { kind: "activity"; activity: Activity; bedrockSummary?: BedrockSummary; ... };

interface BedrockSummary {
  risiken?: string;
  einwaende?: string;
  naechsteSchritte?: string;
  teilnehmer?: string[];
  zusammenfassung?: string;
}
```

Sheet oeffnet immer (auch ohne Bedrock-Summary), zeigt kompakte Basis-Daten als Fallback (DEC-170). Sektionen Risiken/Einwaende/Naechste-Schritte/Teilnehmer/Zusammenfassung rendern conditional pro Activity-Type:

| Activity-Type | Bedrock-Summary | Sheet-Inhalt |
|---|---|---|
| meeting | ja (V4.3 FEAT-412 Signal-Extract + V5.6 Briefing) | volle Sektionen |
| email (lang) | ja (V4.3 Signal-Extract) | volle Sektionen |
| email (kurz / out-of-office) | nein | kompakte Basis-Daten + Auto-Reply-Hint |
| call | optional (Asterisk-Recording-Pipeline V5.1) | conditional |
| note | nein | kompakte Basis-Daten |

Sheet-Schliessen: X-Button + Klick ausserhalb + ESC-Key (Reuse Task-Sheet-Logik).

### V6.6 Component-Detail — Win/Loss-Auto-Trigger (SLC-665 Backend, DEC-171)

#### Trigger-Position (R4 Mitigation)

**Auto-Trigger ist neuer V6.2-Workflow-Action `auto_winloss_extract`**, NICHT direkter Hook in `pipeline.moveDealToStage`. Begruendung:
- V6.2-Workflow-Engine hat bereits Trigger `deal.stage_changed` + Action-Dispatch + Audit-Log-Symmetrie + Recursion-Guard (V6.2 DEC-129).
- System-Workflow-Rules (vom System angelegt, nicht via Builder) sind im Schema bereits moeglich. Win/Loss-Auto-Trigger wird als System-Rule angelegt:
  ```
  trigger:    deal.stage_changed
  filter:     new_stage_id IN (won_stage_id, lost_stage_id)
  action:     auto_winloss_extract
  is_system:  true (kein Builder-UI-Edit)
  ```
- Konsistente Audit-Sicht: alle Auto-Aktionen erscheinen als `automation_runs`-Eintrag im selben Cockpit-Bereich.

#### Idempotenz (DEC-171, R4 Mitigation)

Doppelter Schutz gegen Duplicate-Runs bei Stage-Toggling won → lost → won:

1. **Time-Window-Throttle 5 Min (App-Level):** Vor Insert in `auto_winloss_runs` SELECT auf:
   ```sql
   SELECT 1 FROM auto_winloss_runs
    WHERE deal_id = $1 AND target_status = $2
      AND triggered_at > NOW() - INTERVAL '5 minutes'
   ```
   Bei Hit → No-Op (skip Bedrock-Call).

2. **Recursion-Guard (V6.2-Pattern):** Auto-Trigger setzt `triggered_by_user_id=NULL + triggered_by_system=true` Flag. Workflow-Engine erkennt Self-Trigger und stoppt — keine Ketten-Kaskade.

Stage-Toggling won → lost → won innerhalb 5 Min triggert genau **2 Auto-Runs** (won + lost), nicht 3 (zweiter won wird durch Time-Window-Throttle geblockt).

#### Schema (siehe MIG-032)

Neue Tabelle `auto_winloss_runs` speichert:
- Identifikation: `id`, `deal_id` (FK CASCADE), `target_status` (CHECK won|lost), `triggered_at`, `triggered_by_user_id` (NULL fuer Auto)
- Bedrock-Output: `bedrock_output TEXT` (Markdown-Antwort), `bedrock_model TEXT`, `bedrock_completed_at TIMESTAMPTZ`
- Status: `status TEXT CHECK (status IN ('pending','succeeded','failed'))`, `error_message TEXT`

Indizes: `(deal_id)` Standard + `(deal_id, target_status, triggered_at DESC)` fuer Time-Window-Lookup.

KEIN UNIQUE-Constraint auf (deal_id, target_status) — Stage-Toggling-Edge-Cases ueber lange Zeit erlauben mehrere echte Runs (z.B. won 2026-05 → reopened lost 2026-06 → won 2026-07). Idempotenz nur ueber 5-Min-Window.

#### Read-API-Pattern (DEC-171, F11)

Konsistent mit V6.2 FEAT-622 (Campaign-Read-API):

```
GET /api/winloss/[deal_id]
Authorization: bearer $EXPORT_API_KEY (oder Cookie-Session, je nach Caller)

Response (latest run):
{
  "deal_id": "...",
  "target_status": "won|lost",
  "triggered_at": "ISO",
  "bedrock_output": "<markdown>",
  "model": "claude-sonnet-...",
  "completed_at": "ISO",
  "status": "succeeded"
}
```

Intelligence-Studio pollt diese API. Auto-Trigger schreibt nur lokal — Studio fragt aktiv ab.

#### Manueller Re-Run (DEC-171, F32)

Berichts-Button `[Win/Loss-Analyse]` im Deal-KI-Workspace (FEAT-664) triggert dieselbe Bedrock-Pipeline wie Auto-Trigger — gleicher Prompt, gleicher Output-Pfad. Manueller Re-Run nur, wenn letzter Run aelter als 24h (cache-hit sonst). "Erneut analysieren"-Button im Antwort-Fenster overrided 24h-Cache.

### V6.6 Component-Detail — Cockpit (SLC-666, DEC-180)

#### Layout (Mein-Tag-Pattern)

- Title: "KI-Analyse-Cockpit" (war: "Dashboard")
- Action-Bar oben (kontextlos): Task / E-Mail / Meeting / Anruf / Notiz
  - **Anruf-Button kontextlos (DEC-180):** oeffnet Kontakt-Picker-Dialog → User waehlt Kontakt → Click-to-Call (V5.1-Pfad)
- Hauptbereich 2/3 + 1/3:
  - **LINKS 2/3** = `<KIWorkspace context="cockpit" reports={COCKPIT_REPORTS} scope={{userId}} />`
  - **RECHTS 1/3** = Kalender (Reuse `<KalenderClient>`, Default-Range 06:00–21:00 aus FEAT-662)

#### Removed im DOM

- KPI-Cards (Pipeline-Wert / Conversion / Forecast etc.)
- Top-Chancen-Tabelle (server-side gerendert)
- DashboardSearch-Component

#### Pipeline-Switcher im Top-Chancen-Bericht (DEC-180, F27)

Pipeline-Switcher ist **Tab im Antwort-Fenster** (in-place innerhalb Bedrock-Antwort), kein neuer Bedrock-Call wenn Daten gecached:
- Bedrock-Antwort enthaelt Daten fuer alle Pipelines
- Tab-Wechsel rendert nur die jeweilige Sektion (clientseitig)
- Kein Re-Bedrock-Call bei Tab-Wechsel

### V6.6 Component-Detail — KI-Inventur (SLC-667, DEC-175, DEC-176-Sidebar)

#### Sparkles-Cards entfernen
- Firmen-Detail-Page: `<SparklesCard>` entfernt (Placeholder seit V3.1, leerer KI-Block)
- Kontakte-Detail-Page: `<SparklesCard>` entfernt
- Code-Cleanup: ungenutzte Server-Actions identifizieren + entfernen

#### "KI-Reife" → "AI-Bereitschaft" (DEC-175)

UI-Label-Map zentral:
```typescript
// cockpit/src/lib/labels/ki-readiness.ts (NEU)
export const KI_READINESS_LABEL = "AI-Bereitschaft";
export const KI_READINESS_OPTIONS = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
} as const;
```

**Schema-kompatibel** — DB-Spaltenname `ai_readiness` (oder vorhandener Name) bleibt. E-Mail-Template-Variablen-Tag bleibt schema-kompatibel; falls "ki-reife" als Variable-Tag genutzt wird, wird sie als Alias zu `ai_readiness` gehalten (Reverse-Lookup im Template-Renderer). Keine Migration noetig.

#### Pipeline-NL-Suche → Type-Ahead

`/pipeline-suche` (oder Pipeline-Search-Block mit NL-Adapter) → ersetzt durch Type-Ahead-Pattern aus FEAT-663. Such-Quellen: deals.title + companies.name + contacts.full_name. NL-Frage-Eingabe lebt nur noch im KI-Workspace.

`useVoiceCapture`-Hook bleibt (extrahiert in SLC-661), `pipeline-suche`-Component wird entfernt.

#### Sidebar-Reorder (DEC-176, R5 Mitigation)

```
ANALYSE                       (NEU als Sektion-Header, subtle text-muted-foreground caps)
- Dashboard

OPERATIV                      (NEU als Sektion-Header)
- Mein Tag
- Focus
- Kalender

ARBEITSBEREICHE               (NEU als Sektion-Header)
- Deals
- Pipeline
- Firmen
- Kontakte
- Multiplikatoren

VERWALTUNG                    (UNVERAENDERT, bleibt bestehend, V7-Item)
- ... (bestehende Eintraege)
```

R5-Mitigation: nur Reorder + 1 Eintrag-Removal (Performance), KEINE Eintrag-Umbenennungen, KEINE Icon-Wechsel. User-Mental-Model bleibt durch identische Labels stabil.

#### Working-Hours-Setting (DEC-172)

`user_settings`-Tabelle (V4.1 + V5.6-Briefing) wird additiv erweitert um:
- `working_hours_start TIME NULL`
- `working_hours_end TIME NULL`
- CHECK: `(working_hours_start IS NULL AND working_hours_end IS NULL) OR (working_hours_start < working_hours_end)`

Settings-Sektion `/settings/working-hours` mit zwei TimePicker-Inputs + Save-Server-Action.

Toggle "Voller Tag / Nur Arbeitstag" persistiert in **localStorage pro User** (DEC-172): `localStorage.setItem('cockpit:kalender:working-hours-toggle:' + userId, 'full'|'work')`. Default "Voller Tag" wenn keine Working-Hours gesetzt. Toggle disabled mit Hint, wenn DB-Werte fehlen.

`kalender-client.tsx` Hartkodierung 07:00–20:00 → Konstante `DEFAULT_HOUR_RANGE = { start: 6, end: 21 }` (DEC-172). Bei gesetzten Working-Hours zeigt Kalender den Arbeits-Bereich; Termine ausserhalb bleiben sichtbar als gestauchter Pre/Post-Bereich (UX: 1px-Linien-Trenner + reduzierte Hoehe).

### V6.6 Data Flow

#### Berichts-Button-Click-Flow (alle 3 Workspaces)

```
User-Klick [Berichts-Button-X]
       │
       ▼
KIWorkspace.handleReportClick(reportId, scope)
       │
       ▼
useReportRun Hook
   ├─ Cache-Hit (<5min)? -> render direkt
   └─ Cache-Miss
       │
       ▼
Server-Action runReport(reportId, scope)
       │
       ▼
Kontext laden (deals/activities/tasks/proposals je nach Workspace-Typ)
       │
       ▼
Bedrock-Prompt bauen (Reuse FEAT-301/412/403/114-Logik)
       │
       ▼
Bedrock-Call (eu-central-1) + audit_log INSERT
       │
       ▼
Cache speichern (in-Memory, 5min TTL, key=hash(reportId, scope, userId))
       │
       ▼
return { markdown, completedAt, model }
       │
       ▼
AnswerPane rendert Markdown + "Aktualisieren"-Button
```

#### Win/Loss-Auto-Trigger-Flow (SLC-665)

```
User wechselt Stage auf won (oder lost)
       │
       ▼
pipeline.moveDealToStage(dealId, newStageId)
       │
       ▼ (V6.2-Workflow-Dispatcher, bestehend)
automation-engine fires trigger=deal.stage_changed
       │
       ▼
matchRules() findet System-Rule "auto_winloss_extract"
       │
       ▼
auto_winloss_extract.run(dealId, target_status='won'|'lost')
       │
       ▼
Time-Window-Check (5min)
   ├─ recent run vorhanden? -> No-Op + audit_log "skipped:recent_run"
   └─ kein recent run
       │
       ▼
INSERT auto_winloss_runs (status='pending')
       │
       ▼
Bedrock-Call (FEAT-114-Loss-Analysis-Logic, gleicher Prompt fuer won/lost)
       │
       ▼
UPDATE auto_winloss_runs SET bedrock_output=..., status='succeeded'
       │
       ▼
INSERT automation_runs + audit_log (event_type='auto_winloss_triggered')
       │
       ▼ (Read-API verfuegbar fuer Intelligence-Studio)
GET /api/winloss/[dealId] (jederzeit pollbar)
```

#### Activity-Sheet-Open-Flow (Deal-Detail, SLC-665)

```
User klickt auf Activity in Timeline (Deal-Detail Tabs > Timeline)
       │
       ▼
ItemSheet.open({ kind: "activity", activityId })
       │
       ▼
Server-Action loadActivityWithBedrockSummary(activityId)
       │  (lookup activity + ggf. signal-extract-output + meeting-briefing-output)
       ▼
return ActivitySheetData mit BedrockSummary?
       │
       ▼
ItemSheet rendert Sektionen conditional:
   - Risiken (wenn vorhanden)
   - Einwaende (wenn vorhanden)
   - Naechste Schritte (wenn vorhanden)
   - Teilnehmer (immer fuer Meetings, optional sonst)
   - Zusammenfassung (Bedrock-Output, wenn vorhanden)
   - Basis-Daten (immer)
```

### V6.6 External Dependencies

**KEINE neuen Dependencies.** V6.6 nutzt:
- Bestehende Bedrock-Adapter (eu-central-1, FEAT-301/412/403/114-Pfade)
- Bestehender Whisper-Adapter (V5.2, EU-konform Code-Ready)
- Bestehende V6.2-Workflow-Engine (FEAT-621 automation_rules + automation_runs + dispatcher)
- Bestehende `audit_log`-Tabelle
- Bestehende Postgres + Supabase + Coolify-Infra
- Bestehende Style Guide V2 Brand-Tokens (V6.5)
- Bestehende `<KalenderClient>`-Component (V3 + V6.1 Premium-UI)

### V6.6 Security & Privacy Considerations

- **Voice-Eingabe in 3 Hauptarbeitsplaetzen.** Whisper-Adapter (Azure-EU-Code-Ready aus V5.2) ist vorgeschrieben. Production-Switch auf Azure-EU bleibt Pre-Production-Compliance-Gate (User-Direktive 2026-05-01).
- **Bedrock-Calls steigen.** Pro User-Tag potenziell 5-10 Berichts-Buttons × 3 Workspaces × Mehrfach-Klicks. 5-min-Cache reduziert Last. Audit-Log persistent pro Bedrock-Call.
- **Win/Loss-Auto-Trigger schreibt in audit_log + auto_winloss_runs.** Intelligence-Studio liest via Read-API mit Bearer-Auth (EXPORT_API_KEY-Pattern aus V6.2). Kein PII-Leak ueber API-Boundary — Bedrock-Output ist Deal-spezifisch + zugriffsbeschraenkt.
- **Working-Hours-Setting ist user_id-scoped.** V7-Multi-User-kompatibel. Keine globalen Konfig-Flags.
- **Activity-Sheet zeigt Bedrock-Output (Risiken/Einwaende/Zusammenfassung).** Output ist already audit-loggable (V4.3 + V5.6). Sheet liest, schreibt nicht.
- **Internal-Test-Mode bleibt aktiv.** Compliance-Sprint kommt separat spaeter.

### V6.6 Constraints & Tradeoffs

- **Eine Component vs drei Implementierungen (DEC-165):** Eine Component mit Konfig zentralisiert Wartung, kostet aber initial mehr Engineering-Zeit fuer Prop-Surface-Design. **Tradeoff:** kurzfristig +30min vs langfristig drift-frei.
- **Synchroner Bedrock-Call vs SSE-Streaming (DEC-166):** Sync ist Reuse aller bestehenden Pfade, einfacher zu testen. **Tradeoff:** UX gefuehlt langsamer (Spinner statt Token-Stream), aber fuer V6.6-Internal-Test-Mode-Single-User akzeptabel.
- **Activity-Sheet als Reuse von Task-Sheet (DEC-170):** Type-Erweiterung statt neue Component. **Tradeoff:** Type-Discriminator-Komplexitaet vs Component-Drift-Vermeidung.
- **Auto-Trigger als Workflow-Action (DEC-171):** Konsistent mit V6.2-Audit-Sicht. **Tradeoff:** mehr Indirektion vs Audit-Symmetrie.
- **5-Min-Time-Window vs UNIQUE-Constraint (DEC-171):** Time-Window erlaubt sinnvolle Re-Runs ueber lange Zeit, UNIQUE waere zu hart. **Tradeoff:** App-Level-Check noetig vs DB-Garantie.
- **/performance-Redirect statt sofortige Loeschung (DEC-169):** 1-Sprint Toast als Migration-Bruecke. **Tradeoff:** zusaetzlicher Code in V6.6 vs sauberer User-Migrations-Pfad.
- **localStorage-Toggle vs DB-Setting (DEC-172):** localStorage ist roundtrip-frei aber per-Browser. **Tradeoff:** UX vs Multi-Device-Konsistenz. Single-User-Mode entscheidet pro localStorage.
- **In-Memory-Cache vs Redis (DEC-180):** Module-Level-Map ist trivial, ueberlebt aber Container-Restart nicht. **Tradeoff:** Setup-Aufwand vs Single-User-Last-Profil. Akzeptabel.

### V6.6 Risk Mitigation Plans

**R1 — KI-Workspace-Reuse-Komplexitaet:** **Mitigation:** Eine Component mit klar definierter Konfig-Surface (siehe DEC-165 + Component-Surface-Block oben). Slice-Reihenfolge SLC-661 zuerst — Component-Foundation isoliert ohne Caller getestet. SLC-662/664/666 nutzen die Component. Drift-Risiko reduziert auf ein Refactor-Punkt.

**R2 — /performance-Migration-Datenverlust:** **Mitigation:** Vorab-Mapping-Tabelle (siehe Component-Detail Mein Tag). SLC-662-Acceptance-Criteria enthalten den Mapping-Check. Redirect-Toast (1 Sprint) als User-Migrations-Bruecke. KEINE Funktion wortlos verschwunden.

**R3 — Deal-Detail-Layout-Swap-Regression:** **Mitigation:** Slice-Schnitt feiner — SLC-664 macht Layout-Swap (Header + Action-Bar + KI-Workspace + Tabs + 4 KI-Module-Removal), SLC-665 macht Activity-Sheet + Win/Loss-Auto-Trigger separat. Live-Smoke nach jedem Sub-Block. Atomic Commits pro Sub-Block.

**R4 — Win/Loss-Auto-Trigger duplicate runs:** **Mitigation:** Doppelter Schutz — Time-Window-Throttle (5 Min App-Level) + V6.2-Workflow-Recursion-Guard. Idempotenz-Test in Vitest mit Time-Mock + Live-Smoke (Stage-Toggling won → lost → won → audit_log zaehlen).

**R5 — Sidebar-Reorder bricht User-Mental-Model:** **Mitigation:** Nur Reorder + 1 Removal (Performance). KEINE Eintrag-Umbenennungen, KEINE Icon-Wechsel. VERWALTUNG bleibt 1:1. User sieht dieselben Labels und Icons, nur in neuer Sektion.

**R6 — Voice-Eingabe ohne Bedrock-Stress-Test:** **Mitigation:** Internal-Test-Mode-Single-User hat <5 Concurrent-Bedrock-Calls. Bestehende Bedrock-Adapter-Retry-Logic (V4.2 RAG) faengt Rate-Limits. Voice-Pfad nutzt bestehenden Whisper-Adapter (kein neuer Provider). Stress-Test-Plan: Live-Smoke mit 3 schnell-aufeinanderfolgenden Voice-Eingaben (<10s Abstand) zeigt Adapter-Verhalten.

### V6.6 Empfohlene Slice-Reihenfolge (DEC-176)

| Slice | Feature | Scope | Schaetzung | QA-Fokus | Reihenfolge-Pflicht |
|---|---|---|---|---|---|
| **SLC-661** | FEAT-661 (Foundation) | `<KIWorkspace>` Component + types + reports/registry + useReportRun + useVoiceCapture + AnswerPane (KEINE Caller, isoliert getestet) | 3-4h | Component-rendert mit Mock-Reports, Vitest fuer Hook-Logic, kein Bedrock-Live-Call noetig | **MUSS zuerst** (Foundation) |
| **SLC-662** | FEAT-661 (Mein Tag) | Mein-Tag-Page nutzt `<KIWorkspace context="mein-tag">` + 5 Berichts-Buttons + Performance-Migration (Mapping-Doc + Redirect-Page) + 4-Hinweise/Punkte/Tagesanalyse-Button-Removal + Sidebar-"Performance"-Eintrag-Removal | 3-4h | Live-Smoke 5 Berichts-Buttons, /performance-Redirect verifiziert, DOM-Removal-Asserts | nach SLC-661 |
| **SLC-663** | FEAT-663 (Deals-Liste) | Top-10-Block + Karten-Grid + 2 Sektionen + Type-Ahead + Pipeline-Switcher | 2-3h | Live-Smoke 1 Pipeline-Wechsel + 1 Type-Ahead-Suche, Mobile-Responsive | parallel zu SLC-664 OK (kein KI-Workspace) |
| **SLC-664** | FEAT-664 (Deal-Detail) | Header-Restruktur + Action-Bar + 2/3-1/3-Layout + `<KIWorkspace context="deal-detail">` + 3-KI-Module-Removal (Briefing-Sidebar + Wissen-Tab + Signale-Action) + Edit-Tab-Removal (Pencil-Drawer) | 3-4h | Live-Smoke 5 Berichts-Buttons + Pencil-Drawer + Stage-Wechsel + Mein-Tag-Quick-Switch | nach SLC-661 |
| **SLC-665** | FEAT-664 (Sheet) + FEAT-666 (Auto-Trigger) | Activity-Sheet (Reuse Task-Sheet als `<ItemSheet>`) + Win/Loss-Auto-Trigger (Workflow-Action + auto_winloss_runs-Tabelle + Read-API) | 3-4h | Vitest fuer Idempotenz-Time-Window + Live-Smoke Stage-Toggling won → lost → won + Activity-Sheet rendert Risiken/Einwaende | nach SLC-664 |
| **SLC-666** | FEAT-665 (Cockpit) | Dashboard zu KI-Analyse-Cockpit mit `<KIWorkspace context="cockpit">` + Action-Bar + Kalender-rechts + KPI-Cards/Top-Chancen-Tabelle/DashboardSearch-Removal + Anruf-Kontakt-Picker | 2h | Live-Smoke 6 Berichts-Buttons + Pipeline-Switcher-Tab im Top-Chancen-Bericht + Anruf-Picker | nach SLC-661, parallel zu SLC-664/665 OK |
| **SLC-667** | FEAT-666 (Hygiene) + FEAT-662 (Kalender) | Sparkles-Cards-Removal + AI-Bereitschaft-Rename (UI-Label-Map) + NL-Suche zu Type-Ahead + Sidebar-Reorder + Kalender-Range 06:00-21:00 + Working-Hours-Setting + Toggle | 2-3h | DOM-Removal-Asserts + Sidebar-Reorder-Visual + Working-Hours-Save+Read in Settings | nach SLC-666 (letzter Slice) |

**Gesamt ~17-24h** (16-26h Spannweite). Reihenfolge zwingend:
1. **SLC-661** (Foundation, MUSS zuerst — alle anderen bauen drauf auf)
2. **SLC-662** (Mein Tag, erster Caller — verifiziert Component im Live-Einsatz)
3. **SLC-663** (Deals-Liste, parallelisierbar — kein KI-Workspace-Touch)
4. **SLC-664** (Deal-Detail, zweiter Caller)
5. **SLC-665** (Activity-Sheet + Auto-Trigger, MUSS nach SLC-664 — braucht neuen Deal-Detail-Layout)
6. **SLC-666** (Cockpit, dritter Caller)
7. **SLC-667** (Hygiene + Kalender, letzter Slice — danach Gesamt-QA)

Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy (User-deploy). Nach SLC-667: Gesamt-`/qa` V6.6 -> `/final-check` -> `/go-live` -> `/deploy` als REL-028.

### V6.6 Release-Gate (DEC-176)

V6.6 gilt als releaseable wenn alle 7 Bedingungen erfuellt:
- `<KIWorkspace>` Component im Einsatz auf Mein Tag, Deal-Detail, Dashboard (drei Caller, gleiche Component)
- /performance-Page entfernt oder Redirect aktiv, Sidebar-Eintrag "Meine Performance" weg
- Deal-Detail hat 1 KI-Workspace statt 3 KI-Modulen + Edit-Pencil-Drawer + Activity-Sheet (Reuse Task-Sheet)
- Win/Loss-Auto-Trigger feuert bei Stage-Wechsel won/lost, Idempotenz-Test (Stage-Toggling-Smoke) PASS
- Sidebar-Reorder live (ANALYSE/OPERATIV/ARBEITSBEREICHE), VERWALTUNG unangetastet
- Kalender-Range 06:00-21:00 + Working-Hours-Setting + Toggle live
- Vitest gruen + Live-Smoke 7 Pages PASS (Mein Tag, /deals, /pipeline, ein Deal-Detail mit Activity-Sheet, Dashboard, Kalender, ein Won-Stage-Wechsel mit Auto-Trigger-Verifikation in audit_log)
- 0 neue Regressions auf V6.0..V6.5-Funktionalitaet

### V6.6 Open Technical Questions (fuer /slice-planning)

1. **Bestehende Bedrock-Pfade pro Berichts-Button verifizieren:** Welche Server-Action existiert schon, welche muss neu gebaut werden? Mein-Tag-Tagesanalyse + Deal-Briefing + Signal-Extract + Loss-Analysis sind bestaetigt vorhanden — Wochen-Performance, Pipeline-Risiko, Top-Chancen, Conversion-Rate, Forecast, Stagnierende Deals brauchen Pfad-Verifikation. Empfehlung: in SLC-661 Mock-Server-Actions als Stubs anlegen, in SLC-662/664/666 verdrahten.

2. **Task-Sheet → ItemSheet-Refactor-Scope:** Aktuelles Task-Sheet (FEAT-302) hat eigene Component-Datei. SLC-665 muss das in `<ItemSheet>` mit Type-Discriminator extrahieren. Empfehlung: in SLC-665 als ersten Schritt Refactor-Commit (Reine Extraktion, keine Verhaltens-Aenderung), danach Activity-Sheet-Variante hinzufuegen.

3. **V6.2-Workflow-Engine System-Rule-Anlage:** auto_winloss_extract-Action ist neuer Action-Type. Slice-Planning klaert: wird Action-Type in Code-Konstante registriert (`automation/actions.ts`) oder via Migration in Tabelle gespeichert? Empfehlung: Code-Konstante, da System-Rule (kein Builder-UI-Zugriff).

4. **Pencil-Drawer vs Modal Spezifikation:** DEC-179 sagt Drawer (rechts ausfahrend). Slice-Planning klaert: bestehende Drawer-Component (von Tasks-Sheet) reusable oder neue? Empfehlung: gleiche `<Sheet>`-Library wie Task-Sheet (Vaul oder shadcn-Sheet, je nach aktuellem Stack).

5. **Cache-Invalidierung bei /performance-Bericht-Aenderung:** Wenn User in Settings Working-Hours aendert, muss Wochen-Performance-Bericht-Cache invalidiert werden? Empfehlung: nein, 5-min-Cache laeuft ohnehin ab. Bei expliziter Wartung "Aktualisieren"-Button.

6. **Sidebar-Sektion-Header-Visual:** subtle font-medium text-muted-foreground caps oder schmalere Variante? Style-Guide-V2-Konsistenz. Empfehlung: bestehende Sidebar-Headers-Pattern aus Onboarding-Plattform-Referenz pruefen.

7. **Coolify-Deploy-Sequenz:** Slices SLC-661..667 sind 7 separate Deploys. User-Direktive: pro Slice deploy + smoke. SLC-665 ist einziger Backend-Slice (MIG-032 muss vor SLC-665 angewendet werden). Empfehlung: MIG-032 als ersten SLC-665-Schritt anwenden, vor Workflow-Action-Code-Deploy.

### V6.6 Recommended Next Step

`/slice-planning V6.6` — die 7 Slices SLC-661..667 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Insbesondere:
- SLC-661: Component-API-Surface + Reports-Registry-Stubs + Hook-Vitest-Setup
- SLC-662: /performance-Mapping-Tabelle als Pflicht-Output, Redirect-Toast-Implementierung
- SLC-664: 4 Sub-Block-Reihenfolge (Header → Action-Bar → KI-Workspace → 3-KI-Module-Removal) mit Live-Smoke pro Sub-Block
- SLC-665: ItemSheet-Refactor-First-Commit + auto_winloss_runs-MIG-032-Apply-First + Vitest fuer Time-Window-Idempotenz
- SLC-667: Sparkles-Removal-Liste exakt benennen (Pages + Component-Imports), AI-Bereitschaft-Label-Map-Pfad, kalender-client.tsx-Range-Konstante

## V7 — Multi-User + Teamlead Architecture

### V7 Strategy

V7 hebt das System von Single-User-Admin (V1..V6.6) zu **Multi-User mit 3 flachen Rollen** (`admin` / `teamlead` / `member`) innerhalb einer Coolify-Instanz. Daten-Isolation per Owner + RLS, Aggregat-Sicht fuer Teamlead, rollen-konditionale Sidebar inkl. Mobile-Hamburger.

Der Sprung ist Architektur-praegend: alle 8 Kerntabellen bekommen `owner_user_id`, alle Server Actions werden owner-aware, RLS-Policies erzwingen die Daten-Trennung hart. KI-Features (Workflow-Automation, RAG-Suche, Auto-Winloss) werden mit klar definierter Sichtbarkeits-Stufe versehen. Bestehende KI-Features bleiben funktional, werden aber im Team-Kontext "team-shared" (V7-Vereinfachung, siehe DEC-185).

**V7-Leitprinzipien:**
- **Hard Isolation:** Daten-Trennung passiert in RLS, nicht im Code. Code-Bugs duerfen nie zu Cross-Owner-Lecks fuehren.
- **Manual-First:** Kein Auto-Routing in V7 (DEC-181). Owner wird beim Anlegen gesetzt oder per Bulk-Reassign neu zugewiesen.
- **Single Team per Instance:** 1 Coolify-Deployment = 1 Steuerberater-Kanzlei = 1 Team. Multi-Tenancy (mehrere Teams pro Instanz) ist V8+ und bewusst out-of-scope.
- **Aggregate Slice on top:** `/team`-Page laeuft mit normalen RLS-Queries (Teamlead sieht durch RLS bereits alle Team-Owner-Daten); kein separater Service noetig.
- **Read-Only Drilldown:** Teamlead darf Member-Cockpit sehen, nie editieren — Server-Side-Guard `assertNotReadOnlyContext()`.

### V7 Components Affected

```
Browser (HTTPS)
  │
  ├─ business.<tenant>.strategaizetransition.com
  │
Coolify / Caddy
  │
Next.js App (BD Cockpit)
  │
  ├── (authenticated)/layout.tsx (V7 erweitert)
  │   ├── getProfile() → {role, team_id, user_id}                  ─── V7 NEU: role-aware
  │   ├── <Sidebar role={role} /> (rollen-konditional, V7 NEU)
  │   ├── <MobileTopBar /> (V7 NEU, <768px Hamburger)
  │   └── assertRole([...]) Helper fuer Page-Layouts (V7 NEU)
  │
  ├── (authenticated)/team/page.tsx (V7 NEU — Aggregat-Cockpit)
  ├── (authenticated)/team/[user_id]/...                            ─── V7 NEU: Drilldown read-only
  │   ├── mein-tag/page.tsx (Read-Only-Variant)
  │   ├── pipeline/page.tsx (Read-Only-Variant)
  │   └── aktivitaeten/page.tsx (Read-Only-Variant)
  │
  ├── (authenticated)/settings/team/page.tsx (V7 NEU — Verwaltungs-UI)
  │   ├── Mitglieder-Tabelle + Invite-Button
  │   ├── Rolle-aendern (Admin-only)
  │   └── Bulk-Reassign-Werkzeug
  │
  ├── /lib/auth/ (V7 NEU)
  │   ├── get-profile.ts (resolved role + team_id + user_id server-side)
  │   ├── assert-role.ts (role-Guard fuer Pages + Server Actions)
  │   ├── read-only-context.ts (Drilldown-Marker + assertNotReadOnlyContext)
  │   └── invite.ts (Supabase Auth-Invite + Profile-Insert)
  │
  ├── /lib/navigation/sidebar-config.ts (V7 NEU)
  │   └── const SIDEBAR_CONFIG: SidebarItem[] mit visibleFor: Role[]
  │
  ├── /lib/team/ (V7 NEU)
  │   ├── aggregate-queries.ts (Team-KPI + Mitglieder-Liste + Drilldown-Daten)
  │   └── bulk-reassign.ts (Transaktion + Audit-Trail)
  │
  ├── Server Actions (V7 erweitert)
  │   ├── ~80 bestehende Actions bekommen owner_user_id-Bewusstsein
  │   ├── Insert: setzt owner_user_id = auth.uid() falls nicht uebergeben
  │   ├── Update/Delete: RLS uebernimmt Owner-Check
  │   └── In Drilldown-Modus: assertNotReadOnlyContext() blockiert Mutate
  │
  └── middleware.ts (V7 erweitert)
      └── Rollen-konditionale Route-Schutz (z.B. /workflow nur admin/teamlead)

Supabase Stack
  │
  ├── Postgres
  │   ├── teams (V7 NEU)
  │   ├── profiles + role-Check-Enum + team_id-FK (V7 erweitert)
  │   ├── 8 Kerntabellen + owner_user_id (V7 erweitert)
  │   ├── RLS-Policies neu (V7 ersetzt authenticated_full_access)
  │   ├── Helper-SQL-Functions: is_admin(), is_teamlead(), get_my_team_id() (V7 NEU)
  │   └── Indizes auf owner_user_id pro Kerntabelle
  │
  ├── GoTrue
  │   ├── Auth-Invite via supabase.auth.admin.inviteUserByEmail() (V7 nutzt)
  │   └── Session-Cookies (bestehend)
  │
  └── Storage (unveraendert)

Docker Network: business-net (unveraendert)
```

### V7 Data Model

Drei Migrationen, dreiphasig fuer sichere Apply-Reihenfolge:

#### MIG-033 — Schema (Phase A)
- `teams` Tabelle anlegen (`id UUID PK`, `name TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`).
- `profiles.role` bekommt CHECK-Constraint `CHECK (role IN ('admin','teamlead','member'))`. Default bleibt `'admin'` (Backwards-kompatibel fuer User Immo).
- `profiles.team_id UUID REFERENCES teams(id) ON DELETE SET NULL` als neue Spalte (nullable; pre-Backfill).
- `profiles.team TEXT` bleibt als deprecated-Spalte erhalten (Daten-Lese-Pfad in Code wird auf `team_id` umgestellt; physisches Drop in spaeterer V7.x-Cleanup-MIG, nicht V7).
- `owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL` als ADD COLUMN auf 8 Kerntabellen:
  - `companies`, `contacts`, `deals`, `activities`, `meetings`, `proposals`, `email_messages`, `calls`.
  - Nullable in MIG-033, NOT NULL nach MIG-034-Backfill in MIG-035 (mit `SET NULL`-Fallback fuer System-Records ohne User-Kontext).
- Indizes pro Tabelle: `CREATE INDEX IF NOT EXISTS idx_<table>_owner_user_id ON <table>(owner_user_id);`.
- `audit_log.view_as_target_user_id UUID` neue Spalte fuer Drilldown-Audit (nullable).

#### MIG-034 — Backfill (Phase B)
- `INSERT INTO teams (name) VALUES ('Strategaize') ON CONFLICT DO NOTHING;` — Default-Team fuer Bestands-Instanz Immo.
- `UPDATE profiles SET team_id = (SELECT id FROM teams WHERE name='Strategaize') WHERE team_id IS NULL;`
- `UPDATE profiles SET team_id = ... WHERE team = '...' AND team_id IS NULL;` — falls bestehende `team TEXT`-Werte existieren, gemappt auf neue `team_id`.
- `UPDATE <table> SET owner_user_id = (SELECT id FROM profiles WHERE role='admin' LIMIT 1) WHERE owner_user_id IS NULL;` fuer alle 8 Kerntabellen.
- Verifikation: `SELECT 'companies', COUNT(*) FROM companies WHERE owner_user_id IS NULL UNION ALL SELECT 'contacts', ...` MUSS 0 ueber alle 8 Tabellen liefern.
- Audit-Eintrag: `INSERT INTO audit_log (event, payload) VALUES ('v7_backfill_complete', '{"affected_rows": <sum>}');`.

#### MIG-035 — RLS Switch (Phase C)
- Helper-SQL-Functions:
  ```sql
  CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
    SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
  $$;
  CREATE OR REPLACE FUNCTION is_teamlead() RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
    SELECT role = 'teamlead' FROM profiles WHERE id = auth.uid();
  $$;
  CREATE OR REPLACE FUNCTION get_my_team_id() RETURNS UUID LANGUAGE SQL STABLE AS $$
    SELECT team_id FROM profiles WHERE id = auth.uid();
  $$;
  CREATE OR REPLACE FUNCTION can_see_owner(target_owner UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
    SELECT is_admin()
      OR target_owner = auth.uid()
      OR (is_teamlead() AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = target_owner AND team_id = get_my_team_id()
         ));
  $$;
  ```
- Pro Kerntabelle ersetzt MIG-035 die alte `authenticated_full_access`-Policy durch 4 neue:
  - `SELECT` USING `can_see_owner(owner_user_id) OR (is_admin() AND owner_user_id IS NULL)`.
  - `INSERT` WITH CHECK `owner_user_id = auth.uid() OR is_admin() OR (is_teamlead() AND EXISTS ...)`.
  - `UPDATE` USING `can_see_owner(owner_user_id)` WITH CHECK `can_see_owner(owner_user_id)`.
  - `DELETE` USING `owner_user_id = auth.uid() OR is_admin() OR (is_teamlead() AND can_see_owner(owner_user_id))`.
- Bulk-Reassign nutzt einen `SET LOCAL ROLE postgres`-Block in einer Server-Action-Transaktion, um RLS temporaer zu bypassen und `owner_user_id` ueberzusetzen. Audit-Eintrag pflichtig (siehe DEC-184).

### V7 RLS-Strategy

| Tabelle | admin SELECT | teamlead SELECT | member SELECT | Mutate-Regel |
|---|---|---|---|---|
| `companies` | alle | team-Scope | owned | RLS via `can_see_owner` |
| `contacts` | alle | team-Scope | owned | RLS via `can_see_owner` |
| `deals` | alle | team-Scope | owned | RLS via `can_see_owner` |
| `activities` | alle | team-Scope | owned | RLS via `can_see_owner` |
| `meetings` | alle | team-Scope | owned | Owner = Host-User (DEC-186) |
| `proposals` | alle | team-Scope | owned | RLS via `can_see_owner` |
| `email_messages` | alle | team-Scope | owned | RLS via `can_see_owner` |
| `calls` | alle | team-Scope | owned | Owner = User der Click-to-Call ausloeste |

**System-Records (`owner_user_id IS NULL`):** nur Admin sieht sie. Beispiele: Workflow-Engine-erzeugte Inserts ohne User-Context, Cron-Jobs (Followup, KI-Signal-Extraction, Briefing-Cron) die ohne `auth.uid()` laufen. Bedrock-Cost-Audit-Eintraege bekommen System-Owner.

### V7 KI-Features im Multi-User-Kontext

Per DEC-185 sind die folgenden Features **team-shared** in V7 (alle Team-Member sehen alle Team-Daten, nicht nur eigene):

- **Workflow-Rules (V6.2 FEAT-621):** Trigger feuern fuer alle Owner im gleichen Team. Wer Rule erstellen darf: Admin + Teamlead (Member sieht Rules nur read-only). Rule-Execution-Context: Insert mit `owner_user_id` des betroffenen Records, nicht des Rule-Owners.
- **RAG / Knowledge-Chunks (V4.2 FEAT-401):** RAG-Suche durchsucht alle Team-Daten ohne Owner-Filter. Begruendung: Beratungs-Team teilt Wissen ueber Kunden. Owner-Filter waere V7.5-Optionalitaet.
- **Auto-Winloss-Trigger (V6.6 FEAT-666):** Feuert pro Owner-Deal (Owner-Context bleibt erhalten, nicht team-aware).
- **Followup-Cron + Briefing-Cron:** laufen ueber alle Team-Records, pushen Notifications an den jeweiligen Owner.
- **KI-Workspace-Hybrid (V6.6 FEAT-661/665):**
  - Auf `/mein-tag`: rendert Berichte ueber owner_user_id = auth.uid()-Daten (eigene).
  - Auf `/team`: rendert Berichte ueber team-scope (alle Team-Owner zusammen).
  - Auf `/team/[user_id]/mein-tag`: rendert Berichte ueber spezifischen Member im Read-Only-Modus.

### V7 Aggregat-Strategy

Per DEC-187 nutzen Aggregat-Queries auf `/team` **direkten JOIN ueber `profiles.team_id`** ohne Materialized View. Performance-Annahme: <500ms fuer Teams bis 20 Member ist mit Index auf `owner_user_id` plus `profiles(team_id)` erreichbar.

```sql
SELECT
  p.id AS user_id,
  p.display_name,
  p.role,
  COUNT(d.id) FILTER (WHERE d.status = 'open') AS open_deals,
  SUM(d.total_gross) FILTER (WHERE d.status = 'open') AS pipeline_sum,
  COUNT(a.id) FILTER (WHERE a.due_at < now() AND a.status = 'open') AS overdue_activities
FROM profiles p
LEFT JOIN deals d ON d.owner_user_id = p.id
LEFT JOIN activities a ON a.owner_user_id = p.id
WHERE p.team_id = get_my_team_id()
GROUP BY p.id, p.display_name, p.role
ORDER BY p.display_name;
```

Fallback bei Performance-Smoke <500ms verletzt (Teams ≥30 Member): Materialized View `team_kpi_snapshot` mit Refresh nach Insert/Update auf `deals` und `activities` (analog V6.6 ki_workspace_report). Entscheidung erst in /qa-Phase nach Echtdaten-Measurement.

### V7 Drilldown-Pattern

Per DEC-188 wird Drilldown ueber **URL-Path** geloest, nicht ueber Session-Switching:

- `/team/[user_id]/mein-tag` → Server-Component liest `user_id` aus `params`, validiert via `can_see_owner(user_id)` (RLS-Helper), rendert Mein-Tag mit `owner_user_id = user_id` als Query-Filter, setzt Read-Only-Context fuer Server Actions.
- `<ReadOnlyContextProvider>` ueber den Page-Subtree markiert alle nested Server Actions als read-only.
- Server Action liest Context via `getReadOnlyContext()` und ruft `assertNotReadOnlyContext()` als erste Zeile in jeder Mutate-Action.
- Banner-Component `<DrilldownBanner viewerName=... targetName=... />` informiert Teamlead.
- Audit-Trail: `INSERT INTO audit_log (event, user_id, view_as_target_user_id, payload) VALUES ('view_as', auth.uid(), $1, '{"path": ..."}');` bei jedem Drilldown-Page-Load.

### V7 Sidebar-Config + Server-Side-Rollen-Guard

Per DEC-190 + DEC-191:

**`/lib/navigation/sidebar-config.ts`:**
```typescript
export type Role = 'admin' | 'teamlead' | 'member';

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: 'ANALYSE' | 'TEAM' | 'OPERATIV' | 'ARBEITSBEREICHE' | 'VERWALTUNG_MEIN' | 'VERWALTUNG_SETUP';
  visibleFor: Role[];
}

export const SIDEBAR_CONFIG: SidebarItem[] = [
  // ANALYSE — admin + teamlead nur
  { href: '/cockpit',  label: 'KI-Analyse-Cockpit', icon: Sparkles, section: 'ANALYSE', visibleFor: ['admin', 'teamlead'] },
  // TEAM — teamlead + admin
  { href: '/team',                label: 'Team-Cockpit',     icon: Users,  section: 'TEAM', visibleFor: ['admin', 'teamlead'] },
  { href: '/settings/team',       label: 'Team-Verwaltung',  icon: UserCog, section: 'TEAM', visibleFor: ['admin', 'teamlead'] },
  // OPERATIV — alle
  { href: '/mein-tag',     label: 'Mein Tag',     icon: CalendarDays, section: 'OPERATIV', visibleFor: ['admin', 'teamlead', 'member'] },
  // ...
];
```

**Server-Side-Filter im Layout:**
```typescript
// app/(authenticated)/layout.tsx
const profile = await getProfile();
const visibleItems = SIDEBAR_CONFIG.filter(i => i.visibleFor.includes(profile.role));
return <Layout sidebar={<Sidebar items={visibleItems} />}>{children}</Layout>;
```

**Page-Level Guard:**
```typescript
// app/(authenticated)/workflow/page.tsx
await assertRole(['admin', 'teamlead']); // throws Redirect zu /mein-tag wenn member
```

**middleware.ts** ergaenzt die Layout-Guards um Route-Schutz vor Server Component Render (z.B. fuer `/api/team/*`-Routen).

### V7 Mobile-Hamburger

Per DEC-192 wird Mobile-Top-Bar in `(authenticated)/layout.tsx` zentralisiert:

```typescript
<div className="md:hidden">
  <MobileTopBar onMenuOpen={() => setMobileSidebar(true)} />
</div>
<Sheet open={mobileSidebar} onOpenChange={setMobileSidebar}>
  <SheetContent side="left" className="w-72 p-0">
    <Sidebar items={visibleItems} mobileMode />
  </SheetContent>
</Sheet>
```

shadcn `<Sheet>`-Component wird mit Brand-Tokens (V6.5) ueberschrieben. Sektion-Header in Mobile-Drawer bleiben sichtbar.

### V7 Bulk-Reassign Flow

Per DEC-184 + DEC-189:

1. Teamlead/Admin oeffnet `/settings/team` → Tab "Bulk-Reassign".
2. Source-Owner-Dropdown (Team-Member) + Target-Owner-Dropdown + Filter (Pipeline, Status, Date-Range).
3. "Preview"-Button zeigt Anzahl betroffener Records pro Tabelle (deals: 12, activities: 47, etc.).
4. "Reassign starten"-Button feuert Server Action `bulkReassign({ from, to, filter })`.
5. Server Action:
   - `assertRole(['admin', 'teamlead'])` als Guard.
   - `BEGIN; SET LOCAL ROLE postgres;` (Bypass RLS fuer Privileg-Aktion).
   - Loop ueber 8 Tabellen: `UPDATE <table> SET owner_user_id = $to WHERE owner_user_id = $from AND <filter>;`.
   - Per UPDATE: Audit-Eintrag mit altem + neuem Owner + Filter + triggered-by-User.
   - `COMMIT;`.
6. Toast + Redirect zu Team-Cockpit mit aktualisierten KPIs.

Kein `previous_owner_user_id`-Feld auf Tabellen — Audit-Log reicht (DEC-184). DSGVO-konform durch Audit-Log-Retention-Policy (siehe COMPLIANCE.md).

### V7 Profile-Delete

Per DEC-193 ist Profile-Delete **gesperrt**, solange der User noch Owner aktiver Records ist:

```typescript
async function deleteProfile(userId: string) {
  await assertRole(['admin']);
  const counts = await db.query(`
    SELECT 'deals' AS t, COUNT(*) FROM deals WHERE owner_user_id = $1
    UNION ALL SELECT 'activities', COUNT(*) FROM activities WHERE owner_user_id = $1
    UNION ALL ...
  `, [userId]);
  if (counts.some(c => c.count > 0)) {
    throw new Error('Profile hat noch zugeordnete Records. Bitte vorher Bulk-Reassign auf anderen User.');
  }
  await supabase.auth.admin.deleteUser(userId);
}
```

### V7 Invite-Flow

Per DEC-194:

1. Admin oeffnet `/settings/team` → "Mitglied einladen".
2. Form: E-Mail + Initial-Rolle (Default `member`) + Team (Default = eigenes Team, Admin darf andere).
3. Server Action:
   - `assertRole(['admin', 'teamlead'])` (Teamlead nur eigenes Team).
   - `supabase.auth.admin.inviteUserByEmail(email)` → liefert `user_id`.
   - `INSERT INTO profiles (id, role, team_id) VALUES ($user_id, $role, $team_id);`.
   - Audit-Eintrag.
4. Invited User klickt E-Mail-Link → Set-Password → automatisch eingeloggt → Sidebar passt sich an Rolle an.

Voraussetzung: GoTrue-Mailer ist auf Coolify-Supabase konfiguriert (Bestand bereits aktiv fuer Existing-Auth).

### V7 Affected Existing Modules

| Modul | Aenderung | Kommentar |
|---|---|---|
| Workflow-Engine (V6.2) | Owner-Context-Pass, Admin/Teamlead-only Editor | Rules feuern team-scope, Reader-UI fuer Member |
| RAG-Search (V4.2) | Owner-Filter optional, default team-shared | DEC-185 |
| Auto-Winloss (V6.6) | Owner bleibt, kein team-aware Aggregat | DEC-185 |
| Followup-Cron (V4 FEAT-407) | Push an Owner, nicht Admin | Owner-Lookup pro Activity |
| Briefing-Cron (V5.6 FEAT-562) | Push an Meeting-Owner (Host-User) | DEC-186 |
| KI-Workspace-Hybrid (V6.6) | Owner-Context bei Bedrock-Call mitgeben | Prompt-Templates erweitern |
| Composing-Studio (V5.3) | Sender = Owner, RLS auf email_messages | INSERT mit owner_user_id |
| Proposal-Editor (V5.5) | Owner = Creator, Versionierung bleibt Owner-pinned | RLS auf proposals |

### V7 Decisions Summary (DEC-181..195)

| DEC | Titel | Zusammenfassung |
|---|---|---|
| DEC-181 | Rollen-Modell 3-flach + 1 User in 1 Team | admin/teamlead/member, kein Multi-Team |
| DEC-182 | owner_user_id auf 8 Kerntabellen, NULL=System | Companies, Contacts, Deals, Activities, Meetings, Proposals, Email-Messages, Calls |
| DEC-183 | RLS-Strategie: SQL-Helper-Functions + Policy-pro-Tabelle | is_admin / is_teamlead / can_see_owner |
| DEC-184 | Bulk-Reassign mit audit_log-Trail, kein previous_owner_user_id-Feld | DSGVO-konform via Audit-Retention |
| DEC-185 | Workflow-Rules + RAG + Auto-Winloss = team-shared in V7 | V7-Vereinfachung, Owner-Filter ggf. V7.5 |
| DEC-186 | Meeting/Call Owner = Host-User | Teilnehmer-Sicht via audit_log |
| DEC-187 | Aggregat: Direkter JOIN, keine Materialized View in V7-Start | Fallback bei Performance-Defekt |
| DEC-188 | Drilldown via URL-Path `/team/[user_id]/...` | Server-side, kein Session-Switch |
| DEC-189 | Mutate-Lockdown: shared `assertNotReadOnlyContext()` Helper | First Line in jeder Mutate-Action im Drilldown |
| DEC-190 | Sidebar-Config: TS-Array mit `visibleFor: Role[]` | Single Source of Truth |
| DEC-191 | Server-Side-Rollen-Guard via `assertRole()` Helper | Pro Page Server-Component am Anfang |
| DEC-192 | Mobile-Hamburger zentralisiert in `(authenticated)/layout.tsx` | Sheet-Drawer mit Brand-Tokens |
| DEC-193 | Profile-Delete: Hard-Lock bei offenen Owner-Eintraegen | Re-Assign-Pflicht vor Delete |
| DEC-194 | Invite-Flow: team_id Pflicht beim Invite, Default-Rolle member | GoTrue Auth-Invite-Pfad |
| DEC-195 | audit_log: bestehendes `user_id` beibehalten, kein neues Feld | Plus neue Spalte `view_as_target_user_id` |

### V7 Slices (Empfehlung fuer /slice-planning V7)

7 Slices, 1 Backend-Foundation + 1 Frontend-Foundation + 5 Feature-Slices:

1. **SLC-701** — MIG-033 Schema + MIG-034 Backfill + MIG-035 RLS-Switch + Helper-SQL-Functions. **Backend-Foundation.** Nach SLC-701 sind alle Tabellen owner-aware, RLS aktiv, aber Code nutzt es noch nicht.
2. **SLC-702** — `/lib/auth/` (get-profile + assert-role + read-only-context + invite) + `(authenticated)/layout.tsx` erweitern + Sidebar-Config + middleware.ts-Erweiterung. **Frontend-Foundation.** Nach SLC-702 sind alle Pages role-aware (admin sieht alles, member sieht nichts mehr ausser Mein Tag-Stub).
3. **SLC-703** — `/settings/team` Verwaltungs-UI (Mitglieder-Tabelle + Invite + Rolle-aendern). Plus Server Actions invite + delete + change-role. **Verwaltung.**
4. **SLC-704** — owner_user_id-Aware in allen ~80 bestehenden Server Actions (Insert setzt Owner). Plus bestehende Listing-/Detail-Queries mit Owner-Filter implizit via RLS, kein Code-Change noetig dort. **Owner-Wiring.**
5. **SLC-705** — `/team`-Aggregat-Cockpit + Mitglieder-Tabelle + KI-Workspace-Hybrid auf Team-Scope. **Teamlead-Aggregat.**
6. **SLC-706** — `/team/[user_id]/...`-Drilldown-Routes + Read-Only-Context + Banner + view_as-Audit + `assertNotReadOnlyContext()`-Guard in Mutate-Actions. **Drilldown.**
7. **SLC-707** — VERWALTUNG-Split (Mein Profil + Setup) + Mobile-Hamburger + Style-Guide-Verifikation + Bulk-Reassign-Werkzeug-UI. **Polish + Bulk-Reassign.**

Pro Slice: `/backend|/frontend` → `/qa` → Coolify-Redeploy (User-deploy). Nach SLC-707: Gesamt-`/qa` V7 → `/final-check` → `/go-live` → `/deploy` als REL-029.

### V7 Release-Gate

V7 gilt als releaseable wenn alle 8 Bedingungen erfuellt:
- MIG-033/034/035 idempotent applied, 0 NULL-Owner in Bestandsdaten.
- 3 Rollen-Sessions (admin/teamlead/member) zeigen drei verschiedene Sidebars (Visual Diff PASS).
- Member-Session sieht NUR eigene Daten (RLS-Smoke ueber Test-Member + Cross-Owner-URL-Manipulation).
- Teamlead `/team` zeigt Aggregat-KPIs <500ms fuer Test-Team mit 3 Member.
- Drilldown `/team/[user_id]/mein-tag` zeigt Member-Sicht read-only, Mutate-Buttons disabled, view_as-Audit-Eintrag pflichtig.
- Bulk-Reassign-Werkzeug funktioniert mit audit_log-Trail.
- Mobile-Hamburger oeffnet rollen-korrekte Sidebar <768px.
- Vitest gruen mit mind. 30 neuen RLS-Tests + 5 view_as-Audit-Tests + 10 role-Guard-Tests.

### V7 Open Technical Questions (fuer /slice-planning)

1. **Performance-Smoke ohne Production-Daten:** Wie testen wir <500ms Aggregat fuer Teams mit 20 Member, wenn Production-Daten nur fuer 1 User existieren? Empfehlung: Seed-Script `npm run seed:multi-user` erzeugt Test-Team mit 5 Member + 100 Deals + 500 Activities pro Member.
2. **Migration-Reihenfolge auf Hetzner:** Phase A → Phase B → Phase C. Falls Phase C scheitert, Phase A+B sind ok (System bleibt im V6.6-Verhalten ohne RLS-Switch). Empfehlung: SLC-701 splittet in 3 Sub-MTs mit Backout-Test pro Phase.
3. **RLS-Helper-Function-Performance:** `is_admin()` wird in jeder RLS-Policy aufgerufen. Postgres cached STABLE-Functions pro Statement, aber bei 1000-Row-Listing wird is_admin() 1000x evaluiert? Empfehlung: SECURITY DEFINER + STABLE markieren, plus PgBench-Smoke vor SLC-701-Release.
4. **Sidebar-Refactor-Risiko:** Bestehende Sidebar-Component (cockpit/src/components/layout/sidebar.tsx) wird zentral umgebaut. Test-Plan: Browser-Smoke alle 4 Sektionen, alle 30+ Eintraege, fuer 3 Rollen = 90+ Combinations. Empfehlung: Visual-Diff via Playwright in /qa SLC-702.
5. **Workflow-Engine-Owner-Pass:** Bestehende Rules feuern aktuell ohne owner-Context-Pass. Wenn Rule auf Deal-Stage-Change feuert, soll erzeugte Activity `owner_user_id = deal.owner_user_id` haben oder `NULL` (System-Record)? Empfehlung: deal.owner_user_id mit Fallback NULL, dokumentiert in DEC-185.
6. **RAG-Re-Embedding bei Owner-Wechsel:** Knowledge-Chunks haben aktuell keinen Owner-Bezug. Wenn V7.5 Owner-Filter eingefuehrt wird, muessen alle Chunks re-embedded werden? Empfehlung: Owner-Spalte in MIG-033 mit NULL-Default, kein Re-Embedding noetig (Owner-Lookup ueber source_id).
7. **Cron-Owner-Context:** Followup-Cron + Briefing-Cron + Auto-Winloss-Cron laufen mit `SET LOCAL ROLE postgres`. Inserts brauchen aber Owner. Empfehlung: Cron-Jobs lesen `source_record.owner_user_id` als Default-Owner fuer erzeugte Records (z.B. Briefing-Activity bekommt Owner = Meeting.owner_user_id).
8. **Test-Strategie fuer Cross-Owner-Leaks:** Pro Tabelle pro Rolle pro Operation = 8×3×4 = 96 RLS-Tests. Empfehlung: parametrisierter Vitest-Generator, nicht 96 Einzeltests. Coolify-DB-Test-Pattern aus `coolify-test-setup.md` nutzen.
9. **Profile-Delete bei lebendem Auth-User:** `supabase.auth.admin.deleteUser()` loescht GoTrue-Account; Profile-Row CASCADE-DELETE oder SET NULL? Empfehlung: SET NULL (Audit-Trail behaelt User-Daten via display_name-Backup in audit_log).
10. **Mobile-Sidebar State:** Drawer-Open-State per localStorage oder Memory? Empfehlung: Memory (Drawer schliesst automatisch bei Route-Wechsel).

### V7 Recommended Next Step

`/slice-planning V7` — 7 Slices SLC-701..707 strukturiert ausdefinieren mit Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus pro Slice. Insbesondere:
- SLC-701: 3-Phasen-Migration mit Backout-Test pro Phase, RLS-Smoke fuer 8 Tabellen
- SLC-702: assertRole-Pattern + Server-Side-Filter + Sidebar-Config + middleware.ts-Update + Visual-Diff
- SLC-703: Verwaltungs-UI + Invite + Rolle-aendern (Bulk-Reassign nach /slice-planning V7 konsolidiert auf SLC-707, siehe Hinweis unten)
- SLC-704: Owner-Wiring in allen Server Actions (audit-Liste der ~80 Actions)
- SLC-705: Aggregat-Query-Performance-Smoke + Materialized-View-Fallback-Bedingung
- SLC-706: Drilldown-Routes + Read-Only-Context + view_as-Audit-Eintraege
- SLC-707: VERWALTUNG-Split + Mobile-Hamburger + Style-Guide-Verifikation + Bulk-Reassign-Werkzeug (vollstaendig, kein Preview/Live-Split)

> **Hinweis (Slice-Planning-Update 2026-05-12):** Die urspruengliche Empfehlung war Bulk-Reassign zweistufig (Preview in SLC-703 + Live in SLC-707). `/slice-planning V7` hat das auf einen einzigen Schritt in SLC-707 konsolidiert, weil ein zweistufiger Workflow mit Trockenlauf-Vorschau zu viel Overhead fuer den V7-Scope ist. SLC-703 enthaelt entsprechend nur noch Mitglieder-Tabelle + Invite + Rolle-aendern (kein Bulk-Reassign-UI mehr).

## V7.1 — Polish-Sprint Architecture (Permissions + Drilldown-Vollausbau + Defense-in-Depth)

### V7.1 Strategy

V7.1 ist ein **Pure-Reuse-Sprint**. Keine neue Auth-Surface, kein neuer Datenfluss, keine neue Datentabelle, keine Schema-Migration. Drei orthogonale Polish-Themen auf bestehendem V7-Code-Stand:

1. **FEAT-711 Settings-Permission-Layer** — bestehende `assertRole`-Helper aus `cockpit/src/lib/auth/assert-role.ts` und `SIDEBAR_CONFIG.visibleFor` aus `cockpit/src/lib/navigation/sidebar-config.ts` werden konsequent auf **alle 13 Settings-Sub-Pages** angewendet. Heute ist nur `/settings/team` (Admin+Teamlead) und `/settings/products` (Admin) wirklich rolle-gegated. Die anderen 11 Sub-Pages sind faktisch offen fuer alle Rollen.

2. **FEAT-712 Drilldown-View Vollausbau** — die heutige `/team/[user_id]/pipeline/page.tsx` ist eine **separate, reduzierte Variante** (siehe Code-Comment: "Volle Pipeline-Sicht inkl. Drilldown auf Deal-Detail kommt in V7.5+"). V7.1 zieht diesen Gap nach vorne: die `<PipelineView>`-Component (aus `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`) wird mit einem optionalen `readOnly={true}` + `ownerUserIdFilter`-Prop erweitert und vom Drilldown wiederverwendet. Analog fuer Aktivitaeten + Mein-Tag.

3. **FEAT-713 Defense-in-Depth Polish** — 4 fehlende `await assertNotReadOnlyContext()`-Guards als first line einsetzen + AUDIT_SERVER_ACTIONS_V7.md-Doc-Sync. Kein architektonischer Effekt, reine Code-Symmetrie.

### V7.1 Strategy-Leitprinzipien

- **Reuse-First-Mandate (CLAUDE.md Core-Default #5):** Alle 3 Features muessen existierende V7-Pattern nutzen. Kein neuer Auth-Helper, kein neuer Sidebar-Filter, keine neue Read-Only-Context-Variante.
- **Server-Side-Guard + Sidebar-Visibility-Filter doppelt:** `assertRole`-Guard auf jeder Settings-Sub-Page (Direct-URL-Schutz) UND Sidebar-Config-Visibility (UI-Schutz). Beides ist notwendig — `visibleFor` allein blockt Direct-URL-Zugriff nicht.
- **Filter-State-Isolation pro `viewAsUserId`:** localStorage-Key-Schema mit User-Prefix (`pipeline-filters-${viewAsUserId ?? "self"}`). Keine Cross-User-Pollution.
- **Vitest-Mock-Pattern fuer Read-Only-Context:** `runWithReadOnlyContext`-Wrapper im Test direkt verwenden (DEC-201) — kein `vi.mock` der `read-only-context.ts`. Konsistent mit MT-6-Test-Pattern aus SLC-706.
- **Keine neue audit_log-Action in V7.1:** FEAT-711 nutzt KEIN neues `settings_*_update`-Audit-Pattern. Bestehende Settings-Update-Actions (z.B. saveBranding) bleiben unveraendert (additiv-only-Disziplin). Audit-Trail-Erweiterung kommt ggf. in V7.2.

### V7.1 Components Affected

```
Browser (HTTPS)
  │
Coolify / Caddy
  │
Next.js App (BD Cockpit)
  │
  ├── (app)/layout.tsx (unveraendert — Sidebar liest sidebar-config.ts)
  │
  ├── /lib/auth/                                           ─── REUSE, KEIN neuer Helper
  │   ├── assert-role.ts (V7 — wird in 11 neuen Settings-Pages verwendet)
  │   ├── read-only-context.ts (V7 — wird in 4 neuen Mutate-Actions verwendet)
  │   └── get-profile.ts (V7 — fuer Sidebar-Filter im Layout)
  │
  ├── /lib/navigation/sidebar-config.ts                    ─── ERWEITERT
  │   └── Settings-Sub-Pages bekommen explizite Items mit visibleFor[]
  │       (heute: nur Team + Products. Neu: Branding/Payment-Terms/
  │       Pipelines/Templates/Workflow/Campaigns/Compliance/IMAP)
  │
  ├── (app)/settings/                                      ─── 11 PAGES PATCHED
  │   ├── branding/page.tsx       — assertRole(["admin"]) als first line
  │   ├── payment-terms/page.tsx  — assertRole(["admin"])
  │   ├── pipelines/page.tsx      — assertRole(["admin"])
  │   ├── products/page.tsx       — assertRole(["admin"]) (heute hat es bereits Sidebar-Block, Server-Guard fehlt)
  │   ├── compliance/page.tsx     — assertRole(["admin"])
  │   ├── automation/page.tsx     — assertRole(["admin", "teamlead"])
  │   ├── automation/new/page.tsx — assertRole(["admin", "teamlead"])
  │   ├── automation/[id]/edit/page.tsx — assertRole(["admin", "teamlead"])
  │   ├── templates/page.tsx      — assertRole(["admin", "teamlead"])
  │   ├── campaigns/page.tsx      — assertRole(["admin", "teamlead"])
  │   ├── campaigns/new/page.tsx  — assertRole(["admin", "teamlead"])
  │   ├── campaigns/[id]/edit/page.tsx — assertRole(["admin", "teamlead"])
  │   └── (meetings/briefing/working-hours bleiben offen fuer alle)
  │
  ├── (app)/settings/layout.tsx                            ─── ROLE-AWARE SIDEBAR
  │   └── SIDEBAR_ITEMS kommt aus filterByRole(role) statt
  │       hardcoded Liste (heute: 4 Items hardcoded, davon 2 fuer
  │       Member sichtbar die er nicht oeffnen darf)
  │
  ├── (app)/settings/page.tsx                              ─── ROLE-AWARE KACHELN
  │   └── Settings-Landing-Page filtert Kacheln gegen Profil-Rolle.
  │       Fuer Member: nur Mein-Profil/Working-Hours/Meeting-Karten
  │       sichtbar. Direct-URL-Schutz via assertRole bleibt im
  │       Sub-Page-Layer.
  │
  ├── (app)/pipeline/pipeline-view.tsx                     ─── ERWEITERT
  │   └── Neue Props:
  │       ├── readOnly?: boolean (default false) — hidet Mutate-Buttons
  │       │                                         (Stage-Change, Edit,
  │       │                                         Delete, Drag-Drop)
  │       └── viewAsUserId?: string — wenn gesetzt, Filter-Storage-Key
  │                                    bekommt diesen Prefix
  │
  ├── (app)/team/[user_id]/pipeline/page.tsx               ─── UMGESCHRIEBEN
  │   └── Lädt gleiche Daten wie /pipeline/[slug] (alle Pipelines,
  │       Stages, Deals mit owner_user_id-Filter), uebergibt sie an
  │       <PipelineView readOnly viewAsUserId={user_id} />
  │
  ├── (app)/team/[user_id]/aufgaben/page.tsx               ─── UMGESCHRIEBEN
  │   └── Wiederverwendet /aufgaben-Page-Component mit owner_user_id-
  │       Filter + readOnly-Variante. Auch: /termine + /aktivitaeten
  │       falls jeweils separate Top-Level-Components existieren.
  │       (Slice-Planning entscheidet konkret welche Pages noch
  │       benoetigt werden vs nur die Pipeline-Page.)
  │
  ├── (app)/team/[user_id]/mein-tag/page.tsx               ─── UMGESCHRIEBEN
  │   └── Wiederverwendet /mein-tag-Page-Component mit
  │       owner_user_id-Filter + readOnly-Variante. KI-Workspace-
  │       Block scoped auf target_user_id. Quick-Action-Karten als
  │       read-only Statistik.
  │
  └── 4 NEUE assertNotReadOnlyContext-Guards (FEAT-713):
      ├── lib/team/bulk-reassign-actions.ts:bulkReassignApply
      ├── components/insights/insight-actions.ts:saveInsight
      ├── lib/settings/working-hours-actions.ts:updateWorkingHoursSettings
      └── lib/ki-workspace/reports/winloss.ts:persistManualRun
```

### V7.1 Permission-Matrix (DEC-196)

V7.1 setzt eine 3-Stufen-Permission-Matrix um. **`assertRole`-Roles auf jeder Sub-Page**:

| Settings-Sub-Page | `assertRole`-Roles | Heute |
|---|---|---|
| `/settings/branding` | `["admin"]` | offen |
| `/settings/payment-terms` | `["admin"]` | offen |
| `/settings/pipelines` | `["admin"]` | offen |
| `/settings/products` | `["admin"]` | Sidebar admin-only, Page offen |
| `/settings/compliance` | `["admin"]` | offen |
| `/settings/automation` (+ new/edit) | `["admin", "teamlead"]` | offen |
| `/settings/templates` | `["admin", "teamlead"]` | offen |
| `/settings/campaigns` (+ new/edit) | `["admin", "teamlead"]` | offen |
| `/settings/team` | `["admin", "teamlead"]` | bereits gegated |
| `/settings/meetings` | (kein Guard — alle Rollen) | offen |
| `/settings/briefing` | (kein Guard — alle Rollen) | offen |
| `/settings/working-hours` | (kein Guard — alle Rollen) | offen |

**Sidebar-Config-Erweiterung:** `sidebar-config.ts` bekommt explizite Items fuer alle 11 neuen gated Sub-Pages mit identischer `visibleFor`-Liste. Server-Side `filterByRole(role)` filtert deterministisch.

**Settings-Layout-Sidebar (`/settings/layout.tsx`):** ersetzt die hardcoded 4-Item-Liste mit einer rollen-gefilterten Liste aus einer neuen `SETTINGS_SIDEBAR_CONFIG`-Konstante (lokal in der Layout-Datei oder zusammen mit sidebar-config.ts). Beide Sidebar-Configs **muessen Single-Source-of-Truth-konsistent sein** — DEC-196b verlangt, dass die Settings-spezifische Liste aus dem gleichen `SIDEBAR_CONFIG` durch Slug-Filter abgeleitet wird (kein zweites hardcoded Pflegen).

**Settings-Landing-Page-Kacheln (`/settings/page.tsx`):** filtert Kacheln-Array gegen die aktuelle Rolle. Member sieht nur Mein-Profil-Stub + Working-Hours + Meeting-Settings.

### V7.1 Drilldown-Reuse-Pattern (DEC-199)

**Entscheidung: `readOnly` + `viewAsUserId`-Props an bestehende Page-Components.**

Alternativen geprueft:

| Pattern | Pro | Contra | Entscheidung |
|---|---|---|---|
| **A** Eigene Drilldown-Variants (heute) | klare Trennung | Code-Duplikation, Feature-Drift garantiert | verworfen |
| **B** Wrapper-Component `<DrilldownPipeline>` rendert `<PipelineView readOnly />` | wiederverwendbar, kein Touch von /pipeline | Wrapper haengt direkt von PipelineView-Props ab — naive Lookup-Daten-Loading-Doppelung | verworfen |
| **C** `<PipelineView>` bekommt `readOnly` + `viewAsUserId` Props, /team/[user]/pipeline ruft PipelineView direkt mit den Props auf | echtes Reuse, einmal Daten geladen, Filter-State-Isolation via Prop | PipelineView-Props-API waechst um 2 optionale Felder | **gewaehlt** |

**Konkrete Prop-Semantik:**
- `readOnly?: boolean` — wenn `true`: alle Mutate-Buttons (Stage-Change, Edit, Delete, Drag-Drop, Create-Deal) sind hidden (nicht disabled — disabled-Buttons im Pipeline-View kommunizieren falschen UX-State). Ist `false` (Default): heutige Self-Pipeline-Erfahrung.
- `viewAsUserId?: string` — wenn gesetzt: alle Filter-State-Persistierungen nutzen `${baseKey}-viewAs-${viewAsUserId}` statt `${baseKey}`. Sets verhindert Cross-User-State-Pollution. Drilldown-Daten-Loading scoped auf `WHERE owner_user_id = $1` (uebergeben durch die Page-Component aus `params.user_id`).

**Read-Only-Context-Layer-Wrap bleibt aktiv:** `team/[user_id]/layout.tsx` wrapped Children weiterhin via `runWithReadOnlyContext({ viewerUserId, targetUserId }, ...)`. Auch wenn die UI keine Mutate-Buttons zeigt: Defense-in-Depth-Guard ueber `assertNotReadOnlyContext()` in den Server-Actions bleibt erste Verteidigungslinie. ISSUE-066-AsyncLocalStorage-Gap bleibt unveraendert offen (V7.5-Mitigation). V7.1 schliesst damit den UX-Layer, nicht den Defense-Layer.

### V7.1 Filter-State-Storage-Schema (DEC-200)

Heute persistieren Pipeline-View und ggf. Aktivitaeten-View Filter-State in localStorage mit Keys wie `pipeline-filter-state`. Wenn FEAT-712 die Components fuer Drilldown wiederverwendet, wuerde der Drilldown-Filter den Self-Filter ueberschreiben.

**DEC-200:** Filter-State-Storage-Key wird mit `viewAsUserId` postfix erweitert:

```typescript
// Heute (Self-Pipeline):
const STORAGE_KEY = "pipeline-filter-state";

// V7.1 (Self + Drilldown):
function getStorageKey(viewAsUserId?: string): string {
  return viewAsUserId
    ? `pipeline-filter-state-viewAs-${viewAsUserId}`
    : "pipeline-filter-state";
}
```

Drilldown-Filter werden separat persistiert pro target_user_id. Wenn Teamlead von /team/[A]/pipeline auf /team/[B]/pipeline wechselt, ist der Filter-State fuer A erhalten geblieben, fuer B startet er leer. Self-Filter (`/pipeline/multiplikatoren`) bleibt unangetastet.

Alternative geprueft: gar keine Persistierung in Drilldown-Modus. Verworfen — User-Experience-Drift wenn Teamlead zwischen Filter-Settings hin- und herwechselt.

### V7.1 403-vs-Redirect-Strategie (DEC-198)

Heutige `assertRole`-Implementation macht **`redirect("/mein-tag")`** bei Mismatch (siehe `assert-role.ts:24`). Das ist konsistent mit V7-DEC-191. FEAT-711 reuset diese Semantik unveraendert:

- Member klickt auf `/settings/branding` Direct-URL → `redirect("/mein-tag")` (kein 403-Page, kein Toast).
- Begruendung: konsistent mit bestehendem V7-Pattern. Style-Guide-V2 hat keine 403-Page-Komponente. Eine neue 403-Page einfuehren waere V7.2-Scope.

**Trade-off:** Member sieht im Worst-Case eine stille Weiterleitung ohne Erklaerung. Sidebar-Visibility-Filter macht das in 99% der Faelle unsichtbar — Member klickt gar nicht erst auf einen Admin-only-Link. Direct-URL-Tipper (z.B. URL-Share via Mail) bleibt Edge-Case.

Falls spaeter ein Bedarf fuer 403-Page-Komponente entsteht (z.B. Drittnutzer-Test-Feedback), wird das als V7.2-BL angelegt.

### V7.1 Settings-Audit-Trail-Granularitaet (DEC-197)

**DEC-197:** V7.1 **fuegt KEINE neuen audit_log-Eintraege ein**. Bestehende Settings-Update-Actions (saveBranding, savePaymentTerms, etc.) bleiben unveraendert in ihrer Audit-Pattern-Behandlung.

Begruendung:
- V7.1 ist Polish-Sprint mit minimalem Aenderungs-Surface.
- Aktueller Audit-Pattern-Stand ist asymmetrisch (siehe ISSUE-069 — Doc-Sync ist sogar noch stale). Erst symmetrisieren (V7.1 FEAT-713), dann audit-trail-erweitern (V7.2 falls Bedarf).
- Compliance-Gate-Auditoren brauchen die Settings-Audit-Trail nur fuer Live-Drittnutzer-Phase — Internal-Test-Mode-State erlaubt das Defer.

Folge-BL: BL-471 (Settings-Audit-Trail-Erweiterung, V7.2-Kandidat). Wird NICHT in V7.1-Slice-Planning gezogen.

### V7.1 Vitest-Mock-Pattern fuer Read-Only-Context (DEC-201)

FEAT-713 fordert 4 Vitest-Tests die das `assertNotReadOnlyContext()`-Throw-Verhalten verifizieren. Zwei Patterns moeglich:

| Pattern | Beschreibung | Pro | Contra |
|---|---|---|---|
| **A** `vi.mock("@/lib/auth/read-only-context")` mit Mock-Storage | erlaubt fine-grained Mock-Setup | versteckt das Verhalten der echten Implementation, kann false-positive-PASS produzieren | verworfen |
| **B** `runWithReadOnlyContext({...}, async () => { await action() })` im Test direkt verwenden | testet echte AsyncLocalStorage-Propagation, identisch zu Production-Pfad | benoetigt einen Server-Action-Mock fuer Supabase-Client damit Action nicht echte DB-Mutation versucht | **gewaehlt** |

**Konkretes Pattern (DEC-201):**

```typescript
import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";

it("bulkReassignApply throws when read-only context is active", async () => {
  // Supabase + pg-Client gemockt damit kein echter DB-Call
  vi.mocked(createClient).mockReturnValue(stubSupabase);
  vi.mocked(getPgClient).mockReturnValue(stubPgClient);

  await expect(
    runWithReadOnlyContext(
      { viewerUserId: "teamlead-id", targetUserId: "member-id" },
      async () => bulkReassignApply({ fromUserId: "x", toUserId: "y" }),
    ),
  ).rejects.toThrow(/Mutation blocked: read-only context active/);

  // Wichtig: Verifizieren dass keine echte DB-Mutation passiert ist
  expect(stubPgClient.query).not.toHaveBeenCalled();
});
```

Konsistent mit SLC-706 MT-6-Test-Pattern aus `read-only-context.test.ts`.

### V7.1 Schema / Data Model

**Keine Schema-Migration zwingend.**

- FEAT-711 nutzt existierende `profiles.role`-Spalte aus MIG-033/034.
- FEAT-712 nutzt existierende `*.owner_user_id`-Spalten aus MIG-033.
- FEAT-713 nutzt existierende `audit_log`-Tabelle ohne neue Action-Typen.

Falls FEAT-712-Implementation entdeckt, dass eine bestehende Page-Component fuer Drilldown-Owner-Filter eine fehlende Index-Spalte braucht: zusaetzlicher additiver Index moeglich. /slice-planning klaert.

### V7.1 Data Flow

**FEAT-711 (Settings-Permission-Check-Flow):**

```
Member klickt auf /settings/branding (Direct-URL oder Sidebar)
  │
  ├─ Sidebar-Visibility-Filter (server-side im (app)/layout.tsx):
  │   filterByRole("member") liefert SIDEBAR_CONFIG ohne /settings/branding
  │   → Sidebar zeigt keinen Link
  │
  ├─ Settings-Layout-Sidebar (server-side im (app)/settings/layout.tsx):
  │   filterByRole("member", "settings-only") liefert leere Liste
  │   → Settings-Sidebar zeigt nur Mein-Profil + Working-Hours + Meeting
  │
  ├─ Settings-Landing-Kacheln (server-side im /settings/page.tsx):
  │   Member-Rolle filtert Kacheln-Array → nur die 3 erlaubten Karten
  │
  └─ Direct-URL-Zugriff (Mail-Share, URL-Tipper):
      assertRole(["admin"]) als first line in branding/page.tsx
      → roleAllowed("member", ["admin"]) = false
      → redirect("/mein-tag")
```

**FEAT-712 (Drilldown-Pipeline-Flow):**

```
Teamlead klickt auf /team/[user_id]/pipeline
  │
  ├─ team/[user_id]/layout.tsx wrapped Children:
  │   runWithReadOnlyContext({ viewerUserId: teamlead.id, targetUserId: user_id }, ...)
  │
  ├─ team/[user_id]/pipeline/page.tsx:
  │   await assertRole(["admin", "teamlead"]) (Layout-Guard reicht; double-check ok)
  │   const { deals, pipelines, stages, ... } = await loadPipelineData({
  │     ownerUserId: user_id,  // RLS erlaubt Teamlead Read auf Team-Member-Daten
  │     ...
  │   })
  │   return <PipelineView
  │     readOnly={true}
  │     viewAsUserId={user_id}
  │     pipeline={...} deals={...} stages={...} ...
  │   />
  │
  └─ Teamlead versucht Drag-Drop (theoretisch ohne UI weil readOnly):
      Falls Server-Action via DevTools direkt aufgerufen:
        assertNotReadOnlyContext() in der Server-Action throws
        (heute via Layout-Wrap aktiv; ISSUE-066 V7.5-Mitigation
        schliesst Direct-Call-Gap mit Middleware-Header)
```

### V7.1 External Dependencies / Integrations

**Keine.**

V7.1 nutzt ausschliesslich V7-Stack-Komponenten. Kein neuer Provider, kein neuer Service, keine neue API.

### V7.1 Security / Privacy Considerations

- **Permission-Cut nach User-Walkthrough-Risiko-Klasse:** Branding/Payment-Terms/Pipelines/Produkte/Compliance/IMAP sind **organisationsweite Tiefe-Settings** — versehentliche Aenderung durch Member wuerde fuer alle anderen sichtbar werden. Strikt Admin. Workflow/Templates/Kampagnen sind **operative Settings** mit Team-Wirkung — Teamlead darf hier mitwirken. Mein-Profil/Working-Hours/Meeting sind **persoenliche Settings** — alle duerfen ihre eigenen aendern.
- **Defense-in-Depth bleibt prioritaer:** FEAT-711-`assertRole` als Server-Side-Guard ist die echte Verteidigungslinie. Sidebar-Filter ist UX-Komfort, kein Security-Layer. Ein Bug in der Sidebar-Filter-Logic (z.B. eine vergessene `visibleFor`-Annotation) wuerde von `assertRole` aufgefangen.
- **ISSUE-066 weiter offen:** FEAT-713 schliesst nur den heute fehlenden Server-Action-Guard-Anteil (4 Guards). Die AsyncLocalStorage-Drilldown-Gap (DevTools-direkt-Call) bleibt fuer V7.5-Mitigation. V7.1 macht das Problem nicht groesser und nicht kleiner — bestehende UX-Layer-Verteidigung bleibt aktiv.
- **Audit-Trail:** keine Aenderung (DEC-197). V7.2-Kandidat falls Bedarf.

### V7.1 Constraints & Tradeoffs

| Constraint | Implikation |
|---|---|
| Pattern-Reuse-First | PipelineView-Props-API waechst um 2 optionale Felder. Akzeptabel, weil semantisch sauber. |
| Keine Schema-Migration | Audit-Trail-Erweiterung wird verschoben (V7.2 falls Bedarf). |
| Internal-Test-Mode bleibt aktiv | Compliance-Gate-Auditoren-Anforderungen bleiben Pre-Production-Thema, nicht V7.1. |
| Sprint-Reihenfolge BL-469 → BL-468 → BL-466 | SLC-713 (Defense-in-Depth) kommt zuletzt. Wenn Zeit-Druck: SLC-713 ist ~30 Min, kann auch parallel zu SLC-712 erfolgen. |
| Mein-Profil-Page existiert nicht | Member sieht in Settings nur Working-Hours + Meeting + Briefing. "Mein Profil" als separater Sub-Page-Stub ist out-of-scope V7.1. |

### V7.1 Open Technical Questions

**Alle 6 Open Questions aus RPT-414 sind durch DECs 196-201 entschieden.**

Verbliebene Implementation-Detail-Fragen werden in /slice-planning oder /backend/frontend pro Slice geklaert:

1. Welche existierenden Page-Components (neben PipelineView) muessen `readOnly` + `viewAsUserId`-Props bekommen? — /slice-planning identifiziert Aktivitaeten-View und Mein-Tag-View concrete.
2. Hat `getDealsForPipeline()` heute schon einen optionalen `ownerUserId`-Parameter? — Implementation prueft, ggf. additiv hinzufuegen.
3. Welche Vitest-Mock-Patterns sind in `cockpit/__tests__/team/` etabliert die FEAT-713-Tests reusen koennen? — /backend SLC-713 prueft das.

### V7.1 Recommended Implementation Direction

**Slice-Plan (Schaetzung aus RPT-414 bleibt):**

- **SLC-711** (~4-6h) — FEAT-711 Settings-Permission-Layer
  - MT-1: `SIDEBAR_CONFIG` Erweiterung um 11 Settings-Sub-Pages mit visibleFor
  - MT-2: `(app)/settings/layout.tsx` rollen-aware umbauen
  - MT-3: `(app)/settings/page.tsx` Kacheln-Filter rollen-aware
  - MT-4: 11 Settings-Sub-Pages bekommen `assertRole`-Guard als first line
  - MT-5: Vitest fuer SIDEBAR_CONFIG-Filter-Logic (3 Rollen × visibleFor-Matrix)
  - MT-6: Live-Smoke 3-Rollen-Tour (Admin sieht alles, Teamlead sieht Operatives, Member sieht nur Persoenliches)

- **SLC-712** (~5-8h) — FEAT-712 Drilldown-View Vollausbau
  - MT-1: `<PipelineView>` Props-API erweitern um `readOnly` + `viewAsUserId`
  - MT-2: Mutate-Buttons-Hiding-Logic in PipelineView (Stage-Change, Edit, Drag-Drop, Create-Deal)
  - MT-3: Filter-State-Storage-Key-Schema umbauen auf `viewAsUserId`-postfix
  - MT-4: `team/[user_id]/pipeline/page.tsx` umschreiben auf PipelineView-Reuse
  - MT-5: Analoge Page-Component-Reuse fuer Aktivitaeten-Drilldown (mit gleichem Pattern)
  - MT-6: Analoge Page-Component-Reuse fuer Mein-Tag-Drilldown (mit KI-Workspace-Block scoped auf target_user_id read-only)
  - MT-7: Live-Smoke Teamlead-Sicht mit echtem Member-Daten — alle Toggles funktional, alle Mutate-Buttons unsichtbar
  - **Optionaler Sub-Slice-Split:** wenn MT-1/2/3 zu gross → SLC-712a (PipelineView-Props + Pipeline-Drilldown) + SLC-712b (Aktivitaeten + Mein-Tag).

- **SLC-713** (~30 min - 1h) — FEAT-713 Defense-in-Depth Polish
  - MT-1: 4× `await assertNotReadOnlyContext()` als first line einsetzen
  - MT-2: 4 Vitest-Mock-Tests mit `runWithReadOnlyContext`-Wrapper-Pattern (DEC-201)
  - MT-3: `docs/AUDIT_SERVER_ACTIONS_V7.md` Doc-Sync (5 fehlende Eintraege + 1 Fehlklassifizierung)
  - MT-4: `npm run test:all` clean + Live-Smoke nicht noetig (kein UI-Touch)

**Reihenfolge:** SLC-711 → SLC-712 → SLC-713. Bei Zeit-Druck kann SLC-713 parallel zu SLC-712 erfolgen (kein Konflikt).

### V7.1 Verifikations-Plan

Per Slice + Gesamt-V7.1:

- **SLC-711 PASS:** Vitest gruen, Live-Smoke 3-Rollen-Tour (siehe MT-6). 11 Settings-Pages mit assertRole-Guard.
- **SLC-712 PASS:** Vitest gruen, Live-Smoke Teamlead-Sicht alle Toggles + alle Mutate-Buttons hidden. Drilldown-Filter persistiert pro target_user_id, beruehrt nicht Self-Pipeline.
- **SLC-713 PASS:** 4 neue Vitest-Tests gruen, `npm run test:all` 100% gruen, AUDIT_SERVER_ACTIONS_V7.md syncronisiert.
- **Gesamt-V7.1 PASS:** alle Slices live, `npm run test:all` gruen, audit_log-Trail seit Slice-Deploy aktiv (keine neuen Action-Typen, aber bestehende ai_signal_extract/ai_followup/invite_sent/bulk_reassign/view_as bleiben tracked).

**V7.1 Architecture ready for `/slice-planning`.**

## V7.2 — Test-Infra-Cleanup Architecture (Seed-Script Multi-User + qa-admin + vitest-RLS Path-Alias)

V7.2 ist ein 3-Item Test-Infra-Sprint ohne neue Geschaeftslogik, ohne Schema-Migration, ohne Production-User-Touchpoint. Architektur-Inhalt = Klaerung der 4 Open Questions aus /requirements V7.2 + 3 DECs.

### V7.2 Architecture Summary

| Sub-Item | Komponente | Aenderung | Aufwand |
|---|---|---|---|
| BL-471 | `cockpit/scripts/create-qa-test-users.mjs` + `cockpit/scripts/seed-multi-user.ts` | 1 zusaetzlicher User-Eintrag (qa-admin), 1 Profile-Eintrag, 1 Aux-Fixture-Set | ~20 Min |
| ISSUE-073 | Coolify-DB Multi-User-Seed | `npm run seed:multi-user` einmalig nach V7.2-Deploy via `docker exec` (Manual-Apply, kein Bootstrap-Hook) | ~10 Min Apply |
| ISSUE-074 | `cockpit/vitest.rls.config.ts` | 4-Zeilen-Patch `resolve.alias` (Pattern aus `vitest.config.ts` portiert) | ~5 Min |

**Kein Code-Touch ausserhalb dieser 3 Files.** Keine Schema-Migration. Keine neuen npm-Packages. Keine Dockerfile-Aenderung.

### V7.2 Main Components

#### 1. `cockpit/scripts/seed-multi-user.ts` (Modifikation)
- Bestehender Seed-Script (SLC-701 MT-1) wird um qa-admin-Profile erweitert.
- Neue Konstante `TEST_ADMIN_ID = "00000000-0000-0000-0000-0000000ba001"` (DEC-204 — Range-Konvention).
- `seedTeamAndProfiles` legt qa-admin als 7. Profile mit `role='admin'` und `team_id=TEST_TEAM_ID` an (ON CONFLICT DO UPDATE).
- `seedAuxiliaryFixtures` legt fuer qa-admin 1 Record pro (meetings, proposals, email_messages, calls) an.
- Volumen-Daten (50 companies + 200 contacts + 100 deals + 500 activities) bleiben unveraendert auf 5 Members verteilt — qa-admin ist NICHT Owner von Volumen-Daten, sondern Beobachter mit admin-RLS-Sicht.
- `reset()` erweitert um qa-admin in owners-Array fuer sauberen Re-Seed.

#### 2. `cockpit/scripts/create-qa-test-users.mjs` (Modifikation)
- Bestehende `TEST_USERS`-Liste um qa-admin-Eintrag erweitern (UUID `0...0ba001`, email `qa-admin@strategaize.test`, password `QaV72-Admin!`).
- Idempotenz-Pattern (probe-then-update-or-create) bleibt unveraendert.

#### 3. `cockpit/vitest.rls.config.ts` (Modifikation)
- 4-Zeilen-Patch nach Default-Pattern aus `vitest.config.ts`:
  ```ts
  import path from "node:path";
  // ...
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  ```
- DEC-203 — bewusst `resolve.alias` (Direct-Path) und nicht `vite-tsconfig-paths`-Plugin (keine neue Dependency, Pattern-Reuse mit Default-Config).

### V7.2 Data Flow

V7.2 hat keinen Runtime-Data-Flow im Production-Code. Pure Test-Setup-Datenpfade:

```
Developer/Agent (lokal oder via SSH)
   |
   v
docker exec <app-container> npx tsx scripts/seed-multi-user.ts
   |
   v (TEST_DATABASE_URL=postgresql://postgres:...@supabase-db:5432/postgres)
Coolify-Postgres (Supabase-DB)
   |  -- BEGIN
   |  -- reset()    : DELETE FROM <8 tables> WHERE owner_user_id = ANY([qa-admin + qa-teamlead + 5 qa-members])
   |                  DELETE FROM profiles WHERE id = ANY([qa-admin + qa-teamlead + 5 qa-members])
   |                  DELETE FROM teams WHERE id = TEST_TEAM_ID
   |  -- seed()     : INSERT 1 team + 7 profiles (qa-admin + qa-teamlead + 5 qa-members) + 50 + 200 + 100 + 500 + 7*4 records
   |  -- COMMIT
   v
Test-Daten verfuegbar fuer:
   - `npm run test:rls -- v7-rls-matrix` (96 Cases: 8 Tabellen x 3 Rollen x 4 Operationen — admin/teamlead/member)
   - `npm run test:rls -- bulk-reassign` (7 Suites)
   - `npm run test:rls -- aggregate-queries` (6 Tests)
```

**Keine Auswirkung auf Production-User-Pfad.** Test-Records sind alle `[TEST]`-prefixed und im `TEST_TEAM_ID` isoliert.

### V7.2 External Dependencies / Integrations

Keine. Alle Aenderungen lokal in cockpit/scripts und cockpit/vitest.rls.config.ts.

### V7.2 Security / Privacy Considerations

- **Test-User-Passwords sind starke aber bekannte Strings** (`QaV72-Admin!`, `QaSlc702-Teamlead!`, `QaSlc702-Member!`). Akzeptables Risiko, weil:
  - V7.2 ist Internal-Test-Mode (kein Customer-Login)
  - Test-Accounts sind im TEST-Team isoliert (kein Cross-Team-Daten-Zugriff per RLS)
  - Production-Admin-Account `richard@bellaerts.de` ist separat und nicht von diesen Test-Patterns betroffen
- **Production-DB-Modifikation:** Der Seed-Script wird auf der Coolify-Production-DB ausgefuehrt (Internal-Test-Mode-Pattern). Sicherheits-Massnahmen:
  - Alle DELETE/INSERT sind auf UUID-Range `00000000-0000-0000-0000-0000000xxx` beschraenkt (TEST_TEAM_ID 077, TEAMLEAD 078, MEMBERS 081-085, ADMIN 0ba001) — kein Production-UUID-Overlap moeglich.
  - Alle Records `[TEST]`-prefixed (display_name, company-name, deal-title) — visuell klar markiert in jedem Listing.
  - Transaktion BEGIN/COMMIT/ROLLBACK — bei Fehler kein partial-State.
- **Audit-Log:** Seed-Run wird NICHT in `audit_log` geschrieben (kein User-Aktion-Charakter). Dokumentation im Slice-Report reicht.

### V7.2 Constraints and Tradeoffs

| Constraint | Tradeoff |
|---|---|
| Kein Bootstrap-Hook in Dockerfile (DEC-202) | Manual-Apply nach jedem V7.2-Deploy. Akzeptabel, weil Re-Seed nur ~1-2x/Quartal noetig (nach Schema-Aenderungen). |
| Manual-Apply via docker exec | Agent (Claude) muss bei /qa/Post-Launch den Seed-Run dokumentieren. Konsistent mit feedback_ssh_migrations_always_claude.md. |
| Path-Alias via resolve.alias (nicht vite-tsconfig-paths-Plugin) | Plugin haette automatische tsconfig.json-Path-Resolution geliefert. Tradeoff: 4-Zeilen-Patch vs. neue Dependency + Plugin-Init-Cost. Bei kuenftig vielen Aliases ggf. Plugin-Switch. |
| qa-admin in TEST_TEAM_ID (nicht in Strategaize-Team) | qa-admin sieht nur TEST-Team-Daten, nicht Strategaize-Production-Daten. Akzeptabel weil V7-RLS admin-policies bereits getestet sind via richard@bellaerts.de. qa-admin ist nur fuer Multi-User-RLS-Matrix-Tests da. |
| Time-Box 3-4h | Wenn MT-1 (qa-admin + Seed-Apply) mehr Reibung erzeugt als erwartet (z.B. ISSUE-067-Style POSTGRES_URL-Drift), wird MT-2 (vitest-Config) unabhaengig vorgezogen. |

### V7.2 Open Questions Aufgeloest

**Q1 — Container-Bootstrap-Pfad: Dockerfile-Entrypoint vs. start.sh vs. Coolify-Cron?**
→ **DEC-202: Manual-Apply, kein Bootstrap-Hook.** Begruendung: Bootstrap-Hook in Dockerfile braucht Entrypoint-Script + DB-readiness-Wait + ENV-Gate gegen Production-Drift = 2-3h Aufwand auf 3-4h Sprint plus Risiko-Surface. Manual-Apply via `docker exec` ist konsistent mit `sql-migration-hetzner.md`-Pattern. Wenn spaeter Staging/CI hinzukommt → BL-475 fuer V7.3+.

**Q2 — Seed-Daten-Umfang: Records pro (Tabelle, Owner)?**
→ **Keine Aenderung.** Aktueller Seed hat bereits 50/200/100/500 Records (companies/contacts/deals/activities) auf 5 Member verteilt = 10/40/20/100 pro Member. Mehr als ausreichend fuer RLS-Matrix-Test (braucht min 1 pro Tabelle pro Owner). qa-admin als Beobachter mit admin-RLS-Sicht braucht nur 1 Aux-Fixture-Set (meetings/proposals/email_messages/calls). Keine Volumen-Aenderung.

**Q3 — Internal-Test-Mode-Gate: ENV-Flag oder always-on?**
→ **Entfaellt.** Da kein Bootstrap-Hook, gibt es kein Auto-Ausfuehrungs-Risiko. Manual-Apply ist immer bewusste Entscheidung. Kein ENV-Flag noetig.

**Q4 — Idempotenz-Pattern: `ON CONFLICT DO NOTHING` vs. `WHERE NOT EXISTS`?**
→ **Bestehendes DELETE-then-INSERT-Pattern (mit ON CONFLICT DO UPDATE fuer Team+Profiles) bleibt.** Aktuelle Implementation `reset() + INSERT` ist praktisch idempotent (zweiter Run liefert identischen Endzustand). Refactoring auf ON-CONFLICT-DO-NOTHING + deterministische UUIDs waere Pattern-Wechsel mit hohem Risiko gegenueber bestehenden Tests, die Random-UUID-Verhalten erwarten. Keine Aenderung.

### V7.2 Technical Decisions

3 neue DECs werden in `/docs/DECISIONS.md` ergaenzt:

- **DEC-202** — V7.2 Container-Bootstrap-Pattern: Manual-Apply via docker exec, kein Dockerfile-Hook
- **DEC-203** — V7.2 vitest.rls.config Path-Alias via `resolve.alias` (nicht vite-tsconfig-paths Plugin)
- **DEC-204** — V7.2 qa-admin UUID 0...0ba001 + role='admin' + TEST_TEAM_ID-Zuordnung

### V7.2 Slice-Plan-Skizze (für /slice-planning V7.2)

**1 Slice, 3 MTs:**

- **SLC-721 — Test-Infra-Cleanup (~3-4h)**
  - **MT-1** (~30 Min) — `create-qa-test-users.mjs` + `seed-multi-user.ts` um qa-admin erweitern
    - 1 neuer Eintrag in `TEST_USERS`-Array (create-qa-test-users.mjs)
    - 1 neue Konstante `TEST_ADMIN_ID` (seed-multi-user.ts)
    - `seedTeamAndProfiles` profile-INSERT fuer qa-admin
    - `seedAuxiliaryFixtures` aux-records fuer qa-admin
    - `reset()` owners-Array erweitern
    - Verifikation: `npx tsx scripts/seed-multi-user.ts --reset` clean, dann `npx tsx scripts/seed-multi-user.ts` legt 7 Profile statt 6
  - **MT-2** (~15 Min) — `vitest.rls.config.ts` Path-Alias-Resolver
    - Import `path` aus `node:path`
    - `resolve.alias` Block aus default-config kopieren
    - Verifikation: `npm run test:rls -- bulk-reassign` laedt 7 Suites (statt 0)
  - **MT-3** (~1-2h) — Coolify-DB Apply + Test-Suite-Verifikation + Records-Sync
    - SSH zu 91.98.20.191
    - `TEST_DATABASE_URL=postgresql://postgres:...@supabase-db:5432/postgres docker exec <app-container> npx tsx scripts/seed-multi-user.ts` (Apply)
    - `docker exec <app-container> node /tmp/create-qa-test-users.mjs` (qa-admin auth.user anlegen)
    - Lokal: `npm run test:all` gegen Coolify-DB → erwartet 897 PASS
    - Falls Tests rote Stellen aufzeigen die durch Schema-Drift entstehen: ISSUE notieren, V7.2-Scope NICHT erweitern
    - Records-Sync: ISSUE-073 + ISSUE-074 + BL-471 + BL-473 + BL-474 auf `resolved`, SLC-721 + FEAT-721 auf `done`

### V7.2 Verifikations-Plan

Per MT + Gesamt-V7.2:

- **MT-1 PASS:** `psql -c "SELECT email, role FROM profiles WHERE id LIKE '0000%' ORDER BY id"` zeigt 7 Profile mit qa-admin als role=admin.
- **MT-2 PASS:** `npm run test:rls -- bulk-reassign` laedt 7 Test-Suites + sie laufen (Pass/Fail egal — Hauptziel: nicht 0 Tests).
- **MT-3 PASS:** `npm run test:all` 897 PASS (779 jsdom + 118 RLS), Idempotenz-Re-Run liefert identischen Output.
- **Gesamt-V7.2 PASS:** alle 3 MTs done, 897 PASS, ISSUE-073+074 resolved, V7.5-Ramp ready.

**V7.2 Architecture ready for `/slice-planning`.**

## V7.5 — Natural-Language Workflow-Sculptor + ISSUE-066-Closure Architecture

### V7.5 Strategy

V7.5 ist ein **Reuse-Heavy-Feature-Sprint**. Zwei Bauteile:

1. **FEAT-751 NL-Workflow-Sculptor** — neuer Bedrock-LLM-Layer-Adapter (`sculptor.ts`), der Klarsprache **strict 1:1** auf bestehende V6.2-`automation_rules`-Struktur mappt. Keine neue Schema-Tabelle, kein neuer Cron, kein neuer Provider, kein neuer Trigger-Typ. Aufgesetzt auf bestehende `bedrock-client.ts` (V3) + `whisper-adapter.ts` (V4.1) + `automation_rules`/`automation_runs` (V6.2) + Mein-Tag-KI-Workspace-Hybrid-Layout (V6.6).

2. **FEAT-752 ISSUE-066-Closure** — Middleware-Pfad-Check setzt `X-Read-Only-Mode: 1`-Request-Header fuer `/team/[user_id]/*`-Routes. `assertNotReadOnlyContext()` erweitert um `next/headers`-Read. Defense-in-Depth-Symmetrie zu V7-AsyncLocalStorage-Layer.

Keine neuen npm-Packages (`zod` existiert bereits in V5.7+, Whisper + Bedrock-Clients existieren). Keine neuen Container, kein neuer Cron, keine neuen Tabellen (nur additiv: `audit_log`-Action `automation_rule.sculpt_attempt`). Internal-Test-Mode bleibt aktiv.

### V7.5 Strategy-Leitprinzipien

- **Pattern-Reuse-First** (CLAUDE.md Core-Default #5, `feedback_cross_project_reference`): Bedrock-Client aus V3, Whisper-Adapter aus V4.1, healJsonEscapes aus IS-SLC-109, V6.2 `automation_rules`-Schema + DEC-132-Trockenlauf, V6.6 KI-Workspace-Hybrid-Layout.
- **Strict-Schema-Mandate (DEC-205):** Sculptor mappt LLM-Output gegen zod-Schema, das die V6.2-Whitelists exakt spiegelt (3 Trigger + 4 Actions + Field-Whitelist aus `automation/field-whitelist.ts`). Bei Validation-Fail: 1x Re-Prompt mit Korrektur-Hint, sonst structured Reject.
- **Trockenlauf-Pflicht (User-Direktive 2026-05-16):** UI-State erzwingt Sequenz `Sculpt → Trockenlauf → Confirm-Modal → Apply`. Kein Skip-Pfad, kein "Sofort-aktiv"-Toggle.
- **Multi-User-Aware-from-Start:** Sculptor-Aufruf braucht `auth.uid()` → kein Anonymous-Pfad. Soft-Dedup (DEC-209c) verhindert Doubletten desselben Owners. Visibility folgt V7.1-Permission-Matrix (`assertRole(["admin","teamlead"])` auf Mein-Tag-NL-Surface).
- **Data-Residency-Pin (DEC-211):** Bedrock-Region strikt `eu-central-1`. Startup-Assertion in `bedrock-client.ts`. Kein US-Endpoint-Drift in V7.5.

### V7.5 Components Affected

```
Browser (HTTPS)
  │
Coolify / Caddy
  │
Next.js App (BD Cockpit)
  │
  ├── middleware.ts                                       ─── ERWEITERT (FEAT-752)
  │   └── Pfad-Regex /^\/team\/[^/]+\// triggert
  │       NextResponse.headers.set("X-Read-Only-Mode","1")
  │       (alle anderen Pfade unbeeinflusst)
  │
  ├── /lib/auth/read-only-context.ts                      ─── ERWEITERT (FEAT-752)
  │   └── assertNotReadOnlyContext() liest AsyncLocalStorage
  │       UND headers().get("X-Read-Only-Mode") parallel.
  │       Throw bei beiden. ISSUE-066-Comment angepasst.
  │
  ├── /lib/automation/                                    ─── NEU (FEAT-751)
  │   ├── sculptor.ts            — sculptRule(nlInput, userId) → SculptResult
  │   │                            Single-Shot Bedrock-Call + zod-Validate +
  │   │                            healJsonEscapes-Reuse + max 2 Versuche +
  │   │                            audit_log-Insert pro Versuch
  │   ├── sculptor-prompts.ts    — System-Prompt + 8 Few-Shot-Examples
  │   │                            (4 Erfolg + 2 Reject + 2 Edge)
  │   ├── sculptor-schema.ts     — zod-Schema das V6.2-Trigger+Action-
  │   │                            Whitelist exakt spiegelt (Single-Source-
  │   │                            of-Truth gemeinsam mit
  │   │                            automation/field-whitelist.ts)
  │   ├── sculptor-cost.ts       — Bedrock-Pricing-Tabelle + Cost-Calc
  │   │                            aus usage.input_tokens + output_tokens
  │   ├── sculptor-dedup.ts      — assertNotDuplicateRule(...) Soft-Check
  │   │                            via Name + Trigger + JSON.stringify
  │   └── nl-history.ts          — listNlSculptHistory(limit, userId)
  │                                Listing-Query aus audit_log
  │
  ├── /lib/speech/whisper-adapter.ts                      ─── REUSE (V4.1)
  │   └── transcribe(audioBlob) → text — bereits in V4.1/V6.6 verwendet
  │
  ├── /lib/llm/bedrock-client.ts                          ─── REUSE + ERWEITERT
  │   └── Bestehende invokeBedrock() + Region-Assertion (DEC-211)
  │       wirft bei region !== "eu-central-1"
  │
  ├── (app)/mein-tag/                                     ─── ERWEITERT
  │   ├── components/nl-rule-builder-card.tsx (NEU)
  │   │   └── 4-Karten-Sequenz:
  │   │       ├── 1. NL-Eingabe (Text + Mikro-Button + Sculpt-Button)
  │   │       ├── 2. Klarsprache-Karte (Original + Intent-Echo)
  │   │       ├── 3. Schema-Karte (editierbare Form-Felder)
  │   │       ├── 4. Trockenlauf-Karte (V6.2-DEC-132-Reuse)
  │   │       └── Confirm-Modal (DEC-207) vor Apply
  │   └── mein-tag-client.tsx (PATCH)
  │       └── Mounted <NLRuleBuilderCard /> im KI-Workspace-Bereich
  │         (Visibility: assertRole(["admin","teamlead"]) Server-Side
  │         + serverProps.canSculpt Boolean → Client hidet fuer Member)
  │
  ├── (app)/settings/workflow-automation/                 ─── ERWEITERT
  │   └── nl-history/page.tsx (NEU)
  │       └── assertRole(["admin"]) als first line.
  │           Liste der letzten 50 Sculpt-Versuche aus audit_log.
  │           Tabelle: Datum / User / NL-Input-Snippet / Status /
  │           Cost-USD / Trigger-Event (bei Erfolg) / Reject-Reason.
  │
  └── (app)/mein-tag/actions/
      ├── sculpt-nl-rule.ts (NEU)
      │   └── Server Action: sculptNlRule(formData) → SculptResult
      │       1. assertRole(["admin","teamlead"])
      │       2. Optional: Whisper-Transkription wenn audio_blob
      │       3. sculptRule() aus lib/automation/sculptor.ts
      │       4. audit_log Insert (action="automation_rule.sculpt_attempt")
      │
      ├── preview-nl-rule.ts (NEU)
      │   └── Server Action: previewNlRule(schemaJson) → PreviewResult
      │       Reuse V6.2-DEC-132-Trockenlauf-Logik (read-only Query
      │       letzte 7 Tage) — kein DB-Mutate, kein audit_log.
      │
      └── apply-nl-rule.ts (NEU)
          └── Server Action: applyNlRule(schemaJson, sculpt_audit_id)
              1. assertRole(["admin","teamlead"])
              2. zod-Validate (Defense-in-Depth)
              3. assertNotDuplicateRule()
              4. INSERT automation_rules(status="active",
                 created_by=auth.uid(), trigger_event/config/conditions/
                 actions=<form-state>, created_via="nl_sculptor")
              5. audit_log Insert (action="automation_rule.create_via_nl",
                 metadata: {nl_input, sculpt_audit_id, sculptor_cost_usd})
```

### V7.5 Schema / Data Model

**Keine neue Tabelle, keine zwingende ALTER TABLE.** Zwei optional additive Spalten:

```sql
-- OPTIONAL (additiv, kein UPDATE bestehender Rows):
ALTER TABLE automation_rules ADD COLUMN created_via TEXT
  CHECK (created_via IN ('click_wizard','nl_sculptor'))
  DEFAULT 'click_wizard';
-- bestehende Rows bleiben 'click_wizard' (Default). Inspection-Log-Filter
-- "Nur NL-erzeugte Regeln" funktioniert sofort. NICHT zwingend fuer V7.5,
-- aber bei Inspection-Filter sinnvoll. /slice-planning entscheidet ob
-- in V7.5 oder als V7.6-Polish.
```

Wenn `created_via` nicht in V7.5 angelegt wird, leistet das Inspection-Log seine Funktion auch via `audit_log.action='automation_rule.create_via_nl'`-Pfad (Sub-Query-Join). Default-Hypothese: in V7.5 mit-eintragen, kostet 1 MIG.

**Audit-Log-Schema (bestehend, additiv genutzt):**

```
audit_log:
  action: 'automation_rule.sculpt_attempt'   -- NEU (V7.5)
  metadata JSONB:
    {
      "nl_input": "Wenn ein Deal in Phase Angebot bewegt wird...",
      "transcript_source": "text" | "voice",
      "sculptor_model_id": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "sculptor_cost_usd": 0.003,
      "attempt_count": 1,
      "result_status": "success" | "reject" | "validation_fail",
      "result_payload": { /* SculptResult oder Reject-Reason */ }
    }

  action: 'automation_rule.create_via_nl'    -- NEU (V7.5)
  entity_type: 'automation_rule'
  entity_id: <new rule id>
  metadata JSONB:
    {
      "nl_input": "...",
      "sculpt_audit_id": "<audit_log.id of sculpt_attempt>",
      "sculptor_cost_usd": 0.003,
      "edited_in_form": true | false
    }

  action: 'read_only_context_blocked'        -- NEU (V7.5 FEAT-752)
  metadata JSONB:
    {
      "path": "/team/<uuid>/pipeline",
      "attempted_action": "updateDeal",
      "blocked_via": "header" | "async_local_storage" | "both"
    }
```

Listing-Query `nl-history.ts`:
```sql
SELECT id, actor_id, created_at, metadata
FROM audit_log
WHERE action = 'automation_rule.sculpt_attempt'
  AND ($1::uuid IS NULL OR actor_id = $1)  -- Optional Owner-Scope
ORDER BY created_at DESC
LIMIT 50;
```

### V7.5 Sculptor-Prompt-Architektur (DEC-205)

**Entscheidung: Single-Shot mit zod-Validate + 1x Re-Prompt-Loop (max 2 Bedrock-Calls).**

Alternativen geprueft:

| Pattern | Pro | Contra | Entscheidung |
|---|---|---|---|
| **A** Single-Shot ohne Loop | billigste Cost (~$0.003) | LLM-JSON-Drift bricht alles | verworfen |
| **B** Single-Shot mit zod-Validate + 1x Re-Prompt (max 2) | robust gegen JSON-Drift, Total-Cost <$0.006 | minimal komplexer Code-Pfad | **gewaehlt** |
| **C** Multi-Turn (Trigger → Conditions → Actions separat) | strukturierte Aufloesung | 3x Cost + 3x Latenz, kein Mehrwert bei Strict-Schema | verworfen |
| **D** Tool-Use / Function-Calling-API von Bedrock | strukturiertes Output, vom Provider erzwungen | Lock-in Tool-Calling-Spec, weniger portierbar bei Provider-Wechsel | verworfen fuer V7.5 (Backlog: BL-spaeter) |

**System-Prompt-Skizze (DEC-205b):**

```
Du bist ein Workflow-Sculptor fuer ein deutsches B2B-CRM. Aufgabe:
nimm eine NL-Eingabe (Deutsch oder Englisch), die eine Automatisierungs-
Regel beschreibt, und antworte mit GENAU einem JSON-Objekt, das die
folgende strikte Schema-Form hat:

{
  "trigger_event": "deal.stage_changed" | "deal.created" | "activity.created",
  "trigger_config": { /* event-spezifische Keys, siehe Few-Shots */ },
  "conditions": [ { "field": ..., "op": "eq"|"neq"|"gt"|"lt"|..., "value": ... } ],
  "actions": [ { "type": "create_task"|"send_email_template"|
                          "create_activity"|"update_field",
                  "params": { /* type-spezifische Keys */ } } ]
}

Wenn die Eingabe einen Trigger oder eine Action ausdrueckt, der/die
NICHT in der Whitelist ist, antworte stattdessen mit:

{ "reject_reason": "out_of_domain",
  "explanation": "<2 saetze: was geht nicht + Vorschlag fuer V6.2-konformen Ersatz>" }

NIEMALS andere Trigger-Events, NIEMALS andere Action-Types,
NIEMALS Free-Form Property-Keys. Bei Unsicherheit: reject.

Hier sind 8 Beispiele:
[Few-Shots: 4x success / 2x reject / 2x edge]
```

**Re-Prompt-Loop-Pattern:**

```typescript
async function sculptRule(nlInput: string): Promise<SculptResult> {
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = lastError
      ? `${SYSTEM_PROMPT}\n\nDein letzter Versuch hatte folgenden Fehler: ${lastError}\nKorrigiere das Format und antworte erneut.`
      : SYSTEM_PROMPT;
    const response = await invokeBedrock(prompt, nlInput);
    const healed = healJsonEscapes(response.text);  // IS-SLC-109-Pattern
    const parsed = sculptSchema.safeParse(JSON.parse(healed));
    await insertAuditLog({
      action: "automation_rule.sculpt_attempt",
      actor_id: userId,
      metadata: { nl_input: nlInput, attempt_count: attempt, ... }
    });
    if (parsed.success) return { status: "success", payload: parsed.data, attemptCount: attempt };
    lastError = parsed.error.message;
  }
  return { status: "validation_fail", reason: lastError, attemptCount: 2 };
}
```

Total-Cost-Erwartung: ~$0.003 fuer Erfolg-1st-Try, ~$0.006 fuer 2nd-Try-Recovery, ~$0.006 fuer Reject. **Median: <$0.005.**

### V7.5 NL-History-Storage (DEC-206)

**Entscheidung: `audit_log`-Reuse mit JSONB-`metadata`. KEIN neues Schema.**

Alternativen geprueft:

| Pattern | Pro | Contra | Entscheidung |
|---|---|---|---|
| **A** Neue Tabelle `nl_sculpt_history` | starker Index auf nl_input, schnelle Query | neues Schema, neue Migration, neue RLS-Policy, neue Backup-Sektion | verworfen |
| **B** audit_log mit JSONB metadata | kein neues Schema, RLS bereits aktiv, konsistent mit V6.2-Audit | weniger schnelle Query bei sehr grossem audit_log | **gewaehlt** |
| **C** Bedrock-Cost in Cloudwatch separat tracken | Provider-side Cost-View | App-spezifische Logik fehlt im Cloudwatch (z.B. Edit-Status), 2 Quellen | verworfen |

Inspection-Log-UI auf `/settings/workflow-automation/nl-history` ist Admin-only (V7.1-Permission-Matrix). Listing-Query LIMIT 50. Bei Bedarf spaeter Pagination, V7.5 nimmt Latest-50.

### V7.5 Apply-Confirmation-UI (DEC-207)

**Entscheidung: Confirm-Modal nach Trockenlauf, vor `automation_rules`-INSERT.**

Sequenz:
1. User klickt "Trockenlauf anzeigen" → `previewNlRule()` → Trockenlauf-Karte erscheint mit "Diese Regel haette folgendes erzeugt: ..."
2. User klickt "Regel aktivieren" → **Confirm-Modal** oeffnet sich mit:
   - Klarsprache-Echo
   - Trigger-Event-Label ("Bei Stage-Wechsel auf 'Angebot'")
   - Action-Liste-Label ("erzeuge Task 'Follow-up zu {{deal.name}}' in 2 Tagen")
   - Pflicht-Checkbox: "Ich bestaetige: Diese Regel wird ab jetzt auf alle neuen Stage-Wechsel angewandt."
   - Apply-Button (disabled bis Checkbox aktiv)
3. Apply-Klick → `applyNlRule()` → INSERT mit `status='active'` + Audit-Log + Toast "Regel aktiviert"

Modal verhindert Klick-Drift (Trockenlauf-Karte-Knopf neben anderen Buttons). Konsistent mit `feedback_qa_mandatory`-Pattern (User mag Guardrails).

### V7.5 Sculptor-Cost-Display (DEC-208)

**Entscheidung: Real-Cost nach Bedrock-Call, additiv bei Reject-Loop.**

`sculptor-cost.ts`:

```typescript
const PRICING = {
  "anthropic.claude-3-5-sonnet-20241022-v2:0": {
    input_per_1k:  0.003,
    output_per_1k: 0.015,
  }
};

export function calculateSculptCost(usage: BedrockUsage, modelId: string): number {
  const pricing = PRICING[modelId];
  return (usage.input_tokens / 1000) * pricing.input_per_1k
       + (usage.output_tokens / 1000) * pricing.output_per_1k;
}
```

UI zeigt nach Sculpt-Klick: `"~$0.003 fuer 1 Versuch"` oder `"~$0.006 fuer 2 Versuche"` (kumulativ bei Re-Prompt-Loop). **Vorab-Estimate (Tokenizer-Client-side) ist out-of-scope** — Tokenizer-Lib-Bundle waere ein Extra-Bundle-Size, kein User-Mehrwert (~$0.003 ist niedrig genug, keine Pre-Approval-Friction noetig).

### V7.5 ISSUE-066 Middleware-Mitigation (DEC-210)

**Pfad-Regex:** `/^\/team\/[^/]+\//`

Match-Tabelle:

| Request-Pfad | Match | Header-Set |
|---|---|---|
| `/team/abc-123/pipeline` | ✓ | `X-Read-Only-Mode: 1` |
| `/team/abc-123/aufgaben/new` | ✓ | `X-Read-Only-Mode: 1` |
| `/team/abc-123/mein-tag` | ✓ | `X-Read-Only-Mode: 1` |
| `/team/` (Liste, ohne Sub-Pfad) | ✗ | kein Header |
| `/team` (Top-Level) | ✗ | kein Header |
| `/api/cron/automation-runner` | ✗ | kein Header |
| `/api/health` | ✗ | kein Header |
| `/settings/team` | ✗ | kein Header |
| `/login` | ✗ | kein Header |

`assertNotReadOnlyContext()` post-V7.5:

```typescript
import { headers } from "next/headers";

export async function assertNotReadOnlyContext(): Promise<void> {
  // Layer 1: AsyncLocalStorage (SLC-706, Server-Component-Render-Chain)
  const ctx = readOnlyContextStore.getStore();
  if (ctx) throw new ReadOnlyContextError("AsyncLocalStorage", ctx);

  // Layer 2: HTTP-Header (V7.5 FEAT-752, Server-Action-Request)
  const hdr = headers().get("X-Read-Only-Mode");
  if (hdr === "1") {
    throw new ReadOnlyContextError("X-Read-Only-Mode header", { source: "middleware" });
  }
  // Beide Layer aktiv: throw ist bereits passiert, kein parallel-bedingter Pfad
}
```

Vitest-Mock-Pattern (DEC-201-konform):
```typescript
import { headers } from "next/headers";
vi.mock("next/headers");

test("blocks via X-Read-Only-Mode header", async () => {
  vi.mocked(headers).mockReturnValue({
    get: vi.fn().mockReturnValue("1")
  } as any);
  await expect(assertNotReadOnlyContext()).rejects.toThrow(ReadOnlyContextError);
});
```

### V7.5 Bedrock-Region-Pin (DEC-211)

**Entscheidung: Startup-Assertion in `bedrock-client.ts` + ENV-Variable `BEDROCK_REGION=eu-central-1` (existiert bereits).**

```typescript
// bedrock-client.ts (Erweiterung)
const ALLOWED_REGION = "eu-central-1";

export function createBedrockClient(): BedrockRuntimeClient {
  const region = process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "";
  if (region !== ALLOWED_REGION) {
    throw new Error(
      `Bedrock-Region-Drift: BEDROCK_REGION=${region}, erwartet ${ALLOWED_REGION}. ` +
      `Data-Residency-Pflicht laut data-residency.md.`
    );
  }
  return new BedrockRuntimeClient({ region });
}
```

Vitest-Test: Mock `process.env.BEDROCK_REGION = "us-east-1"` → `createBedrockClient()` wirft. Region-Pin gilt fuer **alle** Bedrock-Aufrufer im Repo (V3 LLM-Layer, V4.2 RAG-Embeddings, V6.2 Workflow-LLM-falls-vorhanden, V7.5 Sculptor) — Single Choke-Point.

### V7.5 Sculptor-File-Layout (DEC-209)

`cockpit/src/lib/automation/`:
- `sculptor.ts` — Core: `sculptRule(nlInput, userId)`, `re-prompt-loop`, audit-log-insert
- `sculptor-prompts.ts` — System-Prompt-String + Few-Shot-Examples-Array (8 Cases)
- `sculptor-schema.ts` — zod-Schemas: SculptSuccessSchema, SculptRejectSchema, ConditionFieldSchema, ActionTypeSchema. Importiert `FIELD_WHITELIST` aus bestehender `field-whitelist.ts` als Single-Source-of-Truth.
- `sculptor-cost.ts` — PRICING-Table + `calculateSculptCost(usage, modelId)`
- `sculptor-dedup.ts` — `assertNotDuplicateRule(rule, userId)` → throws 409 bei Match
- `nl-history.ts` — `listNlSculptHistory(limit, ownerScope?)` — Listing-Query

Test-Files unter `cockpit/__tests__/automation/` (Live-DB-Tests gegen Coolify-DB) + `cockpit/src/lib/automation/__tests__/` (Unit-Tests mit vi.mock).

### V7.5 Data Flow — Sculpt-Pfad

```
1. User auf /mein-tag, Admin oder Teamlead. NLRuleBuilderCard sichtbar.
2. User tippt oder spricht Klarsprache. Voice-Path:
   - Mikro-Klick → MediaRecorder → POST /api/whisper-transcribe
   - whisper-adapter.ts → openai-Default oder Azure-EU
   - Transkript zurueck in Text-Feld, editierbar.
3. User klickt "Regel bauen" → Server Action sculptNlRule(nlInput, transcriptSource)
4. Server Action:
   4a. assertRole(["admin","teamlead"]) (Member-Bypass-Schutz)
   4b. sculptor.sculptRule(nlInput, userId)
       - invokeBedrock() mit System-Prompt + nlInput (1st Try)
       - healJsonEscapes(response.text)
       - sculptSchema.safeParse(JSON.parse(...))
       - bei success: audit_log INSERT success-Eintrag, return Payload
       - bei fail: 1x Re-Prompt mit Korrektur-Hint, sonst Reject
   4c. Return SculptResult an Client.
5. Client UI:
   - bei success: Klarsprache-Karte + Schema-Karte (editierbar) rendern
   - bei reject (out_of_domain): Reject-Karte mit Erklaerung + Vorschlag
   - bei validation_fail: Generic-Fail-Karte mit "Bitte praeziser formulieren"
6. User klickt "Trockenlauf anzeigen" → Server Action previewNlRule(currentSchema)
7. Server Action: V6.2-DEC-132-Reuse, read-only SELECT-Query letzte 7 Tage,
   Mock-Apply der Rule-Logik (kein DB-Mutate, kein audit_log).
8. Client: Trockenlauf-Karte mit Trefferliste.
9. User klickt "Regel aktivieren" → Confirm-Modal mit Pflicht-Checkbox.
10. Apply-Klick → Server Action applyNlRule(currentSchema, sculpt_audit_id)
    10a. assertRole + zod-Validate (Defense-in-Depth)
    10b. assertNotDuplicateRule() — Soft-Dedup, 409 bei Match
    10c. INSERT automation_rules(status="active", created_by=auth.uid(),
         trigger_event/config/conditions/actions=<form>, created_via="nl_sculptor")
    10d. INSERT audit_log(action="automation_rule.create_via_nl", entity=<rule>,
         metadata={nl_input, sculpt_audit_id, edited_in_form})
11. Client: Toast "Regel aktiviert". Karten-State resettet.
12. V6.2-Engine: ab naechstem Stage-Wechsel auf <stage> wird die neue
    Regel via Dispatcher executiert (kein Code-Change in V6.2-Pfad).
```

### V7.5 Data Flow — Drilldown-Mutate-Block (FEAT-752)

```
1. Teamlead navigiert /team/<member-uuid>/pipeline.
2. middleware.ts: Pfad matched /^\/team\/[^/]+\// → NextResponse.headers
   .set("X-Read-Only-Mode", "1"). Request laeuft weiter.
3. layout.tsx (V7-SLC-706, unveraendert): runWithReadOnlyContext({...}, render).
4. Page rendert. PipelineView readOnly. Keine Mutate-Buttons sichtbar (V7.1-FEAT-712).
5. Angreifer (Teamlead in DevTools) macht Direct-Server-Action-Call:
   fetch("/team/<member-uuid>/pipeline", {
     method: "POST",
     headers: { "Next-Action": "<server-action-id>", ... },
     body: <updateDeal-payload>
   })
6. Next.js routet zur Server-Action.
7. Server-Action ruft assertNotReadOnlyContext() als first line (Pattern aus
   SLC-704, FEAT-713).
8. assertNotReadOnlyContext():
   - AsyncLocalStorage: nicht aktiv im Server-Action-Pfad (ISSUE-066-Gap).
   - headers().get("X-Read-Only-Mode"): "1" (von Middleware gesetzt).
   - throw ReadOnlyContextError("X-Read-Only-Mode header", ...).
9. audit_log INSERT(action="read_only_context_blocked", metadata={path,
   attempted_action, blocked_via}).
10. Client erhaelt 500/Error-Response. UI keine Mutation.
```

### V7.5 External Dependencies / Integrations

**KEIN Delta.** Alle V7.5-Funktionalitaet nutzt bestehende Provider:

- Bedrock Claude Sonnet 3.5 — `eu-central-1` (V3+, Region-Pin DEC-211)
- Whisper Speech-to-Text — openai-Default (V4.1), Azure-EU Code-Ready (V5.2)
- Supabase Postgres + GoTrue — V2 (audit_log, automation_rules)

Keine neue npm-Package-Dependency (`zod` existiert seit V5.7, healJsonEscapes ist Code-Reuse aus IS-SLC-109-Pattern).

### V7.5 Security / Privacy Considerations

- **Bedrock-Region-Pin** (DEC-211) verhindert US-Endpoint-Drift bei Provider-Wechsel oder Mis-Config.
- **NL-Input enthaelt potenziell PII** (Deal-Namen, Kontakt-Hinweise). Bedrock-EU-Frankfurt hat DSGVO-konformes DPA (data-residency.md). Audit-Log speichert `nl_input` voll → Loesch-/Retention-Policy folgt bestehender `audit_log`-Retention (heute: 365 Tage). Falls Retention strenger gewuenscht: V8+-Item.
- **Voice-Input via Whisper-openai-Default** (V4.1) hat dokumentiertes Compliance-Gate (ISSUE-042 + Azure-EU-Switch). V7.5 erbt diesen Stand — kein neues Risiko, aber **vor Drittnutzer-Customer-Ship** zwingend Azure-EU-Switch.
- **Permission-Gate** verhindert Member-Sculpting (V7.1-Matrix). `assertRole(["admin","teamlead"])` server-side. Client-side `canSculpt`-Boolean nur UX-Layer.
- **Soft-Dedup** verhindert Doubletten desselben Owners (kein Trust-Layer, sondern UX-Layer — DB-RLS bleibt erste Verteidigungslinie).
- **FEAT-752 schliesst ISSUE-066** — Same-Team-Bypass-Risiko des Read-Only-UX-Versprechens entfaellt. Cross-Team-RLS-Schutz unveraendert aktiv.
- **Audit-Trail-Erweiterung**: 3 neue `audit_log`-Action-Strings (`automation_rule.sculpt_attempt`, `automation_rule.create_via_nl`, `read_only_context_blocked`). Listing-Recipes existieren (V6.2-Pattern), keine neue audit-Doc-Spalte noetig.

### V7.5 Constraints & Tradeoffs

- **Strict-Schema-Mandate (DEC-205)** = bewusster Tradeoff gegen User-Komfort. NL-Sculptor wird Regeln ablehnen, die ein freier Builder erfinden koennte. Begruendung: V6.2-Engine ist Single-Source-of-Truth, neue Trigger/Actions sind eigene V8+-Releases mit eigenen Migrations.
- **Trockenlauf-Pflicht (DEC-132-Reuse)** = bewusster Tradeoff gegen Schnellsetup. Ein "Soforktiv"-Skip-Modus wurde diskutiert und verworfen (User-Direktive: Guardrails-strong).
- **Single-Shot-Prompt (DEC-205)** = bewusster Tradeoff gegen Multi-Turn-Robustheit. Bei Schema-Drift wuerde Multi-Turn graceful-er degraden, kostet aber ~3x. /qa-Slice misst Sculpt-Accuracy auf 10 Real-World-Prompts; falls <70% PASS, Multi-Turn als V7.6-Polish.
- **audit_log-Reuse (DEC-206)** = bewusster Tradeoff gegen Query-Speed. Bei >100k audit_log-Rows Filter-Performance pruefen. V7.5 nimmt das Risiko (Tabelle heute <10k Rows).
- **Voice-Input openai-Default-Erbe** = ISSUE-042-Pre-Production-Gate bleibt aktiv. V7.5 macht keine Customer-Releases — Internal-Test-Mode-Pattern.
- **Inspection-Log Admin-only** = Teamlead sieht eigene NL-Versuche NICHT in einer Listing-View. Begruendung: Teamlead-Inspection-Bedarf ist gering, Admin macht Audit-Sweep. Wenn Bedarf real auftritt: V7.6-Erweiterung Inspection-Log `assertRole(["admin","teamlead"])`.

### V7.5 Open Technical Questions

Alle 6 PRD-Open-Questions in V7.5-DECs entschieden (DEC-205..211). **Keine offenen technischen Open-Questions** mehr. Folgendes wird in /slice-planning konkretisiert (nicht-architektonisch):

1. ~~Sculptor-Prompt-Architektur~~ → DEC-205 Single-Shot mit 1x Re-Prompt
2. ~~NL-History-Storage~~ → DEC-206 audit_log JSONB
3. ~~Apply-Confirmation-UI~~ → DEC-207 Confirm-Modal mit Pflicht-Checkbox
4. ~~Sculptor-Cost-Display~~ → DEC-208 Real-Cost nach Bedrock-Call
5. ~~ISSUE-066-Middleware-Pfad-Regex~~ → DEC-210 `/^\/team\/[^/]+\//`
6. ~~Bedrock-Region-Drift~~ → DEC-211 Startup-Assertion `eu-central-1`

**Offene /slice-planning-Fragen:**
- Slice-Reihenfolge: ISSUE-066-Middleware (SLC-751) als foundation-first? oder als letzter Slice (post-Feature-Smoke)? **Empfehlung Architecture:** foundation-first.
- `automation_rules.created_via`-Column in V7.5 anlegen (additive Migration) oder als V7.6-Polish defer? **Empfehlung Architecture:** in V7.5 mit anlegen (1 MIG-Eintrag, kein User-facing Code-Touch noetig).
- Few-Shot-Pool-Groesse: 8 (Default) oder 12? **Empfehlung Architecture:** 8 reicht fuer V7.5-Sculpt-Accuracy-Ziel (>70% PASS).

### V7.5 Empfohlene Slice-Reihenfolge (Vorschlag fuer /slice-planning)

**Foundation-First-Pattern:**

| Slice | Feature | Inhalt | Schaetzung | Acceptance |
|---|---|---|---|---|
| SLC-751 | FEAT-752 | ISSUE-066-Middleware-Mitigation (Pfad-Regex + Header + assertNotReadOnlyContext-Erweiterung + Vitest-Mock + Playwright-Live-Smoke) | 1-2h | Defense-in-Depth-Foundation steht |
| SLC-752 | FEAT-751 | Sculptor-Adapter Core (sculptor.ts + sculptor-prompts.ts + sculptor-schema.ts + sculptor-cost.ts + Vitest mit 8 Real-World-Prompts + Bedrock-Region-Assertion) | 3-5h | Sculpt-Accuracy >70% in Vitest |
| SLC-753 | FEAT-751 | Mein-Tag-NL-Surface (NLRuleBuilderCard.tsx + Sculpt-Server-Action + assertRole + Klarsprache+Schema-Karten + Bedrock-Cost-Display) | 3-5h | Live-Smoke: NL→Schema-Karte sichtbar |
| SLC-754 | FEAT-751 | Trockenlauf-Karte + Apply-Confirmation-Modal (previewNlRule + applyNlRule + assertNotDuplicateRule + audit_log-create_via_nl + Confirm-Modal mit Pflicht-Checkbox) | 2-3h | Live-Smoke: Regel aktiv, V6.2-Engine triggert sie |
| SLC-755 | FEAT-751 | Voice-Input-Integration (Whisper-Adapter-Reuse + Mikro-Button + Transkript-Edit + Audio-Upload-API-Route) | 1-2h | Live-Smoke: Voice→Transkript→Schema |
| SLC-756 | FEAT-751 | Inspection-Log auf /settings/workflow-automation/nl-history (Admin-only assertRole + Listing-Query + Tabelle + audit_log-Filter) | 2-3h | Live-Smoke: Admin sieht eigene + andere Sculpts |

Total: ~12-20h. /slice-planning kann Slices weiter splitten oder zusammenziehen, aber **Reihenfolge SLC-751 als Foundation-First** ist Architecture-Empfehlung.

### V7.5 Verifikations-Plan

**Vitest (Unit + Live-DB):**
- Sculptor-Vitest: 8 Real-World-Prompts (4 success, 2 reject, 2 edge). Mindest-PASS-Rate ≥70%.
- zod-Schema-Vitest: Schema-Validate gegen 20 generierte LLM-Output-Variations (good/drifted/malformed). Reject-Loop greift.
- Sculptor-Cost-Vitest: Mock Bedrock-Usage → Cost-Berechnung exakt.
- assertNotDuplicateRule-Vitest: identical-Rule-Insert wirft 409, distinct-Rule passes.
- assertNotReadOnlyContext-Vitest: 4 Cases (header=1+no-ALS, no-header+ALS, both, neither).
- Middleware-Pfad-Regex-Vitest: 9 Pfad-Variationen (siehe Match-Tabelle).
- Bedrock-Region-Assertion-Vitest: us-east-1 throws, eu-central-1 passes.

**Playwright-MCP Live-Smoke (post-Deploy):**
- NL-Sculpt-Smoke (DE): "Wenn ein Deal in Phase Angebot bewegt wird, leg mir eine Follow-up-Task in 2 Tagen an." → 4-Karten-Sequenz → Apply → V6.2-Engine triggert nach Test-Stage-Wechsel.
- Voice-Smoke: Audio-Blob hochladen → Whisper-Transkript erscheint → Sculpt → Schema-Karte.
- Reject-Smoke: "Wenn der Kunde mir eine Sprachnachricht schickt..." → structured Reject mit Vorschlag.
- ISSUE-066-DevTools-Smoke (Pattern aus `reference_playwright_live_smoke_pattern`): Teamlead-Login → /team/<member>/pipeline → DevTools-fetch → ReadOnlyContextError → audit_log-Eintrag verifiziert.
- Inspection-Log-Smoke (Admin): /settings/workflow-automation/nl-history zeigt 50-Eintrag-Tabelle mit Filterable Trigger-Event-Column.

**Gesamt-V7.5 PASS-Kriterium:**
- Vitest npm run test:all ≥917+10 PASS (V7.2-Baseline + V7.5-Erweiterungen)
- 5 Playwright-Live-Smokes PASS
- audit_log enthaelt `automation_rule.sculpt_attempt` + `create_via_nl` + `read_only_context_blocked`-Eintraege
- ISSUE-066 Status `resolved` in KNOWN_ISSUES.md mit Resolution-Notes verlinkend auf SLC-751 Live-Smoke

**V7.5 Architecture ready for `/slice-planning`.**

## V7.6 — NL-Workspace-Integration + Custom-Reports Architecture

### V7.6 Strategy

V7.6 ist ein **UI-Konsolidierungs-Sprint** mit additivem Schema. Zwei Bauteile:

1. **FEAT-761 NL-Builder in KI-Workspace integrieren (BL-479, High Prio).** V7.5 SLC-753 hat den NL-Rule-Builder als **separate Card** unter dem KI-Workspace plaziert (V6.6-Pattern-Verletzung). FEAT-761 macht ihn zum **6. Berichts-Button** im `MeinTagKIWorkspace`. Klick triggert einen **NL-Builder-Mode** im Workspace statt eines Bedrock-Calls. Cost-Display + Modell-Anzeige verschwinden aus dem User-UI (bleiben im `audit_log` + V7.5-Inspection-Log auf `/settings/workflow-automation/nl-history`). **Reines Frontend-Refactor — kein Schema, keine neuen Server-Actions.**

2. **FEAT-762 Custom-Reports (BL-442, Medium Prio).** User legen eigene Berichts-Vorlagen via "Als Bericht speichern" auf Free-Form-Bedrock-Antworten an. Ein "Meine Berichte"-Dropdown rechts neben den Standard-Buttons listet sie (Type-Ahead ab 6+ Items, Context-Filter `mein-tag` vs `cockpit`). **Additive Migration MIG-037** mit `custom_reports`-Tabelle (Owner-Scope-RLS, UNIQUE(owner_user_id, name)). **Per-User-Scope in V1**, Team-Sharing defer V8.

Keine neuen npm-Packages. Keine neuen Container, kein neuer Cron, keine neuen LLM-Provider. Reuse: V6.6 KI-Workspace-Hybrid-Layout, V7.5 Bedrock-Region-Pin (DEC-211), V7.5 NL-Sculptor-Server-Actions (`sculptNlRule`/`previewNlRule`/`applyNlRule` bleiben unangetastet), V6.2 `audit_log`-Pattern, V6.5 Brand-Tokens.

### V7.6 Strategy-Leitprinzipien

- **Pattern-Reuse-First** (CLAUDE.md Core-Default #5): NL-Sculpt-Workflow-Code aus V7.5 `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` zieht 1:1 nach `cockpit/src/components/ki-workspace/nl-builder-inline.tsx` um. Keine Re-Implementierung der 4-Karten-Sequenz.
- **Mode-Switch im KIWorkspace statt RenderRegistry-Refactor (DEC-217):** AnswerPane behaelt seinen single `reportId === "top-chancen"`-Discriminator. KIWorkspace bekommt einen zusaetzlichen `mode: "report" | "nl-builder"`-State. RenderRegistry-Refactor erst V7.7+ wenn 4+ Cases UND echte Plugin-Use-Case.
- **Standard-Reports + Custom-Reports geteilter Bedrock-Pfad (DEC-215):** `runCustomReport(id)` lade Context-Type-spezifischen Default-Data-Context (mein-tag = Activities+Tasks+Deals fuer User, cockpit = Pipeline-Aggregate) und schicke ihn mit `prompt_template` an Bedrock. Kein Sculpt-Schritt vor Context-Loading (DEC-215-Alternative B verworfen).
- **Save-Trigger nach Bedrock-Result (DEC-216):** "Als Bericht speichern"-Button rendert nur auf Free-Form-Antworten (nicht auf Standard-Berichten, nicht im NL-Builder-Mode). User sieht Ergebnis und entscheidet bewusst.
- **Cost-Display weg aus User-UI (FEAT-761), aber audit_log + Inspection-Log unveraendert.** Cost-Forensik bleibt in `audit_log.metadata.sculptor_cost_usd` (V7.5) und in `custom_report.executed`-Audit-Action (V7.6 neu). Inspection-Log auf `/settings/workflow-automation/nl-history` bleibt SLC-756 (V7.5).
- **Per-Owner-RLS strict.** `custom_reports`-Tabelle hat 4 Policies (SELECT/INSERT/UPDATE/DELETE) jeweils `owner_user_id = auth.uid()`. Kein Admin-Read-Trapdoor in V1 (Forensik laeuft ueber `audit_log`-Trail, der schon admin-readable ist).
- **EU-Region pflicht (DEC-211-Reuse):** `runCustomReport` ruft `invokeBedrock()` und faellt damit unter die V7.5-Region-Assertion. Kein neuer LLM-Pfad.

### V7.6 Components Affected

```
Browser (HTTPS)
  │
Coolify / Caddy
  │
Next.js App (BD Cockpit)
  │
  ├── /components/ki-workspace/                              ─── ERWEITERT (FEAT-761 + FEAT-762)
  │   ├── KIWorkspace.tsx (PATCH)
  │   │   └── + mode: "report" | "nl-builder" State
  │   │     + handleReportClick short-circuit bei id="nl-builder"
  │   │       (KEIN reportRun.run(), nur setMode("nl-builder"))
  │   │     + Render-Switch: NLBuilderInline vs AnswerPane
  │   │     + Input-Bar im nl-builder-Mode disabled mit Hint
  │   │       "Workflow-Modus aktiv — verwende die NL-Eingabe unten"
  │   │     + "Meine Berichte"-Dropdown rechts neben Standard-Buttons
  │   │       (Type-Ahead ab 6+, Klick triggert runCustomReport)
  │   ├── AnswerPane.tsx (MINIMAL-PATCH)
  │   │   └── + onSaveAsReport-Callback-Prop (Render des
  │   │       "Als Bericht speichern"-Buttons; Sichtbarkeit:
  │   │       reportId === "freie-frage" && result vorhanden)
  │   ├── nl-builder-inline.tsx (NEU)
  │   │   └── 4-Karten-Sequenz aus V7.5 portiert:
  │   │     ├── NL-Eingabe (Text + Mikro-Button + Sculpt-Button)
  │   │     ├── Klarsprache-Karte (Original + Intent-Echo)
  │   │     ├── Schema-Karte (editierbare Form-Felder)
  │   │     └── Trockenlauf + Apply-Confirm-Modal
  │   │     OHNE Cost-Display, OHNE Modell-Hint, OHNE Card-Wrapper-Box
  │   ├── meine-berichte-dropdown.tsx (NEU)
  │   │   └── Dropdown-Component:
  │   │     ├── Trigger-Button mit chevron + Label "Meine Berichte"
  │   │     ├── Type-Ahead-Filter (ab 6+ Eintraegen sichtbar)
  │   │     ├── Item-Liste mit Name + last_used_at-Postfix
  │   │     ├── ⋮-Sub-Menu pro Item: "Umbenennen" + "Loeschen"
  │   │     └── Empty-State-Hint "Stelle eine freie Frage und
  │   │         speichere die Antwort als Bericht."
  │   ├── save-custom-report-modal.tsx (NEU)
  │   │   └── Modal mit Native-Form-Pattern:
  │   │     ├── Name-Input (Pflicht, 2-80 chars)
  │   │     ├── Description-Textarea (optional)
  │   │     └── Submit → saveCustomReport Server-Action
  │   └── reports/registry.ts (PATCH)
  │       └── MEIN_TAG_REPORTS um Eintrag
  │         { id: "nl-builder", label: "Workflow bauen", ... } ergaenzt
  │
  ├── /components/mein-tag/                                  ─── REDUZIERT (FEAT-761)
  │   ├── nl-rule-builder-card.tsx (LOESCHEN)
  │   │   └── ersetzt durch nl-builder-inline.tsx unter ki-workspace/
  │   ├── nl-rule-builder-card.test.tsx (LOESCHEN)
  │   ├── apply-confirm-modal.tsx (BLEIBT — Sub-Komponente)
  │   ├── preview-result-card.tsx (BLEIBT — Sub-Komponente)
  │   └── apply-confirm-modal.test.tsx (BLEIBT)
  │
  ├── /app/(app)/mein-tag/mein-tag-client.tsx (PATCH)        ─── REDUZIERT (FEAT-761)
  │   └── - <NLRuleBuilderCard /> Sibling-Render entfernen
  │     + Workspace zeigt jetzt den 6. Button "Workflow bauen"
  │
  ├── /lib/ki-workspace/                                     ─── ERWEITERT (FEAT-762)
  │   ├── custom-report-runner.ts (NEU)
  │   │   └── runCustomReportCore({ promptTemplate, contextType, scope })
  │   │     1. Loader-Switch:
  │   │        - contextType="mein-tag" → loadMeinTagContext(scope)
  │   │          (Reuse von tagesanalyse.ts-Data-Loader)
  │   │        - contextType="cockpit" → loadCockpitContext(scope)
  │   │          (Reuse von pipeline-snapshot.ts-Data-Loader)
  │   │     2. Build Bedrock-Prompt: SYSTEM_PROMPT + dataContext + promptTemplate
  │   │     3. invokeBedrock() — gleicher V7.5-Region-Assertion-Pfad
  │   │     4. Return ReportResult { markdown, completedAt, model, refreshable: true }
  │   ├── custom-report-prompt.ts (NEU)
  │   │   └── System-Prompt fuer Custom-Reports (kurz, generisch)
  │   └── reports/* (BLEIBT — Standard-Reports unangetastet)
  │
  └── /app/(app)/(custom-reports actions)/                   ─── NEU (FEAT-762)
      ├── /lib/custom-reports/actions/save.ts (NEU)
      │   └── saveCustomReport({ name, prompt_template, context_type, description? })
      │     1. zod-Validate (Length-Checks)
      │     2. INSERT custom_reports — RLS-implicit
      │     3. UNIQUE-Constraint catch → 409 "Name bereits vergeben"
      │     4. audit_log INSERT action='custom_report.created'
      │     5. Result-Pattern { ok, id } | { ok: false, code, message }
      ├── /lib/custom-reports/actions/list.ts (NEU)
      │   └── listCustomReports({ context_type })
      │     SELECT ... WHERE context_type=$1
      │     ORDER BY last_used_at DESC NULLS LAST, created_at DESC
      ├── /lib/custom-reports/actions/run.ts (NEU)
      │   └── runCustomReport({ id, scope })
      │     1. SELECT custom_reports WHERE id=$1 (RLS Owner-Check implicit)
      │     2. runCustomReportCore() aus lib/ki-workspace/
      │     3. UPDATE custom_reports SET usage_count=usage_count+1,
      │        last_used_at=now()
      │     4. audit_log INSERT action='custom_report.executed',
      │        metadata: { cost_usd, model_id, prompt_template_snippet }
      │     5. Return ReportResult
      ├── /lib/custom-reports/actions/rename.ts (NEU)
      │   └── renameCustomReport({ id, name }) + UNIQUE-Check + audit
      └── /lib/custom-reports/actions/delete.ts (NEU)
          └── deleteCustomReport({ id }) + audit
```

### V7.6 Schema / Data Model (MIG-037)

**Eine neue Tabelle `custom_reports` mit Owner-Scope-RLS. Additiv, kein Touch an bestehenden Tabellen.**

```sql
-- MIG-037 V7.6 SLC-762 custom_reports
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('mein-tag', 'cockpit')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  prompt_template TEXT NOT NULL CHECK (char_length(prompt_template) BETWEEN 10 AND 2000),
  description TEXT,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_owner_ctx
  ON custom_reports(owner_user_id, context_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_reports_owner_name
  ON custom_reports(owner_user_id, name);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

-- Drop+Create-Pattern (idempotent, V14+-portabel)
DROP POLICY IF EXISTS custom_reports_owner_select ON custom_reports;
CREATE POLICY custom_reports_owner_select ON custom_reports
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS custom_reports_owner_insert ON custom_reports;
CREATE POLICY custom_reports_owner_insert ON custom_reports
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS custom_reports_owner_update ON custom_reports;
CREATE POLICY custom_reports_owner_update ON custom_reports
  FOR UPDATE USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS custom_reports_owner_delete ON custom_reports;
CREATE POLICY custom_reports_owner_delete ON custom_reports
  FOR DELETE USING (owner_user_id = auth.uid());

-- Service-Role-Grants Pflicht (sonst PostgREST 401)
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO service_role;
```

**Audit-Log-Schema (bestehend, additiv genutzt):**

```
audit_log:
  action: 'custom_report.created'        -- NEU (V7.6)
  entity_type: 'custom_report'
  entity_id: <custom_reports.id>
  metadata JSONB:
    {
      "name": "...",
      "context_type": "mein-tag" | "cockpit",
      "prompt_template_length": 250
    }

  action: 'custom_report.executed'       -- NEU (V7.6)
  entity_type: 'custom_report'
  entity_id: <custom_reports.id>
  metadata JSONB:
    {
      "name": "...",
      "context_type": "mein-tag" | "cockpit",
      "cost_usd": 0.008,
      "model_id": "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
      "input_tokens": 1250,
      "output_tokens": 380,
      "prompt_template_snippet": "<first 200 chars>"
    }

  action: 'custom_report.renamed'        -- NEU (V7.6)
  entity_type: 'custom_report'
  entity_id: <custom_reports.id>
  metadata JSONB: { "old_name": "...", "new_name": "..." }

  action: 'custom_report.deleted'        -- NEU (V7.6)
  entity_type: 'custom_report'
  entity_id: <custom_reports.id>
  metadata JSONB: { "name": "..." }
```

**Migration-Procedure:** Per `sql-migration-hetzner.md` ueber SSH+base64 als `postgres`-User. `NOTIFY pgrst, 'reload schema';` zwingend nach Apply (PostgREST-Schema-Cache).

### V7.6 AnswerPane Mode-Switch (DEC-217)

**Entscheidung: Mode-Switch im KIWorkspace, AnswerPane bleibt Standard-Renderer mit `reportId`-Discriminator.**

Heutiger Stand: `AnswerPane` rendert `<PipelineTabsRenderer>` bei `reportId === "top-chancen"`, sonst `<MarkdownView>`. V7.6 Custom-Reports nutzen den `<MarkdownView>`-Pfad ohne weiteren Discriminator-Case. **NL-Builder ist KEIN result-Rendering** — er ist ein eigener interaktiver Mode. Daher Mode-Switch eine Ebene hoeher.

Alternativen geprueft:

| Pattern | Pro | Contra | Entscheidung |
|---|---|---|---|
| **A** Mode-Switch im KIWorkspace, AnswerPane unveraendert | Klarste Trennung, AnswerPane bleibt single-purpose | KIWorkspace bekommt zusaetzlichen State (`mode`) | **gewaehlt** |
| **B** AnswerPane bekommt `renderMode`-Prop + children-Slot | Single Render-Punkt | AnswerPane wird zur Wundertuete (Render+Mode) | verworfen |
| **C** RenderRegistry-Refactor (Map<id, Component>) | Skaliert auf N Cases | Premature abstraction bei 3 Cases | V7.7+ wenn 4+ Cases |

**Implementierungs-Skizze:**

```tsx
// KIWorkspace.tsx (V7.6)
const [mode, setMode] = useState<"report" | "nl-builder">("report");

const handleReportClick = useCallback(async (report) => {
  if (report.id === "nl-builder") {
    setMode("nl-builder");
    setSelectedReport(report);
    return; // KEIN reportRun.run()
  }
  setMode("report");
  setSelectedReport(report);
  await reportRun.run(report, scope);
}, [reportRun, scope]);

return (
  <div>
    <ReportButtons />
    <MeineBerichteDropdown /> {/* FEAT-762 */}
    <InputBar disabled={mode === "nl-builder"} hint={mode === "nl-builder" ? "Workflow-Modus aktiv ..." : undefined} />
    {mode === "nl-builder"
      ? <NLBuilderInline onClose={() => setMode("report")} />
      : <AnswerPane reportId={selectedReport?.id} result={reportRun.result} ... onSaveAsReport={selectedReport?.id === "freie-frage" ? handleSaveAsReport : undefined} />}
  </div>
);
```

### V7.6 Bedrock Context-Loader fuer Custom-Reports (DEC-215)

**Entscheidung: Context-Type-spezifischer Default-Data-Context. KEIN NL-Sculpt-Schritt vor Context-Loading.**

Alternativen geprueft:

| Pattern | Pro | Contra | Entscheidung |
|---|---|---|---|
| **A** Context-Type-Default-Context (mein-tag → tagesanalyse-style, cockpit → pipeline-snapshot-style) | Einfach, vorhersagbar, ein Bedrock-Call, Reuse bestehender Data-Loader | Manche User-Prompts brauchen evtl. mehr Daten als der Default liefert | **gewaehlt** |
| **B** NL-Sculpt fuer Daten-Selektion (1. Bedrock-Call extrahiert "welche Daten brauche ich", 2. Bedrock-Call mit gezielten Daten) | Maechtig, smart | 2x Cost + 2x Latenz, komplex, V7.6-Scope-Inflation | V7.7+ Erweiterung wenn echter Bedarf |
| **C** Free-Form-Frage-Loader (gleicher Pfad wie heute "freie-frage" im KI-Workspace) | Maximale Konsistenz mit Free-Form-Pfad | Mein-Tag-Free-Form-Loader laedt heute denselben Default → kein Unterschied zu A | aequivalent zu A, A bevorzugt wegen Explicit-Naming |

**Context-Loader-Datenumfang (DEC-215b):**

| context_type | Daten-Loader (Reuse) | Inhalt |
|---|---|---|
| `mein-tag` | `lib/ki-workspace/loaders/mein-tag-context.ts` (neu, Reuse aus tagesanalyse.ts) | Activities heute + offene Tasks fuer scope.userId + aktive Deals des Users (last 30d) + Multiplikator-Hinweise |
| `cockpit` | `lib/ki-workspace/loaders/cockpit-context.ts` (neu, Reuse aus pipeline-snapshot.ts) | Pipeline-Aggregate (pro Phase Count+Sum), Top-10 stagnierende Deals, Win/Loss letzte 30d |

**Wichtig:** Diese Loader werden in /slice-planning ausgegliedert. Falls die bestehenden Reports-Module sie heute direkt inlinen (z.B. `tagesanalyse.ts` macht alles in einer Funktion), wird in SLC-762 MT-3 refactoriert auf einen wiederverwendbaren Loader-Export. Falls schon separiert: nur Re-Use, kein Refactor.

### V7.6 Save-Trigger UX (DEC-216)

**Entscheidung: "Als Bericht speichern"-Button rendert nach Bedrock-Result, nur bei Free-Form-Frage.**

Render-Bedingungen fuer den Save-Button:

| Workspace-State | Save-Button sichtbar? |
|---|---|
| Standard-Bericht (z.B. Tagesanalyse) | NEIN — Bericht ist bereits "verstandard" |
| NL-Builder-Mode | NEIN — Workflow != Report |
| Custom-Bericht-Ausfuehrung | NEIN — Bericht existiert schon |
| Free-Form-Frage mit Bedrock-Result | JA |
| Free-Form-Frage ohne Result (Loading/Error) | NEIN |

**Implementierungs-Skizze:**

```tsx
// AnswerPane.tsx (V7.6 minimal-patch)
{result && onSaveAsReport && (
  <button onClick={onSaveAsReport} data-testid="answer-pane-save-as-report">
    <BookmarkPlus className="h-3 w-3" /> Als Bericht speichern
  </button>
)}

// KIWorkspace.tsx (V7.6)
<AnswerPane
  result={reportRun.result}
  reportId={selectedReport?.id}
  onSaveAsReport={
    selectedReport?.id === FREE_QUESTION_REPORT_ID && reportRun.result
      ? () => setSaveModalOpen(true)
      : undefined
  }
/>
```

### V7.6 NL-Builder-Inline File-Location (DEC-213)

**Entscheidung: `cockpit/src/components/ki-workspace/nl-builder-inline.tsx` (Option A aus FEAT-761).**

Pro:
- Semantisch korrekt — NL-Builder ist eine Workspace-Mode-Variation, gehoert ins Workspace-Modul.
- Zukunftsfaehig fuer Re-Use auf anderen Pages (Deal-Detail-NL-Builder in V7.7+ ist denkbar).
- Konsistent mit dem geplanten `meine-berichte-dropdown.tsx` + `save-custom-report-modal.tsx` unter `ki-workspace/`.

Cleanup-Plan (DEC-213b):
- `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` wird **komplett geloescht** (CLAUDE.md "Surgical changes"-Rule erfuellt).
- `nl-rule-builder-card.test.tsx` ebenso.
- Sub-Komponenten `apply-confirm-modal.tsx` + `preview-result-card.tsx` bleiben unter `cockpit/src/components/mein-tag/` (V7.5-Reuse), werden vom neuen `nl-builder-inline.tsx` importiert. Wenn /slice-planning oder /backend feststellt dass sie auch nur einmalig genutzt werden, koennen sie nach `ki-workspace/` mit-umgezogen werden.

### V7.6 Slice-Plan-Outlook (DEC-218)

**Entscheidung: 3 Slices, sequentiell. SLC-761 zuerst (Foundation), dann SLC-762 (Backend), dann SLC-763 (Frontend).**

| Slice | Feature | Inhalt | Schaetzung | Acceptance |
|---|---|---|---|---|
| SLC-761 | FEAT-761 | NL-Builder-Refactor: 6. Button + Mode-Switch + nl-builder-inline.tsx + Card-Sibling-Loeschung + Cost-Hint-Removal + AUDIT_SERVER_ACTIONS_V7.md V7.5-Section (F-2) | ~2-3h | Live-Smoke: NL-Workflow im Workspace via 6. Button funktioniert end-to-end, keine Cost-Anzeige sichtbar |
| SLC-762 | FEAT-762 | Backend: MIG-037 + 5 Server-Actions (save/list/run/rename/delete) + custom-report-runner.ts mit Context-Loadern + audit_log-Actions + Doc-Hygiene (AUDIT-Section + MIGRATIONS-Section) | ~3-5h | Vitest: CRUD + RLS-Owner-Isolation + Bedrock-Call mit Cost-Tracking + UNIQUE-Constraint-409 |
| SLC-763 | FEAT-762 | Frontend: "Als Bericht speichern"-Button + Save-Modal + "Meine Berichte"-Dropdown (Type-Ahead ab 6+, last_used-Postfix) + Rename/Delete-Sub-Menu + Empty-State | ~2-4h | Live-Smoke: User legt Custom-Report an, ruft ihn 2x ab, benennt um, loescht — alle audit_log-Eintraege korrekt |

Total: ~7-12h. /slice-planning kann Slices weiter splitten oder zusammenziehen, aber **Reihenfolge SLC-761 → SLC-762 → SLC-763** ist Architecture-Empfehlung (Foundation-First, Backend-vor-Frontend).

### V7.6 Constraints

- **EU-Region pflicht** (Reuse DEC-211): Bedrock `eu-central-1` strict via Startup-Assertion.
- **Native HTML Form-Pattern** weiterhin pflicht (`feedback_native_html_form_pattern`): Save-Modal nutzt `<form action={saveCustomReport}>` + `useTransition`, keine `react-hook-form`.
- **V2-Sidebar-Layout** bleibt (`feedback_v2_sidebar_pflicht`).
- **Brand-Tokens** aus V6.5 Theming-Sprint — keine neuen Custom-Hex-Werte fuer Dropdown/Modal.
- **MIG-037 idempotent** via `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` + `DROP POLICY IF EXISTS` + `CREATE POLICY`.
- **PostgREST-Schema-Reload** zwingend nach MIG-037-Apply (`NOTIFY pgrst, 'reload schema';`) per `reference_postgrest_schema_reload`.
- **Service-Role + authenticated-GRANTs** zwingend (Lehre aus OP V7 SLC-134, `feedback_migration_rls_needs_grants`).
- **FEAT-751-Backend bleibt komplett unangetastet** (sculptNlRule/previewNlRule/applyNlRule + MIG-036 + audit_log-Actions). Nur Frontend-Move.

### V7.6 Risks

- **Risk:** AnswerPane skaliert weiter mit Discriminator-Cases (V7.6 = 2 Cases + 1 Save-Button-Render-Bedingung). Bei 4+ Cases V7.7+ Refactor noetig. **Mitigation:** Mode-Switch im KIWorkspace haelt AnswerPane stabil bei 1 Discriminator (`top-chancen`). Custom-Reports nutzen den `<MarkdownView>`-Standard-Pfad. NL-Builder ist eigener Render-Pfad ausserhalb AnswerPane.
- **Risk:** Custom-Report-prompt_template kann Bedrock zu beliebigen Antworten zwingen (Prompt-Injection vom User auf sich selbst). **Akzeptiert:** Owner-Scope-Isolation via RLS verhindert Cross-User-Wirkung. audit_log macht Cost transparent. Im Compliance-Review (Pre-Production-Gate) als Item aufnehmen.
- **Risk:** Per-User-Schrott-Prompts kosten kumulativ. **Mitigation:** audit_log mit `cost_usd` ermoeglicht Admin-Forensik. V7.7+ ggf. Per-User-Cost-Cap als zweite Verteidigungslinie.
- **Risk:** Bei FEAT-761 wird der V7.5 Voice-Pfad (`useVoiceCapture` im NL-Builder) und der Workspace-Voice-Pfad (`ki-workspace-voice-button`) gleichzeitig sichtbar im NL-Builder-Mode. **Mitigation:** Im NL-Builder-Mode ist die Workspace-Input-Bar disabled (inkl. ihr Voice-Button). Nur der NL-Builder-eigene Mikro-Button bleibt aktiv. Doku-Hinweis im UI.
- **Risk:** Custom-Report-Bedrock-Call laeuft mit User-Owner-Scope, aber Default-Context-Loader laedt Daten auch fuer User mit Read-Only-Header (ISSUE-066-Pfad). **Mitigation:** runCustomReport ist explizit kein Mutation-Pfad (read-only); audit_log-Insert ist additiv via `service_role` (kein Conflict mit Read-Only-Context-Guard). Vitest deckt das ab.
- **Assumption:** PostgreSQL-Version 15+ auf Coolify-Self-hosted-Supabase (`CREATE POLICY` mit `WITH CHECK` ist 9.5+, `DROP POLICY IF EXISTS` ist 14+). Aktueller Stand laut MIG-036 OK.

### V7.6 Open Points

Alle 7 OQs aus FEAT-761 + FEAT-762 sind in DEC-212..218 entschieden. Keine offenen architektonischen Fragen mehr. **Defer-Liste fuer V7.7+:**

- NL-Builder auf `/deal/[id]` (Deal-spezifische Workflow-Sculpts) — bisher keine User-Direktive.
- Custom-Reports auf `/deal/[id]` mit Deal-Context-Persistenz (template_text resolve auf deal_id).
- Custom-Reports auf `/team` (Team-Cockpit) — TEAM_COCKPIT_REPORTS-Pfad ist separat.
- Team-Sharing fuer Custom-Reports — defer V8.
- Versionierung von prompt_template (Edit-History) — defer V7.7+ wenn benoetigt.
- RenderRegistry-Refactor fuer AnswerPane — Trigger ist 4+ Discriminator-Cases.
- BL-478 ISSUE-078 Sonner-Toast-Hydration — defer V7.7+ Reproducer-Slice.
- F-3 COMPLIANCE.md V7.5+V7.6-Section — Pre-Production-Compliance-Gate per User-Direktive 2026-05-01.

### V7.6 Verifikations-Plan

**Vitest (Unit + Live-DB):**
- AnswerPane-Save-Button-Sichtbarkeit: 4 Cases (freie-frage+result / freie-frage+no-result / standard-report+result / nl-builder-mode).
- KIWorkspace mode-Switch: Klick auf nl-builder Button setzt mode + KEIN reportRun-Call; Klick auf Standard-Bericht setzt mode back.
- saveCustomReport-Validation: zod-Length-Checks + UNIQUE-409-Mapping + audit_log-Insert.
- runCustomReport-Pfad: RLS-Owner-Check + Cost-Tracking + usage_count-Increment.
- RLS-Live-DB-Tests (Coolify-Test-Setup-Pattern): User A sieht User B's custom_reports nicht; SELECT/INSERT/UPDATE/DELETE alle owner-scoped.
- UNIQUE-Constraint catch: Insert mit Duplicate-Name → 23505 → 409-Mapping.
- Type-Ahead-Filter-Logic: Filter case-insensitive auf name; sichtbar erst ab 6+ Items.

**Playwright-MCP Live-Smoke (post-Deploy):**
- NL-Builder-Smoke: 6 Buttons im Workspace, Klick "Workflow bauen" → NL-Eingabe sichtbar, kein Cost-Hint im DOM (`data-testid="nl-rule-builder-cost"` darf nicht existieren).
- Custom-Report-Save-Smoke (mein-tag): Freie Frage stellen → Result → "Als Bericht speichern" → Modal → Save → "Meine Berichte"-Dropdown zeigt neuen Eintrag.
- Custom-Report-Run-Smoke: Klick auf Custom-Report-Dropdown-Item → AnswerPane rendert Bedrock-Antwort, audit_log enthaelt `custom_report.executed` mit Cost.
- Owner-Isolation-Smoke: 2 Test-Accounts, User A legt Report an, User B sieht ihn nicht.
- Context-Filter-Smoke: Custom-Report auf mein-tag mit context_type='mein-tag' erscheint NICHT im /dashboard-Workspace.

**Gesamt-V7.6 PASS-Kriterium:**
- Vitest `npm run test:all` 1100+/1100+ PASS (V7.5-Baseline + V7.6-Erweiterungen)
- 5 Playwright-Live-Smokes PASS
- audit_log enthaelt `custom_report.created` + `custom_report.executed` + `custom_report.renamed` + `custom_report.deleted`-Eintraege
- `/mein-tag` rendert keine Standalone-NLRuleBuilderCard mehr (DOM-Check)
- Inspection-Log auf `/settings/workflow-automation/nl-history` (V7.5 SLC-756) bleibt funktional

**V7.6 Architecture ready for `/slice-planning`.**

## V8 — Hygiene-Sprint Architecture (Settings-Refactor + KI-Provider-Abstrahierung + /performance-Cleanup + Pflichtfelder-Modal)

### Architecture Summary

V8 ist ein UI- und Hygiene-orientierter Sprint. **Keine neue Stack-Komponente**, **keine neue Tabelle**, **keine neue Cron-Action**. Bedrock-Client und audit_log bleiben unveraendert; ein neuer Server-Action-Endpoint `suggestLossReason` wird hinzugefuegt. Vier Features, drei Slices:

- **SLC-811** (UI-Hygiene): FEAT-801 Settings-Layout-Refactor + FEAT-803 /performance-Cleanup + Label-Konsistenz
- **SLC-812** (Provider-Abstrahierung): FEAT-802 KI-Provider-Anzeige neutralisieren
- **SLC-813** (Pflichtfelder-Modal): FEAT-804 Stage-Move Modal + KI-Verlustgrund-Suggest

Bedrock-Region-Pin DEC-211 (eu-central-1, Claude Sonnet 4.6) und Internal-Test-Mode bleiben. Kein Anbieterwechsel, keine grosse Schema-Migration.

### Code-Inspektion-Korrekturen gegenueber PRD (Findings 2026-05-20)

Die V8-Requirements PRD-Section bezeichnete einige Subpages als "Ghosts" oder "Bruecken", die Code-Inspektion zeigt aber, dass diese voll funktional sind. Architektonisch wird dadurch der Scope leicht verschoben:

| PRD-Annahme | Code-Reality | V8-Architecture-Entscheidung |
|---|---|---|
| `/settings/products/` ist Ghost (kein Tile) | Voll funktionale Admin-Produkt-Verwaltung (`ProductList` + `ProductForm`) | Tile in System-Section ergaenzen, kein Delete |
| `/settings/workflow-automation/` ist Duplikat | Enthaelt `/nl-history/page.tsx` aus V7.6 SLC-756 (Admin-Inspection-Log) | Tile in Vertrieb-Section ergaenzen, kein Delete |
| `/performance/page.tsx` ist Redirect-Bruecke | Stimmt, geht weg | LOESCHEN |
| `/performance/goals/page.tsx` ggf. mitloeschen | Voll funktional (`GoalList` + `GoalForm` + `CsvImportDialog` + `ActivityKpiSettings`) | UMZIEHEN nach `/settings/goals/`, Tile in System-Section |
| `/team/[user_id]` Drilldown-Status unklar | Voll funktional aus V7 (layout + pipeline + aufgaben + mein-tag + tests) | Drilldown-Button in `team-members-table.tsx:198` AKTIVIEREN |
| STAGE_REQUIRED_FIELDS hat nur "Verloren" | 5 Stages haben Pflichtfelder (Angebot vorbereitet, Angebot offen, Verhandlung / Einwände, Gewonnen, Verloren) | Modal-Pattern fuer alle 5 Stages, KI-Suggest nur fuer Verloren (siehe FEAT-804) |

### Main Components

#### Komponente 1: Settings-Tile-Registry (FEAT-801)

**Datei**: `cockpit/src/app/(app)/settings/page.tsx` — `SETTINGS_TILES`-Konstante

**Struktur-Aenderung**: Aus flacher `readonly SettingsTile[]`-Liste wird eine 3-Section-Struktur:

```typescript
interface SettingsSection {
  key: "personal" | "sales" | "system";
  title: string;       // "Persoenlich" | "Vertrieb" | "System"
  tiles: SettingsTile[];
}
```

**Tile-Section-Zuordnung** (Architektur-Decision, Reihenfolge innerhalb der Sections in Slice-Planning):

| Section | Tile | Pfad | visibleFor |
|---|---|---|---|
| Persoenlich | Arbeitszeit | `/settings/working-hours` | ALL_ROLES |
| Persoenlich | Meeting-Einstellungen | `/settings/meetings` | ALL_ROLES |
| Persoenlich | Pre-Call Briefing | `/settings/briefing` | ALL_ROLES |
| Vertrieb | Pipelines & Stages | `/settings/pipelines` | ADMIN_ONLY |
| Vertrieb | Workflow-Automation | `/settings/automation` | ADMIN_TEAMLEAD |
| Vertrieb | **NL-Regel-Historie** (NEU) | `/settings/workflow-automation/nl-history` | ADMIN_ONLY |
| Vertrieb | Kampagnen | `/settings/campaigns` | ADMIN_TEAMLEAD |
| Vertrieb | E-Mail-Templates | `/settings/templates` | ADMIN_TEAMLEAD |
| System | Branding | `/settings/branding` | ADMIN_ONLY |
| System | Zahlungsbedingungen | `/settings/payment-terms` | ADMIN_ONLY |
| System | Einwilligungstexte | `/settings/compliance` | ADMIN_ONLY |
| System | **Produkte** (NEU) | `/settings/products` | ADMIN_ONLY |
| System | **Rollen-Verwaltung** (NEU, Link zu /settings/team) | `/settings/team` | ADMIN_ONLY |
| System | **Ziele** (NEU, nach Move von /performance/goals/) | `/settings/goals` | ADMIN_TEAMLEAD |

**Rendering-Logik**: Bestehende `visibleTiles.filter(...).map(...)`-Schleife wird zu drei Sections, jede mit Section-Header (h2 + Beschreibung) und Tile-Liste. Wenn fuer eine Rolle in einer Section 0 Tiles uebrig bleiben (z.B. Member sieht keine System-Tiles), wird die Section ausgeblendet.

**Drilldown-Button** in `cockpit/src/app/(app)/settings/team/team-members-table.tsx:198`: `disabled`-Attribut entfernen, `title="Drilldown kommt mit SLC-706"` wegnehmen, `onClick` auf `router.push(`/team/${user.id}`)` setzen.

#### Komponente 2: KI-Provider-Abstrahierungs-Layer (FEAT-802)

**Strategie**: Reine String-Substitution + Component-Display-Label-Wrapper. **Kein Mass-Rename** der Bedrock-Identifier im Code.

**Konkrete Touchpoints** (User-sichtbar, sonst nichts):

| Datei | Symbol | Vorher | Nachher |
|---|---|---|---|
| `components/ki-workspace/AnswerPane.tsx:83` | `<span>` im isLoading-Block | "Bedrock arbeitet ..." | "KI arbeitet ..." |
| `components/item-sheet/ItemSheet.tsx` | `BedrockSection`-Component-Display-Label | "Bedrock-Zusammenfassung" o.ae. | "KI-Zusammenfassung" |
| `components/nl-builder/nl-builder-inline.tsx` | Error-Toast-Text | "Bedrock-Aufruf fehlgeschlagen" | "KI-Aufruf fehlgeschlagen" |
| `components/nl-builder/inline-edit-dialog.tsx` | Loading-Label | "Bedrock modifiziert ..." | "KI modifiziert ..." |
| `lib/automation/sculptor-cost.ts` Display-Wrapper | "Bedrock-Kosten: ~$X" | "KI-Kosten: ~$X" | (in UI-Rendering, nicht im Audit-Log!) |

**Architektur-Decision**: Component-Datei-Namen + Funktions-Namen + Modul-Pfade bleiben (`bedrock-client.ts`, `BedrockSection` Component-Internal-Name). Nur das User-sichtbare Display-Label aendert sich. Audit-Log-Schema bleibt — intern persistiert `audit_log.context.model_id=eu.anthropic.claude-sonnet-4-6` weiter. Falls dies User-sichtbar irgendwo gerendert wird, wird ein neutraler Wrapper `formatModelDisplayName(modelId)` aufgerufen, der "KI Sonnet" oder einfach "KI" zurueckliefert.

**ARIA-Labels**: Walkthrough pruefen, ob `aria-label="Bedrock arbeitet"` o.ae. existiert. Falls ja: dasselbe Substitutions-Pattern.

**Tooltips**: Bedrock-Tooltip-Texte aus Standard-Components ueberpruefen (insb. NL-Builder + Custom-Report-Buttons). Falls vorhanden: Substitution.

#### Komponente 3: /performance Cleanup + Goals-Move (FEAT-803)

**Delete**:
- `cockpit/src/app/(app)/performance/page.tsx` — Redirect-Bruecke aus V6.6 (DEC-169), 35 Zeilen, ersatzlos weg

**Move**:
- `cockpit/src/app/(app)/performance/goals/page.tsx` → `cockpit/src/app/(app)/settings/goals/page.tsx`
- Goals-Components (`@/components/goals/*`) bleiben wo sie sind (keine Verschiebung der Bestandteile, nur der Route)
- Actions (`@/app/actions/goals` + `@/app/actions/products` + `@/app/actions/activity-kpis`) bleiben

**Link-/Sidebar-Updates** (Inventur in Slice-Planning):
- `cockpit/src/components/sidebar/*` — falls `/performance`- oder `/performance/goals`-Link existiert: entweder entfernen oder auf `/settings/goals` umstellen
- Cross-references in Code: `grep -rn "/performance" cockpit/src/` (ausserhalb von Tests + Audit-Doku)

**Label-Vereinheitlichung "Task" → "Aufgabe"**:
- `cockpit/src/components/mein-tag/quick-actions.tsx` (oder aequivalent SLC-662)
- `cockpit/src/components/deal-detail/quick-actions.tsx` (SLC-664)
- `cockpit/src/components/cockpit/quick-actions.tsx` (SLC-666)
- Schema-Felder (`activities.type='task'`) bleiben unveraendert, nur UI-Label.

#### Komponente 4: StageRequirementsModal + suggestLossReason (FEAT-804)

**Modal-Component**: `cockpit/src/components/pipeline/stage-requirements-modal.tsx` (NEU)

**Props**:
```typescript
interface StageRequirementsModalProps {
  open: boolean;
  dealId: string;
  dealTitle: string;
  oldStageName: string;
  newStageId: string;
  newStageName: string;
  requirements: { fields: string[]; labels: Record<string, string> };  // aus STAGE_REQUIRED_FIELDS
  currentValues: Record<string, string | number | null>;               // pre-fill aus deals-Row
  kiSuggest?: { primary: string; alternatives: string[] };             // optional, nur fuer Verloren
  onConfirm: (values: Record<string, string | number>) => Promise<void>;
  onCancel: () => void;
}
```

**Modal-Render**: Header mit Deal-Title + Stage-Transition-Pfeil. Ein Eingabefeld pro Pflichtfeld in `requirements.fields`. Bei `won_lost_reason` + vorhandenem `kiSuggest`: Textfeld pre-fuelt mit `kiSuggest.primary`, Dropdown "Andere Vorschlaege" zeigt `kiSuggest.alternatives` (falls vorhanden, max 3). Buttons: "Verschieben" (Primary) + "Abbrechen".

**Drop-Event-Wiring**: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx` (oder dort wo `onDragEnd` lebt) bekommt vor dem `moveDealToStage`-Call einen Check:

```typescript
const requirements = STAGE_REQUIRED_FIELDS[targetStageName];
if (requirements) {
  const missing = requirements.fields.filter(f => isEmpty(deal[f]));
  if (missing.length > 0) {
    let kiSuggest = undefined;
    if (targetStageName === "Verloren" && missing.includes("won_lost_reason")) {
      kiSuggest = await suggestLossReason(dealId);  // KI-Call vor Modal-Open
    }
    setStageRequirementsModalState({ open: true, dealId, ..., kiSuggest });
    return;  // Drop-Event abbrechen, Modal uebernimmt
  }
}
await moveDealToStage(dealId, newStageId, targetStageName);
```

**Server-Action `suggestLossReason`** (NEU): `cockpit/src/app/(app)/pipeline/actions.ts`

```typescript
export async function suggestLossReason(dealId: string): Promise<{
  primary: string;
  alternatives: string[];
  costUsd: number;
} | null>
```

**Datenfluss**:
1. Server-Action ladet Deal-Snapshot (`title`, `value`, `won_lost_reason`, `pipeline_stages.name`)
2. Ladet letzte 10 Activities (`activities` Tabelle, filter `deal_id=$1`, order `created_at DESC limit 10`)
3. Ladet letzte 3 E-Mail-Threads (`email_messages` join `deal_id`, order `received_at DESC limit 3`)
4. Baut Bedrock-Prompt (siehe unten), ruft `bedrockClient.invoke(prompt)`
5. Parsed Response (JSON mit `suggestions`-Array), persistiert audit_log-Eintrag
6. Returnt `{ primary, alternatives, costUsd }` oder `null` bei Empty-Context / Bedrock-Error (Modal oeffnet trotzdem mit leerem Feld)

**Bedrock-Prompt-Template** (DEC-220):

```
System-Prompt:
Du bist Vertriebs-Analyst eines B2B-Beratungsunternehmens. Auf Basis der Activity-History eines Deals sollst du den wahrscheinlichsten Verlustgrund vorschlagen. Antworte ausschliesslich auf Deutsch und ausschliesslich als JSON.

User-Prompt:
Deal: "{deal.title}" (Wert: {deal.value} EUR, aktuelle Stage: {currentStage})

Activity-History (letzte 10, neueste zuerst):
{activities.map(a => `- ${a.created_at} | ${a.type} | ${a.title}`).join("\n")}

E-Mail-Threads (letzte 3):
{emails.map(e => `- ${e.received_at} | von ${e.from_email} | Betreff: ${e.subject} | Snippet: ${e.snippet.slice(0,200)}`).join("\n")}

Aufgabe:
Schlage 1-3 wahrscheinliche Verlustgruende vor. Jeder Vorschlag muss kurz (max 1 Satz) sein und eine Quelle angeben (welche Activity oder welche E-Mail). Wenn die History keine klaren Hinweise enthaelt, gib genau 1 Vorschlag "Kein klarer Verlustgrund in der Activity-History erkennbar" zurueck.

Antwort-Format (strikt):
{
  "suggestions": [
    { "reason": "...", "source": "..." },
    ...
  ]
}
```

**Output-Parsing**:
- `suggestions[0]` → `primary` (mit Source-Suffix in Klammern, z.B. "Budget wurde verschoben (Quelle: E-Mail von 2026-05-15)")
- `suggestions[1..]` → `alternatives`
- Bei JSON-Parse-Error → audit_log `ki_loss_reason_suggested` mit `status: "parse_error"`, returnt `null`

**Audit-Log**: `action: "ki_loss_reason_suggested"`, `entity_type: "deal"`, `entity_id: dealId`, `context: JSON-stringified { cost_usd, input_tokens, output_tokens, model_id, status: "succeeded" | "parse_error" | "bedrock_error", suggestion_count }`. Es wird KEIN separater `accepted/edited/rejected`-Eintrag persistiert in V8 — das adressiert eine optionale Erweiterung in V8.x oder V9, nicht-blockierend (siehe Open Question 1 unten).

**Generic Atomare Server-Action `moveDealToStageWithRequirements`** (NEU oder erweitert):

Variante A (empfohlen): bestehende `moveDealToStage` wird um optionalen `requirementValues`-Parameter erweitert:

```typescript
export async function moveDealToStage(
  dealId: string,
  newStageId: string,
  stageName: string,
  requirementValues?: Record<string, string | number | null>
): Promise<{ error: string }>
```

Wenn `requirementValues` vorhanden ist, wird die Pflichtfeld-Validation auf die merge `{...currentDeal, ...requirementValues}` angewendet (statt nur `currentDeal`). Falls valide: erst `UPDATE deals SET <requirementValues> WHERE id=$1`, dann der bestehende Stage-Move-Path. Bei Server-Action-Fehler in der Pflichtfeld-Phase wird der Stage-Move abgebrochen.

**Audit-Log fuer Stage-Move mit Pflichtfeldern**: Statt der aktuellen einen `stage_change`-Action wird ein zusaetzlicher `update`-Eintrag fuer die Pflichtfeld-Aenderung persistiert (analog `updateDealValue` Audit-Pattern). Der `stage_change`-Eintrag bleibt unveraendert. Kein neuer Audit-Action-Typ.

### Data Model / Storage Direction

**Keine Schema-Migration noetig in V8.** Folgende existierende Strukturen werden genutzt:

| Tabelle | Spalte | Nutzung in V8 |
|---|---|---|
| `deals` | `value`, `contact_id`, `won_lost_reason` | Pflichtfeld-Targets in STAGE_REQUIRED_FIELDS |
| `audit_log` | `action`, `context` (TEXT) | `ki_loss_reason_suggested`-Eintraege + bestehendes `update` + `stage_change`-Pattern |
| `activities` | `deal_id`, `type`, `title`, `created_at` | Input fuer `suggestLossReason` |
| `email_messages` | `deal_id`, `from_email`, `subject`, `snippet`, `received_at` | Input fuer `suggestLossReason` |

STAGE_REQUIRED_FIELDS bleibt als hardcoded Konstante in `pipeline/actions.ts`. Eine dynamische DB-gestuetzte Pflichtfeld-Konfiguration ist explizit out-of-scope (siehe FEAT-804 Out-of-Scope).

### Data Flow / Request Flow

#### Stage-Move mit Pflichtfeldern (FEAT-804 Happy Path "Verloren")

```
1. User dragged Deal D auf Stage "Verloren" in /pipeline-View
2. Client onDragEnd:
   - prueft STAGE_REQUIRED_FIELDS["Verloren"] → {fields: ["won_lost_reason"], ...}
   - prueft Deal-Felder → won_lost_reason ist null
   - Client-Call: suggestLossReason(dealId)  [via React Server Action]
3. Server suggestLossReason:
   - Supabase Query: deal + last 10 activities + last 3 email_messages
   - Bedrock Invoke (Claude Sonnet eu-central-1) mit Prompt-Template
   - Parse JSON Response
   - INSERT audit_log (action='ki_loss_reason_suggested', context.cost_usd=$0.0XX)
   - Return { primary, alternatives, costUsd }
4. Client: oeffnet StageRequirementsModal mit pre-filled won_lost_reason
5. User editiert/akzeptiert/klickt "Verschieben"
6. Client-Call: moveDealToStage(dealId, newStageId, "Verloren", { won_lost_reason: "User-Final-Text" })
7. Server moveDealToStage:
   - UPDATE deals SET won_lost_reason='User-Final-Text' WHERE id=dealId
   - INSERT audit_log (action='update', context='Pflichtfeld-Set bei Stage-Move')
   - UPDATE deals SET stage_id, status='lost', closed_at=now() WHERE id=dealId
   - INSERT activities (stage_change-Entry)
   - INSERT audit_log (action='stage_change', context='Pipeline Stage: ... → Verloren')
   - dispatchAutomationTrigger(deal.stage_changed)
8. Client revalidatePath('/pipeline') + Toast "Deal verschoben"
```

**Bei Cancel** (Modal-X oder Esc): kein Server-Call, Deal bleibt in Source-Stage (kein optimistic UI-Update).

**Bei Bedrock-Error in suggestLossReason**: Server returnt `null`, Modal oeffnet mit leerem `won_lost_reason`-Feld + Info-Hint "KI-Vorschlag nicht verfuegbar — bitte selbst eintragen". Kein Crash, kein Toast-Error. Audit-Log persistiert `status: "bedrock_error"`.

#### Stage-Move ohne Pflichtfeld-Luecke

Klassischer Pfad bleibt unveraendert: `moveDealToStage` ohne `requirementValues`, alle Pflichtfelder schon gesetzt, Stage-Move geht direkt durch.

### External Dependencies / Integrations

**Keine neuen externen Dependencies**. Bedrock-Client (`@aws-sdk/client-bedrock-runtime` ueber `lib/bedrock-client.ts`) bleibt unveraendert. Region eu-central-1 (DEC-211). Modell `eu.anthropic.claude-sonnet-4-6` (Kurz-Form, siehe ISSUE-076 Alias).

**Token-Budget pro Suggest-Call**: ~500 Input-Tokens (Deal-Meta + 10 Activities + 3 E-Mails-Snippets) + ~300 Output-Tokens (JSON mit 1-3 Suggestions). Cost-Erwartung: $0.005-0.01 pro Call, vergleichbar mit `custom_report.executed` (siehe RPT-477 Cost-Trail).

### Security / Privacy Considerations

- **Bedrock-Region eu-central-1** bleibt — Activity- und E-Mail-Snippets gehen NICHT ueber US-Endpoints (DEC-211, DEC-079).
- **E-Mail-Snippets**: nur `subject + snippet[0..200]` werden an Bedrock geschickt. Volle Body nicht. Verhindert versehentliche PII-Exfiltration in Anhaengen/Signaturen, ausserdem Token-Cost-Limit.
- **Audit-Log Cost-Tracking**: `ki_loss_reason_suggested.context.cost_usd` persistiert pro Suggest-Call, ermoeglicht Cost-Cap-Detection in V8.x oder V9.
- **Read-Only-Context** (DEC-199/200, V7.1 Drilldown): `suggestLossReason` und `moveDealToStage` sind Mutate-Actions → `assertNotReadOnlyContext()` als First-Line (Pattern aus ISSUE-064/070). `suggestLossReason` selbst ist read-only von der DB-Seite, ABER es traegt eine Bedrock-Cost-Aktion ein → muss als Mutate behandelt werden um nicht via Drilldown-Subtree triggerbar zu sein.
- **Provider-Naming im Audit-Log**: Internal-Tracking persistiert weiterhin `model_id` mit "anthropic"/"bedrock"-Strings. User-sichtbare Audit-Log-Views (sofern existent) bekommen `formatModelDisplayName()`-Wrapper aus FEAT-802.

### Constraints + Tradeoffs

| Decision | Tradeoff |
|---|---|
| Modal-Pattern fuer alle 5 Stages, KI-Suggest nur fuer "Verloren" | + Konsistente UX cross-Stage; − User koennten bei Won-Stage einen KI-Vorschlag erwarten den es nicht gibt. Mitigation: Modal-Hint "KI-Vorschlag nur fuer Verlustgrund verfuegbar" sichtbar nur dort |
| Keine neue Schema-Migration | + Schmaler V8-Scope, kein MIG; − Audit-Log accepted/edited/rejected-Status fuer KI-Suggest nicht persistierbar. Mitigation: Wenn Bedarf, V8.x Add-on |
| Single Server-Action `moveDealToStage(..., requirementValues?)` statt separate `moveDealToStageWithRequirements` | + Backward-compatible, ein API-Surface fuer Client; − Funktion wird laenger (~120 Zeilen). Mitigation: Helper-Function `applyRequirementValuesAndMove` extrahieren |
| Goals-Move statt -Delete | + Erhaelt Goal-Verwaltung; − Eine Datei-Verschiebung mehr in SLC-811. Mitigation: einfacher Move ohne Component-Refactor |
| KI-Naming "KI" statt "Strategaize KI" / "Assistent" | + Kurz, passt zu "KI-Workspace"/"KI-Analyse"; − Generisch, kein Branding. Akzeptiert in /architecture-Decision |
| String-Substitution statt Mass-Rename | + V8 bleibt schmal, Code-Identifier bleiben verstaendlich (bedrock-client.ts); − Mental Mismatch zwischen Code-Naming ("Bedrock") und UI-Naming ("KI"). Akzeptiert |

### Open Technical Questions

Folgende Punkte bleiben fuer Slice-Planning oder spaeter offen — sie blockieren Implementation nicht:

1. **Accepted/edited/rejected-Tracking fuer KI-Suggest**: PRD wuenscht `audit_log: ki_loss_reason_suggested mit Deal-ID + akzeptiert/editiert/verworfen`. Realisierung erfordert zweiten Audit-Eintrag nach User-Modal-Confirm (`ki_loss_reason_decision` mit Status). V8-Default: nur Suggest-Call wird auditiert. Decision-Tracking als V8.x-Add-on falls relevant. **Default-Empfehlung: defer V9** (Single-User-Internal-Test, Decision-Tracking ohne Business-Value).
2. **Anzahl Vorschlaege**: Prompt-Template erlaubt 1-3, UI-Modal rendert primary + Dropdown mit alternatives. Konkrete Maximum-Zahl (1, 2 oder 3) in Slice-Planning.
3. **Empty-Activity-History-Schwelle**: Modal oeffnet trotzdem mit leerem Feld. Aber: Wann sollte `suggestLossReason` gar nicht erst aufgerufen werden (Cost-Sparen)? Heuristik: wenn 0 Activities UND 0 E-Mails → skip Bedrock-Call, Modal direkt mit Empty-Field oeffnen. In Slice-Planning festigen.
4. **Won-Stage Pre-Fill**: Beim Wechsel auf "Gewonnen" mit fehlendem `value` koennte das letzte Angebot (`proposals.total_gross WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 1`) als Pre-Fill dienen. Out-of-V8-Scope, BL-Kandidat fuer V8.x.
5. **Modal-Component-Position im Component-Tree**: Page-Level (`/pipeline/page.tsx`) oder Drag-Handler-Level (`pipeline-view.tsx`)? Slice-Planning entscheidet auf Basis State-Management-Pattern (vermutlich pipeline-view.tsx mit lokalem useState).

### Recommended Implementation Direction

**Slice-Cut** (3 Slices, ~7-11h):

- **SLC-811 (~3-4h)** — UI-Hygiene: FEAT-801 + FEAT-803
  - Settings-Page 3-Section-Refactor mit 3 neuen Tiles (Produkte, NL-History, Rollen-Verwaltung) + Goals-Tile
  - Drilldown-Button aktivieren
  - /performance/page.tsx loeschen
  - /performance/goals/ → /settings/goals/ verschieben
  - "Task" → "Aufgabe" cross-page
  - Sidebar-Audit + Link-Bereinigung
  - Tests: Vitest Component-Tests fuer Settings-Page-Section-Rendering, Live-Smoke 3-Rollen
- **SLC-812 (~1-2h)** — KI-Provider-Abstrahierung: FEAT-802
  - String-Substitutionen (AnswerPane, ItemSheet, NL-Builder, Sculptor-Cost-UI)
  - Component-Display-Label-Updates
  - ARIA-Label-Walkthrough
  - Tests: Snapshot-Diff fuer User-sichtbare Labels
- **SLC-813 (~3-5h)** — Pflichtfelder-Modal: FEAT-804
  - StageRequirementsModal-Component
  - suggestLossReason-Server-Action + Bedrock-Prompt-Template (DEC-220)
  - moveDealToStage-Extension mit requirementValues-Parameter
  - Drop-Event-Wiring in pipeline-view.tsx
  - audit_log-Insertions
  - Tests: Vitest fuer suggestLossReason (Bedrock-Mock), Modal-Component-State, Pflichtfeld-Validation, Live-Smoke alle 5 Stages

**Reihenfolge-Empfehlung**: SLC-812 zuerst (rein UI, Risiko minimal, schnelle V8-Sichtbarkeit), dann SLC-811 (UI-Refactor), dann SLC-813 (groesster Block, KI-Integration). Alternativ: SLC-811 + SLC-812 parallel als Worktrees, SLC-813 separat.

**Naechster Schritt: `/slice-planning` V8.**

**V8 Architecture ready for `/slice-planning`.**

## V8.1 — Solopreneur-Mode + Sidebar-Konsolidierung + Permission-Konsistenz Architecture

### V8.1 Summary

V8.1 ist ein **reiner UI-/Permission-/Sidebar-Filter-Sprint**. Keine Schema-Migration, kein KI-Call, kein neuer Cron, keine neue Stack-Komponente. Der V8-Stack (Image `c5e0f0c`) bleibt deployed und wird um drei orthogonale UI-Aenderungen ergaenzt:

1. **SLC-821 Solopreneur-Mode** — Server-side Helper liest `team_size` (Count Profiles mit gleicher `team_id`) und filtert in der Layout-Render-Phase die `TEAM`-Sidebar-Section weg, wenn der eingeloggte User der einzige in seinem Team ist.
2. **SLC-822 Sidebar-Konsolidierung Option A** — `VERWALTUNG_SETUP` (14 Eintraege) wird umstrukturiert: 11 Config-Items (Pipelines, Branding, Zahlungsbedingungen, Produkte, Einwilligungstexte, Workflow-Automation, NL-Sculptor-Audit, Templates, Kampagnen, Ziele, Cadences) entfallen vollstaendig aus der Sidebar — nur erreichbar via `/settings`-Tile-Page. Drei operative Tools (`/handoffs`, `/referrals`, `/audit-log`) wandern in eine neue Section `WERKZEUGE`. Der bestehende `/settings`-Sidebar-Eintrag bleibt in `VERWALTUNG_MEIN` (kein neuer Eintrag noetig).
3. **SLC-823 Teamlead-Tile-Konsistenz** — `/settings/page.tsx` Tile "Rollen-Verwaltung" Permission `ADMIN_ONLY` → `ADMIN_TEAMLEAD`. Tile-Description wird neutralisiert. **Nur Tile-Sichtbarkeit, kein Edit-Verhalten** — Edit-Erweiterung kommt in SLC-824.
4. **SLC-824 Teamlead-Edit-Erweiterung (NEU 2026-05-20 nach User-Klaerung)** — Teamlead bekommt **mehr** Edit-Rechte: darf eigene Team-Member loeschen (mit Pflicht-Reassign-Vorbedingung wie V7-Hard-Lock). **Weniger Invite-Rechte:** darf nur noch `member` einladen (heute: `member` + `teamlead`). Rolle-Wechsel bleibt admin-only. Bestaetigt DEC-194-Update + DEC-193-Update via DEC-230.

### V8.1 Code-Audit-Befunde (vor Architecture-Entscheidung)

**Q1 — team_size-Source (verifiziert):**
- `profiles.team_id` ist die kanonische Quelle (`cockpit/src/lib/auth/get-profile.ts:28` selektiert `team_id`)
- `Profile.team_id` ist als `string | null` typisiert — Admin kann `team_id = NULL` haben
- Edge-Case: Solopreneur-Admin mit `team_id = NULL` soll als Solo gelten (keine TEAM-Section sichtbar). Helper-Logik muss `team_id IS NULL` als "Solo" interpretieren

**Q4 — /settings/team Read-Only-Mode fuer Teamlead (geklaert via Code-Audit):**
- `team-members-table.tsx` ist bereits `callerIsAdmin`-aware (Z.159 Role-Select disabled, Z.204 Action-Buttons hidden fuer Teamlead)
- `invite-dialog.tsx` ist `callerRole`-aware (Z.151: Admin-Option nur fuer Admin, Z.163: Team-Auswahl nur fuer Admin)
- `cockpit/src/lib/team/actions.ts` Server-Actions: `inviteMember` admin+teamlead (Teamlead nur eigenes Team), `changeRole` admin-only, `deleteProfile` admin-only — Defense-in-Depth korrekt
- `bulk-reassign-actions.ts` blockiert Member (`caller.role === "member"`) — Teamlead darf Bulk-Reassign ausfuehren, was V7-Design ist (Teamlead operiert auf eigenem Team)
- **Diskrepanz zu User-Discovery-Wording (geklaert via Folge-Discovery 2026-05-20):** User sagte initial "Read-Only fuer Teamlead". V7-Realitaet: "Limited-Edit" (Einladen JA, Role-Change/Delete NEIN). Nach Folge-Klaerung User-Direktive: weder reines Read-Only noch V7-Default, sondern **neue Permission-Matrix** — Teamlead darf nur `member` einladen (Restrict), darf eigene Team-Member loeschen mit Pflicht-Reassign (Expand). Rolle-Wechsel bleibt admin-only. Resultiert in **SLC-824 NEU** + **DEC-230** (supersedes DEC-194 + DEC-193). DEC-229 bleibt fuer Tile-Sichtbarkeit (SLC-823), wird aber nicht mehr als "V7-Verhalten respektieren" interpretiert — V7-Verhalten wird in SLC-824 gezielt angepasst.

**Q2/Q3/Q5 — Sidebar-Layout (geklaert via Code-Audit):**
- `sidebar-config.ts:219-225` zeigt: `/settings`-Eintrag existiert bereits in `VERWALTUNG_MEIN` mit `ALL_ROLES`. **Kein neuer Eintrag noetig.**
- `SidebarSection`-Type hat 6 Sections (Z.44-50): ANALYSE, TEAM, OPERATIV, ARBEITSBEREICHE, VERWALTUNG_MEIN, VERWALTUNG_SETUP
- `SECTION_PARENT` (Z.69-72): VERWALTUNG_MEIN und VERWALTUNG_SETUP rendern gemeinsam unter Top-Header "VERWALTUNG"

### V8.1 Main Components

```
┌─────────────────────────────────────────────────────────────┐
│ V8.1 Layer (UI + Permission Filter, kein Schema)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ cockpit/src/lib/team/team-size.ts (NEU, SLC-821)            │
│   ├── getTeamSize(supabase, profile): Promise<number>       │
│   │   ├── if profile.team_id IS NULL → return 1 (Solo)      │
│   │   └── else → SELECT count(*) FROM profiles              │
│   │              WHERE team_id = profile.team_id            │
│   └── React-cached pro Request (analog get-profile.ts)      │
│                                                              │
│ cockpit/src/app/(app)/layout.tsx (CHANGE, SLC-821)          │
│   ├── Server-side filter — wenn team_size === 1:            │
│   │   filter SIDEBAR_CONFIG fuer section !== "TEAM"         │
│   └── Pass an Sidebar-Component                              │
│                                                              │
│ cockpit/src/lib/navigation/sidebar-config.ts (CHANGE,       │
│ SLC-822)                                                     │
│   ├── SidebarSection-Type: VERWALTUNG_SETUP → WERKZEUGE     │
│   ├── SECTION_LABEL.WERKZEUGE = "WERKZEUGE"                 │
│   ├── SECTION_PARENT entfaellt fuer WERKZEUGE (eigene       │
│   │   Top-Section, nicht unter "VERWALTUNG")                │
│   ├── SECTION_ORDER neu: ANALYSE → TEAM → OPERATIV →        │
│   │   ARBEITSBEREICHE → VERWALTUNG_MEIN → WERKZEUGE         │
│   ├── 11 Config-Items (Pipelines, Branding, etc.) entfaellt │
│   │   aus SIDEBAR_CONFIG-Array                              │
│   └── 3 Tools-Items (Handoffs, Referrals, Audit-Log) auf    │
│       section: "WERKZEUGE" gesetzt                           │
│                                                              │
│ cockpit/src/app/(app)/settings/page.tsx (CHANGE, SLC-823)   │
│   └── "Rollen-Verwaltung"-Tile (Z.180-188):                 │
│       ├── visibleFor: ADMIN_ONLY → ADMIN_TEAMLEAD           │
│       └── description neutralisiert auf "Team-Mitglieder    │
│           und Rollen-Zuweisung verwalten"                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### V8.1 Component Responsibilities

#### `lib/team/team-size.ts` (NEU)

- **Verantwortung:** Single-Source-of-Truth fuer "Wie viele Profiles sind in meinem Team?"
- **Signatur:** `export const getTeamSize = cache(async (profile: Profile): Promise<number>)`
- **Implementation:**
  - Wenn `profile.team_id === null` → return `1` (Solo-Admin ohne Team-Zuordnung)
  - Sonst: `SELECT count(*)` ueber `profiles` mit `team_id = profile.team_id`
  - Per-Request memoized via React `cache()` (Pattern identisch `get-profile.ts`)
- **Performance:** Einmaliger DB-Roundtrip pro Layout-Render. Bei N-Page-Navigation in SPA-Mode kein zusaetzlicher Roundtrip dank `cache()`-Memoization

#### `app/(app)/layout.tsx` (CHANGE)

- **Verantwortung:** Sidebar-Render-Pipeline um Solopreneur-Filter erweitern
- **Aenderung:** Nach `getProfile()`-Call zusaetzlich `getTeamSize(profile)` aufrufen. Wenn `teamSize === 1` → Sidebar-Items mit `section === "TEAM"` aus dem gefilterten Array entfernen (vor Pass an Sidebar-Component)
- **Reihenfolge:** Filter-Layer kommt NACH Permission-Filter (`role`-basiert), aber VOR Render
- **Nicht-Ziel:** Keine Client-Side-Detection — Server-Side-Filter, kein Flash

#### `lib/navigation/sidebar-config.ts` (CHANGE)

- **Section-Refactor:** `VERWALTUNG_SETUP` → `WERKZEUGE` (Rename, nicht neue Section)
- **`SECTION_PARENT`-Aenderung:** `WERKZEUGE` wird eigene Top-Section (kein Parent), `VERWALTUNG_MEIN` bleibt unter "VERWALTUNG"-Parent
- **`SECTION_LABEL.WERKZEUGE = "WERKZEUGE"`** (oder optional "TOOLS" — final in Slice-Planning)
- **Item-Filtering:** 11 Items entfallen vollstaendig aus `SIDEBAR_CONFIG`-Array. 3 Items behalten + Section-Wechsel:
  - `/handoffs` → section `WERKZEUGE`
  - `/referrals` → section `WERKZEUGE`
  - `/audit-log` → section `WERKZEUGE`

#### `app/(app)/settings/page.tsx` (CHANGE — SLC-823)

- **Eine Zeile aendern:** Tile-Index Z.187: `visibleFor: ADMIN_ONLY` → `ADMIN_TEAMLEAD`
- **Description-Neutralisierung Z.183:** Aktuell "Team-Mitglieder, Rollen-Zuweisung und Drilldown" — wird zu "Team-Mitglieder einsehen und verwalten" (sprachlich neutral, Edit-Faehigkeit per Rolle wird auf der Ziel-Page durchgesetzt)

#### `lib/team/actions.ts` (CHANGE — SLC-824)

- **`inviteMember` Server-Action**: zusaetzlicher Guard fuer Teamlead-Caller. Wenn `caller.role === "teamlead"` AND `payload.role !== "member"` → reject mit `INVALID_ROLE_FOR_TEAMLEAD_INVITER`. Teamlead-Caller-Path bleibt sonst unveraendert (Team-Constraint = eigenes Team).
- **`deleteProfile` Server-Action**: Permission-Layer erweitert von `assertRole(["admin"])` zu rolle-bedingter Logik. Wenn `caller.role === "admin"` → keine Aenderung (V7-Verhalten). Wenn `caller.role === "teamlead"` → zusaetzliche Guards: `target.role === "member"` AND `target.team_id === caller.team_id` AND `target.user_id !== caller.user_id`. Bestehende `countOwnerRecords`-Hard-Lock (Pre-Check) bleibt unveraendert — bei `open_records > 0` throws Error mit Re-Assign-Pflicht-Hinweis.
- **Audit-Log-Trail**: bestehende `team.member_deleted`-Action bleibt, aber `caller.role` wird im audit_log.context-Feld zusaetzlich gespeichert (Defense-in-Depth fuer forensische Nachvollziehbarkeit).

#### `app/(app)/settings/team/team-members-table.tsx` (CHANGE — SLC-824)

- **Delete-Button-Sichtbarkeit Z.204**: heute `{callerIsAdmin && !isSelf && <DeleteButton>}` — Erweiterung: `{(callerIsAdmin || (callerIsTeamlead && target.role === 'member')) && !isSelf && <DeleteButton>}`.
- **Neue Prop `callerIsTeamlead: boolean`** ergaenzt zur bestehenden `callerIsAdmin`-Prop (page.tsx leitet beides aus `callerProfile.role` ab).
- **Role-Select bleibt admin-only** (Z.159 unveraendert) — Teamlead sieht weiterhin nur Role-Badge.

#### `app/(app)/settings/team/invite-dialog.tsx` (CHANGE — SLC-824)

- **Rollen-Dropdown Z.141-152**: aktuell zeigt Teamlead `member` + `teamlead` Optionen. Aenderung: wenn `callerRole === "teamlead"` → nur `member`-Option im Dropdown. SelectItem `teamlead` und `admin` werden hinter `isAdmin`-Gate gestellt (heute nur `admin` hinter Gate).
- **Description-Anpassung**: kleine Sprach-Korrektur falls noetig (z.B. "Mitglied einladen" fuer Teamlead, "Mitglied oder Teamlead einladen" fuer Admin).

### V8.1 Data Flow

#### Solopreneur-Filter (SLC-821)

```
1. Request to /any-app-page
   ↓
2. layout.tsx Server-Component
   ├── const profile = await getProfile()
   ├── const teamSize = await getTeamSize(profile)
   │     ├── if profile.team_id === null → return 1
   │     └── else → SELECT count(*) FROM profiles WHERE team_id = X
   ↓
3. Sidebar-Filter:
   ├── Permission-Filter: SIDEBAR_CONFIG.filter(item =>
   │     item.visibleFor.includes(profile.role))
   ├── Solopreneur-Filter (NEU): if teamSize === 1 →
   │     filter(item => item.section !== "TEAM")
   ↓
4. Sidebar-Component rendert nur sichtbare Items
```

#### Sidebar-Konsolidierung (SLC-822) — Render-Pipeline unveraendert

```
SIDEBAR_CONFIG (statisches Array, nach Refactor):
  ANALYSE: [Dashboard]
  TEAM:    [Team-Cockpit, Team-Verwaltung]              ← SLC-821 ausgeblendet bei Solo
  OPERATIV: [Mein Tag, Focus, Kalender]
  ARBEITSBEREICHE: [Deals, Pipeline, Firmen, Kontakte, Multiplikatoren]
  VERWALTUNG_MEIN: [Aufgaben, Termine-Liste, E-Mails, Proposals, Settings,
                    Arbeitszeit, Meeting-Einstellungen, Briefing]
  WERKZEUGE (NEU, replaced VERWALTUNG_SETUP):
                  [Handoffs, Referrals, Audit-Log]      ← 3 statt 12 Items

Render-Reihenfolge (SECTION_ORDER):
  ANALYSE → TEAM → OPERATIV → ARBEITSBEREICHE → VERWALTUNG_MEIN → WERKZEUGE
```

#### Permission-Konsistenz (SLC-823) — Tile-Sichtbarkeit

```
/settings page.tsx:
  Role: admin → "Rollen-Verwaltung"-Tile sichtbar → /settings/team (voller Edit-Mode)
  Role: teamlead → "Rollen-Verwaltung"-Tile sichtbar → /settings/team (V8.1-Permission)
  Role: member → Tile NICHT sichtbar (filter durch visibleFor)
```

#### Teamlead-Edit-Erweiterung (SLC-824) — neue Permission-Matrix

```
Aktion                                  | Admin | Teamlead V7.1 | Teamlead V8.1
----------------------------------------|-------|---------------|---------------
Member sehen (eigenes Team)             |  ✅   |      ✅       |      ✅
Member sehen (andere Teams)             |  ✅   |      ❌       |      ❌
Member einladen als 'member'            |  ✅   |      ✅       |      ✅
Member einladen als 'teamlead'          |  ✅   |      ✅       |      ❌ ← NEU Restrict
Member einladen als 'admin'             |  ✅   |      ❌       |      ❌
Role-Wechsel (member↔teamlead)          |  ✅   |      ❌       |      ❌
Promote zu admin                        |  ✅   |      ❌       |      ❌
Member loeschen (eigenes Team)          |  ✅*  |      ❌       |      ✅* ← NEU Expand
Bulk-Reassign-Dialog ausfuehren         |  ✅   |      ✅       |      ✅

(*) Member-Loeschen ist Hard-Lock-gesichert via countOwnerRecords-Pre-Check.
    Wenn open_deals > 0 OR open_activities > 0 → throws Error mit
    Re-Assign-Pflicht. Erst nach Bulk-Reassign auf 0 ist Delete moeglich.
    Daten gehen niemals verloren — V7-DEC-193-Pattern bleibt unveraendert,
    nur die Caller-Permission wird erweitert.
```

#### Server-Action-Flow (SLC-824) — deleteProfile mit Teamlead-Caller

```
Teamlead klickt Delete-Button auf Member-Row (eigenes Team)
   ↓
team-members-table.tsx onClick → deleteProfile(target_user_id)
   ↓
lib/team/actions.ts deleteProfile:
   ├── assertRole(["admin", "teamlead"]) ← NEU erweitert
   ├── if caller.role === "teamlead":
   │     ├── if target.team_id !== caller.team_id → throw FORBIDDEN_OTHER_TEAM
   │     ├── if target.role !== "member"          → throw FORBIDDEN_NON_MEMBER
   │     └── if target.user_id === caller.user_id → throw FORBIDDEN_SELF
   ├── countOwnerRecords(target_user_id) ← V7-Pattern unveraendert
   │     ├── deals (status='active' AND owner=target)
   │     ├── activities (completed_at IS NULL AND owner=target)
   │     └── 6 weitere Owner-Tabellen
   │     → if total > 0: throw OPEN_RECORDS_BLOCK_DELETE
   ├── supabase.auth.admin.deleteUser(target_user_id)
   ├── profiles DELETE
   └── audit_log INSERT (action='team.member_deleted', caller_role=teamlead)
```

### V8.1 External Dependencies

**Keine** neuen externen Dependencies. Keine npm-Packages, keine API-Calls, keine neue Server-Komponente.

### V8.1 Security / Privacy

**Defense-in-Depth bleibt unveraendert:**
- Sidebar-Filter ist ein UX-Convenience-Layer, kein Security-Layer
- Solopreneur-Filter entfernt nur visuelle Items — Server-Actions hinter den Items (`/team`, `/settings/team`) sind durch `assertRole(["admin", "teamlead"])` geschuetzt (existierender Code)
- Tile-Sichtbarkeit auf `/settings`-Page ist UX-Convenience — Page-Internals haben eigene `assertRole`-Guards (`settings/team/page.tsx:29`)
- Falls Solopreneur-Filter umgangen wird (z.B. Direkt-Klick auf `/team`-URL): Page wuerde rendern, aber Backend-RLS + Server-Action-Guards bleiben

**Kein neues Audit-Log-Event noetig** — V8.1 macht keine Mutationen.

### V8.1 Constraints & Tradeoffs

**Constraints (bestaetigt aus Requirements):**
- Keine Schema-Migration
- Kein KI-Call
- Kein neuer Cron
- Internal-Test-Mode bleibt aktiv
- Mobile (<768px) bleibt funktional
- URL-Stabilitaet — Direkt-Links auf `/settings/templates`, `/settings/pipelines` bleiben funktional

**Tradeoffs (V8.1-spezifisch):**

| Tradeoff | Entscheidung V8.1 | Begruendung |
|---|---|---|
| Solopreneur-Helper als Server-Side oder Client-Side? | Server-Side im layout.tsx | Vermeidet Flash, konsistent mit V7-Sidebar-Pattern (DEC-190) |
| `team_id IS NULL` als Solo oder als Error? | Als Solo (return 1) | Realistisch fuer V7-Bootstrap-Admin ohne explizite Team-Zuordnung |
| Bestehender `/settings`-Eintrag vs. neuer "Einstellungen"-Footer-Eintrag? | Bestehender bleibt | Vermeidet Code-Churn, semantisch identisch |
| `VERWALTUNG_SETUP` umbenennen vs. komplett loeschen? | Umbenennen zu `WERKZEUGE` | Type-Refactor bleibt minimal, 3 Tools-Items haben dann eine sichtbare Heimat |
| `WERKZEUGE` als eigene Top-Section vs. Sub-Section von `VERWALTUNG`? | Eigene Top-Section | Tools sind nicht "Verwaltung" sondern "operative Hilfsmittel" |
| Teamlead-Tile mit Read-Only-Description vs. neutralen Description? | Neutralen Description | V7-Verhalten ist Limited-Edit, nicht reines Read-Only |
| Bulk-Reassign-UI fuer Teamlead disablen (V7-Verhalten anpassen)? | NICHT in V8.1 | V7-Design ist absichtlich Limited-Edit, BL-484 hat das nicht gefordert |

### V8.1 Open Technical Questions

**Alle 5 Requirements-Open-Questions sind hier beantwortet:**

1. ✅ **team_size-Source** — `profiles.team_id` mit `null`-Fallback auf 1. Helper in `lib/team/team-size.ts`.
2. ✅ **Tools-Section-Naming** — `WERKZEUGE`. Final in Slice-Planning, ob auch "TOOLS" oder "HILFSMITTEL" — Sprachform.
3. ✅ **Sidebar-Reihenfolge nach Konsolidierung** — ANALYSE → TEAM → OPERATIV → ARBEITSBEREICHE → VERWALTUNG_MEIN → WERKZEUGE.
4. ✅ **/settings/team Read-Only fuer Teamlead** — V7.1-Permission-Layer reicht aus, V7-Design ist Limited-Edit (DEC-226).
5. ✅ **Sidebar-Footer-Layout** — Keine Aenderung. Bestehender `/settings`-Eintrag in `VERWALTUNG_MEIN` reicht. Kein sticky-Footer noetig.

**Verbleibende Slice-Planning-Fragen (nicht Architektur-Ebene):**
- Welche exakte Schreibweise: "WERKZEUGE" / "TOOLS" / "HILFSMITTEL"
- Soll die Tile-Description "Rollen-Verwaltung" semantisch leicht angepasst werden (z.B. "Team-Mitglieder verwalten") oder bleibt sie wie aktuell?
- Reihenfolge der Sub-Slices: SLC-821 → SLC-822 → SLC-823 (kleinster Risiko-Item zuerst) oder parallel als Worktrees?

### V8.1 Architecture Decisions

- **DEC-227** — V8.1 Solopreneur-Detection via `profiles.team_id`-Count, kein neues `team_size`-Feld (SLC-821)
- **DEC-228** — V8.1 Sidebar-Section-Refactor `VERWALTUNG_SETUP` → `WERKZEUGE` (Rename mit Item-Reduktion 14 → 3) (SLC-822)
- **DEC-229** — V8.1 Teamlead-Tile-Sichtbarkeit ADMIN_ONLY → ADMIN_TEAMLEAD (SLC-823, reine Tile-Permission ohne Page-Refactor)
- **DEC-230** — V8.1 Teamlead-Permission-Matrix erweitert (SLC-824): Invite-Restriction auf `role='member'` (supersedet DEC-194-Teil), Member-Delete-Allow mit V7-Hard-Lock-Reuse (supersedet DEC-193-Teil). Rolle-Wechsel bleibt admin-only (kein Toggle in V8.1, V8.x+ optional).

### V8.1 Slice-Planning Hint

**4 Slices, jeder orthogonal, niedriges Inter-Slice-Risiko:**

- **SLC-821** (~30-60 Min) — Solopreneur-Mode:
  - `lib/team/team-size.ts` NEU (~30 Zeilen)
  - `app/(app)/layout.tsx` CHANGE (~10 Zeilen)
  - Vitest 3-4 Cases (team_id null, team_size 1, team_size >1, cache-memoization)

- **SLC-822** (~1-1.5h) — Sidebar-Konsolidierung Option A:
  - `lib/navigation/sidebar-config.ts` CHANGE: Type-Refactor + 11 Items entfernen + Section-Rename + Item-Section-Wechsel
  - Sidebar-Component falls Top-Section "WERKZEUGE" anders gerendert wird (Pruefung in Slice-Planning)
  - Vitest fuer `filterByRole`-Pattern und Section-Reihenfolge

- **SLC-823** (~10-15 Min) — Teamlead-Tile-Sichtbarkeit:
  - `app/(app)/settings/page.tsx` CHANGE: 1 Zeile Permission + 1 Zeile Description
  - Vitest fuer `visibleSections.filter`-Logik (Teamlead sieht jetzt Rollen-Verwaltung)
  - **Reine UI-Sichtbarkeit** — kein Edit-Verhalten (das kommt in SLC-824)

- **SLC-824** (~2-2.5h) — Teamlead-Edit-Erweiterung (NEU 2026-05-20):
  - `lib/team/actions.ts` `inviteMember`: Guard fuer Teamlead-Caller (role-restriction auf 'member')
  - `lib/team/actions.ts` `deleteProfile`: Permission-Erweiterung auf Teamlead mit Team+Role+Self-Guards, `countOwnerRecords`-Hard-Lock unveraendert
  - `app/(app)/settings/team/team-members-table.tsx`: Delete-Button-Sichtbarkeit fuer Teamlead bei target.role==='member'
  - `app/(app)/settings/team/invite-dialog.tsx`: Rollen-Dropdown Restriction fuer Teamlead
  - audit_log.context erweitert um caller_role (Defense-in-Depth)
  - Vitest: 6-8 neue Cases (Teamlead-Invite-Restriction, Teamlead-Delete-Allow, Cross-Team-Block, Self-Delete-Block, Hard-Lock-Pre-Check, Audit-Log)

**Total V8.1-Aufwand: ~4-5h reine Implementation + QA + Live-Smoke.** Ein 4-Slice-Sprint, kein reiner Hygiene-Sprint mehr — SLC-824 ist gezielte Permission-Aenderung mit Server-Side- und UI-Aenderungen.

**Reihenfolge-Empfehlung:** SLC-821 → SLC-822 → SLC-823 → SLC-824 (vom kleinsten Risiko aufsteigend). Alle 4 Slices koennen sequentiell auf demselben Branch bearbeitet werden — keine Worktree-Isolation noetig (orthogonale Codebereiche).

### V8.1 Delivery Mode

**Internal-Tool, Hygiene-Sprint.** Keine neue Stack-Komponente, keine Schema-Migration, kein neuer Cron, kein KI-Call. Internal-Test-Mode bleibt aktiv. V8.1-Live heisst: V8-Stack (Image `c5e0f0c`) bleibt deployed, 3 Slice-Aenderungen werden kumulativ auf `main` gemerged + Coolify-Redeploy am Slice-Ende.

**V8.1 Architecture ready for `/slice-planning`.**

## V8.4 — Customer-Facing Datenschutzerklaerung (Multi-Tenant-Ready) Architecture

### V8.4 Summary

V8.4 etabliert die rechtliche Foundation fuer Customer-Kommunikation: jeder Plattform-Tenant bekommt eine eigene Customer-Facing DSE unter `/p/[tenant-slug]/datenschutz`, die im Consent-Form vor Grant/Decline verlinkt wird und im Footer jeder Kunden-Mail auto-eingefuegt wird. Multi-Tenant via `team_id`-Reuse (V7 RLS-Helper), keine neue Stack-Komponente, kein neuer Cron, keine LLM-Calls.

**Reuse-Foundation:**
- V8.2 `renderLegalMarkdown` (`lib/legal/markdown.ts`) — remark@15 + remark-html@16 + remark-gfm@4 (`feedback_email_render_remark_pattern`)
- V8.2 `LegalPageShell`-Pattern (`components/layout/legal-page-shell.tsx`) — Style-Guide-V2 Container
- OP-V7 SLC-131 Slug-Pattern (`reference_partner_slug_pattern`) — 6 Bausteine: Migration mit Backfill + DEFAULT-Patch + Reserved-Slugs + TS-Generator + Public-Endpoint + Rate-Limiter
- V7 RLS-Helper (`get_my_team_id()`, `is_admin()`) — MIG-035
- V5.2 `ComplianceTemplateBlock`-Pattern (`components/settings/ComplianceTemplateBlock.tsx`) — Markdown-Editor mit Live-Preview + Reset-to-Default
- V8.2 Middleware-Whitelist-Pattern — `lib/supabase/middleware.ts:48`

### V8.4 Main Components

```
Browser (HTTPS, KEIN Cookie noetig)
  │
  ├─ business.strategaizetransition.com/p/[slug]/datenschutz  ← V8.4 Public-Route NEU
  │
Coolify / Caddy → Next.js App
  │
  ├── /p/[tenant-slug]/datenschutz/page.tsx (Server-Component, public)
  │     ↓
  │     ├── isReservedSlug(slug) → notFound
  │     ├── createAdminClient → teams.select(...).ilike("slug", $1)
  │     ├── legal_documents.select("content_md").eq("tenant_team_id", team.id).eq("kind", "customer-dse")
  │     ├── renderLegalMarkdown(content_md)  (V8.2 Reuse)
  │     └── <CustomerDsePageShell html tenantName />
  │
  ├── /settings/compliance/customer-dse/page.tsx (Server-Component, admin-only)
  │     ↓ assertRole(["admin"])
  │     ├── Lookup team_id via get_my_team_id() RPC
  │     ├── legal_documents.select(...) eq("tenant_team_id", team_id)
  │     └── <CustomerDseEditor onSave={updateCustomerDse} initialBody initialPreviewHtml />
  │           (Reuse-Pattern: ComplianceTemplateBlock-Layout)
  │
  ├── /consent/[token]/page.tsx (PATCH, existing)
  │     ↓
  │     ├── contacts.select(... owner_user_id) where consent_token=$1
  │     ├── NEU: profiles.select(team_id).eq("id", owner_user_id) → team.slug-Lookup
  │     └── Link "Datenschutzerklaerung lesen" target="_blank" /p/[slug]/datenschutz
  │
  └── lib/email/render.ts renderBrandedHtml (PATCH, existing)
        ├── Neuer Param: tenantSlug?: string
        ├── Auto-Footer-Block: "Datenschutzerklaerung: https://.../p/[slug]/datenschutz"
        └── Single-Choke-Point — alle Caller (send.ts, send-consent-mail.ts, briefing) reichen tenantSlug durch

Supabase / Postgres (Schema-Erweiterung V8.4):
  ├── teams (V7 bestehend, +1 Spalte): slug TEXT NOT NULL UNIQUE
  │     ↑ Backfill aus teams.name via Slugify + NFD-Decompose (OP-V7-Pattern)
  │
  └── legal_documents (V8.4 NEU):
        id              UUID PK
        tenant_team_id  UUID FK teams(id) ON DELETE CASCADE
        kind            TEXT CHECK IN ('customer-dse')
        content_md      TEXT NOT NULL
        updated_by      UUID FK profiles(id) ON DELETE SET NULL
        updated_at      TIMESTAMPTZ DEFAULT now()
        created_at      TIMESTAMPTZ DEFAULT now()
        UNIQUE(tenant_team_id, kind)  -- V1: 1 Row pro Tenant pro Kind
        RLS: scoped auf team_id via V7-Helper
```

### V8.4 Component Responsibilities

| Component | Verantwortung |
|---|---|
| **`/p/[tenant-slug]/datenschutz/page.tsx`** (NEU) | Public-Route, Server-Component, kein Auth. Slug-Lookup, DSE-Rendering, 404 bei unknown/reserved slug. |
| **`/settings/compliance/customer-dse/page.tsx`** (NEU) | Admin-only Editor mit Live-Preview, Markdown-Editor, Reset-to-Default. |
| **`actions.ts` customer-dse** (NEU) | Server-Actions: `getCustomerDse(team_id)`, `updateCustomerDse(team_id, content_md)`, `resetCustomerDseToDefault(team_id)`. Audit-Log-Insert bei Save. |
| **`lib/team/slug.ts`** (NEU, 1:1 OP-V7 Reuse) | Pure-Function `generateSlug(displayName)` + `generateUniqueSlug(displayName, existingSlugs)`. |
| **`lib/team/reserved-slugs.ts`** (NEU) | Reserved-Slug-Liste + `isReservedSlug(slug)`. Mindest-Set: admin, api, public, p, partner, strategaize, auth, assets, _next, favicon.ico + BS-Top-Level (dashboard, login, datenschutz, impressum, settings, help, consent, deals, ...). |
| **`lib/email/render.ts`** (PATCH) | `renderBrandedHtml(body, branding, vars, tenantSlug?)` — Auto-Footer-Block mit DSE-URL bei tenantSlug-Wert. Bit-fuer-Bit identisches Verhalten bei `tenantSlug=undefined` (Regression-Safety). |
| **`lib/email/send.ts`** (PATCH) | Reicht `tenantSlug` durch — Resolution aus `ownerUserId → profiles.team_id → teams.slug` (1 zusaetzlicher DB-Hit pro Mail, gecached pro Request). |
| **`lib/legal/customer-dse-default.md`** (NEU, Asset-File) | Default-Seed-Markdown mit Platzhaltern `{{tenant_name}}, {{tenant_address}}, {{kvk_or_handelsregister}}, {{contact_email}}, {{auftragsverarbeiter_liste}}`. Tenant-Admin ersetzt manuell. |
| **`components/layout/customer-dse-page-shell.tsx`** (NEU) | Server-Component-Shell analog `LegalPageShell`, mit `tenantName`-Header. |
| **`globals.css` `.customer-dse-content`** (NEU) | Eigene CSS-Schicht analog `.legal-content` und V8.3 `.help-content`. ~30 Zeilen h1/h2/h3/p/ul/ol-Selectors. |
| **`lib/supabase/middleware.ts`** (PATCH) | `publicPaths` Array um `"/p/"` ergaenzen — Pflicht-Check IMP-736-Lehre. |
| **`legal_documents`-Tabelle** (Schema NEU) | Speichert 1 Row pro (team_id, kind='customer-dse'). RLS via V7-Helper. |
| **`teams.slug`-Spalte** (Schema PATCH) | URL-Identifier. UNIQUE-Index lower(slug). DEFAULT fuer Legacy-Test-Inserts ('t-' || gen_random_uuid()). |

### V8.4 Data Model

**MIG-038 `legal_documents`-Tabelle:**

```sql
CREATE TABLE IF NOT EXISTS legal_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('customer-dse')),
  content_md      TEXT NOT NULL,
  updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_team_id, kind)
);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_documents_select_team ON legal_documents
  FOR SELECT TO authenticated
  USING (is_admin() OR tenant_team_id = get_my_team_id());

CREATE POLICY legal_documents_admin_mutate ON legal_documents
  FOR ALL TO authenticated
  USING (is_admin() AND tenant_team_id = get_my_team_id())
  WITH CHECK (is_admin() AND tenant_team_id = get_my_team_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON legal_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_documents TO service_role;

NOTIFY pgrst, 'reload schema';
```

**MIG-038 `teams.slug`-Spalte (OP-V7-Pattern):**

```sql
-- Phase 1: Spalte nullable hinzufuegen
ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug TEXT;

-- Phase 2: Backfill mit Kollisions-Loop (Slugify + Suffix-Strategie)
DO $$
DECLARE r record; base_slug text; candidate text; suffix int;
BEGIN
  FOR r IN SELECT id, name FROM teams WHERE slug IS NULL ORDER BY created_at LOOP
    base_slug := lower(translate(r.name,
      'aeoeueAOEUEss ', 'aoeAOEss-'));
    base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    base_slug := left(base_slug, 60);
    IF base_slug = '' THEN
      base_slug := 't-' || substring(r.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM teams WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    UPDATE teams SET slug = candidate WHERE id = r.id;
  END LOOP;
END$$;

-- Phase 3: NOT NULL + UNIQUE lower-Index
ALTER TABLE teams ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_lower_unique ON teams (lower(slug));

-- Phase 4: DEFAULT fuer Legacy-Test-Inserts
ALTER TABLE teams ALTER COLUMN slug SET DEFAULT ('t-' || replace(gen_random_uuid()::text, '-', ''));

-- Phase 5: Default-Seed legal_documents fuer alle existierenden teams
INSERT INTO legal_documents (tenant_team_id, kind, content_md)
SELECT t.id, 'customer-dse', '<Default-Markdown aus lib/legal/customer-dse-default.md>'
FROM teams t
ON CONFLICT (tenant_team_id, kind) DO NOTHING;

NOTIFY pgrst, 'reload schema';
```

**Erwartete Wirkung Post-Apply:**
- `teams`-Tabelle hat 1 zusaetzliche Spalte `slug`
- Aktuell 1 Team `Strategaize Transition BV` → Slug `strategaize-transition-bv`
- `legal_documents` enthaelt 1 Row pro Team mit Default-Markdown
- Tenant-Admin muss Platzhalter im Editor manuell ersetzen

### V8.4 Data Flow

**Flow 1 — Public Read (Kunde liest DSE):**

```
Kunde klickt Link "Datenschutzerklaerung lesen" im Consent-Form
   ↓
GET /p/strategaize-transition-bv/datenschutz   (KEIN Cookie noetig)
   ↓
Middleware: pathname.startsWith("/p/") → publicPaths-Whitelist → pass-through
   ↓
app/p/[tenant-slug]/datenschutz/page.tsx (Server-Component)
   ├── isReservedSlug("strategaize-transition-bv") → false
   ├── admin.from("teams").select("id, name").ilike("slug", "strategaize-transition-bv").maybeSingle()
   │     → { id: <uuid>, name: "Strategaize Transition BV" }
   ├── admin.from("legal_documents").select("content_md").eq("tenant_team_id", <uuid>).eq("kind", "customer-dse").maybeSingle()
   │     → { content_md: "# Datenschutzerklaerung..." }
   ├── renderLegalMarkdown(content_md) → HTML
   └── <CustomerDsePageShell html tenantName="Strategaize Transition BV" />
   ↓
HTTP 200 + HTML (article.customer-dse-content + Tenant-Header)
```

**Flow 2 — Editor-Write (Admin pflegt DSE):**

```
Admin oeffnet /settings/compliance/customer-dse
   ↓
Server-Component-Page (admin-only via assertRole)
   ├── team_id := get_my_team_id() RPC
   ├── legal_documents.select(content_md, updated_at).eq("tenant_team_id", team_id).eq("kind", "customer-dse")
   └── <CustomerDseEditor initialBody initialPreviewHtml />
   ↓
Admin editiert Markdown → onSave klick
   ↓
Server-Action updateCustomerDse(team_id, content_md):
   ├── assertRole(["admin"])
   ├── RLS-Check (V7-Helper): is_admin() AND tenant_team_id = get_my_team_id()
   ├── UPDATE legal_documents SET content_md=$1, updated_by=auth.uid(), updated_at=now() WHERE tenant_team_id=$2 AND kind='customer-dse'
   └── audit_log INSERT: action='customer_dse.updated', actor_id=auth.uid(), context='V8.4 Editor-Save'
   ↓
Live-Preview rendert renderLegalMarkdown(content_md) clientseitig (parallel zur Server-Render)
```

**Flow 3 — Mail-Footer-Auto-Insert (System haengt DSE-URL an Mail-Footer an):**

```
sendEmailWithTracking({ to, body, ownerUserId, ... })
   ↓
lib/email/send.ts
   ├── Lookup tenantSlug aus ownerUserId:
   │     ├── profiles.select(team_id).eq("id", ownerUserId)
   │     └── teams.select(slug).eq("id", team_id)
   │     → tenantSlug = "strategaize-transition-bv"
   ├── const branding = await getBrandingForSend(ownerUserId)
   └── const html = renderBrandedHtml(body, branding, vars, tenantSlug)
   ↓
lib/email/render.ts renderBrandedHtml(body, branding, vars, tenantSlug)
   ├── Build body-block, contact-block, footerMarkdown-block wie heute
   ├── NEU: dseLinkBlock = tenantSlug
   │     ? `<tr><td>Datenschutzerklaerung: <a href="${BASE_URL}/p/${tenantSlug}/datenschutz">${BASE_URL}/p/${tenantSlug}/datenschutz</a></td></tr>`
   │     : ""
   └── Append nach footerText (Reihenfolge: logoBlock → bodyBlock → footerLine → contactRows → footerText → dseLinkBlock)
   ↓
Mail-HTML enthaelt Auto-Footer mit DSE-URL
   ↓
Bei tenantSlug=undefined (Legacy-Caller): Output bit-identisch zu V8.3 (Regression-Safety)
```

### V8.4 External Dependencies

**Keine neuen.** Bestehende: `remark@15 + remark-html@16 + remark-gfm@4` (V8.2 Standard, `feedback_email_render_remark_pattern`). Kein npm-Install noetig.

### V8.4 Security / Privacy

- **RLS scoped auf `tenant_team_id`** via V7-Helper `get_my_team_id()`. Tenant-A-Admin kann NICHT Tenant-B-DSE lesen oder editieren.
- **Public-Route ohne Auth** durch Middleware-Whitelist `/p/` (Pflicht-Lehre IMP-736). Reservierter-Slug-Pre-Check spart DB-Hit + verhindert URL-Path-Hijack.
- **Audit-Log bei Editor-Save** (`audit_log INSERT action='customer_dse.updated'`). Kein eigenes Schema, bestehende Tabelle.
- **DSGVO-Compliance** durch Auto-Footer in Mail-Renderer: jede Kunden-Mail enthaelt DSE-Link → Art. 13 Informations-Pflicht erfuellt. Pre-Existing Consents (status=`granted` vor V8.4-Live) bleiben unangetastet — entsprechen alter Sachlage. Neue Consents ab Live-Date sehen DSE-Verlinkung.
- **Rate-Limit auf Public-Route** ist V1 NICHT erforderlich (Internal-Test-Mode, 1 Tenant). V2 mit Pen-Test-Befund optional ergaenzbar via OP-V7-Pattern (`partnerResolveLimiter` 60/h/IP).

### V8.4 Constraints & Tradeoffs

**Constraints (bestaetigt aus Requirements):**
- Multi-Tenant via `team_id`-Reuse, kein eigenes `tenant_id`-Schema-Refactor
- Default-Seed-Text ist Entwurf; Anwalts-Pruefung deferred Pre-Customer-Live (`feedback_compliance_gate_later`)
- Internal-Test-Mode bleibt aktiv
- Keine Schema-Refactors auf bestehenden Tabellen (additive Migration)
- Stack: Next.js 16 + Supabase + Server-Components, kein neuer Container

**Tradeoffs:**

| Tradeoff | Entscheidung V8.4 | Begruendung |
|---|---|---|
| Versionierung mit History V1 oder V2? | V1 KISS Single-Row, V2 History | YAGNI bei Internal-Test-Mode, V2-Pfad ist additive ALTER TABLE + neue Tabelle |
| Schema-Wahl: `compliance_templates` erweitern oder neue Tabelle? | Eigene `legal_documents` Tabelle | compliance_templates ist Single-Tenant (kein team_id), Cross-Konzept-Mix waere Pollution |
| Public-Route unter `(app)`-Layout oder Root? | Root (`app/p/...`) | V8.2-Pattern (`/datenschutz` ist auch unter Root) — kein Auth, kein Sidebar |
| Mail-Footer-Auto-Insert: zentral oder per Call-Site? | Zentral in `render.ts` | Single-Choke-Point sauberer als 5 Patch-Punkte, Regression-Risk minimal via Optional-Param |
| CSS-Schicht: Reuse `.legal-content` oder eigene? | Eigene `.customer-dse-content` | V8.3-Pattern (eigene `.help-content`), Tenant-Branding-Future-Ready |
| Auftragsverarbeiter: Markdown-Block oder DB-Tabelle? | Markdown-Block V1, Tabelle V2 | 1 Tenant heute, zentrale Liste in Markdown easy maintainable |
| Tenant-Slug: aus `teams.name` oder onboarding-explizit? | Slugify aus `teams.name` mit Suffix-Loop | OP-V7-Pattern 1:1, Backfill deckt alle existierenden Teams ab |
| Reserved-Slugs-Defense: App-Layer oder DB-CHECK? | App-Layer V1, V2 optional DB-CHECK | V7-Reuse + Defense-in-Depth-Pattern aus OP-V7 |
| Rate-Limit auf Public-Route? | NEIN in V1 | Internal-Test-Mode, 1 Tenant. V2 wenn Pen-Test Volumen zeigt. |

### V8.4 Open Technical Questions

**Alle 7 FEAT-824 Open Questions sind hier beantwortet:**

1. ✅ **O1 Versionierung V1 vs V2** — V1 KISS Single-Row `legal_documents` mit UNIQUE(team_id, kind). V2 additive `legal_document_versions`-History-Tabelle. Siehe DEC-231.
2. ✅ **O2 Initialer Tenant-Slug fuer immo@bellaerts.de** — `strategaize-transition-bv` via Slugify-Backfill aus existing `teams.name='Strategaize Transition BV'`. Siehe DEC-232.
3. ✅ **O3 Re-Consent-Cron-Integration** — out-of-scope V1 (folgt aus O1). Bestehender `pending-consent-renewal`-Cron unveraendert. V2 zusammen mit Versionierung.
4. ✅ **O4 Mail-Composer-Touchpoints** — Inventur ergibt **1 zentraler Patch in `lib/email/render.ts`**. 3 Caller (`send.ts`, `send-consent-mail.ts`, `meeting-briefing`-Cron) reichen `tenantSlug` durch. Siehe DEC-235.
5. ✅ **O5 Auftragsverarbeiter-Liste** — Markdown-Block in `customer-dse-default.md` (V1). V2 separate `auftragsverarbeiter`-Tabelle mit Cross-Tenant-Sharing. Siehe DEC-237.
6. ✅ **O6 `.customer-dse-content` CSS-Schicht** — Eigene Schicht analog V8.3 `.help-content`. Siehe DEC-236.
7. ✅ **O7 Slug-Aufloesung Public-Route + Hairpin** — `app/p/[tenant-slug]/datenschutz/page.tsx` direkt unter App-Router-Root (NICHT unter `(app)`). Server-Component liest `teams` und `legal_documents` via `createAdminClient`. Middleware-Whitelist `/p/` erweitern (IMP-736-Pflicht). Siehe DEC-234.

**Verbleibende Slice-Planning-Fragen (nicht Architektur-Ebene):**
- Exakte Default-Seed-Markdown-Vorlage (90% Reuse aus `content/legal/datenschutz.md` + Anpassung Verantwortliche-Stelle + Add-on Auftragsverarbeiter)
- Editor-UI: Custom-Komponente oder ComplianceTemplateBlock-Reuse mit minimaler Adapter-Schicht? (Empfehlung: Reuse)
- Slug-Generator-Tests: 9 Mindest-Cases aus OP-V7-Pattern direkt portieren oder erweitern (z.B. fuer `Strategaize Transition B.V.` mit Dot-Edge-Case)
- Vitest-Coverage fuer `renderBrandedHtml` Snapshot-Tests: bestehende Snapshots (`render.test.ts.snap`) muessen Regression-Safety belegen wenn `tenantSlug=undefined`

### V8.4 Architecture Decisions

- **DEC-231** — V8.4 Versionierung-Strategie: V1 Single-Row, V2 History-Tabelle (FEAT-824 O1)
- **DEC-232** — V8.4 Tenant-Slug-Initialwert via Slugify-Backfill aus `teams.name` (FEAT-824 O2)
- **DEC-233** — V8.4 Schema-Wahl: eigene `legal_documents`-Tabelle (NICHT `compliance_templates` erweitern) (FEAT-824 Multi-Tenant-Konsequenz)
- **DEC-234** — V8.4 Public-Route `/p/[tenant-slug]/datenschutz` outside `(app)`-Layout + Middleware-Whitelist (FEAT-824 O7)
- **DEC-235** — V8.4 Mail-Footer-Auto-Insert zentral in `lib/email/render.ts` statt 5 Call-Sites (FEAT-824 O4)
- **DEC-236** — V8.4 CSS-Schicht `.customer-dse-content` eigene Layer analog V8.3 `.help-content` (FEAT-824 O6)
- **DEC-237** — V8.4 Auftragsverarbeiter-Liste als Markdown-Block in V1, Tabellen-DB in V2 (FEAT-824 O5)
- **DEC-238** — V8.4 Slice-Cut: 7 Slices SLC-841..847 strikt sequenziell

### V8.4 Slice-Planning Hint

**7 Slices, strikt sequenziell wegen Inter-Slice-Dependencies:**

| Slice | Scope | Aufwand | Depends-On |
|---|---|---|---|
| **SLC-841** | Schema-Migration MIG-038 (legal_documents + teams.slug + Backfill) + RLS-Tests | ~1.5h | — |
| **SLC-842** | Slug-Generator-TS (1:1 OP-V7 Reuse) + Reserved-Slugs + Default-Seed-Markdown-File | ~2h | SLC-841 |
| **SLC-843** | Public-Route `/p/[slug]/datenschutz` + CustomerDsePageShell + .customer-dse-content CSS + Middleware-Whitelist | ~1h | SLC-841, SLC-842 |
| **SLC-844** | Markdown-Editor `/settings/compliance/customer-dse` + Server-Actions + Audit-Log | ~2h | SLC-841, SLC-842 |
| **SLC-845** | Consent-Form-Verlinkung (`consent/[token]/page.tsx` Patch mit team-slug-Lookup) | ~1h | SLC-841, SLC-842, SLC-843 |
| **SLC-846** | Mail-Footer-Auto-Insert via `render.ts` + `send.ts` + `send-consent-mail.ts` Patches | ~1.5h | SLC-841, SLC-842, SLC-843 |
| **SLC-847** | Gesamt-QA + Master-Merge + Coolify-Redeploy + Live-Smoke 8/8 ACs | ~1.5h | alle vorher |

**Gesamt-Aufwand V8.4: ~10.5h Code-Side + ~1h /qa pro Slice = ~12-13h verteilt ueber 2-3 Sessions.**

**Optional parallelisierbar (Worktrees):** SLC-845 und SLC-846 nach Abschluss SLC-843 — orthogonale Codebereiche (Consent-Page vs. Mail-Renderer). Bei sequentiellem Vorgehen: 845 → 846 → 847.

**Pflicht-Reihenfolge** (BLOCKING):
1. SLC-841 ZUERST (Schema-Foundation — alle anderen Slices brauchen DB-Spalten + Tabelle)
2. SLC-842 NACH 841 (Slug-Generator + Default-Seed sind Voraussetzung fuer Public-Route + Editor)
3. SLC-843 + SLC-844 sind orthogonal nach 842 (koennen parallel in Worktrees, aber 843 ist niedrigeres Risiko zuerst)
4. SLC-845 + SLC-846 sind orthogonal nach 843+844
5. SLC-847 ZULETZT (Gesamt-QA + Deploy)

### V8.4 Delivery Mode

**Internal-Tool, Compliance-Foundation.** Keine neue Stack-Komponente, kein neuer Container, kein neuer Cron, kein KI-Call. Eine additive Schema-Migration (MIG-038), keine Schema-Refactors. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung Pre-Customer-Live (`feedback_compliance_gate_later`).

**V8.4-Live heisst:** MIG-038 wird auf Hetzner via `sql-migration-hetzner.md`-Procedure angewandt (`postgres`-User, base64-Pipe, idempotent IF NOT EXISTS). Image-Tag-Bump nach SLC-847-Master-Merge. Coolify-Redeploy auf `main`. Live-HTTP-Smoke: `/p/strategaize-transition-bv/datenschutz` HTTP 200, `/settings/compliance/customer-dse` admin-only, Consent-Token-URL zeigt DSE-Link, Test-Mail-Render enthaelt Auto-Footer mit DSE-URL.

**V8.4 Architecture ready for `/slice-planning`.**

## V8.8 — Help-System Redesign mit Annotated-Screenshot-Hotspots Architecture

### V8.8 Architecture Summary

V8.8 erweitert die V8.3-Plain-Markdown-Help-Foundation um **annotierte Screenshots mit klickbaren Hotspots**. Eine Pilot-Page (`mein-tag`) bekommt ein echtes App-Screenshot mit absolute-positionierten Hotspot-Buttons; Klick oeffnet ein Modal mit Title + Markdown-Body + optional Video-Slot. Mobile (<768px) faellt auf eine begleitende Markdown-Liste zurueck.

**Stack-Erweiterung: 0** — kein neuer Container, keine Schema-Migration, keine externen APIs, kein Cron, kein KI-Call. Reine Frontend-Erweiterung mit Asset-Pflege. JSON-Storage statt DB-Tabelle. Bestehender `renderLegalMarkdown` + `Dialog` (Base UI) + `HelpPageShell` werden 1:1 wiederverwendet.

**Pattern-Reuse-Check:** Cross-Repo-Search (BS / OP / IS / ImSch / Blueprint-Plattform) ergab **kein bestehendes Hotspot-/Annotated-Screenshot-Pattern**. V8.8 wird die **canonical-first Implementation** fuer alle Strategaize-Repos. Nach V8.8-Release als Memory-File dokumentieren (Pfad + Snippet) fuer naechste Repos.

**Pattern-Reuse innerhalb BS:** `renderLegalMarkdown` (V8.2, V8.3, V8.4 erprobt), `HelpPageShell` (V8.3), `Dialog` aus `cockpit/src/components/ui/dialog.tsx` (Base UI, App-Standard), `deliverables/user-guide/screencaps.spec.ts` Playwright-Pipeline fuer Screenshots.

### V8.8 Main Components

```
Browser (Desktop, viewport >= 768px)
  │
  └─ /help/mein-tag
       │
       ├─ HelpPageShell (existing, +1 optional prop "imageBlock")
       │    ├─ Back-Link "Zurueck zur Uebersicht"
       │    └─ <article.help-content>
       │         ├─ [NEW: imageBlock] <HotspotImageClient>  (Client Component)
       │         │    ├─ <figure>
       │         │    │    ├─ <img src="/help/screenshots/mein-tag.webp"
       │         │    │    │     alt="..." className="w-full h-auto" loading="lazy" />
       │         │    │    └─ <button> overlays (absolute, x/y/w/h in %)
       │         │    │         on click → setOpenHotspotId
       │         │    └─ <HotspotModal hotspot={current} open={...} onClose={...}>
       │         │         ├─ Dialog (Base UI)
       │         │         │    ├─ DialogTitle = hotspot.title
       │         │         │    ├─ <div dangerouslySetInnerHTML={{__html: hotspot.bodyHtml}}>
       │         │         │    └─ optional <video controls src={hotspot.videoUrl}>
       │         │         └─ Backdrop + ESC + Close-Button (Base UI native)
       │         └─ Intro-Markdown (existing, V8.3-rendered HTML)
       │
Browser (Mobile, viewport < 768px)
  │
  └─ /help/mein-tag
       │
       └─ HelpPageShell
            └─ <article.help-content>
                 ├─ <HotspotImageClient>
                 │    ├─ <img> (no overlays, not interactive)
                 │    └─ <ol class="hotspot-list">
                 │         └─ <li> per hotspot
                 │              ├─ <strong>{title}</strong>
                 │              └─ <div dangerouslySetInnerHTML>{bodyHtml}</div>
                 └─ Intro-Markdown
```

### V8.8 Responsibilities

| Component | Verantwortung | Datei |
|---|---|---|
| **Hotspot-Schema** | zod-Schema fuer Hotspot-Page-JSON (id/x/y/w/h/title/body_md/video_url + Bounds-Refine) | `cockpit/src/lib/help/hotspot-schema.ts` (NEU) |
| **Hotspot-Loader** | Liest JSON, parst via zod, pre-renderst `body_md` per Hotspot via `renderLegalMarkdown`, gibt typisierte `HotspotPageData` zurueck | `cockpit/src/lib/help/hotspot-loader.ts` (NEU) |
| **HelpPageShell** | Wrapper-Komponente, +1 optional Prop `imageBlock?: ReactNode` (rendert oberhalb des Article-Bodies wenn gesetzt) | `cockpit/src/components/help/help-page-shell.tsx` (modify) |
| **HotspotImageClient** | Client-Component, `useMediaQuery("(min-width: 768px)")`, Desktop: figure+img+button-Overlays; Mobile: img+ol-Liste; State `openHotspotId` | `cockpit/src/components/help/hotspot-image.tsx` (NEU) |
| **HotspotModal** | Client-Component, wraps Base-UI Dialog + DialogContent + DialogTitle + Body via dangerouslySetInnerHTML + optional video | `cockpit/src/components/help/hotspot-modal.tsx` (NEU) |
| **Page-Component** | Server-Component, liest catalog + intro-md + optional hotspot-json, pre-rendert, uebergibt pre-rendered Data an HotspotImageClient | `cockpit/src/app/(app)/help/[slug]/page.tsx` (modify) |

### V8.8 Data Flow

```
Request: GET /help/mein-tag
  │
  ▼
Server (page.tsx):
  1. await params → slug = "mein-tag"
  2. getHelpGuideBySlug(slug) → guide (Title, Section, Roles, DurationMinutes)
  3. readFile(src/content/help/mein-tag.md) → markdown
  4. renderLegalMarkdown(markdown) → introHtml
  5. tryReadHotspotJson(slug):
       try readFile(src/content/help/hotspots/mein-tag.json) → raw
       parseHotspotPageJson(raw, slug) → HotspotPage (zod-validated)
       for each hotspot:
         hotspot.bodyHtml = await renderLegalMarkdown(hotspot.body_md)
       return HotspotPageData
     catch ENOENT: return null
  6. if HotspotPageData != null:
       return <HelpPageShell html={introHtml} imageBlock={<HotspotImageClient data={pageData} />} />
     else:
       return <HelpPageShell html={introHtml} />  // V8.3 fallback
  │
  ▼
Browser hydrates HotspotImageClient
  - useMediaQuery checks viewport
  - Renders Desktop (overlays) or Mobile (list) variant
  - User clicks hotspot → state update → Modal opens
```

**Critical:** Per `feedback_rsc_no_function_props`, Server→Client Props sind nur Primitive/Plain-Objects. `HotspotPageData` enthaelt nur `string`/`number` Felder + Array von Plain-Objects mit `bodyHtml: string`. Keine Functions, keine React-Elements als Props.

### V8.8 Data Model (JSON Files, kein DB-Schema)

**Storage-Format:** JSON-Files unter `cockpit/src/content/help/hotspots/<slug>.json`. Parallel zur bestehenden Markdown-Convention `cockpit/src/content/help/<slug>.md`.

**zod-Schema-Konkretisierung:**

```typescript
// cockpit/src/lib/help/hotspot-schema.ts
import { z } from "zod";

const HotspotIdSchema = z.string()
  .min(1).max(50)
  .regex(/^[a-z0-9-]+$/, "Hotspot-ID must be kebab-case (lowercase, digits, hyphens)");

const PercentSchema = z.number().min(0).max(100);

export const HotspotSchema = z.object({
  id: HotspotIdSchema,
  x: PercentSchema,         // Origin top-left (0,0); Prozent relativ zum Image
  y: PercentSchema,
  w: PercentSchema,
  h: PercentSchema,
  title: z.string().min(1).max(80),
  body_md: z.string().min(1).max(2000),  // Safety-Net, Empfehlung 400-800
  video_url: z.string().url().optional(), // V1 ungenutzt, Schema-Slot
}).refine((h) => h.x + h.w <= 100, { message: "Hotspot would clip horizontally" })
  .refine((h) => h.y + h.h <= 100, { message: "Hotspot would clip vertically" });

export const HotspotPageSchema = z.object({
  slug: z.string().min(1),
  imageUrl: z.string()
    .regex(/^\/help\/screenshots\/[a-z0-9-]+\.webp$/, "Path must be /help/screenshots/<slug>.webp"),
  imageWidth: z.number().int().positive(),    // Natural width in source pixels
  imageHeight: z.number().int().positive(),
  imageAlt: z.string().min(1).max(160),       // a11y pflicht
  hotspots: z.array(HotspotSchema).min(1).max(20),
});
```

**Pilot-JSON-Beispiel (`hotspots/mein-tag.json`):**

```json
{
  "slug": "mein-tag",
  "imageUrl": "/help/screenshots/mein-tag.webp",
  "imageWidth": 2560,
  "imageHeight": 1800,
  "imageAlt": "Screenshot der Seite Mein Tag mit annotierten Hotspots an KI-Workspace, Aufgabenliste und Wiedervorlagen-Bereich.",
  "hotspots": [
    { "id": "ki-workspace", "x": 6, "y": 5, "w": 88, "h": 18, "title": "KI-Workspace", "body_md": "Hier finden Sie die KI-Berichts-Buttons..." },
    { "id": "aufgaben-heute", "x": 6, "y": 26, "w": 60, "h": 25, "title": "Offene Aufgaben heute", "body_md": "Liste der heute zu erledigenden Aufgaben..." },
    { "id": "wiedervorlagen", "x": 6, "y": 54, "w": 60, "h": 30, "title": "Wiedervorlagen", "body_md": "KI-Vorschlaege fuer Deals..." }
  ]
}
```

**Backward-Compatibility:**
- Slugs ohne `hotspots/<slug>.json` rendern V8.3-Plain-Markdown weiter (Fallback in page.tsx via try/catch ENOENT).
- Bestehendes `cockpit/src/content/help/<slug>.md` bleibt unangetastet — Intro-Markdown wird weiterhin gerendert.
- Bestehende Catalog-Tests (`listHelpSlugs` invariant: 12 Slugs/12 MD-Files) bleiben gruen.

### V8.8 Open-Questions Closure

Alle 7 Open Questions aus FEAT-881 sind beantwortet:

1. **OQ-1 Hotspot-Asset-Pfad** → DEC-241: V1 Flat `cockpit/public/help/screenshots/<slug>.webp`. Folder-pro-Slug deferred bis Variant-Bedarf (Dark-Mode V2) eintritt.
2. **OQ-2 Modal-Library** → DEC-242: Bestehender `Dialog` aus `cockpit/src/components/ui/dialog.tsx` (Base UI, kein Radix). Scroll-Lock + Long-Body Edge-Cases via `max-h-[80vh] overflow-y-auto` in unserem Wrapper.
3. **OQ-3 Numbered-Badges** → DEC-243: V1 nur Border-Highlight + Cursor-Pointer + sr-only-Number fuer Accessibility. Visuelle Numbered-Badges deferred V2 BL-Followup.
4. **OQ-4 Markdown-Renderer** → DEC-244: Server-pre-render via `renderLegalMarkdown` zur Page-Load-Zeit. Kein react-markdown im Client-Bundle. Pre-rendered `bodyHtml` wird als String an Client-Component uebergeben.
5. **OQ-5 Body-Length** → DEC-245: zod `.max(2000)` als Safety-Net (Schutz vor Layout-Bruch). Doku-Empfehlung 400-800 Zeichen fuer UX.
6. **OQ-6 Dark-Mode-Screenshots** → DEC-246: BS hat (Stand V8.7) **keinen Dark-Mode-Toggle**. V1 = Single Light-Image. Falls BS Dark-Mode bekommt, wird Schema spaeter um `image_variants` erweitert.
7. **OQ-7 Image-Resolution** → DEC-247: 2x Retina-Standard (capture viewport 1280x900 mit `deviceScaleFactor: 2` → 2560x1800), WebP-Format (Quality 82-85%, ~250-400KB), DOM-Render `<img className="w-full h-auto" loading="lazy">` (Browser-Downscale automatisch).

### V8.8 Folder-Struktur (Files Created/Modified)

```
cockpit/
├── public/
│   └── help/
│       └── screenshots/
│           └── mein-tag.webp                          [NEW asset, ~250-400KB]
└── src/
    ├── app/(app)/help/[slug]/page.tsx                 [MODIFY: try-read hotspot-json + pre-render]
    ├── components/help/
    │   ├── help-page-shell.tsx                        [MODIFY: +1 optional imageBlock prop]
    │   ├── hotspot-image.tsx                          [NEW Client-Component]
    │   └── hotspot-modal.tsx                          [NEW Client-Component]
    ├── content/help/
    │   ├── mein-tag.md                                [UNCHANGED]
    │   └── hotspots/                                  [NEW directory]
    │       └── mein-tag.json                          [NEW]
    └── lib/help/
        ├── catalog.ts                                 [UNCHANGED]
        ├── hotspot-schema.ts                          [NEW zod-Schema]
        └── hotspot-loader.ts                          [NEW: readFile + parse + pre-render]
```

**Test-Files (Vitest):**
```
cockpit/src/lib/help/
  ├── hotspot-schema.test.ts                          [NEW: zod-Validation + Refine-Cases]
  └── hotspot-loader.test.ts                          [NEW: ENOENT-Fallback + Happy-Path + Drift-Errors]
```

### V8.8 Security / Privacy

- **Keine User-Daten in Hotspots.** Pilot-Screenshot `mein-tag` zeigt UI-Layout, keine echten Kunden-/Deal-Daten. Capture in einer Demo-Tenant-Umgebung mit `qa-admin` Seed-Account.
- **Authenticated-only Route.** `/help/[slug]` liegt under `(app)`-Layout-Group, ist NICHT in `publicPaths`-Whitelist der `middleware.ts`. Kein anonymer Zugriff auf Hotspots. Public-Path-Whitelist-Patch ist hier NICHT erforderlich (anders als V8.2/V8.4).
- **Assets oeffentlich abrufbar.** Static-Assets unter `public/help/screenshots/` sind technisch ohne Auth abrufbar (Next.js-Standard fuer `public/`). Risk-Akzeptanz: Screenshots zeigen keinen sensiblen User-Daten-Inhalt, das Risiko ist marginal. Falls spaeter sensitive Screenshots (Customer-Daten-Demo) benoetigt werden, muessen sie ausserhalb von `public/` liegen und via Server-Route ausgeliefert werden.
- **dangerouslySetInnerHTML.** `body_md` ist Strategaize-internal-authored Content (kein User-Input). renderLegalMarkdown nutzt `remark-html` mit `sanitize: false` (akzeptiert, weil Author-Content = Trusted, wie schon V8.3 Help + V8.4 Customer-DSE). Kein XSS-Risiko bei diesem Threat-Model.

### V8.8 Constraints & Tradeoffs

| Constraint | Konsequenz |
|---|---|
| Hotspot-Koordinaten in Prozent | Robust bei Image-Resize, aber: bei Page-UI-Layout-Aenderungen werden Koordinaten stale → Re-Capture + Re-Edit JSON noetig. Mitigation: Visual-Sichtpruefung der Pilot-Page bei jedem Major-Release. |
| Server-Pre-Rendering aller Hotspot-Bodies | Page-Load liest + rendert eager auch wenn User keine Hotspots klickt. Tradeoff: 3-10 Hotspots × ~500 Bytes HTML = vernachlaessigbarer Page-Weight-Anstieg (~5KB), aber Zero-Bundle-Cost auf Client (kein react-markdown). |
| zod `.max(2000)` body_md | Verhindert Layout-Bruch, aber kein hartes UX-Limit. Doku-Empfehlung 400-800 reicht in 95% der Faelle. |
| WebP-only Image-Format | Alle modernen Browser supporten WebP (2026-Standard). Fallback auf PNG nur, falls Browser-Compat-Issue konkret auftritt. |
| Mobile-Fallback ist statisch | Touchscreen-User auf Tablet (>=768px) sehen Hotspots, aber Touch-Targets sind nur durch CSS-Hover-Style markiert (kein Touch-Feedback). Akzeptierbar fuer V1, V2 koennte tap-active-state ergaenzen. |
| Pre-rendered HTML in Server-zu-Client-Props | Wenn ein Hotspot 10 zeilen Markdown hat, dann ist `bodyHtml` auch in Page-Source-HTML als String enthalten. Page-Weight steigt linear mit Anzahl Hotspots. Bei 20 Hotspots × 2KB = 40KB. Akzeptierbar fuer V1 mit 3-5 Hotspots in der Pilot-Page. |
| Folder vs Flat Image-Path | V1 Flat (`screenshots/<slug>.webp`). Migration zu Folder (`screenshots/<slug>/screenshot.webp`) ist trivial wenn V2 Variants kommen (1 Mv-Command + 1 Schema-Update). |

### V8.8 Technische Risiken

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R-V88-1 | Screenshot-Drift bei UI-Layout-Aenderung | Medium | Re-Capture-Workflow per Playwright (`deliverables/user-guide/screencaps.spec.ts`) ist <30 Min. /post-launch-Check pruefen, ob Pilot-Page noch matched. |
| R-V88-2 | Base UI Dialog-Verhalten bei verschachtelten Modals (Hotspot-Click → 2. Hotspot-Click) | Low | Single-Instance-State (`openHotspotId: string \| null`); neues Klick ersetzt openHotspotId, nur 1 Modal sichtbar. Base UI handelt Backdrop-Replacement nativ. |
| R-V88-3 | useMediaQuery SSR-Hydration-Mismatch | Low-Medium | Standard-Pattern: useSyncExternalStore-basierter useMediaQuery-Hook (analog `feedback_react19_use_mounted_pattern`). Initial-Render = Desktop (>=768px), Client-Hydrate korrigiert bei Mobile. |
| R-V88-4 | dangerouslySetInnerHTML XSS | Low | body_md ist Trusted-Author-Content (Strategaize-Internal). Threat-Model = identisch V8.3 Help, V8.4 Customer-DSE. Akzeptiert. |
| R-V88-5 | Image-File-Size 12 Pages × 300KB = 3.6MB | Low | V1 hat nur 1 Image. Bei Iter 2 (BL-495/496): WebP @ Quality 80 + `loading="lazy"`. CDN-Optionen V2. |
| R-V88-6 | Hotspot Hit-Area zu klein auf Touch | Low | Min-Hit-Area-Empfehlung 5% Breite UND 5% Hoehe = ca. 100×100px bei 2K-Source. Doku als JSON-Author-Guideline. |

### V8.8 Recommended Implementation Direction

**Single-Slice-Approach (Empfehlung):**

| Slice | Scope | Aufwand |
|---|---|---|
| **SLC-881** | zod-Schema + Loader + 2 Client-Components + Page-Modify + Pilot-Screenshot + JSON | ~8-10h |
| (im Slice) | Vitest fuer Schema (Validation + Refine), Vitest fuer Loader (ENOENT + Happy + Drift), Build-Smoke clean | inkl. |
| (im Slice) | Playwright-Screencap fuer `mein-tag.webp` (single-shot via bestehende Pipeline) | inkl. |
| (im Slice) | Live-Smoke `/help/mein-tag` Desktop + Mobile-Viewport-Simulation | inkl. |

**Optional Phase-A/B-Split** (bei Context-Pressure oder fuer Worktree-Parallelitaet):
- **SLC-881a:** Schema + Loader + 2 Components + Vitest — pure Logic, kein Asset
- **SLC-881b:** Page-Modify + Pilot-Screenshot-Capture + JSON + Live-Smoke

Begruendung gegen Phase-Split per Default: Slice ist klein genug fuer 1 Session (~8-10h). Components sind klein (~150 Zeilen pro Component). Phase-Split nur, wenn explizit Worktree-Parallelitaet gewuenscht ist.

### V8.8 Architecture Decisions

- **DEC-240** — V8.8 Hotspot-Storage-Format: JSON-Files unter `cockpit/src/content/help/hotspots/<slug>.json`, zod-validiert, server-pre-rendered (FEAT-881)
- **DEC-241** — V8.8 Hotspot-Asset-Path: V1 Flat `cockpit/public/help/screenshots/<slug>.webp`, Folder-pro-Slug deferred bis Variant-Bedarf (FEAT-881 OQ-1)
- **DEC-242** — V8.8 Modal-Library: Reuse `cockpit/src/components/ui/dialog.tsx` (Base UI), keine neue Library (FEAT-881 OQ-2)
- **DEC-243** — V8.8 Hotspot-Numbering: V1 Border-Highlight + sr-only-Number, Numbered-Badges deferred V2 (FEAT-881 OQ-3)
- **DEC-244** — V8.8 Markdown-Render-Strategie: Server-pre-render via renderLegalMarkdown, keine react-markdown Client-Bundle-Erweiterung (FEAT-881 OQ-4)
- **DEC-245** — V8.8 body_md Length-Constraint: zod `.max(2000)` Safety-Net, Doku-Empfehlung 400-800 Zeichen (FEAT-881 OQ-5)
- **DEC-246** — V8.8 Dark-Mode-Screenshot: V1 Single Light-Image, Schema-Erweiterung erst wenn BS Dark-Mode bekommt (FEAT-881 OQ-6)
- **DEC-247** — V8.8 Image-Resolution + Format: 2x Retina via Playwright deviceScaleFactor=2, WebP Quality 82-85%, DOM-Downscale via w-full (FEAT-881 OQ-7)

### V8.8 Slice-Planning Hint

**1 Slice empfohlen (SLC-881), optional Phase-A/B-Split bei Bedarf.**

Pre-Requirements fuer /slice-planning:
- FEAT-881 V1-Scope bestaetigt (1 Pilot-Page `mein-tag`, F1-F8 IN, BL-495/496/497 OOS)
- 7 OQs alle beantwortet (DEC-240..247)
- Component-Tree + Schema + Folder-Struktur konkret
- Pattern-Reuse-Check abgeschlossen (kein bestehendes Pattern, V8.8 = Canonical-First)

Open fuer /slice-planning (nicht Architecture-Ebene):
- Konkrete Mindest-Anzahl Hotspots fuer Pilot (Empfehlung 3-5, FEAT-881 fordert "min 3")
- Genaue Body-Texte fuer die 3+ Pilot-Hotspots (Content-Authoring)
- Playwright-Capture-Aufruf konkretisieren (welcher Login-State, welche Test-Daten in `mein-tag`-View)
- /qa AC-Liste finalisieren (Desktop + Mobile-Viewport-Switch + Tab-Keyboard-Nav + Long-Body-Scroll)

### V8.8 Delivery Mode

**Internal-Tool, Frontend-Erweiterung.** Keine Schema-Migration. Keine neuen Dependencies. Keine KI-Pfade. Kein Cron. Kein Asset-Service (Assets liegen unter `public/`). 1 Pilot-Screenshot (~300KB). Vitest +2 Test-Files. Internal-Test-Mode bleibt aktiv.

**V8.8-Live heisst:** Master-Merge nach SLC-881 done + Coolify-Redeploy auf `main`. Image-Tag-Bump. Live-Smoke: `/help/mein-tag` HTTP 200 (authenticated), Screenshot rendert, min. 3 Hotspots klickbar, Modal oeffnet mit Title + Body, ESC + Backdrop-Click schliessen, Mobile-Viewport (<768px) zeigt Liste. Andere 11 Slugs (`/help/pipeline` etc.) unveraendert Plain-Markdown-Rendering.

**V8.8 Architecture ready for `/slice-planning`.**

## V8.7-A — KI-Workspace IS-Knowledge-API-RAG-Erweiterung Architecture (Addendum 2026-06-01)

V8.7-A erweitert den bestehenden V6.6 KI-Workspace (`cockpit/src/components/ki-workspace/`) um eine zweite, orthogonale RAG-Quelle: die IS-Knowledge-API (live seit IS REL-016 + REL-017 2026-06-01). Read-only Konsument. Kein Push, kein Cron, kein Anwalt-Gate. Push-Pfad ist V8.7-B (SLC-355, deferred). Architektur-Addendum statt Voll-Rewrite per Addendum-Section-Pattern (ARCHITECTURE.md = 11.734 Zeilen).

### Architecture Summary

```
User-Frage im Deal-Detail-Workspace
        |
        v
KIWorkspace.tsx (Client-Component, V6.6)
        |  (Free-Question-Pfad oder risiken-einwaende-Report)
        v
Server-Action / Report-Runner (Server-Side)
        |  +-- BS-eigene RAG (existing /api/knowledge/query)
        |  +-- NEU: isKnowledgeClient.searchKnowledge(q)
        |              |
        |              v
        |       cockpit/src/lib/is-knowledge/client.ts
        |              |  (PII-Redact -> fetch IS -> audit_log)
        |              v
        |       https://is.strategaizetransition.com/api/knowledge/search
        |              |  Headers: x-strategaize-service-key + x-strategaize-consumer
        |              v
        |       IS V3.5 Knowledge-API (DEC-085..090)
        |
        v
AnswerPane.tsx Render mit IS-Treffer-Block "Aus Strategaize-Wissens-Basis"
        |
        v
audit_log Event `is_knowledge_queried` mit Cost + Workspace-Page
```

### V8.7-A Hauptkomponenten

#### 1. IS-Knowledge-API-Konsumenten-Adapter (`cockpit/src/lib/is-knowledge/client.ts`)

Server-Side-only Module. Mirror der IS-Auth-Header-Mechanik. Pure-funktionale Public-API:

```typescript
export async function searchKnowledge(
  q: string,
  opts?: { domain?: "sales" | "onboarding" | "general"; limit?: number; signal?: AbortSignal }
): Promise<IsKnowledgeSearchResult>;

export async function getKnowledgeItem(
  id: string,
  opts?: { signal?: AbortSignal }
): Promise<IsKnowledgeItem>;
```

Verhalten:
- `q` wird transparent durch `redactPiiFromQ(q)` (Email + Phone-Pattern -> `[email]`/`[phone]`) — DEC-250
- Auth-Header: `x-strategaize-service-key: <env>`, `x-strategaize-consumer: business-system`
- Timeout 4s (Default), Abortable via `AbortSignal`
- Error-Klasse `IsKnowledgeError` mit `{ kind: "auth"|"rate_limit"|"timeout"|"server"|"network", retryAfterSeconds?: number, status?: number }`
- Bei 401/429/500/timeout/network -> wirft `IsKnowledgeError`; Caller entscheidet Graceful-Degradation (DEC-256)
- Schreibt audit_log via existierender `cockpit/src/lib/audit.ts` (Erweiterung um Action + EntityType in V8.7-A noetig — siehe DEC-258)

#### 2. Free-Question-Integration (KIWorkspace.tsx)

Free-Question-Pfad (existing constant `FREE_QUESTION_REPORT_ID = "freie-frage"`) bekommt ein zusaetzliches Server-Action-Wrapping:

- Existing: Free-Question -> Bedrock-Call mit BS-lokalem RAG-Context
- V8.7-A: Free-Question -> parallel Bedrock-Call MIT IS-Search-Hits als zusaetzlichem Context-Block. Wenn IS-Aufruf fehlschlaegt (IsKnowledgeError): Bedrock-Call laeuft trotzdem mit BS-only-Context + AnswerPane zeigt "Strategaize-Wissens-Basis aktuell nicht erreichbar".

#### 3. risiken-einwaende-Report-Integration (`cockpit/src/lib/ki-workspace/reports/risiken.ts`)

Bestehender Report bekommt IS-Knowledge-Hits als zweiten Context. Begruendung: dieser Report behandelt explizit Einwand-Behandlungen — genau die Domain wo Strategaize-Foundation-Wissen (Pitches, Einwand-Pattern) Mehrwert liefert. Andere Reports (briefing, signale, naechster-schritt, winloss) bekommen V8.7-A KEINE IS-Integration — DEC-248.

#### 4. AnswerPane-Erweiterung (`cockpit/src/components/ki-workspace/AnswerPane.tsx`)

Neue optionale Section unter der Haupt-Antwort:

```
+- Antwort (Bedrock-Output) -----------------------+
| ...                                              |
+--------------------------------------------------+
+- Aus Strategaize-Wissens-Basis -------------- NEU V8.7-A
| - Pattern "Einwand 'zu teuer' bei StB"  (95%)   |
| - Pattern "Pitch fuer DSB"              (87%)   |
| - Pattern "Branchen-Anker Kanzlei"      (72%)   |
+--------------------------------------------------+
Diese Antwort nutzt Strategaize-Wissen + Mandanten-Daten   <- Footer-Hinweis
```

DEC-255 — Block-Rendering mit Item-Titel + Similarity-Score (als Prozent) + Footer-Hinweis fuer Transparenz.

#### 5. Cost-Cap pro Workspace-Session (sessionStorage)

Client-Side-Counter in KIWorkspace.tsx via `sessionStorage["isKnowledgeCallCount"]`. Per Workspace-Session max 20 IS-Calls. Bei Ueberschreiten:

- IS-Calls werden uebersprungen
- UI-Hinweis "Strategaize-Wissens-Quote fuer diese Session aufgebraucht (20/20). Frage trotzdem stellen — Antwort basiert nur auf Mandanten-Daten."
- Free-Question + Report-Runs laufen weiter, nur IS-Hits ausgeblendet

DEC-252.

### Data Model / Storage

**V8.7-A hat 0 Schema-Migrationen.** Keine neue Tabelle, keine ALTER, keine Indexe. Audit-Log nutzt existierende `audit_log`-Tabelle aus V6.4 — nur Schema-konformer neuer Event-Type.

audit_log Event-Schema fuer `is_knowledge_queried` (DEC-258):

```
event_type:    'is_knowledge_queried'
entity_type:   'is_knowledge_api'    -- konzeptuell, kein DB-FK
entity_id:     <workspace-session-uuid>  -- generiert pro Workspace-Mount
changes_after: {
  workspace_page: 'deal-detail' | 'mein-tag' | 'cockpit' | 'team-cockpit',
  consumer:       'business-system',
  query_excerpt:  <PII-redacted q, max 200 chars>,
  cost_usd:       <IS-returned query_embedding_cost_usd>,
  item_count:     <number of hits returned>,
  similarity_top: <highest similarity in result set>,
  is_response_ms: <IS-returned total_ms>,
}
```

### Data Flow

#### Free-Question-Pfad (V8.7-A enriched)

1. User tippt Frage in `KIWorkspace.tsx` Frage-Input und klickt Send
2. KIWorkspace ruft Server-Action `runFreeQuestion(question, scope)` (existing, wird erweitert)
3. Server-Action parallelisiert:
   - Promise 1: BS-lokale RAG (`loadDealContext` + `queryKnowledge` per V8.9 IDOR-Pattern)
   - Promise 2: `isKnowledgeClient.searchKnowledge(question, { domain: "sales", limit: 5 })` (V8.7-A neu)
4. Server-Action wartet auf beide (Promise.allSettled — Graceful-Degradation auf IS-Failure)
5. Server-Action ruft Bedrock mit kombiniertem Context: BS-Hits (max 10) + IS-Hits (max 5)
6. Server-Action returnt `{ answer, isKnowledgeHits: [], isError: null | string }`
7. KIWorkspace cached Result (existing `setCached`), AnswerPane rendert Hits-Block

#### risiken-einwaende-Report-Pfad (V8.7-A enriched)

Analoge Erweiterung in `risiken.ts`. Der Report-Runner ruft die Free-Question-Logik intern auf, just mit fixem `report.id="risiken-einwaende"`.

### External Dependencies

**Neu in V8.7-A:** Eine externe HTTP-Abhaengigkeit — die IS-Knowledge-API auf `https://is.strategaizetransition.com`.

- Health-Implikationen: BS bleibt funktional bei IS-Downtime (Graceful-Degradation, DEC-256)
- Rate-Limit: 100/min Consumer-wide (von IS gesetzt), BS-seitiger Soft-Cap 20/Session (DEC-252)
- Cost-Impact: pro Search ~$0.0001 Titan-Embedding-Cost (IS-getragen, in audit_log gespiegelt)

**Keine neuen npm-Packages.** Standard `fetch` reicht. Existing zod-Schemas fuer Response-Validation.

### Security / Privacy Considerations

#### Service-Key-Schutz

`STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` ist Server-Side-only. ENV-Naming **ohne `NEXT_PUBLIC_`-Prefix** (DEC-253). Client-Component referenziert den Key NIE — alle Aufrufe gehen ueber Server-Actions oder API-Routes. Verifikation in `/qa`:

- Build-Time-Check: `grep "STRATEGAIZE_KNOWLEDGE_SERVICE_KEY" .next/static/` muss leer sein
- Code-Audit: Adapter darf nicht in einem File mit `"use client"`-Direktive referenziert werden

#### PII-Schutz

q-Param wird transparent gefiltert (DEC-250). Pattern:

- Email `\S+@\S+\.\S+` -> `[email]`
- Phone `\+?\d{6,}` -> `[phone]`

Eigennamen (Mandanten) werden in V8.7-A **NICHT** redacted — komplexer NER-Aufwand. UI-Hinweis im Workspace-Footer macht User-Awareness sichtbar ("Diese Frage wird teilweise an Strategaize-Wissens-Basis weitergeleitet"). V8.7.1-Polish koennte NER-Redact ergaenzen.

#### audit_log Coverage

Jeder IS-Call wird mit cost + redacted query_excerpt geloggt (DEC-258). Fuer DSGVO-Compliance + Cost-Tracking.

#### Cross-Repo-Auth-Mechanik

Service-Key-Rotation:
- Schritt 1: neuen Key generieren via `openssl rand -hex 32`
- Schritt 2: IS-Coolify-ENV updaten + Redeploy
- Schritt 3: BS-Coolify-ENV updaten + Redeploy (Window kurz halten — IS akzeptiert nur 1 Key)
- Doku in `qa/SLC-871-coolify-env-setup.md` analog `qa/SLC-352-coolify-env-setup.md` aus IS

### Constraints and Tradeoffs

**Constraints:**
- IS V3.5 muss online bleiben — bei IS-Down ist V8.7-A-Block leer + Footer-Hinweis (kein Hard-Fail)
- Rate-Limit 100/min Consumer-wide ist hart gesetzt durch IS. BS-Soft-Cap 20/Workspace-Session entlastet das, aber 5+ parallele Workspace-Sessions koennen den Limit erreichen
- Service-Key-Sync zwischen IS+BS-Coolify-ENV erforderlich

**Tradeoffs:**
- **Pro-Report-Integration vs zentrales IS-Context-Layer**: V8.7-A waehlt nur Free-Question + risiken-einwaende (DEC-248) statt aller 5 Reports — kleinerer Touch, schnellere Iteration, V8.7.1 kann nachziehen wenn nuetzlich
- **Workspace-Scope Deal-Detail only (DEC-249) vs alle 4 Workspaces**: kleinerer Scope, Deal-Detail ist Wissens-relevantester Workspace. Mein Tag + Cockpit + Team koennen V8.7.1
- **Kein Caching (DEC-254) vs Result-Cache**: Cost vernachlaessigbar ($0.0001), Cache-Invalidation komplex. V8.7-A bleibt lean
- **Soft-Cap 20/Session vs Hard-Cap**: Soft erlaubt User Frage-Flow weiterzufuehren mit klarem Hinweis, Hard waere harter Block. V8.7-A waehlt Soft fuer UX

### Recommended Implementation Direction

`/slice-planning V8.7-A` -> SLC-871 mit ~7-8 Micro-Tasks:

- **MT-1** Adapter `cockpit/src/lib/is-knowledge/client.ts` + Types + zod-Response-Validation + Vitest (8-10 Tests)
- **MT-2** PII-Redact-Funktion `redactPiiFromQ()` + Vitest (4-6 Tests)
- **MT-3** Audit-Log-Erweiterung in `cockpit/src/lib/audit.ts` (neuer AuditAction + EntityType) + Vitest (DEC-258)
- **MT-4** Server-Action-Wrapping fuer Free-Question + risiken-Report (DEC-248) + Vitest
- **MT-5** AnswerPane-Erweiterung Hits-Block-Rendering + Footer-Hinweis (DEC-255)
- **MT-6** Soft-Cap-Counter in KIWorkspace.tsx via sessionStorage (DEC-252)
- **MT-7** ENV-Setup-Doku `qa/SLC-871-coolify-env-setup.md` + Live-Smoke-Spec `qa/SLC-871-live-smoke.md`
- Optional **MT-8** Build-Time-Service-Key-Leak-Check (grep-Test als Vitest-Smoke)

**V8.7-A Architecture ready for `/slice-planning V8.7-A`.**

## V8.11 — RLS-Sweep der 41 Zweittabellen Architecture (Addendum 2026-06-04)

V8.11 schliesst den V7-RLS-Switch (MIG-035) ab, indem alle verbleibenden Tabellen mit `*_full_access`-Policies auf Owner-/Team-aware RLS umgestellt werden. Pre-Live-Pflicht-Hardening vor Multi-User-Onboarding. Architektur-Addendum statt Voll-Rewrite per Addendum-Section-Pattern.

### Architecture Summary

```
authenticated User -> Postgres
        |
        +-- V7-RLS-getragene Tabellen (8 Kerntabellen + profiles + teams)
        |   (companies/contacts/deals/activities/meetings/proposals/email_messages/calls)
        |   Policies: owner-aware (can_see_owner / is_admin / is_teamlead)
        |
        +-- V8.11-RLS-getragene Tabellen (41 Zweittabellen) -- NEU
        |   |
        |   +-- Klasse A: per-User-Stammdaten (4 Tabellen, user_id-Spalte)
        |   |   user_settings, kpi_snapshots, goals, activity_kpi_targets
        |   |   Policy: user_id = auth.uid() + is_admin()-SELECT-Bypass
        |   |
        |   +-- Klasse B: Team-Templates (11 Tabellen, kein owner)
        |   |   branding_settings, email_templates, payment_terms_templates, etc.
        |   |   Policy: SELECT all authenticated, INSERT/UPDATE/DELETE Admin
        |   |
        |   +-- Klasse C: Parent-FK-JOIN (24 Tabellen, JOIN auf V7-Parent)
        |   |   tasks, signals, calendar_events, email_attachments, ...,
        |   |   campaigns, campaign_links, automation_runs, deal_products, ...
        |   |   Policy: EXISTS-Subquery auf Parent-Tabelle mit can_see_owner()
        |   |
        |   +-- Klasse D: Schema-Erweiterung + Backfill (1 Tabelle: knowledge_chunks)
        |   |   ALTER ADD COLUMN owner_user_id + team_id, Backfill via source_type/source_id JOIN
        |   |   Policy: owner_user_id = auth.uid() + can_see_owner()
        |   |
        |   +-- Klasse E: Audit-Spezial (1 Tabelle: audit_log)
        |       Policy: SELECT (is_admin() OR actor_id = auth.uid()),
        |                INSERT/UPDATE/DELETE service_role only
        |
        +-- service_role (Cron + Worker, BYPASSRLS=true)
            schreibt cross-tenant, MUSS owner_user_id korrekt aus Parent setzen
            (Cron-Code-Audit pro Sub-Slice Pflicht)
```

### V8.11 Hauptkomponenten

#### Klasse A — Per-User-Stammdaten (4 Tabellen)

Tabellen mit eigener `user_id`-Spalte:
- `user_settings` (user_id NOT NULL)
- `kpi_snapshots` (user_id)
- `goals` (user_id)
- `activity_kpi_targets` (user_id)

Policy-Template (`<table>` = einer der 4):

```sql
CREATE POLICY <table>_select ON <table>
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY <table>_insert ON <table>
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY <table>_update ON <table>
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY <table>_delete ON <table>
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());
```

Begruendung: Per-User-Stammdaten sind privat — Admin sieht alle fuer Support-Cases, andere User sehen 0 Rows. Kein Teamlead-Pfad (eigene Settings sind privat, Team-Aggregate laufen ueber Cron + service_role).

#### Klasse B — Team-Templates (11 Tabellen)

Tabellen ohne Owner-Spalte, semantisch Team-shared:
- `branding_settings`, `email_templates`, `payment_terms_templates`, `compliance_templates`, `vat_id_validations`
- `pipelines`, `pipeline_stages`, `products`
- `automation_rules`, `cadences`, `cadence_steps`

Policy-Template:

```sql
CREATE POLICY <table>_select ON <table>
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY <table>_insert ON <table>
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY <table>_update ON <table>
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY <table>_delete ON <table>
  FOR DELETE TO authenticated
  USING (is_admin());
```

Begruendung: Konfiguration ist allen Team-Usern sichtbar (alle Member nutzen die gleichen Templates/Pipelines/Products), aber nur Admin darf aendern. Im Single-Team-Internal-Mode aequivalent zu V1, in Multi-Tenant-V9 wird `team_id`-Spalte plus `team_id = get_my_team_id()`-Filter ergaenzt — V8.11-Pattern bleibt forward-compatible.

#### Klasse C — Parent-FK-JOIN (24 Tabellen)

Tabellen mit FK auf eine V7-RLS-getragene Parent-Tabelle (deals/contacts/companies/meetings/email_messages/proposals/activities). Policy-Template via EXISTS-Subquery:

```sql
-- Beispiel: tasks JOIN auf deals
CREATE POLICY tasks_select ON tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = tasks.deal_id
        AND can_see_owner(d.owner_user_id)
    )
    OR (tasks.deal_id IS NULL AND created_by = auth.uid())
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = tasks.deal_id
        AND can_see_owner(d.owner_user_id)
    )
    OR (tasks.deal_id IS NULL AND created_by = auth.uid())
  );

-- UPDATE + DELETE analog
```

**Multi-Parent-Tabellen** (z.B. `signals` mit deal_id + contact_id + company_id + activity_id): Policy ist OR-Verkettung der EXISTS-Subqueries. NULL-Parent erlaubt nur eigene `created_by`-Rows.

**Spezialfall `emails`**: hat bereits `owner_user_id`-Spalte → V7-Pattern direkt anwendbar wie auf den 8 V7-Kerntabellen. Wird in SLC-903 gebuendelt aus Cohaesion (Outbound-Mail-Kontext).

**Tabellen ohne Parent-FK** (Live-DB-Befund 2026-06-04): `email_tracking_events`, `campaign_link_clicks`, `automation_runs`, `cadence_enrollments`, `fit_assessments`, `pipelines` (wait, pipelines ist Klasse B). Pro Tabelle in /slice-planning entscheiden:
- Via `email_message_id` / `campaign_link_id` / `rule_id` / `cadence_id` / `deal_id` (mittelbarer FK ueber Junction)
- Falls kein FK existiert: Schema-ALTER mit `created_by`-FK plus Backfill (analog knowledge_chunks)
- Audit-/Tracking-Only-Tabellen (z.B. `email_tracking_events`): SELECT moeglicherweise Admin-only, INSERT service_role-only

#### Klasse D — Schema-Erweiterung + Backfill (1 Tabelle: knowledge_chunks)

knowledge_chunks hat aktuell nur `source_type` + `source_id` (kein Owner). Q-V8.11-C entschieden: Schema-Erweiterung um `owner_user_id` + `team_id` Spalten mit Backfill aus Parent.

DDL:

```sql
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS team_id        UUID REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_owner ON knowledge_chunks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_team  ON knowledge_chunks(team_id);
```

Backfill-Strategy (DEC-267, SYNC innerhalb Migration):

```sql
-- meeting-source
UPDATE knowledge_chunks kc
   SET owner_user_id = m.owner_user_id,
       team_id       = p.team_id
  FROM meetings m
  JOIN profiles p ON p.id = m.owner_user_id
 WHERE kc.source_type = 'meeting'
   AND kc.source_id  = m.id
   AND kc.owner_user_id IS NULL;

-- email_message-source, activity-source, document-source: analog
-- document-source: JOIN ueber documents-Tabelle (Klasse C, hat deal_id-FK)
```

Policy (post-Backfill):

```sql
CREATE POLICY knowledge_chunks_select ON knowledge_chunks
  FOR SELECT TO authenticated
  USING (can_see_owner(owner_user_id));
-- INSERT/UPDATE/DELETE: service_role-only (Embedding-Sync-Cron)
```

**Cron-Anpassung Pflicht-MT:** `cockpit/src/app/api/cron/embedding-sync/route.ts` muss bei chunk-INSERT die owner_user_id+team_id aus Parent-Source ableiten. Audit-Check als DoD pro Sub-Slice (Q-V8.11-D).

**Sonderfall `search_knowledge_chunks` Function** (SEC-007): Function ist SECURITY DEFINER und umgeht knowledge_chunks-RLS strukturell. V8.11 muss Function-Body um `WHERE can_see_owner(owner_user_id)`-Filter erweitern, sonst greift RLS in V8.11 nur fuer direkte SELECT-Queries, NICHT ueber die RPC. Wird in SLC-905 gebuendelt mit knowledge_chunks-Migration.

#### Klasse E — Audit-Spezial (1 Tabelle: audit_log)

Q-V8.11-A entschieden: Admin-all + Actor-own-Rows (DSGVO-Art-15-Self-Service).

```sql
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT TO authenticated
  USING (is_admin() OR actor_id = auth.uid());

-- INSERT/UPDATE/DELETE: service_role-only
-- Begruendung: User darf NIE eigene Audit-Eintraege manipulieren
-- (Compliance / Forensik). Cron + Server-Actions schreiben via createAdminClient().
```

**Code-Audit:** Alle `cockpit/src/lib/audit.ts`-Caller pruefen — keine `auth.uid()`-Client-Pfade duerfen direkt audit_log INSERTen. Server-Actions wechseln auf `createAdminClient()` falls noch nicht.

### Helper-Functions (Wiederverwendung V7 MIG-035)

Keine neuen Helper-Functions. V8.11 nutzt 1:1:
- `is_admin()` — SECURITY DEFINER, profiles.role = 'admin'
- `is_teamlead()` — analog
- `get_my_team_id()` — analog
- `can_see_owner(target_owner UUID)` — admin OR self OR teamlead-in-same-team

A-V8.11-1 verifiziert: alle 4 Helper sind in Live-DB aktiv (V7+V8.x-Burn-Ins). Re-Verifikation pro Sub-Slice nicht noetig — Trigger im Migration-Apply ueber `RAISE EXCEPTION IF v_helper_count <> 4`.

### Sec-Audit-Helper-Function (Done-Gate)

Neue persistente Helper-Function fuer Done-Gate (Q-V8.11-B 100% Coverage):

```sql
CREATE OR REPLACE FUNCTION list_tables_with_authenticated_full_access()
  RETURNS TABLE(schemaname TEXT, tablename TEXT, policyname TEXT)
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT schemaname, tablename, policyname
    FROM pg_policies
   WHERE schemaname = 'public'
     AND (policyname = 'authenticated_full_access'
          OR policyname LIKE '%_full_access');
$$;

GRANT EXECUTE ON FUNCTION list_tables_with_authenticated_full_access() TO authenticated;
```

Done-Gate-Check pro Sub-Slice: `SELECT COUNT(*) FROM list_tables_with_authenticated_full_access()` muss strikt monoton fallen (Klasse-A 41 -> 37, Klasse-B 37 -> 26, etc.). Bei V8.11-Abschluss 0 Rows.

### Data Model / Storage

**Schema-Migrations:**

| Slice | Migration | Scope | Idempotent | Destructive |
|-------|-----------|-------|------------|-------------|
| SLC-901 | MIG-045 | Klasse A: 4 Tabellen × 4 Policies | ja | nein |
| SLC-902 | MIG-046 | Klasse B: 11 Tabellen × 4 Policies + Sec-Audit-Helper | ja | nein |
| SLC-903 | MIG-047 | Klasse C: 24 Tabellen × 4 Policies (inkl. emails V7-Pattern) | ja | nein |
| SLC-904 | MIG-048 | Klasse E: audit_log × 4 Policies | ja | nein |
| SLC-905 | MIG-049 | Klasse D: knowledge_chunks ALTER + Backfill + Policies + search_knowledge_chunks Function-Erweiterung | ja | **ja** (Schema-ALTER) |

**Migration-Pattern:** Alle Migrations folgen `sql-migration-hetzner.md` (SSH+base64+psql als postgres-Superuser, idempotent, Rollback-Notes). DO-Block iteriert ueber Tabellen-Array fuer Klasse-A/B/C wie MIG-035 (BEPS Loop-Pattern).

**Rollback-Notes Template pro Migration:**
1. `DROP POLICY <table>_select|insert|update|delete ON <table>` (alle neuen Policies)
2. `CREATE POLICY authenticated_full_access ON <table> FOR ALL TO authenticated USING (true)` (alte V1-Policy wieder herstellen)
3. Fuer MIG-049 (knowledge_chunks ALTER): `ALTER TABLE knowledge_chunks DROP COLUMN owner_user_id, DROP COLUMN team_id` (nach Down-Backfill der Test-Daten)

### Data Flow / Request Flow

**Read-Pfad (User-Session) — Beispiel `SELECT * FROM tasks WHERE deal_id = $1`:**

1. Browser → Server-Action (Next.js)
2. Server-Action → `createServerClient(cookie-Session)` → `supabase.from('tasks').select()`
3. PostgREST → Postgres mit JWT-Claim `auth.uid()`
4. Postgres evaluiert `tasks_select`-Policy:
   - EXISTS-Subquery auf `deals` mit `can_see_owner(d.owner_user_id)`
   - can_see_owner ruft is_admin / is_teamlead / get_my_team_id (3 cached STABLE-Functions)
5. RLS filtert Rows → 0..N Rows zurueck (kein Error)

**Write-Pfad (Cron-Worker) — Beispiel embedding-sync-cron:**

1. Coolify-Scheduled-Task POST /api/cron/embedding-sync
2. Verify-Cron-Secret (timing-safe) → service_role-Client
3. service_role bypassed RLS (BYPASSRLS=true)
4. Worker iteriert ueber `meetings WHERE NOT EXISTS knowledge_chunks` (cross-tenant)
5. Pro neuer chunk: INSERT mit `owner_user_id = meeting.owner_user_id, team_id = profiles(owner_user_id).team_id` **(Pflicht-Audit)**
6. Wenn owner_user_id NULL gesetzt wuerde: chunk waere unsichtbar fuer User, sichtbar nur fuer Admin (`can_see_owner(NULL)` = `is_admin() OR NULL = auth.uid() OR teamlead-check` = `is_admin()` if NULL)

### Performance-Strategy

**EXPLAIN ANALYZE Hard-Threshold (DEC-266):** Pro Sub-Slice 5 typische Queries aus Production-Code messen. Hard-Threshold: **max(100ms, 10x Pre-V8.11-Baseline)**. Wenn beide verletzt:

1. Index-Audit: Parent-FK-Spalte indexiert? (z.B. `tasks(deal_id)`, `signals(deal_id)`, `email_attachments(email_message_id)`)
2. Helper-Function-Cost: `can_see_owner()` evaluiert mit JIT (STABLE-Cache pro Statement) — bei N+1-Pattern in Anwendung Indexe + Query-Plan checken
3. Bei JOIN-Tabellen ohne Parent-FK-Index: Migration ergaenzt CREATE INDEX

**Queries-Set pro Sub-Slice (slice-planning verbessert):**
- SLC-901: `SELECT * FROM user_settings WHERE user_id = $1` (~ms erwartet)
- SLC-902: `SELECT * FROM email_templates WHERE category = $1` (~10ms erwartet)
- SLC-903: `SELECT * FROM tasks WHERE deal_id = $1` (Index-Pfad)
- SLC-904: `SELECT * FROM audit_log WHERE actor_id = auth.uid() ORDER BY created_at DESC LIMIT 50` (Index auf actor_id+created_at)
- SLC-905: `SELECT * FROM knowledge_chunks ORDER BY embedding <=> $1 LIMIT 10` (HNSW + Owner-Filter)

### Cron + Service-Role-Architektur

**DEC-269** dokumentiert formell: Background-Cron + Worker schreiben weiter via `createAdminClient()` mit `SUPABASE_SERVICE_ROLE_KEY`. RLS-Bypass ist designed-in, NICHT Bug. Begruendung:
- Cron hat kein User-Session (kein auth.uid())
- Cron iteriert cross-tenant (signal-extract, embedding-sync, automation-runner)
- RLS wuerde Cron unbenutzbar machen

**Constraint (Pflicht-MT pro Sub-Slice):** Cron-Code-Audit per `grep -rn "createAdminClient" cockpit/src/app/api/cron/` und Worker-Pfaden. Pro Treffer pruefen:
- Wird in eine V8.11-migrierte Tabelle INSERTed?
- Wird owner_user_id (oder relevante Owner-Spalte) korrekt aus Parent-Row gesetzt?
- Bei knowledge_chunks: wird owner_user_id+team_id aus source_type/source_id-Parent abgeleitet?

Audit-Liste (Stand 2026-06-04):
- `/api/cron/embedding-sync` → knowledge_chunks (SLC-905)
- `/api/cron/expire-proposals` → proposals (V7-already-owner-aware, kein Audit noetig)
- `/api/cron/automation-runner` → ai_action_queue, automation_runs (SLC-903)
- `/api/cron/signal-extract` → signals (SLC-903)
- `/api/cron/click-log-cleanup` → email_tracking_events, campaign_link_clicks (SLC-903)
- `/api/cron/cadence-execute` → cadence_executions, cadence_enrollments (SLC-903)
- `/api/cron/meeting-reminders`, `/api/cron/meeting-briefing`, `/api/cron/recording-poll`, `/api/cron/classify` → vermutlich nur V7-Tabellen, aber Audit-Check Pflicht
- `cockpit/src/lib/audit.ts` Helper → audit_log (SLC-904)

### External Dependencies

**Keine neuen externen Dependencies.** V8.11 ist eine reine Postgres-RLS-Migration. Keine npm-Pakete, keine externen APIs.

**Test-Sidecar:** Vitest gegen Coolify-DB ueber node:22 im `business-net` (Pattern `coolify-test-setup.md`). SAVEPOINT-Pattern fuer expected RLS-Rejections. TEST_DATABASE_URL via ENV. Wiederverwendung 1:1 aus V7-Pattern `cockpit/__tests__/rls/v7-rls-matrix.test.ts` (96 Tests bereits live).

### Security / Privacy Considerations

**Cross-Tenant-Read-Vermeidung** ist der Kern-Schutz. Klasse A/C/E sind hart, Klasse B (Templates) ist SELECT-all bewusst (Konfiguration ist Team-shared). Sobald Multi-Tenant-V9 kommt: Klasse B bekommt zusaetzlich `team_id`-Filter.

**Helper-Functions sind SECURITY DEFINER mit `SET search_path = public`** (V7-Pattern, V8.11 erbt). search_path-Hijack-Risk ist mitigiert.

**Sec-Audit-Helper-Function `list_tables_with_authenticated_full_access()`** ist persistent in der DB (nicht nur in der Migration). Erlaubt Burn-In-Monitoring und faengt zukuenftige Tabellen-Drifts ab (R-V8.11-2). Sollte in `/post-launch` T+24h Full-Check als 1-Sekunden-Query mitgenommen werden.

**Service-Role-Bypass bleibt bestehen** (DEC-269), wird aber durch Cron-Code-Audit pro Sub-Slice qualitaetsgesichert. Audit-Trail in audit_log mit `actor_id = NULL` markiert Cron-Schreiber.

### Constraints / Tradeoffs

**Pro 4-Klassen-Pattern statt einer Mega-Migration:**
- Pro: Pattern-Etablierung im kleinsten Slice (SLC-901, 4 Tabellen) erlaubt Lehren-Sammeln bevor groesste Slice (SLC-903, 24 Tabellen) startet
- Pro: Pro Klasse eigene Test-File → einfacher reviewable, pro-Slice-PR moeglich
- Pro: Risiko-Isolation — bei Performance-Drop in einer Klasse muss nur diese Slice rolled-back werden
- Contra: 5 Migrations + 5 Test-Files statt 1+1
- Contra: 5 Sub-Slices statt 4 vergroessern den V8.11-Workflow um ~3-5h Overhead (Reports, Records-Updates pro Slice)

**Pro Sub-Slice-Reihenfolge 901 → 902 → 903 → 904 → 905 (DEC-265):**
- Pro: Steigende Komplexitaet — einfaches user_id-Pattern zuerst, knowledge_chunks Schema-ALTER zuletzt
- Pro: SLC-901 etabliert Test-Pattern (1 Test-File mit 4 Tabellen × 3 Rollen × 4 Ops = 48 Tests), SLC-902/903 erweitern
- Pro: knowledge_chunks Backfill profitiert von eingespielter Pipeline (4 Slices erfolgreich vorher gesehen)
- Contra: Dominanter Aufwand (SLC-903, 24 Tabellen) erst spaet — wenn etwas an SLC-903 schiefgeht, sind 901+902 schon released und der Rest haengt

**Pro Sync-Backfill knowledge_chunks (DEC-267):**
- Pro: Atomar, kein halb-migrated-Window
- Pro: Aktueller Stand <10k chunks → Sekundenbereich
- Pro: Einfacher zu beweisen GREEN (1 Migration, ein Apply)
- Contra: Migration-Apply-Dauer hoeher (aber im Sekundenbereich akzeptabel)
- Contra: Bei spaeterem >100k Volumen: V9-Hotfix-Pflicht zu Async-Backfill

**Pro Test-Pattern V7-Wiederverwendung (DEC-268):**
- Pro: Einheitliche Test-Helper-Funktion (Session-Setup, JWT-Claim, SAVEPOINT)
- Pro: Bestehendes node:22-Sidecar-Setup laeuft sofort
- Contra: Bei massiver Klasse-C-Drift (24 Tabellen) wird die Test-File >1000 Zeilen — Sub-Slice-Split der Test-Files innerhalb SLC-903 moeglich

### Open Technical Questions

**Alle 4 architecture-OQs in /architecture-Session 2026-06-04 entschieden:**
- OQ-V8.11-arch-1 → DEC-265 (SLC-901 → 902 → 903 → 904 → 905)
- OQ-V8.11-arch-2 → DEC-266 (EXPLAIN max(100ms, 10x Baseline))
- OQ-V8.11-arch-3 → DEC-267 (Sync-Backfill knowledge_chunks)
- OQ-V8.11-arch-4 → DEC-268 (V7-Test-Pattern wiederverwenden + neue Test-Files pro Sub-Slice)

**Neu eingefuehrt in /architecture:**

- **OQ-V8.11-arch-5 (Carry-Over zu /slice-planning):** Tabellen ohne klaren Parent-FK (`email_tracking_events`, `campaign_link_clicks`, `automation_runs`, `cadence_enrollments`, `fit_assessments`) — pro Tabelle in /slice-planning entscheiden: (a) mittelbarer FK ueber Junction-Lookup, (b) Schema-ALTER mit `created_by`-FK, (c) Admin-only SELECT + service_role-only Mutate. Default-Empfehlung: (c) fuer Tracking/Logging-Tabellen, (a) fuer Workflow-Tabellen.
- **OQ-V8.11-arch-6 (Carry-Over zu /slice-planning):** `documents`-PUBLIC-Tabelle (nicht der Storage-Bucket!) hat contact_id+company_id+deal_id+created_by — Klasse C straight-forward, aber Konflikt mit Storage-Bucket-Policy aus V8.10/SLC-893 zu vermeiden. Beide nutzen `documents`-Namespace — Policy-Naming-Praefix `documents_table_*` vs `documents_storage_*` empfohlen.

### Recommended Implementation Direction

`/slice-planning V8.11` -> SLC-901..905 mit folgender Sub-Slice-Spec:

**SLC-901 (Klasse A, ~3-4h):**
- MT-1 MIG-045 (4 Tabellen × 4 Policies, idempotent, DO-Loop-Pattern)
- MT-2 Vitest `v8-11-slc-901-rls-matrix.test.ts` (4 Tabellen × 3 Rollen × 4 Ops = 48 Tests)
- MT-3 Cron-Code-Audit Klasse-A-betreffende Worker (kpi-snapshots-Aggregator, etc.)
- MT-4 EXPLAIN ANALYZE 5 Queries → Doc in `qa/SLC-901-perf-baseline.md`
- MT-5 Sec-Audit-Helper-Function deploy (im Migration-Body) + Done-Gate-Check
- MT-6 Records-Sync + Live-Smoke (Vitest gegen Coolify-DB + 2-3 Browser-Smoke-Pfade)

**SLC-902 (Klasse B, ~5-6h):**
- MT-1 MIG-046 (11 Tabellen × 4 Policies, idempotent)
- MT-2 Vitest `v8-11-slc-902-rls-matrix.test.ts` (Admin-mutate + Member-read-Pattern, ~88 Tests)
- MT-3 Cron-Code-Audit (template-using Cron-Endpoints)
- MT-4 EXPLAIN ANALYZE 5 Queries
- MT-5 Done-Gate-Check (41-4-11 = 26 verbleibend)
- MT-6 Records-Sync + Live-Smoke

**SLC-903 (Klasse C, ~10-13h):**
- MT-1..3 MIG-047 in 3 atomaren Migration-Schritten:
  - MT-1: 8 Tabellen mit klarem deal_id-FK
  - MT-2: 8 Tabellen mit contact_id/company_id-FK
  - MT-3: 8 Tabellen mit anderen FKs (meeting_id, email_message_id, proposal_id, activity_id, campaign_id, cadence_id, plus emails V7-Pattern direkt)
- MT-4 Vitest pro Migration-Block (3 Test-Files, ~96+96+96 Tests)
- MT-5 Cron-Code-Audit (signal-extract, automation-runner, cadence-execute, click-log-cleanup)
- MT-6 EXPLAIN ANALYZE 5 Queries pro Block
- MT-7 OQ-arch-5 Tabellen-Entscheidung (kein-Parent-FK-Tabellen pro Tabelle)
- MT-8 Done-Gate-Check (26-24 = 2 verbleibend)
- MT-9 Records-Sync + Live-Smoke

**SLC-904 (Klasse E, ~2-3h):**
- MT-1 MIG-048 (audit_log × 4 Policies inkl. service_role-only mutate)
- MT-2 Vitest `v8-11-slc-904-rls-matrix.test.ts` (3 Rollen × 4 Ops + Actor-own-Cases = ~18 Tests)
- MT-3 Code-Audit `cockpit/src/lib/audit.ts` Caller (alle Pfade nutzen createAdminClient?)
- MT-4 EXPLAIN ANALYZE actor-own-SELECT-Query
- MT-5 Done-Gate-Check (2-1 = 1 verbleibend = knowledge_chunks)
- MT-6 Records-Sync + Live-Smoke

**SLC-905 (Klasse D, ~4-5h):**
- MT-1 MIG-049 ALTER + Backfill + Policies + search_knowledge_chunks Function-Erweiterung
- MT-2 Backfill-Verifikation (`SELECT COUNT(*) FROM knowledge_chunks WHERE owner_user_id IS NULL` muss 0 sein post-Backfill)
- MT-3 Vitest `v8-11-slc-905-rls-matrix.test.ts` (Schema-Erweiterung + Policy + Function-Erweiterung)
- MT-4 Cron-Code-Audit embedding-sync-cron (owner_user_id+team_id-Set bei chunk-INSERT)
- MT-5 EXPLAIN ANALYZE Vector-Search-Query mit Owner-Filter
- MT-6 Done-Gate-Check (1-1 = 0 verbleibend → 100% Coverage erreicht, Q-V8.11-B erfuellt)
- MT-7 Records-Sync + Gesamt-/qa V8.11 + /final-check + /go-live

**Gesamt-Aufwand korrigiert: ~24-31h Code-Side** (statt initial ~17-22h aus FEAT-911). Erhoehung wegen Live-DB-Realitaet (41 statt 25 Tabellen).

**V8.11 Architecture ready for `/slice-planning V8.11`.**

## V8.12 — Defense-in-Depth Sprint Architecture (Addendum 2026-06-09)

V8.12 schliesst die 7 Code-Layer-Defense-Gaps aus V8.11 (createAdminClient-Bypass ohne is_admin()-Pre-Check) + 4 Cross-Repo-Polish-Patterns (CSP, Passwort-Policy, Logger-Redaction, LLM-Cost-Cap) + 1 Observability-Baseline (Sentry.io EU Frankfurt). 3 Phasen / 3 Features (FEAT-921/922/923) / ~7 Sub-Slices SLC-9X1..9X7. 0 Schema-Migration. 2 additive npm-Deps (zxcvbn dynamic-import, @sentry/nextjs).

### Architecture Summary

```
Browser (HTTPS)
  |
  |- business.strategaizetransition.com (Production)
  |
Coolify / Caddy (Reverse Proxy)
  |
  |- / -> app:3000 (Next.js BD Cockpit) -- V8.12 Touch-Points
  |       |
  |       |- Code-Layer (FEAT-921):
  |       |   7 Server-Actions in cockpit/src/lib/actions/** + knowledge/search.ts
  |       |   alle bekommen `assertRole(["admin"])` Pre-Check vor createAdminClient()
  |       |   bzw. User-Session-Client-Switch (Klasse-C/D-Faelle)
  |       |   Pattern: bestehender @/lib/auth/assert-role.ts (siehe DEC-285)
  |       |
  |       |- Edge/Header-Layer (FEAT-922-CSP, BL-501):
  |       |   next.config.ts Header-Block ergaenzt
  |       |   Phase-A Content-Security-Policy-Report-Only (1-2 Wo)
  |       |   Phase-B Content-Security-Policy strict
  |       |   report-uri = Sentry-DSN-CSP-Endpoint (DEC-279)
  |       |   Whitelist-Helper-Lib: cockpit/src/lib/security/csp.ts
  |       |   (Pattern: ImSch SLC-331 csp-allowlist.ts, ~30-50% byte-identisch)
  |       |
  |       |- Logger-Layer (FEAT-922-Logger, BL-503):
  |       |   cockpit/src/lib/logger/redact.ts mit pure redactSecrets(obj, opts?)
  |       |   cockpit/src/lib/logger/index.ts mit top-level logSafe(level, ...args)
  |       |   (Pattern: BS V8.12 Origin, Cross-Repo-Reuse-Quelle — DEC-286)
  |       |   12 Default-Keys (10 Security + 2 PII), erweiterbar via opts.extraKeys
  |       |   Migration in 10-15 critical Caller-Sites (Phase 2)
  |       |
  |       |- Auth-Layer (FEAT-922-Pw, BL-502):
  |       |   cockpit/src/lib/auth/password-policy.ts validatePasswordStrength(pw)
  |       |   zxcvbn dynamic-import (Bundle-Size R-V812-3 Mitigation)
  |       |   Mindestlaenge 12 + zxcvbn-Score >=3 (DEC-282)
  |       |   Caller-Sites: set-password/actions.ts + accept-invitation/actions.ts
  |       |   Scope: NUR neue Passwoerter (DEC-278)
  |       |
  |       |- AI-Adapter-Layer (FEAT-922-CostCap, BL-504):
  |       |   cockpit/src/lib/ai/bedrock-client.ts Pre-flight in queryLLM()
  |       |   ai_cost_ledger Query: SUM(cost_eur) WHERE tenant_id=$1
  |       |   In-Memory Map<tenant_id, {day_sum,month_sum,expires_at}> 1min TTL (DEC-287)
  |       |   Cap-Approach-Bypass: >95% Cap -> Cache-Skip + fresh SELECT
  |       |   Hard-Cap throw + Sentry.captureMessage("LLM Cap Hit", level=warning)
  |       |
  |       |- Observability-Layer (FEAT-923):
  |       |   cockpit/src/instrumentation.ts Next.js 15+ Hook (Server-Side Init)
  |       |   cockpit/sentry.server.config.ts (Node-Runtime Init, SENTRY_DSN)
  |       |   cockpit/sentry.client.config.ts (Browser Init, NEXT_PUBLIC_SENTRY_DSN)
  |       |   cockpit/sentry.edge.config.ts (Edge-Runtime Init)
  |       |   cockpit/src/lib/monitoring/sentry.ts Wrapper
  |       |     (captureException, captureMessage, isSentryEnabled)
  |       |   (Pattern: ImSch SLC-330, ~70-80% byte-identisch — DEC-277)
  |       |   beforeSend-Hook -> redactSecrets() (BL-503-Integration)
  |       |   tracesSampleRate=0.1, replaysSessionSampleRate=0
  |       |   sendDefaultPii=false (R-V812-5 DSGVO-Mitigation)
  |       |
  |       v
  |       Supabase / Bedrock / Existing Backend (unchanged)
  |
  +- Sentry.io EU-Region Frankfurt (External Service, NEU)
     (Project-DSN per Coolify-ENV, CSP-report-uri integriert)
```

### V8.12 Hauptkomponenten

#### Phase 1 — Code-Layer-Closures (FEAT-921, SLC-9X1 [+ optional SLC-9X2])

**Komponente:** 7 Server-Action-Files in cockpit/src/lib/actions/** + 1 search-Helper.

**Pattern-Reuse:** 100% — `assertRole(["admin"])` aus `@/lib/auth/assert-role.ts` existing seit V5+. Funktioniert in Server-Actions (verifiziert in customer-dse/actions.ts L25+L48). Wirft via `redirect('/mein-tag')` bei Role-Mismatch.

**7 Closures (Tabelle):**

| Issue | File | Klasse | Fix-Pattern |
|---|---|---|---|
| ISSUE-090 | `products-actions.ts` | B | `await assertRole(["admin"])` vor createAdminClient |
| ISSUE-091 | `deal-products-actions.ts` | C | `await assertRole(["admin"])` ODER User-Client-Switch |
| ISSUE-092 | `send-action.ts` (email_attachments-Bulk) | C | User-Client SELECT+INSERT, Admin nur fuer Storage-Cleanup |
| ISSUE-093 | `insight-actions.ts` (ai_action_queue + ai_feedback) | C | `await assertRole(["admin"])` |
| ISSUE-094 | `document-actions.ts` | C | User-Client SELECT+INSERT |
| SLC-901 M-1 | `goals-actions.ts`, `kpi-snapshots-actions.ts`, `activity-kpis-actions.ts` | A | `await assertRole(["admin"])` (admin-only-write) |
| SLC-905 D-905-4 | `cockpit/src/lib/knowledge/search.ts` | D | Caller-Mode-Switch: User-Client wenn `auth.uid()` set, Admin nur fuer Cron-Caller |

**Verifikation:** grep-Audit nach Phase 1 muss 0 `createAdminClient`-Calls in `cockpit/src/lib/actions/**` ohne vorgelagerten Role-Check liefern (AC-921-3).

#### Phase 2.1 — Logger-Redaction-Layer (FEAT-922 BL-503, SLC-9X3)

**Komponente:** Strategaize-Origin-Pattern fuer Cross-Repo-Logger-Hygiene.

**Files:**
- `cockpit/src/lib/logger/redact.ts` — pure function `redactSecrets(obj, opts?)`, `DEFAULT_REDACT_KEYS` (12 Keys per DEC-280)
- `cockpit/src/lib/logger/index.ts` — top-level wrapper `logSafe(level, ...args)` (DEC-286)

**Decision Top-Level vs Drop-In (DEC-286):** Top-level Wrapper gewaehlt. Caller-Sites werden explicit migriert (grep `logSafe(` zeigt alle Stellen). Drop-In console.* patching ist invasiv und Next.js-Build-Step-fragil.

**Migration:** 10-15 critical Files in Phase 2 (cron-loops, webhook-handlers, bedrock-client.ts, audit.ts central). Bestands-`console.*`-Calls ausserhalb dieser Files unangetastet.

**Vitest:** Mock-Patterns fuer Email/Token/Secret/Customer-Name-Redaction.

#### Phase 2.2 — Passwort-Policy (FEAT-922 BL-502, SLC-9X4)

**Komponente:** Strategaize-Origin-Pattern fuer Cross-Repo-Auth-Hardening.

**Files:**
- `cockpit/src/lib/auth/password-policy.ts` — `validatePasswordStrength(pw): { ok, score, reasons }`
- `cockpit/src/components/auth/PasswordStrengthIndicator.tsx` — Tailwind Progress-Bar (Score 0-4 Visual)

**zxcvbn-Bundle-Size-Mitigation (R-V812-3):**

```typescript
// Dynamic-Import in validatePasswordStrength()
const zxcvbn = (await import("zxcvbn")).default;
const result = zxcvbn(pw);
```

Damit landet zxcvbn (~700KB minified) NICHT im Main-Bundle, sondern in einem Lazy-Chunk der nur bei set-password/accept-invitation geladen wird.

**Caller-Edit (Scope DEC-278: NUR neue Passwoerter):**
- `cockpit/src/app/auth/set-password/actions.ts`
- `cockpit/src/app/auth/accept-invitation/actions.ts`

**Bestands-User unangetastet** (DEC-278 — Pre-Customer-Live separater Force-Reset-Slot).

#### Phase 2.3 — LLM-Cost-Cap (FEAT-922 BL-504, SLC-9X5)

**Komponente:** Pre-flight-Cost-Cap im Bedrock-Adapter mit In-Memory-Cache.

**File:** `cockpit/src/lib/ai/bedrock-client.ts` — Pre-flight in `queryLLM()` + neue Helper-Lib.

**Cache-Strategy (DEC-287):**

```typescript
// In-Memory Module-Scope (Process-lokal, Single-Container Internal-Test-Mode-konform)
const capCache = new Map<string, {
  day_sum: number;
  month_sum: number;
  expires_at: number;
}>();

const CACHE_TTL_MS = 60_000; // 1min
const APPROACH_THRESHOLD = 0.95; // >95% Cap = cache-bypass

async function checkCap(tenantId: string): Promise<void> {
  const cached = capCache.get(tenantId);
  const now = Date.now();
  let day_sum: number, month_sum: number;

  if (cached && cached.expires_at > now &&
      cached.day_sum < DAILY_CAP * APPROACH_THRESHOLD &&
      cached.month_sum < MONTHLY_CAP * APPROACH_THRESHOLD) {
    // Cache-Hit, Approach-Window safe
    day_sum = cached.day_sum;
    month_sum = cached.month_sum;
  } else {
    // Cache-Miss ODER Approach-Window — fresh SELECT
    const { data } = await supabase.rpc("get_tenant_cost_sums", { p_tenant_id: tenantId });
    day_sum = data.day_sum;
    month_sum = data.month_sum;
    capCache.set(tenantId, { day_sum, month_sum, expires_at: now + CACHE_TTL_MS });
  }

  if (day_sum >= DAILY_CAP) {
    Sentry.captureMessage("LLM Daily Cap Exceeded", {
      level: "warning",
      tags: { tenant_id: tenantId, period: "daily" },
    });
    throw new Error("LLM Daily Cap Exceeded");
  }
  if (month_sum >= MONTHLY_CAP) {
    Sentry.captureMessage("LLM Monthly Cap Exceeded", {
      level: "warning",
      tags: { tenant_id: tenantId, period: "monthly" },
    });
    throw new Error("LLM Monthly Cap Exceeded");
  }
}
```

**ENVs (DEC-281):**
- `LLM_DAILY_CAP_EUR_PER_TENANT` (default 25)
- `LLM_MONTHLY_CAP_EUR_PER_TENANT` (default 500)

**Multi-Container-Note:** In-Memory-Cache ist Process-lokal. Bei Worker-Container+App-Container (V8.x+) waere Drift moeglich — dann Cross-Container-Cache via Redis als Post-V8.12-Slot. Internal-Test-Mode Single-Container macht das hier sicher.

#### Phase 2.4 — CSP-Headers (FEAT-922 BL-501, SLC-9X6)

**Komponente:** Iterativer CSP-Rollout — Phase-A Report-Only → Phase-B strict.

**Files:**
- `cockpit/src/lib/security/csp.ts` — `buildCSP(supabaseKongUrl)` pure function + `PERMISSIONS_POLICY` const (Pattern: ImSch SLC-331 csp-allowlist.ts, Pure-Function-Struktur 100% reuse, Domain-Liste BS-spezifisch)
- `cockpit/next.config.ts` — `headers()` async function ergaenzt

**Whitelist-Initial (BS-spezifisch):**

```typescript
export function buildCSP(supabaseKongUrl: string): string {
  const connectSrc = [
    "'self'",
    "https://*.sentry.io",      // FEAT-923 Sentry-Endpoint (CSP-report-uri-Integration)
    supabaseKongUrl,             // NEXT_PUBLIC_SUPABASE_URL
    "https://bedrock-runtime.eu-central-1.amazonaws.com",  // DEC-005 Bedrock EU
  ].filter(s => s.length > 0).join(" ");

  return [
    `default-src 'self'`,
    // 'unsafe-inline' Pflicht fuer Next.js 15+ RSC-inline-Scripts (__next_f.push).
    // Lehre aus ImSch V3.3 Live-Smoke 2026-06-08 (15min Production-Outage durch
    // strikte script-src 'self'). Migration zu Nonce-CSP via Middleware = V8.x-Post-Slot.
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`,
    `connect-src ${connectSrc}`,
    `img-src 'self' data: blob:`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind-Generated
    `font-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
}

export const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
```

**Phase-A Report-Only (1-2 Wochen):** Header-Name `Content-Security-Policy-Report-Only`, report-uri = Sentry-DSN-CSP-Endpoint. Reale Violations werden in Sentry-Dashboard sichtbar — Iterativ-Fix der Inline-Scripts/Styles.

**Phase-B strict:** Switch zu `Content-Security-Policy` (kein -Report-Only-Suffix). Pflicht-Verifikation per `security-headers-live-smoke.md` Probe: `tests/_probe/csp-check.mjs` Playwright + Console-Listener + React-Hydration-Check (0 CSP-Errors + hasReactProps + hasReactFiber + onSubmitAttached).

**Permissions-Policy:** Statisch (camera/microphone/geolocation/payment/usb alle off). Wird mit CSP gemeinsam in `next.config.ts` headers() gesetzt.

#### Phase 3 — Sentry-Observability (FEAT-923, SLC-9X7)

**Komponente:** Sentry.io EU-Region Frankfurt Error-Monitoring + Performance-Tracing.

**Files (Pattern aus ImSch SLC-330, ~70-80% byte-identisch portierbar):**
- `cockpit/sentry.server.config.ts` — Node-Runtime Init (`SENTRY_DSN`)
- `cockpit/sentry.client.config.ts` — Browser Init (`NEXT_PUBLIC_SENTRY_DSN`)
- `cockpit/sentry.edge.config.ts` — Edge-Runtime Init
- `cockpit/src/instrumentation.ts` — Next.js 15+ Hook (laedt sentry.server.config bei `NEXT_RUNTIME=nodejs`)
- `cockpit/src/lib/monitoring/sentry.ts` — Wrapper (`captureException`, `captureMessage`, `isSentryEnabled`)
- `cockpit/src/app/global-error.tsx` — Caller-Site fuer captureException (folgt ImSch-Pattern)

**Sentry.init Config (alle 3 Configs):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN, // bzw. NEXT_PUBLIC_SENTRY_DSN fuer Client
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  sendDefaultPii: false, // DSGVO-Mitigation (R-V812-5)

  beforeSend(event) {
    // BL-503-Integration: Logger-Redaction auf Event-Payload
    return redactSentryEvent(event);
  },
});
```

**beforeSend-Hook (BL-503-Integration):** `redactSentryEvent(event)` nutzt `redactSecrets()` aus `cockpit/src/lib/logger/redact.ts` und entfernt Secret-Keys aus `event.extra`, `event.contexts`, `event.tags`, `event.user`.

**Sentry-Plan:** Sentry.io EU Team-Plan ~$26-80/mo (DPA-konform). Free-Tier reicht fuer Internal-Test-Mode initial; Upgrade wenn Event-Volume gross wird (A-V812-3).

**Coolify-ENVs:**
- `SENTRY_DSN` (Server-Only)
- `NEXT_PUBLIC_SENTRY_DSN` (Client-exposed, gleich oder separates Project-DSN)
- `SENTRY_ENVIRONMENT` (`production` / `development`)
- `SENTRY_TRACES_SAMPLE_RATE` (default 0.1)

**Founder-Pre-Steps (kein Slice noetig, vor Phase 3):**
1. Sentry-Account erstellen + EU-Project Frankfurt einrichten + DPA unterzeichnen
2. DSN-Wert in Coolify-ENV `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` setzen

### Data Model / Storage Direction

**0 Schema-Migration.** V8.12 nutzt ausschliesslich bestehende Tabellen:

- `ai_cost_ledger.tenant_id` (BL-504 Pre-flight-Query, existing seit V6.4)
- `audit_log` (existing, V8.12 schreibt keine neuen Eintraege — Sentry uebernimmt Error-Telemetry)

**A-V812-2 Validation-Plan:** Pre-Phase-2.3 ein Direct-SQL-Check `SELECT COUNT(*) FROM ai_cost_ledger WHERE tenant_id IS NULL` — wenn >0, dann Default-Tenant-Fallback-Logic in BL-504 noetig.

### External Dependencies / Integrations

**Neue npm-Deps (additive, 0 Major-Upgrades):**
- `zxcvbn` ^4.x — dynamic import (BL-502)
- `@sentry/nextjs` ^8.x — instrumentation-Hook + 3 Config-Files (FEAT-923)

**Neue External Services:**
- **Sentry.io EU Frankfurt** (FEAT-923) — Project-Endpoint per DSN, DPA-konform, EU-Region. Per `data-residency.md` regelkonform.

**Bestehend (unveraendert):**
- AWS Bedrock eu-central-1 (LLM)
- Supabase / Kong / Postgres
- Coolify / Caddy

### Security / Privacy

**Data-Residency (`data-residency.md`):**
- Sentry MUSS EU-Region (Frankfurt-Endpoint) sein, KEIN US-Endpoint
- Sentry DSGVO: `sendDefaultPii: false` + `beforeSend`-Redact-Hook (R-V812-5 Mitigation)
- Bedrock unveraendert eu-central-1

**Code-Layer-Defense-in-Depth (Phase 1):**
- 0 createAdminClient-Bypass in `cockpit/src/lib/actions/**` ohne assertRole(["admin"])-Pre-Check post-Phase-1
- DB-Layer-RLS bleibt aktiv als Second-Line-of-Defense (V8.11 abgeschlossen)

**CSP-Defense (Phase 2.4):**
- Phase-A Report-Only deckt Inline-Script-Inventur ab (vermutlich 3-5 Iter-Fixes per Lehre ImSch SLC-331)
- Phase-B strict + Pflicht-Live-Smoke per `security-headers-live-smoke.md` Probe
- Permissions-Policy lock-down (camera/microphone/geolocation/payment/usb = off)

**Logger-Redaction (Phase 2.1):**
- 12 Default-Keys (10 Security + 2 PII) per DEC-280
- Caller-Site-Migration in 10-15 critical Files
- Sentry-beforeSend-Hook nutzt selben Redact-Layer (BL-503-Integration)

**Passwort-Policy (Phase 2.2):**
- Mindestlaenge 12 + zxcvbn-Score >=3 (DEC-282)
- Scope: NUR neue Passwoerter (DEC-278) — Bestands-User unangetastet
- Force-Reset-Slot Pre-Customer-Live separater Pre-Live-Slot

**LLM-Cost-Cap (Phase 2.3):**
- Hard-Cap per Tenant DAILY=25 EUR / MONTHLY=500 EUR (DEC-281)
- Sentry-Alert bei Cap-Hit (DEC-283, kein Slack-Webhook)
- Cap-Approach-Bypass-Cache verhindert silent Drift bei >95% Cap

### Constraints / Tradeoffs

**Constraints (verbindlich):**
- Internal-Test-Mode bleibt durchgaengig — V8.12 ist KEINE Customer-Live-Vorbereitung
- 0 Schema-Migration — kein MIG-XXX-Eintrag noetig
- 0 npm-Major-Upgrades — nur additive Deps
- TSC=0 + ESLint=0 Pflicht-Gates per Sub-Slice
- Full-Vitest-Suite GREEN Pflicht-Gate per Sub-Slice (per IMP-1108)
- Coolify-Redeploy nach jeder Sub-Slice mit cockpit/src-Touch
- Pattern-Reuse-Pflicht per `strategaize-pattern-reuse.md`

**Tradeoffs (bewusst gewaehlt):**

| Tradeoff | Gewaehlt | Verworfen | Begruendung |
|---|---|---|---|
| Phase 1 Role-Check | `assertRole(["admin"])` existing | Neuer `assertAdminAction()`-Helper | DEC-285: 100% Pattern-Reuse, 0 neue Surface |
| Logger-Wrapper | `logSafe()` top-level wrapper | console.* drop-in patching | DEC-286: explicit Caller-Sites, grep-trackbar |
| Cost-Cap-Cache | In-Memory 1min TTL + Approach-Bypass | Kein Cache (DB-Hit pro Call) ODER Redis | DEC-287: Single-Container-Internal-Test-Mode-konform, Performance |
| CSP-Rollout | Report-Only → strict iterativ | Direkt strict | DEC-279: ImSch SLC-331 hat 15min Production-Outage gezeigt — Report-Only-Phase ist Pflicht |
| Sentry-Region | Sentry.io EU Frankfurt | Self-hosted Sentry | DEC-277: SaaS reduziert Ops-Aufwand, EU-Region+DPA DSGVO-konform |
| Cost-Cap-Alerting | Sentry-Issue-Dashboard | Slack-Webhook separat | DEC-283: 1 Less ENV + 1 Less Integration, Sentry deckt Alert-Surface |

**Tradeoff-Risiken:**
- **In-Memory-Cache vs Multi-Container** (DEC-287): Bei Migration zu Worker-Container in V8.x+ wird der Cache zwischen Containern drift'en. Mitigation: Cap-Approach-Bypass-Logic erkennt >95% Cap und bypasst Cache → echte Cap-Anhebungen werden Cross-Container sichtbar. Vollstaendige Multi-Container-Loesung via Redis = Post-V8.12-Slot.

### Open Technical Questions (post-arch)

**Alle /architecture-OQs sind geschlossen** (OQ-V812-arch-1..3 → DEC-285/286/287).

**Verbleibend fuer /slice-planning:**
- OQ-V812-slice-1: Phase 1 als 1 Bundle-Slice SLC-9X1 mit 7 MTs ODER 2 Klasse-Splits SLC-9X1 (Klasse-B+D, 3 Files) + SLC-9X2 (Klasse-A+C, 4 Files)?
- OQ-V812-slice-2: Phase 2 als 4 separate Slices (SLC-9X3..9X6) ODER 1 Bundle-Slice mit 4 MTs?

Architektur-Empfehlung:
- **Phase 1 als 1 Bundle (SLC-9X1)** — Pattern-Reuse 100% gleich, Code-Touch klein pro File, /qa AC-921-1..5 ueber alle 7 in einem Schritt
- **Phase 2 als 4 separate Slices (SLC-9X3..9X6)** — Pattern-Origins sind verschieden, /qa pro Slice macht Iterativ-Fix einfacher (insb. CSP-Phase-A-Iter-Fixes), Phase 2.4 CSP hat eigenes Live-Smoke per `security-headers-live-smoke.md`

Final-Cut in /slice-planning per Founder-Vote.

### Pattern-Reuse-Audit-Tabelle

| Komponente | Quelle | Reuse-Quote | Adapter-Anforderung |
|---|---|---|---|
| `assertRole(["admin"])` Pre-Check Phase 1 | BS V5+ `@/lib/auth/assert-role.ts` | 100% | keine — 1:1 import |
| Sentry-Setup 3-File + Wrapper | ImSch SLC-330 (`sentry.{server,client,edge}.config.ts` + `src/lib/monitoring/sentry.ts`) | ~70-80% | DSN-ENV-Namen anpassen, Wrapper-Caller-Signatur 1:1 |
| CSP-Allowlist Pure-Function | ImSch SLC-331 `src/lib/security/csp-allowlist.ts` | ~30-50% Struktur, 0% byte-identisch | Domain-Liste BS-spezifisch (Bedrock + Supabase + Sentry, kein seven.io) |
| Logger-Redaction `redactSecrets()` + `logSafe()` | KEINE — BS V8.12 Origin | 0% | Cross-Repo-Reuse-Quelle fuer OP + IS + ImSch |
| zxcvbn Passwort-Policy | KEINE — BS V8.12 Origin | 0% | Cross-Repo-Reuse-Quelle |
| LLM-Cost-Cap In-Memory-Cache | KEINE — BS V8.12 Origin | 0% | Cross-Repo-Reuse-Quelle (IS V4.x Cost-Tracking analog) |
| `tests/_probe/csp-check.mjs` Live-Smoke | ImSch V3.3 SLC-331 (security-headers-live-smoke.md) | 100% Tool, 0% byte-identisch in BS | Adapter-Path-Anpassung |

### Risks Re-Audit

Aus RPT-607 Section 8 sechs Risiken — mit Architecture-Resolutions:

| Risk | Architecture-Mitigation |
|---|---|
| R-V812-1 (Phase 1 UI-Regression) | Live-Smoke 7 UI-Pfade nach Phase 1 (AC-921-5). `assertRole(["admin"])` ist Production-erprobt seit V5+ (customer-dse, settings, etc.). |
| R-V812-2 (CSP Phase-B Page-Breaks) | Report-Only-Phase 1-2 Wochen + Iterativ-Fix. Live-Smoke-Probe per `tests/_probe/csp-check.mjs` als Pflicht-Gate. |
| R-V812-3 (zxcvbn Bundle-Size) | Dynamic-Import in `validatePasswordStrength()` → Lazy-Chunk nur bei set-password/accept-invitation. |
| R-V812-4 (Cost-Cap DB-Query-Latenz) | In-Memory-Cache 1min TTL (DEC-287). Cap-Approach-Bypass bei >95% Cap. Erwarteter Average-Latency-Add: <1ms (Cache-Hit). |
| R-V812-5 (Sentry DSGVO User-IP-Default) | `Sentry.init({ sendDefaultPii: false })` + beforeSend-Hook mit redactSentryEvent(). |
| R-V812-6 (Sentry Cost-Spike bei Cap-Hit) | tracesSampleRate=0.1 + Sentry-Rate-Limit pro Issue-Type (Standard Sentry-Feature). Cap-Hit-Events sind kategorisch (level=warning) und werden Sentry-deduplicated. |

### Architecture Quality Bar Check

- Build direction understandable: ✓ (3 Phasen sequential, klare Component-Boundaries)
- Major structural choices clear: ✓ (Top-Level-Wrapper, In-Memory-Cache, Report-Only-First, 3 OQ-DECs)
- Key responsibilities defined: ✓ (Component-Tabelle + Pattern-Reuse-Audit)
- Major risks visible: ✓ (6 Risks mit Architecture-Mitigations)
- Slice-Planning kann ohne Guessing weitermachen: ✓ (OQ-V812-slice-1+2 mit Architecture-Empfehlung, Final-Cut Founder-Vote)

### V8.12 Architecture ready for `/slice-planning V8.12`.
