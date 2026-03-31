import dotenv from 'dotenv';

dotenv.config();

const toBoolean = (value: string | undefined): boolean =>
  value === 'true' || value === '1';

const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/pulse',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AWS_REGION: process.env.AWS_REGION || '',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || '',
  AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT || '',
  AWS_S3_FORCE_PATH_STYLE: toBoolean(process.env.AWS_S3_FORCE_PATH_STYLE),
  S3_UPLOAD_URL_EXPIRES_IN: parseInt(
    process.env.S3_UPLOAD_URL_EXPIRES_IN || '900',
    10
  ),
  S3_STREAM_URL_EXPIRES_IN: parseInt(
    process.env.S3_STREAM_URL_EXPIRES_IN || '900',
    10
  ),
  S3_THUMBNAIL_URL_EXPIRES_IN: parseInt(
    process.env.S3_THUMBNAIL_URL_EXPIRES_IN || '86400',
    10
  ),
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
