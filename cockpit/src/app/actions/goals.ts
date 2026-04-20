"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Goal, GoalType, GoalPeriod, GoalStatus } from "@/types/goals";

// ── Types ─────────────────────────────────────────────────────

export type GoalWithProduct = Goal & {
  product_name: string | null;
};

export type CreateGoalInput = {
  type: GoalType;
  period: GoalPeriod;
  period_start: string;
  target_value: number;
  product_id?: string | null;
  notes?: string;
};

export type UpdateGoalInput = {
  id: string;
  type?: GoalType;
  period?: GoalPeriod;
  period_start?: string;
  target_value?: number;
  product_id?: string | null;
  notes?: string;
};

// ── List ──────────────────────────────────────────────────────

export async function listGoals(filters?: {
  status?: GoalStatus | "all";
  period?: GoalPeriod;
}): Promise<GoalWithProduct[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  let query = admin
    .from("goals")
    .select("*, products(name)")
    .eq("user_id", user.id)
    .order("period_start", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.period) {
    query = query.eq("period", filters.period);
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((g: any) => ({
    ...g,
    product_name: g.products?.name ?? null,
  }));
}

// ── Create ────────────────────────────────────────────────────

export async function createGoal(
  input: CreateGoalInput,
): Promise<{ error?: string; goal?: Goal }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  if (!input.target_value || input.target_value <= 0) {
    return { error: "Sollwert muss groesser als 0 sein" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("goals")
    .insert({
      user_id: user.id,
      type: input.type,
      period: input.period,
      period_start: input.period_start,
      target_value: input.target_value,
      product_id: input.product_id || null,
      notes: input.notes?.trim() || null,
      source: "manual",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ein Ziel mit diesem Typ, Zeitraum und Produkt existiert bereits",
      };
    }
    return { error: `Ziel konnte nicht erstellt werden: ${error.message}` };
  }

  revalidatePath("/performance/goals");
  return { goal: data as Goal };
}

// ── Update ────────────────────────────────────────────────────

export async function updateGoal(
  input: UpdateGoalInput,
): Promise<{ error?: string; goal?: Goal }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  if (input.target_value !== undefined && input.target_value <= 0) {
    return { error: "Sollwert muss groesser als 0 sein" };
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.type !== undefined) updates.type = input.type;
  if (input.period !== undefined) updates.period = input.period;
  if (input.period_start !== undefined) updates.period_start = input.period_start;
  if (input.target_value !== undefined) updates.target_value = input.target_value;
  if (input.product_id !== undefined) updates.product_id = input.product_id || null;
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

  const { data, error } = await admin
    .from("goals")
    .update(updates)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ein Ziel mit diesem Typ, Zeitraum und Produkt existiert bereits",
      };
    }
    return { error: `Ziel konnte nicht aktualisiert werden: ${error.message}` };
  }

  revalidatePath("/performance/goals");
  return { goal: data as Goal };
}

// ── Cancel ────────────────────────────────────────────────────

export async function cancelGoal(
  goalId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("goals")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    return { error: `Ziel konnte nicht storniert werden: ${error.message}` };
  }

  revalidatePath("/performance/goals");
  return {};
}

// ── Import from CSV ───────────────────────────────────────────

export type GoalImportRow = {
  type: GoalType;
  period: GoalPeriod;
  period_start: string;
  target_value: number;
  product_id: string | null;
};

export async function importGoalsFromCSV(
  rows: GoalImportRow[],
): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { imported: 0, errors: ["Nicht authentifiziert"] };

  if (rows.length === 0) {
    return { imported: 0, errors: ["Keine Daten zum Importieren"] };
  }

  const admin = createAdminClient();
  const errors: string[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { error } = await admin.from("goals").insert({
      user_id: user.id,
      type: row.type,
      period: row.period,
      period_start: row.period_start,
      target_value: row.target_value,
      product_id: row.product_id,
      source: "imported",
    });

    if (error) {
      if (error.code === "23505") {
        errors.push(`Zeile ${i + 1}: Ziel existiert bereits (${row.type}/${row.period}/${row.period_start})`);
      } else {
        errors.push(`Zeile ${i + 1}: ${error.message}`);
      }
    } else {
      imported++;
    }
  }

  revalidatePath("/performance/goals");
  return { imported, errors };
}

