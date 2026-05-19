// V7.6 SLC-762 MT-3 — System-Prompt + User-Prompt-Builder fuer Custom-Reports.
//
// Kurz und generisch — der User definiert das prompt_template selbst. Wir
// liefern nur den minimalen Frame (Rolle + Sprache + Format-Hinweis) und
// haengen Datenkontext + User-Frage dran.

export const CUSTOM_REPORT_SYSTEM_PROMPT = `Du bist ein KI-Assistent fuer ein deutsches B2B-CRM.
Beantworte die folgende Frage auf Basis der bereitgestellten Daten.
Antworte auf Deutsch, kompakt, mit Markdown-Bullet-Listen wenn sinnvoll.
Wenn die Datenbasis zur Frage nichts hergibt, sage das ehrlich statt Inhalte zu erfinden.`;

export interface CustomReportPromptInput {
  contextBlock: string;
  promptTemplate: string;
}

export function buildCustomReportUserPrompt(
  input: CustomReportPromptInput
): string {
  return [
    "=== DATENKONTEXT ===",
    input.contextBlock,
    "",
    "=== FRAGE ===",
    input.promptTemplate,
  ].join("\n");
}
