---
name: Core Logistics System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#62df7d'
  on-secondary: '#003914'
  secondary-container: '#1ca64d'
  on-secondary-container: '#003111'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1'
    letterSpacing: -0.01em
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
  xl: 32px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is engineered for high-performance logistics and inventory management. The brand personality is authoritative yet frictionless, balancing the complexity of multi-warehouse operations with a streamlined, developer-centric aesthetic. 

The visual style draws from **Modern Corporate** and **Minimalist** influences, specifically leaning into the "Linear-esque" utility: high information density, precise geometry, and subtle depth. It prioritizes clarity over decoration, ensuring that warehouse managers and operations directors can process vast amounts of real-time data without cognitive overload. The emotional response should be one of total control, reliability, and modern efficiency.

## Colors

The color palette is rooted in functional utility and optimized for a high-performance **Dark Mode** environment. The **Primary Blue** (#2563EB) is used for high-priority actions and navigation, signaling "system intent." Status-based colors—Secondary Green (#16A34A) and Tertiary Amber (#F59E0B)—are used strictly for inventory health, shipment statuses, and critical alerts to maintain their semantic power.

For the background and surface architecture, the system employs a deep neutral scale based on #0F172A. In this dark mode configuration, utilize deep slates and midnight tones for the primary UI background to reduce eye strain during long shifts in warehouse environments. Surfaces are layered using slightly lighter tonal variations to create hierarchy and separation between navigation, workspace, and data panels.

## Typography

**Inter** serves as the primary typeface for its exceptional legibility and neutral character, crucial for data-heavy SaaS interfaces. For technical data points such as SKU numbers, tracking IDs, and warehouse coordinates, **JetBrains Mono** is utilized to ensure clear character differentiation (e.g., distinguishing '0' from 'O').

Hierarchy is established through weight and scale. Headlines use tighter letter spacing and heavier weights to command attention, while body text maintains a generous line height for readability. Small labels and badges use medium weights to remain legible at reduced sizes.

## Layout & Spacing

The design system utilizes a **12-column fluid grid** for desktop, optimized for 1440px viewports. It employs a strict 4px baseline grid to ensure mathematical alignment across all components. 

- **Density:** High density is maintained by using the `md` (16px) spacing unit for internal card padding and the `sm` (8px) unit for grouped form elements. 
- **Adaptivity:** On tablets, the grid shifts to 8 columns with 16px margins. On mobile, it collapses to a single column with 16px margins.
- **Data Tables:** Tables are the core of this system; they should occupy the full width of their containers, utilizing "sticky" headers and the first column to maintain context during horizontal scrolling of rich data sets.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Ambient Shadows** to create a structured sense of depth without looking cluttered in its dark environment. 

1.  **Level 0 (Background):** Base neutral-dark (#0F172A) background.
2.  **Level 1 (Cards/Surfaces):** Slightly lighter slate surfaces with a 1px border and a soft, low-opacity shadow to provide lift against the dark background.
3.  **Level 2 (Active/Hover):** Slightly more pronounced shadow and increased border brightness to indicate interactivity.
4.  **Level 3 (Modals/Overlays):** Elevated with a diffused shadow and a backdrop blur of 8px to focus the user’s attention on the task at hand, ensuring content pops against the dark base.

## Shapes

The system uses a **Rounded** shape language to soften the industrial nature of the data. 

- **Small Components:** Checkboxes and small tags use a 4px (0.25rem) radius.
- **Standard Components:** Buttons, input fields, and standard alerts use an 8px (0.5rem) radius.
- **Containers:** Main cards, warehouse modules, and dashboard widgets use a 12px (0.75rem) or 16px (1rem) radius to create a distinct, modern container feel.
- **Pills:** Status badges and "Active" indicators use a fully rounded (pill) shape to differentiate them from actionable buttons.

## Components

- **Buttons:** Follow MD3 principles with high-contrast primary buttons (solid blue #2563EB) and secondary buttons using subtle ghost borders or tonal backgrounds.
- **Data Tables:** High-density rows (40px height) with subtle zebra striping. Include status badges for "In Transit," "Low Stock," or "Pick-in-Progress."
- **Input Fields:** Outlined style with 1px borders. Focused states use a 2px primary blue border with a subtle 4px outer glow.
- **Inventory Cards:** Large 12px+ rounded corners, featuring a "Quick View" metric (e.g., Total Units) in the top right and a Sparkline chart showing inventory trends at the bottom.
- **Navigation:** A sleek left-hand sidebar using "collapsed" and "expanded" states, utilizing crisp, 2px stroke-width iconography.
- **Chips/Badges:** Small, uppercase labels with low-opacity background tints (e.g., 10% opacity of the status color) for categorizing warehouse zones.