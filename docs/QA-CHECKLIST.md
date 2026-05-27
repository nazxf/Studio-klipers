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

- User can login with Google.
- User can login with GitHub.
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
- Original file is stored in Cloudflare R2.
- Metadata is stored in PostgreSQL.
- User is redirected to video detail page.

## Phase 5 Clip Job

- Video detail page loads.
- Video player loads the uploaded video.
- Start time input works.
- End time input works.
- End time must be greater than start time.
- Create clip button creates a Clip record.
- ProcessingJob record is created.
- Clip starts as PENDING.

## Phase 6 Worker

- Worker can find pending jobs.
- Worker downloads source video from R2.
- Worker runs FFmpeg.
- Worker uploads output clip to R2.
- Worker updates clip status to COMPLETED.
- Worker marks failed jobs as FAILED.
- Worker stores useful error messages.
- Worker cleans temporary files.

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
- Users cannot access files belonging to other users.
- Secrets are never committed.
- `.env.local` is ignored by Git.

## Deployment readiness

- Environment variables are documented.
- Production database is configured.
- R2 bucket is configured.
- OAuth callback URLs are configured.
- Worker deployment plan is clear.
- FFmpeg exists on worker server.
