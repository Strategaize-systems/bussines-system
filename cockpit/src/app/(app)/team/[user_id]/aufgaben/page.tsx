// V7.1 SLC-712b — Aufgaben-Drilldown via AufgabenClient-Reuse.
//
// Ersetzt die V7-SLC-706 reduzierte Tabelle. Laedt Tasks mit
// assigned_to-Filter (Schema-Note: tasks hat KEIN owner_user_id,
// V7 owner_user_id nur in 8 Kerntabellen, siehe MIG-033 Phase 3).
// Uebergibt an die volle AufgabenClient-Component mit
// readOnly + viewAsUserId Props (DEC-199-Pattern aus SLC-712a).
//
// Architektur-Hinweis: ReadOnlyContext wird im Drilldown-Layout via
// runWithReadOnlyContext + ReadOnlyContextProvider gewrappt.
// assertNotReadOnlyContext() in Server Actions (createTask, completeTask,
// updateTask, deleteTask) blockt Mutate-Versuche als Defense-in-Depth.

import { getTasks } from "@/app/(app)/aufgaben/actions";
import { getContactsForSelect } from "@/app/(app)/contacts/actions";
import { getCompaniesForSelect } from "@/app/(app)/companies/actions";
import { getDealsForSelect } from "@/app/(app)/pipeline/actions";
import { AufgabenClient } from "@/app/(app)/aufgaben/aufgaben-client";

interface PageProps {
  params: Promise<{ user_id: string }>;
}

export default async function DrilldownAufgabenPage({ params }: PageProps) {
  const { user_id: targetUserId } = await params;

  const [tasks, contacts, companies, deals] = await Promise.all([
    getTasks(undefined, { assignedToUserId: targetUserId }),
    getContactsForSelect(),
    getCompaniesForSelect(),
    getDealsForSelect(),
  ]);

  return (
    <AufgabenClient
      tasks={tasks}
      contacts={contacts}
      companies={companies}
      deals={deals}
      readOnly
      viewAsUserId={targetUserId}
    />
  );
}
