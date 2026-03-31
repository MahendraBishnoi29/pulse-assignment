import path from 'path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import AppError from '../utils/AppError';

const ensureS3Config = (): void => {
  const missing: string[] = [];

  if (!config.AWS_REGION) missing.push('AWS_REGION');
  if (!config.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
  if (!config.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!config.AWS_S3_BUCKET) missing.push('AWS_S3_BUCKET');

  if (missing.length > 0) {
    throw new AppError(
      `S3 configuration is missing: ${missing.join(', ')}.`,
      500
    );
  }
};

const createS3Client = (): S3Client => {
  ensureS3Config();

  return new S3Client({
    region: config.AWS_REGION,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
    endpoint: config.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: config.AWS_S3_FORCE_PATH_STYLE,
    // Prevent SDK from embedding checksum query params in presigned PUT URLs.
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
};

const sanitizeFileBaseName = (originalName: string): string => {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'video';
};

export const buildVideoObjectKey = (
  userId: string,
  originalName: string
): string => {
  const ext = path.extname(originalName).toLowerCase();
  const safeExt = ext || '.mp4';
  const base = sanitizeFileBaseName(originalName);

  return `videos/${userId}/${uuidv4()}-${base}${safeExt}`;
};

export const buildThumbnailKey = (userId: string, videoId: string): string => {
  return `videos/${userId}/${videoId}-thumb.jpg`;
};

export const createSignedUploadUrl = async (
  objectKey: string,
  mimetype: string
): Promise<{ uploadUrl: string; expiresIn: number }> => {
  const client = createS3Client();
  const command = new PutObjectCommand({
    Bucket: config.AWS_S3_BUCKET,
    Key: objectKey,
    ContentType: mimetype,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: config.S3_UPLOAD_URL_EXPIRES_IN,
  });

  return {
    uploadUrl,
    expiresIn: config.S3_UPLOAD_URL_EXPIRES_IN,
  };
};

export const createSignedDownloadUrl = async (
  objectKey: string,
  expiresIn: number = config.S3_STREAM_URL_EXPIRES_IN
): Promise<string> => {
  const client = createS3Client();
  const command = new GetObjectCommand({
    Bucket: config.AWS_S3_BUCKET,
    Key: objectKey,
  });

  return getSignedUrl(client, command, { expiresIn });
};

export const uploadBuffer = async (
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<void> => {
  const client = createS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    })
  );
};

export const downloadObjectToFile = async (
  objectKey: string,
  filePath: string
): Promise<void> => {
  const client = createS3Client();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: objectKey,
    })
  );

  if (!result.Body || typeof (result.Body as any).pipe !== 'function') {
    throw new AppError('Unable to download object from S3.', 500);
  }

  await pipeline(result.Body as NodeJS.ReadableStream, fs.createWriteStream(filePath));
};

export const assertObjectExists = async (
  objectKey: string,
  expectedSize?: number
): Promise<void> => {
  const client = createS3Client();

  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: config.AWS_S3_BUCKET,
        Key: objectKey,
      })
    );

    if (
      typeof expectedSize === 'number' &&
      typeof result.ContentLength === 'number' &&
      result.ContentLength !== expectedSize
    ) {
      throw new AppError(
        'Uploaded object size mismatch. Please retry upload.',
        400
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const s3Error = error as { name?: string; Code?: string };
    if (
      s3Error?.name === 'NotFound' ||
      s3Error?.Code === 'NotFound' ||
      s3Error?.name === 'NoSuchKey'
    ) {
      throw new AppError('Uploaded object was not found in S3.', 400);
    }

    throw new AppError('Unable to verify uploaded object in S3.', 500);
  }
};

export const deleteObject = async (objectKey: string): Promise<void> => {
  const client = createS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: objectKey,
    })
  );
};
