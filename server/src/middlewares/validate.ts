import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import AppError from '../utils/AppError';

/**
 * Validate required fields in request body.
 * Returns a middleware that checks if all specified fields are present and non-empty.
 */
export const validateBody = (...requiredFields: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = req.body[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return next(
        new AppError(
          `Missing required fields: ${missingFields.join(', ')}`,
          400
        )
      );
    }

    next();
  };
};

/**
 * Validate email format
 */
export const validateEmail = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const { email } = req.body;

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return next(new AppError('Please provide a valid email address.', 400));
  }

  next();
};

/**
 * Validate password strength
 */
export const validatePassword = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const { password } = req.body;

  if (password && password.length < 6) {
    return next(
      new AppError('Password must be at least 6 characters long.', 400)
    );
  }

  next();
};
