# SLC-752 — Sculptor-Adapter Core + MIG-036 (FEAT-751)

## Metadata
- **Slice ID:** SLC-752
- **Version:** V7.5
- **Feature:** FEAT-751 Natural-Language Workflow-Sculptor
- **Status:** planned
- **Priority:** High (Foundation fuer NL-Surface; Pure-Logic ohne UI-Dependency)
- **Created:** 2026-05-16
- **Estimated Effort:** ~3-5h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen (neuer Code-Bereich `lib/automation/sculptor/*`, MIG-036)
- **Architecture:** DEC-205 (Single-Shot + 1x Re-Prompt), DEC-208 (Real-Cost-Display), DEC-209 (File-Layout), DEC-211 (Region-Pin)
- **Reihenfolge-Pflicht:** **nach SLC-751**. Vor SLC-753 (UI-Surface braucht den Core).

## Goal

Pure-Function-Core des NL-Sculptors anlegen — `sculptRule(nlInput, userId)` mit Single-Shot-Bedrock-Call, zod-Schema-Validate, 1x Re-Prompt-Loop, healJsonEscapes-Reuse, Cost-Berechnung. Inkl. `automation_rules.created_via`-additive-Migration MIG-036 + Bedrock-Region-Startup-Assertion. KEINE UI, KEINE Server-Action (kommt in SLC-753) — sauberer Cut.

## Scope

**In Scope:**

- **MIG-036** (NEU additiv): `ALTER TABLE automation_rules ADD COLUMN created_via TEXT CHECK (created_via IN ('click_wizard','nl_sculptor')) DEFAULT 'click_wizard';` Bestehende Rows bleiben `click_wizard`.
- **6 neue Files unter `cockpit/src/lib/automation/`:**
  - `sculptor.ts` — `sculptRule(nlInput: string, userId: string): Promise<SculptResult>` mit Single-Shot + 1x Re-Prompt-Loop + healJsonEscapes-Reuse + audit_log-Insert pro Versuch (action `automation_rule.sculpt_attempt`)
  - `sculptor-prompts.ts` — System-Prompt-String + 8 Few-Shot-Examples (4 success + 2 reject + 2 edge) als TypeScript-Constants
  - `sculptor-schema.ts` — zod-Schemas: `SculptSuccessSchema`, `SculptRejectSchema`, `ConditionFieldSchema`, `ActionTypeSchema`. Importiert `FIELD_WHITELIST`, `TRIGGER_EVENTS`, `ACTION_TYPES` aus bestehender `cockpit/src/lib/automation/field-whitelist.ts` (Single-Source-of-Truth).
  - `sculptor-cost.ts` — `PRICING`-Table mit Bedrock-Claude-3.5-Sonnet-EU-Pricing + `calculateSculptCost(usage, modelId): number`
  - `sculptor-dedup.ts` — `assertNotDuplicateRule(rule, userId): Promise<void>` — wirft `DuplicateRuleError` bei Match (Name + Trigger + JSON.stringify(conditions+actions))
  - `nl-history.ts` — `listNlSculptHistory(limit: number, ownerScope?: string): Promise<NlSculptHistoryRow[]>` — audit_log-Query
- **`cockpit/src/lib/llm/bedrock-client.ts` (MOD)** — `createBedrockClient()` mit Region-Pin-Startup-Assertion: `if (region !== "eu-central-1") throw new Error("Bedrock-Region-Drift: ...")`. Bestehender invokeBedrock-Pfad unveraendert. Gilt automatisch fuer alle Bedrock-Aufrufer (V3, V4.2, V6.2, V7.5).
- **`cockpit/src/lib/json/heal-json-escapes.ts`** — Wenn noch nicht existent: 1:1-Portierung aus `is-slc-*` (IS-SLC-109-Pattern). Wenn existent: Reuse.
- **Vitest-Tests (4 neue Files):**
  - `sculptor.test.ts` — 8 Real-World-Prompts (4 success + 2 reject + 2 edge) + Re-Prompt-Loop-Coverage + audit_log-Insert-Mock
  - `sculptor-schema.test.ts` — 20 LLM-Output-Variations (good/drifted/malformed) gegen zod-Schema
  - `sculptor-cost.test.ts` — Mock-Usage-Token-Counts → exakte Cost-Berechnung
  - `sculptor-dedup.test.ts` — identical-Rule → 409, distinct-Rule → passes. Vitest gegen Coolify-DB (Live-DB-Test-Pattern aus `reference_coolify_test_setup`).
  - `bedrock-client.test.ts` (NEU oder MOD) — `process.env.BEDROCK_REGION = "us-east-1"` → wirft. `eu-central-1` → passes.

