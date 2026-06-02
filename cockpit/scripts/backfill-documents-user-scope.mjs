#!/usr/bin/env node
// =====================================================================
// SLC-893 MT-4 — documents-Storage user-scope Backfill
// =====================================================================
//
// Migriert bestehende storage.objects im `documents`-Bucket auf das neue
// user-scoped Pfad-Schema (DEC-264):
//
//   alt: documents/<folder>/<Date.now()>_<filename>
//   neu: <user-uuid>/<folder>/<Date.now()>_<filename>
//
// Owner-Quelle: documents.created_by. Bei NULL: Fallback auf
// MIG_041_FALLBACK_OWNER_UUID (DEC-262). Sonst orphan (skip + log).
//
// Default-Mode: Dry-Run. Apply nur mit explicit `--apply`.
//
// Ausfuehrung (Coolify-Server im business-net):
//
//   docker run --rm \
//     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
//     -e DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
//     -e SUPABASE_URL='http://kong:8000' \
//     -e SUPABASE_SERVICE_ROLE_KEY='...' \
//     -e MIG_041_FALLBACK_OWNER_UUID='<founder-uuid>' \
//     -v /opt/business-system-test/cockpit:/app -w /app \
//     node:20 node scripts/backfill-documents-user-scope.mjs [--apply]
//
// Pure-Logic-Tests: cockpit/src/lib/storage/__tests__/document-path.test.ts
// (classifyBackfillCandidate, isUserScopedPath).
// =====================================================================

import pg from "pg";

const ARGS = new Set(process.argv.slice(2));
const APPLY_MODE = ARGS.has("--apply");
const VERBOSE = ARGS.has("--verbose") || ARGS.has("-v");

const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FALLBACK_OWNER = process.env.MIG_041_FALLBACK_OWNER_UUID || null;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function die(msg) {
  console.error(`[backfill-041] FATAL: ${msg}`);
  process.exit(1);
}

if (!DATABASE_URL) die("DATABASE_URL nicht gesetzt");
if (!SUPABASE_URL) die("SUPABASE_URL nicht gesetzt");
if (!SERVICE_KEY) die("SUPABASE_SERVICE_ROLE_KEY nicht gesetzt");

if (FALLBACK_OWNER && !UUID_V4_RE.test(FALLBACK_OWNER)) {
  die(`MIG_041_FALLBACK_OWNER_UUID muss UUID v4 sein, got '${FALLBACK_OWNER}'`);
}

