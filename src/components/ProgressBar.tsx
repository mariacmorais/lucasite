interface ProgressBarProps {
  value: number;
  label?: string;
  compact?: boolean;
}

export function ProgressBar({
  value,
  label = "Deck mastery",
  compact = false,
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={`progress-block ${compact ? "progress-block--compact" : ""}`}>
      <div className="progress-label">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-label={label}
      >
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
