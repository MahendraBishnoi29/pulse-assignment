import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import { setProgressEmitter } from '../services/processingService';
import logger from '../utils/logger';
import { JwtPayload } from '../types';

let io: SocketIOServer | null = null;

/**
 * Emit processing progress to a specific user's room
 */
const emitProgress = (
  userId: string,
  videoId: string,
  progress: number,
  status: string,
  message: string
): void => {
  if (!io) return;

  io.to(`user:${userId}`).emit('processing:progress', {
    videoId,
    progress,
    status,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Set up Socket.io server with JWT authentication
 */
export const setupSocket = (socketIO: SocketIOServer): void => {
  io = socketIO;

  // Register the progress emitter with the processing service
  setProgressEmitter(emitProgress);

  // ── Authentication middleware ─────────────────────────────
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    const userRoom = `user:${user.userId}`;

    // Join user-specific room for targeted progress updates
    socket.join(userRoom);
    logger.info(`Socket connected: ${socket.id} | User: ${user.email} | Room: ${userRoom}`);

    // Handle explicit room join requests
    socket.on('join:room', (roomId: string) => {
      socket.join(roomId);
      logger.debug(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error(`Socket error: ${socket.id}`, error);
    });
  });

  logger.info('Socket.io server initialized');
};

/**
 * Get the Socket.io server instance
 */
export const getIO = (): SocketIOServer | null => {
  return io;
};
