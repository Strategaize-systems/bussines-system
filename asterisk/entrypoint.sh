#!/bin/bash
set -e

# =============================================================
# Asterisk Entrypoint — Strategaize Business System V5.1
# Renders ENV variables into Asterisk config files
# =============================================================

echo "=== Asterisk entrypoint: rendering config templates ==="

# Defaults
export ASTERISK_WEBRTC_PASSWORD="${ASTERISK_WEBRTC_PASSWORD:-changeme}"
export SIP_CALLER_ID="${SIP_CALLER_ID:-+4900000000}"
export SIP_TRUNK_ENABLED="${SIP_TRUNK_ENABLED:-false}"
export SIP_TRUNK_HOST="${SIP_TRUNK_HOST:-trunk.example.com}"
export SIP_TRUNK_USER="${SIP_TRUNK_USER:-trunk-user}"
export SIP_TRUNK_PASS="${SIP_TRUNK_PASS:-trunk-pass}"
export SMAO_ENABLED="${SMAO_ENABLED:-false}"
export SMAO_SIP_URI="${SMAO_SIP_URI:-sip:agent@smao.example.com}"

# Render main config files (envsubst with EXPLICIT variable list only).
# CRITICAL: Without the variable list, envsubst replaces ALL ${...} patterns
# including Asterisk's own runtime variables (${CALLERID}, ${EXTEN}, ${UNIQUEID},
# ${CALL_ID}, ${PJSIP_HEADER}, etc.) with empty strings. This breaks recordings,
# routing, and caller ID. Only substitute OUR env vars.
ENVSUBST_VARS='$ASTERISK_WEBRTC_PASSWORD $SIP_CALLER_ID'
for tmpl in /etc/asterisk-templates/*.conf; do
    filename=$(basename "$tmpl")
    envsubst "$ENVSUBST_VARS" < "$tmpl" > "/etc/asterisk/$filename"
    echo "  Rendered: $filename"
done

# Append SIP trunk config if enabled
if [ "$SIP_TRUNK_ENABLED" = "true" ]; then
    echo "  SIP Trunk: ENABLED — appending trunk config to pjsip.conf"
    cat >> /etc/asterisk/pjsip.conf <<TRUNK_EOF

; --- SIP TRUNK (auto-generated, SIP_TRUNK_ENABLED=true) ---
[sip-trunk]
type = endpoint
context = from-trunk
disallow = all
allow = ulaw
allow = alaw
transport = transport-udp
outbound_auth = sip-trunk-auth
aors = sip-trunk-aor
from_user = ${SIP_TRUNK_USER}
from_domain = ${SIP_TRUNK_HOST}

[sip-trunk-auth]
type = auth
auth_type = userpass
username = ${SIP_TRUNK_USER}
password = ${SIP_TRUNK_PASS}

[sip-trunk-aor]
type = aor
contact = sip:${SIP_TRUNK_HOST}
qualify_frequency = 60

[sip-trunk-identify]
type = identify
endpoint = sip-trunk
match = ${SIP_TRUNK_HOST}
TRUNK_EOF
else
    echo "  SIP Trunk: DISABLED (SIP_TRUNK_ENABLED=false)"
fi

# Append SMAO endpoint if enabled
if [ "$SMAO_ENABLED" = "true" ]; then
    echo "  SMAO Voice Agent: ENABLED — appending SMAO endpoint to pjsip.conf"
    cat >> /etc/asterisk/pjsip.conf <<SMAO_EOF

; --- SMAO VOICE AGENT (auto-generated, SMAO_ENABLED=true) ---
[smao-endpoint]
type = endpoint
context = smao-route
disallow = all
allow = ulaw
allow = alaw
transport = transport-udp
aors = smao-aor

[smao-aor]
type = aor
contact = ${SMAO_SIP_URI}
qualify_frequency = 60
SMAO_EOF
else
    echo "  SMAO Voice Agent: DISABLED (SMAO_ENABLED=false)"
fi

# Set SMAO_ENABLED as Asterisk global variable for dialplan
cat >> /etc/asterisk/extensions.conf <<GLOBALS_EOF

[globals]
SMAO_ENABLED=${SMAO_ENABLED}
GLOBALS_EOF

# Fix permissions
chown -R asterisk:asterisk /etc/asterisk/
chown -R asterisk:asterisk /var/spool/asterisk/monitor/

# ISSUE-039 / SLC-514: shared /var/spool/asterisk/monitor volume is also mounted
# read-only into the app container as /recordings-calls. That container runs as
# nextjs (UID 1001, group nogroup). Directory default 0750 (asterisk:asterisk)
# means nextjs cannot list or read — call-processing cron never sees any WAV.
# Fix: make directory world-readable and ensure new WAV files are 0644 via umask.
chmod 0755 /var/spool/asterisk/monitor/
umask 022

echo "=== Asterisk entrypoint: starting Asterisk ==="
exec asterisk -fvvv
