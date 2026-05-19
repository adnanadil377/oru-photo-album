import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted">
        <span>{label}</span>
        <span>{Math.round(boundedValue)}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/20"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(boundedValue)}
      >
        <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${boundedValue}%` }} />
      </div>
    </div>
  );
}