**Out of Scope:**

- Server Action `sculptNlRule()` — kommt in SLC-753
- UI-Component `NLRuleBuilderCard.tsx` — kommt in SLC-753
- `previewNlRule()` Trockenlauf-Action — kommt in SLC-754
- `applyNlRule()` Apply-Action — kommt in SLC-754
- Voice-Input-Integration — kommt in SLC-755
- Inspection-Log-UI — kommt in SLC-756
- Tool-Use / Function-Calling-API von Bedrock — V8+

## Acceptance Criteria

- **AC1** MIG-036 angewendet auf Coolify-DB. `\d automation_rules` zeigt `created_via TEXT DEFAULT 'click_wizard' CHECK (...)`. Bestehende Rows = `click_wizard`. INSERT mit `created_via='nl_sculptor'` funktioniert.
- **AC2** 6 Files unter `cockpit/src/lib/automation/` existieren mit korrekten Exports.
- **AC3** Vitest `sculptor.test.ts` — 8 Real-World-Prompts:
  - 4 Success (z.B. "Wenn Deal in Stage Angebot, leg Follow-up-Task in 2 Tagen an" → korrektes `{trigger_event, trigger_config, conditions, actions}`)
  - 2 Reject (z.B. "Wenn Kunde Sprachnachricht schickt..." → `{reject_reason:"out_of_domain", explanation:...}`)
  - 2 Edge (z.B. ambiguer Field-Name "Status" → re-prompt-loop oder reject)
  - Mindest-PASS-Rate ≥7/8 (≥87%, Architecture-Mindestziel ≥70% sicher uebertroffen).
- **AC4** Vitest `sculptor-schema.test.ts` — 20 LLM-Output-Variations (good/drifted/malformed) gegen `SculptSuccessSchema` + `SculptRejectSchema`. Schema-Drift-Robustheit verifiziert.
- **AC5** Vitest `sculptor-cost.test.ts` — Mock Bedrock-Usage `{input_tokens:1000, output_tokens:500}` → `calculateSculptCost()` returnt `0.003 * 1 + 0.015 * 0.5 = 0.0105` USD. Pricing-Tabelle uebereinstimmt mit Bedrock-AWS-Pricing-Page.
- **AC6** Vitest `sculptor-dedup.test.ts` (Live-DB-Test gegen Coolify-DB) — identical-Rule INSERT-Versuch wirft `DuplicateRuleError`, distinct-Rule passes. SAVEPOINT-Pattern aus `coolify-test-setup.md`.
- **AC7** Vitest `bedrock-client.test.ts` Region-Assertion — `process.env.BEDROCK_REGION="us-east-1"` → `createBedrockClient()` wirft mit Message `"Bedrock-Region-Drift: BEDROCK_REGION=us-east-1, erwartet eu-central-1. Data-Residency-Pflicht laut data-residency.md."`. `eu-central-1` passes. `unset` → wirft.
- **AC8** Re-Prompt-Loop-Coverage (in sculptor.test.ts): 1st Bedrock-Call returnt malformed JSON → healJsonEscapes scheitert → 2nd Bedrock-Call mit Korrektur-Hint → zod-Validate success. Test verifiziert 2 Bedrock-Calls + Cost kumulativ.
- **AC9** `audit_log` enthaelt nach jedem `sculptRule()`-Aufruf einen `automation_rule.sculpt_attempt`-Eintrag mit `metadata={nl_input, transcript_source, sculptor_model_id, sculptor_cost_usd, attempt_count, result_status, result_payload}`. Test mit Mock-Audit-Insert verifiziert Felder.
- **AC10** `npm run test:all` 930 → 930+34 PASS (34 = grobe Schaetzung: 8 Sculpt + 20 Schema + 3 Cost + 2 Dedup + 1 Re-Prompt). +/- 5 ist OK; AC10 misst kein Exakt-Count, sondern "alle neuen Tests gruen + keine Regression".

## Micro-Tasks

