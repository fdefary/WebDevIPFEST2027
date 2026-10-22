---
name: IPFEST 2027
description: A cinematic celestial identity built from midnight navy, warm ivory, orbiting lines, and muted gold.
colors:
  primary: "#16213E"
  secondary: "#D97706"
  tertiary: "#E6C72A"
  neutral-bg: "#F8F5F2"
  neutral-mid: "#6C677D"
typography:
  display:
    fontFamily: "Plus Jakarta Sans SemiBold, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans SemiBold, sans-serif"
    fontWeight: 600
  title:
    fontFamily: "Safira March, Playfair Display, serif"
    fontWeight: 400
  body:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  script:
    fontFamily: "Great Vibes, cursive"
    fontWeight: 400
rounded:
  sm: "6px"
  lg: "28px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
  button-primary-hover:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
  surface-card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.lg}"
---

# Design System: IPFEST 2027

## Overview

**Creative North Star: “Celestial Grand”**

IPFEST 2027 pairs a cinematic night-sky atmosphere with a refined editorial voice. Midnight navy and the supplied wave background establish depth; orbit lines, nodes, and star-like accents suggest energy, connection, and exploration. Warm ivory protects readability, while muted gold and burnt orange act as controlled light sources rather than broad decorative fills.

The identity should feel **cinematic and refined**, with **layered, luminous** surfaces and confident, polished controls. Use the Grand Design Board as the visual reference; the page implementation and supplied assets are the source of truth for exact colors and behavior.

**Key Characteristics:**
- Celestial motion expressed through orbit lines and nodes.
- Editorial serif display balanced by a legible Poppins body face.
- Navy-first surfaces, warm ivory content panels, restrained gold/orange accents.
- Real IPFEST identity assets take precedence over recreated marks.

## Colors

The palette moves from a deep celestial foundation to warm paper neutrals, with orange and gold reserved for emphasis and light.

### Primary
- **Midnight Navy** (`{colors.primary}`): Main dark canvas, overlays, navigation, and primary actions.

### Secondary
- **Burnt Orange** (`{colors.secondary}`): Warm emphasis, selected highlights, and energetic accent details.

### Tertiary
- **Muted Gold** (`{colors.tertiary}`): Orbit lines, focus and active states, dividers, and luminous details.

### Neutral
- **Warm Ivory** (`{colors.neutral-bg}`): Light content surfaces and text on dark backgrounds.
- **Slate Grey** (`{colors.neutral-mid}`): Secondary text and quiet supporting information.

**The Light-Source Rule.** Gold and orange should read as light and emphasis; do not let them replace navy or ivory as the dominant surface colors.

## Typography

**Display and section headings:** Plus Jakarta Sans SemiBold, self-hosted from `PlusJakartaSans-SemiBold.ttf`.
**Body Font:** Poppins, with a sans-serif fallback.
**Label Font:** Poppins; use medium weight for navigation and controls.
**Supporting Fonts:** Dream Avenue only for selected expressive accents; Safira March for rare decorative titles; Great Vibes for occasional script accents.

**Character:** Plus Jakarta Sans gives headings a confident contemporary voice. Poppins keeps information and controls clear at practical sizes; Dream Avenue, Safira March, and Great Vibes are limited accents, not default heading or body faces.

### Hierarchy
- **Display** (Plus Jakarta Sans SemiBold, 600, responsive `clamp(2.5rem, 6vw, 4rem)`, line-height 1): Hero and signature campaign headings.
- **Headline** (Plus Jakarta Sans SemiBold, 600): Section headings and editorial statements.
- **Title** (Safira March, regular): Selective subheadings and ornamental title moments.
- **Body** (Poppins, regular, `1rem`, line-height `1.5`): Paragraphs, labels, and supporting copy.
- **Label** (Poppins, medium): Navigation, buttons, and compact controls; preserve readable contrast and avoid excessive tracking.

### Font Assets
- `public/static/fonts/Dream-Avenue.ttf`
- `public/static/fonts/Safira-March.ttf`
- `public/static/fonts/PlayfairDisplay-Regular.ttf`
- `public/static/fonts/poppins.regular.ttf`
- `public/static/fonts/GreatVibes-Regular.ttf`
- `public/static/fonts/PlusJakartaSans-SemiBold.ttf` is the default heading face. `Solomon Sans Bold.otf` / `Solomon Sans Normal.otf` remain alternate assets.

The current theme stylesheet references `DreamAvenue.ttf` and `SafiraMarch.ttf`; the supplied filenames include hyphens. Keep `@font-face` URLs aligned with the actual filenames so these display faces load instead of silently falling back.

