# Codex Handoff

## Current Project Status

Studio Klipers is a Next.js App Router local MVP for authenticated video clipping. The repository now has the polished dark creator-dashboard UI shell, Google/GitHub Auth.js login, PostgreSQL/Prisma models, local MP4 upload, protected video streaming, pending clip job creation, a local FFmpeg worker, protected clip output routes/UI, and Phase 7.1 hardening/security fixes.

Current working local MVP:

- Login with Google and GitHub works.
- Dashboard protection works.
- Local PostgreSQL via Laragon works.
- Local MP4 upload works.
- Video preview works through a protected stream route.
- Create pending clip works.
- `npm run worker:clips` processes one pending clip and exits.
- Clip output is saved locally under `uploads/users/{userId}/clips/{clipId}/clip.mp4`.
- Clip and processing job records become `COMPLETED`.
- Duration validation is hardened with server-side `ffprobe` duration probing on upload.
- Worker errors are sanitized before user display/storage.
- Source key shape validation is enforced for protected video streaming.

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

### Phase 7 Clip Preview And Download

- Added protected clip stream route at `/api/clips/[id]/stream`.
- Added protected clip download route at `/api/clips/[id]/download`.
- Added `/clips/[id]` detail page with protected completed-clip preview.
- Added server-side clip detail query for current-user scoped clip/source metadata.
- Added shared completed clip output resolver that verifies session user, clip ownership, `COMPLETED` status, exact output key shape, uploads path containment, and local file existence.
- Updated `/clips` list with richer status rows and completed-only Open/Preview/Download actions.
- Detail page shows clip title, status, source video link, start/end/duration, output size, preview player only when completed, download button only when completed, and failed-state messaging.
- Added lightweight refresh for pending/processing clip states.
- Did not add public sharing, R2, BullMQ/Redis, subtitles, AI, payment, social features, or worker/upload feature changes.

### Phase 7.1 Hardening And Security Fixes

- Upload now probes MP4 duration server-side with `ffprobe` and stores `Video.durationSeconds`.
- Upload fails with a safe user-facing error if duration cannot be detected.
- Clip creation now rejects source videos with missing duration metadata.
- Clip creation still rejects ranges whose end time exceeds the server-stored source video duration.
- Worker errors are sanitized so absolute local paths such as `D:\...` are not rendered to users.
- Raw worker failure details are logged server-side only.
- Existing failed clip/job errors are sanitized when read for the clip detail page.
- Protected video stream route now verifies `Video.sourceKey` exactly matches `users/{userId}/videos/{videoId}/original.mp4`.
- Protected clip stream/download routes already verify exact `Clip.outputKey` shape as `users/{userId}/clips/{clipId}/clip.mp4`.
- `.env.example` labels R2/Redis variables as future optional production storage/queue, not active MVP requirements.
- `docs/QA-CHECKLIST.md` now says OAuth should be tested through the real client buttons or CSRF-backed sign-in flow, not direct GET sign-in endpoints.

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
- `app/clips/[id]/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/upload/route.ts`
- `app/api/clips/[id]/download/route.ts`
- `app/api/clips/[id]/stream/route.ts`
- `app/api/videos/[id]/clips/route.ts`
- `app/api/videos/[id]/stream/route.ts`
- `proxy.ts`
- `app/loading.tsx`
- `app/error.tsx`
- `app/not-found.tsx`
- `components/auth/*`
- `components/clips/*`
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
- `server/clip-errors.ts`
- `server/clip-files.ts`
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
- Do not commit `.env`.
- Do not commit `.env.local`.
- Do not commit `uploads/`.
- Do not use Supabase.
- Do not redo Phase 1, Phase 1.1, Phase 2, Phase 3, Phase 4A, Phase 5, Phase 6, Phase 7, or Phase 7.1.
- Do not reimplement upload/local storage, clip job creation, local worker processing, or implement Cloudflare R2, subtitles, payment, AI features, social feed, likes/comments, public profiles, team workspace, YouTube downloader, TikTok integration, or complex timeline editing outside the roadmap phase.
- Do not add Cloudflare R2 SDK packages or make R2 an MVP requirement.
- Do not expose `uploads/` as public static files.
- Do not add new features until the final local MVP QA pass is complete.
- Do not switch from Lucide Icons unless explicitly approved.
- Keep Taste as the primary design taste layer and Impeccable-style audit as the secondary quality gate.
- Keep the dark charcoal + neon lime UI direction.

