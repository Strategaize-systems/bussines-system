// V7.6 SLC-762 — Shared Types fuer Custom-Reports-Modul.
//
// Keine `"use server"` Direktive — Types/Interfaces sind erlaubt und werden
// von Server-Actions, Tests, dem Runner und (spaeter in SLC-763) dem
// Frontend wiederverwendet.

import type { KIWorkspaceScope, ReportResult } from "@/components/ki-workspace/types";

export type CustomReportContextType = "mein-tag" | "cockpit";

/** Row aus public.custom_reports (10 Spalten, MIG-037). */
export interface CustomReportRow {
  id: string;
  owner_user_id: string;
  context_type: CustomReportContextType;
  name: string;
  prompt_template: string;
  description: string | null;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface SaveCustomReportInput {
  name: string;
  prompt_template: string;
  context_type: CustomReportContextType;
  description?: string | null;
}

export type SaveCustomReportResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "duplicate_name" | "validation" | "unauthenticated" | "infra";
      message: string;
    };

export interface ListCustomReportsInput {
  context_type: CustomReportContextType;
}

export type ListCustomReportsResult =
  | { ok: true; items: CustomReportRow[] }
  | { ok: false; code: "unauthenticated" | "infra"; message: string };

export interface RunCustomReportInput {
  id: string;
  scope: KIWorkspaceScope;
}

export type RunCustomReportResult =
  | { ok: true; result: ReportResult }
  | {
      ok: false;
      code: "not_found" | "unauthenticated" | "infra" | "bedrock";
      message: string;
    };

export interface RenameCustomReportInput {
  id: string;
  name: string;
}

export type RenameCustomReportResult =
  | { ok: true }
  | {
      ok: false;
      code: "duplicate_name" | "validation" | "not_found" | "unauthenticated" | "infra";
      message: string;
    };

export interface DeleteCustomReportInput {
  id: string;
}

export type DeleteCustomReportResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_found" | "unauthenticated" | "infra";
      message: string;
    };
