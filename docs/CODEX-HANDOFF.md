# Codex Handoff

## Current Project Status

Studio Klipers is a Next.js App Router MVP scaffold for a video clipping product. The repository now has a polished dark creator-dashboard UI shell, completed Phase 2 authentication, completed Phase 3 database models, current-user scoped reads, and an updated local filesystem storage plan for development/MVP.

## Completed Phases

### Phase 0 Setup Assessment

- Confirmed the cloned repo initially contained documentation only.
- Confirmed no Next.js app, `package.json`, Tailwind config, shadcn/ui config, or Framer Motion setup existed at the start.
- Confirmed Impeccable was available locally.
- Read the required project docs before implementation.

### Phase 1 UI Shell

- Created the Next.js App Router project structure.
- Configured TypeScript, Tailwind CSS, ESLint, PostCSS, shadcn-style base setup, Framer Motion, Sonner, and Lucide Icons.
- Created landing page, login UI-only page, dashboard mock page, sidebar, topbar, dashboard cards, reusable empty/loading/error states, and reusable motion variants.
- Copied the existing brand PNG to `public/brand-mark.png`.

### Phase 1.1 Taste Polish

- Used Taste as the primary visual design layer and Impeccable-style audit as the secondary quality gate.
- Refined typography with Geist fonts.
- Improved dark charcoal control-room materiality, spacing rhythm, button states, card hierarchy, sidebar polish, topbar polish, loading state, landing composition, and dashboard cockpit feel.
- Kept neon lime `#D1FF00` as a precise signal/action color.

### Phase 2 Auth

- Implemented Auth.js / NextAuth authentication.
- Added Google OAuth and confirmed Google login works.
- Added GitHub OAuth and confirmed GitHub login works.
- Added Prisma Adapter with PostgreSQL support.
- Created Auth.js Prisma models only: `User`, `Account`, `Session`, and `VerificationToken`.
- Applied Prisma migration `init_auth` to the local PostgreSQL database.
- Confirmed the local PostgreSQL database works.
- Protected `/dashboard`.
- Confirmed unauthenticated dashboard access redirects to `/login`.
- Added real login buttons for Google and GitHub.
- Added logged-in user avatar/name in the topbar.
- Added logout and confirmed logout works.
- Preserved the approved Phase 1.1 Taste-polished UI direction.

### Phase 3 Database Models

- Added `Video`, `Clip`, and `ProcessingJob` Prisma models.
- Added `VideoStatus`, `ClipStatus`, `JobStatus`, and `JobType` enums.
- Added `User` relations for `videos`, `clips`, and `processingJobs`.
- Applied Prisma migration `add_video_clip_processing_models`.
- Confirmed `ProcessingJob.clipId` and `ProcessingJob.clip` are optional.
- Added `ProcessingJob.progress` with default `0`.
- Kept `Video.sourceKey` optional in the schema for existing rows; Phase 4A uploads now populate it.
- Created current-user scoped server data functions.
- Dashboard stats now read from PostgreSQL.
- Added `/videos` and `/clips` pages with current-user scoped database queries and empty states.
- Protected `/dashboard`, `/videos`, and `/clips`.
- Confirmed `npx prisma validate`, `npx prisma migrate dev --name add_video_clip_processing_models`, and `npx prisma generate` pass.
- Confirmed `npm run lint` and `npm run build` pass.
- Preserved the approved Phase 1.1 Taste-polished UI direction.

### Storage Plan Revision

- Cloudflare R2 is no longer required for development or MVP because it currently requires a payment method.
- Development and MVP storage direction is local filesystem storage under `uploads/`.
- Original uploaded videos should be stored under `uploads/users/{userId}/videos/{videoId}/original.mp4`.
- Generated clips should later be stored under `uploads/users/{userId}/clips/{clipId}/clip.mp4`.
- `Video.sourceKey` should be stored as `users/{userId}/videos/{videoId}/original.mp4`.
- `Clip.outputKey` should later be stored as `users/{userId}/clips/{clipId}/clip.mp4`.
- Database records must store controlled relative keys without the `uploads/` root, not absolute filesystem paths.
- File access must always go through protected API routes that verify the session `userId` and record ownership.
- Do not expose `uploads/` as public static files.
- `uploads/` is present in `.gitignore`.
- Cloudflare R2 is optional future production storage only. Production can later use VPS local disk or MinIO if needed.
- No app code was changed for this storage-plan revision.

### Phase 4A Local MP4 Upload

- Implemented protected local MP4 upload for development/MVP.
- Added upload progress and 100 MB client/server validation.
- Saved original files under `uploads/users/{userId}/videos/{videoId}/original.mp4`.
- Stored `Video.sourceKey` as `users/{userId}/videos/{videoId}/original.mp4`.
- Saved `Video` metadata to PostgreSQL.
- Added `/videos/[id]` detail page with protected local video preview.
- Added `/api/videos/[id]/stream` with session, ownership, source key, path containment, file existence, and Range request checks.
- Linked upload CTAs and video list rows to the new flow.
- Did not add Cloudflare R2, R2 SDK packages, R2 environment variables, FFmpeg, clip creation, or later-phase features.

