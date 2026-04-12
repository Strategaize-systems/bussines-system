# SLC-406 — Auto-Reply Detection + Wiedervorlagen-Anpassung

## Slice Info
- Feature: FEAT-410
- Priority: Medium
- Delivery Mode: internal-tool

## Goal
Intelligente Auto-Reply-Erkennung mit Abwesenheits-Zeitraum-Extraktion. Automatische Anpassung bestehender Wiedervorlagen. Notification in Mein Tag.

## Scope
- Auto-Reply-Erkennung (Header + Content-Analyse)
- Abwesenheits-Zeitraum-Extraktion (Regex + Bedrock-Fallback)
- Wiedervorlagen-Anpassung (ai_action_queue + Tasks)
- UI: Auto-Reply-Badge auf E-Mails
- UI: Abwesenheits-Info auf Kontakt-Detail
- Notification bei Wiedervorlagen-Verschiebung
- Manuelle Override ("trotzdem am urspruenglichen Datum")

## Out of Scope
- Auto-Reply-Vorhersage basierend auf Historie
- Alternative Kontaktperson vorschlagen

### Micro-Tasks

#### MT-1: Auto-Reply-Erkennung erweitern
- Goal: Content-basierte Erkennung neben bestehender Header-Erkennung
- Files: `cockpit/src/lib/imap/parser.ts` (erweitert), `cockpit/src/lib/ai/classifiers/rule-based.ts` (erweitert)
- Expected behavior: Erkennt "Ich bin vom X bis Y nicht erreichbar", "Out of office", "Automatische Antwort"
- Verification: Test mit verschiedenen Auto-Reply-Texten
- Dependencies: none

#### MT-2: Abwesenheits-Zeitraum-Extraktion
- Goal: Datum-Extraktion aus Auto-Reply-Text (Regex + Bedrock-Fallback)
- Files: `cockpit/src/lib/ai/classifiers/auto-reply-analyzer.ts`
- Expected behavior: Extrahiert Rueckkehr-Datum, Fallback 7 Tage wenn nicht extrahierbar
- Verification: Test mit verschiedenen Datumsformaten (deutsch, englisch, ISO)
- Dependencies: MT-1

#### MT-3: Wiedervorlagen-Anpassung + Notification
- Goal: Bei Auto-Reply: bestehende Wiedervorlagen fuer Kontakt verschieben, Notification erstellen
- Files: `cockpit/src/lib/ai/classifiers/auto-reply-analyzer.ts` (erweitert), `cockpit/src/app/api/cron/classify/route.ts` (erweitert)
- Expected behavior: Wiedervorlage wird auf Rueckkehr-Datum + 1 Tag verschoben, Info-Eintrag in ai_action_queue
- Verification: Test mit Auto-Reply fuer Kontakt mit bestehender Wiedervorlage
- Dependencies: MT-2

#### MT-4: UI-Elemente (Badges, Kontakt-Info, Override)
- Goal: Auto-Reply-Badge auf E-Mails, Abwesenheits-Info auf Kontakt-Detail, Override-Button
- Files: `cockpit/src/app/(app)/emails/inbox-list.tsx` (erweitert), `cockpit/src/app/(app)/contacts/[id]/page.tsx` (erweitert)
- Expected behavior: Badge sichtbar, Abwesenheit auf Kontakt-Profil, "Trotzdem am Originaldatum" Button
- Verification: Browser-Check
- Dependencies: MT-3

## Acceptance Criteria
1. Auto-Replies werden zuverlaessig erkannt (Header + Content)
2. Abwesenheits-Zeitraum wird extrahiert wenn moeglich
3. Wiedervorlagen werden automatisch angepasst (mit Notification)
4. Anpassungen sind rueckgaengig machbar
5. Auto-Reply-Badge auf E-Mails sichtbar
6. Abwesenheits-Info auf Kontakt-Detail
