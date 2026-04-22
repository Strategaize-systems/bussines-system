import { getCadences } from "./actions";
import { CadencesClient } from "./cadences-client";

export default async function CadencesPage() {
  const cadences = await getCadences();

  return <CadencesClient cadences={cadences} />;
}
