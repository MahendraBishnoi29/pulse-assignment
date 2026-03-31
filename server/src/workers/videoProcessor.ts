import { processVideo } from '../services/processingService';
import logger from '../utils/logger';

/**
 * Start async video processing.
 * Runs the processing pipeline in the background so the upload request
 * can return immediately.
 */
export const startProcessing = (videoId: string): void => {
  logger.info(`Starting background processing for video: ${videoId}`);

  // Run processing asynchronously — don't await
  processVideo(videoId).catch((error) => {
    logger.error(`Background processing error for video ${videoId}:`, error);
  });
};
