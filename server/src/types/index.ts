import { Document, Types } from 'mongoose';
import { Request } from 'express';

// ─── User Types ──────────────────────────────────────────────

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  organisation: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Video Types ─────────────────────────────────────────────

export type VideoStatus = 'pending' | 'processing' | 'processed' | 'failed';
export type SensitivityLabel = 'safe' | 'flagged';

export interface IVideo extends Document {
  _id: Types.ObjectId;
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
  userId: Types.ObjectId;
  status: VideoStatus;
  sensitivityScore: number;
  sensitivityLabel: SensitivityLabel;
  processingProgress: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Auth / JWT Types ────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

// ─── Express Extension ──────────────────────────────────────

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── Socket Event Types ──────────────────────────────────────

export interface ProcessingProgressEvent {
  videoId: string;
  progress: number;
  status: VideoStatus;
  message: string;
}

export interface ProcessingCompleteEvent {
  videoId: string;
  sensitivityScore: number;
  sensitivityLabel: SensitivityLabel;
  duration: number;
  resolution: string;
}

export interface ProcessingErrorEvent {
  videoId: string;
  error: string;
}

// ─── Filter Types ────────────────────────────────────────────

export interface VideoFilters {
  status?: VideoStatus;
  sensitivityLabel?: SensitivityLabel;
  search?: string;
  page?: number;
  limit?: number;
}
