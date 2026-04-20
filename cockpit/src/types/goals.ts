export type GoalType = "revenue" | "deal_count" | "win_rate";
export type GoalPeriod = "month" | "quarter" | "year";
export type GoalStatus = "active" | "completed" | "cancelled";
export type GoalSource = "manual" | "imported";

export type Goal = {
  id: string;
  user_id: string;
  type: GoalType;
  period: GoalPeriod;
  period_start: string;
  target_value: number;
  product_id: string | null;
  status: GoalStatus;
  source: GoalSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
