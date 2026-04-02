import { getHandoffs } from "./actions";
import { getDealsForSelect } from "../pipeline/actions";
import { getCompaniesForSelect } from "../companies/actions";
import { HandoffsClient } from "./handoffs-client";

export default async function HandoffsPage() {
  const [handoffs, deals, companies] = await Promise.all([
    getHandoffs(),
    getDealsForSelect(),
    getCompaniesForSelect(),
  ]);

  return (
    <HandoffsClient
      handoffs={handoffs}
      deals={deals}
      companies={companies}
    />
  );
}
