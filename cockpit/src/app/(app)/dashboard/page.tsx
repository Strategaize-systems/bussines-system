// SLC-666 — /dashboard ist jetzt KI-Analyse-Cockpit (Title-Swap + Layout-Swap).
// KPI-Cards, Top-Chancen-Tabelle und DashboardSearch sind entfernt (Slice-Spec
// AC17/18/19). KIWorkspace links 2/3 + Tages-Kalender rechts 1/3.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarEventsForToday } from "@/app/(app)/mein-tag/actions";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [contactsRes, companiesRes, dealsRes, calendarSlots] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name, phone, email, company_id")
      .order("last_name"),
    supabase.from("companies").select("id, name").order("name"),
    supabase
      .from("deals")
      .select("id, title")
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
    getCalendarEventsForToday(),
  ]);

  return (
    <DashboardClient
      userId={user.id}
      contacts={(contactsRes.data ?? []) as Array<{
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        email: string | null;
        company_id: string | null;
      }>}
      companies={(companiesRes.data ?? []) as Array<{ id: string; name: string }>}
      deals={(dealsRes.data ?? []) as Array<{ id: string; title: string }>}
      calendarSlots={calendarSlots}
    />
  );
}
