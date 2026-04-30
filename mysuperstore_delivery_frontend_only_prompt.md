# MySuperStore Delivery Dashboard — Frontend-Only Master Prompt
## Project: MySuperStore
## Company: Monarch Group
## Scope: Frontend only
## Goal: Rewrite and fine-tune the delivery dashboard UI so it follows the real order flow, shows the correct live data, and prevents users from acting out of sequence.

---

## 1) Project Context

You are designing the frontend for the **Delivery Dashboard** of MySuperStore, an e-commerce platform owned by Monarch Group.

This is **not** a generic logistics app and **not** a complete backend task.  
This prompt is strictly for the **frontend UI and UX behavior** of the delivery dashboard.

The dashboard must reflect the actual commerce flow already in the database:

1. Customer places order
2. Payment succeeds
3. Vendor marks items as ready for pickup
4. Delivery partner only then sees the order
5. Delivery partner picks up the order
6. Delivery partner creates shipment
7. Delivery partner marks in transit / out for delivery
8. Delivery partner marks delivered

The UI must follow this sequence exactly.  
The dashboard should never allow the delivery partner to act before the vendor has marked the order as ready for pickup.

---

## 2) Current Live Data Context

Use the current data state as the source of truth for the UI logic.

Example current state:

### `orders`
- `status = paid`
- `fulfillment_status = packed`
- `delivery_status = ready_for_pickup`

### `order_tracking_events`
- `status = pending` for the initial payment event
- `status = packed` for vendor readiness / ready for pickup

### `order_status_history`
- `pending → packed`
- note: `Vendor marked items as ready for pickup.`

This means the order is currently in the stage where:
- the vendor has already completed their part
- the order is ready for delivery partner pickup
- the delivery partner has **not** yet started their actions

The frontend must respect this state exactly.

---

## 3) Core UX Rule

The delivery dashboard must be **state-driven** and **step-by-step**.

That means:

- A delivery partner must not be able to click into actions that are not yet valid.
- Buttons must only be active when the current order state allows them.
- Tabs must not all show the same content.
- Dashboard numbers must reflect real filters from the current data.
- The interface must not pretend an order is further along than it really is.

---

## 4) Required Frontend Structure

Design the delivery dashboard with these main areas:

### A. Left Sidebar Navigation
Include these exact tabs only:

- Dashboard
- Active Shipments
- All Orders
- Tracking Updates

Do not add unrelated navigation items unless they are clearly dummy placeholders with no functional meaning.

### B. Main Content Area
The main content should change based on the selected tab.

### C. Order Detail Panel
When an order is selected, show a right-side panel or full detail view with order information and actions.

### D. Status Timeline / Tracking Feed
Show the tracking history in a clear timeline format.

---

## 5) Tab Behavior Requirements

The current problem is that all tabs show the same thing.  
That must be fixed in the frontend.

Each tab must show a distinct dataset and distinct purpose.

### 5.1 Dashboard Tab
This is the summary view.

Show:
- total shipments
- pickup-ready orders
- in-motion orders
- recent activity
- a compact preview of current orders

This tab should feel like a control center, not a raw list.

### 5.2 Active Shipments Tab
Show only shipments that are already in the delivery phase.

Use orders / fulfillment data where the order is beyond vendor-ready and is now being handled by delivery.

This tab should show:
- orders already accepted
- orders being processed by delivery
- orders already shipped
- orders in transit
- orders out for delivery

### 5.3 All Orders Tab
Show the complete order list.

This should include:
- all relevant orders for the delivery partner’s workflow
- every order state, with clear badges
- no filtering beyond what the delivery partner is allowed to see

### 5.4 Tracking Updates Tab
Show only the tracking timeline records.

This should be a feed of:
- status changes
- timestamps
- location notes
- delivery progress notes

This tab should not look like the same list as the others.  
It should feel like a live log or activity feed.

---

## 6) Delivery Workflow Rules in the UI

The frontend must enforce the following visual and interaction sequence:

### Stage 1 — Vendor Ready for Pickup
Current allowed state:
- `orders.fulfillment_status = packed`
- `orders.delivery_status = ready_for_pickup`

At this stage:
- the order should appear as ready for delivery handling
- the delivery partner can see it
- no shipment completion actions should be available yet

### Stage 2 — Delivery Partner Picks Up
After the delivery partner starts handling the order:
- the order can move to pickup / processing state
- the UI should show that the delivery partner has accepted the order

### Stage 3 — Shipment Creation
Once the package has been picked up:
- the UI should allow shipment creation
- a shipment modal should open
- the modal should ask for:
  - carrier name
  - tracking code / tracking number
  - tracking URL

### Stage 4 — In Transit
After shipment is confirmed:
- the order can move to in transit
- the UI should show a shipping progress state

### Stage 5 — Out for Delivery
When the package is close to the customer:
- the UI should allow out-for-delivery status

### Stage 6 — Delivered
The final action should be delivered.

The UI must not allow any later step before the earlier step is complete.

