---
name: Logistics Intelligence Visual System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dbe2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#424656'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737687'
  outline-variant: '#c2c6d9'
  surface-tint: '#0053da'
  primary: '#004cca'
  on-primary: '#ffffff'
  primary-container: '#0062ff'
  on-primary-container: '#f3f3ff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#7b4d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c6300'
  on-tertiary-container: '#fff2e7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dbe2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-stats:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
This design system establishes a high-performance, executive-grade environment for logistics analytics. It balances the utilitarian needs of supply chain management with the refined aesthetic of modern developer tools and fintech platforms. 

The visual direction is **Corporate / Modern** with a lean toward **Minimalism**. It utilizes a "split-personality" color strategy: a deep, immersive dark workspace for navigation to minimize eye strain and establish authority, contrasted with a crisp, airy light workspace for data interpretation. The emotional response should be one of absolute clarity, precision, and "calm control" over complex global data.

## Colors
This design system employs a sophisticated multi-tier palette.

- **Navigation (Sidebar/Topbar):** Uses the Neutral base (`#0B1326`). Text and icons within these areas must utilize high-contrast whites (`#FFFFFF`) and light grays (`#94A3B8`) to maintain an "Executive Dark" aesthetic.
- **Content Area:** A neutral, light background (`#F8FAFC`) ensures that multi-colored data visualizations remain the focal point without competing with the UI.
- **Data Visualization:** The palette is functional. **Primary Blue** represents standard flow and volume; **Emerald** indicates growth, efficiency, and success; **Amber** is reserved for bottlenecks or warnings. **Muted Slates** are used for background data or historical comparisons to provide context without clutter.

## Typography
**Inter** is the foundational typeface, chosen for its exceptional legibility in data-heavy interfaces. 

- **Headlines:** Utilize tighter letter-spacing and heavier weights to create a sense of importance and "Linear-style" precision.
- **Body:** Standardized at 14px for enterprise density while maintaining 16px for long-form reports to ensure readability.
- **Labels:** Small caps or all-caps with increased letter-spacing are used for table headers and category descriptors to differentiate them from actionable data.
- **Tabular Numbers:** While the primary font is Inter, specific monospaced numeric overrides (via font-variant-numeric: tabular-nums or JetBrains Mono for specific code/ID strings) are used in tables to ensure vertical alignment of digits.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains fixed (240px), while the content area utilizes a 12-column fluid grid that caps at 1440px to prevent excessive line lengths in data tables.

- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **KPI Grid:** On desktop, KPI cards span 3 columns (4 per row). On tablet, they span 6 columns. On mobile, they stack vertically.
- **Density:** The design system prioritizes "High-Density Readability." Margins are generous (24px) to provide breathing room, but internal component padding is tight (12px - 16px) to maximize information density.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Ambient Shadows**.

1.  **Level 0 (Background):** The light gray surface (`#F8FAFC`).
2.  **Level 1 (Cards/Tables):** Pure white surfaces (`#FFFFFF`) with a subtle 1px border (`#E2E8F0`) and a soft, highly-diffused shadow (Y: 2px, Blur: 4px, Color: `rgba(0,0,0,0.04)`).
3.  **Level 2 (Dropdowns/Modals):** Higher contrast shadows with a 10% tint of the primary neutral color to create a sense of floating above the analytics dashboard.
4.  **Navigation:** The sidebar uses no shadows, instead relying on its dark fill to separate it from the content area, creating a "Stage" effect for the data.

## Shapes
Following the `ROUND_EIGHT` philosophy, this design system uses a consistent **8px (0.5rem)** radius for all primary containers (Cards, Input Fields, Buttons). 

- **Small elements (Chips/Checkboxes):** Use 4px for a sharper, more technical feel.
- **Large elements (Modals):** Use 12px to soften the presence of intrusive UI.
- **Interactive States:** Use a 2px stroke for focused states, matching the roundedness of the container to create a perfect "halo" effect.

## Components

### KPI Cards
Cards feature a large-format metric (Inter Bold) with a secondary "trend" indicator directly beneath or adjacent. Trends use a pill-shaped background (e.g., light green tint with dark green text) to indicate positive/negative movement at a glance.

### Data Tables
Tables are designed for high density. Row height is set to 48px. Headers use `label-md` with a subtle background tint (`#F1F5F9`). Row separators are 1px solid (`#F1F5F9`). Hover states trigger a subtle color shift to `#F8FAFC`.

### Charts & Visuals
Charts should omit heavy grid lines, using only essential Y-axis markers. Lines should have a 2px stroke width. Points on a line chart should only appear on hover to keep the "premium" clean aesthetic.

### Buttons
Primary buttons are solid `#0062FF` with white text. Secondary buttons use a white background with a subtle border. All buttons use 8px roundedness and `body-md` semibold typography.

### Input Fields
Inputs use a white background, 8px radius, and a 1px border. On focus, the border transitions to Primary Blue with a soft blue outer glow (3px spread). Labels are always positioned above the field using `label-sm`.