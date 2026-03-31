# Pulse

> **A full-stack video processing, analysis, and streaming platform.**

Pulse is a robust, multi-tenant web application designed for secure video ingestion, automated content sensitivity analysis, and optimized HTTP-range streaming. Built with a modern **React 19** frontend and an **Express 5** + **MongoDB** backend, it leverages **FFmpeg** for algorithmic video inspection and **Socket.io** for real-time processing feedback.

---

## 📑 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Assumptions & Design Decisions](#-assumptions-and-design-decisions)
3. [User Manual](#-user-manual)
4. [API Documentation](#-api-documentation)
5. [Installation & Setup](#-installation-and-setup-guide)

---

## 🏗 Architecture Overview

Pulse follows a classic Client-Server architecture enriched with bidirectional real-time communications and file-system level streaming optimizations.

### Flow Diagram

```text
[ React Frontend ]
       │
       ├─ REST API (Uploads / Auth / Metadata) ───▶ [ Express 5 Server ]
       │                                                   │
       ├─ HTTP 206 (Chunked Video Streaming) ─────▶ [ Local Disk Storage ]
       │                                                   │
       └─ WebSockets (Real-time Progress) ◀───────▶ [ FFmpeg Processing Pipeline ]
                                                           │
                                                      [ MongoDB Atlas ]
```

### Core Technologies

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Context API, Vite and Socket.io Client.
- **Backend**: Node.js, Express 5, Mongoose 9 (MongoDB), Socket.io, Multer, fluent-ffmpeg (with `ffmpeg-static`).
- **Authorization**: JSON Web Tokens (JWT) & bcrypt.

---

## 🧠 Assumptions and Design Decisions

During development, several engineering decisions were made to balance performance, scalability, and UX:

1. **Deterministic Heuristic Analysis over heavy ML**:
   - _Assumption_: Bootstrapping a full PyTorch/TensorFlow container for sensitivity analysis adds immense overhead.
   - _Decision_: Built a deterministic scoring heuristic based on video metadata (duration, resolution, bitrate) and filename keyword hashing. This satisfies the functional "Sensitivity Analysis" requirement while keeping the architecture modular. This mocked pipeline can be swapped for a real ML microservice later seamlessly.
2. **Context API over Redux**:
   - _Decision_: Kept the frontend payload minimal by using React Context. Global state strictly governs JWT persistence (`AuthContext`), WebSocket lifecycles (`SocketContext`), and local caching of video arrays (`VideoContext`).
3. **Optimized Video Streaming (HTTP 206)**:
   - _Decision_: Sending entire 500MB video buffers over standard GET requests crashes memory. Handled routing via `fs.createReadStream` utilizing `Content-Range` chunking headers to allow HTML5 browsers to buffer and scrub perfectly.
4. **Local Disk instead of S3/Cloud Storage**:
   - _Decision_: Designed entirely on `fs` local disk storage (`/server/uploads`) to align with strict "no AWS" system requirements.
5. **Real-time Pipeline Tracking**:
   - _Decision_: Used targeted Socket.io `.join("user:{id}")` rooms. When the server processes FFmpeg stages natively, it pushes progress integers directly to the user's specific sub-socket, completely eliminating heavy frontend API polling.

---

## 📖 User Manual

### Role-Based Access Control (RBAC)

When a user signs up, they are automatically granted `editor` privileges.

- **Viewers**: Can only stream and view videos within their tenant.
- **Editors**: Can upload new videos up to 500MB, edit metadata, and delete their own videos.
- **Admins**: Bypass multi-tenant restrictions and can view/delete any video on the platform.

### Standard Workflow

1. **Sign Up**: Navigate to `/register` and create an account.
2. **Dashboard**: Your video library will be empty. Click **Upload Video**.
3. **Upload**: Drag-and-drop an `MP4`, `WebM`, or `OGG` file. Add a title.
4. **Real-time Engine**: Once uploaded, the video enters a `processing` state. Standard metadata extraction and sensitivity algorithms will execute. Progress is shown in real-time.
5. **Playback**: Once `processed`, click the video card. If the heuristic engine flagged the content, you will be met with a Blur/Warning overlay. Acknowledge the warning to begin streaming the media.

---

## 🔌 API Documentation

Base URL: `http://localhost:5001/api`

### Auth Endpoints

| Method | Endpoint         | Description                   | Auth Required |
| ------ | ---------------- | ----------------------------- | ------------- |
| POST   | `/auth/register` | Register a new user           | ❌            |
| POST   | `/auth/login`    | Authenticate and retrieve JWT | ❌            |
| GET    | `/auth/me`       | Retrieve active user profile  | ✅            |

### Video Endpoints

| Method | Endpoint             | Description                            | Auth Required     |
| ------ | -------------------- | -------------------------------------- | ----------------- |
| POST   | `/videos`            | Upload a video (`multipart/form-data`) | ✅ (Editor/Admin) |
| GET    | `/videos`            | Fetch paginated/filtered library       | ✅ (All roles)    |
| GET    | `/videos/:id`        | Get single video metadata              | ✅ (All roles)    |
| GET    | `/videos/:id/stream` | HTTP 206 chunked file stream           | ✅ (All roles)    |
| DELETE | `/videos/:id`        | Deletes DB entry and local disk file   | ✅ (Editor/Admin) |

---

## 🚀 Installation and Setup Guide

### Prerequisites

- Node.js (v18 or higher)
- pnpm (for frontend packages)
- MongoDB Database URI (Atlas or Local)

### 1. Database & Environment Configuration

1. Navigate to `server/`:
   ```bash
   cd server
   ```
2. Setup environment variables by creating `.env`:
   ```bash
   PORT=5001
   MONGO_URI=mongodb+srv://<your-cluster-url>
   JWT_SECRET=super_secret_key_123
   JWT_EXPIRES_IN=7d
   ```

### 2. Start the Backend server

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (automatically handles `ffmpeg-static` injection):
   ```bash
   npm run dev
   ```
   _The server will spin up on `http://localhost:5001`. The uploads directory is auto-generated._

### 3. Start the Frontend Application

1. Open a new terminal and navigate to `client/`:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the Vite development build:
   ```bash
   pnpm run dev
   ```
   _The client will be running globally on `http://localhost:5173`._

---

## 🔮 Scalability & Future Roadmap

To pivot **Pulse** from a powerful MVP into a globally distributed infrastructure, the following scaling strategies can be implemented:

### 1. Cloud File Storage (AWS S3 / Google Cloud)

**How to implement:**
Replace the local `multer.diskStorage` engine with `multer-s3`. When the Express endpoint receives the `.mp4` payload, it streams it directly into an S3 bucket rather than saving it to the active filesystem. The MongoDB model will simply save the S3 Object URL.
_Benefit_: Unlocks infinite storage capacity, detaches storage states from the web servers allowing horizontal Node.js scaling, and secures data redundantly.

### 2. Video Compression & Transcoding (HLS/DASH)

**How to implement:**
Expand the FFmpeg processing worker (or use AWS Elastic Transcoder / MediaConvert) into a dedicated microservice. Upon upload, transcode the video into an **HLS (HTTP Live Streaming)** playlist containing `.m3u8` variant streams (1080p, 720p, 480p) instead of serving a raw static `.mp4`.
_Benefit_: Provides **Adaptive Bitrate Streaming**. The `<VideoPlayer />` component will automatically drop to 480p if the user's internet connection slows down, completely eliminating buffering stalls.

### 3. Caching Strategy (Redis)

**How to implement:**
Deploy **Redis** as an in-memory datastore. Wrap the `GET /api/videos` dashboard endpoints in a caching middleware. If the key `videos:user:{id}` exists, serve it directly from RAM; otherwise, query MongoDB and set the cache with a predefined TTL (Time To Live).
_Benefit_: Drops database load by up to **90%** during peak traffic hours, dropping API latency times to sub `10ms` for frequent dashboard refreshes.

### 4. CDN Integration (Content Delivery Network)

**How to implement:**
Hook up **Amazon CloudFront** or **Cloudflare** directly to the S3 bucket hosting the videos. Change the API to return the CDN domain URL for streaming rather than routing bytes through the Node.js Express server.
_Benefit_: A user in Tokyo will stream the video from a localized Tokyo edge-server rather than requesting data across the world, slicing video latency drastically and saving core server bandwidth costs.

---
