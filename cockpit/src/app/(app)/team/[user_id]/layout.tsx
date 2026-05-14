// SLC-706 MT-1 — Drilldown-Layout fuer /team/[user_id]/*
//
// Verantwortlichkeiten in dieser Reihenfolge:
//   1. Role-Guard via assertRole(['admin','teamlead']) — Member -> redirect /mein-tag
//   2. Self-Block: viewer != target (Teamlead darf sich nicht selbst drilldownen)
//   3. can_see_owner-Check via SECURITY DEFINER-Funktion — Cross-Team -> notFound()
//   4. Target-Profile fetchen fuer Banner-Anzeige
//   5. view_as-Audit-Insert (Side-Effect, blockt nicht bei Fehler)
//   6. ReadOnlyContextProvider (Client) + runWithReadOnlyContext (Server)
//      wrapping der Children.
//
// DEC-188: URL-Path-basierte Drilldown-Identifikation (kein Session-Switch).
// DEC-189: Mutate-Lockdown via assertNotReadOnlyContext() in Server Actions.
// DEC-195: audit_log.view_as_target_user_id-Spalte aus MIG-033.

import { notFound } from "next/navigation";
import { assertRole } from "@/lib/auth/assert-role";
import { createClient } from "@/lib/supabase/server";
import { logViewAs } from "@/lib/team/view-as-audit";
import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";
import { ReadOnlyContextProvider } from "@/lib/auth/read-only-context-client";
import { DrilldownBanner } from "@/components/drilldown/drilldown-banner";
import { DrilldownSubNav } from "./_components/drilldown-sub-nav";

export const dynamic = "force-dynamic";

interface DrilldownLayoutProps {
  children: React.ReactNode;
  params: Promise<{ user_id: string }>;
}

export default async function DrilldownLayout({
  children,
  params,
}: DrilldownLayoutProps) {
  const viewer = await assertRole(["admin", "teamlead"]);
  const { user_id: targetUserId } = await params;

  // Self-Block: Teamlead/Admin sieht sich nicht selbst im Drilldown.
  // Im Cockpit-Oeffnen-Flow ist das nie der Fall (eigene Row ist gefiltert),
  // aber Direkt-URL-Eingabe wird hier abgefangen.
  if (targetUserId === viewer.user_id) {
    notFound();
  }

  const supabase = await createClient();

  // can_see_owner-Check + Target-Profile in einem Round-Trip.
  // RLS-Policy profiles_select_team liefert die Row nur wenn Teamlead/Admin
  // den Target-User sehen DARF — also faengt RLS den Cross-Team-Block ab.
  // Defense-in-Depth: wenn aus irgendeinem Grund die Policy nicht greift,
  // verifizieren wir zusaetzlich via can_see_owner-RPC unten.
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, display_name, team_id, role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    notFound();
  }

  // Defense-in-Depth: can_see_owner-RPC. Wenn der RPC false liefert obwohl
  // die Profile-Row sichtbar ist (sehr unwahrscheinlich, RLS- und RPC-Logik
  // sollten konsistent sein), ist das ein Sicherheits-Indikator.
  const { data: canSeeData } = await supabase.rpc("can_see_owner", {
    target_owner: targetUserId,
  });

  if (canSeeData === false) {
    notFound();
  }

  // Audit-Insert als Side-Effect. Path bestimmen wir generisch — die konkrete
  // Sub-Route (mein-tag/pipeline/aufgaben) steckt nicht in `params`, sondern
  // im Request-Path. Fuer V1 ist der "/team/<id>" Pfad-Stamm genug.
  await logViewAs(supabase, {
    viewerUserId: viewer.user_id,
    targetUserId,
    path: `/team/${targetUserId}`,
  });

  return runWithReadOnlyContext(
    { viewerUserId: viewer.user_id, targetUserId },
    () => (
      <ReadOnlyContextProvider
        value={{ viewerUserId: viewer.user_id, targetUserId }}
      >
        <div className="flex min-h-screen flex-col">
          <DrilldownBanner
            targetDisplayName={targetProfile.display_name ?? "Mitarbeiter"}
            targetUserId={targetUserId}
          />
          <DrilldownSubNav targetUserId={targetUserId} />
          <div className="flex-1">{children}</div>
        </div>
      </ReadOnlyContextProvider>
    ),
  );
}
