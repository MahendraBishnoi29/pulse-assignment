import { Router } from 'express';
import * as videoController from '../controllers/videoController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// All video routes require authentication
router.use(authenticate);

// POST /api/videos/upload-url — Generate signed upload URL (editor, admin only)
router.post(
  '/upload-url',
  authorize('editor', 'admin'),
  videoController.getUploadUrl
);

// POST /api/videos — Save uploaded metadata (editor, admin only)
router.post(
  '/',
  authorize('editor', 'admin'),
  videoController.uploadVideo
);

// GET /api/videos — List videos (all roles)
router.get('/', videoController.getVideos);

// GET /api/videos/:id — Get single video (all roles)
router.get('/:id', videoController.getVideo);

// GET /api/videos/:id/stream — Stream video (all roles)
router.get('/:id/stream', videoController.streamVideo);

// DELETE /api/videos/:id — Delete video (editor owns, admin any)
router.delete(
  '/:id',
  authorize('editor', 'admin'),
  videoController.deleteVideo
);

export default router;
