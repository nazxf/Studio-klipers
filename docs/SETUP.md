# Setup Guide

## Create the app

If this repository is still empty except documentation, create the Next.js app in the repo root.

Recommended setup:

- Next.js App Router
- TypeScript
- ESLint
- Tailwind CSS
- import alias enabled

## Core packages

Install packages phase by phase. Expected core tools:

- framer-motion
- lucide-react
- zod
- react-hook-form
- prisma
- @prisma/client
- next-auth
- @auth/prisma-adapter

Optional later:

- bullmq
- ioredis
- object storage SDK only if production later moves to MinIO or Cloudflare R2

## Environment variables

Copy `.env.example` to `.env.local` and fill the values.

Required groups:

- Database URL
- Auth secret and auth URL
- Google OAuth client ID and secret
- GitHub OAuth client ID and secret
- Redis URL later if using queue

## OAuth callbacks

Use the standard Auth.js callback paths for Google and GitHub in local development.

Google callback path:

```text
/api/auth/callback/google
```

GitHub callback path:

```text
/api/auth/callback/github
```

## Local filesystem storage

Development and MVP use local filesystem storage under `uploads/`. The directory is gitignored and must not be served from `public/` or exposed as public static files.

Recommended filesystem path and database key format:

```text
filesystem: uploads/users/{userId}/videos/{videoId}/original.mp4
Video.sourceKey: users/{userId}/videos/{videoId}/original.mp4

filesystem: uploads/users/{userId}/clips/{clipId}/clip.mp4
Clip.outputKey: users/{userId}/clips/{clipId}/clip.mp4
```

Store controlled relative keys in the database without the `uploads/` root. Do not store absolute filesystem paths.

File preview and download routes must verify the session `userId` and record ownership before resolving or streaming files.

Cloudflare R2 is optional future production storage only. Do not add R2 SDK packages or R2 environment variables for the MVP.

## FFmpeg

Before Phase 6, install FFmpeg locally and on the worker server.

The worker must not run heavy video processing inside Vercel serverless functions.

Run one pending local clip job with:

```text
npm run worker:clips
```

The MVP worker processes one pending job and exits. Re-run the command to process another pending job.

## Codex workflow

Start by asking Codex to read `AGENTS.md` and `docs/CODEX-PROMPTS.md`.

Then follow phases in order:

1. UI shell
2. Auth
3. Database models
4. Local filesystem upload
5. Clip job creation
6. FFmpeg worker
7. Clip preview and download
8. QA and deployment

## Production storage later

For production, choose storage after the MVP proves the workflow. Acceptable later options include VPS local disk, MinIO, or Cloudflare R2 after the payment-method blocker is resolved.
