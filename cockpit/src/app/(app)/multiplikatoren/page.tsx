import { getMultipliers } from "../contacts/actions";
import { getCompaniesForSelect } from "../companies/actions";
import { MultiplikatorenClient } from "./multiplikatoren-client";

export default async function MultiplikatorenPage() {
  const [multipliers, companies] = await Promise.all([
    getMultipliers(),
    getCompaniesForSelect(),
  ]);

  return (
    <MultiplikatorenClient
      multipliers={multipliers}
      companies={companies}
    />
  );
}
