import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityItem } from "./activity-item";
import { ActivityForm } from "./activity-form";
import type { Activity } from "@/lib/actions/activity-actions";

interface ActivityTimelineProps {
  activities: Activity[];
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export function ActivityTimeline({
  activities,
  contactId,
  companyId,
  dealId,
}: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Aktivitäten ({activities.length})
          </CardTitle>
          <ActivityForm
            contactId={contactId}
            companyId={companyId}
            dealId={dealId}
          />
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="divide-y">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Aktivitäten.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
