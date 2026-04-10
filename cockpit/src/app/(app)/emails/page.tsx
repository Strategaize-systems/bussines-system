import { getEmails } from "./actions";
import { getEmailTemplates } from "../settings/template-actions";
import { EmailsClient } from "./emails-client";

export default async function EmailsPage() {
  const [emails, templates] = await Promise.all([
    getEmails(),
    getEmailTemplates(),
  ]);

  return <EmailsClient emails={emails} templates={templates} />;
}
