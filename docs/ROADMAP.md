# Studio Klipers Roadmap

Build the app phase by phase. Do not skip phases.

## Phase 1 — UI Shell and Design System

Create the visual foundation: shadcn/ui, Tailwind tokens, Framer Motion, landing page, login UI, dashboard mock, sidebar, topbar, and reusable empty/loading/error states.

Do not implement auth, database, upload/storage, or FFmpeg yet.

## Phase 2 — Authentication

Implement Auth.js / NextAuth with Google OAuth, GitHub OAuth, Prisma Adapter, PostgreSQL connection, protected dashboard routes, user avatar/name in topbar, and logout.

Do not implement upload, storage, or FFmpeg yet.

## Phase 3 — Database Models

Create Prisma models for Video, Clip, and ProcessingJob. Add status enums, connect records to userId, and update dashboard/videos/clips pages to use real database queries with empty states.

## Phase 4 - Local Filesystem Upload

Implement MP4 upload to local filesystem storage for development and MVP. Store originals under `uploads/users/{userId}/videos/{videoId}/original.mp4`, save `Video.sourceKey` as `users/{userId}/videos/{videoId}/original.mp4`, validate file type and file size, show upload progress, and redirect to the video detail page after upload.

Access to uploaded files must go through protected API routes that verify the session `userId` and record ownership. Do not expose `uploads/` as public static files.

## Phase 5 — Video Detail and Clip Job Creation

Build video detail page with video player, metadata, start/end time inputs, validation, create clip button, Clip record creation, ProcessingJob creation, and clip list for each video.

## Phase 6 — FFmpeg Worker

Create worker script that reads source videos from local filesystem storage, runs FFmpeg, writes output clips to `uploads/users/{userId}/clips/{clipId}/clip.mp4`, stores `Clip.outputKey` as `users/{userId}/clips/{clipId}/clip.mp4`, updates statuses, handles errors, and cleans temporary files.

## Phase 7 — Clip Preview and Download

Build clips page and clip detail page with preview player, metadata, download button, and processing/completed/failed states. Clip preview and download must also go through protected API routes.

## Phase 8 — QA and Deployment

Test the full flow: login, upload, video detail, create clip, process clip, preview, download, and access control. Then prepare deployment checklist.

## Future Production Storage

Cloudflare R2 is optional future production storage only, not required for the MVP. If production needs external/object storage later, evaluate VPS local disk, MinIO, or Cloudflare R2 after the payment-method blocker is resolved.
