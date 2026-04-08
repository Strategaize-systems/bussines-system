import { getCompaniesEnriched, getCompanyStats } from "./actions";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
  const [companies, stats] = await Promise.all([
    getCompaniesEnriched(),
    getCompanyStats(),
  ]);
  return <CompaniesClient companies={companies} stats={stats} />;
}
