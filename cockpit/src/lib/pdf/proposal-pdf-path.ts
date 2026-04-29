// DEC-111: Storage-Pfad fuer Angebot-PDFs ist {user_id}/{proposal_id}/v{version}.pdf.
// Im Internal-Test-Mode (DEC-113) wird '.testmode.pdf' an Stelle von '.pdf' geschrieben,
// damit der User im File-Manager sofort erkennt, dass es ein Test-Output ist.
// Dieses Modul ist single source of truth fuer Pfad-Bauen und -Parsen — Renderer,
// Cron, Audit und QA-Smokes greifen alle darauf zu.

export const PROPOSAL_PDF_BUCKET = "proposal-pdfs";

export function getProposalPdfPath(
  userId: string,
  proposalId: string,
  version: number,
  isTestMode: boolean = false,
): string {
  if (!userId || !proposalId) {
    throw new Error("getProposalPdfPath: userId und proposalId sind Pflicht");
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("getProposalPdfPath: version muss positive Ganzzahl sein");
  }
  const suffix = isTestMode ? ".testmode.pdf" : ".pdf";
  return `${userId}/${proposalId}/v${version}${suffix}`;
}

export type ParsedProposalPdfPath = {
  userId: string;
  proposalId: string;
  version: number;
  isTestMode: boolean;
};

export function parseProposalPdfPath(path: string): ParsedProposalPdfPath | null {
  if (!path) return null;
  const segments = path.split("/");
  if (segments.length !== 3) return null;
  const [userId, proposalId, file] = segments;
  if (!userId || !proposalId || !file) return null;

  const testMatch = file.match(/^v(\d+)\.testmode\.pdf$/);
  if (testMatch) {
    return { userId, proposalId, version: Number.parseInt(testMatch[1], 10), isTestMode: true };
  }
  const normalMatch = file.match(/^v(\d+)\.pdf$/);
  if (normalMatch) {
    return { userId, proposalId, version: Number.parseInt(normalMatch[1], 10), isTestMode: false };
  }
  return null;
}
