# SLC-843 — V8.4 Public-Route /p/[tenant-slug]/datenschutz

- **Feature:** FEAT-824 / BL-488
- **Version:** V8.4
- **Status:** planned
- **Priority:** Blocker
- **Created:** 2026-05-22
- **Estimated:** ~1h Code-Side
- **Depends-On:** SLC-841, SLC-842
- **Architecture:** DEC-234 (Public-Route outside (app) + Middleware-Whitelist), DEC-236 (eigene .customer-dse-content CSS)
- **Pattern-Reuse:** V8.2 `/datenschutz`-Page + LegalPageShell + Middleware-Whitelist (IMP-736)

## Goal

Public-Route `/p/[tenant-slug]/datenschutz` als Server-Component direkt unter App-Router-Root (NICHT unter `(app)`-Layout). Kunde liest die DSE seines Tenants OHNE Login. Auth-Wand bypassed via Middleware-`publicPaths`-Whitelist (Pflicht-Lehre IMP-736 — sonst 307 → /login). CSS-Schicht `.customer-dse-content` analog V8.3 `.help-content`.

## Scope

### IN
- `cockpit/src/app/p/[tenant-slug]/datenschutz/page.tsx` Server-Component (kein Auth, dynamic params)
- `cockpit/src/components/layout/customer-dse-page-shell.tsx` Shell-Komponente analog `LegalPageShell` mit zusaetzlichem `tenantName`-Header
- `cockpit/src/app/globals.css` neue `.customer-dse-content` CSS-Schicht (~30 Zeilen h1/h2/h3/p/ul/ol/strong/em/a-Selectors)
- `cockpit/src/lib/supabase/middleware.ts:48` `publicPaths` Array um `"/p/"` ergaenzen
- HTTP-Smoke nach Coolify-Deploy: `GET /p/strategaize-transition-bv/datenschutz` → HTTP 200 (NICHT 307)

### OUT
- Editor-UI (SLC-844)
- Consent-Form-Link (SLC-845)
- Mail-Footer-DSE-Link (SLC-846)
- Rate-Limit (V2)

## Acceptance Criteria

- **AC1** `app/p/[tenant-slug]/datenschutz/page.tsx` Server-Component existiert, liest `params.tenant-slug`, ruft `isReservedSlug` → 404, ruft `createAdminClient().from("teams").select("id,name").ilike("slug", $1)` → 404 bei null, ruft `legal_documents.select("content_md").eq("tenant_team_id", team.id).eq("kind", "customer-dse")` → 404 bei null, ruft `renderLegalMarkdown(content_md)` → rendert `<CustomerDsePageShell html tenantName />`
- **AC2** `customer-dse-page-shell.tsx` zeigt `<main>` + Tenant-Name-Header (`<h1>Datenschutzerklaerung — {tenantName}</h1>` ueber dem rendered HTML) + LegalFooter
- **AC3** `globals.css` enthaelt `.customer-dse-content` Selectors fuer h1, h2, h3, p, ul, ol, li, strong, em, a, code, table, th, td (etwa analog `.legal-content` Z.281+)
- **AC4** Middleware-`publicPaths` Array enthaelt `"/p/"` (vor Slice-Deploy-Pflicht — IMP-736-Lehre)
- **AC5** Live-Smoke: `curl -sI https://business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz` → HTTP 200 + Content-Type text/html. KEIN 307 (auth-redirect)
- **AC6** Live-Smoke: `curl -sI https://business.strategaizetransition.com/p/unknown-tenant-xyz/datenschutz` → HTTP 404
- **AC7** Live-Smoke: `curl -sI https://business.strategaizetransition.com/p/admin/datenschutz` → HTTP 404 (Reserved-Slug-Check)
- **AC8** Browser-Smoke: `/p/strategaize-transition-bv/datenschutz` zeigt h1 + h2 + Tenant-Name + LegalFooter, CSS rendert lesbar (h1 > h2 > h3 > body), Markdown-Tabelle (Auftragsverarbeiter) ist sichtbar

## Micro-Tasks