### Phase 5 Clip Job Creation

- Upgraded `/videos/[id]` into a clipper workspace.
- Added protected local video player controls for setting start and end times.
- Added clip title, start time, end time, Set Start Here, Set End Here, Preview Selection, and Create Clip controls.
- Added protected `POST /api/videos/[id]/clips`.
- Server-side validation is the source of truth for finite start/end values, `start >= 0`, `end > start`, 3 second minimum duration, 300 second maximum duration, fallback/capped clip title, and optional source duration limits.
- The clip creation route queries the video by `{ id, userId }` before creating records.
- Created `Clip` records with `status: PENDING`.
- Created `ProcessingJob` records with `type: CREATE_CLIP` and `status: PENDING`.
- Listed clips created from the current video below the player with status badges.
- `/clips` lists the new pending clips through existing current-user scoped reads.
- Did not create `/clips/[id]` because Phase 5 does not require it.
- Did not implement FFmpeg, actual cutting, `outputKey` generation, processing worker, subtitles, gameplay + facecam, payment, AI, social features, or public sharing.

### Phase 6 Local FFmpeg Worker

- Added local one-job FFmpeg worker script at `workers/clip-worker.ts`.
- Added `npm run worker:clips`.
- Worker finds the oldest `PENDING` `ProcessingJob` with `type: CREATE_CLIP`.
- Worker claims the job and related clip as `PROCESSING`.
- Worker safely resolves `Video.sourceKey` inside `uploads/`.
- Worker derives `Clip.outputKey` as `users/{userId}/clips/{clipId}/clip.mp4`.
- Worker safely resolves the output path inside `uploads/` and creates output folders as needed.
- Worker runs FFmpeg from PATH in stream-copy mode: `ffmpeg -y -ss {startSeconds} -i {sourcePath} -t {durationSeconds} -c copy {outputPath}`.
- Worker stores `Clip.outputKey`, `Clip.sizeBytes`, and marks Clip and ProcessingJob `COMPLETED` with job progress `100`.
- Worker marks Clip and ProcessingJob `FAILED` with useful `errorMessage` on failure.
- Worker deletes incomplete output files on failure.
- Worker processes exactly one job per run and exits.
- Added shared local storage key helpers in `server/storage.ts`.
- Did not add Cloudflare R2, R2 SDK packages, Redis, BullMQ, cron, daemon, background queue service, subtitles, gameplay + facecam, payment, AI, social features, public sharing, or Phase 7 UI.

## Confirmed Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Lucide Icons
- Framer Motion
- Sonner
- Auth.js / NextAuth
- Google OAuth
- GitHub OAuth
- Prisma
- PostgreSQL
- ESLint
- Local filesystem storage for development/MVP

## Important Design Rules

- Use Taste as the primary visual design layer for UI polish.
- Use Impeccable-style audit as the secondary quality gate.
- Keep the dark charcoal + neon lime palette.
- Neon lime should be used for primary actions, active state, progress, focus, and success signals only.
- The UI should feel like a premium creator control room: cinematic but clean, sharp hierarchy, confident spacing, modern creator SaaS/gaming influence, not childish.
- Avoid generic AI SaaS patterns, clutter, excessive glow, too many gradients, decorative motion, and random accent colors.
- Keep Lucide Icons unless explicitly told otherwise.

## Files Created Or Changed So Far

