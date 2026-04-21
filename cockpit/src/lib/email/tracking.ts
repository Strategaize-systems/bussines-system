/**
 * Email Tracking — Pixel-Injection + Link-Wrapping (FEAT-506, DEC-066)
 *
 * Injiziert ein 1x1 Tracking-Pixel und wrappt Links in ausgehenden E-Mails,
 * damit Open- und Click-Events ueber /api/track/[id] erfasst werden koennen.
 */

function getTrackingBaseUrl(): string {
  return (
    process.env.TRACKING_BASE_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

/**
 * Wraps all href links in HTML with tracking redirect URLs.
 * Replaces <a href="https://example.com"> with <a href="/api/track/{id}?t=click&url=...&idx=N">
 */
function wrapLinks(html: string, trackingId: string, baseUrl: string): string {
  let linkIndex = 0;
  return html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (_match, before, url, after) => {
      // Don't wrap mailto: links, tel: links, or tracking URLs (avoid double-wrapping)
      if (url.startsWith("mailto:") || url.startsWith("tel:") || url.includes("/api/track/")) {
        return _match;
      }
      const idx = linkIndex++;
      const trackUrl = `${baseUrl}/api/track/${trackingId}?t=click&url=${encodeURIComponent(url)}&idx=${idx}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    }
  );
}

/**
 * Appends a 1x1 transparent tracking pixel to the HTML body.
 */
function appendPixel(html: string, trackingId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/track/${trackingId}?t=open`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;" alt="" />`;

  // Insert before </body> if present, otherwise append
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Converts plain text to minimal HTML for tracking injection.
 * Preserves line breaks and basic formatting.
 */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
  return `<!DOCTYPE html><html><body>${escaped}</body></html>`;
}

/**
 * Main entry point: injects tracking pixel and wraps links into HTML content.
 * Returns the modified HTML with tracking embedded.
 */
export function injectTracking(html: string, trackingId: string): string {
  const baseUrl = getTrackingBaseUrl();
  let result = wrapLinks(html, trackingId, baseUrl);
  result = appendPixel(result, trackingId, baseUrl);
  return result;
}
