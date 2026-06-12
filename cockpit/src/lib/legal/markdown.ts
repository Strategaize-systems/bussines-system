import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { sanitizeEmailHtml } from "@/lib/email/sanitize-email-html";

/**
 * Renders legal Markdown (Datenschutz / Impressum) to HTML.
 *
 * Strategaize-Standard per feedback_email_render_remark_pattern:
 * remark@15 + remark-html@16 + remark-gfm@4.
 *
 * GFM is required for the Drittanbieter-table in COMPLIANCE drafts.
 *
 * V8.14 SLC-912 MT-3 (ISSUE-100): Der Output wird durch den DOMPurify-Sanitizer
 * (Whitelist-basiert, P-078 / lib/email/sanitize-email-html.ts, BS V8.10 SLC-892)
 * geleitet. remark-html laesst rohes HTML im Markdown durch (`sanitize:false`),
 * deshalb MUSS hier sanitisiert werden — sonst Stored-XSS auf der public DSE-Page
 * (/p/<slug>/datenschutz). script/iframe/svg/on*-Handler/javascript:-URLs werden
 * entfernt, legitimes Markdown-HTML (Headings, Listen, Tabellen, Links) bleibt.
 */
export async function renderLegalMarkdown(markdown: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  return sanitizeEmailHtml(String(file));
}
