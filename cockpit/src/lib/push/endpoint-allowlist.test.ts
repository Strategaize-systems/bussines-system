import { describe, expect, it } from "vitest";
import { isAllowedPushEndpoint } from "./endpoint-allowlist";

// V8.15 SLC-913 MT-5 (ISSUE-119): SSRF-Schutz fuer Web-Push-Endpoints.
// Adversarial-Battery: interne Ziele, Scheme-Tricks, Host-Lookalikes.

describe("isAllowedPushEndpoint — legitime Push-Services", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/QOXkv2tCpkbXP9Bd",
  ])("erlaubt %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true);
  });

  it("erlaubt expliziten Port 443", () => {
    expect(
      isAllowedPushEndpoint("https://fcm.googleapis.com:443/fcm/send/x"),
    ).toBe(true);
  });

  it("ist case-insensitiv beim Hostnamen", () => {
    expect(
      isAllowedPushEndpoint("https://FCM.GOOGLEAPIS.COM/fcm/send/x"),
    ).toBe(true);
  });
});

describe("isAllowedPushEndpoint — SSRF-Rejects", () => {
  it.each([
    // Interne / private Ziele
    "https://localhost/admin",
    "https://127.0.0.1:8000/rest/v1/profiles",
    "https://169.254.169.254/latest/meta-data/",
    "https://10.0.0.5/internal",
    "https://192.168.1.1/",
    "https://supabase-db:5432/",
    // Falsches Scheme
    "http://fcm.googleapis.com/fcm/send/abc",
    "ftp://fcm.googleapis.com/",
    "javascript:alert(1)",
    "data:text/html,x",
    // Host-Lookalikes / Suffix-Bypass-Versuche
    "https://fcm.googleapis.com.evil.com/fcm/send/x",
    "https://evil.com/?fcm.googleapis.com",
    "https://evilpush.services.mozilla.com/wpush/x",
    "https://notify.windows.com.attacker.net/w/",
    "https://web-push-apple.com/x",
    // Beliebige fremde Hosts
    "https://example.com/webhook",
  ])("rejected %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false);
  });

  it("rejected Nicht-URLs und leere Strings", () => {
    expect(isAllowedPushEndpoint("")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });

  it("rejected Credentials in der URL", () => {
    expect(
      isAllowedPushEndpoint("https://user:pass@fcm.googleapis.com/fcm/send/x"),
    ).toBe(false);
  });

  it("rejected Nicht-443-Ports auch auf erlaubten Hosts", () => {
    expect(
      isAllowedPushEndpoint("https://fcm.googleapis.com:8443/fcm/send/x"),
    ).toBe(false);
  });

  it("rejected den nackten Suffix-Host ohne Subdomain (konservativ)", () => {
    expect(
      isAllowedPushEndpoint("https://push.services.mozilla.com/wpush/x"),
    ).toBe(false);
  });
});
