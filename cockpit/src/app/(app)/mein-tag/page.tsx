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
import { getGoalsWithProgress } from "@/app/actions/goals";
import { MeinTagClient } from "./mein-tag-client";

export default async function MeinTagPage() {
  const [data, context, calendarSlots, exceptions, nextMeeting, topDeals, gatekeeperSummary, followupSuggestions, insightSuggestions, goalsWithProgress] = await Promise.all([
    getTodayItems(),
    getMeinTagContext(),
    getCalendarEventsForToday(),
    getExceptionData(),
    getNextMeetingWithContext(),
    getTopDeals(5),
    getGatekeeperSummary(),
    getPendingFollowups(),
    getPendingInsights(),
    getGoalsWithProgress(),
  ]);

  const dateLabel = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Goals widget: max 3 overall goals, compact summary
  const goalsSummary = goalsWithProgress
    .filter((g) => !g.product_id)
    .slice(0, 3)
    .map((g) => ({
      type: g.type,
      progressPercent: g.progress.progressPercent,
      currentValue: g.progress.currentValue,
      targetValue: g.progress.targetValue,
    }));

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
      goalsSummary={goalsSummary}
      dateLabel={dateLabel}
    />
  );
}
