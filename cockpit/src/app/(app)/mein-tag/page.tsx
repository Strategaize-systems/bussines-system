import {
  getTodayItems,
  getMeinTagContext,
  getCalendarEventsForToday,
  getExceptionData,
  getNextMeetingWithContext,
  getTopDeals,
  getGatekeeperSummary,
} from "./actions";
import { MeinTagClient } from "./mein-tag-client";

export default async function MeinTagPage() {
  const [data, context, calendarSlots, exceptions, nextMeeting, topDeals, gatekeeperSummary] = await Promise.all([
    getTodayItems(),
    getMeinTagContext(),
    getCalendarEventsForToday(),
    getExceptionData(),
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
      dateLabel={dateLabel}
    />
  );
}
