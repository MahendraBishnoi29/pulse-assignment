import type { VideoStatus, SensitivityLabel } from "../types";

const statusConfig: Record<
  VideoStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Pending", bg: "bg-zinc-700", text: "text-zinc-300" },
  processing: {
    label: "Processing",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
  },
  processed: {
    label: "Processed",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
  },
  failed: { label: "Failed", bg: "bg-rose-500/15", text: "text-rose-400" },
};

const sensitivityConfig: Record<
  SensitivityLabel,
  { label: string; bg: string; text: string }
> = {
  safe: { label: "Safe", bg: "bg-emerald-500/15", text: "text-emerald-400" },
  flagged: { label: "Flagged", bg: "bg-rose-500/15", text: "text-rose-400" },
};

interface StatusBadgeProps {
  type: "status" | "sensitivity";
  value: VideoStatus | SensitivityLabel;
}

export default function StatusBadge({ type, value }: StatusBadgeProps) {
  const config =
    type === "status"
      ? statusConfig[value as VideoStatus]
      : sensitivityConfig[value as SensitivityLabel];

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
