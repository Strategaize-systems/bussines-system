import { z } from "zod";

// V5.5 SLC-552: Form-Schemas fuer Workspace-Editor + Position-Liste.
// Wird browser-side (RHF/Validation) und server-side (Server Actions) genutzt.

export const PROPOSAL_TAX_RATES = [0, 7, 19] as const;

export const proposalEditSchema = z.object({
  title: z
    .string()
    .min(1, "Titel ist Pflicht")
    .max(255, "Titel max 255 Zeichen"),
  tax_rate: z.union([z.literal(0), z.literal(7), z.literal(19)]),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss YYYY-MM-DD sein")
    .nullable()
    .optional(),
  payment_terms: z
    .string()
    .max(2000, "Konditionen max 2000 Zeichen")
    .nullable()
    .optional(),
  // V5.5 SLC-552 QA-Fix: 'notes' aus Schema entfernt — DB-Spalte heisst
  // scope_notes (Legacy V2-Bestand). UPDATE mit notes-Key wuerde Postgres-
  // Fehler "column does not exist" werfen. Workspace-Editor hat das Feld
  // ohnehin nicht; Schema-Cleanup verhindert latenten Bug.
  contact_id: z.string().uuid("Ungueltige Contact-ID").nullable().optional(),
  company_id: z.string().uuid("Ungueltige Company-ID").nullable().optional(),
  // V5.6 SLC-562 — Skonto-Felder (DEC-116). Beide nullable, beide-oder-keiner
  // wird zusaetzlich in updateProposal via validateSkonto erzwungen, weil zod
  // kein cross-field-CHECK out-of-the-box hat.
  skonto_percent: z
    .number()
    .gt(0, "Skonto-Prozent muss > 0 sein")
    .lt(10, "Skonto-Prozent muss < 10 sein")
    .nullable()
    .optional(),
  skonto_days: z
    .number()
    .int("Skonto-Tage muss eine ganze Zahl sein")
    .gt(0, "Skonto-Tage muss > 0 sein")
    .lte(90, "Skonto-Tage muss <= 90 sein")
    .nullable()
    .optional(),
});

export type ProposalEditInput = z.infer<typeof proposalEditSchema>;

export const proposalItemSchema = z.object({
  quantity: z.number().positive("Menge > 0").max(99999, "Menge max 99999"),
  unit_price_net: z
    .number()
    .min(0, "Einzelpreis >= 0")
    .max(999999.99, "Einzelpreis max 999.999,99"),
  discount_pct: z
    .number()
    .min(0, "Discount >= 0")
    .max(100, "Discount <= 100"),
});

export type ProposalItemInput = z.infer<typeof proposalItemSchema>;

export const proposalItemUpdateSchema = proposalItemSchema.partial();

export type ProposalItemUpdateInput = z.infer<typeof proposalItemUpdateSchema>;
