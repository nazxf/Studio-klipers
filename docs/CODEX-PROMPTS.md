# Codex Prompts

Use these prompts phase by phase. Do not skip phases.

## Phase 0 — Setup, Skill, and Repo Assessment

```text
Read these files first:
- AGENTS.md
- IMPECCABLE.md
- docs/DESIGN-SYSTEM.md
- docs/IMPECCABLE-STYLE.md
- docs/CODEX-PROMPTS.md
- docs/ROADMAP.md

Use Impeccable in product UI mode.
Do not edit files yet.

First, give me:
1. current repository assessment,
2. whether a Next.js app already exists,
3. whether Impeccable skill appears available,
4. packages that need to be installed for Phase 1,
5. files you plan to create or modify for Phase 1 only,
6. risks or blockers before implementation.

Rules:
- Do not implement anything yet.
- Do not start backend work.
- Do not add auth, database, upload/storage, or FFmpeg in Phase 1.
- If Impeccable is not installed, tell me to run: npx skills add pbakaus/impeccable
```

## Phase 1 — UI Shell Prompt

```text
Implement Phase 1 now.

Requirements:
- use Next.js App Router
- use TypeScript
- use Tailwind
- use shadcn/ui
- use Lucide icons
- use Framer Motion
- use Impeccable in product UI mode
- create a premium dark dashboard style using #0B0D0E and #D1FF00
- create reusable layout components
- create landing page
- create login page UI only
- create dashboard page mock
- create sidebar and topbar
- create empty states and cards
- keep design inspired by creator dashboards but original

After implementation:
- tell me what files changed
- tell me what command to run
- tell me how to test it locally
- run an Impeccable-style UI audit

Do not implement real auth, database, upload/storage, or FFmpeg yet.
```

## Mandatory UI Audit Prompt

```text
Run an Impeccable-style UI audit.

Check:
- spacing
- typography
- hierarchy
- contrast
- sidebar polish
- button consistency
- card consistency
- empty states
- loading states
- error states
- motion quality
- dashboard clarity
- visual clutter
- neon lime usage

Then polish the UI without changing the app architecture or adding new features.

If the UI looks generic, do not continue to backend work.
```

## Phase 2 — Auth Prompt

```text
Now implement Phase 2: Auth.js / NextAuth authentication.

Requirements:
- do not use Supabase
- add Auth.js / NextAuth
- add Google OAuth provider
- add GitHub OAuth provider
- add Prisma adapter
- add PostgreSQL support
- create Prisma schema for Auth.js models
- protect dashboard routes
- redirect unauthenticated users to /login
- show user avatar/name in topbar
- add logout
- keep UI consistent with existing design

Do not implement upload, storage, or FFmpeg yet.

Before editing, explain packages needed, env variables needed, files to modify, and migration steps.
```

## Phase 3 — Database Prompt

```text
Now implement Phase 3: database models for videos, clips, and processing jobs.

Requirements:
- add Video model
- add Clip model
- add ProcessingJob model
- add enums for statuses
- connect all records to userId
- create server functions for listing videos and clips for current user
- create dashboard stats from database
- update dashboard, videos page, and clips page to use real database queries
- keep empty states when there is no data

Do not implement upload/storage yet.
Do not implement FFmpeg yet.

Before editing, show the Prisma schema changes.
```

## Phase 4 - Local Filesystem Upload Prompt

```text
Now implement Phase 4: local filesystem video upload.

Requirements:
- do not use Supabase
- do not use Cloudflare R2 for MVP
- do not add R2 SDK packages
- do not add R2 environment variables
- allow MP4 upload only
- validate file type and file size
- store original video under uploads/users/{userId}/videos/{videoId}/original.mp4
- save video metadata to PostgreSQL
- store Video.sourceKey as users/{userId}/videos/{videoId}/original.mp4
- store controlled relative keys in the database without the uploads/ root, not absolute filesystem paths
- access files only through protected API routes that verify session userId and record ownership
- do not expose uploads as public static files
- after successful upload, redirect user to /videos/[id]
- show upload progress
- show loading, error, and success states
- keep UI premium and dark

Before editing, explain the local storage approach, MP4 validation, file size rules, database writes to the existing Video model, route/data protection, and risks or blockers.
```

## Phase 5 — Clip Job Prompt

```text
Now implement Phase 5: video detail page and create clip form.

Requirements:
- /videos/[id] shows video player
- show video metadata
- add start time and end time inputs
- validate that end time is greater than start time
- create Clip record with status PENDING
- create ProcessingJob record with status PENDING
- list clips created from the video
- do not run FFmpeg yet
- show status badges clearly
- use Framer Motion for subtle transitions
```

## Phase 6 — FFmpeg Worker Prompt

```text
Now implement Phase 6: FFmpeg worker for clip processing.

Requirements:
- do not run heavy FFmpeg processing in Vercel serverless
- create a worker script
- worker reads pending ProcessingJob
- reads source video from local filesystem storage
- runs FFmpeg to cut the video
- writes output clip to uploads/users/{userId}/clips/{clipId}/clip.mp4
- stores Clip.outputKey as users/{userId}/clips/{clipId}/clip.mp4, not an absolute filesystem path
- updates Clip status to COMPLETED
- updates ProcessingJob status to COMPLETED
- on error, mark Clip and ProcessingJob as FAILED
- clean temp files
- keep implementation simple for MVP
- support MP4 only

Before editing, explain how to run worker locally, required dependencies, status changes, and how to test with one uploaded video.
```

## Phase 7 — Clip Preview Prompt

```text
Now implement Phase 7: clip preview and download.

Requirements:
- /clips shows all clips for current user
- /clips/[id] shows clip preview player
- show source video link
- show start/end/duration/status
- add download button
- preview and download files only through protected API routes
- prevent users from accessing other users' clips
- add polling or refresh status for processing clips
- improve completed/failed/processing visual states
```

## Phase 8 — QA Prompt

```text
Act as QA Engineer.

Test the entire MVP flow: login with Google, login with GitHub, upload MP4, open video detail, create clip with valid start/end, reject invalid start/end, process clip with worker, preview completed clip, download completed clip, and ensure user cannot access another user's data.

Find bugs, security issues, missing states, and broken flows. Do not edit yet. Give me a bug list with severity and suggested fixes.
```

## Future Production Storage Prompt

```text
Evaluate production storage options only after the MVP local filesystem flow works.

Cloudflare R2 is optional future production storage, not required MVP storage.

Compare:
- VPS local disk
- MinIO
- Cloudflare R2 after the payment-method blocker is resolved

Do not add object storage SDK packages, object storage environment variables, or migration code unless production storage implementation is explicitly requested.
```

## Bug Fix Prompt

```text
Fix the high severity and medium severity issues only. Do not add new features. Keep the MVP stable. Do not refactor unrelated code.
```
