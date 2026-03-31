interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function ProgressBar({
  progress,
  showLabel = true,
  size = "sm",
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      <div className={`w-full bg-zinc-800 rounded-full overflow-hidden ${height}`}>
        <div
          className="bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedProgress}%`, height: "100%" }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-zinc-400 mt-1">{clampedProgress}%</p>
      )}
    </div>
  );
}
