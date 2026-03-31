import path from 'path';
import Video from '../models/Video';
import AppError from '../utils/AppError';
import logger from '../utils/logger';
import { IVideo, VideoFilters, UserRole } from '../types';
import { assertObjectExists, createSignedDownloadUrl, deleteObject } from './s3Service';
import config from '../config';

/**
 * Create a new video record after S3 upload
 */
export const createVideo = async (
  file: {
    key: string;
    originalName: string;
    mimetype: string;
    size: number;
  },
  userId: string,
  metadata: { title: string; description?: string }
): Promise<IVideo> => {
  const video = await Video.create({
    title: metadata.title,
    description: metadata.description || '',
    filename: path.basename(file.key),
    originalName: file.originalName,
    mimetype: file.mimetype,
    size: file.size,
    path: file.key,
    userId,
    status: 'pending',
    processingProgress: 0,
  });

  logger.info(`Video created: ${video._id} by user: ${userId}`);
  return video;
};

/**
 * Get videos for a user with multi-tenant isolation
 * Admins can see all videos; other roles see only their own
 */
export const getUserVideos = async (
  userId: string,
  role: UserRole,
  filters: VideoFilters = {}
): Promise<{ videos: IVideo[]; total: number; page: number; pages: number }> => {
  const { status, sensitivityLabel, search, page = 1, limit = 20 } = filters;

  // Build query — multi-tenant isolation
  const query: any = {};

  if (role !== 'admin') {
    query.userId = userId;
  }

  if (status) {
    query.status = status;
  }

  if (sensitivityLabel) {
    query.sensitivityLabel = sensitivityLabel;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { originalName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    Video.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Video.countDocuments(query),
  ]);

  return {
    videos: videos as IVideo[],
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Get a single video by ID with ownership check
 */
export const getVideoById = async (
  videoId: string,
  userId: string,
  role: UserRole
): Promise<IVideo> => {
  const video = await Video.findById(videoId);

  if (!video) {
    throw new AppError('Video not found.', 404);
  }

  // Multi-tenant isolation: non-admins can only access their own videos
  if (role !== 'admin' && video.userId.toString() !== userId) {
    throw new AppError('You do not have access to this video.', 403);
  }

  return video;
};

/**
 * Delete a video and its file
 */
export const deleteVideo = async (
  videoId: string,
  userId: string,
  role: UserRole
): Promise<void> => {
  const video = await Video.findById(videoId);

  if (!video) {
    throw new AppError('Video not found.', 404);
  }

  // Multi-tenant: editors can delete own, admins can delete any
  if (role !== 'admin' && video.userId.toString() !== userId) {
    throw new AppError('You do not have permission to delete this video.', 403);
  }

  // Delete file from S3
  try {
    await deleteObject(video.path);
    logger.info(`Deleted video object from S3: ${video.path}`);
  } catch (err) {
    logger.error(`Failed to delete video object from S3: ${video.path}`, err);
  }

  // Delete database record
  await Video.findByIdAndDelete(videoId);
  logger.info(`Video deleted: ${videoId} by user: ${userId}`);
};

/**
 * Update video processing status
 */
export const updateVideoStatus = async (
  videoId: string,
  update: Partial<
    Pick<
      IVideo,
      | 'status'
      | 'processingProgress'
      | 'sensitivityScore'
      | 'sensitivityLabel'
      | 'duration'
      | 'resolution'
    >
  >
): Promise<IVideo | null> => {
  const video = await Video.findByIdAndUpdate(videoId, update, { new: true });
  return video;
};

export const ensureUploadedVideoExists = async (
  objectKey: string,
  expectedSize?: number
): Promise<void> => {
  await assertObjectExists(objectKey, expectedSize);
};

export const getSignedStreamUrl = async (objectKey: string): Promise<string> => {
  return createSignedDownloadUrl(objectKey);
};

export const getSignedThumbnailUrl = async (
  objectKey: string
): Promise<string> => {
  return createSignedDownloadUrl(objectKey, config.S3_THUMBNAIL_URL_EXPIRES_IN);
};
