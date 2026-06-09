---
name: LIVS Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394e'
  surface-container-lowest: '#060d20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3e'
  surface-container-highest: '#2d3449'
  on-surface: '#dbe2fd'
  on-surface-variant: '#c2c6d9'
  inverse-surface: '#dbe2fd'
  inverse-on-surface: '#283044'
  outline: '#8c90a2'
  outline-variant: '#424656'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#0062ff'
  on-primary-container: '#f3f3ff'
  inverse-primary: '#0053da'
  secondary: '#b2c8e8'
  on-secondary: '#1b324b'
  secondary-container: '#324863'
  on-secondary-container: '#a0b7d6'
  tertiary: '#2adae9'
  on-tertiary: '#00363b'
  tertiary-container: '#007b84'
  on-tertiary-container: '#d4faff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#b2c8e8'
  on-secondary-fixed: '#021d35'
  on-secondary-fixed-variant: '#324863'
  tertiary-fixed: '#85f3ff'
  tertiary-fixed-dim: '#2adae9'
  on-tertiary-fixed: '#002023'
  on-tertiary-fixed-variant: '#004f55'
  background: '#0b1326'
  on-background: '#dbe2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
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
  mono-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
---

## Brand & Style

This design system is a high-performance, dark-mode evolution focused on logistics intelligence and data density. The brand personality is precise, authoritative, and mission-critical. It is designed for operators and analysts who require long-duration focus without eye strain.

The design style is **Corporate / Modern** with a lean toward **Minimalism**. It prioritizes data integrity and rapid scanning through a systematic hierarchy. The aesthetic is "Control Room Professional"—utilizing deep spatial depth and vibrant, functional accents to highlight anomalies and critical pathways in global supply chains.

## Colors

The palette is anchored by a deep charcoal and navy base to provide a stable foundation for high-density information. 

- **Primary Blue (#0062FF):** Reserved for primary actions, active states, and critical data paths.
- **Secondary Navy (#3A506B):** Used for structural elements, borders, and subtle grouping.
- **Tertiary Cyan (#00CFDE):** Employed for success states and positive trend data visualizations.
- **Neutral / Surface:** Layers are built using varying shades of navy-tinted charcoal to create a sense of depth without relying on pure blacks.
- **Accessibility:** All data-carrying text must maintain a minimum 4.5:1 contrast ratio against the surface.

## Typography

This design system utilizes **Inter** exclusively to leverage its exceptional legibility in digital interfaces and data-heavy environments. 

- **Hierarchy:** Use bold weights for headers to anchor the eye. 
- **Data Clarity:** For numerical data in tables and dashboards, use `mono-data` (utilizing Inter's tabular lining OpenType features) to ensure numbers align vertically for easier comparison.
- **Micro-copy:** Labels use all-caps with increased letter spacing to distinguish metadata from content.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strict 4px baseline rhythm. 

- **Desktop:** 12-column grid with 24px (1.5rem) gutters. Content is typically contained in a max-width of 1440px for dashboard views.
- **Mobile:** 4-column grid with 16px (1rem) margins.
- **Density:** In "Intelligence" views (tables/charts), spacing is condensed (sm/md) to maximize information density. In "Management" views (settings/forms), spacing is expanded (lg) to improve focus.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and subtle luminosity, rather than heavy shadows.

- **Level 0 (Background):** #0B1326 – The canvas.
- **Level 1 (Cards/Sidebar):** #161E2E – Default surface for content grouping.
- **Level 2 (Modals/Popovers):** #1F2937 – The highest surface, using a subtle 1px border (#3A506B) to define edges against darker backgrounds.
- **Focus States:** Primary Blue (#0062FF) glows are used sparingly to indicate active selection, creating a "soft light" effect.

## Shapes

The design system employs a **Rounded** (8px / 0.5rem) shape language to balance the technical nature of logistics with a modern, approachable feel.

- **Buttons & Inputs:** 8px (0.5rem) corner radius.
- **Large Containers/Cards:** 16px (1rem) corner radius.
- **Tags/Chips:** 4px (0.25rem) for a tighter, more "industrial" look, or fully pill-shaped for status indicators.

## Components

- **Buttons:** Primary buttons use a solid Primary Blue fill with white text. Secondary buttons use a ghost style with a navy border.
- **Input Fields:** Darker than the surface (#0B1326) with a subtle 1px navy border. On focus, the border shifts to Primary Blue with a 2px outer glow.
- **Data Tables:** Zebra-striping is avoided; instead, use thin 1px horizontal dividers. Header rows should have a slightly darker background for clear separation.
- **Charts:** Use a custom "Intelligence Palette": Primary Blue (current data), Tertiary Cyan (optimal/target), Amber (delay), and Crimson (blockage).
- **Status Chips:** Use low-opacity background fills with high-opacity text colors (e.g., Success = 10% Cyan fill, 100% Cyan text) for better legibility on dark surfaces.