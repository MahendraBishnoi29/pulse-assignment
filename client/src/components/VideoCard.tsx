import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { PlayCircle, Clock } from "lucide-react";
import type { Video } from "../types";
import StatusBadge from "./StatusBadge";
import ProgressBar from "./ProgressBar";

export default function VideoCard({ video }: { video: Video }) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Link
      to={`/videos/${video._id}`}
      className="group flex flex-col bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-black/40 focus-ring"
    >
      <div className="relative aspect-video bg-zinc-950 flex flex-col items-center justify-center">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={`${video.title} thumbnail`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
        )}

        {video.status === "processed" ? (
          <div className="absolute inset-0 flex items-center justify-center group-hover:bg-zinc-900/20 transition-colors">
             <PlayCircle className={`w-12 h-12 transition-colors ${video.sensitivityLabel === 'flagged' ? 'text-rose-500/50 group-hover:text-rose-500' : 'text-zinc-600 group-hover:text-emerald-500'}`} />
          </div>
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
             <Clock className="w-8 h-8 text-zinc-700 animate-pulse" />
          </div>
        )}

        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-zinc-900/90 text-zinc-200 text-xs font-medium rounded border border-zinc-800">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-zinc-100 font-medium leading-tight line-clamp-2 mb-1 group-hover:text-emerald-400 transition-colors">
          {video.title}
        </h3>
        
        <p className="text-xs text-zinc-500 mb-3 mt-auto pt-2">
          {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
        </p>

        <div className="flex items-center gap-2 mt-auto">
          <StatusBadge type="status" value={video.status} />
          {video.status === "processed" && (
            <StatusBadge type="sensitivity" value={video.sensitivityLabel} />
          )}
        </div>

        {(video.status === "processing" || video.status === "pending") && (
          <div className="mt-4">
            <ProgressBar progress={video.processingProgress} size="sm" />
          </div>
        )}
      </div>
    </Link>
  );
}
