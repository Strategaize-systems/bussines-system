import { getProposals } from "./actions";
import { getDealsForSelect } from "../pipeline/actions";
import { getContactsForSelect } from "../contacts/actions";
import { getCompaniesForSelect } from "../companies/actions";
import { ProposalsClient } from "./proposals-client";

export default async function ProposalsPage() {
  const [proposals, deals, contacts, companies] = await Promise.all([
    getProposals(),
    getDealsForSelect(),
    getContactsForSelect(),
    getCompaniesForSelect(),
  ]);

  return (
    <ProposalsClient
      proposals={proposals}
      deals={deals}
      contacts={contacts}
      companies={companies}
    />
  );
}
