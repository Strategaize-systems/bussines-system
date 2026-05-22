# Lektion 12 — Steuern: NL+DE-VAT + Reverse-Charge

**Dauer:** 2:15 | **Wer:** Admin | **Lernziel:** Sie verstehen die Steuerlogik und Reverse-Charge-Voraussetzungen.

---

## Szene 1: business_country setzen (0:00–0:30)
**Bildschirm:** /settings/branding, business_country-Dropdown NL/DE, VAT-ID-Eingabe
**Sprecher:** "Die Steuerlogik haengt am business_country in Branding. NL oder DE. Bei NL ist Default-Steuersatz einundzwanzig Prozent, bei DE neunzehn. Plus Ihre VAT-ID — Format wird validiert."

## Szene 2: Steuersaetze-Whitelist (0:30–0:50)
**Bildschirm:** Editor mit Steuersatz-Dropdown, fuenf Werte sichtbar: 0, 7, 9, 19, 21
**Sprecher:** "DB-Whitelist: nur fuenf Werte erlaubt. Einundzwanzig fuer NL-Standard. Neunzehn fuer DE-Standard. Neun fuer NL-Reduziert. Sieben fuer DE-Reduziert. Null fuer Steuerfrei oder Reverse-Charge."

## Szene 3: Reverse-Charge — Wann (0:50–1:25)
**Bildschirm:** Drei Checkmarks Animation: Sender-VAT-ID, Empfaenger-VAT-ID, EU-Cross-Border-Country
**Sprecher:** "Reverse-Charge gilt bei B2B-Empfaengern in einem anderen EU-Mitgliedsstaat als NL. Drei Voraussetzungen: Sender-VAT-ID gesetzt im Branding. Empfaenger-VAT-ID gesetzt in der Firma. Empfaenger-Country in EU-Whitelist und ungleich NL."

## Szene 4: Toggle aktivieren (1:25–1:50)
**Bildschirm:** Angebot-Editor mit Reverse-Charge-Section, Toggle ON, tax_rate springt auf 0
**Sprecher:** "Im Angebot-Editor sehen Sie die Reverse-Charge-Section. Wenn alle Voraussetzungen erfuellt: Toggle aktivierbar. Klick — Reverse-Charge true, tax_rate null. Server validiert, Audit-Log dokumentiert."

## Szene 5: PDF-Render (1:50–2:15)
**Bildschirm:** PDF-Output mit bilingualem Block "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC"
**Sprecher:** "Im gerenderten PDF erscheint der bilinguale Hinweis 'BTW verlegd, Reverse Charge, Article 196 VAT Directive zweitausendsechs slash einhundertzwoelf slash EC' plus beide VAT-IDs als Zeile. Plus VAT-ID im Adress-Footer. Wichtig: ICP-Meldungspflicht in NL ist Ihre Aufgabe — quartalsweise Opgaaf ICP. Steuerberatung pflicht. Das war die letzte Lektion. Viel Erfolg."

---

**Production-Notes:** Bei "Steuerberatung pflicht" Pause mit Disclaimer-Bauchbinde.
