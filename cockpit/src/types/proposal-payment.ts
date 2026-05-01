export type PaymentTermsTemplate = {
  id: string;
  label: string;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type PaymentMilestoneTrigger =
  | "on_signature"
  | "on_completion"
  | "days_after_signature"
  | "on_milestone";

export type PaymentMilestone = {
  id: string;
  proposal_id: string;
  sequence: number;
  percent: number;
  amount: number | null;
  due_trigger: PaymentMilestoneTrigger;
  due_offset_days: number | null;
  label: string | null;
  created_at: string;
};
