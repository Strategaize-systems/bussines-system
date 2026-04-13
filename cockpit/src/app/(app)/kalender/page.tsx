import { getCalendarEventsForRange } from "./actions";
import { KalenderClient } from "./kalender-client";

export default async function KalenderPage() {
  // Load 3 months of data (previous, current, next) for smooth navigation
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  const events = await getCalendarEventsForRange(
    rangeStart.toISOString(),
    rangeEnd.toISOString()
  );

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return <KalenderClient initialEvents={events} initialDate={today} />;
}
