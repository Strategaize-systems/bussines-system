# SLC-418 — Browser-Push + Service Worker

## Slice Info
- Feature: FEAT-409 B (interne Erinnerung via Push)
- Priority: Medium
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-346 (Teil-Push)

## Goal
Browser-Push-Benachrichtigungen fuer interne Meeting-Erinnerungen einfuehren: User abonniert ueber Settings-Seite, Service Worker empfaengt Push, Notification mit Meeting-Titel + Link. SMTP-Fallback wenn Push nicht verfuegbar. VAPID-Keys werden einmalig generiert.

## Scope
- VAPID-Keys einmal generieren (`npx web-push generate-vapid-keys`), als ENV hinterlegen
- `web-push` npm-Dependency (MIT)
- Service Worker `/public/sw.js` mit `push` + `notificationclick` Handlern
- Client-seitiger Registrations-Flow in Settings-UI: "Browser-Push aktivieren" Button
- `POST /api/push/subscribe` (speichert Subscription in `user_settings.push_subscription`)
- `DELETE /api/push/subscribe` (loescht Subscription)
- Server-Helper `/lib/push/send.ts` mit `sendPushNotification(userId, payload)`
- Reminder-Cron (SLC-417) erweitern: wenn `push_subscription` vorhanden → Push, sonst SMTP-Fallback
- Push-Manifest + Icon `/public/push-icon.png` (einfaches Strategaize-Logo-Icon)
- Safari-iOS-Hinweis in UI (funktioniert erst bei Add-to-Home-Screen iOS 16.4+)

## Out of Scope
- Marketing-Push-Notifications
- Push an externe Teilnehmer
- KI-Agenda (SLC-419)
- Push fuer andere Bereiche (Tasks, Deals) — hier nur Meeting-Reminder

## Micro-Tasks

### MT-1: VAPID-Key-Generierung + ENV
- Goal: Keys einmalig erzeugen, in Coolify ENV + `env vars_business.txt` Platzhalter
- Files: `env vars_business.txt` (als Platzhalter), Coolify Env (reale Werte geheim)
- Expected behavior: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` gesetzt
- Verification: `coolify env show vapid_public_key` liefert Public-Key, Private nicht im Repo
- Dependencies: none

### MT-2: web-push Dependency
- Goal: `web-push` ^3.6 installieren + Types
- Files: `cockpit/package.json`, `cockpit/package-lock.json`
- Expected behavior: Build-Check gruen
- Verification: `npm ls web-push`
- Dependencies: none

### MT-3: Service Worker
- Goal: `/public/sw.js` mit `push`- und `notificationclick`-Handlern
- Files: `cockpit/public/sw.js`, `cockpit/public/push-icon.png`
- Expected behavior: Zeigt Notification mit Titel + Body, Klick navigiert zu Meeting-URL
- Verification: Browser-DevTools Application-Tab zeigt aktiven Service Worker, Test-Push triggert Notification
- Dependencies: MT-1

### MT-4: Client-Registrations-Flow
- Goal: Settings-Page bekommt "Browser-Push aktivieren"-Button
- Files: `cockpit/src/components/settings/PushSubscribeButton.tsx`, Integration in `cockpit/src/components/settings/MeetingSettingsForm.tsx`
- Expected behavior: Button erfragt Permission, registriert Service Worker, postet Subscription an API, zeigt Status (Aktiv/Inaktiv)
- Verification: Klick-Test in Chrome + Firefox
- Dependencies: MT-3

### MT-5: subscribe/unsubscribe API
- Goal: Endpoints in Next.js App-Router
- Files: `cockpit/src/app/api/push/subscribe/route.ts`
- Expected behavior: POST speichert Subscription in `user_settings.push_subscription` JSONB; DELETE setzt auf null
- Verification: curl-Test; DB-Zelle prueft
- Dependencies: MT-4 (Daten-Form)

### MT-6: Server-Push-Helper
- Goal: `/lib/push/send.ts` — Wrapper um `web-push.sendNotification`
- Files: `cockpit/src/lib/push/send.ts`
- Expected behavior: Lieste Subscription, sendet Notification, bei 410 Gone: Subscription loeschen
- Verification: Unit-Test mit Mock
- Dependencies: MT-2

### MT-7: Reminder-Cron Push-Integration
- Goal: SLC-417 Reminder-Cron pruft `push_subscription`, wenn vorhanden → Push, sonst SMTP
- Files: `cockpit/src/app/api/cron/meeting-reminders/route.ts` (aendern)
- Expected behavior: Dual-Pfad; 410-Gone-Clean-up wirkt
- Verification: Test-Meeting + aktiver Push → Notification; ohne Subscription → SMTP
- Dependencies: MT-6, SLC-417 MT-6

### MT-8: iOS-Hinweis in UI
- Goal: User-facing Hinweis "Auf iPhone: Add to Home Screen erforderlich"
- Files: `cockpit/src/components/settings/PushSubscribeButton.tsx` (inline-Hinweis)
- Expected behavior: Hinweis nur bei Safari/iOS sichtbar (User-Agent-Sniffing)
- Verification: iOS-Safari zeigt Hinweis, Chrome-Desktop nicht
- Dependencies: MT-4

## Acceptance Criteria
1. User aktiviert Browser-Push in Settings, Permission-Dialog erscheint
2. Service Worker ist registriert und aktiv (DevTools Check)
3. Subscription wird in `user_settings.push_subscription` gespeichert
4. Reminder-Cron sendet Push statt SMTP wenn Subscription aktiv
5. Notification zeigt Meeting-Titel + Deal-Link, Klick navigiert korrekt
6. Bei 410-Gone-Response: Subscription wird automatisch entfernt
7. Chrome-Desktop + Firefox-Desktop funktional getestet
8. iOS-Hinweis "Add to Home Screen" erscheint auf iOS-Safari
9. SMTP-Fallback funktioniert weiterhin wenn kein Push aktiv

## Dependencies
- SLC-417 (user_settings + Reminder-Cron existieren)
- MIG-011 (`user_settings.push_subscription` Spalte)

## QA Focus
- **Browser-Kompat:** Chrome, Firefox, Edge, Safari-macOS getestet; Safari-iOS mit A2HS notiert
- **Permission-UX:** Deny-Pfad zeigt sinnvolle Meldung
- **Subscription-Hygiene:** 410-Gone-Clean-up wirkt, keine Phantom-Subscriptions
- **Security:** VAPID-Private-Key nicht im Client-Bundle (Grep-Check auf public/)
- **Fallback:** Reminder kommt auch bei defektem Push via SMTP
- **Service Worker:** Kein Konflikt mit anderen SWs (Cockpit hat evtl. keinen — neu)

## Geschaetzter Aufwand
1-1.5 Tage (Service Worker + UI + Cron-Integration)
