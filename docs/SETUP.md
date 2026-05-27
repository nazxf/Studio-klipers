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
- @aws-sdk/client-s3
- @aws-sdk/s3-request-presigner

Optional later:

- bullmq
- ioredis

## Environment variables

Copy `.env.example` to `.env.local` and fill the values.

Required groups:

- Database URL
- Auth secret and auth URL
- Google OAuth client ID and secret
- GitHub OAuth client ID and secret
- Cloudflare R2 account, bucket, endpoint, access key, secret key, and public URL
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

## Cloudflare R2

Create one R2 bucket for original videos and generated clips.

Recommended key format:

```text
users/{userId}/videos/{videoId}/original.mp4
users/{userId}/clips/{clipId}/clip.mp4
```

## FFmpeg

Before Phase 6, install FFmpeg locally and on the worker server.

The worker must not run heavy video processing inside Vercel serverless functions.

## Codex workflow

Start by asking Codex to read `AGENTS.md` and `docs/CODEX-PROMPTS.md`.

Then follow phases in order:

1. UI shell
2. Auth
3. Database models
4. R2 upload
5. Clip job creation
6. FFmpeg worker
7. Clip preview and download
8. QA and deployment
