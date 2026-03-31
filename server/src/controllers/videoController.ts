import { Response, NextFunction } from 'express';
import fs from 'fs';
import * as videoService from '../services/videoService';
import { startProcessing } from '../workers/videoProcessor';
import { AuthRequest, VideoFilters } from '../types';
import AppError from '../utils/AppError';

/**
 * POST /api/videos
 * Upload a video (editor, admin only)
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

    if (!req.file) {
      throw new AppError('No video file provided.', 400);
    }

    const { title, description } = req.body;

    if (!title || title.trim() === '') {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      throw new AppError('Video title is required.', 400);
    }

    // Create video record
    const video = await videoService.createVideo(req.file, req.user.userId, {
      title: title.trim(),
      description: description?.trim(),
    });

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
 * Stream video with HTTP range requests (206 Partial Content)
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

    const videoPath = video.path;

    // Verify file exists
    if (!fs.existsSync(videoPath)) {
      throw new AppError('Video file not found on disk.', 404);
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // ── Range request (206 Partial Content) ─────────────────
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validate range
      if (start >= fileSize) {
        res.status(416).set({
          'Content-Range': `bytes */${fileSize}`,
        });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(videoPath, { start, end });

      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': video.mimetype,
      });

      stream.pipe(res);
    } else {
      // ── Full file request (200 OK) ──────────────────────────
      res.status(200).set({
        'Content-Length': fileSize.toString(),
        'Content-Type': video.mimetype,
        'Accept-Ranges': 'bytes',
      });

      const stream = fs.createReadStream(videoPath);
      stream.pipe(res);
    }
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
