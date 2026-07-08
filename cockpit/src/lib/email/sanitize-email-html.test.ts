// OWASP-XSS-Cheatsheet-Suite + Whitelist-Konformitaet fuer SLC-892 MT-2.
// Referenz: https://owasp.org/www-community/xss-filter-evasion-cheatsheet

import { describe, expect, it } from "vitest";

import { ALLOWED_ATTR, ALLOWED_TAGS, sanitizeEmailHtml, hasRemoteImages } from "./sanitize-email-html";

describe("sanitizeEmailHtml — OWASP-XSS-Cheatsheet", () => {
  // 20+ adversarial Vektoren — alle muessen ohne JS-executor und ohne block-tag-output sanitiziert werden.
  it.each([
    ["script-tag-direkt", "<script>alert(1)</script>"],
    ["script-tag-mixed-case", "<ScRiPt>alert(1)</ScRiPt>"],
    ["script-tag-malformed", "<scr<script>ipt>alert(1)</script>"],
    ["svg-onload", "<svg onload=alert(1)>"],
    ["img-onerror", '<img src=x onerror="alert(1)">'],
    ["img-onerror-singlequote", "<img src=x onerror='alert(1)'>"],
    ["body-onload", "<body onload=alert(1)>"],
    ["a-href-javascript", '<a href="javascript:alert(1)">x</a>'],
    ["a-href-javascript-mixed-case", '<a href="JaVaScRiPt:alert(1)">x</a>'],
    ["a-href-data-text-html", '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
    ["iframe-src-javascript", '<iframe src="javascript:alert(1)"></iframe>'],
    ["iframe-srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ["object-data-html", '<object data="data:text/html,<script>alert(1)</script>"></object>'],
    ["embed-src", '<embed src="data:text/html,<script>alert(1)</script>">'],
    ["form-action", '<form action="http://evil.com"><input name="x"></form>'],
    ["style-tag", "<style>body{background:url(javascript:alert(1))}</style>"],
    ["style-attr-expression", '<div style="background:expression(alert(1))">x</div>'],
    ["link-stylesheet", '<link rel="stylesheet" href="http://evil.com/x.css">'],
    ["meta-refresh", '<meta http-equiv="refresh" content="0;url=http://evil.com">'],
    ["base-href", '<base href="http://evil.com/">'],
    ["audio-onerror", '<audio src=x onerror="alert(1)">'],
    ["video-onerror", '<video src=x onerror="alert(1)">'],
    ["entity-encoded-script-numeric", "&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e;"],
    ["html-comment-injection", "<!--<script>alert(1)</script>-->"],
    ["cdata-injection", "<![CDATA[<script>alert(1)</script>]]>"],
  ])("removes %s", (_label, malicious) => {
    const sanitized = sanitizeEmailHtml(malicious);
    // Block-tags duerfen nicht im Output sein
    expect(sanitized).not.toMatch(/<script/i);
    expect(sanitized).not.toMatch(/<iframe/i);
    expect(sanitized).not.toMatch(/<object/i);
    expect(sanitized).not.toMatch(/<embed/i);
    expect(sanitized).not.toMatch(/<form/i);
    expect(sanitized).not.toMatch(/<style/i);
    expect(sanitized).not.toMatch(/<link/i);
    expect(sanitized).not.toMatch(/<meta/i);
    expect(sanitized).not.toMatch(/<base/i);
    expect(sanitized).not.toMatch(/<svg/i);
    // Event-Handler duerfen nicht im Output sein
    expect(sanitized).not.toMatch(/on\w+\s*=/i);
    // Unsichere URL-Schemes duerfen nicht im Output sein
    expect(sanitized).not.toMatch(/javascript:/i);
    expect(sanitized).not.toMatch(/data:text\/html/i);
    // expression() CSS-Attack-Pattern darf nicht durch
    expect(sanitized).not.toMatch(/expression\s*\(/i);
  });
});

describe("sanitizeEmailHtml — Whitelist-Konformitaet", () => {
  it("erhaelt erlaubte Block-Tags (p, h1-h6, ul, ol, li, blockquote, table)", () => {
    const safe = "<p>Hallo</p><h1>Titel</h1><ul><li>A</li></ul><blockquote>Z</blockquote>";
    const out = sanitizeEmailHtml(safe);
    expect(out).toMatch(/<p>/i);
    expect(out).toMatch(/<h1>/i);
    expect(out).toMatch(/<ul>/i);
    expect(out).toMatch(/<li>/i);
    expect(out).toMatch(/<blockquote>/i);
  });

  it("erhaelt erlaubte Inline-Tags (b, i, strong, em, u, span)", () => {
    const safe = "<b>x</b><i>y</i><strong>a</strong><em>b</em><u>c</u><span>d</span>";
    const out = sanitizeEmailHtml(safe);
    expect(out).toMatch(/<b>/i);
    expect(out).toMatch(/<strong>/i);
    expect(out).toMatch(/<span>/i);
  });

  it("erhaelt Tabellen-Struktur (table, thead, tbody, tr, th, td)", () => {
    const safe = "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>";
    const out = sanitizeEmailHtml(safe);
    expect(out).toMatch(/<table>/i);
    expect(out).toMatch(/<tr>/i);
    expect(out).toMatch(/<td>/i);
  });

  it("erhaelt sichere href + src + alt + title", () => {
    const safe = '<a href="https://example.com" title="Beispiel">x</a><img src="https://example.com/a.png" alt="A" title="B">';
    const out = sanitizeEmailHtml(safe);
    expect(out).toMatch(/href="https:\/\/example\.com"/);
    expect(out).toMatch(/title="Beispiel"/);
    expect(out).toMatch(/alt="A"/);
    expect(out).toMatch(/src="https:\/\/example\.com\/a\.png"/);
  });

  it("entfernt unbekannte Tags aber erhaelt Inhalt (z.B. <custom-element>)", () => {
    const out = sanitizeEmailHtml("<custom-element>Text</custom-element>");
    expect(out).not.toMatch(/<custom-element/i);
    expect(out).toMatch(/Text/);
  });

  it("entfernt style-Attribut auf erlaubten Tags", () => {
    const out = sanitizeEmailHtml('<p style="color:red">x</p>');
    expect(out).not.toMatch(/style\s*=/i);
    expect(out).toMatch(/<p>/i);
  });

  it("ALLOWED_TAGS-Konstante ist nicht leer und enthaelt p+a+img+table", () => {
    expect(ALLOWED_TAGS.length).toBeGreaterThan(10);
    expect(ALLOWED_TAGS).toContain("p");
    expect(ALLOWED_TAGS).toContain("a");
    expect(ALLOWED_TAGS).toContain("img");
    expect(ALLOWED_TAGS).toContain("table");
  });

  it("ALLOWED_ATTR-Konstante enthaelt href+src+alt+title+target und KEIN style/on*", () => {
    expect(ALLOWED_ATTR).toContain("href");
    expect(ALLOWED_ATTR).toContain("src");
    expect(ALLOWED_ATTR).toContain("alt");
    expect(ALLOWED_ATTR).toContain("title");
    expect(ALLOWED_ATTR).toContain("target");
    expect(ALLOWED_ATTR).not.toContain("style");
    expect(ALLOWED_ATTR.some((a) => a.startsWith("on"))).toBe(false);
  });
});

describe("sanitizeEmailHtml — target=_blank erhaelt automatisch rel=noopener noreferrer", () => {
  it("fuegt rel=noopener noreferrer hinzu wenn target=_blank vorhanden", () => {
    const out = sanitizeEmailHtml('<a href="https://example.com" target="_blank">x</a>');
    expect(out).toMatch(/target="_blank"/);
    expect(out).toMatch(/rel="noopener noreferrer"/);
  });

  it("setzt KEIN rel wenn target nicht _blank ist", () => {
    const out = sanitizeEmailHtml('<a href="https://example.com">x</a>');
    expect(out).not.toMatch(/target="_blank"/);
  });
});

describe("sanitizeEmailHtml — URL-Scheme-Filter", () => {
  it("blockiert javascript: (auch mit Whitespace + Mixed-Case)", () => {
    const variants = [
      '<a href="javascript:alert(1)">x</a>',
      '<a href="JaVaScRiPt:alert(1)">x</a>',
      '<a href=" javascript:alert(1)">x</a>',
      '<a href="java\tscript:alert(1)">x</a>',
    ];
    for (const v of variants) {
      const out = sanitizeEmailHtml(v);
      expect(out).not.toMatch(/javascript:/i);
    }
  });

  it("blockiert data:text/html-URLs", () => {
    const out = sanitizeEmailHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(out).not.toMatch(/data:text\/html/i);
  });

  it("blockiert vbscript: URLs", () => {
    const out = sanitizeEmailHtml('<a href="vbscript:msgbox(1)">x</a>');
    expect(out).not.toMatch(/vbscript:/i);
  });

  it("erlaubt data:image/png, data:image/jpeg, data:image/gif, data:image/webp", () => {
    const variants = [
      '<img src="data:image/png;base64,iVBOR" alt="x">',
      '<img src="data:image/jpeg;base64,/9j/4" alt="x">',
      '<img src="data:image/gif;base64,R0lGOD" alt="x">',
      '<img src="data:image/webp;base64,UklGR" alt="x">',
    ];
    for (const v of variants) {
      const out = sanitizeEmailHtml(v);
      expect(out).toMatch(/<img/);
      expect(out).toMatch(/data:image\//);
    }
  });

  it("blockiert data:image/svg+xml (XSS-Vehikel)", () => {
    const out = sanitizeEmailHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="x">');
    expect(out).not.toMatch(/data:image\/svg/i);
  });
});

describe("sanitizeEmailHtml — Edge-Cases", () => {
  it("haelt leeren Input stabil", () => {
    expect(sanitizeEmailHtml("")).toBe("");
  });

  it("haelt plain text ohne Tags stabil", () => {
    const out = sanitizeEmailHtml("Hallo Welt, das ist Text ohne HTML.");
    expect(out).toMatch(/Hallo Welt/);
  });

  it("entfernt nested script in legitime Struktur", () => {
    const out = sanitizeEmailHtml("<p>Hallo<script>alert(1)</script>Welt</p>");
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/Hallo/);
    expect(out).toMatch(/Welt/);
  });

  it("entfernt onclick-Handler von erlaubten Tags", () => {
    const out = sanitizeEmailHtml('<a href="https://example.com" onclick="alert(1)">x</a>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toMatch(/href="https:\/\/example\.com"/);
  });
});

describe("sanitizeEmailHtml — Remote-Bild-Block (blockRemoteImages, SLC-915 MT-6)", () => {
  it("strippt http(s)-src an <img> wenn blockRemoteImages=true (img-Tag bleibt)", () => {
    const out = sanitizeEmailHtml(
      '<img src="https://track.evil.com/pixel.gif" alt="x">',
      { blockRemoteImages: true },
    );
    expect(out).not.toMatch(/https:\/\/track\.evil\.com/);
    expect(out).toMatch(/<img/i);
  });

  it("blockiert auch http:-src", () => {
    const out = sanitizeEmailHtml('<img src="http://x.com/a.png">', {
      blockRemoteImages: true,
    });
    expect(out).not.toMatch(/http:\/\/x\.com/);
  });

  it("laesst cid:- und data:image-src durch, auch bei blockRemoteImages=true", () => {
    const out = sanitizeEmailHtml(
      '<img src="cid:logo123" alt="l"><img src="data:image/png;base64,iVBOR" alt="d">',
      { blockRemoteImages: true },
    );
    expect(out).toMatch(/cid:logo123/);
    expect(out).toMatch(/data:image\/png/);
  });

  it("laesst http(s)-Bilder durch wenn blockRemoteImages=false (Default, bestehende Caller)", () => {
    const out = sanitizeEmailHtml('<img src="https://example.com/a.png" alt="A">');
    expect(out).toMatch(/src="https:\/\/example\.com\/a\.png"/);
    const out2 = sanitizeEmailHtml('<img src="https://example.com/a.png" alt="A">', {
      blockRemoteImages: false,
    });
    expect(out2).toMatch(/src="https:\/\/example\.com\/a\.png"/);
  });

  it("blockRemoteImages beeinflusst <a href> NICHT (nur img-src)", () => {
    const out = sanitizeEmailHtml('<a href="https://example.com">x</a>', {
      blockRemoteImages: true,
    });
    expect(out).toMatch(/href="https:\/\/example\.com"/);
  });

  it("setzt das Flag nach dem Aufruf zurueck (naechster Default-Aufruf blockt nicht)", () => {
    sanitizeEmailHtml('<img src="https://x.com/a.png">', { blockRemoteImages: true });
    const out = sanitizeEmailHtml('<img src="https://example.com/b.png" alt="b">');
    expect(out).toMatch(/src="https:\/\/example\.com\/b\.png"/);
  });
});

describe("hasRemoteImages (SLC-915 MT-6)", () => {
  it("true bei <img src=http(s)>", () => {
    expect(hasRemoteImages('<p>x</p><img src="https://x.com/p.gif">')).toBe(true);
    expect(hasRemoteImages('<img src="http://x.com/p.gif">')).toBe(true);
  });

  it("false ohne img / nur cid+data-Bilder / leer", () => {
    expect(hasRemoteImages("<p>nur Text</p>")).toBe(false);
    expect(hasRemoteImages('<img src="cid:logo">')).toBe(false);
    expect(hasRemoteImages('<img src="data:image/png;base64,x">')).toBe(false);
    expect(hasRemoteImages("")).toBe(false);
  });
});
