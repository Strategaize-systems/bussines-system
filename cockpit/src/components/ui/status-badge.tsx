type BadgeVariant = "lead" | "qualifiziert" | "aktiv" | "kunde" | "inaktiv" | "offen" | "erledigt" | "überfällig" | "in_arbeit" | "hoch" | "mittel" | "niedrig";

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; icon?: string }> = {
  lead: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  qualifiziert: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  aktiv: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  kunde: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  inaktiv: { bg: "bg-slate-100", text: "text-slate-400", border: "border-slate-200" },
  offen: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  erledigt: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  überfällig: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  in_arbeit: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  hoch: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  mittel: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  niedrig: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  icon?: string;
}

export function StatusBadge({ variant, label, icon }: StatusBadgeProps) {
  const style = variantStyles[variant] || variantStyles.lead;
  const displayLabel = label || variant.charAt(0).toUpperCase() + variant.slice(1).replace("_", " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}
    >
      {icon && <span>{icon}</span>}
      {displayLabel}
    </span>
  );
}
