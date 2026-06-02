# SLC-892 — Live-Smoke (AC-892-10, 5 Mail-Variationen + 2 XSS-Probes)

## Purpose

Bestaetigt nach BS-Coolify-Redeploy, dass das DOMPurify + iframe-Sandbox-Pattern
(MT-2 + MT-3 + MT-4) gegen echte IMAP-Mails in der BS Production-Inbox sauber
rendert (keine optische Regression in legitimen Inhalten) UND XSS-Vektoren
zuverlaessig blockiert (zwei Probe-Mails).

Erfordert:
- BS V8.10 Code auf Production deployed (Coolify-Redeploy nach SLC-892-MT-6-Commit).
- Authenticated Admin- oder Sales-Login mit Zugriff auf Inbox-Route.
- Mindestens 3-5 ungelesene HTML-Mails in der `inbox`-Tabelle.

Verifikation kann per User-Browser ODER autonom via Playwright-MCP erfolgen
(siehe `feedback_playwright_live_smoke_autonomous.md` als Default-Pattern).

---

## Test-Daten-Vorbereitung

### Synthetic XSS-Probe-Mails einfuegen (SSH zu BS-Postgres)

```bash
ssh root@91.98.20.191
docker exec -i $(docker ps --format '{{.Names}}' | grep ^supabase-db) \
  psql -U postgres -d postgres <<'SQL'

-- Probe 1: Klassische <script>-Injection
INSERT INTO email_message (
  tenant_id, account_id, message_id, from_address, from_name,
  to_addresses, subject, body_html, body_text, received_at
) VALUES (
  (SELECT id FROM tenant LIMIT 1),
  (SELECT id FROM email_account LIMIT 1),
  'xss-probe-1@test',
  'xss-tester@example.com',
  'XSS Probe 1',
  ARRAY['admin@example.com'],
  '[SLC-892 LIVE-SMOKE] Probe-1 script-tag',
  '<p>Hallo, harmlos.</p><script>document.body.innerHTML = "PWNED";</script><p>Tschuess.</p>',
  'Hallo, harmlos. Tschuess.',
  now() - interval '2 minutes'
);

-- Probe 2: svg onload + img onerror + javascript: href
INSERT INTO email_message (
  tenant_id, account_id, message_id, from_address, from_name,
  to_addresses, subject, body_html, body_text, received_at
) VALUES (
  (SELECT id FROM tenant LIMIT 1),
  (SELECT id FROM email_account LIMIT 1),
  'xss-probe-2@test',
  'xss-tester@example.com',
  'XSS Probe 2',
  ARRAY['admin@example.com'],
  '[SLC-892 LIVE-SMOKE] Probe-2 svg + onerror + javascript',
  '<p>Vor dem Angriff.</p><svg onload="alert(1)"><img src=x onerror="alert(2)"><a href="javascript:alert(3)">Klick hier</a><p>Nach dem Angriff.</p>',
  'Vor dem Angriff. Klick hier. Nach dem Angriff.',
  now() - interval '1 minute'
);

SQL
```

Beide Probe-Mails werden nach Live-Smoke per Cleanup-Block geloescht (siehe unten).

---

## Pfad 1 — Probe 1 script-tag wird entfernt (Stored-XSS-Defense Layer 1)

**Schritte:**
1. Browser zu `https://cockpit.strategaizetransition.com/emails` navigieren.
2. Eingehende Mail `[SLC-892 LIVE-SMOKE] Probe-1 script-tag` oeffnen.
3. DevTools > Console offen halten.

**Erwartet:**
- Body rendert "Hallo, harmlos." + "Tschuess." als zwei `<p>`-Bloecke im Iframe.
- Kein `PWNED`-Text im DOM. Kein `<script>`-Tag im Iframe-DOM.
- Console: keine Errors, keine `alert()`-Calls.
- DevTools > Elements > Iframe > srcdoc-Inhalt: kein `<script>`-Token.
- DevTools > Elements > Iframe-Attribute: `sandbox=""` exakt.

---

## Pfad 2 — Probe 2 svg/onerror/javascript wird entfernt (XSS-Defense Layer 1)

**Schritte:**
1. Eingehende Mail `[SLC-892 LIVE-SMOKE] Probe-2 svg + onerror + javascript` oeffnen.
2. DevTools > Console offen halten.

**Erwartet:**
- Body rendert "Vor dem Angriff." + "Nach dem Angriff." als zwei `<p>`-Bloecke.
- Kein `alert()`-Dialog erscheint.
- Console: keine Errors, keine `alert()`-Calls.
- DevTools > Elements > Iframe srcdoc: kein `<svg>`-, `<img onerror>`-, `javascript:`-Token.
- Der "Klick hier"-Text bleibt sichtbar, aber das `<a>`-Tag hat KEIN `href="javascript:..."`-Attribut (geprueft per srcdoc-Inspect).

