import api, { API_BASE_URL } from "./api";
import type { ApiResponse, PaginatedVideos, Video, VideoFilters } from "../types";

export const getVideos = async (
  filters: VideoFilters = {}
): Promise<ApiResponse<PaginatedVideos>> => {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.sensitivityLabel) params.sensitivityLabel = filters.sensitivityLabel;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);

  const res = await api.get("/videos", { params });
  return res.data;
};

export const getVideo = async (
  id: string
): Promise<ApiResponse<{ video: Video }>> => {
  const res = await api.get(`/videos/${id}`);
  return res.data;
};

export const uploadVideo = async (
  file: File,
  metadata: { title: string; description?: string },
  onProgress?: (progress: number) => void
): Promise<ApiResponse<{ video: Video }>> => {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("title", metadata.title);
  if (metadata.description) {
    formData.append("description", metadata.description);
  }

  const res = await api.post("/videos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    },
  });
  return res.data;
};

export const deleteVideo = async (
  id: string
): Promise<ApiResponse<null>> => {
  const res = await api.delete(`/videos/${id}`);
  return res.data;
};

export const getStreamUrl = (id: string): string => {
  const token = localStorage.getItem("pulse_token");
  return `${API_BASE_URL}/videos/${id}/stream?token=${token}`;
};
