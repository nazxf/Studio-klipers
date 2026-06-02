# Technical Architecture

## Goal

Studio Klipers is a video clipper MVP. The first production-ready version must support login, MP4 upload, video preview, start/end selection, FFmpeg processing, clip preview, and clip download.

## High-level stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- Auth: Auth.js / NextAuth with Google and GitHub OAuth
- Database: PostgreSQL with Prisma
- Storage: local filesystem storage for development and MVP
- Processing: FFmpeg worker running outside Vercel serverless
- Validation: Zod
- Forms: React Hook Form
- Optional queue later: BullMQ + Redis

## Core flow

1. User logs in with Google or GitHub.
2. User opens the protected dashboard.
3. User uploads an MP4 video.
4. App stores the source video under `uploads/users/{userId}/videos/{videoId}/original.mp4`.
5. App saves metadata and `Video.sourceKey` as `users/{userId}/videos/{videoId}/original.mp4` in PostgreSQL.
6. User opens the video detail page.
7. User enters start time and end time.
8. App creates a Clip record and ProcessingJob record.
9. Worker reads the source video from local filesystem storage.
10. Worker runs FFmpeg to create the clip.
11. Worker writes the output clip under `uploads/users/{userId}/clips/{clipId}/clip.mp4`.
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
  storage.ts
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

## Storage

Development and MVP storage uses the local filesystem. Files live under `uploads/`, which must stay gitignored and must not be exposed as a public static directory.

Use predictable user-scoped paths and controlled relative database keys:

```text
filesystem: uploads/users/{userId}/videos/{videoId}/original.mp4
Video.sourceKey: users/{userId}/videos/{videoId}/original.mp4

filesystem: uploads/users/{userId}/clips/{clipId}/clip.mp4
Clip.outputKey: users/{userId}/clips/{clipId}/clip.mp4
```

The database stores controlled relative keys without the `uploads/` root. Never store absolute filesystem paths in database records, and never accept arbitrary filesystem paths from clients.

All file access must go through protected API routes. Those routes must verify the session `userId`, confirm ownership of the related `Video` or `Clip` record, resolve the controlled relative key on the server, and stream the file only after authorization succeeds.

## Future production storage

Cloudflare R2 is optional future production storage, not required MVP storage. If production needs non-local storage later, evaluate VPS local disk, MinIO, or Cloudflare R2 after the payment-method blocker is resolved. Do not add R2 SDKs or R2 environment variables for the MVP.

## Deployment recommendation

- Development/MVP: local Next.js app, PostgreSQL, and local filesystem uploads
- Neon/Railway/Render: PostgreSQL
- VPS local disk or MinIO: optional production storage later
- Railway/Render/VPS: FFmpeg worker with access to the chosen storage
- Upstash Redis: optional queue later

## Important constraint

Do not run heavy FFmpeg processing inside Vercel serverless functions. Use a worker process on Railway, Render, or a VPS.
