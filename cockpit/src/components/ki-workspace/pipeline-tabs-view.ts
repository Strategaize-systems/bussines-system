// SLC-666 MT-7 — Pure-Function-Parser fuer "## Pipeline: X"-Sektionen
// im Top-Chancen-Bedrock-Output. Erlaubt clientseitigen Tab-Wechsel
// ohne Re-Bedrock-Call.

export interface PipelineSection {
  name: string;
  body: string;
}

/**
 * Parst Markdown nach Sektion-Headern wie "## Pipeline: Multiplikatoren".
 * Inhalt einer Pipeline-Sektion = alles bis zur naechsten "## Pipeline:"-Zeile
 * oder bis zum naechsten Top-Level-Header (z.B. "## KI-Kommentar").
 *
 * Returnt leeres Array, wenn keine Pipeline-Sektionen gefunden.
 */
export function parsePipelineSections(markdown: string): PipelineSection[] {
  if (!markdown) return [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: PipelineSection[] = [];
  let current: PipelineSection | null = null;

  for (const line of lines) {
    const pipelineMatch = /^##\s+Pipeline:\s*(.+?)\s*$/.exec(line);
    if (pipelineMatch) {
      if (current) sections.push(current);
      current = { name: pipelineMatch[1].trim(), body: "" };
      continue;
    }
    // Andere ##-Header beenden die aktuelle Pipeline-Sektion (z.B. "## KI-Kommentar")
    const otherH2 = /^##\s+/.test(line) && !line.startsWith("## Pipeline:");
    if (otherH2 && current) {
      sections.push(current);
      current = null;
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({ name: s.name, body: s.body.trim() }));
}

/**
 * Extrahiert den "## KI-Kommentar"-Block (oder anderen Trailing-Block ohne
 * Pipeline-Header) als gemeinsamen Footer unter den Tabs.
 */
export function extractTrailingBlock(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const trailingLines: string[] = [];
  let inTrailing = false;

  for (const line of lines) {
    if (/^##\s+/.test(line) && !line.startsWith("## Pipeline:")) {
      inTrailing = true;
    } else if (/^##\s+Pipeline:/.test(line)) {
      inTrailing = false;
      trailingLines.length = 0;
    }
    if (inTrailing) trailingLines.push(line);
  }
  return trailingLines.join("\n").trim();
}