// ── Goal Progress (Prognose-Engine) ───────────────────────────

import { calculateGoalProgress } from "@/lib/goals/calculator";
import type { GoalProgress } from "@/types/goals";

export type GoalWithProgress = GoalWithProduct & {
  progress: GoalProgress;
  derived?: boolean;
};

export async function getGoalProgress(
  goalId: string,
): Promise<{ error?: string; progress?: GoalProgress }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const admin = createAdminClient();
  const { data: goal } = await admin
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!goal) return { error: "Ziel nicht gefunden" };

  const progress = await calculateGoalProgress(goal as Goal);
  return { progress };
}

export async function getGoalsWithProgress(filters?: {
  period?: GoalPeriod;
}): Promise<GoalWithProgress[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const requestedPeriod = filters?.period;

  // First: try to find explicit goals for the requested period
  let query = admin
    .from("goals")
    .select("*, products(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("period_start", { ascending: false });

  if (requestedPeriod) {
    query = query.eq("period", requestedPeriod);
  }

  const { data } = await query;

  // If we have explicit goals for this period, use them directly
  if (data && data.length > 0) {
    const results: GoalWithProgress[] = [];
    for (const g of data) {
      const goalWithProduct: GoalWithProduct = {
        ...g,
        product_name: (g as any).products?.name ?? null,
      };
      const progress = await calculateGoalProgress(g as Goal);
      results.push({ ...goalWithProduct, progress });
    }
    return results;
  }

  // No explicit goals for this period — derive from yearly goals
  if (requestedPeriod && requestedPeriod !== "year") {
    const { data: yearlyGoals } = await admin
      .from("goals")
      .select("*, products(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("period", "year")
      .order("period_start", { ascending: false });

    if (yearlyGoals && yearlyGoals.length > 0) {
      const divisor = requestedPeriod === "quarter" ? 4 : 12;
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();

      // Calculate current period start
      let periodStart: string;
      if (requestedPeriod === "month") {
        periodStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      } else {
        const qStart = Math.floor(m / 3) * 3;
        periodStart = `${y}-${String(qStart + 1).padStart(2, "0")}-01`;
      }

      const results: GoalWithProgress[] = [];
      for (const g of yearlyGoals) {
        // Create a derived goal with proportional target
        const derivedGoal: Goal = {
          ...(g as Goal),
          period: requestedPeriod,
          period_start: periodStart,
          target_value: Number(g.target_value) / divisor,
        };

        const goalWithProduct: GoalWithProduct = {
          ...derivedGoal,
          product_name: (g as any).products?.name ?? null,
        };
        const progress = await calculateGoalProgress(derivedGoal);
        results.push({ ...goalWithProduct, progress, derived: true });
      }
      return results;
    }
  }

  return [];
}

// ── KI-Empfehlung ────────────────────────────────────────────

import { queryLLM } from "@/lib/ai/bedrock-client";
import {
  PERFORMANCE_SYSTEM_PROMPT,
  buildPerformancePrompt,
} from "@/lib/ai/prompts/performance-recommendation";

export async function getPerformanceRecommendation(
  progressData: GoalProgress[],
): Promise<{ recommendation?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  if (progressData.length === 0) {
    return { error: "Keine Zieldaten vorhanden" };
  }

  const prompt = buildPerformancePrompt(progressData);
  const result = await queryLLM(prompt, PERFORMANCE_SYSTEM_PROMPT, {
    maxTokens: 512,
    temperature: 0.5,
  });

  if (!result.success || !result.data) {
    return { error: result.error ?? "KI-Empfehlung konnte nicht generiert werden" };
  }

  return { recommendation: result.data };
}
