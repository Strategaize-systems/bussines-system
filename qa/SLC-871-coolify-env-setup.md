# SLC-871 — Coolify ENV Setup fuer IS-Knowledge-API-Konsument

## Purpose

Konfigurieren des V8.7-A IS-Knowledge-Service-Key + Base-URL auf der BS-Coolify-Resource (cockpit.strategaizetransition.com), damit der BS KI-Workspace die IS V3.5 Knowledge-API als Read-only RAG-Quelle nutzen kann.

Pflicht-Vorbedingung fuer Live-Smoke (qa/SLC-871-live-smoke.md). Ohne diese ENV-Variablen wirft der Adapter `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY ENV is not set`-Error beim ersten Workspace-IS-Aufruf.

## Pre-Conditions

- IS V3.5 SLC-352 RELEASED auf is.strategaizetransition.com (REL-017 2026-06-01) ✅
- `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` auf IS-Coolify bereits gesetzt (Schritt 1 in IS qa/SLC-352-coolify-env-setup.md) ✅
- BS V8.9 STABLE (REL-042) ✅
- BS V8.7-A SLC-871 Code-Side auf master ge-merged + Coolify-Redeploy DONE (Image enthaelt den IS-Knowledge-Adapter)

## Schritt 1 — Service-Key kopieren (NICHT neu generieren)

Der Service-Key muss IDENTISCH zum IS-Coolify-Wert sein, sonst gibt's 401 von der IS-API. Per DEC-253 ist der Key Server-Side-only — NICHT `NEXT_PUBLIC_*`.

Falls der Wert nicht mehr greifbar ist:

```bash
ssh root@<is-server-ip>
docker exec <is-container-name> printenv STRATEGAIZE_KNOWLEDGE_SERVICE_KEY
# Output kopieren (64-hex-chars), sicher weiterreichen.
```

## Schritt 2 — BS-Coolify konfigurieren

Coolify UI → Application `cockpit.strategaizetransition.com` → Configuration → Environment Variables → "+ Add Variable":

| Key | Value | Notes |
|---|---|---|
| `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` | `<gleicher Wert wie IS>` | Pflicht. Server-Side-only (NIE in `NEXT_PUBLIC_*`!). |
| `STRATEGAIZE_KNOWLEDGE_API_BASE_URL` | `https://is.strategaizetransition.com` | Optional. Default ist bereits diese URL im Adapter, daher nur setzen wenn alternative Region/Branch noetig. |

Save → **Redeploy** (sonst greifen ENV-Aenderungen nicht).

## Schritt 3 — Verifikation per SSH

```bash
ssh root@<bs-server-ip>
# Container-Namen ermitteln (kann sich pro Redeploy aendern)
docker ps --format '{{.Names}}' | grep ^cockpit
# Beispiel: cockpit-k9f5pn5upfq7etoefb5ukbcg-<timestamp>

docker exec <bs-container-name> printenv STRATEGAIZE_KNOWLEDGE_SERVICE_KEY
# Muss den 64-hex-Wert aus Schritt 1 zeigen.

docker exec <bs-container-name> printenv STRATEGAIZE_KNOWLEDGE_API_BASE_URL
# Muss "https://is.strategaizetransition.com" zeigen (oder nicht gesetzt = Default greift).
```

## Schritt 4 — Cross-Server-Smoke (von BS zu IS)

```bash
# Auf bs-server
SERVICE_KEY=$(docker exec <bs-container-name> printenv STRATEGAIZE_KNOWLEDGE_SERVICE_KEY)

curl -s -i \
  -H "x-strategaize-service-key: $SERVICE_KEY" \
  -H "x-strategaize-consumer: business-system" \
  "https://is.strategaizetransition.com/api/knowledge/search?q=Vollmacht-Klausel&domain=sales&limit=3"
```

Erwartet: HTTP 200 mit Body `{"items": [...], "query_embedding_cost_usd": ..., "total_ms": ...}` und 0..3 Items.

Bei 401: Key ist falsch oder zwischen IS/BS gedriftet — beide Coolify-Resources vergleichen.
Bei DNS-Fehler: BS-Container hat keinen Outbound — Coolify-Firewall checken.

## Schritt 5 — Build-Time Bundle-Leak-Check (DEC-253)

Pflicht-Verifikation, dass der Service-Key NICHT im Browser-Bundle landet:

```bash
docker exec <bs-container-name> bash -c "grep -r 'STRATEGAIZE_KNOWLEDGE_SERVICE_KEY' /app/.next/static/ 2>/dev/null | head"
# Erwartet: 0 Treffer (empty output).
```

Falls Treffer auftauchen: der Adapter wurde in einem `"use client"`-File importiert — siehe `feedback_strategaize_pattern_reuse_required` und MT-1 Code-Audit.

## Key-Rotation-Procedure

Bei Schluessel-Kompromittierung oder Zeit-basierter Rotation (analog IS qa/SLC-352-coolify-env-setup.md):

1. Neuen Key generieren: `openssl rand -hex 32`.
2. **Alle 3 Coolify-Resources** (IS, OP, BS) gleichzeitig aktualisieren (Save → Redeploy pro Resource).
3. **Reihenfolge:** IS zuerst (Provider). Bei BS-Redeploy waehrend IS noch alt → Konsumenten bekommen 401 bis IS-Redeploy durch ist. Max 2-3 Min Down-Time fuer Konsumenten — akzeptabel da V8.7-A Convenience-RAG-Layer, kein Critical-Path. Workspace bleibt funktional via Graceful-Degradation (DEC-256).
4. Verifikation: jede Resource per `printenv` checken.
5. Live-Smoke: BS-Workspace Frage stellen → AnswerPane zeigt IS-Hits → audit_log-Eintrag pruefen.

## Anti-Patterns

- `NEXT_PUBLIC_STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` setzen → Bundle-Leak ins Browser, Token-Compromise.
- Verschiedene Werte in IS / BS → Konsument bekommt 401, sieht aus wie Reachability-Problem.
- Key in Git committen → Sofortiges Rotate-Procedure (siehe oben).
- Key im Slack/Email teilen → Coolify-UI ist der Quell-of-truth.
