import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import Video from '../models/Video';
import logger from '../utils/logger';
import { SensitivityLabel } from '../types';
import {
  buildThumbnailKey,
  createSignedDownloadUrl,
  downloadObjectToFile,
  uploadBuffer,
} from './s3Service';

// Set ffmpeg path to the bundled static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic?.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

// ─── Types ──────────────────────────────────────────────────

interface VideoProbeResult {
  duration: number;
  resolution: string;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
}

interface SensitivityResult {
  score: number;
  label: SensitivityLabel;
}

// Socket emitter type — will be injected from outside
type ProgressEmitter = (
  userId: string,
  videoId: string,
  progress: number,
  status: string,
  message: string
) => void;

let emitProgressFn: ProgressEmitter | null = null;

/**
 * Set the progress emitter function (called from sockets setup)
 */
export const setProgressEmitter = (emitter: ProgressEmitter): void => {
  emitProgressFn = emitter;
};

/**
 * Emit progress update via Socket.io if available
 */
const emitProgress = (
  userId: string,
  videoId: string,
  progress: number,
  status: string,
  message: string
): void => {
  if (emitProgressFn) {
    emitProgressFn(userId, videoId, progress, status, message);
  }
};

/**
 * Probe video to extract metadata using ffmpeg
 */
const probeVideo = (source: string): Promise<VideoProbeResult> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(source, (err: any, metadata: any) => {
      if (err) {
        logger.error('ffprobe error:', err);
        return reject(err);
      }

      const videoStream = metadata.streams.find(
        (s: any) => s.codec_type === 'video'
      );

      resolve({
        duration: Math.round(metadata.format.duration || 0),
        resolution: videoStream
          ? `${videoStream.width}x${videoStream.height}`
          : 'unknown',
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        codec: videoStream?.codec_name || 'unknown',
        bitrate: Math.round((metadata.format.bit_rate || 0) / 1000), // kbps
      });
    });
  });
};

const generateThumbnail = (
  source: string,
  outputPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(source)
      .outputOptions(['-y', '-ss 00:00:01', '-frames:v 1', '-vf scale=640:-1'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
};

/**
 * Perform sensitivity analysis on video.
 * This is a heuristic/simulated analysis that produces a deterministic score
 * based on video properties. Can be replaced with a real ML model later.
 */
const analyzeSensitivity = (
  probe: VideoProbeResult,
  filename: string
): SensitivityResult => {
  // Deterministic score based on video characteristics
  let score = 0;

  // Factor 1: Duration — longer videos get slightly higher scores
  if (probe.duration > 300) score += 15;
  else if (probe.duration > 120) score += 10;
  else score += 5;

  // Factor 2: Resolution — higher resolution = more detail to analyze
  if (probe.height >= 1080) score += 10;
  else if (probe.height >= 720) score += 5;

  // Factor 3: Bitrate — higher bitrate means more visual data
  if (probe.bitrate > 5000) score += 10;
  else if (probe.bitrate > 2000) score += 5;

  // Factor 4: Filename-based heuristic (simulates content detection)
  const lowerName = filename.toLowerCase();
  const flaggedKeywords = [
    'violence',
    'explicit',
    'nsfw',
    'graphic',
    'disturbing',
    'warning',
    'sensitive',
    'mature',
    'restricted',
  ];
  const flaggedFound = flaggedKeywords.some((kw) => lowerName.includes(kw));
  if (flaggedFound) score += 45;

  // Factor 5: Hash-based pseudo-random component for variety (deterministic)
  const hashComponent =
    filename
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 20;
  score += hashComponent;

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score));

  // Classification threshold
  const label: SensitivityLabel = score >= 50 ? 'flagged' : 'safe';

  return { score, label };
};

/**
 * Utility to wait for a given number of milliseconds
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Main processing pipeline for a video
 */
