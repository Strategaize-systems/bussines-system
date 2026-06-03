#!/usr/bin/env node
// V8.10 SLC-893 MT-7: Supabase-JWT-Signer fuer Storage-API-Live-Smoke.
// Erzeugt HS256-Token analog zu Supabase-GoTrue-Format.
//
// Usage:
//   JWT_SECRET=<secret> node scripts/sign-supabase-test-jwt.mjs <user-uuid>
//
// Expiry: 1h. Token enthaelt role='authenticated' + sub=user-uuid.

import { createHmac } from "node:crypto";

const base64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("Missing JWT_SECRET env var.");
  process.exit(1);
}

const userUuid = process.argv[2];
if (!userUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userUuid)) {
  console.error("Usage: sign-supabase-test-jwt.mjs <user-uuid>");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const payload = {
  aud: "authenticated",
  exp: now + 60 * 60,
  iat: now,
  iss: "supabase",
  sub: userUuid,
  role: "authenticated",
  session_id: `slc-893-smoke-${now}`,
};

const header = { alg: "HS256", typ: "JWT" };
const segments = [base64url(JSON.stringify(header)), base64url(JSON.stringify(payload))];
const signature = base64url(createHmac("sha256", secret).update(segments.join(".")).digest());
const token = `${segments.join(".")}.${signature}`;

console.log(token);
