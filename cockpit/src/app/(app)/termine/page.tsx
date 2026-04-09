import { getMeetings } from "../meetings/actions";
import { getCalendarEvents } from "./actions";
import { getContactsForSelect } from "../contacts/actions";
import { getCompaniesForSelect } from "../companies/actions";
import { getDealsForSelect } from "../pipeline/actions";
import { TermineClient } from "./termine-client";

export default async function TerminePage() {
  const [meetings, events, contacts, companies, deals] = await Promise.all([
    getMeetings(),
    getCalendarEvents(),
    getContactsForSelect(),
    getCompaniesForSelect(),
    getDealsForSelect(),
  ]);

  return (
    <TermineClient
      meetings={meetings}
      events={events}
      contacts={contacts}
      companies={companies}
      deals={deals}
    />
  );
}
