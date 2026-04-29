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
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is built on a foundation of "Luxurious Minimalism." It targets a high-end professional audience that values clarity, precision, and a sense of exclusivity. The visual narrative is driven by extreme contrast: the starkness of deep blacks and pure whites meeting the warmth of polished gold.

The style blends **Minimalism** with subtle **Tactile** accents. While the overall interface remains flat and systematic to ensure professional utility, key interactive elements utilize light-refractive properties to mimic physical metal. The emotional response should be one of "quiet confidence"—uncluttered and high-functioning, yet undeniably premium.

## Colors

The palette is strictly limited to maintain a high-fashion, professional aesthetic. 

- **Pure White (#FFFFFF):** The primary surface color, used to create vast whitespace and a "gallery" feel.
- **Deep Black (#000000):** Used for primary text, iconography, and structural borders to provide a grounding force.
- **Shiny Metallic Gold (#D4AF37):** Reserved for high-intent actions, progress indicators, and active states. It must never appear flat when used as a primary button; instead, it uses a three-point linear gradient to simulate a metallic sheen.
- **Neutral Silver/Grey (#F5F5F5):** Used sparingly for secondary containers or disabled states to avoid competing with the gold.

## Typography

This design system utilizes **Inter** exclusively to lean into a systematic, Swiss-inspired aesthetic. 

- **Headlines:** Set with tighter letter-spacing and heavier weights to create a sense of authority. 
- **Labels:** Small caps or uppercase with increased letter-spacing are used for eyebrows and metadata to mimic luxury branding.
- **Body:** Generous line-height is prioritized for readability against the high-contrast background.
- **Hierarchy:** Contrast is achieved through weight (Bold vs. Regular) and size rather than color shifts, keeping the interface monochromatic except for gold accents.

## Layout & Spacing

The design system employs a **Fixed Grid** philosophy for desktop (12 columns, 1200px max-width) and a fluid model for mobile. 

The rhythm is defined by an 8px base unit. To maintain a premium feel, "Over-spacing" is encouraged; specifically, using `lg` (48px) and `xl` (80px) vertical padding between sections to allow the content to breathe. Gutters are kept tight (24px) to ensure the high-contrast elements feel structurally connected.

## Elevation & Depth

Depth is achieved through **Tonal Layers** and **Low-contrast Outlines** rather than heavy shadows.

- **Level 0 (Floor):** Pure White (#FFFFFF).
- **Level 1 (Cards/Containers):** Pure White with a 1px solid Deep Black (#000000) border at 5-10% opacity.
- **Level 2 (Modals/Popovers):** Pure White with a very crisp, short shadow (0px 4px 20px) with 5% black opacity and a 1px border.
- **Interaction Depth:** Only gold elements should appear to "lift." When a user hovers over a gold button, the gradient should shift slightly or brighten, simulating a light source hitting metal.

## Shapes

The shape language is "Soft-Architectural." A low roundedness (0.25rem/4px) is applied to maintain a sharp, professional edge while avoiding the aggressive feel of 90-degree corners. 

- **Small Components (Checkboxes, Tags):** 2px - 4px radius.
- **Large Components (Cards, Buttons):** 4px - 8px radius.
- **Special Elements:** High-end imagery should maintain 0px (sharp) corners to reinforce the editorial look.

## Components

- **Primary Buttons:** Utilize the gold gradient. Text is Deep Black for maximum legibility. A subtle 1px inner-top-light highlight adds to the metallic sheen.
- **Secondary Buttons:** Ghost style with a 1px Black border. Text is Black.
- **Input Fields:** Minimalist design with only a bottom border (2px) that turns Gold on focus. Label floats above in uppercase `label-md` style.
- **Chips/Badges:** For status, use a very pale gold background with gold text. Avoid "Traffic Light" colors unless absolutely necessary; use Gold for "Success/Active" and Black for "Inactive."
- **Cards:** White background with a subtle hairline border. No shadow unless the card is interactive (hover state).
- **Iconography:** Use "Light" or "Thin" weight line icons in Deep Black. Key icons (like "Premium Features") may be rendered in Gold.