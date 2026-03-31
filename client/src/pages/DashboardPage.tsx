import { useState } from "react";
import { Upload } from "lucide-react";
import { useVideos } from "../context/VideoContext";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import SearchFilter from "../components/SearchFilter";
import VideoCard from "../components/VideoCard";
import UploadModal from "../components/UploadModal";
import EmptyState from "../components/EmptyState";
import { VideoCardSkeleton } from "../components/Skeleton";

export default function DashboardPage() {
  const { videos, loading, fetchVideos } = useVideos();
  const { user } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const canUpload = user?.role === "editor" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Video Library</h1>
            <p className="text-zinc-400 text-sm">Manage and process your video content</p>
          </div>
          {canUpload && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors focus-ring"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>
          )}
        </div>

        <SearchFilter />

        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          ) : (
            <div className="border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/30">
              <EmptyState 
                canUpload={canUpload} 
                onUpload={() => setIsUploadModalOpen(true)} 
              />
            </div>
          )}
        </div>
      </main>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => fetchVideos()}
      />
    </div>
  );
}