### MT-0: MIG-036 auf Coolify-DB anwenden
- **Goal:** `automation_rules.created_via`-Column additiv. SQL-Migration nach `sql-migration-hetzner.md`-Pattern (postgres-User, Base64-Transfer).
- **Files:**
  - `sql/migrations/036_automation_rules_created_via.sql` (NEU)
  - `docs/MIGRATIONS.md` (MOD) — MIG-036 Eintrag
- **Expected behavior:**
  ```sql
  ALTER TABLE automation_rules ADD COLUMN created_via TEXT
    CHECK (created_via IN ('click_wizard','nl_sculptor'))
    DEFAULT 'click_wizard';
  ```
- **Verification:** Hetzner-psql `\d automation_rules` zeigt Column. Bestehende Rows = `click_wizard` (sample SELECT). Insert mit `nl_sculptor` ok.
- **Dependencies:** none (kann parallel zu MT-1+MT-2 laufen)

### MT-1: Bedrock-Region-Startup-Assertion
- **Goal:** `bedrock-client.ts` wirft bei `region !== "eu-central-1"`. Single Choke-Point fuer alle Aufrufer.
- **Files:**
  - `cockpit/src/lib/llm/bedrock-client.ts` (MOD)
  - `cockpit/src/lib/llm/__tests__/bedrock-client.test.ts` (NEU oder MOD)
- **Verification:** Vitest 3 Cases (eu-central-1 passes / us-east-1 throws / undef throws). TSC clean.
- **Dependencies:** none

### MT-2: healJsonEscapes-Helper portieren
- **Goal:** Wenn nicht im Business-System vorhanden: 1:1-Portierung aus `is-slc-*`. Mit Quell-Pfad-Header-Kommentar.
- **Files:**
  - `cockpit/src/lib/json/heal-json-escapes.ts` (NEU oder Reuse)
  - `cockpit/src/lib/json/__tests__/heal-json-escapes.test.ts` (NEU)
- **Expected behavior:** Fix LLM-Output-Patterns: `Quote: he said \\"hi\\"` → `Quote: he said "hi"` etc. (IS-SLC-109-Pattern dokumentiert in `feedback_bedrock_json_drift_pattern`).
- **Verification:** 5 healing-Cases gruen (Standard-Drift, Doppel-Escape, Unicode, Multiline, leeres String).
- **Dependencies:** none

### MT-3: sculptor-schema.ts + Tests
- **Goal:** zod-Schemas die V6.2-Whitelists exakt spiegeln. Importiert `FIELD_WHITELIST` aus existing `field-whitelist.ts` (Drift-Schutz).
- **Files:**
  - `cockpit/src/lib/automation/sculptor-schema.ts` (NEU)
  - `cockpit/src/lib/automation/__tests__/sculptor-schema.test.ts` (NEU)
- **Expected behavior:**
  - `SculptSuccessSchema` = zod.object({trigger_event: zod.enum(TRIGGER_EVENTS), trigger_config: zod.record(...), conditions: zod.array(ConditionSchema), actions: zod.array(ActionSchema)})
  - `SculptRejectSchema` = zod.object({reject_reason: zod.literal("out_of_domain"), explanation: zod.string()})
  - 20 LLM-Output-Variations: 10 valide / 5 drifted (Extra-Keys) / 5 malformed (Wrong-Types).
- **Verification:** Vitest 20/20 PASS.
- **Dependencies:** none

### MT-4: sculptor-prompts.ts (System-Prompt + 8 Few-Shots)
- **Goal:** TypeScript-Constants mit komplettem System-Prompt + 8 Few-Shot-Examples in `{user_input, expected_output}`-Format.
- **Files:**
  - `cockpit/src/lib/automation/sculptor-prompts.ts` (NEU)
- **Expected behavior:**
  - `SYSTEM_PROMPT` (string) — Architecture-Skizze DEC-205b, vollstaendig ausformuliert
  - `FEW_SHOTS` (Array von 8 Objekten):
    - 4 success: deal.stage_changed → create_task / deal.created → send_email_template / activity.created → update_field / deal.stage_changed → create_activity
    - 2 reject: "Sprachnachricht..." / "Externe API-Call..."
    - 2 edge: ambiguer Field-Name (re-prompt) / Multi-Action (success mit 2 actions)
- **Verification:** Files-Lint clean. Manuelle Doc-Review der 8 Few-Shots gegen V6.2-FIELD_WHITELIST.
- **Dependencies:** MT-3

