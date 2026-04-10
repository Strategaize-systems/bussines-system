import { type LucideIcon } from "lucide-react";
import Link from "next/link";

type GradientVariant = "blue" | "green" | "yellow" | "red" | "emerald";

const gradients: Record<GradientVariant, string> = {
  blue: "from-[#120774] to-[#4454b8]",
  green: "from-[#00a84f] to-[#4dcb8b]",
  yellow: "from-[#f2b705] to-[#ffd54f]",
  red: "from-red-500 to-red-400",
  emerald: "from-emerald-500 to-emerald-600",
};

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: GradientVariant;
  comparison?: string;
  comparisonPositive?: boolean;
  href?: string;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  gradient = "blue",
  comparison,
  comparisonPositive,
  href,
}: KPICardProps) {
  const g = gradients[gradient];

  const content = (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      {/* Gradient Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${g}`} />

      {/* Icon */}
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g} flex items-center justify-center shadow-lg`}>
          <Icon size={24} className="text-white" strokeWidth={2.5} />
        </div>
      </div>

      {/* Value */}
      <div className="text-4xl font-bold text-slate-900 mb-1">{value}</div>

      {/* Label */}
      <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        {label}
      </div>

      {/* Comparison */}
      {comparison && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span
            className={`text-xs font-semibold flex items-center gap-1 ${
              comparisonPositive === false ? "text-red-600" : "text-emerald-600"
            }`}
          >
            <span>{comparisonPositive === false ? "↘" : "↗"}</span>
            {comparison}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface KPIGridProps {
  children: React.ReactNode;
  columns?: 3 | 4;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  return (
    <div className={`grid gap-4 ${columns === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
      {children}
    </div>
  );
}
