import { getContacts } from "./actions";
import { getCompaniesForSelect } from "../companies/actions";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    getContacts(),
    getCompaniesForSelect(),
  ]);

  return <ContactsClient contacts={contacts} companies={companies} />;
}