---

## Pfad 3 — Gmail-Plain-HTML-Mail rendert sauber

**Schritte:**
1. Eine reale Gmail-Mail in der Inbox oeffnen (z.B. eine Newsletter-Mail).
2. Sichtpruefung des Renders.

**Erwartet:**
- Body rendert mit Typography-Defaults (Sans-Serif, 14px, lesbares Line-Height).
- Links sind blau + unterstrichen.
- Inline-Images werden geladen (falls keine Cross-Origin-Probleme — R-4-Bekannt).
- Iframe passt sich der Content-Hoehe an (kein Scrollbalken im Iframe selbst).

---

## Pfad 4 — Outlook-Newsletter-mit-Bildern (HTML-Table-Layout)

**Schritte:**
1. Eine reale Outlook-/Marketing-Newsletter-Mail mit Tabellen-Layout oeffnen.
2. Sichtpruefung des Renders.

**Erwartet:**
- Tabellen-Layout bleibt erhalten (border-collapse, padding, alignment).
- Inline-Bilder via `<img src="https://...">` werden geladen.
- Footer (oft `<small>` oder `<table>`) rendert sauber.

**R-1-Risiko (Whitelist-Drift):** falls die Mail per `<style>`-Tag styled wurde
und der Render flach/ungeformt wirkt, ist das ein bekanntes Limit (Whitelist
entfernt `<style>` per DEC-259). Akzeptabel fuer V8.10. Falls Mail komplett
broken: F-Finding in /qa, Whitelist-Erweiterung pruefen.

---

## Pfad 5 — HTML-Signatur mit Tabelle + Inline-Image

**Schritte:**
1. Eine reale Mail mit komplexer HTML-Signatur (oft `<table>` + `<img>` Logo
   + Hyperlinks) oeffnen.
2. Sichtpruefung des Renders.

**Erwartet:**
- Signatur rendert mit erkennbarer Struktur (Name + Titel + Kontaktdaten +
  Logo nebeneinander).
- Links zu Webseiten/E-Mail funktionieren (Click oeffnet `target="_blank"`
  mit `rel="noopener noreferrer"`).
- Logo-Image rendert falls Cross-Origin-Bild-Loading nicht durch CSP/Sandbox
  blockiert ist (R-4-Bekannt — wird ggf. in V8.12 mit CSP behoben).

---

## Cleanup nach Live-Smoke

```bash
ssh root@91.98.20.191
docker exec -i $(docker ps --format '{{.Names}}' | grep ^supabase-db) \
  psql -U postgres -d postgres <<'SQL'

DELETE FROM email_message
WHERE message_id IN ('xss-probe-1@test', 'xss-probe-2@test');

SQL
```

---

## PASS-Kriterien

- Pfad 1 PASS: `<script>` entfernt, kein `PWNED`-Text, kein Console-Error.
- Pfad 2 PASS: `<svg onload>`, `<img onerror>`, `javascript:`-href alle entfernt, kein `alert()`.
- Pfad 3 PASS: Plain-HTML-Mail rendert lesbar.
- Pfad 4 PASS: Newsletter-Tabellen-Layout erkennbar (auch wenn Styling reduziert).
- Pfad 5 PASS: Signatur erkennbar strukturiert, Links funktional.

Mindestens Pfad 1 + Pfad 2 + 2 weitere Pfade = 4/5 PASS fuer SLC-892-Live-Smoke-PASS.

---

## Bekannte Limitierungen (R-1..R-4 aus Slice-Spec)

- **R-1 Whitelist-Drift** (Medium): `<style>`-Tag wird entfernt. Mails die CSS via `<style>` setzen verlieren Styling im Render. Defense-in-Depth-Tradeoff bewusst.
- **R-2 Bundle-Size** (Low): +50KB minified akzeptabel.
- **R-3 jsdom-Performance** (Low): SSR-Sanitize messbar, aber unter 50ms fuer typische <100KB Mails.
- **R-4 Cross-Origin-Images im Sandbox** (Low): Manche externe Bilder broken wegen sandbox=""-Limits. Vollst. CSP-Loesung in V8.12 (BL-501).

---

## Out-of-Scope (Pfad 6-10 fuer V8.10-Gesamt-/qa)

- Anhang-Preview-Render mit DOMPurify (out-of-scope V8.10, separater Pfad falls jemals relevant)
- Outbound-Email-Sanitize (out-of-scope V8.10, separater Pfad)
- CSP-Header-Live-Test (V8.12 BL-501)
