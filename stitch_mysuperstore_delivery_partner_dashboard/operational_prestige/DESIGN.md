---
name: Operational Prestige
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  headline-lg:
    fontFamily: Work Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Work Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0em
  body-lg:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  label-caps:
    fontFamily: Work Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.15em
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin: 48px
  stack-xs: 4px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

This design system is built for high-stakes operational environments where precision meets prestige. The brand personality is authoritative yet restrained, evoking the feeling of a luxury Swiss watch or a high-end architectural firm. The emotional response should be one of absolute clarity and institutional trust.

The design style is **Extreme Minimalism** with a **Luxury Corporate** veneer. It relies on massive whitespace, razor-sharp edges, and a strict monochromatic foundation punctuated by high-luster metallic accents. By stripping away decorative elements, the system ensures that complex operational data remains the focal point, while the sophisticated color palette elevates the experience from a mere tool to a premium professional environment.

## Colors

The palette is anchored by **Pure White (#FFFFFF)** backgrounds and **Deep Black (#000000)** typography to ensure maximum legibility and a clinical, professional feel. 

The **Metallic Gold** is used sparingly as a "prestige" accent for high-value actions, active states, and critical branding elements. To achieve a "shiny" effect without looking like flat yellow or brown, the gold should be implemented using a subtle linear gradient: `linear-gradient(135deg, #BF953F 0%, #FCF6BA 45%, #B38728 70%, #FBF5B7 100%)`. This creates a light-reflective, lustrous quality that feels like polished brass or gold leaf. 

Functional status colors (success, error, warning) are neutralized; use icons and varied stroke weights rather than loud reds or greens to maintain the minimalist aesthetic.

## Typography

**Work Sans** is used exclusively across the design system to provide a grounded, systematic, and neutral foundation. The type scale is optimized for high-density operational dashboards.

Headlines use heavy weights and tight letter spacing to command attention against the white space. Body text is prioritized for readability with a generous 1.6 line-height. Small labels and metadata are set in all-caps with increased letter spacing (kerning) to mimic the engraving found on technical instruments, providing a distinct "engineered" feel. Use Deep Black for primary text and a 60% opacity black for secondary informational text.

## Layout & Spacing

This design system utilizes a **12-column fluid grid** for internal dashboard content and a **fixed container** for administrative settings. The layout philosophy is "density through discipline"—information is packed tightly within modules, but modules themselves are separated by significant "breathing room" (48px+).

A strict 8px spatial rhythm governs all padding and margins. Vertical stacking uses the `stack-lg` (48px) unit between major sections to prevent visual clutter, while `stack-xs` (4px) is used for tight associations between labels and their corresponding inputs.

## Elevation & Depth

To maintain a minimalist profile, the design system avoids traditional drop shadows. Instead, it utilizes **Bold Borders** and **Tonal Layering**.

- **Level 0 (Base):** Pure white background.
- **Level 1 (Modules):** Elements are defined by a 1px solid border in #F2F2F2. 
- **Level 2 (Active/Hover):** Transitions are signaled by a 1px solid Deep Black border.
- **Level 3 (Overlay):** Modals and flyouts use a hard 2px black border with a "ghost" offset—a single 4px solid shadow with 100% opacity in Metallic Gold, creating a "stacked card" effect without any blur.

Depth is communicated through structural lines rather than atmospheric shadows, ensuring the UI feels flat, fast, and high-performance.

## Shapes

The shape language is strictly **Sharp (0px)**. 

Every UI element—from buttons and input fields to cards and avatars—features right-angle corners. This geometric rigidity reinforces the professional, technical nature of the operations UI. It removes any softness or "consumer-grade" friendliness in favor of an aesthetic that feels structural, architectural, and precise.

## Components

- **Buttons:** Primary buttons are solid Deep Black with Pure White text. Secondary buttons are Pure White with a 1px Black border. "Prestige" actions (e.g., *Finalize*, *Submit*, *Upgrade*) use the Metallic Gold gradient background with Black text. All buttons have 0px border-radius.
- **Input Fields:** Minimalist underlines or 1px light grey borders. On focus, the border turns Deep Black. Error states are signaled by a 2px Black border and a small gold icon.
- **Chips/Status Tags:** All-caps text within a 1px border. No background fill. Use the Metallic Gold for "Active" or "Complete" states to make them feel rewarded.
- **Lists & Tables:** Data rows are separated by 1px #F2F2F2 lines. Table headers use the `label-caps` typography style. Hover states on rows use a very faint #F9F9F9 background tint.
- **Cards:** Cards have no shadows. They are defined by a 1px border. For featured "Operations Insight" cards, use a 4px top-border in the Metallic Gold gradient.
- **Checkboxes & Radios:** Sharp-edged squares and circles. When checked, the fill is Deep Black with a small Gold internal marker.
- **Progress Indicators:** Thin 2px lines. The background track is #F2F2F2 and the progress fill is the Metallic Gold gradient.