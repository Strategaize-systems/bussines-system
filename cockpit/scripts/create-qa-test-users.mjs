#!/usr/bin/env node
// SLC-702 /qa — One-Off-Script: erzeugt 2 Test-User in auth.users mit
// festen UUIDs (matching seed-multi-user profiles 078 + 081) und Passwoertern.
//
// Ausfuehrung:
//   docker exec <app-container> node /tmp/create-qa-test-users.mjs
//
// Nutzt nur Node's built-in fetch — keine Dependencies.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
  process.exit(1);
}

const TEST_USERS = [
  {
    id: "00000000-0000-0000-0000-000000000078",
    email: "qa-teamlead@strategaize.test",
    password: "QaSlc702-Teamlead!",
    role: "teamlead",
  },
  {
    id: "00000000-0000-0000-0000-000000000081",
    email: "qa-member@strategaize.test",
    password: "QaSlc702-Member!",
    role: "member",
  },
];

async function createOrUpdateUser({ id, email, password }) {
  // Idempotent: existiert User schon, update password; sonst createUser.
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  // Probe: existiert id schon?
  const probe = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "GET",
    headers,
  });

  if (probe.status === 200) {
    // Update password + ensure email_confirm
    const upd = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!upd.ok) {
      const body = await upd.text();
      throw new Error(`UPDATE ${id} failed: ${upd.status} ${body}`);
    }
    return { action: "updated", id, email };
  }

  // CreateUser
  const cre = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id, email, password, email_confirm: true }),
  });
  if (!cre.ok) {
    const body = await cre.text();
    throw new Error(`CREATE ${id} failed: ${cre.status} ${body}`);
  }
  return { action: "created", id, email };
}

async function main() {
  console.log(`SUPABASE_URL = ${SUPABASE_URL}`);
  for (const u of TEST_USERS) {
    try {
      const res = await createOrUpdateUser(u);
      console.log(`OK ${res.action}: ${res.email} (${res.id}) -> role=${u.role}`);
    } catch (e) {
      console.error(`FAIL ${u.email}: ${e.message}`);
      process.exit(2);
    }
  }
  console.log("Test-User-Setup done.");
}

main();
