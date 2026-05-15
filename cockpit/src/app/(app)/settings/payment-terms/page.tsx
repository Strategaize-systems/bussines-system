import { listPaymentTermsTemplates } from "./actions";
import { PaymentTermsPageContent } from "./payment-terms-page-content";
import { assertRole } from "@/lib/auth/assert-role";

export const dynamic = "force-dynamic";

export default async function PaymentTermsPage() {
  await assertRole(["admin"]);
  const templates = await listPaymentTermsTemplates();

  return (
    <main className="px-8 py-8 space-y-6">
      <PaymentTermsPageContent initialTemplates={templates} />
    </main>
  );
}
