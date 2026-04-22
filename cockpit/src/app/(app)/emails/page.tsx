import { getEmails } from "./actions";
import { getEmailTemplates } from "../settings/template-actions";
import { getTrackingSummaries } from "@/lib/email/tracking-queries";
import { EmailsClient } from "./emails-client";
import { InboxClient } from "./inbox-client";
import { PageHeader } from "@/components/ui/page-header";

export default async function EmailsPage() {
  const [emails, templates] = await Promise.all([
    getEmails(),
    getEmailTemplates(),
  ]);

  const emailIds = emails.map((e) => e.id);
  const trackingSummaries = await getTrackingSummaries(emailIds);

  return (
    <div>
      <PageHeader title="E-Mails" subtitle="Empfangene und gesendete E-Mails" />
      <InboxClient
        sentContent={<EmailsClient emails={emails} templates={templates} trackingSummaries={trackingSummaries} />}
      />
    </div>
  );
}
