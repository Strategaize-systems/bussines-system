import { getCadenceById } from "../actions";
import { getEnrollmentsForCadence } from "../enrollment-actions";
import { CadenceDetailClient } from "./cadence-detail-client";
import { redirect } from "next/navigation";

export default async function CadenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Handle "new" route — create is handled inline on list page
  if (id === "new") {
    redirect("/cadences");
  }

  const cadence = await getCadenceById(id);
  if (!cadence) {
    redirect("/cadences");
  }

  const enrollments = await getEnrollmentsForCadence(id);

  return <CadenceDetailClient cadence={cadence} enrollments={enrollments} />;
}
