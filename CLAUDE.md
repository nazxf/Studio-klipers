# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Studio Klipers is a local-first MVP for authenticated MP4 clipping: a signed-in user uploads an MP4, previews it through protected routes, picks a start/end range, queues a clip job, an FFmpeg worker renders it, then the user previews and downloads the result. Storage is the **local filesystem** under `uploads/` (no cloud storage in MVP). Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v3 + shadcn/ui-style primitives, Framer Motion, Auth.js/NextAuth (Google + GitHub), Prisma + PostgreSQL, FFmpeg.

## Commands

```bash
npm run dev                 # Next dev server (also auto-starts the embedded clip worker — see below)
npm run lint                # eslint .
npm run build               # next build
npm run test                # vitest run (all tests)
npm run test:watch          # vitest watch
npx vitest run tests/validation.test.ts        # single test file
npx vitest run -t "rejects end before start"   # single test by name

npx prisma migrate dev      # apply migrations to local Postgres
npx prisma generate         # regenerate Prisma client (run after schema edits)
npx prisma validate

npm run check:media         # verify Node can spawn ffmpeg + ffprobe — run before testing uploads/worker
npm run worker:clips        # standalone clip worker daemon (poll loop, Ctrl+C to stop)
npm run backfill:durations  # fill Video.durationSeconds for older videos missing it
```

`tsconfig` path alias: `@/*` → repo root (also mirrored in `vitest.config.ts`).

## Architecture

### Auth & route protection (defense in depth)
- `proxy.ts` is the Next.js middleware (note: Next 16 names it `proxy.ts`, not `middleware.ts`). It re-exports `auth` and gates `/dashboard`, `/upload`, `/videos`, `/clips`, and the matching `/api/*` route prefixes via `config.matcher`. This is only the coarse gate.
- **Every** page and API route ALSO calls `requireCurrentUser()` (`server/current-user.ts`) and scopes all queries by `userId`. Per-record ownership is re-checked before any file is touched. Never rely on the middleware alone.
- Auth.js config lives in `lib/auth.ts`: database session strategy, Prisma adapter, `session.user.id` injected via callback. Sign-in page is `/login`.

### Storage key convention (critical, easy to get wrong)
Files live on disk under `uploads/`, but the database stores **controlled relative keys without the `uploads/` root** — never absolute paths, never client-supplied paths.

```
disk:  uploads/users/{userId}/videos/{videoId}/original.mp4
db:    Video.sourceKey = users/{userId}/videos/{videoId}/original.mp4

disk:  uploads/users/{userId}/clips/{clipId}/clip.mp4
db:    Clip.outputKey  = users/{userId}/clips/{clipId}/clip.mp4
```

Keys are built/resolved server-side in `server/storage.ts`. `uploads/` is gitignored and must **never** be exposed as static files. All file access goes through protected API routes that verify session `userId`, confirm record ownership, validate the exact key shape, and enforce `uploads/` path containment before streaming.

### Protected MP4 streaming
Video and clip stream routes share `server/protected-mp4-stream.ts`, which handles full `200`, `206` Partial Content (`Content-Range`), suffix ranges (`bytes=-N`), `416`, and `HEAD`. Auth/ownership/resolver/key-shape/path-safety checks stay in each route or its resolver, not in the helper.

### Upload pipeline (`server/upload.ts`, `app/api/upload/route.ts`)
Streaming multipart parse via `busboy`: route-level `Content-Type` check (415) and `Content-Length` pre-check against the 100 MB cap (413) → stream to a temp `.part` file under `uploads/tmp/uploads/` → MP4 magic-byte check → `ffprobe` duration probe → atomic rename to final path → `Video.status = READY`. Stale temp files (>24h) are swept on module load by `server/upload-cleanup.ts`. There is no in-memory buffering of the whole file.

