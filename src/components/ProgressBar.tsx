interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  variant?: "primary" | "success" | "warning";
  size?: "sm" | "md";
  className?: string;
}

export default function ProgressBar({
  progress,
  showLabel = false,
  variant = "primary",
  size = "md",
  className = "",
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const variantClasses = {
    primary: "bg-[var(--primary)]",
    success: "bg-green-500",
    warning: "bg-amber-500",
  };

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
          <span>Progress</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={`w-full bg-[var(--card-border)] rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
