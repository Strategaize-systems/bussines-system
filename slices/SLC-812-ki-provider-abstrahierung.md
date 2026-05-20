# SLC-812 — KI-Provider-Anzeige im User-UI abstrahieren (FEAT-802)

## Metadata
- **Slice ID:** SLC-812
- **Version:** V8
- **Feature:** FEAT-802 KI-Provider-Anzeige abstrahieren
- **Backlog:** BL-480
- **Status:** planned
- **Priority:** Medium (vendor-neutral UI vor Customer-Live-Pre-Phase)
- **Created:** 2026-05-20
- **Estimated Effort:** ~1-2h Code + ~20 Min /qa = ~1.5-2.5h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (rein UI-Strings, ~7 Datei-Touches, kein Schema, kein neuer Code-Pfad)
- **Pattern-Reuse:** keine spezielle — generische Find-and-Replace plus 1 Display-Wrapper.
- **Reihenfolge-Empfehlung:** SLC-812 ZUERST in V8 (DEC-226). Minimal-Risiko, schnelle V8-Sichtbarkeit, blockiert nichts.

## Why

User-Direktive 2026-05-19 nach V7.6 /final-check (BL-480, medium prio): Im User-sichtbaren UI darf nicht der konkrete KI-Anbieter (Bedrock, Anthropic Claude Sonnet, AWS) erscheinen. Begruendung: Vendor-Lock-in-Wahrnehmung vermeiden, Anbieterwechsel-Flexibilitaet, kein Disclosure des konkreten Providers gegenueber Endkunden.

Architektur-Entscheidungen aus V8 /architecture (RPT-478):
- **DEC-221** KI-Naming "KI" (statt "Strategaize KI" / "Assistent")
- String-Substitution statt Mass-Rename — Code-Identifier (`bedrockClient`, `lib/bedrock-client.ts`) bleiben

## Scope

**In Scope:**

- **String-Substitutionen** in User-sichtbaren Stellen:
  - [src/components/ki-workspace/AnswerPane.tsx:83](cockpit/src/components/ki-workspace/AnswerPane.tsx) — "Bedrock arbeitet ..." → "KI arbeitet ..."
  - [src/components/ki-workspace/nl-builder-inline.tsx](cockpit/src/components/ki-workspace/nl-builder-inline.tsx) — Error-Toast "Bedrock-Aufruf fehlgeschlagen" → "KI-Aufruf fehlgeschlagen"
  - [src/app/(app)/emails/compose/inline-edit-dialog.tsx](cockpit/src/app/(app)/emails/compose/inline-edit-dialog.tsx) — Dialog-Description "Bedrock modifiziert ..." → "KI modifiziert ..."
  - [src/components/item-sheet/ItemSheet.tsx](cockpit/src/components/item-sheet/ItemSheet.tsx) — `BedrockSection`-Display-Label "Bedrock-Zusammenfassung" o.ae. → "KI-Zusammenfassung". **Component-Datei-Name bleibt** (interner Code-Identifier).
  - [src/components/deals/deal-timeline.tsx](cockpit/src/components/deals/deal-timeline.tsx) + [src/components/deals/deal-workspace.tsx](cockpit/src/components/deals/deal-workspace.tsx) — User-sichtbare Provider-Strings pruefen, ggf. ersetzen
- **Display-Wrapper-Funktion** `formatModelDisplayName(modelId)` in [src/lib/automation/sculptor-cost.ts](cockpit/src/lib/automation/sculptor-cost.ts) oder neuem Helper:
  - Input: `"eu.anthropic.claude-sonnet-4-6"` / `"eu.anthropic.claude-sonnet-4-6-20250514-v1:0"` etc.
  - Output: `"KI"` (kompakt) oder optional `"KI Sonnet"` falls Detail-Anzeige gewuenscht
  - Genutzt in Cost-Display + Audit-Log-User-Views falls vorhanden
- **ARIA-Label-Walkthrough**:
  - `aria-label`-Attribute mit "Bedrock" / "Claude" / "Anthropic" / "AWS" suchen + ersetzen
  - Title-Attribute (Tooltip-Text) pruefen
