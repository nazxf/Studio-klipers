# QA Checklist

Use this checklist before moving between major phases and before deployment.

## Phase 1 UI

- Landing page loads.
- Login page UI loads.
- Dashboard shell loads.
- Sidebar works visually.
- Topbar works visually.
- Cards have consistent spacing.
- Dark theme is consistent.
- Neon lime is used sparingly.
- Framer Motion animations are subtle.
- Empty states are helpful.

## Phase 2 Auth

- User can login with Google from the `/login` client button flow.
- User can login with GitHub from the `/login` client button flow.
- OAuth provider tests use the real client buttons or CSRF-backed sign-in flow, not direct GET requests to provider sign-in endpoints.
- User can logout.
- Dashboard is protected.
- Unauthenticated users are redirected to login.
- User avatar/name displays correctly.
- Auth errors show a useful message.

## Phase 3 Database

- Prisma migration runs.
- User records are stored.
- Video, Clip, and ProcessingJob models exist.
- All app data is scoped by userId.
- Empty database states display correctly.

## Phase 4 Upload

- User can upload valid MP4.
- Invalid file type is rejected.
- Oversized file is rejected.
- Upload progress is visible.
- Original file is stored under `uploads/users/{userId}/videos/{videoId}/original.mp4`.
- Database stores `Video.sourceKey` as `users/{userId}/videos/{videoId}/original.mp4`, not an absolute filesystem path.
- Database stores `Video.durationSeconds` from server-side MP4 metadata probing.
- Upload fails with a safe error if server-side duration metadata cannot be detected.
- Metadata is stored in PostgreSQL.
- User is redirected to video detail page.

## Phase 5 Clip Job

- Video detail page loads.
- Video player loads the uploaded video.
- Start time input works.
- End time input works.
- Set Start Here captures the current local video time.
- Set End Here captures the current local video time.
- Preview Selection plays only the selected local video range.
- End time must be greater than start time.
- Start time must be greater than or equal to 0.
- Clip duration must be at least 3 seconds.
- Clip duration must be 5 minutes or shorter.
- Clip end time must not exceed server-stored source video duration.
- Clip creation is rejected when the source video has no server-stored duration metadata.
- NaN and infinity values are rejected.
- Create clip button creates a Clip record.
- ProcessingJob record is created.
- Clip starts as PENDING.
- ProcessingJob starts as PENDING with type CREATE_CLIP.
- Clip title is trimmed, capped, and given a fallback when empty.
- Clips created from the video appear below the player.

## Phase 6 Worker

- `npm run worker:clips` runs the local worker.
- Worker processes exactly one pending job and exits.
- Worker can find pending jobs.
- Worker reads source video from local filesystem storage.
- Worker runs FFmpeg.
- Worker writes output clip under `uploads/users/{userId}/clips/{clipId}/clip.mp4`.
- Worker stores `Clip.outputKey` as `users/{userId}/clips/{clipId}/clip.mp4`, not an absolute filesystem path.
- Worker updates clip status to COMPLETED.
- Worker marks failed jobs as FAILED.
- Worker stores useful error messages.
- Worker cleans temporary files.
- Worker deletes incomplete output files on failure.
- Worker does not require Redis, BullMQ, R2, cron, daemon, or a background queue service.

## Phase 7 Clip Result

- Clips page lists current user's clips.
- Clip detail page loads.
- Completed clip can be previewed.
- Completed clip can be downloaded.
- Processing state is clear.
- Failed state is clear.
- User cannot access another user's clip.

## Security

- Dashboard routes are protected.
- API routes check session.
- Database queries filter by userId.
- File preview and download routes verify session `userId` and record ownership.
- Video stream routes verify the exact expected `Video.sourceKey` shape before resolving local files.
- Users cannot access files belonging to other users.
- `uploads/` is not exposed as public static files.
- Secrets are never committed.
- `.env.local` is ignored by Git.
- `uploads/` is ignored by Git.

## Deployment readiness

- Environment variables are documented.
- Production database is configured.
- Storage plan is chosen for production if needed: VPS local disk, MinIO, or optional Cloudflare R2 after the payment-method blocker is resolved.
- OAuth callback URLs are configured.
- Worker deployment plan is clear.
- FFmpeg exists on worker server.
