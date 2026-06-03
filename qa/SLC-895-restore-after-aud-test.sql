-- Restore qa-admin after MT-1 aud-test
-- IMPORTANT (post-MIG-044): aud bleibt auf '' (leer) — NICHT zurueck auf 'authenticated'
-- setzen, sonst wird der ISSUE-089 Bug wieder aktiv. MIG-044 normalisiert aud=''.
-- Nur das encrypted_password wird auf den Original-Hash zurueckgesetzt.
UPDATE auth.users SET aud = '', encrypted_password = '$2a$06$i8Aco4Wiqcj.cBc8xaqLQerEV/23oXzPoQM1AakaZ01g0IKedxrbK', updated_at=now() WHERE email='qa-admin@strategaize.test';
SELECT email, aud, substring(encrypted_password,1,10) AS pw_prefix FROM auth.users WHERE email='qa-admin@strategaize.test';
