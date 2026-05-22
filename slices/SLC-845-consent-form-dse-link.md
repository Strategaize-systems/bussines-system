# SLC-845 — V8.4 Consent-Form DSE-Link (consent/[token]/page.tsx Patch)

- **Feature:** FEAT-824 / BL-488
- **Version:** V8.4
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-22
- **Estimated:** ~1h Code-Side
- **Depends-On:** SLC-841, SLC-842, SLC-843
- **Architecture:** keine eigene DEC (Patch-only von existing Page)
- **Pattern-Reuse:** —

## Goal

Bestehende `/consent/[token]/page.tsx` patchen: VOR der Grant/Decline-Button-Sektion einen Link "Datenschutzerklaerung lesen" einfuegen, der via `target="_blank"` auf `/p/[tenant-slug]/datenschutz` des sendenden Tenants zeigt. Slug-Aufloesung via `contact.owner_user_id → profiles.team_id → teams.slug`.

## Scope

### IN
- `cockpit/src/lib/team/lookup-slug.ts` Helper-Function `getTenantSlugByOwnerUserId(ownerUserId)` → `Promise<string | null>`
- `cockpit/src/app/consent/[token]/page.tsx` PATCH: zusaetzlicher Lookup `contact.owner_user_id → tenantSlug`, Link "Datenschutzerklaerung lesen" einfuegen
- Vitest fuer Lookup-Helper (mock supabase-client)
- Browser-Smoke: Token-URL zeigt Link, Klick oeffnet `/p/[slug]/datenschutz` im neuen Tab

### OUT
- Editor (SLC-844)
- Mail-Footer (SLC-846)
- Public-Route (SLC-843)
- Consent-Form selbst (`consent-form.tsx` bleibt unveraendert — Patch nur in `page.tsx`)

## Acceptance Criteria

- **AC1** `lib/team/lookup-slug.ts` exportiert `getTenantSlugByOwnerUserId(ownerUserId: string): Promise<string | null>` mit zweistufiger Aufloesung (profiles.team_id → teams.slug)
- **AC2** `consent/[token]/page.tsx` laedt zusaetzlich `contact.owner_user_id` und ruft `getTenantSlugByOwnerUserId`. Bei `null`-Resolution → Fallback: keine DSE-Link (graceful Degradation, kein Crash)
- **AC3** Bei vorhandenem `tenantSlug`: zwischen `<p>wir speichern...</p>` (Z.66 of existing page) und `<ConsentForm>` (Z.71) wird neuer Block eingefuegt: `<p className="mt-4 text-sm"><a href="/p/{tenantSlug}/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary underline">Datenschutzerklaerung lesen ↗</a></p>`
- **AC4** Browser-Smoke: gueltiger Consent-Token zeigt Link, Klick oeffnet Public-Route im neuen Tab, DSE rendert
- **AC5** Browser-Smoke: bei `tenantSlug=null` (sehr seltener Fall, z.B. orphaned-contact ohne owner) wird KEIN Link gezeigt, Page rendert ohne Crash
- **AC6** Vitest: 3-4 Tests fuer Lookup-Helper (Success-Path, profiles-missing, teams-missing, team-without-slug)

## Micro-Tasks

### MT-1: Lookup-Helper + Vitest
- Goal: Slug-Aufloesung in zentralem Helper.
- Files:
  - `cockpit/src/lib/team/lookup-slug.ts` (NEU, ~25 Zeilen)
  - `cockpit/src/lib/team/lookup-slug.test.ts` (NEU, 3-4 Tests)
- Expected behavior:
  ```typescript
  export async function getTenantSlugByOwnerUserId(ownerUserId: string): Promise<string | null> {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles").select("team_id").eq("id", ownerUserId).maybeSingle();
    if (!profile?.team_id) return null;
    const { data: team } = await admin
      .from("teams").select("slug").eq("id", profile.team_id).maybeSingle();
    return team?.slug ?? null;
  }
  ```
- Verification: Vitest 3-4 PASS, alle Mocking-Patterns chain-fluent.
- Dependencies: —

### MT-2: consent/[token]/page.tsx Patch + Browser-Smoke
- Goal: Page um owner_user_id-Select + Slug-Lookup + Link-Render erweitern.
- Files: `cockpit/src/app/consent/[token]/page.tsx` (PATCH, ~5-8 Zeilen)
- Expected behavior:
  - Select-Liste erweitern um `owner_user_id`: `.select("id, first_name, last_name, email, consent_status, consent_token_expires_at, owner_user_id")`
  - Conditional Slug-Aufloesung: `const tenantSlug = contact.owner_user_id ? await getTenantSlugByOwnerUserId(contact.owner_user_id) : null;`
  - JSX-Insert zwischen Z.66 und Z.71:
    ```tsx
    {tenantSlug && (
      <p className="mt-4 text-sm">
        <a href={`/p/${tenantSlug}/datenschutz`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Datenschutzerklaerung lesen ↗
        </a>
      </p>
    )}
    ```
- Verification: Browser-Smoke MT-3 AC4-AC5.
- Dependencies: MT-1

### MT-3: Live-Smoke gegen echten Consent-Token
- Goal: End-to-End-Verifikation auf staging/production.
- Files: keine
- Expected behavior:
  - User generiert Consent-Token fuer einen Test-Kontakt (existing functionality, kein neuer Slice-Code)
  - Browser oeffnet Token-URL → DSE-Link sichtbar → Klick oeffnet `/p/strategaize-transition-bv/datenschutz` → DSE rendert
  - Edge-Case Test (optional): Direkt-Manipulation eines Kontakts ohne owner_user_id in DB → Link NICHT angezeigt
- Verification: AC4 PASS, AC5 PASS.
- Dependencies: MT-2

## Risks / Notes

- **R1** Pre-Existing-Consents ohne owner_user_id: graceful Fallback (kein Link). Soll-Verhalten dokumentiert in AC5.
- **R2** Slug-Aufloesung kostet 2 zusaetzliche DB-Hits pro Consent-Page-Aufruf (profiles + teams). Akzeptabel — Consent-Pages werden niedrig-frequent geoeffnet (~10/Tag), nicht hot-path. Caching via React `cache()` waere overkill V1.
- **R3** Link-Text "Datenschutzerklaerung lesen ↗" — Mini-Copy, kein Translation-Layer (V1 deutschsprachig). V2 bei Mehrsprachigkeit i18n-key.

## Worktree-Isolation

Worktree-Branch `slc-845-consent-form-dse-link` empfohlen. Orthogonal zu SLC-846 — koennen parallel laufen.

## Done-Definition

- Lookup-Helper + Vitest committed
- consent/[token]/page.tsx Patch committed
- AC1-AC6 verifiziert (inklusive Live-Token-Browser-Smoke)
- `/qa` PASS
- Slice-Branch ready
