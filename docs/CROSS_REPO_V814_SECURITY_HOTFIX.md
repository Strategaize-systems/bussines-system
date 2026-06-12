# Cross-Repo Security-Hotfix V8.14 — Applicability-Matrix + Mirror-Plan

## Zweck

BS V8.14 SLC-912 schliesst 7 Security-Findings aus dem Multi-Lens-Audit 2026-06-07. Diese Findings sind **Pattern-Klassen, die mit hoher Wahrscheinlichkeit auch in OP / IS / immoscheckheft existieren**. Dieses Dokument ist der verbindliche Tracker, damit die Fixes cross-repo ankommen und maximal wiederverwendet werden (Founder-Direktive 2026-06-12: "alles was wir lernen + umsetzen gilt auch fuer alle anderen Repos, maximal reuse").

BS ist **Origin** (kanonische Quelle). Jedes andere Repo nutzt den BS-Fix als 1:1-Template (per `strategaize-pattern-reuse.md` BLOCKING) und baut NICHT neu. Pro Finding ist die Anwendbarkeit je Repo zu **verifizieren** (VERIFY) bevor eine Mirror-Slice geschnitten wird — nicht blind annehmen.

## Status BS V8.14 SLC-912

- /slice-planning DONE 2026-06-11 (RPT-626). /backend OFFEN (gated auf V8.12 STABLE).
- Origin-Code entsteht in /backend → danach werden die `PENDING`-Rows in `strategaize-pattern-reuse.md` mit realen Pfaden + Commit-Hash gefuellt.

## Applicability-Matrix (VERIFY pro Repo vor Mirror-Slice)

| Finding (BS-ISSUE) | Pattern-Klasse | BS (Origin) | OP | IS | immoscheckheft |
|---|---|---|---|---|---|
| ISSUE-098 | profiles.role Column-Level-Protection (Trigger, service_role-aware) | FIX V8.14 | VERIFY (Multi-Tenant → hoch wahrscheinlich) | VERIFY | VERIFY (Multi-Mandant → hoch wahrscheinlich) |
| ISSUE-099 | Login-Rate-Limit / Lockout + generische Error-Message | FIX V8.14 | VERIFY (jede Login-Action) | VERIFY | VERIFY |
| ISSUE-100 | Public-Markdown/DSE Stored-XSS-Sanitize | FIX V8.14 | VERIFY (Public-DSE/Impressum?) | VERIFY | VERIFY |
| ISSUE-101+102 | Branding-Logo Role-Check + SVG-MIME-Block | FIX V8.14 | VERIFY (Branding-Upload?) | VERIFY | VERIFY |
| ISSUE-103+104 | Log-PII-Redaction-Keys + Auth-Helper fail-closed | FIX V8.14 | VERIFY | VERIFY | VERIFY |

Legende: **FIX V8.14** = wird in dieser Slice gefixt (Origin). **VERIFY** = Gap je Repo per Code-Audit bestaetigen, dann Mirror-Slice. Kein Eintrag bleibt unverifiziert "applicable" stehen.

## Mirror-Plan (NICHT in BS V8.14 — eigene Repos, eigener Workflow)

Reihenfolge: **erst BS V8.14 /qa-PASS** (Origin-Pattern steht) → dann pro Repo:

1. **Per-Repo-Audit:** `grep` der 5 Symbole im Ziel-Repo (`.update({ role`, Login-Action, Markdown-Renderer `sanitize:`, `uploadLogo`/ALLOWED_MIME, getCurrentUserRole-Helper). Treffer → Finding bestaetigt.
2. **Mirror-Slice schneiden** (eigenes /requirements light + /slice-planning + /backend), die den BS-Fix 1:1 portiert (Source-Path-Header-Kommentar auf BS-Origin).
3. **Search-First-Pflicht** (`strategaize-pattern-reuse.md`): vor dem Bauen die BS-Origin-Row in der Reuse-Tabelle lesen.

Cross-Repo-Reihenfolge-Empfehlung (nach Multi-User-Reife / Pre-Customer-Live-Naehe): OP zuerst (Multi-Mandant aktiv), dann IS, dann immoscheckheft (heute Single-Founder, geringerer Druck — aber Pre-Customer-Live Pflicht).

## Verweise

- `slices/SLC-912-v814-security-hotfix.md` — Origin-Slice (Cross-Repo-Reuse-DoD-Section)
- `.claude/rules/strategaize-pattern-reuse.md` (Dev-System) — 5 BLOCKING-Reuse-Rows (PENDING bis /qa)
- Dev-System IMP-1207 (Column-Protection service_role-Pfad) + IMP-1200 (Column-Level-Protection in RLS-Sweep)
- Praezedenz: `docs/CROSS_REPO_V813_STORAGE_GRANTS.md` (Storage-GRANTs-Cross-Repo-Mirror BS→OP)
- Audit-Quelle: Multi-Lens-Security-Audit 2026-06-07 (`wf_2c908025-94f`) + `docs/KNOWN_ISSUES.md` ISSUE-098..105
