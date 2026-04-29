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
  notes: z
    .string()
    .max(5000, "Notizen max 5000 Zeichen")
    .nullable()
    .optional(),
  contact_id: z.string().uuid("Ungueltige Contact-ID").nullable().optional(),
  company_id: z.string().uuid("Ungueltige Company-ID").nullable().optional(),
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
