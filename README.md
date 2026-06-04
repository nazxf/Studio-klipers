# Studio Klipers

Studio Klipers is a local MVP for authenticated MP4 clipping. A signed-in user can upload an MP4, preview it through protected routes, choose a start and end time, queue a clip job, run the local FFmpeg worker, then preview and download the completed clip.

The MVP uses local filesystem storage for source videos and generated clips. Cloudflare R2, subtitles, payments, AI, social features, public sharing, and gameplay plus facecam workflows are intentionally out of scope.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Lucide Icons
- Framer Motion
- Auth.js / NextAuth with Google and GitHub OAuth
- Prisma
- PostgreSQL
- Local filesystem storage under `uploads/`
- FFmpeg and ffprobe from the local machine

## Requirements

- Node.js and npm
- PostgreSQL
- Google OAuth credentials
- GitHub OAuth credentials
- FFmpeg full build with `ffmpeg` and `ffprobe` available to Node

Install FFmpeg full build and add its `bin` folder to `PATH`, then restart the terminal and dev server. If PATH lookup is awkward on your machine, set optional `FFMPEG_PATH` and `FFPROBE_PATH` in `.env.local`.

## Environment

Create `.env.local` from `.env.example` and fill the local values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
AUTH_SECRET=""
AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Optional
FFMPEG_PATH=""
FFPROBE_PATH=""
```

Do not commit `.env`, `.env.local`, or `uploads/`.

## Local Setup

```powershell
npm install
npx prisma migrate dev
npx prisma generate
npm run check:media
npm run dev
```

Open `http://localhost:3000`.

## Media Toolchain Check

Before testing uploads or worker processing, run:

```powershell
npm run check:media
```

The check verifies that Node can spawn `ffmpeg` and `ffprobe` and read their versions. If it fails, install FFmpeg full build, add its `bin` folder to `PATH`, then restart the terminal and dev server.

## Existing Video Duration Backfill

Older local videos may have `durationSeconds` set to `null`. Clip creation now requires server-detected duration metadata.

Run:

```powershell
npm run backfill:durations
```

The script safely finds videos with missing duration metadata, resolves each `sourceKey` inside `uploads/`, probes duration with ffprobe, and updates only `Video.durationSeconds`. It skips missing files and does not create clips or jobs.

## MVP Flow

1. Sign in with Google or GitHub.
2. Open `/upload`.
3. Upload a valid MP4 up to 100 MB.
4. Open the uploaded video detail page.
5. Preview the protected source video.
6. Enter start and end times.
7. Create a clip job.
8. In a terminal, run:

```powershell
npm run worker:clips
```

The worker processes exactly one pending clip job and exits.

9. Open `/clips`.
10. Open the completed clip.
11. Preview and download the completed MP4.

## Storage

Source videos:

```text
uploads/users/{userId}/videos/{videoId}/original.mp4
Video.sourceKey = users/{userId}/videos/{videoId}/original.mp4
```

Generated clips:

```text
uploads/users/{userId}/clips/{clipId}/clip.mp4
Clip.outputKey = users/{userId}/clips/{clipId}/clip.mp4
```

Files are served only through protected API routes that verify session ownership and controlled key shape. The app does not expose `uploads/` as public static files.

## Verification Commands

```powershell
npm run lint
npm run build
npx prisma validate
npm run check:media
```

## Important Docs

- `AGENTS.md`: project and agent rules
- `IMPECCABLE.md`: UI direction and Impeccable requirement
- `docs/ARCHITECTURE.md`: technical architecture
- `docs/QA-CHECKLIST.md`: final MVP QA checklist
- `docs/CODEX-HANDOFF.md`: current handoff/status
- `docs/CODEX-PROMPTS.md`: phase prompts and guardrails
