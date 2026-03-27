# SLC-001 — Next.js Scaffolding + Layout

## Meta
- Feature: FEAT-003
- Priority: Blocker
- Status: planned
- Dependencies: keine

## Goal
Next.js-Projekt initialisieren mit App Router, shadcn/ui, Tailwind v4, Supabase-Client-Libraries. Basis-Layout mit Sidebar-Navigation erstellen. Login-Seite als Stub (Auth kommt in SLC-002).

## Scope
- Next.js 16 Projekt erstellen (App Router, TypeScript)
- Tailwind v4 + shadcn/ui initialisieren
- Supabase Client Libraries installieren und konfigurieren (Browser/Server/Admin)
- Basis-Layout: Sidebar (Navigation) + Top Bar + Content Area
- Login-Page (UI only, Auth-Logic in SLC-002)
- .env.example mit allen benötigten Variablen
- Ordnerstruktur gemäß Architektur

## Out of Scope
- Auth-Logic (SLC-002)
- Datenbank-Schema (SLC-002)
- Docker Compose (SLC-011)

### Micro-Tasks

#### MT-1: Next.js Projekt initialisieren
- Goal: Frisches Next.js 16 Projekt mit TypeScript und App Router
- Files: `cockpit/package.json`, `cockpit/tsconfig.json`, `cockpit/next.config.ts`
- Expected behavior: `npm run dev` startet ohne Fehler auf localhost:3000
- Verification: `npm run dev` → leere Seite lädt
- Dependencies: keine

#### MT-2: Tailwind v4 + shadcn/ui Setup
- Goal: Tailwind und shadcn/ui konfigurieren, erste Komponenten installieren
- Files: `cockpit/app/globals.css`, `cockpit/components/ui/button.tsx`, `cockpit/components/ui/input.tsx`, `cockpit/lib/utils.ts`
- Expected behavior: shadcn-Komponenten sind importierbar und gerendert
- Verification: Button-Komponente rendert korrekt
- Dependencies: MT-1

#### MT-3: Supabase Client Libraries
- Goal: Supabase Client für Browser, Server und Admin einrichten
- Files: `cockpit/lib/supabase/client.ts`, `cockpit/lib/supabase/server.ts`, `cockpit/lib/supabase/admin.ts`, `cockpit/.env.example`, `cockpit/.env.local`
- Expected behavior: Clients exportierbar, env vars definiert
- Verification: TypeScript kompiliert ohne Fehler
- Dependencies: MT-1

#### MT-4: Basis-Layout mit Sidebar
- Goal: App-Shell mit Sidebar-Navigation, Top Bar, responsivem Content-Bereich
- Files: `cockpit/app/(app)/layout.tsx`, `cockpit/components/layout/sidebar.tsx`, `cockpit/components/layout/top-bar.tsx`
- Expected behavior: Sidebar zeigt Navigation (Dashboard, Kontakte, Firmen, Pipeline EK, Pipeline MP, Kalender, Settings). Responsive: Sidebar collapst auf Mobile.
- Verification: Layout rendert, Navigation-Links sichtbar
- Dependencies: MT-2

#### MT-5: Login-Seite (UI only)
- Goal: Login-Formular (E-Mail + Passwort), noch ohne Auth-Logic
- Files: `cockpit/app/(auth)/login/page.tsx`
- Expected behavior: Formular mit E-Mail und Passwort-Feldern rendert, Submit-Button vorhanden
- Verification: Seite rendert auf /login
- Dependencies: MT-2
