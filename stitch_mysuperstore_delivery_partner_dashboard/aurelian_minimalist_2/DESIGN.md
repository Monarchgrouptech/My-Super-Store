---
name: Aurelian Minimalist
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4d4635'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#7f7663'
  outline-variant: '#d0c5af'
  surface-tint: '#735c00'
  primary: '#735c00'
  on-primary: '#ffffff'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#e9c349'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#b2b3b3'
  on-tertiary-container: '#434546'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.02em
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is rooted in **High-Contrast Minimalism** with a focus on luxury and precision. It targets a premium audience that values clarity, authority, and exclusivity. The brand personality is disciplined yet opulent, utilizing a restricted color palette to ensure every intentional use of gold feels significant and high-value.

The visual language avoids unnecessary decoration, relying instead on "Architectural Layouts"—using generous white space and rigid alignment to create a sense of structural integrity. The emotional response is one of trust and sophistication, similar to a high-end fashion house or a private wealth management interface.

## Colors

This design system utilizes a high-contrast palette to establish a clear visual hierarchy.

- **Primary (Metallic Gold):** Used exclusively for primary call-to-actions, active states, and critical accents. It should be rendered with a subtle linear gradient (from `#D4AF37` to `#F4DF4E`) to simulate a metallic sheen.
- **Secondary (Deep Black):** Used for primary text, structural borders, and high-impact iconography.
- **Surface (Pure White & Light Gray):** Pure white (`#FFFFFF`) is the base for all primary containers. Light gray (`#F5F5F5`) is used for secondary surfaces, such as input fields and background sections, to provide soft dimensionality without breaking the minimalist aesthetic.
- **Status Colors:** Success, Error, and Warning states should be handled with thin, high-saturation strokes to maintain the professional tone without overwhelming the gold accents.

## Typography

The design system uses **Inter** for all levels of the hierarchy to maintain a clean, systematic, and modern appearance. 

- **Headlines:** Set in Bold with tight letter-spacing to create a "locked-in" professional look. Large headlines should be Deep Black.
- **Body Text:** Optimized for readability with a generous line-height. Use Deep Black for primary content and a dark gray (70% opacity black) for secondary descriptions.
- **Labels:** Small-scale labels use uppercase styling with increased letter spacing to denote metadata and category headers, reflecting an editorial aesthetic.

## Layout & Spacing

This design system follows a **Fixed Grid** model for desktop (12 columns, 1200px max-width) and a fluid model for mobile. 

The spacing rhythm is based on an 8px modular scale. Emphasis is placed on "Macro-spacing" (using `lg` and `xl` units) between major sections to emphasize the premium nature of the content. Elements should be aligned strictly to the grid to maintain a disciplined, architectural feel. Gutters are kept wide (`24px`) to ensure the high-contrast elements have room to breathe.

## Elevation & Depth

The design system eschews traditional shadows in favor of **Tonal Layering** and **High-Contrast Outlines**.

- **Surfaces:** Depth is created by placing white cards on light gray backgrounds. 
- **Borders:** Use 1px solid Deep Black or Light Gray borders to define containers.
- **Interactions:** Elevation is signaled by a change in border weight (from 1px to 2px) or by swapping a white fill for a metallic gold fill.
- **Shadows:** If absolutely necessary for modals, use a "Hard Shadow"—a sharp, non-blurred offset shadow in 10% opacity black to mimic a physical paper stack.

## Shapes

The design system employs **Sharp (0px)** roundedness. Every element—from buttons and input fields to cards and images—must have 90-degree corners. This evokes a sense of precision, technical excellence, and high-end architectural design. Pill shapes and soft corners are strictly prohibited to maintain the professional, high-contrast aesthetic.

## Components

- **Buttons:** Primary buttons feature a Metallic Gold gradient background with Deep Black text. Secondary buttons are white with a 1px Deep Black border. All buttons use the Sharp (0px) shape.
- **Input Fields:** Use a Light Gray background (`#F5F5F5`) with a 1px bottom-border only in Deep Black. Labels sit above the field in `label-caps` typography.
- **Cards:** White background with a 1px Light Gray border. On hover, the border becomes Deep Black or Metallic Gold. No drop shadows.
- **Chips:** Small, sharp-edged rectangles with a Deep Black background and White text for high contrast.
- **Lists:** Separated by thin 1px Light Gray horizontal rules. Use Chevron icons in Metallic Gold to indicate drill-down actions.
- **Checkboxes/Radios:** Square (0px roundedness) with a Deep Black border. When active, they are filled with Metallic Gold and a black checkmark/inset.
- **Navigation:** A clean top bar with Deep Black links. The active state is indicated by a 2px Metallic Gold underline.