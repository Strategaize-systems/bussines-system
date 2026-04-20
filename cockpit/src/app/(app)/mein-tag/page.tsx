import {
  getTodayItems,
  getMeinTagContext,
  getCalendarEventsForToday,
  getExceptionData,
  getNextMeetingWithContext,
  getTopDeals,
  getGatekeeperSummary,
} from "./actions";
import { getPendingFollowups } from "./followup-actions";
import { getPendingInsights } from "@/lib/actions/insight-actions";
import { MeinTagClient } from "./mein-tag-client";

export default async function MeinTagPage() {
  const [data, context, calendarSlots, exceptions, nextMeeting, topDeals, gatekeeperSummary, followupSuggestions, insightSuggestions] = await Promise.all([
    getTodayItems(),
    getMeinTagContext(),
    getCalendarEventsForToday(),
    getExceptionData(),
    getNextMeetingWithContext(),
    getTopDeals(5),
    getGatekeeperSummary(),
    getPendingFollowups(),
    getPendingInsights(),
  ]);

  const dateLabel = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <MeinTagClient
      data={data}
      stages={context.stages}
      contacts={context.contacts}
      companies={context.companies}
      deals={context.deals}
      pipelines={context.pipelines}
      calendarSlots={calendarSlots}
      exceptions={exceptions}
      nextMeeting={nextMeeting}
      topDeals={topDeals}
      gatekeeperSummary={gatekeeperSummary}
      followupSuggestions={followupSuggestions}
      insightSuggestions={insightSuggestions}
      dateLabel={dateLabel}
    />
  );
}
