-- MT-1 Reproducer Test 2: aud='' hypothesis test on qa-admin
-- Pre-state:
SELECT 'PRE: aud=[' || coalesce(aud,'NULL') || '], pw_prefix=' || substring(encrypted_password,1,10) AS pre FROM auth.users WHERE email='qa-admin@strategaize.test';
-- Apply BOTH aud='' AND fresh pwd hash
UPDATE auth.users SET aud='', encrypted_password = crypt('test-pwd-v813-aud-test', gen_salt('bf', 10)), updated_at=now() WHERE email='qa-admin@strategaize.test';
-- Post-state:
SELECT 'POST: aud=[' || coalesce(aud,'NULL') || '], pw_prefix=' || substring(encrypted_password,1,10) || ', hash_matches=' || (crypt('test-pwd-v813-aud-test', encrypted_password) = encrypted_password)::text AS post FROM auth.users WHERE email='qa-admin@strategaize.test';
