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
  validation.ts
  motion.ts
  utils.ts

server/
  videos.ts
  clips.ts
  clip-jobs.ts
  clip-processing.ts
  clip-files.ts
  protected-mp4-stream.ts
  storage.ts
  upload.ts
  upload-cleanup.ts
  media-toolchain.ts

workers/
  clip-worker.ts

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

Enums:

- VideoStatus: UPLOADED, READY, FAILED (uploads go directly to READY after commit + probe)
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

Protected MP4 streaming (video and clip routes) shares one helper, `server/protected-mp4-stream.ts`. The helper handles full `200`, `206` Partial Content with `Content-Range`, suffix-range (`bytes=-N`), `416` responses, and `HEAD` requests (identical headers, no body, no disk read). Auth, ownership, resolver, file-existence, exact key-shape, and `uploads/` path-safety checks remain in each route or its resolver.

## Worker reliability

FFmpeg processing runs in a local worker daemon (`workers/clip-worker.ts`), not in serverless functions. The worker uses a poll-loop pattern (250ms busy / 2s idle / 5s error backoff) with graceful SIGINT/SIGTERM shutdown.

FFmpeg is invoked via `server/clip-processing.ts` with:

- `-ss` after `-i` for frame-accurate seeking
- `libx264` veryfast CRF 20 + AAC 160k
- `+faststart` for progressive download
- `-avoid_negative_ts make_zero`
- 10-minute per-job timeout with SIGKILL escalation
- Bounded `stderr` capture for safe failure messages

Job claiming uses a Serializable-isolation transaction with `findFirst` + conditional `updateMany` and an attempts guard (`attempts < MAX_CLIP_JOB_ATTEMPTS`). `ProcessingJob` has `@@index([type, status, createdAt])` for the claim query.

## Upload pipeline

Upload uses streaming multipart parsing via `busboy` with:

- Route-level `Content-Type` validation (415 if not `multipart/form-data`)
- Route-level `Content-Length` pre-check against 100 MB limit (413 early reject)
- Streaming to a temp `.part` file under `uploads/tmp/uploads/`
- MP4 magic-byte signature check on the first 32 bytes
- `busboy` file-size limit enforcement (per-byte, no full buffering)
- Atomic rename to final path after `ffprobe` duration detection
- `Video.status` set to `READY` immediately (file is committed and probed)

Stale temp files (older than 24h) are swept automatically on first module load via `server/upload-cleanup.ts`.

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
