export type KpiType =
  | "revenue_won"
  | "deal_count_won"
  | "win_rate"
  | "pipeline_value_weighted"
  | "pipeline_value_unweighted"
  | "avg_deal_value"
  | "activity_count"
  | "product_revenue"
  | "product_deal_count";

export type KpiPeriod = "day" | "week" | "month";

export type KpiSnapshot = {
  id: string;
  snapshot_date: string;
  user_id: string;
  kpi_type: KpiType;
  kpi_value: number;
  product_id: string | null;
  period: KpiPeriod;
  calculation_basis: Record<string, unknown>;
  created_at: string;
};
