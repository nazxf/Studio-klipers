# Studio Klipers — Agent Rules

You are building Studio Klipers / Clipper Studio, a production-ready MVP web app for clipping videos.

## Core MVP

The MVP must allow users to:

1. Login with Google or GitHub using Auth.js / NextAuth
2. Access a protected dashboard
3. Upload MP4 videos
4. Store original videos in Cloudflare R2
5. Store metadata in PostgreSQL using Prisma
6. Preview uploaded videos
7. Select start time and end time
8. Create clips using FFmpeg
9. Monitor processing status
10. Preview completed clips
11. Download completed clips

## Non-negotiable rules

Do not use Supabase.

Do not implement these features in MVP:

- AI auto highlight
- Auto subtitles
- Social feed
- Like/comment
- Public profiles
- Payment
- Subscription
- Team workspace
- YouTube URL downloader
- TikTok integration
- Complex drag timeline editor

## Tech stack

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Framer Motion
- Auth.js / NextAuth
- Google OAuth
- GitHub OAuth
- Prisma
- PostgreSQL
- Cloudflare R2
- FFmpeg
- Zod
- React Hook Form
- BullMQ + Redis later if needed

## Design direction

Create a premium dark SaaS dashboard inspired by the clarity and structure of creator dashboards like YouTube Studio, but original.

Do not copy:

- YouTube logo
- YouTube branding
- YouTube exact layout
- YouTube proprietary icons or assets

Use:

- dark charcoal background
- black/dark gray panels
- neon lime accent `#D1FF00`
- soft borders
- clean typography
- clear visual hierarchy
- sidebar navigation
- topbar
- card-based dashboard
- useful empty states
- loading states
- status badges
- subtle Framer Motion animations

The UI should feel:

- calm
- premium
- focused
- organized
- professional
- easy to understand

## Color system

- Background: `#0B0D0E`
- Surface: `#121416`
- Card: `#171A1D`
- Border: `#262B31`
- Primary Text: `#F5F7FA`
- Secondary Text: `#A1A8B3`
- Accent Neon Lime: `#D1FF00`
- Accent Hover: `#BCEB00`
- Accent Soft: `#C8EF16`
- Success: `#B8F500`
- Warning: `#FFB800`
- Error: `#FF5A5F`
- Info: `#3B82F6`

## Animation rules

Use Framer Motion for:

- page transitions
- staggered dashboard cards
- sidebar active state
- upload dropzone feedback
- processing status animation
- clip result reveal
- empty state animation

Animations must be:

- subtle
- fast
- premium
- not playful
- not distracting
- not excessive

## Engineering rules

- Work phase by phase
- Do not build everything at once
- Before editing files, explain the plan
- Keep code clean and modular
- Use TypeScript properly
- Validate inputs with Zod
- Protect all dashboard routes
- Protect all API routes
- Always filter data by userId
- Do not allow users to access other users' videos or clips
- Add loading, error, and empty states
- Keep the MVP simple
- Do not overengineer

## Success criteria

The MVP is successful only if a real user can:

1. Login with Google or GitHub
2. Upload an MP4 video
3. Open the video detail page
4. Preview the video
5. Enter start and end time
6. Create a clip
7. Wait for FFmpeg processing
8. Preview the completed clip
9. Download the completed clip
