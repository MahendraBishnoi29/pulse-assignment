import api, { API_BASE_URL } from "./api";
import axios from "axios";
import type { AxiosError } from "axios";
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
  const uploadUrlRes = await api.post<{
    success: boolean;
    data: { uploadUrl: string; objectKey: string; expiresIn: number };
  }>("/videos/upload-url", {
    filename: file.name,
    mimetype: file.type,
    size: file.size,
  });

  try {
    await axios.put(uploadUrlRes.data.data.uploadUrl, file, {
      headers: { "Content-Type": file.type },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          const percent = Math.round((event.loaded * 95) / event.total);
          onProgress(percent);
        }
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (!axiosError.response) {
      throw new Error(
        "Direct S3 upload failed. Check bucket CORS for PUT from your frontend origin."
      );
    }
    throw error;
  }

  if (onProgress) {
    onProgress(98);
  }

  const res = await api.post("/videos", {
    title: metadata.title,
    description: metadata.description,
    objectKey: uploadUrlRes.data.data.objectKey,
    originalName: file.name,
    mimetype: file.type,
    size: file.size,
  });

  if (onProgress) {
    onProgress(100);
  }

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
