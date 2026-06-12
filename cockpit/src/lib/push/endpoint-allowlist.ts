// V8.15 SLC-913 MT-5 (ISSUE-119): SSRF-Schutz fuer Web-Push-Endpoints.
//
// web-push POSTet server-seitig an die in user_settings.push_subscription
// gespeicherte endpoint-URL. Ohne Allowlist kann ein manipulierter Client
// interne Ziele (Loopback, RFC-1918, Link-Local/Cloud-Metadata, interne
// Docker-Hostnamen) als "Push-Service" registrieren und den Server zu
// Requests dagegen bringen. Allowlist-only: alles ausserhalb der bekannten
// Browser-Push-Services wird rejected — damit sind private IPs implizit mit
// abgedeckt.
//
// Cross-Repo-Origin (BS V8.15) — Reuse-Quelle fuer OP/IS/immoscheckheft,
// sobald dort Web-Push eingefuehrt wird (strategaize-pattern-reuse.md).

const EXACT_HOSTS = new Set([
  "fcm.googleapis.com", // Chrome / Chromium (FCM)
  "web.push.apple.com", // Safari (APNs Web Push)
]);

const SUFFIX_HOSTS = [
  ".push.services.mozilla.com", // Firefox (autopush, z.B. updates.push.services.mozilla.com)
  ".notify.windows.com", // Edge (WNS, z.B. wns2-par02p.notify.windows.com)
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;

  const host = url.hostname.toLowerCase();
  if (EXACT_HOSTS.has(host)) return true;
  return SUFFIX_HOSTS.some((suffix) => host.endsWith(suffix));
}
