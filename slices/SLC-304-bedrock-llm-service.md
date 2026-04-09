# SLC-304 — Bedrock LLM-Service Layer

## Slice Info
- Feature: FEAT-305
- Version: V3
- Priority: High
- Dependencies: keine (kann parallel zu SLC-301 laufen)
- Type: Backend + API

## Goal
Zentrale KI-Infrastruktur: AWS Bedrock Client, Prompt-Templates, Response-Parser, Rate-Limiter, API-Route. Grundlage fuer alle LLM-Features in V3.

## Scope

### Included
1. /lib/ai/bedrock-client.ts — AWS SDK v3, InvokeModel, eu-central-1
2. /lib/ai/prompts/deal-briefing.ts — Prompt + Output-Schema fuer Deal-Zusammenfassung
3. /lib/ai/prompts/daily-summary.ts — Prompt + Output-Schema fuer Tages-Summary
4. /lib/ai/parser.ts — JSON-Response-Validator
5. /lib/ai/confirm.ts — Confirm-before-write Utility (Dialog-Logik)
6. /lib/ai/rate-limiter.ts — Token-Bucket (10 req/min pro User)
7. /lib/ai/types.ts — Shared Types
8. /api/ai/query — Next.js API Route (Auth, Rate-Limit, Prompt-Assembly, Bedrock-Call, Parse)
9. AWS Env Vars in Coolify konfigurieren
10. Error-Handling: Timeout, Rate-Limit, Auth, Bedrock-Errors

### Excluded
- UI-Komponenten fuer KI-Anzeige (kommen in SLC-307, SLC-308)
- Confirm-before-write UI-Dialog (nur Utility-Logik hier)
- Caching (optional, spaeter)
- Action-Modus (V3.1)

## Backlog Items
- BL-309: Bedrock LLM-Service Layer
- BL-310: Confirm-before-write Pattern

## Acceptance Criteria
1. /lib/ai/ existiert mit allen definierten Dateien
2. Bedrock-Client kann Claude Sonnet via API aufrufen (manueller Test)
3. Deal-Briefing Prompt produziert strukturiertes JSON
4. Tages-Summary Prompt produziert strukturiertes JSON
5. API-Route /api/ai/query ist authentifiziert
6. Rate-Limiter begrenzt auf 10 req/min
7. Fehler werden strukturiert zurueckgegeben
8. Kein API-Key im Code oder Git

## Micro-Tasks

### MT-1: Bedrock Client + Types
- Goal: AWS SDK Client und Shared Types erstellen
- Files: `lib/ai/bedrock-client.ts`, `lib/ai/types.ts`
- Expected behavior: queryLLM() sendet Prompt an Bedrock und bekommt Response
- Verification: Manueller Test-Aufruf mit einfachem Prompt
- Dependencies: AWS Credentials in Coolify konfiguriert

### MT-2: Prompt-Templates + Parser
- Goal: Deal-Briefing und Tages-Summary Prompts mit JSON-Output-Schema
- Files: `lib/ai/prompts/deal-briefing.ts`, `lib/ai/prompts/daily-summary.ts`, `lib/ai/parser.ts`
- Expected behavior: Prompts erzeugen strukturierte Anweisungen, Parser validiert JSON-Response
- Verification: Prompt-Output pruefen mit Test-Daten
- Dependencies: MT-1

### MT-3: Rate-Limiter + Confirm Utility
- Goal: Token-Bucket Rate-Limiter und Confirm-before-write Logik
- Files: `lib/ai/rate-limiter.ts`, `lib/ai/confirm.ts`
- Expected behavior: Rate-Limiter blockt nach 10 Requests/min, Confirm-Utility liefert Struktur fuer UI
- Verification: Rate-Limit-Test (mehrere schnelle Requests)
- Dependencies: keine

### MT-4: API-Route /api/ai/query
- Goal: Authentifizierte, rate-limited API-Route die alles zusammenfuehrt
- Files: `app/api/ai/query/route.ts`
- Expected behavior: POST mit { type, context } → Auth-Check → Rate-Limit → Prompt → Bedrock → Parse → Response
- Verification: curl-Test oder Browser-Test mit Auth
- Dependencies: MT-1, MT-2, MT-3

### MT-5: AWS Credentials in Coolify
- Goal: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION in Coolify Env Vars
- Files: —
- Expected behavior: Next.js App kann Bedrock API erreichen
- Verification: MT-4 Verification (End-to-End)
- Dependencies: AWS Account mit Bedrock-Zugriff in eu-central-1

## Technical Notes
- AWS SDK: @aws-sdk/client-bedrock-runtime (npm install noetig)
- Model ID: anthropic.claude-sonnet-4-6-20250514-v1:0
- Region: eu-central-1 (Frankfurt, DSGVO-konform)
- Rate-Limiter: In-Memory (reicht fuer Single-User, kein Redis noetig)
- Confirm-before-write: Nur Utility in V3, UI-Dialog kommt erst wenn Action-Modus in V3.1 aktiviert wird

## Risks
- Bedrock-Latenz: Sonnet kann 3-8 Sekunden brauchen → Async-Loading mit Skeleton UI
- AWS Credentials: Muessen korrekt in Coolify stehen, nicht im Git
- Model-Verfuegbarkeit: claude-sonnet-4-6 muss in eu-central-1 aktiviert sein
