import { getReferrals } from "./actions";
import { getContactsForSelect } from "../contacts/actions";
import { getCompaniesForSelect } from "../companies/actions";
import { getDealsForSelect } from "../pipeline/actions";
import { ReferralsClient } from "./referrals-client";

export default async function ReferralsPage() {
  const [referrals, contacts, companies, deals] = await Promise.all([
    getReferrals(),
    getContactsForSelect(),
    getCompaniesForSelect(),
    getDealsForSelect(),
  ]);

  return (
    <ReferralsClient
      referrals={referrals}
      contacts={contacts}
      companies={companies}
      deals={deals}
    />
  );
}
