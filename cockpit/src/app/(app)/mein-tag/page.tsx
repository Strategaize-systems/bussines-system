import {
  getTodayItems,
  getMeinTagContext,
  getCalendarEventsForToday,
  getExceptionData,
  getNextMeetingWithContext,
  getTopDeals,
} from "./actions";
import { MeinTagClient } from "./mein-tag-client";

export default async function MeinTagPage() {
  const [data, context, calendarSlots, exceptions, nextMeeting, topDeals] = await Promise.all([
    getTodayItems(),
    getMeinTagContext(),
    getCalendarEventsForToday(),
    getExceptionData(),
    getNextMeetingWithContext(),
    getTopDeals(5),
  ]);

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
    />
  );
}
