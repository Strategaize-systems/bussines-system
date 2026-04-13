import { getEmails } from "./actions";
import { getEmailTemplates } from "../settings/template-actions";
import { EmailsClient } from "./emails-client";
import { InboxClient } from "./inbox-client";
import { PageHeader } from "@/components/ui/page-header";

export default async function EmailsPage() {
  const [emails, templates] = await Promise.all([
    getEmails(),
    getEmailTemplates(),
  ]);

  return (
    <div>
      <PageHeader title="E-Mails" subtitle="Empfangene und gesendete E-Mails" />
      <InboxClient
        sentContent={<EmailsClient emails={emails} templates={templates} />}
      />
    </div>
  );
}