- `.gitignore`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `next-env.d.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `eslint.config.mjs`
- `components.json`
- `app/layout.tsx`
- `app/globals.css`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/dashboard/page.tsx`
- `app/upload/page.tsx`
- `app/videos/page.tsx`
- `app/videos/[id]/page.tsx`
- `app/clips/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/upload/route.ts`
- `app/api/videos/[id]/clips/route.ts`
- `app/api/videos/[id]/stream/route.ts`
- `proxy.ts`
- `app/loading.tsx`
- `app/error.tsx`
- `app/not-found.tsx`
- `components/auth/*`
- `components/upload/*`
- `components/videos/*`
- `components/ui/*`
- `components/layout/*`
- `components/dashboard/*`
- `components/shared/*`
- `lib/auth.ts`
- `lib/prisma.ts`
- `lib/utils.ts`
- `lib/motion.ts`
- `server/current-user.ts`
- `server/dashboard.ts`
- `server/upload.ts`
- `server/clip-jobs.ts`
- `server/clip-processing.ts`
- `server/storage.ts`
- `server/videos.ts`
- `server/video-detail.ts`
- `server/clips.ts`
- `workers/clip-worker.ts`
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `types/next-auth.d.ts`
- `public/brand-mark.png`
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CODEX-HANDOFF.md`
- `docs/CODEX-PROMPTS.md`
- `docs/QA-CHECKLIST.md`
- `docs/ROADMAP.md`
- `docs/SETUP.md`

## What Must NOT Be Changed

- Do not delete or overwrite existing documentation files.
- Do not remove `README.md`, `AGENTS.md`, `IMPECCABLE.md`, `.env.example`, or `docs/`.
- Do not use Supabase.
- Do not redo Phase 1, Phase 2, Phase 3, Phase 4A, Phase 5, or Phase 6.
- Do not reimplement upload/local storage, clip job creation, local worker processing, or implement Cloudflare R2, subtitles, payment, AI features, social feed, likes/comments, public profiles, team workspace, YouTube downloader, TikTok integration, or complex timeline editing outside the roadmap phase.
- Do not add Cloudflare R2 SDK packages or R2 environment variables for the MVP.
- Do not expose `uploads/` as public static files.
- Do not move to Phase 7 or later implementation unless the user explicitly requests implementation.
- Do not switch from Lucide Icons unless explicitly approved.

## Next Phase

Phase 6 local FFmpeg worker processing is complete. The next phase, when explicitly requested, is Phase 7 clip preview and download.

Completed Phase 4A storage details:

- Do not use Cloudflare R2 for MVP.
- Do not add R2 SDK packages.
- Do not add R2 environment variables.
- Store original source videos under `uploads/users/{userId}/videos/{videoId}/original.mp4`.
- Store generated clips later under `uploads/users/{userId}/clips/{clipId}/clip.mp4`.
- Save uploaded video metadata to PostgreSQL using the existing `Video` model.
- Store `Video.sourceKey` as `users/{userId}/videos/{videoId}/original.mp4`.
- Store controlled relative keys in the database without the `uploads/` root, not absolute filesystem paths.
- Use current-user scoped storage keys.
- Keep all uploaded video data filtered by `userId`.
- Serve previews/downloads through protected API routes that verify session `userId` and record ownership.
- Do not expose `uploads/` as public static files.
- Keep the UI consistent with the approved Phase 1.1 design.

Cloudflare R2 is optional future production storage only. Do not implement subtitles, payment, AI, social features, R2 SDK/env configuration, or later-phase features before their roadmap phase.

## Exact Next Prompt For Fresh Codex Session

```text
Read AGENTS.md, IMPECCABLE.md, docs/DESIGN-SYSTEM.md, docs/IMPECCABLE-STYLE.md, docs/CODEX-PROMPTS.md, docs/ROADMAP.md, docs/ARCHITECTURE.md, docs/QA-CHECKLIST.md, and docs/CODEX-HANDOFF.md.

Use Taste as the primary visual design taste layer and Impeccable-style audit as the secondary quality gate.

Do not redo Phase 1 or Phase 2.

Do not redo Phase 3.

Do not redo Phase 4A.

Do not redo Phase 5.

Do not redo Phase 6.

Continue with Phase 7 only if the user explicitly requests implementation: clip preview and download for completed local clips.

Before editing, explain:
1. completed clip preview/download route approach,
2. how protected routes verify current user and clip ownership,
3. how `Clip.outputKey` is resolved safely inside `uploads/`,
4. UI states for PENDING, PROCESSING, COMPLETED, and FAILED clips,
5. polling or refresh approach,
6. risks or blockers.

Use this original video path shape: uploads/users/{userId}/videos/{videoId}/original.mp4
Use this Video.sourceKey shape: users/{userId}/videos/{videoId}/original.mp4
Use this future clip path shape: uploads/users/{userId}/clips/{clipId}/clip.mp4
Use this future Clip.outputKey shape: users/{userId}/clips/{clipId}/clip.mp4

Do not implement Cloudflare R2, add R2 SDK packages, add R2 environment variables, subtitles, payment, AI, social features, public sharing, or any later roadmap phase.
```

## Known Issues

- `npm audit --omit=dev` reports two moderate warnings inside Next's nested PostCSS dependency. The suggested forced fix would make a breaking Next version change, so it has not been applied.

## Commands Verified

- `npm run lint` passes.
- `npm run build` passes.
- `npx prisma validate` passes.
- `npx prisma migrate dev --name add_video_clip_processing_models` passes.
- `npx prisma generate` passes.
- Prisma migration `init_auth` has been applied.
- Prisma migration `add_video_clip_processing_models` has been applied.
- Google OAuth works.
- GitHub OAuth works.
- `/dashboard` protection works.
- `/videos` protection works.
- `/clips` protection works.
- Dashboard stats read from PostgreSQL.
- `/videos` and `/clips` use current-user scoped database queries.
- Logout works.
