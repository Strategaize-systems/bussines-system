# Workflow-Automation — Regeln, die fuer Sie arbeiten

> Guide 8 von 12. **Wer:** Admin. **Dauer:** ~10 Min.

## Ziel

Sie wissen, wie Sie Workflow-Regeln per Klick-Builder oder per Klartext (NL-Sculptor) erstellen, wie der Trockenlauf funktioniert und wie Sie Regeln verwalten.

## Voraussetzungen

- Rolle Admin
- Verstaendnis fuer die [Pipeline](pipeline.md) (Trigger-Events kommen daher)

## Was eine Workflow-Regel ist

Eine Regel beschreibt: **"Wenn X passiert, dann tu Y"**.

- **Trigger** (was passiert):
  - `deal.stage_changed` — Deal wechselt Stage
  - `deal.created` — neuer Deal angelegt
  - `activity.created` — neue Activity angelegt

- **Actions** (was tun):
  - `create_task` — Aufgabe anlegen
  - `send_email_template` — Vorlage versenden
  - `create_activity` — Activity anlegen
  - `update_field` — Feld updaten

- **Conditions** (optionale Filter):
  - z.B. nur wenn Deal-Wert > 50k
  - oder Stage = 'Verloren'
  - oder Owner = bestimmter User

## Schritte: Regel per Klick-Builder anlegen

1. Sidebar → "Workflow-Automation" oder `/settings/automation` oeffnen.
2. Klick **"+ Neue Regel"** → 4-Step-Wizard:

### Step 1: Trigger waehlen

Dropdown mit den 3 Trigger-Events. Bei `deal.stage_changed`: zusaetzlich Source-Stage + Target-Stage waehlbar.

### Step 2: Conditions (optional)

Add-Condition-Buttons fuer Filter-Logik. Beispiele:
- `deal.value > 50000`
- `deal.owner.team_id = 'team-x'`
- `activity.type = 'call'`

### Step 3: Actions

Klick **"+ Action hinzufuegen"** → waehlen Sie eine der 4. Pro Action erscheint ein eigenes Sub-Formular:

- **create_task**: title (mit Variablen), due_in_days, assignee
- **send_email_template**: Template-ID aus dropdown, recipient (typisch deal.contact)
- **create_activity**: type, body
- **update_field**: target-Field + new_value

### Step 4: Trockenlauf + Aktivieren

1. **Trockenlauf-Button** → System simuliert die Regel gegen die letzten 100 matching Events und zeigt was passiert waere.
2. Read-Only-Modus — keine echten Inserts.
3. Pruefen Sie das Ergebnis. Wenn OK: **"Regel aktivieren"**.
4. Confirm-Modal mit Pflicht-Checkbox: "Ich bestaetige: Diese Regel wird ab jetzt auf alle neuen <trigger_event>-Events angewandt".
5. Klick **"Aktivieren"** → Regel ist live.

## Schritte: Regel per Klartext (NL-Sculptor) anlegen

Alternative zum Klick-Builder, schneller bei komplexen Regeln.

1. Im **KI-Workspace** klicken Sie **"Workflow bauen"** (6. Berichts-Button, V7.6).
2. Workspace-Mode wechselt zu NL-Builder. Eingabezeile oben wird disabled mit Hint "Workflow-Modus aktiv".
3. Tippen oder diktieren Sie die Regel in **Klartext**:

```
"Wenn ein Deal in Stage 'Verhandlung' eintritt, lege eine Aufgabe an
'Termin fuer Demo planen' faellig in 3 Tagen, zugewiesen an den Deal-Owner."
```

4. KI **sculpt** (Bedrock Claude Sonnet) → erzeugt strukturiertes JSON (Trigger + Conditions + Actions).
5. Vier Karten erscheinen:
   - **NL-Eingabe** — Ihre Klartext-Eingabe
   - **Klarsprache** — KI-Echo "Was ich verstanden habe"
   - **Schema-Editor** — JSON-Ansicht, editierbar
   - **Trockenlauf + Apply** — wie beim Klick-Builder

6. Bei Sculpt-Fail: 1x Re-Prompt-Loop automatisch mit Korrektur-Hint.
7. Bei wiederholtem Fail: Strukturierter Reject mit Begruendung — User editiert NL-Eingabe und versucht erneut.

8. Trockenlauf + Confirm-Modal wie Klick-Builder.

