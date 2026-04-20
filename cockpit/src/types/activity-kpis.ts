export type ActivityKpiKey =
  | "calls"
  | "meetings"
  | "deals_moved"
  | "deals_created"
  | "deals_stagnant";

export type ActivityKpiTarget = {
  id: string;
  user_id: string;
  kpi_key: ActivityKpiKey;
  daily_target: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityKpiStatus = {
  kpiKey: ActivityKpiKey;
  label: string;
  dailyTarget: number;
  todayActual: number;
  weekTarget: number;
  weekActual: number;
  active: boolean;
};

export const ACTIVITY_KPI_LABELS: Record<ActivityKpiKey, string> = {
  calls: "Telefonate",
  meetings: "Meetings",
  deals_moved: "Deals bewegt",
  deals_created: "Neue Deals",
  deals_stagnant: "Stagnante Deals",
};

export const ACTIVITY_KPI_DEFAULTS: { key: ActivityKpiKey; target: number }[] = [
  { key: "calls", target: 5 },
  { key: "meetings", target: 2 },
  { key: "deals_moved", target: 5 },
  { key: "deals_created", target: 1 },
  { key: "deals_stagnant", target: 0 },
];
