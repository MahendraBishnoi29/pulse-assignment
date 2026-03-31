import { Router } from 'express';
import authRoutes from './authRoutes';
import videoRoutes from './videoRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);

export default router;