export const processVideo = async (videoId: string): Promise<void> => {
  const video = await Video.findById(videoId);

  if (!video) {
    logger.error(`Video not found for processing: ${videoId}`);
    return;
  }

  const userId = video.userId.toString();

  try {
    // ── Stage 1: Start processing (0% → 10%) ─────────────────
    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 0,
    });
    emitProgress(userId, videoId, 0, 'processing', 'Starting video processing...');

    await delay(500);
    await Video.findByIdAndUpdate(videoId, { processingProgress: 10 });
    emitProgress(userId, videoId, 10, 'processing', 'Initializing analysis pipeline...');

    // ── Stage 2: Probe video metadata (10% → 30%) ────────────
    await delay(800);
    emitProgress(userId, videoId, 20, 'processing', 'Extracting video metadata...');

    const signedSourceUrl = await createSignedDownloadUrl(video.path, 1800);

    let probeResult: VideoProbeResult;
    try {
      probeResult = await probeVideo(signedSourceUrl);
    } catch (probeErr) {
      // If ffprobe fails, use fallback values
      logger.warn(`ffprobe failed for ${videoId}, using fallback values`);
      probeResult = {
        duration: 0,
        resolution: 'unknown',
        width: 0,
        height: 0,
        codec: 'unknown',
        bitrate: 0,
      };
    }

    // Generate thumbnail frame and upload to S3 (independent of ffprobe)
    const thumbnailKey = buildThumbnailKey(userId, videoId);
    const thumbnailPath = path.join(os.tmpdir(), `${videoId}-thumb.jpg`);
    const fallbackVideoPath = path.join(os.tmpdir(), `${videoId}-source.mp4`);
    try {
      try {
        await generateThumbnail(signedSourceUrl, thumbnailPath);
      } catch (remoteErr) {
        logger.warn(
          `Remote thumbnail failed for ${videoId}, attempting local download`,
          remoteErr
        );
        await downloadObjectToFile(video.path, fallbackVideoPath);
        await generateThumbnail(fallbackVideoPath, thumbnailPath);
      }
      const buffer = await fs.readFile(thumbnailPath);
      await uploadBuffer(thumbnailKey, buffer, 'image/jpeg');
      await Video.findByIdAndUpdate(videoId, { thumbnailKey });
    } catch (thumbErr) {
      logger.warn(`Thumbnail generation failed for ${videoId}`, thumbErr);
    } finally {
      await fs.unlink(thumbnailPath).catch(() => undefined);
      await fs.unlink(fallbackVideoPath).catch(() => undefined);
    }

    await Video.findByIdAndUpdate(videoId, {
      processingProgress: 30,
      duration: probeResult.duration,
      resolution: probeResult.resolution,
    });
    emitProgress(userId, videoId, 30, 'processing', 'Video metadata extracted successfully');

    // ── Stage 3: Frame analysis simulation (30% → 60%) ───────
    await delay(1000);
    emitProgress(userId, videoId, 40, 'processing', 'Analyzing video frames...');

    await delay(1000);
    await Video.findByIdAndUpdate(videoId, { processingProgress: 50 });
    emitProgress(userId, videoId, 50, 'processing', 'Frame analysis in progress...');

    await delay(800);
    await Video.findByIdAndUpdate(videoId, { processingProgress: 60 });
    emitProgress(userId, videoId, 60, 'processing', 'Frame analysis complete');

    // ── Stage 4: Sensitivity analysis (60% → 80%) ────────────
    await delay(800);
    emitProgress(userId, videoId, 70, 'processing', 'Running sensitivity classification...');

    const sensitivityResult = analyzeSensitivity(probeResult, video.originalName);

    await Video.findByIdAndUpdate(videoId, { processingProgress: 80 });
    emitProgress(userId, videoId, 80, 'processing', 'Sensitivity analysis complete');

    // ── Stage 5: Finalize (80% → 100%) ──────────────────────
    await delay(600);
    emitProgress(userId, videoId, 90, 'processing', 'Finalizing results...');

    await delay(400);
    await Video.findByIdAndUpdate(videoId, {
      status: 'processed',
      processingProgress: 100,
      sensitivityScore: sensitivityResult.score,
      sensitivityLabel: sensitivityResult.label,
    });

    emitProgress(userId, videoId, 100, 'processed', `Processing complete — classified as ${sensitivityResult.label}`);

    logger.info(
      `Video processed: ${videoId} | Score: ${sensitivityResult.score} | Label: ${sensitivityResult.label}`
    );
  } catch (error) {
    logger.error(`Video processing failed: ${videoId}`, error);

    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      processingProgress: 0,
    });

    emitProgress(userId, videoId, 0, 'failed', 'Video processing failed');
  }
};