---

## 7) Button and Action Rules

This is the most important frontend behavior.

### Buttons must be sequential and locked.
Do not allow random clicking.

#### If the order is only vendor-ready:
Show or enable only the actions that make sense at that stage.

#### If pickup has not happened:
Do not show:
- confirm shipment
- in transit
- out for delivery
- delivered

#### If shipment has not been created:
Do not show:
- in transit
- out for delivery
- delivered

#### If the order is not out for delivery:
Do not show:
- delivered

### Buttons that should exist in the UI
Use these actions only:

- Accept Order
- Mark Picked Up
- Confirm Shipment
- Mark In Transit
- Out for Delivery
- Mark Delivered

### Shipment modal fields
When “Confirm Shipment” is clicked, open a modal with:
- carrier name
- tracking number
- tracking URL
- confirm button

### Button disabling rules
Buttons must be disabled or hidden when the current order state does not allow them.

Disabled buttons should clearly look disabled.

---

## 8) Required Visual Status Logic

The dashboard must visually represent status with badges and cards.

Use consistent badge styles for:
- pending
- packed
- processing
- shipped
- in_transit
- out_for_delivery
- delivered

The UI should make it impossible to confuse:
- vendor-ready orders
- pickup-ready orders
- active shipments
- finished shipments

---

## 9) Dashboard Metrics / Summary Cards

The dashboard summary section must show live counts, not placeholders.

Examples of summary cards:
- Active shipments
- Pickup ready
- In motion
- Delivered today
- Recent updates

The summary cards should be based on real filtered data from the current delivery workflow.

If there are zero results, show zero honestly.  
Do not fake counts.

---

## 10) Order Card / Row Design Requirements

Each order row or card should show:

- order ID
- customer name
- customer location
- total amount
- current fulfillment status
- current delivery status
- tracking number if available
- last update time
- a small list of items or item summary

The order card should also clearly show whether the order is:
- waiting for pickup
- already picked up
- in shipment
- in transit
- out for delivery
- delivered

---

## 11) Order Detail Panel Requirements

When a delivery partner opens an order, the detail panel must show:

- customer details
- shipping address
- item list
- total amount
- payment state
- fulfillment state
- delivery state
- tracking timeline
- action buttons in sequence
- shipment data fields
- note field for delivery updates

This panel should be the place where real work happens.

Do not add unrelated sections.

---

## 12) Tracking Updates Feed Requirements

The tracking updates tab should display entries from the delivery timeline in a clean, readable feed.

Each tracking item should show:
- status
- description
- location
- event time

Use the feed as a chronological history of what has happened to each shipment.

---

## 13) Streamlined UI Rules

This dashboard must stay focused.

Do not add:
- analytics charts
- finance widgets
- warehouse controls
- support chat
- driver maps
- routing optimization
- customer messaging
- inventory management
- returns
- refunds
- cancellations

Only add dummy placeholders if absolutely needed for layout consistency, and make sure they are visibly non-functional.

---

## 14) Responsive Design Requirements

The dashboard must work cleanly on desktop and mobile.

### Desktop
- sidebar on the left
- main list in the center
- detail panel on the right

### Mobile
- sidebar collapses into a menu
- order list becomes stacked cards
- details open as a full-screen view or bottom sheet
- action buttons remain easy to tap
- no cramped horizontal tables unless absolutely necessary

---

## 15) User Experience Rules

The dashboard must feel like a real operations panel.

It should be:
- clean
- fast
- practical
- uncluttered
- readable
- safe from accidental misuse

The delivery partner should always know:
- what is waiting
- what can be done next
- what is already completed
- what is blocked until the previous step happens

---

## 16) Important State Interpretation for Current Data

Use the current example state as proof of the intended UI behavior:

### Current example:
- `orders.status = paid`
- `orders.fulfillment_status = packed`
- `orders.delivery_status = ready_for_pickup`

This means:
- vendor work is done
- delivery partner can now see the order
- pickup is available
- shipment has not yet been confirmed
- delivered is not yet available

The UI must treat the order exactly like that.

---

## 17) Implementation Priorities

If you need to phase the frontend work, do it in this order:

1. Fix tab-specific rendering
2. Fix summary counts
3. Lock action buttons based on order state
4. Add shipment modal
5. Add order detail panel logic
6. Add tracking feed
7. Polish responsive layout

---

## 18) Final Build Goal

The final frontend should make the delivery dashboard feel like a controlled workflow system rather than a loose list of orders.

It must:
- show the right data in the right tab
- prevent invalid actions
- reflect the current real order state
- support the vendor-to-delivery progression correctly
- give a clean operational view to the delivery partner

Do not build beyond the current workflow.  
Do not invent extra screens or functions.  
Stay precise, streamlined, and faithful to the actual order lifecycle.

---

## 19) Deliverable Expected

Produce a frontend implementation plan or wireframe-ready UI structure that directly matches this workflow and can be handed to the builder without extra interpretation.

The output should be focused, complete, and realistic.
