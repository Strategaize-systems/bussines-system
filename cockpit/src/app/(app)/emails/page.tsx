import { getEmails } from "./actions";
import { EmailsClient } from "./emails-client";

export default async function EmailsPage() {
  const emails = await getEmails();

  return <EmailsClient emails={emails} />;
}
