-- SLC-892 Live-Smoke XSS-Probe-Mails (2 Mails)
-- Cleanup nach Smoke: DELETE FROM email_messages WHERE message_id LIKE 'xss-probe-%-slc892%';

INSERT INTO email_messages (
  message_id, from_address, from_name, to_addresses, subject,
  body_html, body_text, received_at, owner_user_id
) VALUES
(
  'xss-probe-1-slc892@strategaize.test',
  'xss-tester@example.com',
  'XSS Probe 1',
  ARRAY['richard@bellaerts.de'],
  '[SLC-892 LIVE-SMOKE] Probe-1 script-tag',
  '<p>Hallo, harmlos.</p><script>document.body.innerHTML = "PWNED-SCRIPT-TAG";</script><p>Tschuess.</p>',
  'Hallo, harmlos. Tschuess.',
  now() - interval '2 minutes',
  '96322a0a-be2d-49e1-ba0d-03c4de1f1440'::uuid
),
(
  'xss-probe-2-slc892@strategaize.test',
  'xss-tester@example.com',
  'XSS Probe 2',
  ARRAY['richard@bellaerts.de'],
  '[SLC-892 LIVE-SMOKE] Probe-2 svg + onerror + javascript',
  '<p>Vor dem Angriff.</p><svg onload="document.title=''PWNED-SVG''"></svg><img src=x onerror="document.title=''PWNED-IMG''"><a href="javascript:document.title=''PWNED-A''">Klick hier</a><p>Nach dem Angriff.</p>',
  'Vor dem Angriff. Klick hier. Nach dem Angriff.',
  now() - interval '1 minute',
  '96322a0a-be2d-49e1-ba0d-03c4de1f1440'::uuid
)
RETURNING id, message_id, subject;
