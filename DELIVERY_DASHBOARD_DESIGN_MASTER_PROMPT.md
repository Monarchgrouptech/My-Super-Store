# DELIVERY DASHBOARD — MASTER DESIGN PROMPT
> **Purpose:** This document is a complete, modular design specification for an AI builder to inspect a codebase and apply the MySuperStore Delivery Dashboard visual system. Apply every rule that has a matching component in the codebase. Skip sections whose features do not exist. Do not invent new features.

---

## TABLE OF CONTENTS
1. [Design System Tokens](#1-design-system-tokens)
2. [Layout Shell](#2-layout-shell)
3. [Module: Top Navigation Bar](#3-module-top-navigation-bar)
4. [Module: Side Navigation Bar](#4-module-side-navigation-bar)
5. [Module: Shipment List Panel](#5-module-shipment-list-panel)
6. [Module: Order Details Panel](#6-module-order-details-panel)
7. [Module: Shipment Card](#7-module-shipment-card)
8. [Module: Tracking Timeline](#8-module-tracking-timeline)
9. [Module: Action Button Grid](#9-module-action-button-grid)
10. [Module: Create Shipment Modal](#10-module-create-shipment-modal)
11. [Module: Floating Action Button (FAB)](#11-module-floating-action-button-fab)
12. [Interaction & State Rules](#12-interaction--state-rules)
13. [Responsive Behaviour](#13-responsive-behaviour)
14. [Implementation Checklist](#14-implementation-checklist)

---

## 1. DESIGN SYSTEM TOKENS

### 1.1 Color Palette

Apply these as CSS custom properties or Tailwind theme extensions.

```css
/* Gold Accent (brand identity) */
--gold-primary:   #D4AF37;
--gold-light:     #F5E0A3;
--gold-dark:      #B8860B;
--gold-deep:      #735C00;
--gold-mid:       #FED65B;
--gold-dim:       #E9C349;

/* Neutrals */
--black:          #000000;
--near-black:     #1A1C1C;
--white:          #FFFFFF;

/* Zinc scale (UI grays) */
--zinc-50:        #FAFAFA;
--zinc-100:       #F4F4F5;
--zinc-200:       #E4E4E7;
--zinc-300:       #D4D4D8;
--zinc-400:       #A1A1AA;
--zinc-500:       #71717A;
--zinc-600:       #52525B;
--zinc-800:       #27272A;
--zinc-900:       #18181B;

/* Semantic roles */
--color-surface:          #F9F9F9;
--color-surface-low:      #F3F3F3;
--color-on-surface:       #1A1C1C;
--color-border:           #E4E4E7;   /* zinc-200 */
--color-border-strong:    #000000;
--color-accent:           #D4AF37;   /* gold-primary */
--color-accent-active:    #735C00;   /* gold-deep */

/* Status badges */
--status-processing-bg:   #000000;
--status-processing-fg:   #FFFFFF;
--status-in-transit-bg:   #D4AF37;
--status-in-transit-fg:   #000000;
--status-pending-bg:      #E4E4E7;
--status-pending-fg:      #52525B;
--status-pickup-bg:       transparent;
--status-pickup-border:   #000000;
--status-pickup-fg:       #000000;
--status-delivered-bg:    linear-gradient(135deg,#735C00,#FED65B);
--status-delivered-fg:    #000000;
```

### 1.2 Typography

Two acceptable font families. Use whichever is already loaded in the project.

| Role | Family | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| `headline-xl` | Inter / Work Sans | 48px | 700 | 1.1 | -0.02em |
| `headline-lg` | Inter / Work Sans | 32px | 700 | 1.2 | -0.01em |
| `headline-md` | Inter / Work Sans | 24px | 600 | 1.3 | 0 |
| `headline-sm` | Inter / Work Sans | 18px | 600 | 1.4 | 0 |
| `body-md` | Inter / Work Sans | 16px | 400 | 1.5 | 0 |
| `body-sm` | Inter / Work Sans | 14px | 400 | 1.5 | 0 |
| `label-caps` | Inter / Work Sans | 11–12px | 700 | 1.0 | 0.10–0.15em |
| `mono` | monospace (system) | 12px | 700 | 1.0 | 0 |

> **Rule:** All uppercase labels use `letter-spacing: 0.10em` minimum. Never render label text in mixed case — always `text-transform: uppercase`.

### 1.3 Gradients & Shadows

```css
/* Gold gradient — used on primary CTA and FAB */
.gold-gradient {
  background: linear-gradient(135deg, #D4AF37 0%, #F5E0A3 50%, #B8860B 100%);
}

/* Alternate gold gradient (darker) */
.gold-gradient-dark {
  background: linear-gradient(135deg, #735C00 0%, #FED65B 50%, #E9C349 100%);
}

/* Hard shadow — used on selected cards and FAB */
.hard-shadow {
  box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 0.10);
}

/* Metallic shadow — used on Mark Delivered button */
.metallic-shadow {
  box-shadow: 4px 4px 0px 0px #735C00;
}
```

### 1.4 Border Radius

**This design is deliberately sharp/geometric. Use zero border-radius on all containers, cards, badges, and buttons unless specified.**

```css
--radius-none:  0px;    /* cards, modals, buttons, badges, inputs — DEFAULT */
--radius-full:  9999px; /* ONLY used on timeline dot indicators */
```

### 1.5 Spacing Scale

```css
--space-xs:     4px;
--space-sm:     12px;
--space-md:     24px;
--space-lg:     48px;
--space-xl:     80px;
--space-base:   8px;
--space-gutter: 24px;
```

---

## 2. LAYOUT SHELL

### 2.1 Overall Structure

The dashboard uses a **three-zone fixed layout**:

```
┌─────────────────────────────────────────────────────────┐
│  TOP NAV BAR  (fixed, full-width, z-50, h-20)           │
├──────────────┬──────────────────────────────────────────┤
│              │  MAIN CONTENT AREA                       │
│  SIDE NAV    │  ┌────────────────┬─────────────────┐    │
│  (fixed,     │  │ SHIPMENT LIST  │  ORDER DETAILS  │    │
│  w-64,       │  │ PANEL          │  PANEL          │    │
│  left, full  │  │ (left half /   │  (right half /  │    │
│  height,     │  │  col-span-7)   │   col-span-5)   │    │
│  z-40)       │  └────────────────┴─────────────────┘    │
└──────────────┴──────────────────────────────────────────┘
```

### 2.2 CSS Rules

```css
/* Top nav height: 80px (h-20) */
/* Side nav width: 256px (w-64) */

body {
  background: var(--color-surface);
  color: var(--color-on-surface);
}

main {
  padding-left: 256px;   /* offset side nav */
  padding-top: 80px;     /* offset top nav */
  min-height: 100vh;
}

.content-row {
  display: flex;
  height: calc(100vh - 80px);
  overflow: hidden;
}

.panel-left {
  width: 50%;           /* OR col-span-7 in 12-col grid */
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  background: #FFFFFF;
  padding: var(--space-lg) var(--space-lg); /* 48px */
}

.panel-right {
  width: 50%;           /* OR col-span-5 in 12-col grid */
  overflow-y: auto;
  background: var(--color-surface-low);
  padding: var(--space-lg);
}
```

---

## 3. MODULE: TOP NAVIGATION BAR

### 3.1 Structure

```
[BRAND LOGO]  [SEARCH BAR]          [PAGE TITLE]  [NOTIFICATION BELL]  [USER AVATAR]
```

### 3.2 Spec

| Property | Value |
|---|---|
| Position | `fixed`, top 0, full width, `z-50` |
| Height | 80px (`h-20`) |
| Background | `#FFFFFF` |
| Bottom border | `1px solid var(--color-border)` |
| Horizontal padding | `32px` (`px-8`) |
| Vertical alignment | `items-center`, `justify-between` |

**Brand Logo:**
- Text: `MYSUPERSTORE`
- Style: `font-size: 20px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #000`

**Search Bar:**
- Background: `var(--zinc-100)` (`#F4F4F5`)
- Bottom border only: `1px solid #000` (underline style, no full border)
- Icon: `search` (Material Symbols Outlined), color `var(--zinc-400)`
- Width: `384px` (w-96) on md+ screens, hidden on mobile
- Input: transparent background, no ring, `font-size: 14px`
- Placeholder: `"Search order ID..."` or `"Search orders, tracking IDs..."`

**Page Title (center/right):**
- Text: `"Delivery Dashboard"` or `"Active Shipments"`
- Style: `headline-md`, hidden on screens < lg

**Notification Bell:**
- Icon: `notifications` (Material Symbols)
- Has a pulsing gold dot indicator: `width: 8px; height: 8px; background: #D4AF37; border-radius: 9999px; position: absolute; top: 8px; right: 8px;`

**User Avatar:**
- Size: `40px × 40px` (w-10 h-10)
- Style: `object-fit: cover; filter: grayscale(100%); border: 1px solid #000;`
- Separated from bell by a left border: `border-left: 1px solid var(--color-border); padding-left: 24px`

**Partner Label (next to avatar):**
```
PARTNER PORTAL      ← label-caps, bold, black
PREMIUM DELIVERY    ← 10px, zinc-500, tracking wider
```

**Primary CTA Button (Variant B only — in top nav):**
- Text: `"CREATE SHIPMENT"`
- Style: `gold-gradient`, `color: #000`, `font-weight: 700`, `font-size: 12px`, uppercase, `letter-spacing: 0.1em`, `padding: 10px 24px`
- No border radius

---

## 4. MODULE: SIDE NAVIGATION BAR

### 4.1 Spec

| Property | Value |
|---|---|
| Position | `fixed`, left 0, full height, `z-40` |
| Width | `256px` (`w-64`) |
| Background | `#FFFFFF` |
| Right border | `1px solid var(--color-border)` |
| Padding top | `96px` (clears top nav) |

### 4.2 Brand block (Variant B only)

```
MYSUPERSTORE        ← font-size 18px, font-weight 900, uppercase, tracking tight
OPERATIONS CENTER   ← 12px, semibold, uppercase, zinc-400
```
Padded: `px-8 mb-12`

### 4.3 Nav Links

Each link:
```css
.nav-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--zinc-400);
  transition: background 0.15s, color 0.15s;
}
.nav-link:hover {
  background: var(--zinc-50);
  color: #000;
}
```

**Active state:**
```css
.nav-link.active {
  background: var(--zinc-50);
  color: #000;
  border-right: 4px solid #D4AF37;  /* gold accent right border */
}
```

### 4.4 Nav Items (in order)

| Icon (Material Symbols) | Label |
|---|---|
| `dashboard` | Dashboard |
| `local_shipping` (FILL=1 when active) | Active Shipments ← **active by default** |
| `inventory_2` / `receipt_long` | All Orders |
| `location_on` / `notifications_active` | Tracking Updates |
| `settings` | Settings ← pushed to bottom (`margin-top: auto`) |

---

## 5. MODULE: SHIPMENT LIST PANEL

### 5.1 Panel Header

```
LIVE OPERATIONS          ← label-caps, zinc-500
Active Shipments         ← headline-lg, black, bold

                         [● 3 PRIORITY ORDERS]  ← right aligned, gold dot + label-caps
```

- Bottom border: `2px solid #000` with `padding-bottom: 16px`, `margin-bottom: 32px`
- Dot indicator: `width: 8px; height: 8px; background: #D4AF37; border-radius: 9999px; animation: pulse 2s infinite;`

**Variant B header (alternative):**
```
24 ACTIVE SHIPMENTS  ← label-caps, zinc-500, left

                [FILTERS]  [SORT BY DATE]  ← right, small buttons with border
```

Filter buttons:
```css
.filter-btn {
  padding: 4px 16px;
  border: 1px solid #000;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: #fff;
}
.filter-btn.secondary {
  border-color: var(--color-border);
  color: var(--zinc-400);
}
.filter-btn.secondary:hover {
  color: #000;
  border-color: #000;
}
```

### 5.2 Card List

Cards are stacked vertically with `gap: 16px–24px`. See **Module 7** for individual card spec.

---

## 6. MODULE: ORDER DETAILS PANEL

### 6.1 Detail Header

```
ORDER DETAILS          ← label-caps, gold (#D4AF37)
#MS-94021              ← headline-xl (48px), bold, black

                       [PAYMENT PAID]   ← black badge, white text, label-caps
                       via Platinum Amex ← 12px, zinc-400, uppercase
```

### 6.2 Customer & Address Bento Row

Two equal-width cards side by side, `gap: 16px`:

**Card A — Recipient:**
```
RECIPIENT              ← label-caps, zinc-400
James Wilson           ← headline-md
+44 7700 900077        ← 14px, zinc-600
james.w@premium.mail   ← 14px, zinc-600
```

**Card B — Shipping Address:**
```
SHIPPING ADDRESS       ← label-caps, zinc-400
221B Baker Street      ← 14px, bold, zinc-800
Marylebone, London     ← 14px, zinc-600
NW1 6XE, UK            ← 14px, zinc-600
```

Both cards:
```css
.bento-card {
  background: #FFFFFF;
  border: 1px solid var(--color-border);
  padding: 24px;
}
```

### 6.3 Consignment List (Products Table)

```
┌─────────────────────────────────────────────────┐
│  CONSIGNMENT LIST     ← label-caps, black, zinc-50 bg header │
├─────────────────────────────────────────────────┤
│  [icon]  Smart Wireless Headphones              │
│          SKU: WH-700-BL              $199.00    │
│                                      Qty: 1     │
├─────────────────────────────────────────────────┤
│  [icon]  USB-C Fast Charger                     │
│          SKU: PWR-65-FAST             $46.00    │
│                                      Qty: 1     │
├═════════════════════════════════════════════════┤  ← border-top: 1px solid #000
│  Total Value                         $245.00   │  ← headline-md, gold
└─────────────────────────────────────────────────┘
```

Outer container:
```css
.consignment-table {
  background: #FFFFFF;
  border: 1px solid #000;  /* strong border */
}
.consignment-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--zinc-100);
  background: var(--zinc-50);
}
```

Product icon placeholder:
```css
.product-icon {
  width: 48px;
  height: 48px;
  background: var(--zinc-100);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--zinc-400);
}
```

---

## 7. MODULE: SHIPMENT CARD

### 7.1 Default (Inactive) Card

```css
.shipment-card {
  background: #FFFFFF;
  border: 1px solid var(--color-border);
  padding: 24px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.shipment-card:hover {
  border-color: #000;
}
```

**Internal layout:**

```
[ORDER ID label]         [AMOUNT headline-md]
[Customer name headline-md]  [STATUS BADGE]
[Location text, zinc-500]

─────────────────────────────────────  ← border-top: 1px solid zinc-100
TRACKING NUMBER          LAST UPDATED
TRK-XXXX-XXXX-XXX        4 mins ago
```

**Order ID:** `label-caps`, `color: var(--zinc-400)`
**Customer name:** `headline-md`, zinc-800
**Location:** `14px`, zinc-500

**Grid for tracking row:** `display: grid; grid-template-columns: 1fr 1fr;`
- Labels: `10px`, zinc-400, bold, uppercase
- Values: `12px`, bold; tracking number uses `font-family: monospace`

### 7.2 Active / Selected Card

```css
.shipment-card.active {
  border: 2px solid #000;          /* stronger border */
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.10);  /* hard-shadow */
  background: #FFFFFF;
}
```

**Gold corner marker (absolute positioned):**
```css
.card-corner-mark {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #D4AF37 0%, #F5E0A3 50%, #B8860B 100%);
  border: 1px solid #000;
}
/* Parent card must have: position: relative; */
```

**Active card order ID color:** `color: #D4AF37` (gold, not zinc-400)
**Active card customer name color:** `color: #000`

**Bottom tag row (active card only):**
```html
<div class="card-tag-row">
  <span class="tag-border">Ready for Pickup</span>
  <span class="chevron-icon">›</span>  <!-- gold color -->
</div>
```
```css
.tag-border {
  padding: 4px 12px;
  border: 1px solid #000;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.chevron-icon { color: #D4AF37; }
```

### 7.3 Status Badge Variants

| Status | Background | Text Color | Border |
|---|---|---|---|
| `PROCESSING` | `#000` | `#FFF` | none |
| `IN TRANSIT` | `#D4AF37` | `#000` | none |
| `PENDING` | `#E4E4E7` | `#52525B` | none |
| `READY FOR PICKUP` | transparent | `#735C00` | `1px solid #735C00` |
| `DELIVERED` | gold-gradient | `#000` | none |

All badges:
```css
.status-badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: 0;   /* sharp corners — never rounded */
}
```

### 7.4 Variant B Card (wider, 3-column grid)

```
[ORDER ID]  [DATE • TIME]                [STATUS BADGE]

CUSTOMER          DESTINATION            AMOUNT
Julian Sterling   New York, NY           $245.00
```

Labels (`CUSTOMER`, `DESTINATION`, `AMOUNT`): `label-caps`, zinc-400
Values: `body-md`, `font-weight: 600`, black

---

## 8. MODULE: TRACKING TIMELINE

### 8.1 Structure

A vertical timeline with connecting line, dots, and event entries.

```
TRACKING HISTORY       ← label-caps, zinc-400, mb-32px, tracking-widest

│  ●  VENDOR READY FOR PICKUP          ← active event (gold dot)
│     Oct 24, 2023 — 10:45 AM
│
│  ○  ORDER PAID & VERIFIED            ← completed event (zinc-200 dot)
│     Oct 24, 2023 — 09:12 AM
│
│  ○  IN TRANSIT TO TERMINAL  [opacity: 40%]  ← future event (faded)
│     Scheduled
```

### 8.2 CSS

```css
.timeline-container {
  position: relative;
  padding-left: 0;
}

/* Vertical connecting line */
.timeline-container::before {
  content: '';
  position: absolute;
  left: 11px;         /* center of the 24px dot */
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--zinc-100);
}

/* Individual event row */
.timeline-event {
  position: relative;
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* Dot — active (current) */
.timeline-dot.active {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: #000;
  border: 4px solid var(--zinc-50);   /* creates the white ring effect */
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
/* Inner gold pip for active dot */
.timeline-dot.active::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: #D4AF37;
}

/* Dot — completed */
.timeline-dot.done {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: var(--zinc-200);
  border: 4px solid var(--zinc-50);
  z-index: 10;
  flex-shrink: 0;
}

/* Dot — future/scheduled */
.timeline-dot.future {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: var(--zinc-100);
  border: 4px solid var(--zinc-50);
  z-index: 10;
  flex-shrink: 0;
}

/* Future event row is dimmed */
.timeline-event.future {
  opacity: 0.4;
}
```

**Event text:**
- Label: `14px`, `font-weight: 700`, `text-transform: uppercase`, `color: #000` (active) / zinc-800 (done) 
- Timestamp: `12px`, `color: var(--zinc-400)`

**Variant B (alternative styling):**

- Dot: `8px × 8px` with `ring-4 ring-white`
- Active dot uses `gold-gradient` as background
- Completed dot: `background: var(--zinc-300)`
- Sub-label line added: `12px`, zinc-500 (e.g. "Departure from Central Hub")
- Timestamp aligned to the right: `font-size: 10px`, label-caps, zinc-400

```
Order In Transit                         16:45
Departure from Central Hub
```

---

## 9. MODULE: ACTION BUTTON GRID

### 9.1 Layout

```
[Accept Order]         [Mark Picked Up]
[Create Shipment]      [Mark In Transit]
[Out for Delivery]     [Mark Delivered]
```

```css
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
```

### 9.2 Button Variants

All buttons share:
```css
.action-btn {
  padding: 16px;
  font-size: 14px;       /* or 10px in compact variant */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: 0;
  transition: all 0.15s;
  cursor: pointer;
}
.action-btn:active { opacity: 0.8; }
```

| Button | Background | Text | Border |
|---|---|---|---|
| **Accept Order** | `gold-gradient` | `#000` | `1px solid #000` |
| **Mark Picked Up** | `#FFFFFF` | `#000` | `1px solid #000` |
| **Create Shipment** | `#000` | `#FFFFFF` | `1px solid #000` |
| **Mark In Transit** | `#000` | `#FFFFFF` | `1px solid #000` |
| **Out for Delivery** | `#FFFFFF` | `#000` | `1px solid #E4E4E7` |
| **Mark Delivered** | `gold-gradient` or `gold-gradient-dark` | `#000` | transparent or `2px solid #D4AF37` + `metallic-shadow` |

**Hover states:**
```css
/* Accept Order */
.btn-accept:hover { filter: brightness(1.1); }

/* Mark Picked Up */
.btn-pickup:hover { background: #000; color: #FFF; }

/* Create Shipment */
.btn-create:hover { background: var(--zinc-800); }

/* Out for Delivery */
.btn-out:hover { background: var(--zinc-100); }

/* Mark Delivered */
.btn-delivered:hover { background: #D4AF37; color: #FFF; }
```

---

## 10. MODULE: CREATE SHIPMENT MODAL

> Only implement if the codebase has a modal/dialog component wired to "Create Shipment".

### 10.1 Overlay

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
```

### 10.2 Modal Container

```css
.modal {
  background: #FFFFFF;
  border: 2px solid #D4AF37;   /* gold border */
  box-shadow: 0 0 0 2px #000;  /* outer black stroke */
  width: 100%;
  max-width: 480px;
  padding: 32px;
  border-radius: 0;
  position: relative;
}
```

### 10.3 Modal Header

```
NEW LOGISTICS ENTRY     ← label-caps, zinc-400, mb-4px
CREATE SHIPMENT         ← headline-lg (or headline-md), bold, black

                    [X] ← close button, top-right, absolute position
```

```css
.modal-title-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--zinc-400);
  margin-bottom: 4px;
}
.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}
.modal-close {
  position: absolute;
  top: 24px;
  right: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--zinc-500);
}
.modal-close:hover { color: #000; }
```

### 10.4 Form Fields

**Carrier Name (Select/Dropdown):**
```css
.form-field { margin-bottom: 24px; }
.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--on-surface);
  margin-bottom: 8px;
}
.form-select, .form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  background: #FFFFFF;
  font-size: 14px;
  border-radius: 0;
  outline: none;
  transition: border-color 0.15s;
}
.form-select:focus, .form-input:focus {
  border-color: #000;
  box-shadow: none;
}
```

Placeholder text: `"e.g., FedEx, DHL, Maersk"` — zinc-400 color

**Tracking Number (Text Input):**
- Placeholder: `"Enter alphanumeric code"`
- Same `.form-input` styles

**Tracking URL (Text Input, optional):**
- Label row: `"Tracking URL"` (left) + `"OPTIONAL"` (right, zinc-400, label-caps)
- Has a link icon (`🔗` or Material `link` symbol) inside the input, left side
- Placeholder: `"https://..."`

```css
.input-with-icon {
  position: relative;
}
.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--zinc-400);
  font-size: 18px;
}
.input-with-icon input {
  padding-left: 40px;
}
```

**Info Banner:**
```css
.info-banner {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--zinc-50);
  border: 1px solid var(--color-border);
  margin-top: 4px;
}
.info-banner .icon { color: #D4AF37; font-size: 20px; flex-shrink: 0; }
.info-banner p { font-size: 13px; color: var(--zinc-600); line-height: 1.5; }
```
Text: `"Providing a tracking URL allows the client to access a real-time white-labeled tracking dashboard immediately upon confirmation."`

### 10.5 Modal Footer Buttons

```
[CANCEL]          [CONFIRM SHIPMENT]
```

```css
.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
}
.btn-modal-cancel {
  padding: 14px 24px;
  border: 1px solid #000;
  background: #FFFFFF;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: 0;
  cursor: pointer;
}
.btn-modal-cancel:hover { background: var(--zinc-50); }

.btn-modal-confirm {
  padding: 14px 24px;
  background: linear-gradient(135deg, #D4AF37 0%, #F5E0A3 50%, #B8860B 100%);
  color: #000;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: 1px solid #000;
  border-radius: 0;
  cursor: pointer;
}
.btn-modal-confirm:hover { filter: brightness(1.05); }
```

---

## 11. MODULE: FLOATING ACTION BUTTON (FAB)

### 11.1 Spec

```css
.fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 50;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #D4AF37 0%, #F5E0A3 50%, #B8860B 100%);
  /* OR: background: #000 for dark variant */
  border: 1px solid #000;
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 0;   /* sharp, not circular */
  transition: transform 0.2s;
}
.fab:hover { transform: translateY(-4px); }
.fab:active { transform: scale(0.95); }
```

**Icon:**
- Gold variant: `map` icon, `color: #000`, `font-size: 30px`
- Black variant: `add` icon, `color: #FFF`, `font-size: 30px`

---

## 12. INTERACTION & STATE RULES

### 12.1 Card Selection

```
User clicks a shipment card
  → clicked card gains `.active` class
  → all other cards lose `.active` class
  → right panel updates to show that order's details
  → scroll right panel back to top
```

### 12.2 Button Presses (Action Grid)

Each action button updates the order's status. Reflect the new status in:
1. The status badge on the selected card (left panel)
2. The tracking timeline (right panel) — add a new event entry at the top with current timestamp
3. The button's own visual state if the action is already applied (e.g., disable "Accept Order" once accepted)

### 12.3 Hover & Focus

- All interactive elements must have visible hover state (no invisible hover)
- Focus ring: `outline: 2px solid #D4AF37; outline-offset: 2px;` (gold, not browser default blue)
- Never remove focus outline entirely (accessibility)

### 12.4 Pulse Animation (Live Indicator)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.pulse-dot {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## 13. RESPONSIVE BEHAVIOUR

> This design is desktop-first. Apply responsive rules only if the codebase has breakpoint handling.

| Breakpoint | Behaviour |
|---|---|
| `< md` (768px) | Search bar hidden; side nav hidden or converted to drawer |
| `< lg` (1024px) | Page title hidden; partner label hidden; panels stack vertically |
| `>= lg` | Full two-panel layout as described |

**Mobile stacking (panels):**
```css
@media (max-width: 1023px) {
  .content-row { flex-direction: column; }
  .panel-left, .panel-right { width: 100%; }
}
```

---

## 14. IMPLEMENTATION CHECKLIST

Use this checklist to verify every component has been correctly styled before marking the task complete.

### Global
- [ ] Font loaded (`Inter` or `Work Sans`)
- [ ] Material Symbols Outlined icon font loaded
- [ ] Color tokens applied (gold palette, zinc grays)
- [ ] `border-radius: 0` on all cards, buttons, badges, modals
- [ ] `gold-gradient` and `hard-shadow` utilities defined

### Layout
- [ ] Top nav fixed, full-width, z-50, h-20 (80px), white background
- [ ] Side nav fixed, left, full-height, z-40, w-64 (256px)
- [ ] Main content offset by `pl-64 pt-20`
- [ ] Two-panel split (left list + right detail) with `overflow-y: auto` on each

### Top Nav
- [ ] Brand logo: uppercase, font-weight 900, tracking widest
- [ ] Search bar: zinc-100 bg, bottom-border only, search icon
- [ ] Notification bell with pulsing gold dot
- [ ] Avatar: 40×40, grayscale, black border

### Side Nav
- [ ] Active link: zinc-50 bg + gold right border (4px)
- [ ] Inactive links: zinc-400, hover to black
- [ ] Settings pushed to bottom
- [ ] Icons filled on active state

### Shipment Cards
- [ ] Default card: 1px zinc-200 border, hover to black border
- [ ] Active card: 2px black border + hard-shadow + gold corner mark
- [ ] Order ID: label-caps (gold if active, zinc-400 if not)
- [ ] Status badges: correct colors per status variant
- [ ] Tracking row: 2-column grid, monospace tracking number
- [ ] "Ready for Pickup" tag on active card

### Order Details Panel
- [ ] Header: label-caps gold + headline-xl order ID
- [ ] "Payment Paid" badge: black bg, white text
- [ ] Bento row: 2-col grid, 1px border cards
- [ ] Consignment table: 1px black outer border, zinc-50 header row
- [ ] Total value: headline-md, gold color
- [ ] Tracking timeline: vertical line, correct dot states
- [ ] Action grid: 2-col, correct per-button colors

### Modal (if applicable)
- [ ] Gold + black double border
- [ ] All three form fields present
- [ ] Info banner with gold icon
- [ ] Cancel + Confirm Shipment footer

### FAB
- [ ] Fixed bottom-right, 64×64, sharp corners
- [ ] Gold gradient (or black) background
- [ ] Hover: lift (`translateY(-4px)`)

---

*End of Master Design Prompt. Every rule above is derived directly from the reference HTML and screenshots. Apply selectively based on what exists in the target codebase.*
