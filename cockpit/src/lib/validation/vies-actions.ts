"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { validateEuVatId } from "./vat-id";
import { lookupVatId, type ViesLookupSource } from "./vies-client";

export interface ViesLookupActionResult {
  is_valid: boolean;
  source: ViesLookupSource;
  format_country: string | null;
  format_error: string | null;
  vies_name: string | null;
}

/**
 * Server-Action fuer Form-getriggerten VIES-Lookup.
 *
 * Validiert Format zuerst (validateEuVatId), dann ggf. VIES via lookupVatId.
 * UI-Caller ruft via use(action.result) oder Form-Action.
 */
export async function lookupVatIdAction(input: string): Promise<ViesLookupActionResult> {
  const trimmed = (input ?? "").trim().toUpperCase();
  const formatResult = validateEuVatId(trimmed);

  if (!formatResult.valid) {
    return {
      is_valid: false,
      source: "format_only",
      format_country: null,
      format_error: formatResult.error,
      vies_name: null,
    };
  }

  const country = formatResult.country!;
  const number = trimmed.slice(2);

  const supabase = createAdminClient();
  const result = await lookupVatId({
    country,
    number,
    is_format_valid: true,
    supabase,
  });

  return {
    is_valid: result.is_valid,
    source: result.source,
    format_country: country,
    format_error: null,
    vies_name: result.vies_response?.name ?? null,
  };
}
