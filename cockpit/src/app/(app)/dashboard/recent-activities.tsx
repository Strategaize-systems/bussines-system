import {
  StickyNote,
  Phone,
  Mail,
  Users,
  CheckSquare,
  ArrowRightLeft,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: typeof StickyNote; color: string; bg: string }> = {
  note: { icon: StickyNote, color: "text-blue-600", bg: "bg-blue-50" },
  call: { icon: Phone, color: "text-green-600", bg: "bg-green-50" },
  email: { icon: Mail, color: "text-purple-600", bg: "bg-purple-50" },
  meeting: { icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
  task: { icon: CheckSquare, color: "text-yellow-600", bg: "bg-yellow-50" },
  stage_change: { icon: ArrowRightLeft, color: "text-slate-500", bg: "bg-slate-50" },
};

type DashboardActivity = {
  id: string;
  type: string;
  title: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string } | null;
  companies: { name: string } | null;
};

interface RecentActivitiesProps {
  activities: DashboardActivity[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)" }}
    >
      <div className="h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
      <div className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Letzte Aktivitäten</h3>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((a) => {
              const config = TYPE_CONFIG[a.type] || TYPE_CONFIG.note;
              const Icon = config.icon;
              const contactName = a.contacts
                ? `${a.contacts.first_name} ${a.contacts.last_name}`
                : null;
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <div className={`rounded-lg p-1.5 ${config.bg} ${config.color} shrink-0`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-700 leading-tight">
                      {a.title || a.type}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {contactName && <span>{contactName} · </span>}
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
          <p className="text-sm text-slate-400">Noch keine Aktivitäten.</p>
        )}
      </div>
    </div>
  );
}
