import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

/**
 * Renders legal Markdown (Datenschutz / Impressum) to HTML.
 *
 * Strategaize-Standard per feedback_email_render_remark_pattern:
 * remark@15 + remark-html@16 + remark-gfm@4.
 *
 * GFM is required for the Drittanbieter-table in COMPLIANCE drafts.
 */
export async function renderLegalMarkdown(markdown: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  return String(file);
}