### MT-5: sculptor-cost.ts + Tests
- **Goal:** Pricing-Table + `calculateSculptCost`. Single-File, ~30 Zeilen.
- **Files:**
  - `cockpit/src/lib/automation/sculptor-cost.ts` (NEU)
  - `cockpit/src/lib/automation/__tests__/sculptor-cost.test.ts` (NEU)
- **Verification:** Vitest 3 Cases (1st-try-success, 2nd-try-success-kumulativ, reject-2-attempts-kumulativ).
- **Dependencies:** none

### MT-6: sculptor.ts Core + Tests (8 Real-World-Prompts + Re-Prompt-Loop)
- **Goal:** `sculptRule(nlInput, userId)` mit Single-Shot + 1x Re-Prompt + audit_log-Insert pro Versuch.
- **Files:**
  - `cockpit/src/lib/automation/sculptor.ts` (NEU)
  - `cockpit/src/lib/automation/__tests__/sculptor.test.ts` (NEU)
- **Expected behavior (Pseudocode):**
  ```typescript
  export async function sculptRule(nlInput: string, userId: string): Promise<SculptResult> {
    let lastError: string | null = null;
    let totalCost = 0;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const prompt = buildPrompt(SYSTEM_PROMPT, FEW_SHOTS, nlInput, lastError);
      const response = await invokeBedrock(prompt);
      const cost = calculateSculptCost(response.usage, response.modelId);
      totalCost += cost;
      let healed: string;
      try { healed = healJsonEscapes(response.text); }
      catch (e) { lastError = "JSON-Escape-Heal failed: " + e.message; continue; }
      const parsed = SculptSuccessSchema.safeParse(JSON.parse(healed));
      const rejectParsed = SculptRejectSchema.safeParse(JSON.parse(healed));
      await insertAuditLog({action:"automation_rule.sculpt_attempt", actor_id:userId, metadata:{nl_input:nlInput, attempt_count:attempt, sculptor_cost_usd:cost, result_status: parsed.success?"success":rejectParsed.success?"reject":"validation_fail", result_payload: parsed.data ?? rejectParsed.data ?? null}});
      if (parsed.success) return {status:"success", payload:parsed.data, totalCostUsd:totalCost, attemptCount:attempt};
      if (rejectParsed.success) return {status:"reject", reason:rejectParsed.data, totalCostUsd:totalCost, attemptCount:attempt};
      lastError = parsed.error.message;
    }
    return {status:"validation_fail", reason:lastError, totalCostUsd:totalCost, attemptCount:2};
  }
  ```
- **Verification:** Vitest 8 Real-World-Prompts + 1 Re-Prompt-Loop-Test (mock 1st-call malformed, 2nd-call success). Audit-Insert-Mock verifiziert.
- **Dependencies:** MT-1, MT-2, MT-3, MT-4, MT-5

### MT-7: sculptor-dedup.ts + Live-DB-Test
- **Goal:** `assertNotDuplicateRule(rule, userId)` — wirft bei Match auf `(name, trigger_event, JSON.stringify(conditions+actions))`.
- **Files:**
  - `cockpit/src/lib/automation/sculptor-dedup.ts` (NEU)
  - `cockpit/__tests__/automation/sculptor-dedup.test.ts` (NEU — Live-DB gegen Coolify per `coolify-test-setup.md`)
- **Expected behavior:** SAVEPOINT-Pattern bei expected DuplicateRuleError. Insert 1 Rule fuer userId → 2nd Insert mit identischen Feldern → throws. Distinct Rule passes.
- **Verification:** Live-DB-Test via `TEST_DATABASE_URL` + node:20 Docker-Pattern PASS.
- **Dependencies:** MT-0

### MT-8: nl-history.ts (Listing-Query)
- **Goal:** `listNlSculptHistory(limit, ownerScope?)` returnt letzte 50 audit_log-`sculpt_attempt`-Eintraege.
- **Files:**
  - `cockpit/src/lib/automation/nl-history.ts` (NEU)
  - `cockpit/src/lib/automation/__tests__/nl-history.test.ts` (NEU — Live-DB gegen Coolify)
- **Expected behavior:** Query `SELECT id, actor_id, created_at, metadata FROM audit_log WHERE action='automation_rule.sculpt_attempt' AND ($1::uuid IS NULL OR actor_id=$1) ORDER BY created_at DESC LIMIT $2`. Returnt `NlSculptHistoryRow[]`.
- **Verification:** Live-DB-Test: 3 sculpt_attempt-Inserts, dann query, returnt 3 Rows in DESC-Order.
- **Dependencies:** MT-0

