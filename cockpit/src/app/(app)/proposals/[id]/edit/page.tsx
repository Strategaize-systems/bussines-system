import { redirect } from "next/navigation";

import {
  getProposalForEdit,
  getProposalVersionsChain,
} from "@/app/(app)/proposals/actions";
import { listProducts } from "@/app/actions/products";
import { ProposalWorkspace } from "./proposal-workspace";

export default async function ProposalEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const readonlyParam = Array.isArray(search.readonly)
    ? search.readonly[0]
    : search.readonly;
  // V5.5 SLC-554: ?readonly=1 fuer Non-Draft-Anzeigen via "Anzeigen"-Button.
  // Server-Side wird die Mutate-Action zusaetzlich blockiert (siehe
  // assertProposalEditable in actions.ts).
  const requestedReadonly = readonlyParam === "1";

  const [payload, products, versions] = await Promise.all([
    getProposalForEdit(id),
    listProducts("active"),
    getProposalVersionsChain(id),
  ]);

  if (!payload) {
    redirect("/proposals");
  }

  // Effective-Readonly: explizit per Query oder implizit weil Status nicht
  // mehr Draft ist. Schuetzt vor zufaelligem Editier-Versuch ohne Query-Param.
  const readonly = requestedReadonly || payload.proposal.status !== "draft";

  return (
    <div className="px-6 py-6">
      <ProposalWorkspace
        payload={payload}
        products={products}
        versions={versions}
        readonly={readonly}
      />
    </div>
  );
}
