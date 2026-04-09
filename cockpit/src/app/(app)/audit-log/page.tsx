import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/audit";
import { getAuditLogs, getAuditLogCount } from "./actions";
import { AuditLogClient } from "./audit-log-client";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Admin-only gate
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const entityType = typeof params.entity_type === "string" ? params.entity_type : undefined;
  const action = typeof params.action === "string" ? params.action : undefined;
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const [entries, totalCount] = await Promise.all([
    getAuditLogs({ entityType, action, page }),
    getAuditLogCount({ entityType, action }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <AuditLogClient
      entries={entries}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
      currentEntityType={entityType}
      currentAction={action}
    />
  );
}
