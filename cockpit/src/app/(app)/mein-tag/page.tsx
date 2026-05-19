import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import {
  getTodayItems,
  getMeinTagContext,
  getCalendarEventsForToday,
  getNextMeetingWithContext,
  getTopDeals,
  getGatekeeperSummary,
} from "./actions";
import { MeinTagClient } from "./mein-tag-client";
import { listCustomReports } from "@/lib/custom-reports/actions/list";

export default async function MeinTagPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // V7.5 SLC-753 — Server-Side Role-Guard fuer NL-Rule-Builder-Card.
  // Admin + Teamlead duerfen sculpten, Member nicht.
  const profile = await getProfile();
  const canSculpt = profile.role === "admin" || profile.role === "teamlead";

  const [data, context, calendarSlots, nextMeeting, topDeals, gatekeeperSummary, customReportsRes] = await Promise.all([
    getTodayItems(),
    getMeinTagContext(),
    getCalendarEventsForToday(),
    getNextMeetingWithContext(),
    getTopDeals(5),
    getGatekeeperSummary(),
    listCustomReports({ context_type: "mein-tag" }),
  ]);

  // V7.6 SLC-763 — Custom-Reports nur bei Success durchreichen. Bei Infra-Error
  // bleibt das Dropdown leer (best-effort, kein Hard-Crash der Seite).
  const customReports = customReportsRes.ok ? customReportsRes.items : [];

  const dateLabel = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <MeinTagClient
      userId={user.id}
      data={data}
      stages={context.stages}
      contacts={context.contacts}
      companies={context.companies}
      deals={context.deals}
      pipelines={context.pipelines}
      calendarSlots={calendarSlots}
      nextMeeting={nextMeeting}
      topDeals={topDeals}
      gatekeeperSummary={gatekeeperSummary}
      dateLabel={dateLabel}
      canSculpt={canSculpt}
      customReports={customReports}
    />
  );
}
