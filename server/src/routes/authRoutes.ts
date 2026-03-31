import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import {
  validateBody,
  validateEmail,
  validatePassword,
} from '../middlewares/validate';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validateBody('email', 'password', 'name'),
  validateEmail,
  validatePassword,
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  validateBody('email', 'password'),
  authController.login
);

// GET /api/auth/me
router.get('/me', authenticate, authController.getMe);

export default router;
