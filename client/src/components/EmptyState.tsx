import { Upload } from "lucide-react";

interface EmptyStateProps {
  onUpload?: () => void;
  canUpload?: boolean;
}

export default function EmptyState({ onUpload, canUpload }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Upload className="w-7 h-7 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-zinc-200 mb-1">No videos yet</h3>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs">
        {canUpload
          ? "Upload your first video to get started with processing and analysis."
          : "No videos are available. Check back later."}
      </p>
      {canUpload && onUpload && (
        <button
          onClick={onUpload}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Upload Video
        </button>
      )}
    </div>
  );
}
