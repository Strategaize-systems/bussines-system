import { redirect } from "next/navigation";

import { getProposalForEdit } from "@/app/(app)/proposals/actions";
import { listProducts } from "@/app/actions/products";
import { ProposalWorkspace } from "./proposal-workspace";

export default async function ProposalEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [payload, products] = await Promise.all([
    getProposalForEdit(id),
    listProducts("active"),
  ]);

  if (!payload) {
    redirect("/proposals");
  }

  return (
    <div className="px-6 py-6">
      <ProposalWorkspace payload={payload} products={products} />
    </div>
  );
}
