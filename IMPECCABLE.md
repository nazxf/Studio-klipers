# Impeccable Required

Studio Klipers must use the Impeccable design skill for all UI work.

Source: https://impeccable.style/

## Install

Install in the coding environment:

npx skills add pbakaus/impeccable

Optional CLI:

npm i -g impeccable

## Required reading before UI work

Before writing or editing UI code, the agent must read:

- AGENTS.md
- IMPECCABLE.md
- docs/DESIGN-SYSTEM.md
- docs/IMPECCABLE-STYLE.md
- docs/CODEX-PROMPTS.md
- docs/ROADMAP.md

## Required design direction

- premium dark charcoal dashboard
- neon lime accent
- clean creator workflow
- subtle Framer Motion animation
- calm spacing
- strong hierarchy
- polished cards and buttons
- useful empty states
- no generic AI UI
- no random gradients
- no clutter
- no excessive glow

## Required workflow

1. Install or confirm Impeccable is available.
2. Read the project rules.
3. Use Impeccable in product UI mode.
4. Give a phase plan before coding.
5. Implement only the current phase.
6. Run an Impeccable-style audit after UI implementation.
7. Polish the UI before moving to backend work.

## Mandatory starter prompt for Codex

Use Impeccable in product UI mode. Read AGENTS.md, IMPECCABLE.md, docs/DESIGN-SYSTEM.md, docs/IMPECCABLE-STYLE.md, docs/CODEX-PROMPTS.md, and docs/ROADMAP.md. Before coding, give me the Phase 0 and Phase 1 plan and list the files you will create or change.

## Mandatory audit prompt

Run an Impeccable-style UI audit. Check spacing, typography, hierarchy, contrast, sidebar polish, button consistency, card consistency, empty states, loading states, error states, motion quality, dashboard clarity, visual clutter, and neon lime usage. Then polish the UI without changing the app architecture or adding new features.

## Phase gate

If the UI looks generic, do not continue to backend work. Audit and polish the UI first.