### MT-1: Public-Route + Server-Component
- Goal: Server-Component fuer `/p/[tenant-slug]/datenschutz` mit Slug-Lookup + DSE-Render.
- Files:
  - `cockpit/src/app/p/[tenant-slug]/datenschutz/page.tsx` (NEU, ~50 Zeilen)
  - `cockpit/src/components/layout/customer-dse-page-shell.tsx` (NEU, ~25 Zeilen)
- Expected behavior:
  - `page.tsx`: `async function Page({ params })` mit `await params` (Next.js 15-Pattern), `notFound()` aus `next/navigation` bei Reserved-Slug oder Lookup-Miss, `renderLegalMarkdown(content_md)` Reuse, `<CustomerDsePageShell html tenantName={team.name} />`
  - `customer-dse-page-shell.tsx`: `<main className="min-h-screen bg-background"> <header><h1>{tenantName}</h1></header> <article className="customer-dse-content"> <div dangerouslySetInnerHTML={{ __html: html }} /></article> <LegalFooter /> </main>` (analog `LegalPageShell` aber mit Header)
  - `export const dynamic = "force-dynamic"` oder `revalidate` Optionen abwaegen — Default fine
- Verification: TypeScript compile OK, ESLint clean, Build PASS.
- Dependencies: SLC-841 (Schema), SLC-842 (Slug-Generator + Reserved-Slugs + Default-Seed)

### MT-2: CSS-Schicht .customer-dse-content
- Goal: Eigene CSS-Layer analog `.legal-content` und V8.3 `.help-content`.
- Files: `cockpit/src/app/globals.css` (PATCH, ~30 neue Zeilen)
- Expected behavior: Selectors fuer `.customer-dse-content h1/h2/h3/p/ul/ol/li/strong/em/a/code/table/th/td` mit konsistenten Style-Guide-V2-Tokens (Margins, font-sizes analog `.legal-content` Z.281-311). Tabellen-Styling Pflicht (Auftragsverarbeiter-Markdown-Tabelle wird via remark-gfm gerendert).
- Verification: Visual-Check im Browser-Smoke MT-3.
- Dependencies: —

### MT-3: Middleware-Whitelist + Coolify-Deploy + HTTP/Browser-Smoke
- Goal: `publicPaths` ergaenzen, deploy, verify.
- Files: `cockpit/src/lib/supabase/middleware.ts:48` (PATCH, 1 Array-Element).
- Expected behavior:
  ```typescript
  const publicPaths = [..., "/datenschutz", "/impressum", "/p/"];
  //                                                       ^^^^
  ```
- Verification: AC5/AC6/AC7/AC8 alle PASS post-Coolify-Redeploy (manuell User).
- Dependencies: MT-1, MT-2

## Risks / Notes

- **R1** IMP-736-Pflicht: Middleware-Whitelist MUSS vor Build-Verify in publicPaths-Array stehen, sonst Build-Static-Prerender greift nicht durch zur Page (`/p/[slug]/datenschutz` wuerde auth-redirect bekommen). Pflicht-Smoke nach Deploy = HTTP 200, nicht 307.
- **R2** Server-Component braucht `createAdminClient` (kein User-Session). Reuse `cockpit/src/lib/supabase/admin.ts`. Stelle sicher dass admin-Client public-callable ist (kein versteckter Pflicht-Cookie-Read).
- **R3** Browser-Cache: Cache-Control-Header optional. V1 ohne explicit Cache-Control (Next.js default). V2 wenn Rate-Limit-Defense gewuenscht: `revalidate: 60` oder explizit `Cache-Control: public, max-age=60`.
- **R4** Tenant-Name im Header — bei Multi-Tenant-Zukunft schoen, fuer V1 mit 1 Tenant rein semantisch. Falls Tenant nicht angezeigt werden soll: Page-Shell anpassen ohne Header.

## Worktree-Isolation

Worktree-Branch `slc-843-customer-dse-public-route` empfohlen.

## Done-Definition

- Page + Shell + CSS + Middleware-Patch committed
- Coolify-Redeploy durch (User-Pflicht)
- AC1-AC8 verifiziert (4 HTTP-Smokes + 1 Browser-Smoke)
- `/qa` PASS
- Slice-Branch ready