- **Snapshot-Tests** anpassen falls Label-Assertions kollidieren

**Out of Scope:**

- Code-Mass-Rename (`bedrock-client.ts` → `llm-client.ts`, `BedrockSection` Component-File-Name) — out-of-V8-Scope
- Provider-Switch implementieren (Azure/OpenAI/etc.) — V9+ Provider-Diversifikation
- Audit-Log-Schema-Change — Audit-Log persistiert weiter `model_id` mit voller AWS-ID
- Pre-Production-Compliance-Display (DPA, Region) — eigenes Compliance-Thema, nicht V8

## Acceptance Criteria

- **AC1**: Visueller Walkthrough durch Mein-Tag, Deal-Detail, Cockpit, /team, Settings, E-Mail-Compose zeigt **keinen** "Bedrock" / "Claude Sonnet" / "Anthropic" / "AWS"-String im User-UI
- **AC2**: AnswerPane-Spinner zeigt "KI arbeitet ..."
- **AC3**: ItemSheet KI-Section-Headers rendern "KI-Zusammenfassung" / "KI-Analyse" o.ae.
- **AC4**: NL-Builder Error-Toast zeigt "KI-Aufruf fehlgeschlagen"
- **AC5**: E-Mail-Compose Edit-Dialog zeigt "KI modifiziert ..."
- **AC6**: `formatModelDisplayName()` exportiert + von Cost-Display + Audit-Log-View aufgerufen, returnt "KI" fuer aktuell genutzte Model-IDs
- **AC7**: `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` PASS (mind. 779 Tests, ggf. mehr durch Snapshot-Anpassungen)
- **AC8**: ARIA-Walkthrough negativ — `grep -ri 'aria-label.*Bedrock' src/` zeigt 0 User-UI-Treffer

## Micro-Tasks

### MT-1: Audit + Inventur User-sichtbarer Provider-Strings
- **Goal**: Vollstaendige Liste aller User-sichtbaren Provider-Strings erstellen, um Substitutions-Phase mit konkreter Trefferliste zu starten
- **Files**: keine Aenderung — nur Inventur via `grep -rln "Bedrock|Claude|Anthropic|AWS" src/components src/app/\(app\) --include='*.tsx'`
- **Expected behavior**: Liste mit allen User-sichtbaren Trefferstellen (excluding test files, code identifiers, audit_log-context-strings) + Pre-Existing-Mapping aus FEAT-802-Spec abgleichen
- **Verification**: Inventur-Output als Kommentar in MT-2-Commit dokumentiert
- **Dependencies**: keine

### MT-2: String-Substitutionen in 5+ Files
- **Goal**: "Bedrock" / "Claude Sonnet" / "Anthropic" / "AWS" durch "KI" in allen User-UI-Strings ersetzen
- **Files**:
  - `cockpit/src/components/ki-workspace/AnswerPane.tsx`
  - `cockpit/src/components/ki-workspace/nl-builder-inline.tsx`
  - `cockpit/src/app/(app)/emails/compose/inline-edit-dialog.tsx`
  - `cockpit/src/components/item-sheet/ItemSheet.tsx`
  - weitere Files aus MT-1-Inventur
- **Expected behavior**: AnswerPane-Spinner: "KI arbeitet ...". NL-Builder-Error-Toast: "KI-Aufruf fehlgeschlagen". Edit-Dialog-Description: "KI modifiziert den Body gemaess Anweisung." ItemSheet-Section-Headers: "KI-Zusammenfassung" / "KI-Analyse" etc. Code-Identifier (Variable-Namen, Component-File-Namen) unveraendert.
- **Verification**: `grep -rn '"Bedrock"\|"Claude Sonnet"\|"Anthropic"\|>Bedrock<\|>Claude<' src/components src/app/\(app\) --include='*.tsx'` ohne Test-Files: 0 Treffer
- **Dependencies**: MT-1

### MT-3: formatModelDisplayName-Helper-Funktion
- **Goal**: Zentraler Display-Wrapper, der Model-ID-Strings auf neutralen User-Text mapped
- **Files**:
  - `cockpit/src/lib/llm-display.ts` (NEU) ODER ergaenzt in `cockpit/src/lib/automation/sculptor-cost.ts`
