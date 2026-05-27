# Design System

## Brand direction

Studio Klipers uses a premium dark creator-dashboard style with neon lime accents.

The design should feel:

- premium
- focused
- calm
- organized
- fast
- modern
- creator-friendly

It can be inspired by the clarity of creator dashboards, but it must be original and must not copy YouTube branding or exact layouts.

## Color palette

| Role | HEX |
| --- | --- |
| Background | `#0B0D0E` |
| Surface | `#121416` |
| Card | `#171A1D` |
| Border | `#262B31` |
| Primary Text | `#F5F7FA` |
| Secondary Text | `#A1A8B3` |
| Accent Neon Lime | `#D1FF00` |
| Accent Hover | `#BCEB00` |
| Accent Soft | `#C8EF16` |
| Success | `#B8F500` |
| Warning | `#FFB800` |
| Error | `#FF5A5F` |
| Info | `#3B82F6` |

## Usage rules

Use neon lime only for important interaction points:

- primary button
- active sidebar item
- progress bar
- focus ring
- upload active state
- success state
- important stat highlight

Do not use neon lime as a full dashboard background. The app should remain mostly dark.

Recommended ratio:

- 80% dark background
- 15% neutral surfaces and borders
- 5% neon lime accent

## Components

Core components:

- AppSidebar
- AppTopbar
- PageHeader
- DashboardCard
- StatusBadge
- UploadDropzone
- VideoPlayer
- TimeInput
- EmptyState
- LoadingState
- ErrorState
- VideoCard
- ClipCard

Use shadcn/ui for primitives:

- Button
- Card
- Input
- Badge
- Table
- Progress
- Dialog
- Dropdown
- Tabs
- Toast

## Animation

Use Framer Motion for subtle UX feedback:

- page fade-up transitions
- staggered dashboard cards
- sidebar active state
- upload dropzone active state
- processing pulse indicator
- clip result reveal
- empty state entrance

Animation rules:

- keep it subtle
- keep it fast
- avoid playful bouncing
- avoid heavy parallax
- avoid distracting video player animations
- support reduced motion when possible

Suggested reusable variants:

- pageTransition
- fadeUp
- scaleIn
- staggerContainer
- staggerItem
- subtleHover
- sidebarItem
- statusPulse

## UI tone

Use short, clear copy. The interface should always tell users the next step.

Examples:

- Upload your first video
- Choose a start and end time
- Create clip
- Processing clip
- Clip ready to download

## Design anti-patterns

Avoid:

- random gradients
- too many accent colors
- cluttered cards
- tiny unreadable text
- overly playful animations
- generic AI-looking landing pages
- neon lime used everywhere
