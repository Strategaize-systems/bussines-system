import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getTodayItems,
  getMeinTagContext,
  getCalendarEventsForToday,
  getNextMeetingWithContext,
  getTopDeals,
  getGatekeeperSummary,
} from "./actions";
import { MeinTagClient } from "./mein-tag-client";

export default async function MeinTagPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [data, context, calendarSlots, nextMeeting, topDeals, gatekeeperSummary] = await Promise.all([
    getTodayItems(),
    getMeinTagContext(),
    getCalendarEventsForToday(),
    getNextMeetingWithContext(),
    getTopDeals(5),
    getGatekeeperSummary(),
  ]);

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
    />
  );
}
