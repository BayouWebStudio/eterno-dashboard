# Eterno Dashboard — Design Brainstorm

<response>
<text>

## Idea 1: "Dark Forge" — Industrial Craft Aesthetic

**Design Movement**: Neo-Industrial meets Dark UI — inspired by high-end creative tools like Figma's dark mode, Ableton Live, and professional tattoo machine aesthetics.

**Core Principles**:
1. Tool-first density — every pixel earns its place; no decorative fluff
2. Warm metallics on cold carbon — gold/amber accents on near-black surfaces
3. Tactile depth — surfaces feel layered like stacked metal plates
4. Precision typography — monospaced accents mixed with clean sans-serif

**Color Philosophy**: The palette draws from the tattoo studio itself — carbon black workbenches, brass machine frames, warm tungsten lighting. The gold (#C9A84C) from the original brand stays as the primary accent, but surfaces shift between 3-4 distinct dark tones (not just one flat black) to create architectural depth. Danger states use a muted rust-red, success uses a warm sage green.

**Layout Paradigm**: Left-anchored vertical sidebar navigation (collapsible to icon-only) with a persistent header strip. The main content area uses a master-detail pattern: section list on the left third, editor panel on the right two-thirds. No centered layouts — everything aligns to a strong left edge.

**Signature Elements**:
1. "Etched" dividers — thin gold lines with subtle gradient fade-outs, like engraved metal
2. Section cards with a visible left-edge accent bar (gold for active, dim for inactive)
3. Micro-dot grid pattern on empty/background areas, like tattoo transfer paper

**Interaction Philosophy**: Interactions feel mechanical and precise — no bouncy animations. Clicks produce immediate, crisp state changes. Hover states reveal subtle gold underlighting. Transitions are fast (150ms) with ease-out curves. Drag-and-drop for gallery reordering uses a "lifted plate" shadow effect.

**Animation**: Enter animations use translateY(8px) → 0 with opacity fade, staggered by 30ms per element. Tab switches use a horizontal slide. Save confirmations pulse the gold accent once. Loading states use a rotating gear icon, not a generic spinner.

**Typography System**: 
- Headings: "Syne" (already in the original) at 700 weight — bold, geometric, distinctive
- Body: "Inter" at 400/500 — clean and readable at small sizes
- Monospace accents: "JetBrains Mono" for slugs, URLs, code-like values
- Hierarchy: 11px labels (uppercase, tracked) → 13px body → 15px section titles → 20px page titles

</text>
<probability>0.08</probability>
</response>

<response>
<text>

## Idea 2: "Atelier" — Refined Studio Aesthetic

**Design Movement**: Swiss Minimalism meets Japanese Wabi-Sabi — clean grids with organic warmth, inspired by Notion's restraint and Squarespace's editorial quality.

**Core Principles**:
1. Generous negative space — content breathes, nothing feels cramped
2. Warm neutrals — no pure black or white; everything has a warm undertone
3. Typography as architecture — type size and weight create hierarchy, not color
4. Quiet confidence — the interface recedes so the user's content shines

**Color Philosophy**: A warm off-white (#FAF8F5) background with charcoal (#2A2520) text creates a paper-like reading experience. The gold accent becomes more muted and earthy — closer to aged brass (#B8A04A). Surfaces use cream (#F2EDE6) and warm stone (#E8E0D6). This palette evokes a high-end tattoo studio's waiting room: warm wood, matte finishes, curated art books.

**Layout Paradigm**: Top navigation bar with horizontal tabs (matching the original flow users know). Below, a single-column content area with generous max-width (720px for editors, 960px for overview). Section editors stack vertically as expandable accordion cards. No sidebar — the simplicity of a single column keeps focus on one task at a time.

**Signature Elements**:
1. Hairline borders with rounded corners (2px) — delicate, not chunky
2. Subtle paper texture overlay on the background (CSS noise filter at 2% opacity)
3. Section cards with a small circular icon badge floating on the top-left corner

**Interaction Philosophy**: Everything feels gentle and considered. Hover states add a warm blush tint. Transitions are smooth and slightly slow (250ms) with ease-in-out curves, like turning a page. Focus states use a warm gold outline. The interface never startles — no sudden jumps or flashes.

**Animation**: Accordion sections expand with a smooth height transition + content fade-in. Page transitions use a subtle crossfade. Toast notifications slide in from the bottom-right with a gentle bounce. Loading states use three pulsing dots in the gold accent color.

**Typography System**:
- Headings: "Playfair Display" at 600 — editorial, serif, sophisticated
- Body: "DM Sans" at 400/500 — modern, warm, highly readable
- Labels: "DM Sans" at 500, 11px, uppercase with 1.5px tracking
- Hierarchy: 11px labels → 14px body → 18px section titles → 28px page titles

</text>
<probability>0.05</probability>
</response>

<response>
<text>

## Idea 3: "Command Center" — Asymmetric Dashboard Aesthetic

**Design Movement**: Brutalist Data Design meets Cyberpunk utility — inspired by Bloomberg Terminal, Vercel's dashboard, and racing telemetry screens. Function is the aesthetic.

**Core Principles**:
1. Information density without clutter — show more, scroll less
2. Asymmetric grid layouts — break the monotony of equal columns
3. Status-driven color — color is reserved for meaning (success, warning, active)
4. Monochrome base with surgical accent hits

**Color Philosophy**: Near-black background (#0B0E11) with cool gray surfaces (#14181D, #1A1F26). The gold accent is used sparingly — only for active states, primary actions, and the brand mark. Most text is a cool silver (#C8CDD4) with muted steel (#6B7280) for secondary content. This creates a "lights off, screens on" atmosphere where every gold element demands attention because it's rare.

**Layout Paradigm**: Three-column asymmetric grid on desktop. Left column (240px fixed): navigation + site info summary. Center column (flexible): main editor/content area. Right column (280px): contextual panel showing live preview thumbnail, recent changes feed, or Mint AI chat. On tablet, the right column collapses into a slide-over. On mobile, single column with bottom tab bar.

**Signature Elements**:
1. Glowing edge highlights — active cards get a 1px gold border with a subtle box-shadow glow
2. Status indicators as colored dots (green=live, amber=saving, red=error) in the header
3. Terminal-style status bar at the very bottom showing "Last saved: 2m ago · Site: live · Plan: Pro"

**Interaction Philosophy**: Interactions are instant and decisive. No confirmation dialogs for saves — instead, optimistic updates with undo toasts. Keyboard shortcuts for power users (Cmd+S to save, Cmd+K for command palette). Right-click context menus on gallery items. The interface rewards speed and muscle memory.

**Animation**: Minimal and functional. State changes happen in 100ms. New content fades in at 120ms. The only "decorative" animation is a subtle pulse on the save button when there are unsaved changes. Gallery drag uses a sharp snap-to-grid. Loading uses a thin gold progress bar at the top of the viewport (like YouTube/GitHub).

**Typography System**:
- Headings: "Space Grotesk" at 600/700 — geometric, technical, modern
- Body: "IBM Plex Sans" at 400/500 — designed for data-dense interfaces
- Monospace: "IBM Plex Mono" for URLs, slugs, timestamps, code
- Hierarchy: 10px status text → 12px body → 14px section titles → 18px page titles → tiny, dense, efficient

</text>
<probability>0.07</probability>
</response>
