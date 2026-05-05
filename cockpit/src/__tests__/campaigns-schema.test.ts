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
