// =============================================================
// Process Check — Rule-based deal completeness validation
// =============================================================
//
// Mirrors the required-field logic from pipeline/actions.ts
// but as a read-only check for the Deal Workspace UI.

export interface ProcessCheckItem {
  label: string;
  passed: boolean;
  required: boolean;
}

/**
 * Evaluates deal completeness based on universal and stage-specific rules.
 * Returns an array of check items for display in the ProcessCheckPanel.
 */
export function getProcessChecks(deal: any, stageName: string): ProcessCheckItem[] {
  const checks: ProcessCheckItem[] = [
    {
      label: "Deal-Wert gesetzt",
      passed: deal.value != null && deal.value > 0,
      required: false,
    },
    {
      label: "Kontakt zugeordnet",
      passed: !!deal.contact_id,
      required: false,
    },
    {
      label: "Firma zugeordnet",
      passed: !!deal.company_id,
      required: false,
    },
    {
      label: "Erwarteter Abschluss",
      passed: !!deal.expected_close_date,
      required: false,
    },
    {
      label: "Nächste Aktion definiert",
      passed: !!deal.next_action,
      required: false,
    },
  ];

  // Apply stage-specific required flags
  const stageConfig = STAGE_CHECKS[stageName];
  if (stageConfig) {
    for (const check of checks) {
      if (stageConfig.requiredLabels.includes(check.label)) {
        check.required = true;
      }
    }
    // Add stage-specific additional checks
    if (stageConfig.additional) {
      for (const additionalFn of stageConfig.additional) {
        checks.push(additionalFn(deal));
      }
    }
  }

  return checks;
}

// Stage-specific configuration
const STAGE_CHECKS: Record<
  string,
  {
    requiredLabels: string[];
    additional?: Array<(deal: any) => ProcessCheckItem>;
  }
> = {
  "Angebot vorbereitet": {
    requiredLabels: ["Deal-Wert gesetzt"],
  },
  "Angebot offen": {
    requiredLabels: ["Deal-Wert gesetzt"],
  },
  "Verhandlung / Einwände": {
    requiredLabels: ["Deal-Wert gesetzt", "Kontakt zugeordnet"],
  },
  "Gewonnen": {
    requiredLabels: ["Deal-Wert gesetzt"],
  },
  "Verloren": {
    requiredLabels: [],
    additional: [
      (deal) => ({
        label: "Verlustgrund angegeben",
        passed: !!deal.won_lost_reason,
        required: true,
      }),
    ],
  },
  "Inaktiv / disqualifiziert": {
    requiredLabels: [],
    additional: [
      (deal) => ({
        label: "Verlustgrund angegeben",
        passed: !!deal.won_lost_reason,
        required: true,
      }),
    ],
  },
};
