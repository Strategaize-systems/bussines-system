#!/bin/sh
# SLC-701 MT-7 — Wrapper, der den node-basierten Helper-Bench startet.
# Wir nutzen kein klassisches pgbench, weil das tool im Container vorhanden
# sein muesste; tsx + pg deckt p50/p95/p99 portabel ab.
#
# Auf Hetzner (im Container):
#   docker run --rm \
#     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
#     -v /opt/business-system-test:/app -w /app/cockpit \
#     -e TEST_DATABASE_URL='postgresql://postgres:...@supabase-db-...:5432/postgres' \
#     node:20 sh scripts/pgbench-helper-smoke.sh

set -e
exec npx tsx scripts/pgbench-helper-smoke.ts "$@"
