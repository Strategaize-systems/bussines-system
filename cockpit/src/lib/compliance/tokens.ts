/**
 * Erlaubte Tokens fuer Compliance-Templates (FEAT-523, V5.2).
 * Token-Syntax: {token_name} — Mini-Variablen-Engine in variables.ts
 */

export type ComplianceToken = {
  name: string;
  description: string;
  example: string;
};

export const COMPLIANCE_TOKENS: ComplianceToken[] = [
  {
    name: "user_name",
    description: "Dein Anzeigename (aus Profil)",
    example: "Immo Bellaerts",
  },
  {
    name: "user_email",
    description: "Deine E-Mail-Adresse",
    example: "immo@bellaerts.de",
  },
  {
    name: "firma",
    description: "Dein Firmenname (aus Profil)",
    example: "Strategaize",
  },
  {
    name: "kontakt_name",
    description: "Name des Empfaengers (aus Kontakt)",
    example: "Max Mustermann",
  },
  {
    name: "kontakt_email",
    description: "E-Mail-Adresse des Empfaengers",
    example: "max@mustermann.de",
  },
  {
    name: "kontakt_firma",
    description: "Firma des Empfaengers",
    example: "Mustermann GmbH",
  },
];

export type ComplianceTokenName = (typeof COMPLIANCE_TOKENS)[number]["name"];

export type ComplianceVariableMap = Partial<Record<string, string>>;
