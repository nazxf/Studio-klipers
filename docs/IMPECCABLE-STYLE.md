# Impeccable-Style UI Polish Guide

Use this guide whenever Codex is asked to polish the UI.

## Goal

Make Studio Klipers feel like a premium, intentional, production-ready SaaS dashboard. The UI must not look like a generic AI-generated template.

## Visual principles

- Every screen must have clear hierarchy.
- Every section must have a clear purpose.
- Spacing must be consistent.
- Typography must feel calm and readable.
- Neon lime must be used with restraint.
- Cards must feel structured, not decorative.
- Empty states must guide the user to the next action.
- Motion must support the workflow, not distract from it.

## Core style

Use:

- dark charcoal base
- elevated dark panels
- soft borders
- clean sans-serif typography
- neon lime accent for primary actions
- simple icons
- subtle shadows or glows only when useful
- rounded cards and buttons
- precise alignment

Avoid:

- random gradients
- excessive glow
- too many colors
- cluttered dashboards
- noisy backgrounds
- playful bounce animations
- huge empty hero sections with no purpose
- inconsistent button styles
- inconsistent spacing

## Layout rules

Dashboard pages should use:

- left sidebar
- topbar
- page title
- short page description
- primary action button
- main content cards
- helpful empty states

Page structure:

1. Header: title, description, main action
2. Main card or grid
3. Secondary details
4. Empty/loading/error state if needed

## Spacing rules

Use consistent spacing:

- page padding: generous
- card padding: comfortable
- section gap: clear
- list row height: readable
- table spacing: not cramped

Do not compress UI elements too tightly.

## Typography rules

Use a clear type scale:

- Page title: strong and readable
- Section title: medium weight
- Body: calm and legible
- Metadata: smaller, muted
- Button text: short and clear

Avoid long paragraphs inside dashboard cards.

## Button rules

Primary button:

- background: `#D1FF00`
- text: near-black
- hover: `#BCEB00`
- used only for the main next action

Secondary button:

- dark surface
- subtle border
- light text

Destructive button:

- use error color only when truly destructive

## Card rules

Cards should use:

- background: `#171A1D`
- border: `#262B31`
- soft rounded corners
- clear title
- short supporting text
- consistent internal spacing

Avoid cards that are only decoration.

## Sidebar rules

Sidebar should be calm and functional.

Active item:

- subtle lime-tinted background
- lime icon/text
- clear active indicator

Inactive items:

- muted text
- hover state with slight brightness

## Motion rules

Use Framer Motion subtly:

- fade-up page entrance
- stagger cards on dashboard
- upload zone hover/drag feedback
- processing pulse indicator
- smooth clip result reveal

Motion timing:

- fast
- smooth
- no heavy bounce
- no long delays

## Final polish checklist

Before calling a UI finished, check:

- Does the page have one obvious next action?
- Is the accent color used only where important?
- Are cards aligned and evenly spaced?
- Is the text hierarchy clear?
- Is the layout calm and not noisy?
- Are empty states useful?
- Are loading and error states present?
- Does the page still look good without data?
- Does the animation feel subtle and premium?
