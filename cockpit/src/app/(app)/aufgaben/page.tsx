import { getTasks } from "./actions";
import { getContactsForSelect } from "../contacts/actions";
import { getCompaniesForSelect } from "../companies/actions";
import { getDealsForSelect } from "../pipeline/actions";
import { AufgabenClient } from "./aufgaben-client";

export default async function AufgabenPage() {
  const [tasks, contacts, companies, deals] = await Promise.all([
    getTasks(),
    getContactsForSelect(),
    getCompaniesForSelect(),
    getDealsForSelect(),
  ]);

  return (
    <AufgabenClient
      tasks={tasks}
      contacts={contacts}
      companies={companies}
      deals={deals}
    />
  );
}
