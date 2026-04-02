# SLC-107 — E-Mail-Management

## Meta
- Feature: FEAT-106
- Priority: High
- Status: done
- Dependencies: SLC-101

## Goal
E-Mail-Versand direkt aus dem System via SMTP. Automatisches Logging. Follow-up-Status.

## Scope
- E-Mail-Compose-UI pro Kontakt
- nodemailer SMTP-Versand (Server Action)
- Automatisches Logging in emails-Tabelle
- Follow-up-Status (pending/replied/overdue)
- E-Mail-Vorlagen-Referenz
- E-Mails in Timeline

## Out of Scope
- IMAP Inbox-Sync (V3)
- Newsletter/Broadcast
- Kampagnen
