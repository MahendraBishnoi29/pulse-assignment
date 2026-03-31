import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';
import logger from '../utils/logger';

/**
 * Global error handler middleware
 */
const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // AppError — our own known errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    const multerErr = err as any;
    switch (multerErr.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File is too large. Maximum size is 500MB.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      default:
        message = `Upload error: ${multerErr.message}`;
    }
    isOperational = true;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate value. This resource already exists.';
    isOperational = true;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID format.';
    isOperational = true;
  }

  // Log unexpected errors
  if (!isOperational) {
    logger.error('Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export default errorHandler;
