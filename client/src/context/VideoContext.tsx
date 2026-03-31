import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import type { Video, VideoFilters, ProcessingProgressPayload } from "../types";
import * as videoApi from "../services/videoApi";
import { getSocket, useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

interface VideoContextValue {
  videos: Video[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  filters: VideoFilters;
  setFilters: (filters: VideoFilters) => void;
  fetchVideos: (f?: VideoFilters) => Promise<void>;
  removeVideo: (id: string) => Promise<void>;
}

const VideoContext = createContext<VideoContextValue | null>(null);

export function VideoProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<VideoFilters>({});
  const { isConnected } = useSocket();

  const fetchVideos = useCallback(async (f?: VideoFilters) => {
    setLoading(true);
    try {
      const activeFilters = f ?? filters;
      const res = await videoApi.getVideos(activeFilters);
      setVideos(res.data.videos);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const removeVideo = useCallback(async (id: string) => {
    await videoApi.deleteVideo(id);
    setVideos((prev) => prev.filter((v) => v._id !== id));
    setTotal((prev) => prev - 1);
  }, []);

  // Fetch on auth or filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchVideos(filters);
    }
  }, [isAuthenticated, filters, fetchVideos]);

  // Socket: real-time processing progress
  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;

    const socket = getSocket();
    if (!socket) return;

    const handleProgress = (payload: ProcessingProgressPayload) => {
      setVideos((prev) =>
        prev.map((v) =>
          v._id === payload.videoId
            ? {
                ...v,
                processingProgress: payload.progress,
                status: payload.status,
              }
            : v
        )
      );

      // When processing is finalized, ping DB to get the new sensitivity label/score
      if (payload.status === "processed" || payload.status === "failed") {
        fetchVideos(filters);
      }
    };

    socket.on("processing:progress", handleProgress);

    return () => {
      socket.off("processing:progress", handleProgress);
    };
  }, [isAuthenticated, isConnected, fetchVideos, filters]);

  return (
    <VideoContext.Provider
      value={{
        videos,
        total,
        page,
        pages,
        loading,
        filters,
        setFilters,
        fetchVideos,
        removeVideo,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVideos(): VideoContextValue {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideos must be used within VideoProvider");
  return ctx;
}
