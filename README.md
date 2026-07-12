# Studio Klipers

> Repository verified via ChatGPT GitHub connector.

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

Create `.env.local` from `.env.example` and fill the local values.