### MT-9: Cockpit-Records-Sync (Partial — SLC-752 done)
- **Goal:** SLC-752 Status `done` in slices/INDEX.md. FEAT-751 bleibt `in_progress` (5 weitere Slices folgen). BL-435 bleibt `in_progress`.
- **Files:**
  - `slices/INDEX.md` (MOD)
  - `docs/MIGRATIONS.md` (MOD) — MIG-036 Eintrag (Date, Scope, Affected Areas)
  - `docs/DECISIONS.md` (MOD) — DEC-205, DEC-208, DEC-209, DEC-211 als `accepted` markieren (waren in V7.5-Architecture als `accepted` markiert, hier Status-Sync nach Code).
- **Verification:** Cockpit-Reload sieht SLC-752 als done + MIG-036 in History.
- **Dependencies:** MT-1..MT-8 PASS

## Risks & Mitigations

- **R1** Bedrock-Sculpt-Accuracy <70% bei 8 Real-World-Prompts — Architecture-Mitigation: Multi-Turn als V7.6-Polish. **In V7.5:** falls AC3 nicht erreicht: Slice bleibt offen, /qa flags es als Blocker, dann Few-Shots erweitern (8 → 12) als MT-Erweiterung oder Multi-Turn-Switch.
- **R2** Bedrock `eu-central-1` Quota-Throttle bei Vitest-Test-Lauf — **Mitigation:** Sculpt-Tests laufen 1x lokal, dann gemockt. Production-Pfad bleibt real-Bedrock.
- **R3** `field-whitelist.ts` Drift zwischen V6.2 und V7.5 — **Mitigation:** sculptor-schema.ts importiert FIELD_WHITELIST direkt (Single-Source-of-Truth, kein Duplicate-Constant).
- **R4** healJsonEscapes-Pattern in IS-SLC-109 existiert, aber Code-Patch koennte aus Repo-Drift drift sein — **Mitigation:** MT-2 prueft auf bestehende `lib/json/`-Files vor Anlage, reuse wo moeglich.
- **R5** MIG-036 vs. bestehende Workflow-Engine — `created_via` ist additiv mit DEFAULT, kein Code-Path bricht. Production-Workflow-Rules bekommen Default `click_wizard`.

## Dependencies

- **V3 FEAT-305** Bedrock-Client (Region-Pin in MT-1)
- **V6.2 FEAT-621** automation_rules-Schema + field-whitelist.ts
- **IS-SLC-109** healJsonEscapes-Pattern (Reuse oder Portierung)
- **V7.2 SLC-721** Coolify-Test-Setup fuer Live-DB-Tests (MT-7, MT-8)

## Verification & Tests

- TSC clean
- MIG-036 applied + DDL-verifiziert
- Vitest npm run test:all 930 → ~960+ PASS (range +30..+40)
- Sculpt-Accuracy ≥7/8 auf 8 Real-World-Prompts
- Bedrock-Region-Drift-Test passes
- Live-DB-Tests sculptor-dedup + nl-history PASS via node:20 Docker

## Open Points

- Real-Bedrock-Vitest vs. Mock-Bedrock-Vitest: Architecture sagt "Mock-Bedrock-Vitest-Standard". MT-6 nutzt vi.mock fuer bedrock-client. Real-Bedrock-Test wird in /qa Live-Smoke abgedeckt.

## Files Reviewed (Slice-Planning)

- `cockpit/src/lib/llm/bedrock-client.ts` (Reuse + MT-1-Erweiterung)
- `cockpit/src/lib/automation/field-whitelist.ts` (Single-Source-of-Truth fuer FIELD_WHITELIST)
- `docs/ARCHITECTURE.md` V7.5-Section (DEC-205, 208, 209, 211)
- Memory `feedback_bedrock_json_drift_pattern.md` (IS-SLC-109 healJsonEscapes)
- Memory `reference_coolify_test_setup.md` (Live-DB-Test-Pattern)

## Recommended Implementation Skill

`/backend` fuer MT-0..MT-8 (Migration + 6 Lib-Files + Tests).
`/qa` nach MT-8: TSC + Vitest + Live-DB-Tests + Sculpt-Accuracy-Bericht.
Kein Live-Smoke an dieser Stelle (UI fehlt — kommt SLC-753).
