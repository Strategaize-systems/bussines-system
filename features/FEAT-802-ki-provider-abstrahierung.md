# FEAT-802 — KI-Provider-Anzeige im User-UI abstrahieren

## Status

planned (V8)

## Created

2026-05-19

## Why

User-Direktive 2026-05-19 nach V7.6 `/final-check` (BL-480, medium prio): Im User-sichtbaren UI darf nicht der konkrete KI-Anbieter (Bedrock, Anthropic Claude Sonnet, Amazon Web Services) erscheinen.

**Begruendung User:**
1. **Vendor-Lock-in-Wahrnehmung vermeiden** — User soll nicht den Eindruck haben, das Produkt sei an einen US-Cloud-Provider gebunden
2. **Konsistenz** — auch nicht alle anderen SaaS-Anbieter zeigen explizit "OpenAI" oder "Anthropic" im UI an
3. **Anbieterwechsel-Flexibilitaet** — interner Bedrock→Azure-Switch oder spaetere LLM-Diversifikation soll keinen UI-Refactor erfordern

**Konkrete Fundstellen (cockpit/src):**
- `components/ki-workspace/AnswerPane.tsx:83` — Spinner-Label: `"Bedrock arbeitet ..."` (User-sichtbar)
- `components/item-sheet/ItemSheet.tsx` — `BedrockSection`-Component (function-name + ggf. ARIA-Labels — pruefen)
- `lib/automation/sculptor-cost.ts` — Provider-Label in Cost-Display (pruefen)
- Weitere `Bedrock`-Strings in 15+ Files — Grossteil sind interne Code-Identifier (OK, nicht User-sichtbar), aber alle User-sichtbaren Strings + Component-Display-Labels muessen abstrahiert werden

**Was bleibt interne Naming:** Variablennamen, Funktionsnamen, Modul-Pfade (`lib/bedrock-client.ts` etc.) — kein Mass-Rename des Codes, das waere out-of-scope Refactor.

## Scope

### In Scope

- Alle User-sichtbaren Strings "Bedrock" / "Claude Sonnet" / "Anthropic" / "AWS" durch neutralen Begriff ersetzen (Vorschlag: "KI" oder "Strategaize KI")
- `BedrockSection`-Component umbenennen oder umschliessen — Component-Display-Label muss neutral sein, intern darf "Bedrock" bleiben
- ARIA-Labels und Tooltips pruefen — keine Provider-Namen
- Audit-Log-User-View pruefen — falls Audit-Log User-sichtbar Provider-Namen zeigt (`audit_log.actor`, `audit_log.metadata`), neutralen Display-Wrapper
- Doku-Snippet im KI-Workspace ("Powered by...") falls vorhanden — entfernen oder neutral
- Settings-Page: falls irgendwo Provider-Anzeige existiert, neutralisieren

### Out of Scope

- Code-Mass-Rename (`bedrock-client.ts` → `llm-client.ts`) — out-of-scope, das ist Stack-Refactor
- Provider-Switch implementieren (Azure/OpenAI/etc.) — gehoert in eigenes V (z.B. V9+ Provider-Diversifikation)
- Internal Audit-Log-Schema-Change — Audit-Log darf intern weiter Provider-Namen tracken
- Pre-Production-Compliance-Display (DPA, Region) — ist eigenes Compliance-Thema, nicht UI-Abstrahierung
- DEC-211 Bedrock-Region-Pin (eu-central-1) — bleibt unveraendert

## Acceptance Criteria

- Visueller Walkthrough durch alle Pages (Mein-Tag, Deal-Detail, Cockpit, /team, Settings) zeigt **keinen** "Bedrock"/"Claude Sonnet"/"Anthropic"/"AWS"-String mehr im UI
- AnswerPane-Spinner zeigt "KI arbeitet ..." oder aequivalent
- ItemSheet KI-Sections rendern als "KI-Zusammenfassung" / "KI-Analyse" / aehnlich
- `npm run build` + `npm run lint` + `npm run test` clean
- Pre-Existing-Tests fuer ItemSheet + AnswerPane gruen (Label-Assertions ggf. anpassen)

## Open Points

- Endgueltige Bezeichnung: "KI" / "Strategaize KI" / "Assistent" — Entscheidung in Requirements ODER Slice-Planning
- Audit-Log-Display pruefen ob User-sichtbar Provider-Strings auftauchen — wenn ja: Wrapper-Funktion

## Related

- BL-480 (Backlog-Item, medium prio, 2026-05-19)
- DEC-211 (Bedrock-Region-Pin eu-central-1)
- `data-residency.md` Rule (EU-only ueber Bedrock)
