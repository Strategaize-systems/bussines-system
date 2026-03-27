import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StickyNote,
  Phone,
  Mail,
  Users,
  CheckSquare,
  ArrowRightLeft,
} from "lucide-react";

const TYPE_ICONS: Record<string, typeof StickyNote> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckSquare,
  stage_change: ArrowRightLeft,
};

interface RecentActivitiesProps {
  activities: any[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((a) => {
              const Icon = TYPE_ICONS[a.type] || StickyNote;
              const contactName = a.contacts
                ? `${a.contacts.first_name} ${a.contacts.last_name}`
                : null;
              return (
                <div key={a.id} className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-tight">
                      {a.title || a.type}
                      {contactName && (
                        <span className="text-muted-foreground"> — {contactName}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
        )}
      </CardContent>
    </Card>
  );
}
