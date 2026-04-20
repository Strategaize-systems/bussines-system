import { cn } from "@/lib/utils";

type Props = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function getColor(percent: number): string {
  if (percent >= 90) return "text-emerald-500";
  if (percent >= 70) return "text-amber-500";
  return "text-red-500";
}

function getTrackColor(percent: number): string {
  if (percent >= 90) return "text-emerald-100";
  if (percent >= 70) return "text-amber-100";
  return "text-red-100";
}

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 8,
  className,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={cn("stroke-current", getTrackColor(percent))}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("stroke-current transition-all duration-500", getColor(percent))}
        />
      </svg>
      <span className={cn("absolute text-sm font-bold", getColor(percent))}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}
