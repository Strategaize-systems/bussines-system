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
  ├── alle 5 Min  → POST /api/cron/imap-sync    (Header: x-cron-secret)
  ├── alle 15 Min → POST /api/cron/classify      (Header: x-cron-secret)
  ├── alle 6h     → POST /api/cron/followups     (Header: x-cron-secret)
  └── taeglich    → POST /api/cron/retention      (Header: x-cron-secret)
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
