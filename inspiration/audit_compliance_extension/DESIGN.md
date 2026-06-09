---
name: Audit & Compliance Extension
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bfc6e0'
  primary: '#bfc6e0'
  on-primary: '#283044'
  primary-container: '#0b1326'
  on-primary-container: '#767e95'
  inverse-primary: '#565e74'
  secondary: '#c7c6cc'
  on-secondary: '#2f3035'
  secondary-container: '#46464c'
  on-secondary-container: '#b5b4bb'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00180d'
  on-tertiary-container: '#009063'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe2fd'
  primary-fixed-dim: '#bfc6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e3e1e8'
  secondary-fixed-dim: '#c7c6cc'
  on-secondary-fixed: '#1a1b20'
  on-secondary-fixed-variant: '#46464c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
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
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  metadata-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '450'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 32px
  stack-gap: 16px
  table-cell-padding: 12px 16px
  sidebar-width: 260px
---

## Brand & Style

This design system extension focuses on high-integrity investigation and regulatory oversight. The brand personality is **authoritative, meticulous, and transparent**, designed to evoke a sense of absolute reliability for compliance officers and system auditors. 

The aesthetic blends **Modern Corporate** structure with **Technical Minimalism**. It prioritizes extreme legibility and data density. By transitioning to a **Dark Mode** primary interface, the system enhances focus during deep-work investigative sessions, reducing glare and allowing critical status indicators to pop against the deep architectural background. The interface uses a high-contrast relationship between structural elements and content areas to focus the user's attention on the audit trail.

## Colors

The palette is anchored by the core **Deep Charcoal (#0b1326)**, which now serves as the primary background and structural foundation in this dark-themed environment. This provides a grounded, "command center" feel. Key highlights and primary text use **Soft Alabaster (#faf8ff)** to ensure high visibility against the dark canvas.

Status colors are refined to support a **monochrome-first premium feel**. While Emerald (#10b981), Amber, Rose, and Blue are utilized for functional signaling, they are applied with low-chroma backgrounds and high-contrast text to ensure they remain professional and integrated. 
- **Primary Surface:** #0b1326 (Main Background/Sidebar)
- **Contrast Surface:** #faf8ff (Primary Text/Highlights)
- **Data Borders:** #64748b (Subtle separation)

## Typography

This system uses a dual-type approach to distinguish between **narrative intent** and **technical data**.

- **Inter** handles all UI labels, navigation, and body copy. It provides a clean, neutral foundation that feels modern and accessible against the dark background. 
- **JetBrains Mono** is reserved strictly for technical metadata, including timestamps, IP addresses, UUIDs, and raw log outputs. This distinction allows auditors to scan for technical patterns instantly without visual interference from the surrounding UI text.

Use `label-caps` for table headers and section categorizers to maintain a structured, editorial feel.

## Layout & Spacing

The layout utilizes a **Structured Fluid Grid** optimized for data-heavy investigative workflows. 

- **Sidebar & Topbar:** Fixed at #0b1326 to create a persistent frame of reference. 
- **Content Area:** Uses a generous 32px outer padding to provide "visual breathing room" around high-density data tables.
- **Density:** Within data tables and log viewers, vertical padding is tightened to 12px to maximize information per screen (ATF). 
- **Breakpoints:** On desktop, use a 12-column grid. On tablet, collapse the sidebar into a compact icon-only rail to preserve horizontal space for data columns.

## Elevation & Depth

To maintain the premium dark aesthetic, this design system avoids heavy shadows. Depth is communicated through **Tonal Layering** and **Crisp Outlines**:

- **Level 0 (Floor):** #0b1326 (The main workspace background).
- **Level 1 (Cards/Tables):** A slightly elevated dark surface with a 1px solid border (#64748b).
- **Level 2 (Popovers/Search Suggestions):** Lighter surface tonal shifts with a 1px solid border for subtle separation.
- **Active State:** Use a 2px left-accent border in Tertiary Emerald (#10b981) for selected log entries.

## Shapes

The shape language is **Professional and Controlled**. 

- **Standard Elements:** Buttons, input fields, and cards use a 0.5rem (8px) radius to soften the technical edge of the data.
- **Technical Tags:** Small status chips and metadata badges use a 4px radius (`rounded-sm`) to feel more like "components" and less like "buttons."
- **Tables:** Table containers use a 12px radius on the outer wrapper with `overflow: hidden` to create a self-contained, object-like appearance on the workspace floor.

## Components

### Data Tables
Tables are the primary tool for the Audit module.
- **Headers:** Sticky headers with a 1px bottom border. Use `label-caps` typography.
- **Rows:** Alternating subtle zebra striping is prohibited; use hover states and thin 1px dividers.
- **Monospace Integration:** All data columns containing IDs or timestamps must use `metadata-code`.

### Status Badges
Used for compliance status (e.g., "Compliant", "Flagged").
- Style: Solid subtle background (10% opacity of the status color) with a bold 1px left-border accent of the full-strength color. This maintains the "monochrome-first" feel.

### Audit Log Viewer
A specialized component for raw system outputs.
- Background: Deep charcoal (matching the system theme).
- Font: JetBrains Mono at 13px.
- Syntax Highlighting: Use the Status colors (Emerald for Success, Rose for Errors/Failures).

### Search & Filter Bar
A persistent horizontal bar above data tables.
- Style: Minimalist with a focus on "pills" for active filters.
- Iconography: Use thin (2px) stroke icons to match Inter's weight.