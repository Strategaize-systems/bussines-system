// V6.2 SLC-624 MT-8 — Campaigns Schema Smoke-Test
//
// Validiert MIG-029 Phase 2 (campaigns + 3 ALTER campaign_id) per SQL-Datei-
// Inhalt. Live-DB-Apply wurde bereits manuell verifiziert (psql \d campaigns
// zeigt: 11 Spalten + 2 UNIQUE + 1 Partial-Index + RLS + 3 FK ON DELETE SET
// NULL).
//
// Hinweis: Eine pg-basierte Live-DB-Integration waere fuer V1 (single-user
// internal-tool) Over-Engineering. Pragmatischer Pfad: Inhalts-Validierung
// der Migration-Datei, damit zukuenftige Changes nicht stillschweigend Schema
// verlieren. Der echte Live-Smoke-Test erfolgt im /qa-Schritt manuell gegen
// die Coolify-DB.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(
  __dirname,
  "..",
  "..",
  "..",
  "sql",
  "migrations",
  "029_v62_automation_and_campaigns.sql"
);

const sql = readFileSync(MIGRATION_PATH, "utf8");

describe("MIG-029 Phase 2 — Campaigns Schema", () => {
  describe("campaigns-Tabelle", () => {
    it("CREATE TABLE IF NOT EXISTS campaigns mit allen 11 Pflicht-Spalten", () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS campaigns/);
      // alle 11 Spalten + 1 PK
      const requiredCols = [
        "id UUID PRIMARY KEY",
        "name TEXT NOT NULL",
        "type TEXT NOT NULL",
        "channel TEXT NULL",
        "start_date DATE NOT NULL",
        "end_date DATE NULL",
        "status TEXT NOT NULL",
        "external_ref TEXT NULL",
        "notes TEXT NULL",
        "created_by UUID NOT NULL",
        "created_at TIMESTAMPTZ",
        "updated_at TIMESTAMPTZ",
      ];
      for (const col of requiredCols) {
        expect(sql).toContain(col);
      }
    });

    it("type-CHECK enthaelt 6 erlaubte Werte (DEC-135)", () => {
      const types = ["email", "linkedin", "event", "ads", "referral", "other"];
      const typeChunk = sql.match(/CHECK \(type IN \([^)]+\)\)/);
      expect(typeChunk).not.toBeNull();
      for (const t of types) {
        expect(typeChunk![0]).toContain(`'${t}'`);
      }
    });

    it("status-CHECK enthaelt 4 erlaubte Werte mit DEFAULT 'draft'", () => {
      const statusChunk = sql.match(
        /CHECK \(status IN \([^)]+\)\) DEFAULT 'draft'/
      );
      expect(statusChunk).not.toBeNull();
      for (const s of ["draft", "active", "finished", "archived"]) {
        expect(statusChunk![0]).toContain(`'${s}'`);
      }
    });

    it("date-range CHECK constraint (end_date >= start_date)", () => {
      expect(sql).toMatch(/campaigns_date_range_chk/);
      expect(sql).toMatch(/end_date IS NULL OR end_date >= start_date/);
    });
  });

  describe("UNIQUE-Constraints + Partial-Index", () => {
    it("UNIQUE INDEX auf LOWER(name) — case-insensitive Name-Uniqueness", () => {
      expect(sql).toMatch(/CREATE UNIQUE INDEX.*idx_campaigns_name_lower_uq/);
      expect(sql).toMatch(/ON campaigns \(LOWER\(name\)\)/);
    });

    it("Partial UNIQUE INDEX auf external_ref WHERE NOT NULL", () => {
      expect(sql).toMatch(
        /CREATE UNIQUE INDEX.*idx_campaigns_external_ref_uq/
      );
      expect(sql).toMatch(
        /ON campaigns \(external_ref\) WHERE external_ref IS NOT NULL/
      );
    });

    it("Partial-Index fuer aktive Kampagnen (CampaignPicker-Default)", () => {
      expect(sql).toMatch(
        /CREATE INDEX.*idx_campaigns_status_active[\s\S]*?ON campaigns \(status, start_date\)[\s\S]*?WHERE status = 'active'/
      );
    });
  });

  describe("RLS + GRANTS", () => {
    it("RLS aktiv + Policy fuer authenticated Full-Access (Single-User V1)", () => {
      expect(sql).toMatch(/ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY/);
      expect(sql).toMatch(/DROP POLICY IF EXISTS campaigns_full_access/);
      expect(sql).toMatch(
        /CREATE POLICY campaigns_full_access[\s\S]*?ON campaigns[\s\S]*?FOR ALL[\s\S]*?TO authenticated/
      );
    });

    it("GRANT ALL fuer service_role + authenticated", () => {
      expect(sql).toMatch(
        /GRANT ALL ON campaigns TO authenticated, service_role/
      );
    });
  });

  describe("ALTER TABLE — campaign_id-FK auf 3 Stammdaten-Tabellen (DEC-136)", () => {
    it("contacts.campaign_id mit ON DELETE SET NULL", () => {
      expect(sql).toMatch(
        /ALTER TABLE contacts\s*\n\s*ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns\(id\) ON DELETE SET NULL/
      );
    });

    it("companies.campaign_id mit ON DELETE SET NULL", () => {
      expect(sql).toMatch(
        /ALTER TABLE companies\s*\n\s*ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns\(id\) ON DELETE SET NULL/
      );
    });

    it("deals.campaign_id mit ON DELETE SET NULL", () => {
      expect(sql).toMatch(
        /ALTER TABLE deals\s*\n\s*ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns\(id\) ON DELETE SET NULL/
      );
    });

    it("3 Partial-Indizes auf campaign_id WHERE NOT NULL", () => {
      expect(sql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_contacts_campaign\s*\n\s*ON contacts \(campaign_id\) WHERE campaign_id IS NOT NULL/
      );
      expect(sql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_companies_campaign\s*\n\s*ON companies \(campaign_id\) WHERE campaign_id IS NOT NULL/
      );
      expect(sql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_deals_campaign\s*\n\s*ON deals \(campaign_id\) WHERE campaign_id IS NOT NULL/
      );
    });
  });

  describe("Idempotenz", () => {
    it("alle CREATE TABLE/INDEX/POLICY nutzen IF NOT EXISTS / DROP-IF-EXISTS Pattern", () => {
      // Phase 2 spezifische Statements
      const phase2 = sql.split("PHASE 2 (SLC-624)")[1] ?? "";
      // Mindestens 1x CREATE TABLE IF NOT EXISTS (campaigns)
      expect(phase2.match(/CREATE TABLE IF NOT EXISTS/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
      // Mindestens 4x CREATE INDEX (1 + 3 partial: 1 unique-name, 1 unique-extref, 1 partial-active, 3 fk-partial = 6 total IF NOT EXISTS)
      expect(phase2.match(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
      // ADD COLUMN IF NOT EXISTS x 3
      expect(phase2.match(/ADD COLUMN IF NOT EXISTS/g)?.length ?? 0).toBe(3);
      // DROP POLICY IF EXISTS x 1
      expect(phase2).toContain("DROP POLICY IF EXISTS campaigns_full_access");
    });
  });
});

// V6.2 SLC-625 MT-10 — Phase 3 Schema Smoke-Test
describe("MIG-029 Phase 3 — Tracking-Links + Click-Log", () => {
  describe("campaign_links Tabelle", () => {
    it("CREATE TABLE mit allen Pflichtspalten", () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS campaign_links/);
      expect(sql).toMatch(/campaign_id UUID NOT NULL REFERENCES campaigns\(id\) ON DELETE CASCADE/);
      expect(sql).toMatch(/token TEXT NOT NULL UNIQUE/);
      expect(sql).toMatch(/target_url TEXT NOT NULL/);
      expect(sql).toMatch(/utm_source TEXT NOT NULL/);
      expect(sql).toMatch(/utm_medium TEXT NOT NULL/);
      expect(sql).toMatch(/utm_campaign TEXT NOT NULL/);
      expect(sql).toMatch(/utm_content TEXT NULL/);
      expect(sql).toMatch(/utm_term TEXT NULL/);
      expect(sql).toMatch(/click_count INTEGER NOT NULL DEFAULT 0/);
    });

    it("CHECK-Constraint fuer http(s)://-Prefix", () => {
      expect(sql).toMatch(/CONSTRAINT campaign_links_target_url_chk CHECK \(target_url ~\* '\^https\?:\/\/'\)/);
    });

    it("Index auf campaign_id", () => {
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_campaign_links_campaign\s*\n\s*ON campaign_links \(campaign_id\)/);
    });

    it("RLS aktiv + Policy fuer authenticated", () => {
      expect(sql).toMatch(/ALTER TABLE campaign_links ENABLE ROW LEVEL SECURITY/);
      expect(sql).toMatch(/DROP POLICY IF EXISTS campaign_links_full_access/);
      expect(sql).toMatch(/CREATE POLICY campaign_links_full_access[\s\S]+?TO authenticated/);
    });

    it("GRANTS auf authenticated + service_role", () => {
      expect(sql).toMatch(/GRANT ALL ON campaign_links TO authenticated, service_role/);
    });
  });

  describe("campaign_link_clicks Tabelle", () => {
    it("CREATE TABLE mit Pflichtspalten + ip_hash", () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS campaign_link_clicks/);
      expect(sql).toMatch(/link_id UUID NOT NULL REFERENCES campaign_links\(id\) ON DELETE CASCADE/);
      expect(sql).toMatch(/clicked_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)/);
      expect(sql).toMatch(/ip_hash TEXT NULL/);
      expect(sql).toMatch(/user_agent TEXT NULL/);
      expect(sql).toMatch(/referer TEXT NULL/);
    });

    it("Cleanup-vorbereiteter Time-DESC-Index", () => {
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_campaign_link_clicks_link_time\s*\n\s*ON campaign_link_clicks \(link_id, clicked_at DESC\)/);
    });

    it("RLS aktiv + GRANTS", () => {
      expect(sql).toMatch(/ALTER TABLE campaign_link_clicks ENABLE ROW LEVEL SECURITY/);
      expect(sql).toMatch(/CREATE POLICY campaign_link_clicks_full_access/);
      expect(sql).toMatch(/GRANT ALL ON campaign_link_clicks TO authenticated, service_role/);
    });
  });

  describe("CASCADE-Verhalten", () => {
    it("campaign_links FK auf campaigns ON DELETE CASCADE", () => {
      // Campaign-Delete -> alle zugehoerigen Links + clicks weg
      expect(sql).toMatch(/REFERENCES campaigns\(id\) ON DELETE CASCADE/);
    });

    it("campaign_link_clicks FK auf campaign_links ON DELETE CASCADE", () => {
      // Link-Delete -> alle zugehoerigen clicks weg
      expect(sql).toMatch(/REFERENCES campaign_links\(id\) ON DELETE CASCADE/);
    });
  });

  describe("Idempotenz", () => {
    it("Phase 3 Statements nutzen IF NOT EXISTS / DROP-IF-EXISTS", () => {
      const phase3 = sql.split("PHASE 3 (SLC-625)")[1] ?? "";
      // 2 CREATE TABLE IF NOT EXISTS (links + clicks)
      expect(phase3.match(/CREATE TABLE IF NOT EXISTS/g)?.length ?? 0).toBe(2);
      // 2 CREATE INDEX IF NOT EXISTS
      expect(phase3.match(/CREATE INDEX IF NOT EXISTS/g)?.length ?? 0).toBe(2);
      // 2 DROP POLICY IF EXISTS
      expect(phase3.match(/DROP POLICY IF EXISTS/g)?.length ?? 0).toBe(2);
      // 2 GRANT ALL
      expect(phase3.match(/GRANT ALL ON/g)?.length ?? 0).toBe(2);
    });
  });
});
