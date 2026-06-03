UPDATE auth.users SET encrypted_password = '$2a$06$i8Aco4Wiqcj.cBc8xaqLQerEV/23oXzPoQM1AakaZ01g0IKedxrbK', updated_at = now() WHERE email = 'qa-admin@strategaize.test';
SELECT email, substring(encrypted_password,1,10) AS pw_prefix FROM auth.users WHERE email = 'qa-admin@strategaize.test';
