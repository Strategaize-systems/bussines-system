import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";
import type { UpcomingAction } from "./actions";

interface UpcomingActionsProps {
  actions: UpcomingAction[];
}

export function UpcomingActions({ actions }: UpcomingActionsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Nächste Aktionen</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length > 0 ? (
          <div className="space-y-3">
            {actions.map((a) => (
              <div key={a.dealId} className="flex items-start gap-2">
                <CalendarClock
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    a.isOverdue ? "text-destructive" : "text-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight">
                    <span className="font-medium">{a.nextAction}</span>
                    <span className="text-muted-foreground"> — {a.dealTitle}</span>
                  </p>
                  <p className={cn(
                    "text-xs",
                    a.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    {a.isOverdue ? "Überfällig: " : ""}
                    {new Date(a.nextActionDate).toLocaleDateString("de-DE")}
                    {a.contactName && ` · ${a.contactName}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine offenen Aktionen.</p>
        )}
      </CardContent>
    </Card>
  );
}
