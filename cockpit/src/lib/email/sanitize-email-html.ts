// HTML-Sanitization fuer Inbound-Email-Rendering. Schliesst Stored-XSS-Pfad in
// email-detail.tsx (vorher 4-Zeilen-Regex, trivial umgehbar via <svg onload>,
// <img onerror>, Entity-Encoding, data:text/html). Pattern P-078, siehe
// dev-system/docs/PATTERN_LIBRARY/11-html-sanitization.md.
//
// Defense-in-Depth zusammen mit P-079 (email-html-iframe.tsx Sandbox).

import DOMPurify from "isomorphic-dompurify";

export const ALLOWED_TAGS: readonly string[] = [
  // Block-Level
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "div", "blockquote", "pre",
  // Inline
  "b", "i", "strong", "em", "u", "s", "span", "small", "code", "sub", "sup",
  // Lists
  "ul", "ol", "li", "dl", "dt", "dd",
  // Links + Media
  "a", "img",
  // Tables
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
];

export const ALLOWED_ATTR: readonly string[] = [
  "href", "src", "alt", "title", "target",
  // table layout — kein style, aber colspan/rowspan/align fuer Tabellen-Render legitim
  "colspan", "rowspan", "align",
  // img dims — schuetzt vor Layout-Sprengen, kein Sicherheits-Risiko
  "width", "height",
];

// Erlaubte URL-Schemes. Strikte Whitelist:
//   - http(s), mailto, tel, cid (Email-Inline-Image-Reference)
//   - data:image/(png|jpeg|gif|webp);... — explizit erlaubt
//   - Relative URLs (#anchor, /path, ./page, ../page) ohne Scheme
// NICHT erlaubt: data:image/svg+xml (SVG kann Script enthalten),
// data:text/html (XSS-Vehikel), javascript:, vbscript:, file:, ftp:.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|cid):|data:image\/(?:png|jpeg|gif|webp)[;,]|#|\/|\.{1,2}\/)/i;

// Belt-and-Suspenders fuer data:-URIs auf src/href — die DOMPurify-Logik
// fuer DATA_URI_TAGS hat Sonderpfade, die data:image/svg+xml durchlassen
// koennen. Hook prueft jeden src/href explizit.
function isUnsafeDataUri(value: string): boolean {
  if (!/^data:/i.test(value)) return false;
  // Nur data:image/(png|jpeg|gif|webp); ist erlaubt.
  return !/^data:image\/(?:png|jpeg|gif|webp)[;,]/i.test(value);
}

/**
 * Sanitisiert untrusted HTML fuer das Email-Rendering.
 * Whitelist-basiert (Tags + Attrs + URL-Schemes), entfernt alle on*-Handler,
 * style-Attribute, script/iframe/object/embed/svg/style/link/meta/base/form,
 * javascript:- und data:text/html-URLs.
 *
 * @param html Roh-HTML aus untrusted Quelle (z.B. Inbound-Email body_html).
 * @returns Whitelist-konformer HTML-String.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOWED_URI_REGEXP,
    // ADD_URI_SAFE_ATTR: Attrs deren Werte KEINE URLs sind. Ohne diesen
    // Eintrag wuerde der strenge ALLOWED_URI_REGEXP auch auf target="_blank"
    // o.ae. angewendet und das Attribut entfernt werden.
    ADD_URI_SAFE_ATTR: ["target", "alt", "title", "colspan", "rowspan", "align", "width", "height"],
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "svg", "link", "meta", "base", "form", "input", "button", "textarea", "audio", "video", "source"],
    FORBID_ATTR: ["style", "srcdoc", "formaction", "background", "poster"],
  });

  return typeof clean === "string" ? clean : String(clean);
}

// Beim ersten Aufruf einmaliger Hook-Setup. addHook ist idempotent — gleicher
// Listener registriert sich nur einmal, aber globaler State ist trotzdem
// suboptimal. Wir nutzen ein Module-Level-Flag um Mehrfach-Register zu vermeiden.
let hookInstalled = false;

function installAfterSanitizeAttributesHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  // a target=_blank bekommt automatisch rel=noopener noreferrer
  DOMPurify.addHook("afterSanitizeAttributes", (node: Element) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  // data:image/svg+xml + andere unsichere data:-URIs auf src/href entfernen.
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if ((data.attrName === "src" || data.attrName === "href") && isUnsafeDataUri(data.attrValue)) {
      data.keepAttr = false;
    }
  });
}

installAfterSanitizeAttributesHook();
