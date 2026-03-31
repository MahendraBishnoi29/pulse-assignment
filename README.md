# Pulse

A full-stack video processing, analysis, and streaming platform with direct-to-S3 uploads, secure playback, and automated thumbnail generation.

Pulse is a multi-tenant application designed for secure video ingestion, automated content sensitivity analysis, and fast streaming. The frontend uploads directly to S3 via signed URLs, the backend manages metadata and processing, and the UI shows real-time progress through Socket.io updates.

Highlights

- Direct-to-S3 uploads with signed URLs
- Secure streaming via signed redirects
- Automatic thumbnail generation with FFmpeg
- Real-time processing progress
- Multi-tenant RBAC with editor and admin roles

## Table of Contents

1. Architecture Overview
2. Key Design Decisions
3. Feature Tour
4. API Documentation
5. Installation and Setup
6. Operations Notes
7. Roadmap

## Architecture Overview

Pulse follows a client-server architecture with direct-to-S3 uploads and signed playback URLs.

Flow

```text
[ React Frontend ]
       |
       | 1) Request signed upload URL
       v
[ Express 5 API ] -----------------------------.
       |                                       |
       | 2) Signed PUT URL                      |
       v                                       |
[ Browser PUT -> S3 (videos/) ]                |
       |                                       |
       | 3) Save metadata + start processing   |
       v                                       |
[ MongoDB ] <---- Processing Worker ----> [ FFmpeg + ffprobe ]
       |                                       |
       | 4) Signed GET URL for stream          |
       '-------------------------------> [ S3 (videos/) ]
```

Core Technologies

- Frontend: React 19, TypeScript, Tailwind CSS v4, Context API, Vite, Socket.io Client
- Backend: Node.js, Express 5, Mongoose 9, Socket.io, AWS SDK v3, fluent-ffmpeg with ffmpeg-static and ffprobe-static
- Auth: JWT + bcrypt

## Key Design Decisions

Direct-to-S3 uploads with signed URLs: reduces backend bandwidth, avoids large server buffers, and keeps the API focused on auth and metadata.

Signed playback URLs: the API returns a 302 redirect to a short-lived signed S3 URL to keep buckets private while enabling secure streaming.

Server-side thumbnail generation: FFmpeg extracts a representative frame after upload, stores it in S3 under the same `videos/` prefix, and returns a signed `thumbnailUrl` for cards and poster images.

Deterministic sensitivity analysis: lightweight heuristic scoring keeps the pipeline fast today and swappable for ML later.

Real-time progress via Socket.io: processing stages emit progress events without client polling.

## Feature Tour

- Multi-tenant library with role-based access control
- Direct-to-S3 uploads with progress indicator
- Streaming via signed S3 URL redirects
- Automated thumbnail generation
- Sensitivity analysis and warning overlay
- Real-time processing progress

## API Documentation

Base URL: `http://localhost:5001/api`

Auth

| Method | Endpoint         | Description                   | Auth |
| ------ | ---------------- | ----------------------------- | ---- |
| POST   | `/auth/register` | Register a new user           | No   |
| POST   | `/auth/login`    | Authenticate and retrieve JWT | No   |
| GET    | `/auth/me`       | Retrieve active user profile  | Yes  |

Videos

| Method | Endpoint             | Description                                           | Auth |
| ------ | -------------------- | ----------------------------------------------------- | ---- |
| POST   | `/videos/upload-url` | Get a signed S3 upload URL                            | Yes  |
| POST   | `/videos`            | Save upload metadata and start processing             | Yes  |
| GET    | `/videos`            | List videos (includes signed `thumbnailUrl`)          | Yes  |
| GET    | `/videos/:id`        | Get video metadata (includes signed `thumbnailUrl`)   | Yes  |
| GET    | `/videos/:id/stream` | Redirect to a signed S3 URL for playback              | Yes  |
| DELETE | `/videos/:id`        | Delete a video and its S3 object                      | Yes  |

Notes

- `/videos/upload-url` expects `filename`, `mimetype`, and `size`
- `/videos` expects `title`, `description`, `objectKey`, `originalName`, `mimetype`, and `size`
- Signed URLs are short-lived and should not be cached

## Installation and Setup

Prerequisites

- Node.js v18+
- pnpm
- MongoDB URI (Atlas or local)
- An S3 bucket with CORS enabled

Backend

1. Install deps

```bash
cd server
npm install
```

2. Configure environment

```bash
PORT=5001
MONGO_URI=mongodb+srv://<your-cluster-url>
JWT_SECRET=super_secret_key_123
JWT_EXPIRES_IN=7d

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name

# Optional
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false
S3_UPLOAD_URL_EXPIRES_IN=900
S3_STREAM_URL_EXPIRES_IN=900
S3_THUMBNAIL_URL_EXPIRES_IN=86400
```

Note: `AWS_BUCKET_NAME` is also supported as a fallback alias.

3. Start API

```bash
npm run dev
```

Frontend

1. Install deps

```bash
cd client
pnpm install
```

2. Start client

```bash
pnpm run dev
```

Client runs at `http://localhost:5173` and the API at `http://localhost:5001`.

## Operations Notes

S3 CORS

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": [
      "ETag",
      "Accept-Ranges",
      "Content-Range",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

Bucket Policy

Grant the server IAM user access to both video and thumbnail objects:

- `arn:aws:s3:::<bucket>/videos/*`

Thumbnails are stored as `videos/{userId}/{videoId}-thumb.jpg` in the same prefix as video objects.

FFmpeg / ffprobe

This project uses `ffmpeg-static` and `ffprobe-static`. No system-level installation is required.

## Roadmap

1. HLS/DASH adaptive streaming
2. Background queue for processing (BullMQ)
3. CDN integration for global playback
4. ML-based sensitivity classification
5. Admin audit logs and activity timeline
