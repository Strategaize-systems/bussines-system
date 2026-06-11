/**
 * Email Tracking — Pixel-Injection + Link-Wrapping (FEAT-506, DEC-066)
 *
 * Injiziert ein 1x1 Tracking-Pixel und wrappt Links in ausgehenden E-Mails,
 * damit Open- und Click-Events ueber /api/track/[id] erfasst werden koennen.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

function getTrackingBaseUrl(): string {
  return (
    process.env.TRACKING_BASE_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

function getHmacSecret(): string | null {
  const s = process.env.TRACKING_HMAC_SECRET;
  return s && s.length >= 16 ? s : null;
}

function computeSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(payload)
    .digest()
    .subarray(0, 8)
    .toString("base64url");
}

/**
 * Signiert eine Click-Tracking-URL gegen Manipulation (Open-Redirect-Schutz).
 * Returns null wenn TRACKING_HMAC_SECRET fehlt; Caller faellt dann auf
 * unsigned-Pfad zurueck (und /api/track verweigert ohne Sig die Weiterleitung).
 */
export function signTrackingUrl(
  trackingId: string,
  linkIndex: number,
  targetUrl: string,
): string | null {
  const secret = getHmacSecret();
  if (!secret) return null;
  return computeSignature(`${trackingId}|${linkIndex}|${targetUrl}`, secret);
}

/**
 * Verifiziert eine Tracking-URL-Signatur timing-safe.
 * False bei fehlendem Secret, leerer Signatur, Tampering oder Malformed-Input.
 */
export function verifyTrackingSignature(
  trackingId: string,
  linkIndex: number,
  targetUrl: string,
  providedSignature: string | null | undefined,
): boolean {
  if (!providedSignature) return false;
  const secret = getHmacSecret();
  if (!secret) return false;
  const expected = computeSignature(`${trackingId}|${linkIndex}|${targetUrl}`, secret);
  if (expected.length !== providedSignature.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(providedSignature, "utf8"),
    );
  } catch {
    return false;
  }
}

/**
 * Wraps all href links in HTML with tracking redirect URLs.
 * Replaces <a href="https://example.com"> with <a href="/api/track/{id}?t=click&url=...&idx=N&s=SIG">
 *
 * Wenn TRACKING_HMAC_SECRET fehlt wird der `s=`-Param weggelassen — die Track-Route
 * verweigert dann konsequent die Weiterleitung (fail-closed Open-Redirect-Schutz).
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
      const sig = signTrackingUrl(trackingId, idx, url);
      const sigParam = sig ? `&s=${sig}` : "";
      const trackUrl = `${baseUrl}/api/track/${trackingId}?t=click&url=${encodeURIComponent(url)}&idx=${idx}${sigParam}`;
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
