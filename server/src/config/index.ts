import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists on startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/pulse',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  UPLOAD_DIR,
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  ALLOWED_MIMETYPES: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ],
};

export default config;
