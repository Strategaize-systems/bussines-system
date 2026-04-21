import { getInboxEmails } from "../imap-actions";
import { getContactsForAssignment } from "./actions";
import { UnassignedQueueClient } from "./unassigned-client";

export default async function UnassignedEmailsPage() {
  const { emails, total } = await getInboxEmails({ unassignedOnly: true, limit: 100 });
  const contacts = await getContactsForAssignment();

  // Filter out spam/newsletter/auto_reply (only show relevant unassigned)
  const relevantEmails = emails.filter(
    (e) => !["spam", "newsletter", "auto_reply"].includes(e.classification)
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nicht zugeordnete E-Mails</h1>
        <p className="text-muted-foreground mt-1">
          {relevantEmails.length} E-Mail{relevantEmails.length !== 1 ? "s" : ""} ohne Kontakt-Zuordnung
          {total > relevantEmails.length && ` (${total} gesamt, ${total - relevantEmails.length} gefiltert)`}
        </p>
      </div>
      <UnassignedQueueClient emails={relevantEmails} contacts={contacts} />
    </div>
  );
}
