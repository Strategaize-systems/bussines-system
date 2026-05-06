// V6.2 SLC-625 — UTM-Helpers (Pure)
//
// Wird vom Public Redirect-Endpoint /r/[token] genutzt:
// utm-Params an target_url anhaengen, falls noch nicht vorhanden.

export interface CampaignLinkUtm {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
}

const UTM_KEYS: Array<keyof CampaignLinkUtm> = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

/**
 * Append UTM-Params to target_url. Existing URL-Params werden NICHT
 * ueberschrieben (target_url-eigene Params haben Priority).
 */
export function appendUtmIfMissing(
  targetUrl: string,
  link: CampaignLinkUtm
): string {
  const url = new URL(targetUrl);
  for (const key of UTM_KEYS) {
    const val = link[key];
    if (val == null || val === "") continue;
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, val);
    }
  }
  return url.toString();
}
