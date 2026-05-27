# Studio Klipers / Clipper Studio

Studio Klipers adalah rencana MVP untuk web app video clipper: user login, upload video MP4, pilih start/end time, proses clip dengan FFmpeg, lalu preview dan download hasilnya.

Dokumentasi ini dibuat agar kamu bisa lanjut di Codex secara bertahap tanpa bingung.

## Stack final

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
- FFmpeg worker
- Zod
- React Hook Form
- BullMQ + Redis nanti jika diperlukan

## Prinsip penting

- Jangan gunakan Supabase.
- Jangan build semua fitur sekaligus.
- Kerjakan phase by phase.
- Fokus MVP yang benar-benar bisa dipakai.
- Desain memakai dark charcoal + neon lime `#D1FF00`.

## Target MVP

User harus bisa:

1. Login dengan Google atau GitHub.
2. Masuk ke dashboard.
3. Upload video MP4.
4. Preview video.
5. Pilih start time dan end time.
6. Membuat clip.
7. Menunggu proses FFmpeg.
8. Preview clip selesai.
9. Download clip.

## File penting

- `AGENTS.md` — aturan utama untuk Codex/AI agent.
- `docs/ROADMAP.md` — urutan phase pengerjaan.
- `docs/CODEX-PROMPTS.md` — prompt siap pakai untuk Codex.
- `docs/ARCHITECTURE.md` — arsitektur teknis.
- `docs/SETUP.md` — setup lokal dan environment variables.
- `docs/DESIGN-SYSTEM.md` — warna, UI style, dan animasi.
- `docs/QA-CHECKLIST.md` — checklist testing.

## Cara lanjut di Codex

Buka repo ini di Codex, lalu kirim:

```text
Read AGENTS.md and docs/CODEX-PROMPTS.md. Start with the Initial Assessment Prompt. Do not implement anything before giving me the Phase 1 plan.
```

Setelah Codex memberi rencana Phase 1, baru lanjutkan dengan prompt Phase 1 dari `docs/CODEX-PROMPTS.md`.
