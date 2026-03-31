import { Router } from 'express';
import * as videoController from '../controllers/videoController';
import { authenticate, authorize } from '../middlewares/auth';
import upload from '../middlewares/upload';

const router = Router();

// All video routes require authentication
router.use(authenticate);

// POST /api/videos — Upload video (editor, admin only)
router.post(
  '/',
  authorize('editor', 'admin'),
  upload.single('video'),
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