## Next Step

Start a new Codex session and run a final QA pass for the local MVP flow. Do not add new features until QA is complete.

Current local storage details:

- Do not use Cloudflare R2 for MVP.
- Do not add R2 SDK packages.
- Store original source videos under `uploads/users/{userId}/videos/{videoId}/original.mp4`.
- Store generated clips under `uploads/users/{userId}/clips/{clipId}/clip.mp4`.
- Save uploaded video metadata to PostgreSQL using the existing `Video` model.
- Store `Video.sourceKey` as `users/{userId}/videos/{videoId}/original.mp4`.
- Store `Clip.outputKey` as `users/{userId}/clips/{clipId}/clip.mp4`.
- Store controlled relative keys in the database without the `uploads/` root, not absolute filesystem paths.
- Use current-user scoped storage keys.
- Keep all uploaded video data filtered by `userId`.
- Serve previews/downloads through protected API routes that verify session `userId` and record ownership.
- Do not expose `uploads/` as public static files.
- `uploads/` is ignored by Git.
- Keep the UI consistent with the approved Phase 1.1 design.

Cloudflare R2 is optional future production storage only. Do not implement subtitles, payment, AI, social features, R2 SDK/env configuration, or later-phase features before their roadmap phase.

## Exact Next Prompt For Fresh Codex Session

```text
Read AGENTS.md, IMPECCABLE.md, docs/DESIGN-SYSTEM.md, docs/IMPECCABLE-STYLE.md, docs/CODEX-PROMPTS.md, docs/ROADMAP.md, docs/ARCHITECTURE.md, docs/QA-CHECKLIST.md, and docs/CODEX-HANDOFF.md.

Use Taste as the primary visual design taste layer and Impeccable-style audit as the secondary quality gate.

Do not redo Phase 1, Phase 1.1, Phase 2, Phase 3, Phase 4A, Phase 5, Phase 6, Phase 7, or Phase 7.1.

Act as QA Engineer.

Run the final local MVP QA pass only:
- login with Google from the real `/login` client button flow,
- login with GitHub from the real `/login` client button flow,
- logout,
- dashboard protection,
- upload valid MP4,
- reject non-MP4,
- reject oversized file,
- confirm `Video.durationSeconds` is stored after upload,
- video detail protected preview,
- create valid clip,
- reject invalid clip ranges,
- reject clip ranges beyond source duration,
- run `npm run worker:clips`,
- preview completed clip,
- download completed clip,
- check pending/processing/failed states,
- check user ownership protections,
- check protected video stream route,
- check protected clip stream route,
- check protected clip download route,
- confirm `uploads/`, `.env`, and `.env.local` are ignored by Git.

Do not edit files unless explicitly asked after reporting QA findings.

Use this original video path shape: uploads/users/{userId}/videos/{videoId}/original.mp4
Use this Video.sourceKey shape: users/{userId}/videos/{videoId}/original.mp4
Use this clip path shape: uploads/users/{userId}/clips/{clipId}/clip.mp4
Use this Clip.outputKey shape: users/{userId}/clips/{clipId}/clip.mp4

Do not implement Cloudflare R2, add R2 SDK packages, add R2 environment variables, subtitles, payment, AI, social features, public sharing, or any later roadmap phase.
```

## Known Issues

- `npm audit --omit=dev` reports two moderate warnings inside Next's nested PostCSS dependency. The suggested forced fix would make a breaking Next version change, so it has not been applied.
- `/videos/not-real` and `/clips/not-real` may render the not-found UI with HTTP `200` in production because of Next streaming behavior. No protected data leaks. Route-level owned-record prechecks are present, but the streamed shell can keep the status at `200`.

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
- Local MP4 upload works and stores server-detected `Video.durationSeconds` when `ffprobe` is available through the local FFmpeg install.
- Protected video stream route verifies exact `Video.sourceKey` shape before resolving local files.
- Protected clip stream route works for completed clips only.
- Protected clip download route works for completed clips only.
- Completed clip output is stored locally under `uploads/users/{userId}/clips/{clipId}/clip.mp4`.
- Worker errors are sanitized before user display/storage.
- Clip range validation rejects missing duration metadata and ranges beyond source duration.
