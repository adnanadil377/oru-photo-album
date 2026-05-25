---
name: Memoire
description: A warm, intimate guest photo collection app for events and weddings
colors:
  warm-black: oklch(3.5% 0.008 30)
  warm-white: oklch(98% 0.006 30)
  surface-dim: oklch(9% 0.008 30)
  surface-bright: oklch(14% 0.008 30)
  border-dim: oklch(22% 0.008 30)
  muted: oklch(70% 0.006 30)
  primary: oklch(100% 0 0)
  primary-foreground: oklch(3.5% 0.008 30)
  destructive: oklch(50% 0.22 25)
typography:
  display:
    fontFamily: Playfair Display, Georgia, serif
    fontSize: clamp(2.5rem, 6vw, 4.5rem)
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.01em
  headline:
    fontFamily: Playfair Display, Georgia, serif
    fontSize: clamp(1.75rem, 4vw, 2.5rem)
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: normal
  title:
    fontFamily: Playfair Display, Georgia, serif
    fontSize: clamp(1.25rem, 2.5vw, 1.5rem)
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: normal
  body:
    fontFamily: DM Sans, Inter, system-ui, sans-serif
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: normal
  label:
    fontFamily: DM Sans, Inter, system-ui, sans-serif
    fontSize: 0.8125rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.04em
rounded:
  subtle: 8px
  standard: 16px
  generous: 24px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.surface-bright}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    typography: "{typography.label}"
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    typography: "{typography.label}"
  input-text:
    backgroundColor: "{colors.surface-bright}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.standard}"
    padding: 16px
    typography: "{typography.body}"
  card-event:
    backgroundColor: "{colors.surface-dim}"
    rounded: "{rounded.generous}"
    padding: 24px
  dialog:
    backgroundColor: "{colors.surface-dim}"
    rounded: "{rounded.generous}"
---

# Design System: Memoire

## 1. Overview

**Creative North Star: "The Darkroom"**

Memoire's design lives in the space between candlelight and silver gelatin. It is not a bright social app or a sterile SaaS dashboard. It is a darkroom where memories are developed: warm light against deep shadow, intimate scale, deliberate tools that never rush the user.

The system serves two audiences with one visual language. For hosts, the dashboard is clear and capable: tonal layers create hierarchy without noise, every action has a purpose, and the dark backdrop makes content the hero. For guests, the upload page is emotional and frictionless: cover images glow against the dark, upload targets are generous and forgiving, and the thank-you state feels like a hand on your shoulder.