- **Expected behavior**: `formatModelDisplayName("eu.anthropic.claude-sonnet-4-6")` → `"KI"`. Akzeptiert beide Aliase (Kurz- + Lang-Form). Default-Fallback bei unbekannter Model-ID: `"KI"`.
- **Verification**: Vitest +3 Tests: Kurz-Form, Lang-Form, Unknown-Model-Fallback
- **Dependencies**: keine

### MT-4: Cost-Display + Audit-Log-View Helper-Aufruf
- **Goal**: Cost-Display in V7.5 Sculptor-Cost-UI und ggf. NL-History-Page (Admin-View) nutzen `formatModelDisplayName()` statt Model-ID-Strings direkt zu rendern
- **Files**:
  - `cockpit/src/lib/automation/sculptor-cost.ts` Display-Pfade
  - `cockpit/src/components/settings/nl-history-table.tsx` (falls Model-ID-Spalte User-sichtbar)
- **Expected behavior**: "KI-Kosten: ~$X" statt "Bedrock-Kosten: ~$X". Audit-Log-Display zeigt "KI" statt "eu.anthropic.claude-sonnet-4-6".
- **Verification**: Visueller Smoke auf `/settings/workflow-automation/nl-history` (Admin) zeigt "KI" anstatt Model-ID
- **Dependencies**: MT-3

### MT-5: ARIA-Walkthrough + Title-Attribute
- **Goal**: ARIA-Labels und HTML title-Attribute pruefen
- **Files**: alle aus MT-1-Inventur falls ARIA-Treffer vorhanden
- **Expected behavior**: `aria-label`, `title`-Attribute mit Provider-Namen sind ersetzt
- **Verification**: `grep -rEn 'aria-label="[^"]*Bedrock|title="[^"]*Bedrock' src/`: 0 User-UI-Treffer
- **Dependencies**: MT-1

### MT-6: Build + Lint + Test + Snapshot-Adjustments
- **Goal**: Pre-Existing-Tests gruen, ggf. Snapshot-Tests fuer Label-Diffs aktualisieren
- **Files**: Snapshots in `__snapshots__/` von ItemSheet + AnswerPane falls vorhanden
- **Expected behavior**: `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` 779+ PASS
- **Verification**: Lokaler Lauf gruen
- **Dependencies**: MT-2, MT-3, MT-4, MT-5

### MT-7: /qa Live-Smoke + Records-Sync
- **Goal**: Live-Smoke gegen Production-Image (V7.6) im Worktree-Build, Verifikation aller 8 ACs
- **Files**: keine — RPT-XXX erstellen + records updaten
- **Expected behavior**: Visueller Walkthrough cross-page bestaetigt 0 Provider-Strings sichtbar. RPT-XXX dokumentiert AC1-AC8.
- **Verification**: /qa-Skill liefert PASS. slices/INDEX.md SLC-812 status `done`, BL-480 status `done`, RPT-XXX angelegt.
- **Dependencies**: MT-6

## Open Points

- ItemSheet KI-Section-Header genaue Naming-Entscheidung in Implementation-Phase (KI-Zusammenfassung / KI-Analyse / KI-Briefing — alle plausibel, je nach Section-Inhalt)
- "KI Sonnet"-Variante in `formatModelDisplayName()` standardmaessig oder optional? Default `"KI"` ohne Modell-Detail, optional via 2. Parameter
- E-Mail-Compose Edit-Dialog hat eventuell Doku-Snippet ("Powered by ...") im Hilfetext — Walkthrough klaert

## Related

- BL-480 (Backlog-Item, medium prio, 2026-05-19)
- DEC-211 (Bedrock-Region-Pin eu-central-1, bleibt unveraendert)
- DEC-221 (KI-Naming "KI", V8 /architecture 2026-05-20)
- FEAT-802 ([features/FEAT-802-ki-provider-abstrahierung.md](features/FEAT-802-ki-provider-abstrahierung.md))
