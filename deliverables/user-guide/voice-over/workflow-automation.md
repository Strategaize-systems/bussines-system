# Lektion 8 — Workflow-Automation

**Dauer:** 2:45 | **Wer:** Admin | **Lernziel:** Sie wissen, wie Sie Regeln per Klick-Builder oder NL-Sculptor bauen.

---

## Szene 1: Was eine Regel ist (0:00–0:25)
**Bildschirm:** Workflow-Automation-Listing mit aktiven Regeln
**Sprecher:** "Eine Workflow-Regel ist ein 'wenn X passiert, dann tu Y'. Trigger sind Stage-Wechsel, neuer Deal oder neue Activity. Actions sind Aufgabe anlegen, E-Mail versenden, Activity anlegen oder Feld updaten. Conditions filtern, wann die Regel feuert."

## Szene 2: Klick-Builder (0:25–1:00)
**Bildschirm:** 4-Step-Wizard, Trigger waehlen, Conditions, Actions, Trockenlauf
**Sprecher:** "Klicken Sie 'Neue Regel'. Wizard mit vier Steps. Step eins: Trigger waehlen. Step zwei: Conditions setzen — zum Beispiel Deal-Wert ueber fuenfzigtausend. Step drei: Actions hinzufuegen — zum Beispiel Aufgabe anlegen 'Vertrag pruefen'. Step vier: Trockenlauf."

## Szene 3: Trockenlauf (1:00–1:30)
**Bildschirm:** Trockenlauf-Karte mit simulierten Ergebnissen gegen letzte 100 Events
**Sprecher:** "Trockenlauf simuliert die Regel gegen die letzten hundert Matching-Events. Sie sehen was passieren WUERDE, ohne dass es passiert. Wenn das passt, klicken Sie 'Regel aktivieren'. Confirm-Modal mit Pflicht-Checkbox als Click-Drift-Schutz."

## Szene 4: NL-Sculptor (1:30–2:10)
**Bildschirm:** KI-Workspace, Klick "Workflow bauen", Klartext-Eingabe, KI sculpt
**Sprecher:** "Alternative zum Klick-Builder: NL-Sculptor. Im KI-Workspace klicken Sie 'Workflow bauen'. Tippen oder diktieren Sie die Regel in Klartext: 'Wenn ein Deal in Verhandlung eintritt, lege eine Aufgabe an "Demo-Termin planen" faellig in drei Tagen, zugewiesen an den Deal-Owner.' KI sculpt das in ein strukturiertes JSON."

## Szene 5: Karten + Schema-Editor (2:10–2:35)
**Bildschirm:** Vier Karten: NL-Eingabe, Klarsprache, Schema-Editor, Trockenlauf+Apply
**Sprecher:** "Vier Karten erscheinen. Klarsprache zeigt 'was die KI verstanden hat'. Schema-Editor zeigt das JSON und ist editierbar. Trockenlauf wie beim Klick-Builder. Confirm-Modal. Bei Sculpt-Fail wird einmal re-prompted, dann strukturiert reject."

## Szene 6: Cost + Audit (2:35–2:45)
**Bildschirm:** /settings/workflow-automation/nl-history mit Cost-Spalte
**Sprecher:** "Cost-Anzeige unter NL-Regel-Historie. Sculpt-Versuch kostet typisch drei bis sechs Cent. In der naechsten Lektion: Custom-Reports."

---

**Production-Notes:** Bei Trockenlauf-Karte das "no real insert"-Banner deutlich.
