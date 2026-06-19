# UI Redesign — Progress & Handoff

> Catatan lanjutan untuk melanjutkan pekerjaan redesign UI di chat baru.
> Baca file ini dulu sebelum lanjut. Terakhir diperbarui: 2026-06-18.

## Tujuan & keputusan user

- **Goal**: "memperbagusi semua UI halaman" — redesign visual penuh per halaman (layout/komponen baru), bukan sekadar poles kecil.
- **Rollout**: **Per halaman + checkpoint**. Kerjakan fondasi dulu, lalu satu halaman per fase, **BERHENTI untuk review user** setelah tiap fase.
- **Brand**: pertahankan identitas **dark premium + neon lime** sesuai `docs/DESIGN-SYSTEM.md`.
  - Lime `#D1FF00` (OKLCH hue 124), rasio **80/15/5** (dark/neutral/lime), estетika "control room".
  - **JANGAN** pakai palette pink yang di-generate skill di `design-system/studio-klipers/MASTER.md` (mismatch brand). Belum diputuskan: regenerate jadi lime atau hapus — **non-blocking**.
- Bahasa percakapan: **Indonesia**.

## Sumber kebenaran

- `docs/DESIGN-SYSTEM.md` — read-only, acuan brand/komponen/animasi. Aturan penting: lime hanya untuk titik interaksi penting (primary button, active state, progress, focus ring, success), hindari clutter/gradient acak/banyak warna aksen, "support reduced motion".

## Stack

Next.js 16 App Router · React 19 · TS 6 · Tailwind v3.4 · shadcn/ui (Radix) · Framer Motion 12 · Lucide · react-hook-form + zod · Auth.js/NextAuth · Prisma + PostgreSQL.
Produk: **Studio Klipers** — upload MP4 → trim start/end → queue clip job → worker FFmpeg lokal → preview/download.

## Lingkungan / catatan kerja

- OS Windows; repo di `/d/cliper/Studio-klipers` (Git Bash). Working dir Claude: `/Users/dev/workspace-f5af9ddc` — **selalu pakai path absolut `/d/cliper/Studio-klipers/...`**.
- `Glob` kadang timeout di repo ini → pakai `ls` via Bash untuk listing direktori.
- Verifikasi tiap fase: `npx eslint <file...>` + `npx tsc --noEmit`. **User menolak `npm run build`** (jangan jalankan kecuali diminta).
- Tidak bisa buka browser di sini → cek visual (375/768/1024/1440, kontras, reduced-motion) dilakukan user via `npm run dev`.
- Lint pre-existing yang BUKAN dari kita: error `tests/validation.test.ts:245` (require()), warning `video-clipper-workspace.tsx` (watch()), `server/clip-files.ts`. Jangan dihitung sebagai regresi.

## Status fase

