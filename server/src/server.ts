import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config';
import connectDB from './config/db';
import { setupSocket } from './sockets';
import logger from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // ── Connect to MongoDB ────────────────────────────────────
    await connectDB();

    // ── Create HTTP server ────────────────────────────────────
    const server = http.createServer(app);

    // ── Attach Socket.io ──────────────────────────────────────
    const io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    setupSocket(io);

    // ── Start listening ───────────────────────────────────────
    server.listen(config.PORT, () => {
      logger.info(`🚀 Pulse server running on port ${config.PORT}`);
      logger.info(`📡 Socket.io ready`);
      logger.info(`🔗 Health check: http://localhost:${config.PORT}/api/health`);
    });

    // ── Graceful shutdown ─────────────────────────────────────
    const shutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // ── Unhandled rejection / exception handlers ─────────────
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
