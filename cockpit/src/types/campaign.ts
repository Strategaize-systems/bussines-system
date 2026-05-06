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

// V6.2 SLC-625 — Tracking-Links + Reporting + Read-API

// DB-Row-Shape (1:1 mit campaign_links-Tabelle)
export interface CampaignLink {
  id: string;
  campaign_id: string;
  token: string;
  target_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  label: string | null;
  click_count: number;
  created_at: string;
}

// Save-Input fuer createCampaignLink Server Action
export interface CreateCampaignLinkInput {
  campaign_id: string;
  target_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string | null;
  utm_term?: string | null;
  label?: string | null;
}

// Click-Log-Row
export interface CampaignLinkClick {
  id: string;
  link_id: string;
  clicked_at: string;
  ip_hash: string | null;
  user_agent: string | null;
  referer: string | null;
}

// UTM-Params fuer Mapper + Lead-Intake
export interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

// Read-API-Response-Shape (DEC-140 /api/campaigns/[id]/performance)
export interface CampaignPerformance {
  campaign_id: string;
  name: string;
  external_ref: string | null;
  leads: number;
  deals: number;
  won_deals: number;
  won_value: number;
  conversion_rate: number | null;
  click_count_total: number;
  click_count_last_30d: number;
  first_lead_at: string | null;
  last_activity_at: string | null;
}

// Lead-Intake-Endpoint-Body (POST /api/leads/intake)
export interface LeadIntakeInput extends UtmParams {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  notes?: string | null;
}

export interface LeadIntakeResponse {
  contact_id: string;
  was_new: boolean;
  campaign_id: string | null;
}
