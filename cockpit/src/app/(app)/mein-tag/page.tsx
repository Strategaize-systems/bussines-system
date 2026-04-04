import { getTodayItems } from "./actions";
import { MeinTagClient } from "./mein-tag-client";

export default async function MeinTagPage() {
  const data = await getTodayItems();

  return <MeinTagClient data={data} />;
}
