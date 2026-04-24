#!/usr/bin/env bash
# SLC-515 Voice-Agent Webhook Smoke-Test
#
# Usage:
#   SMAO_WEBHOOK_SECRET=xxx APP_URL=https://example.com \
#     ./scripts/smao-webhook-smoketest.sh [path/to/payload.json]
#
# Payload defaults to scripts/smao-sample-payload.json.
# Requires SMAO_ENABLED=true on the target server, otherwise expect 404.

set -euo pipefail

PAYLOAD="${1:-scripts/smao-sample-payload.json}"
SECRET="${SMAO_WEBHOOK_SECRET:?SMAO_WEBHOOK_SECRET required}"
APP_URL="${APP_URL:?APP_URL required (e.g. https://business.example.com)}"

if [ ! -f "$PAYLOAD" ]; then
  echo "payload not found: $PAYLOAD" >&2
  exit 1
fi

BODY=$(cat "$PAYLOAD")
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)

echo "POST $APP_URL/api/webhooks/voice-agent"
echo "  payload: $PAYLOAD"
echo "  sha256 : $SIG"
echo

curl -sS -X POST "$APP_URL/api/webhooks/voice-agent" \
  -H "Content-Type: application/json" \
  -H "x-smao-signature: sha256=$SIG" \
  --data "$BODY" \
  -w "\nHTTP %{http_code}\n"
