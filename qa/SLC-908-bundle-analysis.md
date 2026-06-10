# SLC-908 Bundle-Analyse — zxcvbn Lazy-Chunk-Verifikation (AC-908-5 / R-V812-3)

- Datum: 2026-06-10
- Slice: SLC-908 (V8.12 Passwort-Policy 12+ + zxcvbn, BL-502)
- Build: `npm run build` (Next.js 16.2.3, standalone) — Exit 0, "Compiled successfully"

## Ziel

zxcvbn (~800KB minified) darf den Initial-/Main-Bundle nicht belasten. Mitigation
(R-V812-3): Laden ausschliesslich via `await import("zxcvbn")` — sowohl in der
Server-Action-Helper-Function (`src/lib/auth/password-policy.ts`) als auch im
Client-Component (`src/components/auth/PasswordStrengthIndicator.tsx`).

## Befund (PASS)

| Pruefung | Ergebnis |
|---|---|
| Chunks, die das `zxcvbn`-Token enthalten | **genau 1** (`.next/static/chunks/0i6s3m~x1lsvj.js`) |
| Groesse des zxcvbn-Chunks | **800 KB** (entspricht erwarteter zxcvbn-Groesse) |
| Chunk-Typ | Async-Split-Chunk (webpack `~`-Namenskonvention = on-demand geladen) |
| zxcvbn-Dictionaries (`adjacency_graphs`/`frequency_lists`/`zxcvbn_dictionary`) in Shared-/Framework-Chunk? | **NEIN** (0 Treffer in allen anderen Chunks) |

Verifikationsbefehle:

```bash
# Genau 1 Chunk enthaelt zxcvbn:
grep -rlc "zxcvbn" .next/static/chunks/*.js | wc -l        # -> 1
ls -lh .next/static/chunks/0i6s3m~x1lsvj.js                # -> 800K

# zxcvbn-Internals in keinem Shared-/Framework-Chunk:
grep -rl "adjacency_graphs\|frequency_lists\|zxcvbn_dictionary" .next/static/chunks/*.js
# -> nur 0i6s3m~x1lsvj.js (kein framework-/main-/shared-Chunk)
```

## Schlussfolgerung

zxcvbn ist in einem einzelnen, on-demand geladenen Async-Chunk isoliert und liegt
**nicht** im Main-/Shared-Bundle. Die `set-password`-Route laedt zxcvbn erst, wenn
die Strength-Pruefung tatsaechlich ausgefuehrt wird (Server-Action) bzw. der
Live-Indikator rendert (Client). **AC-908-5 = PASS, R-V812-3 mitigated.**
