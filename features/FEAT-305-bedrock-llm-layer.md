# FEAT-305 — Bedrock LLM-Integration Layer

## Summary
Zentrale KI-Infrastruktur fuer alle LLM-Features. AWS Bedrock Client (Claude Sonnet 4.6, eu-central-1), Prompt-Templates, Response-Parser, Confirm-before-write Pattern.

## Version
V3

## Related Decisions
- DEC-018: Claude Sonnet 4.6 via AWS Bedrock Frankfurt
- DEC-023: Zentraler LLM-Service-Layer

## Components
1. **Bedrock Client:** /lib/ai/bedrock-client.ts — AWS SDK v3, InvokeModel, eu-central-1
2. **Prompt-Templates:** /lib/ai/prompts/ — Deal-Briefing, Tages-Summary (erweiterbar)
3. **Response-Parser:** /lib/ai/parser.ts — Strukturierter Output (JSON Schema)
4. **Confirm-before-write:** /lib/ai/confirm.ts — Middleware + UI-Dialog fuer schreibende Aktionen
5. **API-Route:** /api/ai/query — Authentifiziert, rate-limited, mit Prompt-Type-Parameter
6. **Error-Handling:** Timeout, Rate-Limit, Auth-Fehler, Bedrock-Errors

## Acceptance Criteria
1. /lib/ai/ Service existiert mit Bedrock-Client
2. Deal-Briefing-Prompt produziert strukturierte Zusammenfassung (JSON)
3. Tages-Summary-Prompt produziert priorisierte Tagesansicht (JSON)
4. Confirm-before-write Dialog erscheint bei schreibenden KI-Aktionen
5. API-Route /api/ai/query ist authentifiziert und rate-limited
6. Fehler werden sauber abgefangen und im UI angezeigt
7. Kein Direct-API-Call aus Components — alle nutzen /lib/ai/

## Technical Notes
- AWS SDK: @aws-sdk/client-bedrock-runtime
- Model ID: anthropic.claude-sonnet-4-6-20250514-v1:0 (oder aktuellstes verfuegbares)
- Region: eu-central-1 (Frankfurt)
- Env Vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
- Response-Format: JSON mit vordefiniertem Schema pro Prompt-Type
- Rate-Limiting: Max 10 Requests/Minute pro User (Token-Bucket)
- Caching: Optionales Redis/in-memory Cache fuer wiederholte identische Queries

## Prompt-Templates (V3)

### Deal-Briefing
Input: Deal-Daten + verknuepfte Activities (letzte 10) + Company + Contact + Stage
Output: { summary, keyFacts, openRisks, suggestedNextSteps, confidence }

### Tages-Summary
Input: Heutige Tasks + Calendar-Events + Stagnierte Deals + Ueberfaellige Items
Output: { greeting, priorities, meetingPrep[], warnings[], suggestedFocus }

## Out of Scope
- Firmen-/Kontakt-Summaries (V3.1)
- KI-Coaching/Reflexion (V4)
- Wissens-Extraktion aus Gespraechen (V4)
- Action-Modus (KI fuehrt Schreibaktionen aus) — nur Query-Modus in V3
