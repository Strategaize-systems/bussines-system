"use server";

import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  totalContacts: number;
  totalCompanies: number;
  openDeals: number;
  totalPipelineValue: number;
  multiplierCount: number;
  openTasks: number;
  overdueTasks: number;
  pendingHandoffs: number;
};

export type PipelineSummary = {
  pipeline: { id: string; name: string };
  stages: { id: string; name: string; color: string | null; dealCount: number; dealValue: number }[];
  totalDeals: number;
  totalValue: number;
};

export type UpcomingAction = {
  dealId: string;
  dealTitle: string;
  nextAction: string;
  nextActionDate: string;
  contactName: string | null;
  companyName: string | null;
  isOverdue: boolean;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [contacts, companies, deals, multipliers, tasks, overdueTasks, handoffs] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("deals").select("value").eq("status", "active"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("is_multiplier", true),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open").lt("due_date", today),
    supabase.from("handoffs").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const totalPipelineValue = (deals.data || []).reduce(
    (sum, d) => sum + (d.value ?? 0),
    0
  );

  return {
    totalContacts: contacts.count ?? 0,
    totalCompanies: companies.count ?? 0,
    openDeals: deals.data?.length ?? 0,
    totalPipelineValue,
    multiplierCount: multipliers.count ?? 0,
    openTasks: tasks.count ?? 0,
    overdueTasks: overdueTasks.count ?? 0,
    pendingHandoffs: handoffs.count ?? 0,
  };
}

export async function getPipelineSummaries(): Promise<PipelineSummary[]> {
  const supabase = await createClient();

  // Get pipelines with stages
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, name")
    .order("sort_order");

  if (!pipelines) return [];

  const summaries: PipelineSummary[] = [];

  for (const pipeline of pipelines) {
    const [stagesResult, dealsResult] = await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, name, color")
        .eq("pipeline_id", pipeline.id)
        .order("sort_order"),
      supabase
        .from("deals")
        .select("stage_id, value")
        .eq("pipeline_id", pipeline.id)
        .eq("status", "active"),
    ]);

    const stages = (stagesResult.data || []).map((stage) => {
      const stageDeals = (dealsResult.data || []).filter(
        (d) => d.stage_id === stage.id
      );
      return {
        ...stage,
        dealCount: stageDeals.length,
        dealValue: stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
      };
    });

    summaries.push({
      pipeline,
      stages,
      totalDeals: dealsResult.data?.length ?? 0,
      totalValue: (dealsResult.data || []).reduce(
        (sum, d) => sum + (d.value ?? 0),
        0
      ),
    });
  }

  return summaries;
}

export async function getForecastValue(): Promise<number> {
  const supabase = await createClient();

  const [dealsResult, stagesResult] = await Promise.all([
    supabase
      .from("deals")
      .select("value, stage_id")
      .eq("status", "active")
      .not("value", "is", null),
    supabase
      .from("pipeline_stages")
      .select("id, probability"),
  ]);

  const stageMap = new Map<string, number>();
  for (const s of stagesResult.data || []) {
    stageMap.set(s.id, s.probability);
  }

  return (dealsResult.data || []).reduce((sum, d) => {
    const prob = d.stage_id ? (stageMap.get(d.stage_id) ?? 0) / 100 : 0;
    return sum + (d.value ?? 0) * prob;
  }, 0);
}

export async function getRecentActivities(limit = 20) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select("*, contacts(first_name, last_name), companies(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

export type TopMultiplikator = {
  id: string;
  name: string;
  companyName: string | null;
  trustLevel: number | null;
};

export type TopChance = {
  id: string;
  companyName: string | null;
  value: number;
  probability: number;
  stageName: string | null;
};

export async function getTopMultiplikatoren(limit = 5): Promise<TopMultiplikator[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, trust_level, companies(name)")
    .eq("is_multiplier", true)
    .order("trust_level", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) return [];

  return (data || []).map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`.trim(),
    companyName: c.companies ? (c.companies as any).name : null,
    trustLevel: c.trust_level,
  }));
}

export async function getTopChancen(limit = 5): Promise<TopChance[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deals")
    .select("id, title, value, companies(name), pipeline_stages(name, probability)")
    .eq("status", "active")
    .not("value", "is", null)
    .order("value", { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data || []).map((d) => ({
    id: d.id,
    companyName: d.companies ? (d.companies as any).name : (d.title || "Unbekannt"),
    value: d.value ?? 0,
    probability: d.pipeline_stages ? (d.pipeline_stages as any).probability ?? 0 : 0,
    stageName: d.pipeline_stages ? (d.pipeline_stages as any).name : null,
  }));
}

export async function getUpcomingActions(limit = 10): Promise<UpcomingAction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deals")
    .select("id, title, next_action, next_action_date, contacts(first_name, last_name), companies(name)")
    .eq("status", "active")
    .not("next_action", "is", null)
    .not("next_action_date", "is", null)
    .order("next_action_date", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const today = new Date().toISOString().split("T")[0];

  return (data || []).map((d) => ({
    dealId: d.id,
    dealTitle: d.title,
    nextAction: d.next_action!,
    nextActionDate: d.next_action_date!,
    contactName: d.contacts
      ? `${(d.contacts as any).first_name} ${(d.contacts as any).last_name}`
      : null,
    companyName: d.companies ? (d.companies as any).name : null,
    isOverdue: d.next_action_date! < today,
  }));
}
