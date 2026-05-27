# Technical Architecture

## Goal

Studio Klipers is a video clipper MVP. The first production-ready version must support login, MP4 upload, video preview, start/end selection, FFmpeg processing, clip preview, and clip download.

## High-level stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- Auth: Auth.js / NextAuth with Google and GitHub OAuth
- Database: PostgreSQL with Prisma
- Storage: Cloudflare R2 using S3-compatible API
- Processing: FFmpeg worker running outside Vercel serverless
- Validation: Zod
- Forms: React Hook Form
- Optional queue later: BullMQ + Redis

## Core flow

1. User logs in with Google or GitHub.
2. User opens the protected dashboard.
3. User uploads an MP4 video.
4. App stores the source video in Cloudflare R2.
5. App saves metadata in PostgreSQL.
6. User opens the video detail page.
7. User enters start time and end time.
8. App creates a Clip record and ProcessingJob record.
9. Worker downloads source video from R2.
10. Worker runs FFmpeg to create the clip.
11. Worker uploads output clip to R2.
12. Worker updates database status.
13. User previews and downloads the completed clip.

## Recommended app structure

```text
app/
  page.tsx
  login/
  dashboard/
  upload/
  videos/
  clips/
  settings/
  api/

components/
  layout/
  dashboard/
  upload/
  videos/
  clips/
  shared/
  ui/

lib/
  auth.ts
  prisma.ts
  r2.ts
  validations.ts
  motion.ts
  utils.ts

server/
  videos.ts
  clips.ts
  jobs.ts
  storage.ts

workers/
  clip-worker.ts
  ffmpeg.ts
  queue.ts

prisma/
  schema.prisma

types/
  index.ts
```

## Database models

Minimum models:

- User
- Account
- Session
- VerificationToken
- Video
- Clip
- ProcessingJob

Suggested enums:

- VideoStatus: UPLOADED, READY, FAILED
- ClipStatus: PENDING, PROCESSING, COMPLETED, FAILED
- JobStatus: PENDING, PROCESSING, COMPLETED, FAILED
- JobType: CREATE_CLIP

## Storage keys

Use predictable user-scoped keys:

```text
users/{userId}/videos/{videoId}/original.mp4
users/{userId}/clips/{clipId}/clip.mp4
```

## Deployment recommendation

- Vercel: frontend and lightweight API routes
- Neon/Railway/Render: PostgreSQL
- Cloudflare R2: source videos and clips
- Railway/Render/VPS: FFmpeg worker
- Upstash Redis: optional queue later

## Important constraint

Do not run heavy FFmpeg processing inside Vercel serverless functions. Use a worker process on Railway, Render, or a VPS.