**Key Characteristics:**
- Warm-black canvas (never pure #000; tinted toward a warm brown hue)
- Typographic hierarchy through weight and scale contrast (serif display + sans body)
- Tonal depth instead of drop shadows
- Generous rounded corners (16px standard, 24px for containers, pill for buttons)
- Motion that fades and rises, never slides or bounces

## 2. Colors

The palette is restrained by volume, warm by nature. The background is not black but a deep, warm near-black (oklch(3.5% 0.008 30)). The foreground is not white but a soft, warm off-white (oklch(98% 0.006 30)). Every neutral carries a trace of the same 30-degree hue.

### Primary
- **Warm White** (oklch(98% 0.006 30)): Primary text, primary buttons, interactive labels. The light source in the darkroom.

### Neutral
- **Warm Black** (oklch(3.5% 0.008 30)): Page background. Deep enough to feel infinite, warm enough to feel inhabited.
- **Surface Dim** (oklch(9% 0.008 30)): Card, dialog, and secondary surface backgrounds. One step above the page.
- **Surface Bright** (oklch(14% 0.008 30)): Elevated surfaces, input backgrounds, hover states. The brightest dark tone.
- **Border Dim** (oklch(22% 0.008 30)): Dividers, strokes, low-emphasis borders.
- **Muted** (oklch(70% 0.006 30)): Secondary text, placeholders, captions.

### Feedback
- **Destructive** (oklch(50% 0.22 25)): Error text, destructive actions. A warm rust-red that belongs to the same tonal family.

### Named Rules

**The Warm Black Rule.** Every dark surface is tinted toward 30-degree hue at 0.008 chroma. Never use pure #000. The difference is invisible to a glance and unmistakable to a trained eye.

## 3. Typography

**Display Font:** Playfair Display (with Georgia, serif fallback)
**Body Font:** DM Sans (with Inter, system-ui, sans-serif fallback)

**Character:** The pairing is editorial and warm. Playfair Display brings gravitas and romance to headings. DM Sans provides clean, readable body text that never competes with the serif. Together they feel like a fine-print invitation, not a web app.

### Hierarchy
- **Display** (600, clamp(2.5rem, 6vw, 4.5rem), 1.1): Event titles, hero headings. Only 1-2 per page.
- **Headline** (600, clamp(1.75rem, 4vw, 2.5rem), 1.15): Section headings, dialog titles.
- **Title** (500, clamp(1.25rem, 2.5vw, 1.5rem), 1.3): Card titles, event names in dashboard.
- **Body** (400, 0.9375rem, 1.6): Paragraphs, descriptions, upload status. Cap line length at 65–75ch.
- **Label** (600, 0.8125rem, 1.3, 0.04em letter-spacing): Button text, form labels, uppercase section headers (text-transform: uppercase).

### Named Rules

**The One Display Rule.** Display is reserved for the single most important heading per page. Everything else uses Headline or Title. Rarity gives it power.

## 4. Elevation

Memoire uses **tonal layering** instead of drop shadows. Depth is conveyed through lightness steps: page background at oklch(3.5%), surface dim at oklch(9%), surface bright at oklch(14%). The only shadow in the system is the `shadow-soft` (0 24px 70px rgba(0,0,0,0.8)) used exclusively for the photo lightbox, where the image needs to float above the dimmed backdrop.

**The Flat-By-Default Rule.** Surfaces sit flat at rest. Tonal layering provides hierarchy without shadow noise. The single shadow exception proves the rule: only the lightbox overlay earns a shadow, because it needs to feel like a physical photograph lifted off the page.

## 5. Components

### Buttons
- **Shape:** Pill-shaped (border-radius: 9999px). Generous and tactile.
- **Primary:** White background (oklch(100% 0 0)), warm-black text. Padding: 12px 24px. Hover: opacity 90%.
- **Secondary:** Surface-bright background (oklch(14% 0.008 30)), warm-white text. Hover: surface-dim.
- **Outline:** Transparent background, 1px border-dim stroke. Hover: surface-dim fill.
- **Ghost:** Transparent. Hover: surface-dim fill.
- **Size variants:** default (h-11, px-5), sm (h-9, px-3), icon (h-10, w-10).
- **Focus:** 2px solid ring color, 2px offset from background.

### Inputs / Fields
- **Shape:** Standard radius (16px). Feels soft and approachable.
- **Background:** Surface-bright (oklch(14% 0.008 30)). Border: 1px border-dim (oklch(22% 0.008 30)).
- **Padding:** 16px horizontal, 12px vertical.
- **Focus:** Ring shifts to warm-white border, 2px.
- **Placeholder:** Muted (oklch(70% 0.006 30)).
- **Disabled:** 50% opacity, no pointer events.

### Dialog (Modal)
- **Mobile:** Bottom-sheet style, rounded-t-3xl (24px top radius), slides up from bottom. Border-top: 1px border-dim.
- **Desktop:** Centered overlay, rounded-2xl (16px radius), full border.
- **Overlay:** Background at 80% opacity, backdrop-blur-sm.
- **Title:** Headline scale, Playfair Display, 600 weight.
- **Description:** Body scale, muted color.
- **Close button:** Top-right, rounded-[8px], muted icon, hover to full opacity.

### Cards
- **Event Cover Cards (Dashboard):** 3:4 aspect ratio, rounded-3xl (24px). Image fills background with gradient overlay (black/80 to black/20 to black/60). Title in white serif at title scale. Actions are ghost buttons with 40% black / 60% black hover.
- **Upload Cards (Event Page):** Standard radius (16px), border-dim stroke, surface-bright background. Layout: image thumbnail + file info + progress bars + status icon. Padding: 12px (scales to 16px).
- **Info Cards (Upload Status):** Standard radius (16px), border-dim stroke, surface-bright background. Internal padding: 20px.

### Upload Zone
- **Shape:** Standard radius (16px), dashed border at border-dim.
- **Background:** Surface-bright at 50% opacity.
- **State:** On drag, border shifts to 50% white, background shifts to 5% white fill. Subtle scale animation (1.02x).
- **Min height:** 16rem (256px). Centered icon + serif heading + muted caption.

### Photo Grid
- **Thumbnails:** Subtle radius (8px). Scale hover at 1.03x over 500ms.
- **Masonry:** 3 columns at default, 2 at 1024px, 1 at 640px.
- **Lightbox:** Full-screen overlay (95% black, backdrop-blur-md). Image centered with soft shadow. Arrow navigation at sides (circular ghost buttons, 40% black background). Download and close buttons top-right.

## 6. Do's and Don'ts

### Do:
- **Do** use warm-black (oklch(3.5% 0.008 30)) as the canvas. The tint matters.
- **Do** lead with serif typography for headings. Playfair Display is the voice.
- **Do** use tonal layers (surface-dim, surface-bright) for hierarchy instead of shadows.
- **Do** keep the palette restrained. One warm accent (the cover image) carries the color.
- **Do** animate with opacity + y-offset fades, ease-out-expo curves. No bounce.
- **Do** use generous rounded corners: 16px for inputs and cards, 24px for containers, pill for buttons.
- **Do** show the cover image full-bleed as the hero on every event page.
- **Do** make upload targets large, forgiving, and clearly labeled.

### Don't:
- **Don't** use pure black (#000) backgrounds. Every dark surface must carry warmth.
- **Don't** use pastels, script fonts, lace textures, doily ornamentation — overdone wedding site tropes.
- **Don't** use generic SaaS patterns: blue/white cards, heavy borders, corporate-minimal layout.
- **Don't** use social media patterns: Instagram grids, story circles, like/comment buttons.
- **Don't** use modals as a first resort for feedback or detail views — inline and progressive alternatives first.
- **Don't** use side-stripe borders (border-left or border-right >1px as colored accent).
- **Don't** use gradient text (background-clip: text).
- **Don't** animate CSS layout properties.
- **Don't** add cards inside cards.
