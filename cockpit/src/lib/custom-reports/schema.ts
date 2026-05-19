// V7.6 SLC-762 — zod-Schemas fuer Custom-Reports-Inputs.
//
// Pure Values, kein `"use server"`. CHECK-Constraints in MIG-037 sind:
//   name             char_length BETWEEN 2 AND 80
//   prompt_template  char_length BETWEEN 10 AND 2000
//   context_type     IN ('mein-tag','cockpit')
// Defense-in-Depth: gleiche Bounds in der zod-Validate-Schicht, damit ein
// PostgreSQL-CHECK-Verletzungs-Fehler nie zum User durchschlaegt.

import { z } from "zod";

export const ContextTypeSchema = z.enum(["mein-tag", "cockpit"]);

export const NameSchema = z
  .string()
  .trim()
  .min(2, "Name muss mindestens 2 Zeichen lang sein.")
  .max(80, "Name darf maximal 80 Zeichen lang sein.");

export const PromptTemplateSchema = z
  .string()
  .trim()
  .min(10, "Prompt muss mindestens 10 Zeichen lang sein.")
  .max(2000, "Prompt darf maximal 2000 Zeichen lang sein.");

export const DescriptionSchema = z
  .string()
  .trim()
  .max(500, "Beschreibung darf maximal 500 Zeichen lang sein.")
  .optional()
  .nullable();

export const SaveCustomReportSchema = z.object({
  name: NameSchema,
  prompt_template: PromptTemplateSchema,
  context_type: ContextTypeSchema,
  description: DescriptionSchema,
});

export const ListCustomReportsSchema = z.object({
  context_type: ContextTypeSchema,
});

export const RunCustomReportSchema = z.object({
  id: z.string().uuid("id muss UUID sein."),
  scope: z.object({
    userId: z.string().min(1, "scope.userId fehlt."),
    dealId: z.string().optional(),
    teamId: z.string().optional(),
  }),
});

export const RenameCustomReportSchema = z.object({
  id: z.string().uuid("id muss UUID sein."),
  name: NameSchema,
});

export const DeleteCustomReportSchema = z.object({
  id: z.string().uuid("id muss UUID sein."),
});

/** Postgres-Error-Code fuer UNIQUE-Constraint-Violation. */
export const UNIQUE_VIOLATION = "23505";
