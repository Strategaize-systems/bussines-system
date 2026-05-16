// V7.5 SLC-752 MT-7 — Pure-Function-Tests fuer sculptor-dedup.
//
// Diese Suite testet `assertNotDuplicateRule` ohne DB (jsdom-Standard-Config).
// Die Live-DB-Verifikation liegt unter `__tests__/automation/sculptor-dedup-
// live.test.ts` und laeuft via `npm run test:rls` gegen die Coolify-DB.

import { describe, it, expect } from "vitest";
import {
  DuplicateRuleError,
  assertNotDuplicateRule,
} from "../sculptor-dedup";
import type { Action, Condition, TriggerEvent } from "@/types/automation";

const USER_ID = "00000000-0000-4000-9999-000000000099";
const EXISTING_ID = "11111111-1111-4111-9111-111111111111";

function baseRule() {
  return {
    name: "Standard-Rule",
    trigger_event: "deal.stage_changed" as TriggerEvent,
    conditions: [{ field: "value", op: "gt", value: 1000 } satisfies Condition],
    actions: [
      {
        type: "create_task",
        params: { title: "Follow-up", due_in_days: 2 },
      } satisfies Action,
    ],
  };
}

describe("assertNotDuplicateRule (Pure-Function)", () => {
  it("passes durch wenn Candidates leer", () => {
    expect(() => assertNotDuplicateRule([], baseRule(), USER_ID)).not.toThrow();
  });

  it("passes durch wenn keine Candidate matched (verschiedene conditions)", () => {
    const candidates = [
      {
        id: EXISTING_ID,
        conditions: [{ field: "value", op: "lt" as const, value: 100 }],
        actions: baseRule().actions,
      },
    ];
    expect(() => assertNotDuplicateRule(candidates, baseRule(), USER_ID)).not.toThrow();
  });

  it("passes durch wenn keine Candidate matched (verschiedene actions)", () => {
    const candidates = [
      {
        id: EXISTING_ID,
        conditions: baseRule().conditions,
        actions: [
          {
            type: "send_email_template" as const,
            params: { template_id: "00000000-0000-4000-8000-000000000000", mode: "draft" as const },
          },
        ],
      },
    ];
    expect(() => assertNotDuplicateRule(candidates, baseRule(), USER_ID)).not.toThrow();
  });

  it("wirft DuplicateRuleError bei identischen conditions+actions", () => {
    const candidates = [
      {
        id: EXISTING_ID,
        conditions: baseRule().conditions,
        actions: baseRule().actions,
      },
    ];
    expect(() => assertNotDuplicateRule(candidates, baseRule(), USER_ID)).toThrow(DuplicateRuleError);
  });

  it("Error-Payload enthaelt existingRuleId + userId + ruleName", () => {
    const candidates = [
      {
        id: EXISTING_ID,
        conditions: baseRule().conditions,
        actions: baseRule().actions,
      },
    ];
    try {
      assertNotDuplicateRule(candidates, baseRule(), USER_ID);
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DuplicateRuleError);
      const err = e as DuplicateRuleError;
      expect(err.existingRuleId).toBe(EXISTING_ID);
      expect(err.ownerUserId).toBe(USER_ID);
      expect(err.ruleName).toBe("Standard-Rule");
    }
  });

  it("matched auch bei vertauschter Key-Order in conditions (canonical-Stringify)", () => {
    const candidates = [
      {
        id: EXISTING_ID,
        // Key-Order anders: { value, op, field } statt { field, op, value }
        conditions: [{ value: 1000, op: "gt", field: "value" } as unknown as Condition],
        actions: baseRule().actions,
      },
    ];
    expect(() => assertNotDuplicateRule(candidates, baseRule(), USER_ID)).toThrow(DuplicateRuleError);
  });

  it("matched bei mehreren actions in gleicher Reihenfolge", () => {
    const ruleMulti = {
      ...baseRule(),
      actions: [
        baseRule().actions[0],
        {
          type: "create_activity" as const,
          params: { type: "note" as const, title: "Mark" },
        },
      ],
    };
    const candidates = [
      {
        id: EXISTING_ID,
        conditions: ruleMulti.conditions,
        actions: ruleMulti.actions,
      },
    ];
    expect(() => assertNotDuplicateRule(candidates, ruleMulti, USER_ID)).toThrow(DuplicateRuleError);
  });

  it("matched NICHT bei mehreren actions in verschiedener Reihenfolge", () => {
    const ruleMulti = {
      ...baseRule(),
      actions: [
        baseRule().actions[0],
        {
          type: "create_activity" as const,
          params: { type: "note" as const, title: "Mark" },
        },
      ],
    };
    const candidates = [
      {
        id: EXISTING_ID,
        conditions: ruleMulti.conditions,
        actions: [ruleMulti.actions[1], ruleMulti.actions[0]], // reversed
      },
    ];
    expect(() => assertNotDuplicateRule(candidates, ruleMulti, USER_ID)).not.toThrow();
  });
});
