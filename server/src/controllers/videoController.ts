import { Response, NextFunction } from 'express';
import * as videoService from '../services/videoService';
import {
  buildVideoObjectKey,
  createSignedUploadUrl,
} from '../services/s3Service';
import config from '../config';
import { startProcessing } from '../workers/videoProcessor';
import { AuthRequest, VideoFilters } from '../types';
import AppError from '../utils/AppError';

/**
 * POST /api/videos/upload-url
 * Generate presigned S3 upload URL (editor, admin only)
 */
export const getUploadUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const { filename, mimetype, size } = req.body as {
      filename?: string;
      mimetype?: string;
      size?: number;
    };

    if (!filename || !mimetype) {
      throw new AppError('Filename and mimetype are required.', 400);
    }

    if (!config.ALLOWED_MIMETYPES.includes(mimetype)) {
      throw new AppError(
        `Invalid file type: ${mimetype}. Only video files are allowed.`,
        400
      );
    }

    if (typeof size !== 'number' || size <= 0) {
      throw new AppError('File size is required.', 400);
    }

    if (size > config.MAX_FILE_SIZE) {
      throw new AppError('Video exceeds 500MB upload limit.', 400);
    }

    const objectKey = buildVideoObjectKey(req.user.userId, filename);
    const { uploadUrl, expiresIn } = await createSignedUploadUrl(
      objectKey,
      mimetype
    );

    res.status(200).json({
      success: true,
      data: {
        uploadUrl,
        objectKey,
        expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/videos
 * Save uploaded S3 object metadata and start processing
 */
export const uploadVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const { title, description, objectKey, originalName, mimetype, size } =
      req.body as {
        title?: string;
        description?: string;
        objectKey?: string;
        originalName?: string;
        mimetype?: string;
        size?: number;
      };

    if (!title || title.trim() === '') {
      throw new AppError('Video title is required.', 400);
    }

    if (!objectKey || !originalName || !mimetype || typeof size !== 'number') {
      throw new AppError('Upload metadata is incomplete.', 400);
    }

    if (!objectKey.startsWith(`videos/${req.user.userId}/`)) {
      throw new AppError('Invalid upload object key.', 400);
    }

    if (!config.ALLOWED_MIMETYPES.includes(mimetype)) {
      throw new AppError(
        `Invalid file type: ${mimetype}. Only video files are allowed.`,
        400
      );
    }

    if (size <= 0 || size > config.MAX_FILE_SIZE) {
      throw new AppError('Invalid file size.', 400);
    }

    await videoService.ensureUploadedVideoExists(objectKey, size);

    // Create video record
    const video = await videoService.createVideo(
      { key: objectKey, originalName, mimetype, size },
      req.user.userId,
      {
        title: title.trim(),
        description: description?.trim(),
      }
    );

    // Trigger background processing
    startProcessing(video._id.toString());

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully. Processing has started.',
      data: { video },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos
 * List videos for the authenticated user (with filters)
 */
export const getVideos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const filters: VideoFilters = {
      status: req.query.status as any,
      sensitivityLabel: req.query.sensitivityLabel as any,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await videoService.getUserVideos(
      req.user.userId,
      req.user.role,
      filters
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:id
 * Get single video metadata
 */
export const getVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const video = await videoService.getVideoById(
      req.params.id as string,
      req.user.userId,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: { video },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:id/stream
 * Redirect to signed S3 URL for secure streaming
 */
export const streamVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const video = await videoService.getVideoById(
      req.params.id as string,
      req.user.userId,
      req.user.role
    );

    const streamUrl = await videoService.getSignedStreamUrl(video.path);

    // Do not cache short-lived signed URLs.
    res.set('Cache-Control', 'no-store');
    res.redirect(302, streamUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/videos/:id
 * Delete a video (editor can delete own, admin can delete any)
 */
export const deleteVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    await videoService.deleteVideo(
      req.params.id as string,
      req.user.userId,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