console.log(`[backfill-041] Mode: ${APPLY_MODE ? "APPLY (will move files)" : "DRY-RUN (no changes)"}`);
console.log(`[backfill-041] DATABASE_URL: ${DATABASE_URL.replace(/:[^@]+@/, ":****@")}`);
console.log(`[backfill-041] SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`[backfill-041] FALLBACK_OWNER: ${FALLBACK_OWNER ?? "(not set — orphan-mode active)"}`);

// =====================================================================
// Pure-Helpers (1:1 aus src/lib/storage/document-path.ts portiert).
// =====================================================================
function isUserScopedPath(storagePath) {
  const firstSegment = (storagePath ?? "").split("/")[0];
  return Boolean(firstSegment) && UUID_V4_RE.test(firstSegment);
}

function classifyBackfillCandidate(oldPath, createdBy, fallbackOwnerId) {
  if (isUserScopedPath(oldPath)) {
    return { action: "skip-already-migrated", reason: "first-path-segment is already a UUID" };
  }
  let ownerId = null;
  let ownerSource = null;
  if (createdBy && UUID_V4_RE.test(createdBy)) {
    ownerId = createdBy;
    ownerSource = "created_by";
  } else if (fallbackOwnerId && UUID_V4_RE.test(fallbackOwnerId)) {
    ownerId = fallbackOwnerId;
    ownerSource = "fallback";
  }
  if (!ownerId) {
    return {
      action: "orphan",
      reason:
        "documents.created_by NULL and MIG_041_FALLBACK_OWNER_UUID not set or invalid",
    };
  }
  const stripped = oldPath.replace(/^documents\//, "");
  return { action: "move", newPath: `${ownerId}/${stripped}`, ownerId, ownerSource };
}

// =====================================================================
// Storage-API Move via Supabase Storage v1 REST.
// =====================================================================
async function storageMove(bucketId, sourceKey, destinationKey) {
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/move`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ bucketId, sourceKey, destinationKey }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Storage move failed: HTTP ${res.status} ${res.statusText} — ${body}`);
  }
  return res.json().catch(() => ({}));
}

// =====================================================================
// Main.
// =====================================================================
async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Liste storage.objects im documents-Bucket. Limit hoch (paginieren falls
  // > 10000 — derzeit BS Internal-Test-Mode mit <100 Files).
  const objects = await client.query(
    `SELECT name FROM storage.objects WHERE bucket_id = 'documents' ORDER BY name`
  );
  console.log(`[backfill-041] Storage-Objects total: ${objects.rowCount}`);

  const stats = {
    total: objects.rowCount,
    skipAlreadyMigrated: 0,
    movedCreatedBy: 0,
    movedFallback: 0,
    orphan: 0,
    moveError: 0,
  };
  const orphanList = [];
  const errors = [];

  for (const row of objects.rows) {
    const oldPath = row.name;

    // Lookup created_by via documents.file_path-Join.
    const docRes = await client.query(
      `SELECT id, created_by FROM documents WHERE file_path = $1 LIMIT 1`,
      [oldPath]
    );
    const doc = docRes.rows[0];
    const createdBy = doc?.created_by ?? null;
    const docId = doc?.id ?? null;

    const decision = classifyBackfillCandidate(oldPath, createdBy, FALLBACK_OWNER);

    if (decision.action === "skip-already-migrated") {
      stats.skipAlreadyMigrated++;
      if (VERBOSE) console.log(`[backfill-041] SKIP ${oldPath} — ${decision.reason}`);
      continue;
    }

    if (decision.action === "orphan") {
      stats.orphan++;
      orphanList.push({ oldPath, docId, reason: decision.reason });
      console.warn(`[backfill-041] ORPHAN ${oldPath} — doc_id=${docId ?? "n/a"} — ${decision.reason}`);
      continue;
    }

    // decision.action === "move"
    if (decision.ownerSource === "created_by") stats.movedCreatedBy++;
    else stats.movedFallback++;

    if (!APPLY_MODE) {
      if (VERBOSE) {
        console.log(
          `[backfill-041] DRY-MOVE ${oldPath} -> ${decision.newPath} (owner_src=${decision.ownerSource})`
        );
      }
      continue;
    }

    // APPLY: Storage move + DB UPDATE in einer logischen Operation.
    try {
      await storageMove("documents", oldPath, decision.newPath);
      if (docId) {
        await client.query(
          `UPDATE documents SET file_path = $1 WHERE id = $2`,
          [decision.newPath, docId]
        );
      }
      console.log(
        `[backfill-041] MOVED ${oldPath} -> ${decision.newPath} (owner_src=${decision.ownerSource})`
      );
    } catch (e) {
      stats.moveError++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ oldPath, newPath: decision.newPath, msg });
      console.error(`[backfill-041] ERROR ${oldPath} -> ${decision.newPath}: ${msg}`);
    }
  }

  console.log("\n[backfill-041] ===== Summary =====");
  console.log(`  Mode:                ${APPLY_MODE ? "APPLY" : "DRY-RUN"}`);
  console.log(`  Total objects:       ${stats.total}`);
  console.log(`  Skipped (migrated):  ${stats.skipAlreadyMigrated}`);
  console.log(`  Move (created_by):   ${stats.movedCreatedBy}`);
  console.log(`  Move (fallback):     ${stats.movedFallback}`);
  console.log(`  Orphans:             ${stats.orphan}`);
  console.log(`  Move errors:         ${stats.moveError}`);

  if (orphanList.length > 0) {
    console.log("\n[backfill-041] ===== Orphan-List =====");
    for (const o of orphanList) {
      console.log(`  ${o.oldPath} (doc_id=${o.docId ?? "n/a"})`);
    }
  }

  if (errors.length > 0) {
    console.log("\n[backfill-041] ===== Error-List =====");
    for (const e of errors) {
      console.log(`  ${e.oldPath} -> ${e.newPath}: ${e.msg}`);
    }
  }

  await client.end();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[backfill-041] UNCAUGHT:", err);
  process.exit(2);
});