| Fase | Halaman | Status |
| --- | --- | --- |
| 0 | Foundation | ✅ selesai |
| 1 | Landing `app/page.tsx` | ✅ selesai (Checkpoint #2) |
| 2 | Login `components/auth/login-view.tsx` | ✅ selesai (Checkpoint #3) |
| 3 | Dashboard home + kartu | ✅ selesai (Checkpoint #4) |
| 4 | Upload `app/upload/page.tsx` + form | ✅ selesai (Checkpoint #5, user "pokoknya lanjutkan") |
| 5 | Videos list `app/videos/page.tsx` | ✅ kode selesai (Checkpoint #6 belum dilapor detail; user minta lanjut terus) |
| 6 | Video detail / Clipper `components/videos/video-clipper-workspace.tsx` | ✅ kode selesai |
| 7 | Clips list `app/clips/page.tsx` | ✅ kode selesai |
| 8 | Clip detail `app/clips/[id]/page.tsx` | ✅ kode selesai |

**Langkah berikutnya**: SEMUA 8 fase redesign UI sudah selesai (kode + eslint + tsc bersih, hanya tersisa warning `watch()` pre-existing). Yang belum: **cek visual oleh user** via `npm run dev` di tiap halaman (375/768/1024/1440, kontras, reduced-motion), terutama interaksi dropzone upload, timeline clipper, dan summary strip list. Bila ada revisi visual, kerjakan; bila tidak, redesign dianggap rampung.

## Track lanjutan — Adaptasi teknik "WonderKids" (brand tetap dark + lime)

> Keputusan user (AskUserQuestion): **"Ambil teknik, brand tetap"**. Ambil *teknik* dari referensi landing playful (garis bawah keyword tulisan-tangan, kartu fitur rounded, motif sudut/corner, panah doodle) tapi **TETAP** brand dark premium + neon lime. Bukan rebrand, jangan jadi childish/warna-warni.

> Lanjutan: user minta "memperbagus landing page" → pilih **urut rekomendasi** (per-checkpoint). Hero diubah jadi **teks-saja ketengah** (panel preview dihapus) atas permintaan user, lalu ditambah elemen teknik referensi versi brand-safe. **`npm run build` sekarang DIIZINKAN** user.

| CP | Item | Status |
| --- | --- | --- |
| CP-1 | `AccentUnderline` beranimasi (draw-in) + headline sequenced + **hero jadi teks-saja ketengah** | ✅ kode selesai (build lulus) — **tunggu review visual** |
| CP-2 | **Nav pill mengambang** di header Landing | ✅ kode selesai (build lulus) |
| CP-3 | **`DoodleArrow`** — panah lime monoline beranimasi (`pathLength`) menunjuk CTA "Open cockpit" | ✅ kode selesai (build lulus) |
| CP-4 | **`ConcentricRings`** — motif scope ambient di sudut hero (warna border, opacity rendah) | ✅ kode selesai (build lulus) |
| CP-5 | **`CardCorner`** — motif ring sudut di kartu "How it works" + "Design intent" | ✅ kode selesai (build lulus) |
| CP-6 | Polish: CTA **panah-dalam-lingkaran** + **signal tick** di eyebrow section | ✅ kode selesai (build lulus) |
| (lama) | Aksen underline lime di shared `PageHeader` (Videos/Clips/Upload) + motif sudut kartu Dashboard | ⏳ belum (opsional, di luar landing) |

### CP-1 — AccentUnderline beranimasi + headline sequenced (Landing hero)
- `components/shared/accent-underline.tsx` — kini **client component** (`"use client"`) beranimasi. Stroke SVG lime hand-drawn (path bézier asimetris) **menggambar dirinya sendiri kiri→kanan** via `motion.path` + `pathLength` 0→1 (`framer-motion`). Prop baru: `animate` (default true; false = langsung penuh), `delay` (offset detik biar coretan jalan setelah teks). **Sadar reduced-motion**: `useReducedMotion()` → kalau aktif (atau `animate=false`), coretan render penuh tanpa animasi. Teks tetap foreground; lime hanya di stroke. `aria-hidden`, `pointer-events-none`, `preserveAspectRatio="none"` (ikut lebar teks) dipertahankan; prop `className`/`strokeClassName` masih ada.
- `app/page.tsx` — headline hero `<motion.h1>` jadi **nested stagger container** (`staggerContainer`); dua baris dibungkus `<motion.span variants={staggerItem} className="block">` masing-masing → baris 1 "Long footage in." lalu baris 2 "Clean clips out." naik berurutan. Baris 2 pakai `<AccentUnderline delay={0.5}>` agar coretan menggambar sesaat setelah baris settle.
- **Hero jadi teks-saja, ketengah** (permintaan user "teks nya doang seperti di gambar"): panel preview clipper di samping **dihapus**; layout dari grid 2-kolom → satu kolom `max-w-4xl` `items-center text-center`, headline dibesarkan ke `lg:text-7xl`, pills `justify-center`. Import `Image` (next/image) & `fadeUp` dihapus karena tak terpakai lagi.
- **Pola baru di codebase**: ini pemakaian `motion.path` + `pathLength` pertama → acuan untuk animasi "stroke draw-in" berikutnya.
- **Verifikasi**: `eslint` + `tsc --noEmit` bersih; **`npm run build` lulus** (exit 0, `/` tetap prerendered static). Warning build `media-toolchain`/upload route = pre-existing, bukan dari perubahan ini.

### CP-2 — Nav pill mengambang (header Landing)
- `app/page.tsx` header: dari bar full-width `border-b` → **kapsul mengambang**. Container jadi `sticky top-0 px-4 pt-4` dengan inner `max-w-5xl rounded-full border bg-background/70 shadow-panel-sm backdrop-blur` (BrandMark kiri + nav kanan). Tombol nav dapat `rounded-full` (override via twMerge). Premium/modern, risiko rendah.

### CP-3 — DoodleArrow (panah menunjuk CTA)
- `components/shared/doodle-arrow.tsx` (BARU, client) — panah lime monoline yang **menggambar dirinya** via `motion.path` + `pathLength` (2 stroke: kurva lalu kepala panah, kepala delay 0.35s). Sadar reduced-motion (`useReducedMotion`). Lime dibenarkan karena **menunjuk AT primary action**. Prop `animate`/`delay`.
- `app/page.tsx` — CTA row jadi `relative`, panah absolut `right-full top-1/2` (`hidden sm:block`) menunjuk "Open cockpit", `delay={0.95}` (jadi flourish terakhir setelah teks+underline).

### CP-4 — ConcentricRings (ambient scope di hero)
- `components/shared/concentric-rings.tsx` (BARU, server/statis) — 4 lingkaran konsentris + titik tengah, `text-border` (BUKAN lime), `aria-hidden`. Reusable.
- `app/page.tsx` — section hero jadi `overflow-hidden`; 2 motif ring diposisikan di sudut (bawah-kiri besar `opacity-50`; atas-kanan `lg:block opacity-40`). Konten hero dinaikkan `relative z-10` agar di atas motif. Memberi kedalaman ke hero yang kini lapang tanpa mengembalikan "kotak".

### CP-5 — CardCorner (motif sudut kartu)
- `components/shared/card-corner.tsx` (BARU, server) — bungkus `ConcentricRings` kecil (`h-24 w-24`) absolut di sudut, `opacity-40` → `group-hover:opacity-70`, warna border. Default sudut kanan-atas; posisi bisa di-override via `className` (pakai `top-auto -bottom-12` dst).
- `app/page.tsx` — kartu "How it works" (sudut bawah-kanan, jauh dari nomor) & "Design intent" (sudut atas-kanan) dapat `CardCorner`; tiap kartu jadi `group relative overflow-hidden`, konten dibungkus `<div className="relative">` agar di atas motif. Menyatukan bahasa visual hero↔section.

### CP-6 — Polish (arrow-in-circle + signal tick)
- `app/page.tsx` — CTA primary "Open cockpit" (hero + closing) panahnya dibungkus disc bundar `bg-primary-foreground/15` (`size-6 rounded-full`) → afordans "panah-dalam-lingkaran" ala referensi. **Bukan lime** (disc = tint foreground gelap di atas tombol lime), jadi tak menambah kuantitas lime. Nav & tombol secondary dibiarkan polos.
- **Signal divider → diinterpretasi jadi "signal tick"**: eyebrow mono ("The clipping pass", "Design intent") dapat garis lime pendek (`h-px w-6 bg-primary`) sebelum teks. Sengaja **bukan divider lime full-width antar-section** (itu = lime dekoratif, langgar aturan brand); tick ini menyatu dengan eyebrow yang memang sudah lime = bagian sistem "signal".
- **Verifikasi**: eslint + tsc bersih, **build lulus**.

## Ringkasan track "perbagus landing" (CP-1…CP-6) — SELESAI (kode)
Semua kode + `npm run build` lulus, `/` tetap prerendered static. **Belum**: cek visual user via `npm run dev` (375/768/1024/1440 + reduced-motion). Komponen baru reusable: `accent-underline` (animated), `doodle-arrow`, `concentric-rings`, `card-corner`. Brand tetap dark + lime; lime hanya di: underline keyword, panah penunjuk CTA, signal tick eyebrow, ikon aksi — bukan dekorasi. Motif scope/corner pakai warna border.

## Yang sudah diubah

### Fase 0 — Foundation
- `components/providers/motion-provider.tsx` (BARU) — `MotionConfig reducedMotion="user"`; di-wrap di `app/layout.tsx`.
- `app/globals.css` — tambah `@media (prefers-reduced-motion: reduce)` global di akhir file.
- `components/ui/button.tsx` — tambah `cursor-pointer` di base cva.
- `components/shared/status-badge.tsx` (BARU) — `<StatusBadge kind="video|clip" status=... />`, dot pulse `motion-safe:animate-pulse` saat PROCESSING. Dipakai konsisten di seluruh app.
- A11y form: `local-upload-form.tsx` & `video-clipper-workspace.tsx` (aria-invalid/aria-describedby/role=alert|status, inputMode).
- StatusBadge swap di: `app/videos/page.tsx`, `app/clips/page.tsx`, `app/clips/[id]/page.tsx`, `components/videos/video-clip-list.tsx`.

### Fase 1 — Landing (`app/page.tsx`)
Ditulis ulang penuh: header sticky+blur; hero headline baru ("Long footage in. / **Clean clips out.**"), pill fakta; **preview clipper realistis** (frame video + timeline trim range lime IN/CLIP/OUT + action row); section "How it works" 4 langkah bernomor; "Design intent" 3 kartu; closing CTA band; footer. `whileInView once`. A11y heading hierarchy, mock `aria-hidden`.

### Fase 2 — Login
- `components/auth/login-view.tsx` — ditulis ulang: brand panel kiri dengan `surface-grid` + 3 langkah ber-ikon + baris keamanan; card kanan "Sign in" + divider "Secure session" + blok ShieldCheck; error `role="alert"`.
- `components/auth/oauth-sign-in-button.tsx` — tinggi 44px, spinner `Loader2` + `aria-busy` saat pending, slot ikon konsisten.

### Fase 3 — Dashboard
- `components/dashboard/stat-card.tsx` — dukung prop `href` (kartu jadi link: Source videos→/videos, Clips/Ready→/clips) + panah `ArrowUpRight` + hover lime + focus ring.
- `components/dashboard/processing-list.tsx` — pakai `StatusBadge kind="clip"` (hapus getBadgeVariant lokal).
- `components/dashboard/dashboard-home.tsx` — hapus badge dekoratif ("Dark charcoal" dll); kolom kanan-bawah kondisional: `ClipLibrarySummary` (ready vs total + link /clips) bila `clipCount>0`, else EmptyState.

### Fase 4 — Upload
- `components/upload/local-upload-form.tsx` — input file native disembunyikan (`sr-only`) + **dropzone drag-and-drop** (role=button, keyboard Enter/Space, dragover/leave/drop state lime, `assignFileToInput` via DataTransfer agar form submit tetap pakai input native). Kartu file terpilih + tombol hapus (X). Tombol submit disabled bila belum ada file. Seluruh logika XHR/progress/abort/a11y dipertahankan.
- `app/upload/page.tsx` — hapus badge dekoratif; sidebar jadi `aside` "How intake works" 3 langkah bernomor + "Storage key".

### Fase 8 — Clip detail (`app/clips/[id]/page.tsx`)
Tambah **footer "Trim range"** di player Card (sama gaya Fase 6, tapi statis/server): bar lime IN→OUT diposisikan terhadap durasi source (`rangeLeft`/`rangeWidth` dari `clip.video.durationSeconds`, `clampPct`, min width 1.5% biar clip pendek tetap terlihat; fallback "Source length unknown" + full bar bila durasi source null), label IN/CLIP/OUT mono. Baris "Status" di card Output di-Title Case (`COMPLETED`→`Completed`). Sisa struktur (status card, actions, failed banner, 3 kartu timing/output/source) dipertahankan.

### Fase 7 — Clips list (`app/clips/page.tsx`)
Tambah **summary strip** 3 tile pakai shared `SummaryTile`: Total clips / Ready (accent, COMPLETED+hasOutput) / In queue (PENDING|PROCESSING). Struktur empty-vs-list dipisah jadi `<section>` (empty) vs fragment `<>` (summary + `StaggeredList mt-6`). Baris clip + actions (Open/Preview/Download) + `ClipStatusRefresh` dipertahankan.

### Shared
- `components/shared/summary-tile.tsx` (BARU) — `<SummaryTile icon label value accent? />`, dipakai di Videos & Clips list. Pola: `panel-edge` card, ikon + label mono, angka `font-mono text-2xl`. Varian `accent` = border/teks lime.

### Fase 6 — Video detail / Clipper
- `components/videos/video-clipper-workspace.tsx` — tambah **footer timeline** di player Card: bar `h-2.5 bg-secondary` dengan fill range lime (IN→OUT) + playhead `bg-foreground` (semua via inline `style` left/width %, turunan `durationLimit`/`startSeconds`/`endSeconds`/`currentTime`, di-`clampPct`), label IN/CLIP/OUT mono. Panel "Selection" diubah jadi grid 3 stat mono berlabel (Start/End/Length) + baris "Current". **Tidak menyentuh** logika form/zod/fetch/preview/abort/a11y. Warning `watch()` line 194 pre-existing (bukan regresi).
- `app/videos/[id]/page.tsx` — header pakai `<StatusBadge kind="video">` (ganti `<Badge>{status}</Badge>`); badge Local storage + clips dipertahankan.

### Fase 5 — Videos list (`app/videos/page.tsx`)
Ditulis ulang penuh (tetap server component). Tambah **summary strip** 3 tile (Sources accent-lime / Clips / Storage) dengan aggregate dari array video (`reduce` clipCount & `Number(sizeBytes)`). Baris video diperkaya: ikon tile `size-11`, judul + `StatusBadge`, filename mono, lalu **grid metadata berlabel** (Duration via `formatSeconds(.., "—")`, Size, Clips, Uploaded) 2-col→4-col, plus `ArrowUpRight` muncul saat hover/`group`. Link pakai `group` + `group-hover`/`group-focus-visible` ring di Card. EmptyState dipertahankan. Pakai shared `SummaryTile` (lihat bagian Shared); helper lokal `MetaCell` (di-type dgn `LucideIcon`).

## Pola desain yang dipakai (ikuti untuk konsistensi)

- Card: `border-border bg-card`, sering `panel-edge` + `shadow-none`/`shadow-panel`.
- Eyebrow: `font-mono text-[11px] uppercase tracking-[0.18em]–[0.22em] text-primary`.
- Ikon tile: `size-9/size-10 rounded-md/lg border bg-secondary text-primary` (atau `border-primary/20 bg-primary/10` untuk aksen).
- Container halaman: `max-w-7xl px-4 sm:px-6 lg:px-8`.
- Motion: `staggerContainer/staggerItem`, `fadeUp`, `pageTransition`, `scaleIn` dari `@/lib/motion`; section pakai `whileInView` `viewport={{once:true, margin:"-80px"}}`.
- Status: SELALU pakai `<StatusBadge>` bersama, jangan bikin badge status lokal.
- A11y wajib: ikon dekoratif `aria-hidden`, error `role="alert"`, status `role="status"`, kontrol non-native (dropzone) butuh role+tabIndex+keyboard, focus-visible ring.

## File acuan yang sudah dibaca (read-only)
`lib/status-helpers.ts`, `lib/motion.ts`, `components/ui/badge.tsx`, `components/ui/progress.tsx`, `components/shared/brand-mark.tsx`, `components/layout/*` (app-sidebar, app-topbar, dashboard-shell, mobile-sidebar — belum dibaca detail), `components/shared/page-header.tsx` & `empty-state.tsx` (dipakai, belum dibaca detail).

## Catatan keamanan (jangan dilanggar)
Jangan commit `.env`, `.env.local`, `uploads/`. File hanya dilayani lewat route terproteksi (cek ownership session), bukan static publik. Tidak ada operasi git/deploy destruktif yang diminta/diizinkan.
