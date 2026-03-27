import { getEntries } from "./actions";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const entries = await getEntries();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  return <CalendarClient entries={entries} currentMonth={currentMonth} />;
}
