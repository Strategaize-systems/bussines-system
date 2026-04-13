import { getFocusQueue } from "./actions";
import { FocusClient } from "./focus-client";
import { createClient } from "@/lib/supabase/server";
import { getExceptionData, getGatekeeperSummary } from "../mein-tag/actions";

export default async function FocusPage() {
  const supabase = await createClient();

  const [items, contactsResult, companiesResult, dealsResult, exceptions, gatekeeperSummary] = await Promise.all([
    getFocusQueue(15),
    supabase.from("contacts").select("id, first_name, last_name").order("last_name"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("deals").select("id, title").order("title"),
    getExceptionData(),
    getGatekeeperSummary(),
  ]);

  return (
    <FocusClient
      initialItems={items}
      contacts={contactsResult.data ?? []}
      companies={companiesResult.data ?? []}
      deals={dealsResult.data ?? []}
      exceptions={exceptions}
      gatekeeperSummary={gatekeeperSummary}
    />
  );
}
