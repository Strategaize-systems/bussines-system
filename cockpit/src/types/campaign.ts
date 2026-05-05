// V6.2 SLC-624 — Campaigns Types (FEAT-622)
//
// Single Source of Truth fuer alle Campaign-Datenstrukturen.
// Spiegelt MIG-029 Phase 2 (campaigns + 3 ALTER campaign_id auf
// contacts/companies/deals).

export type CampaignType =
  | "email"
  | "linkedin"
  | "event"
  | "ads"
  | "referral"
  | "other";

export const CAMPAIGN_TYPES: CampaignType[] = [
  "email",
  "linkedin",
  "event",
  "ads",
  "referral",
  "other",
];

export type CampaignStatus = "draft" | "active" | "finished" | "archived";

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "draft",
  "active",
  "finished",
  "archived",
];

// Set fuer Picker — schliesst archived/finished aus
export const CAMPAIGN_STATUSES_PICKABLE: CampaignStatus[] = ["draft", "active"];

// DB-Row-Shape (1:1 mit campaigns-Tabelle)
export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  channel: string | null;
  start_date: string; // ISO date YYYY-MM-DD
  end_date: string | null;
  status: CampaignStatus;
  external_ref: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Erweiterte Shape fuer Detail-Page + Listing-KPIs
export interface CampaignWithStats extends Campaign {
  lead_count: number;
  deal_count: number;
  won_count: number;
  won_value: number;
  conversion_rate: number | null; // null wenn lead_count=0
}

// Save-Input fuer saveCampaign Server Action
export interface SaveCampaignInput {
  id?: string;
  name: string;
  type: CampaignType;
  channel?: string | null;
  start_date: string;
  end_date?: string | null;
  status: CampaignStatus;
  external_ref?: string | null;
  notes?: string | null;
}

// List-Filter
export interface CampaignListFilter {
  status?: CampaignStatus | CampaignStatus[];
  type?: CampaignType;
  search?: string;
}

// Picker-Item (schlanke Variante ohne KPIs)
export interface CampaignPickerItem {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
}