**Cost-Anzeige**: NL-Sculpt-Versuch kostet typisch $0.003-0.006 (siehe `/settings/workflow-automation/nl-history`).

## Schritte: Regel verwalten

Im `/settings/automation`-Listing:

- **Status**: `active`, `disabled`, `draft`
- **Toggle**: pro Regel ein/aus schalten
- **Edit**: oeffnet 4-Step-Wizard mit existierenden Werten
- **Delete**: mit Confirm
- **Trigger-Count**: wie oft die Regel gefeuert hat

NL-Regel-Historie:
- `/settings/workflow-automation/nl-history` zeigt alle NL-Sculpt-Versuche
- Pro Eintrag: Klartext, Sculpt-Cost, Result-Status, JSON-Ausgang

## Wichtige technische Details

### Cron-Fallback
Per default: Regeln feuern **innerhalb der ausloesenden Server-Action**. Plus **Coolify-Cron** `automation-runner` jede Minute, um vergessene Events nachzuholen.

### Recursion-Guard
Wenn eine Regel eine Activity erzeugt, die wiederum eine Regel feuert: Recursion-Guard verhindert Endlos-Loops (DEC-129).

### Stage-Soft-Disable
Falls eine Stage geloescht wird, auf die eine Regel zeigt: Regel wird soft-disabled (DEC-133), nicht hart geloescht.

### Audit-Log
Jeder Regel-Trigger schreibt einen Audit-Log-Eintrag mit `triggered_by_user_id` (= triggering User, nicht Workflow-System).

## Erwartetes Ergebnis

- Regeln laufen vollautomatisch ohne Ihr Zutun
- Aufgaben werden angelegt, E-Mails versendet, Activities erzeugt
- Audit-Log zeigt was wann gefeuert hat

## Tipps

- **Klick-Builder fuer einfache Regeln**, **NL-Sculptor fuer komplexe** — NL ist schneller wenn Sie schon wissen, was Sie wollen
- **Trockenlauf IMMER nutzen** — Regeln koennen vermeintlich harmlos sein und trotzdem massenhaft Spam erzeugen, wenn die Conditions falsch sind
- **Confirm-Modal-Checkbox ernst nehmen** — sie ist als Click-Drift-Schutz designed (V7.5 DEC-207)
- **NL-Historie als Diagnose** — wenn eine Regel komisch wirkt, schauen Sie was der Sculpt-Versuch im JSON ausgegeben hat
- **Recursion-Guard nicht ausschalten** — er ist Schutz vor versehentlichen Loops

## Haeufige Probleme

### "Regel feuert nicht"
1. Pruefen: Status `active`?
2. Pruefen: Trigger-Event matched?
3. Pruefen: Conditions erfuellt? (oft Tippfehler in Field-Namen)
4. Pruefen: Cron-Fallback laeuft? (`docker logs <cron-container>`)
5. Audit-Log durchsuchen: gab es Trigger-Events ohne Regel-Feuer?

### "NL-Sculpt schlaegt fehl"
- Pruefen: Sind alle Field-Namen im FIELD_WHITELIST vorhanden? NL-Sculptor erfindet keine Feldnamen.
- Versuch: Klartext-Eingabe konkreter formulieren.
- Fallback: Klick-Builder nutzen.

### "Trockenlauf zeigt unerwartetes Ergebnis"
- Conditions sind oft zu offen formuliert. Hinzufuegen + Eingrenzen.
- NL-Schema editieren VOR Apply.

### "Regel feuert mehrfach pro Event"
Recursion-Guard sollte das verhindern. Bei wiederholtem Auftreten: Bug — Admin kontaktieren mit audit_log-Snapshot.

### "ISSUE-066 Drilldown-Mutation-Gap"
Im Read-Only-Drilldown sollten Workflow-Regeln NICHT feuern. V7.5-Middleware-Pfad-Regex (`/^\/team\/[^/]+\//`) markiert die Requests als read-only-context, und `assertNotReadOnlyContext()` blockiert. Falls Sie das Verhalten anders erleben: Admin kontaktieren.

## Siehe auch

- [Settings — Workflow-Automation](settings.md)
- [KI optimal nutzen](ki-usage.md) — wie NL-Sculptor funktioniert
- [Pipeline](pipeline.md) — Quelle der `deal.stage_changed`-Trigger
