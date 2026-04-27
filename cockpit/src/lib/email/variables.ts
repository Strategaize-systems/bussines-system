// =============================================================
// Variablen-Resolver (SLC-534 MT-1)
// =============================================================
// Wandelt Deal+Contact+Company in PlaceholderValues fuer den
// Branding-Renderer und applyPlaceholders. Defensiv: leere Strings
// statt null/undefined, damit der Renderer nie auf undefined trifft.
//
// Der Resolver wird sowohl im Compose-Studio (Live-Preview-Vars)
// als auch im Send-Pfad (sendComposedEmail) genutzt — Single-
// Source-of-Truth fuer Var-Mapping.

import type { PlaceholderValues } from "./placeholders";

export type ResolverDeal = {
  title?: string | null;
  name?: string | null;
} | null;

export type ResolverContact = {
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
} | null;

export type ResolverCompany = {
  name?: string | null;
} | null;

function s(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function resolveVarsFromDeal(
  deal: ResolverDeal,
  contact: ResolverContact,
  company: ResolverCompany,
): PlaceholderValues {
  const dealLabel = s(deal?.title) || s(deal?.name);
  const firma = s(company?.name) || dealLabel;

  return {
    vorname: s(contact?.first_name),
    nachname: s(contact?.last_name),
    firma,
    position: s(contact?.position),
    deal: dealLabel,
  };
}
