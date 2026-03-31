// ─── User & Auth ────────────────────────────────────────────

export type UserRole = "viewer" | "editor" | "admin";

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  organisation: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// ─── Video ──────────────────────────────────────────────────

export type VideoStatus = "pending" | "processing" | "processed" | "failed";
export type SensitivityLabel = "safe" | "flagged";

export interface Video {
  _id: string;
  title: string;
  description: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  duration: number;
  resolution: string;
  path: string;
  thumbnailKey?: string;
  thumbnailUrl?: string;
  userId: string;
  status: VideoStatus;
  sensitivityScore: number;
  sensitivityLabel: SensitivityLabel;
  processingProgress: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoFilters {
  status?: VideoStatus;
  sensitivityLabel?: SensitivityLabel;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── API Response ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedVideos {
  videos: Video[];
  total: number;
  page: number;
  pages: number;
}

// ─── Socket Events ──────────────────────────────────────────

export interface ProcessingProgressPayload {
  videoId: string;
  progress: number;
  status: VideoStatus;
  message: string;
  timestamp: string;
}