## Layout

Use the existing Bootstrap container and grid as the responsive foundation. Keep desktop compositions spacious and editorial, then stack content into a single readable column on narrow screens. Use `public/static/images/ipfest-background.jpg` as the **only page background**: centered and cover the viewport. Do not add gradients, color washes, patterns, or other images behind the page. Keep content on distinct surfaces where needed for contrast.

Use the supplied visual assets as a coherent kit:
- `public/static/images/ipfest-background.jpg` — full-page wave background.
- `public/static/images/ipfest_2027_logo.png`, `ipfest_2027_text.png`, and `ipfest_2027_logo_footer.png` — official brand lockups for header and footer contexts.
- `public/static/images/ipfest_2027_mascot.png` — mascot moments; keep clear space around the mark.
- `public/static/images/Elements/Lines/` — orbit and movement motifs.
- `public/static/images/Elements/Nodes/` — connection points and luminous nodes.
- `public/static/images/Elements/Other/` — supporting decorative assets; use selectively.
- `public/static/images/Grand Design Board.webp` — visual reference board, not a page background.

## Elevation & Depth

Depth is layered and luminous: the wave image and navy veil form the base, while ivory panels, fine gold borders, and soft offset shadows distinguish content. Reserve brighter glows for meaningful emphasis or interaction; do not add a glow to every element. Existing examples include a soft panel shadow (`0 10px 30px rgba(0, 0, 0, .25)`) and a structural service-card shadow (`0 18px 40px rgba(0, 0, 0, .3)`).

**The One-Luminous-Layer Rule.** Within a component, use one clear elevation cue—tonal separation, border, or shadow—before stacking effects.

## Shapes

Use clean rounded rectangles for content panels (the existing feature-card treatment uses `28px`) and small controls with modest corners (Bootstrap-sized, approximately `6px`). Circular nodes and organic flowing silhouettes belong to the supplied celestial graphic language. Avoid turning large content areas into pills or adding unrelated geometric decoration.

## Components

### Buttons
- **Character:** Confident and polished; the action should read before its ornament.
- **Primary:** Midnight Navy surface with Warm Ivory text and a modest corner; the existing hover state switches to Muted Gold with navy text.
- **Focus:** Keep a visible keyboard focus ring using Muted Gold; do not rely on color change alone.

### Cards / Containers
- **Character:** Layered content panels against the dark canvas.
- **Background:** Warm Ivory for reading-heavy content; translucent navy/ivory treatments only where the background remains legible.
- **Shape:** Rounded corners, with the larger feature treatment at `28px`.
- **Depth:** One soft offset shadow or fine gold border, not both by default.

### Inputs / Fields
- **Character:** Quiet and clear, with legible labels and ample hit area.
- **Style:** Light field surfaces on dark pages; use a restrained navy border and modest corners.
- **Focus:** Visible gold outline or border shift with sufficient contrast.
- **Error / Disabled:** Keep error copy explicit; disabled states remain visibly distinct without relying only on opacity.

### Navigation
- **Character:** Calm, compact, and brand-forward.
- **Style:** Use the official logo lockup; active, hover, and focus states use Muted Gold against the navy/ivory navigation surface.
- **Responsive:** Preserve the existing Bootstrap collapse behavior and generous touch targets.

### Celestial Elements
- Use the supplied Lines and Nodes assets to frame or connect content, not to compete with it. Keep decorative assets non-interactive and hide them from assistive technology when they convey no information.

### Section Headings
- Keep section headings short and direct, such as “Pilih Kompetisi”, “Ketua Tim”, and “Pembuatan Akun”.
- Put instructions and context in a brief supporting sentence below the heading, not inside a long heading.

## Do's and Don'ts

### Do:
- **Do** use the exact palette and the supplied Grand Design Board as the visual authority.
- **Do** source official logos, mascot, background, and decorative elements from `public/static/images/` rather than redrawing them.
- **Do** pair expressive display typography with Poppins for readable interface copy.
- **Do** preserve contrast over the image background with a navy overlay or a solid content panel.
- **Do** ensure local font URLs match the supplied filenames.

### Don't:
- **Don't** use Dream Avenue, Safira March, or Great Vibes as the default for headings, body copy, or controls; reserve them for occasional expressive accents.
- **Don't** stretch, recolor, crop tightly, or add effects to official logo assets.
- **Don't** use orbit lines, nodes, mascot, or gold accents as wallpaper behind dense text.
- **Don't** use Great Vibes for long text, labels, or controls.
- **Don't** add generic purple gradients, dotted-halftone overlays, or unrelated decorative patterns to this identity.
