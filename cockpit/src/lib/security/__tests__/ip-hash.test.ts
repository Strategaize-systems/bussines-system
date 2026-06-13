import { describe, it, expect, afterEach } from "vitest";
import { extractClientIp } from "../ip-hash";

// V8.15 SLC-913 MT-6 (ISSUE-120, R-913-3) — extractClientIp darf NICHT den
// linkesten (client-kontrollierten) X-Forwarded-For-Wert nehmen. coolify-proxy
// (Traefik) laeuft ohne forwardedHeaders.trustedIPs → es ersetzt den
// client-gelieferten XFF durch die reale Peer-IP (Einzelwert, live-verifiziert
// 2026-06-13). Korrekt ist der rechteste(-Offset) Eintrag (TRUSTED_PROXY_COUNT).

describe("extractClientIp (ISSUE-120 XFF-Haertung)", () => {
  afterEach(() => {
    delete process.env.TRUSTED_PROXY_COUNT;
  });

  it("nimmt den einzigen XFF-Wert (Traefik-Standard: Single trusted value)", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7" });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("nimmt den RECHTESTEN Eintrag (proxy-appended) statt des spoofbaren linkesten", () => {
    // Angreifer spooft 9.9.9.9 links; Proxy haengt die reale IP rechts an.
    const h = new Headers({ "x-forwarded-for": "9.9.9.9, 198.51.100.23" });
    expect(extractClientIp(h)).toBe("198.51.100.23");
  });

  it("ignoriert mehrere gespoofte Eintraege und nimmt den rechtesten", () => {
    const h = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2, 198.51.100.23",
    });
    expect(extractClientIp(h)).toBe("198.51.100.23");
  });

  it("honoriert TRUSTED_PROXY_COUNT=2 (zweiter Eintrag von rechts)", () => {
    process.env.TRUSTED_PROXY_COUNT = "2";
    const h = new Headers({
      "x-forwarded-for": "9.9.9.9, 198.51.100.23, 10.0.0.9",
    });
    // client=198.51.100.23, proxy1=10.0.0.9 → idx = 3 - 2 = 1
    expect(extractClientIp(h)).toBe("198.51.100.23");
  });

  it("klemmt TRUSTED_PROXY_COUNT groesser als Eintragsanzahl auf linkesten", () => {
    process.env.TRUSTED_PROXY_COUNT = "5";
    const h = new Headers({ "x-forwarded-for": "203.0.113.7" });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("trimmt Whitespace um die IP", () => {
    const h = new Headers({ "x-forwarded-for": "9.9.9.9,   198.51.100.23  " });
    expect(extractClientIp(h)).toBe("198.51.100.23");
  });

  it("faellt auf x-real-ip zurueck wenn XFF fehlt", () => {
    const h = new Headers({ "x-real-ip": "203.0.113.7" });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("gibt null zurueck wenn weder XFF noch x-real-ip vorhanden", () => {
    const h = new Headers();
    expect(extractClientIp(h)).toBeNull();
  });

  it("ungueltiges TRUSTED_PROXY_COUNT faellt auf 1 zurueck (rechtester Eintrag)", () => {
    process.env.TRUSTED_PROXY_COUNT = "abc";
    const h = new Headers({ "x-forwarded-for": "9.9.9.9, 198.51.100.23" });
    expect(extractClientIp(h)).toBe("198.51.100.23");
  });
});
