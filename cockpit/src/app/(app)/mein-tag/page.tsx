import { getTodayItems, getMeinTagContext } from "./actions";
import { MeinTagClient } from "./mein-tag-client";

export default async function MeinTagPage() {
  const [data, context] = await Promise.all([
    getTodayItems(),
    getMeinTagContext(),
  ]);

  return (
    <MeinTagClient
      data={data}
      stages={context.stages}
      contacts={context.contacts}
      companies={context.companies}
      pipelines={context.pipelines}
    />
  );
}