### Clip worker (never run FFmpeg in serverless)
- Runs as a poll-loop daemon. **Two ways it runs:** (1) embedded — `instrumentation.ts` auto-starts `server/clip-worker-loop.ts` on the Node runtime when the dev/prod server boots (disable with `DISABLE_EMBEDDED_WORKER=true`); (2) standalone — `npm run worker:clips` (`workers/clip-worker.ts`). In production the worker should run as a separate process with the embedded one disabled.
- FFmpeg is invoked through `server/clip-processing.ts` (which uses the shared `server/ffmpeg-runner.ts`): `-ss` after `-i` for accurate seek, libx264 veryfast CRF20 + AAC, `+faststart`, per-job timeout with SIGKILL escalation, bounded stderr capture for safe error messages.
- Job claiming uses a Serializable transaction (`findFirst` + conditional `updateMany`) with an attempts guard; `ProcessingJob` has `@@index([type, status, createdAt])` for the claim query.

### Data layer
`server/*.ts` are current-user-scoped query modules (`videos.ts`, `clips.ts`, `video-detail.ts`, `clip-jobs.ts`, `dashboard.ts`). Pages are React Server Components that call these directly. `BigInt` columns (`sizeBytes`) are serialized to strings before reaching client components. Error messages from the worker are sanitized via `server/clip-errors.ts` before display (no absolute paths leak to users).

### Models (`prisma/schema.prisma`)
`User`/`Account`/`Session`/`VerificationToken` (Auth.js) plus `Video`, `Clip`, `ProcessingJob`. Enums: `VideoStatus` (UPLOADED, READY, FAILED — uploads land on READY after probe), `ClipStatus`/`JobStatus` (PENDING, PROCESSING, COMPLETED, FAILED), `JobType` (CREATE_CLIP). All domain tables carry `userId` and are indexed by it.

### Media toolchain
`ffmpeg`/`ffprobe` are resolved from `PATH` by default, or from optional `FFMPEG_PATH`/`FFPROBE_PATH` env overrides (`server/media-toolchain.ts`). Run `npm run check:media` before exercising upload or worker flows.

## Conventions

- **Formatters:** import `formatBytes` / `formatDate` / `formatSeconds` / `formatTimestamp` from `lib/formatters.ts` — do not redefine local copies.
- **Status badges:** use `components/shared/status-badge.tsx` (backed by `lib/status-helpers.ts`) for any video/clip status. Don't build per-page status pills.
- **Validation:** Zod + react-hook-form on the client, but **server-side validation is the source of truth** for clip ranges (finite `start >= 0`, `end > start`, min 3s, max 300s, and `end` within the source video's detected duration). Shared limits live in `lib/validation.ts`.
- **Design system:** dark charcoal background + neon lime accent `#D1FF00`. Lime is reserved for primary actions, active state, progress, focus rings, and success — not decoration. Use Lucide icons. Animations go through `lib/motion.ts` variants and `components/motion/*`; reduced-motion is honored globally (`components/providers/motion-provider.tsx` + a `prefers-reduced-motion` block in `app/globals.css`), so don't add motion that ignores it. See `docs/DESIGN-SYSTEM.md`.

## MVP scope guardrails

These are intentionally **out of scope** (see `AGENTS.md`) — do not add without an explicit, approved roadmap phase: Supabase; Cloudflare R2 SDK/env or any cloud storage as an MVP requirement; auto-subtitles; AI highlights; payments/subscriptions; social feed, likes/comments, public profiles; team workspaces; YouTube/TikTok integration; complex timeline editing. Work phase by phase and keep the MVP simple.

## Key docs

- `AGENTS.md` — project rules, scope, color system
- `docs/ARCHITECTURE.md` — full technical architecture
- `docs/DESIGN-SYSTEM.md` — brand/components/animation reference
- `docs/QA-CHECKLIST.md` — MVP QA pass
- `docs/CODEX-HANDOFF.md` and `docs/REDESIGN-PROGRESS.md` — status/handoff notes
