import { getTasks } from "./actions";
import { getContactsForSelect } from "../contacts/actions";
import { getCompaniesForSelect } from "../companies/actions";
import { AufgabenClient } from "./aufgaben-client";

export default async function AufgabenPage() {
  const [tasks, contacts, companies] = await Promise.all([
    getTasks(),
    getContactsForSelect(),
    getCompaniesForSelect(),
  ]);

  return (
    <AufgabenClient
      tasks={tasks}
      contacts={contacts}
      companies={companies}
    />
  );
}
