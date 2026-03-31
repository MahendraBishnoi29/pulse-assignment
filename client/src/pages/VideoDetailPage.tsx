import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Trash2, HardDrive, Clock, Maximize, AlertTriangle } from "lucide-react";
import * as videoApi from "../services/videoApi";
import { useAuth } from "../context/AuthContext";
import { useVideos } from "../context/VideoContext";
import { useToast } from "../components/Toast";
import type { Video } from "../types";
import Navbar from "../components/Navbar";
import VideoPlayer from "../components/VideoPlayer";
import StatusBadge from "../components/StatusBadge";
import { Skeleton } from "../components/Skeleton";
import { AxiosError } from "axios";

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { removeVideo } = useVideos();
  const { toast } = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      if (!id) return;
      try {
        const res = await videoApi.getVideo(id);
        setVideo(res.data.video);
      } catch (err) {
        const error = err as AxiosError<{message: string}>;
        toast(error.response?.data?.message || "Video not found", "error");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    loadVideo();
  }, [id, navigate, toast]);

  const handleDelete = async () => {
    if (!video || !window.confirm("Are you sure you want to delete this video?")) return;
    
    setIsDeleting(true);
    try {
      await removeVideo(video._id);
      toast("Video deleted successfully", "success");
      navigate("/");
    } catch (err) {
      const error = err as AxiosError<{message: string}>;
      toast(error.response?.data?.message || "Failed to delete video", "error");
      setIsDeleting(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          <Skeleton className="w-24 h-6 mb-6" />
          <Skeleton className="w-full aspect-video rounded-xl mb-8" />
          <div className="space-y-4">
            <Skeleton className="w-3/4 h-8" />
            <Skeleton className="w-1/2 h-4" />
          </div>
        </main>
      </div>
    );
  }

  if (!video) return null;

  const canDelete =
    user?.role === "admin" || (user?.role === "editor" && video.userId === user._id);
  const isProcessComplete = video.status === "processed";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 animate-in fade-in duration-500">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-white mb-6 transition-colors focus-ring rounded"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Library
        </Link>

        {isProcessComplete ? (
          <VideoPlayer
            streamUrl={videoApi.getStreamUrl(video._id)}
            isFlagged={video.sensitivityLabel === "flagged"}
          />
        ) : (
          <div className="w-full aspect-video bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-center items-center text-center p-6 shadow-xl">
            {video.status === "failed" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Processing Failed</h3>
                <p className="text-zinc-400">There was an error analyzing and processing this video.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Processing in progress</h3>
                <p className="text-zinc-400">This video is currently being analyzed and optimized for streaming. Please wait.</p>
                <div className="mt-6 font-mono text-amber-500 font-medium">
                  {video.processingProgress}% Complete
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <StatusBadge type="status" value={video.status} />
                {isProcessComplete && (
                  <StatusBadge type="sensitivity" value={video.sensitivityLabel} />
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{video.title}</h1>
              <p className="text-zinc-400 text-sm">
                Uploaded {format(new Date(video.createdAt), "PPP 'at' p")}
              </p>
            </div>

            <div className="prose prose-invert prose-zinc max-w-none">
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {video.description || "No description provided."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Video Details
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center text-sm">
                  <HardDrive className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
                  <span className="text-zinc-400 flex-1">Size</span>
                  <span className="text-zinc-100 font-medium">{formatSize(video.size)}</span>
                </li>
                <li className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
                  <span className="text-zinc-400 flex-1">Duration</span>
                  <span className="text-zinc-100 font-medium">{formatDuration(video.duration)}</span>
                </li>
                <li className="flex items-center text-sm">
                  <Maximize className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
                  <span className="text-zinc-400 flex-1">Resolution</span>
                  <span className="text-zinc-100 font-medium uppercase">{video.resolution || "Unknown"}</span>
                </li>
              </ul>
            </div>

            {isProcessComplete && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  Analysis Results
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-zinc-400">Sensitivity Score</span>
                    <span className="font-mono text-zinc-100 font-medium">{video.sensitivityScore}/100</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        video.sensitivityLabel === "safe" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${video.sensitivityScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Scores &ge; 50 are flagged as containing potentially sensitive material.
                  </p>
                </div>
              </div>
            )}

            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-medium transition-colors focus-ring disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Video"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
