# MySuperStore Frontend Master Prompt
## Project: MySuperStore
## Company: Monarch Group
## Goal: Implement the full frontend flow for commerce, fulfillment, delivery tracking, and role-based dashboards using the existing Supabase-backed schema.

---

## 1) Core Objective

Build a production-ready frontend for MySuperStore that supports the complete user journey from browsing products to ordering, payment confirmation, fulfillment tracking, and delivery completion.

The frontend must not be a simple storefront. It must behave like a real commerce system with separate experiences for:

- Customers
- Vendors
- Delivery partners
- Admins

The frontend must work with the current Supabase schema and use the existing tables as the source of truth.

---

## 2) Existing Schema Context

The frontend must be built around these existing entities:

- `addresses`
- `carts`
- `cart_items`
- `categories`
- `delivery_partners`
- `global_notifications`
- `order_fulfillments`
- `order_items`
- `order_status_history`
- `order_tracking_events`
- `orders`
- `payments`
- `popular_categories`
- `popular_searches`
- `product_categories`
- `product_images`
- `product_specs`
- `products`
- `user_profiles`
- `vendors`

Important state fields already available and must be used correctly:

- `orders.status` → payment/order payment state
- `orders.fulfillment_status` → fulfillment progress
- `orders.delivery_status` → delivery summary state
- `payments.status` → gateway payment result
- `order_fulfillments.status` → shipping workflow state
- `order_tracking_events` → timeline history

Do not build frontend logic that conflicts with these meanings.

---

## 3) What the Frontend Must Achieve

The frontend must support these major outcomes:

1. Users browse products and categories.
2. Users add items to cart.
3. Users checkout and place orders.
4. Payment status is reflected in the order.
5. Paid orders move into fulfillment.
6. Delivery partners can log in to a delivery dashboard.
7. Delivery partners can process, pack, ship, and complete orders.
8. Customers can view live order tracking.
9. Vendors can see order items for their products.
10. The site must remain mobile-friendly and not become cluttered.

---

## 4) Required Frontend Modules

### 4.1 Public Storefront

Create or maintain the public shopping experience:

- Homepage
- Category browsing
- Product listing
- Product detail page
- Search results page
- Cart page
- Checkout page
- Confirmation / order success page

This public flow should feel smooth and modern, but more importantly it must be functional and tied to the actual data.

---

### 4.2 Customer Account Area

Create a customer area that includes:

- My Orders page
- Order Detail page
- Order Tracking page
- Address management page
- Account profile page

The customer must be able to:

- See their past orders
- Open an order
- View the current payment and fulfillment state
- See tracking timeline events
- Check shipping and delivery progress

---

### 4.3 Vendor Area

Create a vendor-facing area for merchants who sell products on the platform.

The vendor area must let vendors:

- See orders containing their products
- Review item quantities
- Confirm product readiness
- See order-related item breakdowns
- View basic order progress related to their products

Do not let vendors control delivery workflow. Vendors can view and prepare; delivery partners handle logistics.

---

### 4.4 Delivery Partner Dashboard

This is a major new frontend feature.

Create a dedicated delivery dashboard for users in the `delivery_partners` role.

The dashboard must allow delivery partners to:

- Log in
- See only relevant paid orders
- View assigned orders
- Open order details
- Assign themselves or receive assignment
- Mark orders as processing
- Mark orders as packed
- Mark orders as shipped
- Add tracking numbers
- Add carrier names
- Add tracking URLs
- Add status notes
- Mark orders as delivered
- View shipping history and timeline updates

This dashboard is the operational center of fulfillment.

---

### 4.5 Admin / Internal Control Area

Create or maintain an internal admin area for Monarch Group staff.

The admin area must allow the company to:

- View all orders
- View all fulfillment records
- View all delivery partners
- View all vendor-related data
- Search and inspect orders
- Monitor operational status

The admin area is not for customers and must be protected.

---

## 5) Required User Flows

### 5.1 Customer Purchase Flow

The frontend must support this exact sequence:

1. User lands on site.
2. User browses products or categories.
3. User opens a product page.
4. User adds item to cart.
5. User edits cart.
6. User proceeds to checkout.
7. User enters or selects shipping address.
8. User confirms order.
9. Payment is processed.
10. Order is marked as paid.
11. Fulfillment record is created.
12. User sees order confirmation.
13. User can track order status later.

---

### 5.2 Fulfillment Flow

After payment success:

1. Order appears in the fulfillment system.
2. Delivery partner sees the order.
3. Delivery partner opens the order.
4. Delivery partner updates fulfillment status.
5. Tracking number is added.
6. Carrier information is added.
7. Tracking events are appended.
8. Customer sees live progress.

---

### 5.3 Delivery Flow

The delivery workflow should move through these states in the UI:

- pending
- processing
- packed
- shipped
- in transit
- out for delivery
- delivered

The frontend must reflect each state clearly and consistently.

---

### 5.4 Vendor Visibility Flow

Vendors must be able to see:

- Which of their products were ordered
- The quantity ordered
- Associated order IDs
- The current fulfillment status where relevant

Vendors should not see private data that they do not need.

---

## 6) Frontend Screens That Must Be Built or Updated

### 6.1 DeliveryDashboard.tsx
This is the first and most important delivery-facing screen.

It must display:

- Order ID
- Customer name
- Customer phone
- Shipping address
- Items summary
- Total amount
- Payment state
- Fulfillment state
- Delivery state
- Tracking number
- Carrier name
- Assigned partner
- Last update time

Actions on each order card or row:

- View details
- Assign to me
- Mark processing
- Mark packed
- Mark shipped
- Add tracking number
- Mark delivered

This screen should support filters such as:

- Pending
- Processing
- Packed
- Shipped
- In transit
- Out for delivery
- Delivered

---

### 6.2 OrderFulfillmentDetail.tsx
A detailed order panel or page for delivery partners.

This screen must show:

- Full order summary
- Customer details
- Shipping address
- Ordered items
- Product thumbnails if available
- Order total
- Payment status
- Fulfillment status
- Delivery status
- Tracking number field
- Carrier name field
- Tracking URL field
- Status note field
- Event timeline list

This is where delivery work gets done.

---

### 6.3 OrderTrackingPage.tsx
A customer-facing tracking page.

This page must show:

- Current status
- Fulfillment stage
- Delivery stage
- Tracking number
- Carrier name
- Expected delivery date if available
- Event timeline
- Notes from the delivery process

The page must be simple and readable on mobile.

---

### 6.4 MyOrdersPage.tsx
Customer order history page.

Must show:

- Order ID
- Date
- Total
- Current status
- Quick action to open details
- Quick action to track

The page should support sorting by newest first.

---

### 6.5 OrderDetailPage.tsx
Detailed customer order page.

Must display:

- Order summary
- Items
- Shipping address
- Payment details
- Fulfillment state
- Delivery status
- Tracking timeline
- Support/help guidance

---

### 6.6 VendorOrdersPage.tsx
Vendor order page.

Must display:

- Item sold
- Order ID
- Quantity
- Order date
- Order state
- Related product link
- Basic shipping progress where relevant

---

### 6.7 CheckoutPage.tsx
Ensure the checkout page:

- Uses the address tables properly
- Confirms shipping and billing details
- Shows a correct order summary
- Creates the right backend handoff
- Leads cleanly into payment

---

### 6.8 CartPage.tsx
Cart must support:

- Quantity updates
- Item removal
- Subtotal calculations
- Checkout button
- Responsive layout

---

## 7) Navigation and Routing Rules

The frontend must use role-based routing.

### Customer routes
- `/`
- `/products`
- `/product/:slug`
- `/cart`
- `/checkout`
- `/orders`
- `/orders/:id`
- `/track/:id`
- `/account`

### Vendor routes
- `/vendor`
- `/vendor/orders`
- `/vendor/products`

### Delivery partner routes
- `/delivery`
- `/delivery/orders`
- `/delivery/orders/:id`
- `/delivery/tracking/:id`

### Admin routes
- `/admin`
- `/admin/orders`
- `/admin/delivery-partners`
- `/admin/vendors`

If a user is not allowed into a route, the frontend must redirect or block access gracefully.

---

## 8) UI and UX Requirements

### 8.1 General Design
The UI should be:

- clean
- modern
- responsive
- fast
- readable
- uncluttered

The design should not feel heavy or noisy.

### 8.2 Mobile Behavior
Every new screen must work properly on mobile.

Rules:

- Components must stack vertically on narrow screens
- Side panels should collapse into drawers or full-screen sheets
- Tables should convert into cards on mobile where necessary
- Buttons should remain tappable
- Important actions must never be hidden below the fold

### 8.3 Delivery UI Behavior
The delivery dashboard is practical software, not marketing UI.

It must prioritize:

- speed
- clarity
- visibility of order state
- ease of status updates

### 8.4 Customer Tracking UI Behavior
The tracking page must be simple.

It should show:

- timeline
- current status
- shipping summary
- helpful explanation text

Do not overload this page.

---

## 9) Data Fetching Rules

The frontend must fetch from Supabase or backend APIs in a structured way.

It should read:

- `orders`
- `order_items`
- `order_fulfillments`
- `order_tracking_events`
- `payments`
- `addresses`
- `user_profiles`
- `products`
- `product_images`
- `vendors`
- `delivery_partners`

The frontend must not invent status values or fake order progress.

---

## 10) State Handling Rules

### For orders
Use:

- `orders.status` for payment state
- `orders.fulfillment_status` for fulfillment state
- `orders.delivery_status` for delivery summary state

### For fulfillment
Use:

- `order_fulfillments.status` for operational shipping state
- `order_tracking_events` for timeline records

### For payments
Use:

- `payments.status` for gateway payment result

Do not collapse these into a single frontend state variable.

---

## 11) Event and Timeline Behavior

Every meaningful status update should appear in the tracking timeline.

Whenever a delivery partner updates an order, the frontend should reflect:

- status change
- time of update
- optional note
- optional location
- optional carrier/tracking data

The timeline should be ordered from newest to oldest or oldest to newest consistently.

---

## 12) Component Breakdown Guidance

The frontend should be organized into reusable pieces such as:

- `OrderStatusBadge`
- `DeliveryTimeline`
- `OrderSummaryCard`
- `ProductCard`
- `CartItemRow`
- `OrderRow`
- `StatusStep`
- `TrackingEventItem`
- `FulfillmentActionPanel`
- `RoleProtectedRoute`

Reusable components are preferred over duplicated logic.

---

## 13) Delivery Dashboard Behavior Rules

The delivery dashboard must behave like a real operations panel.

It should support:

- list view
- order detail view
- quick actions
- status change actions
- tracking input
- notes input
- assignment flow

The delivery partner should not need to jump through unnecessary steps.

---

## 14) Customer Experience Rules

The customer must always understand:

- whether payment succeeded
- whether the order is being processed
- whether the item was shipped
- whether it is in transit
- whether it was delivered

If an order is delayed or stuck, the UI should show a clear status message.

---

## 15) Vendor Experience Rules

The vendor area must be informative but limited.

Vendors need enough information to prepare items and understand what was ordered, but not private delivery operations.

---

## 16) Admin Experience Rules

Admin users need broad visibility.

The admin area should make it easy to inspect:

- order volume
- order states
- fulfillment activity
- delivery partner activity
- vendor order flow

Do not put customer-facing UI in the admin area.

---

## 17) Frontend Quality Bar

The implementation must meet these standards:

- type-safe where possible
- readable components
- maintainable structure
- responsive design
- consistent status handling
- clear loading states
- clear empty states
- clear error states
- no broken navigation paths
- no placeholder nonsense in critical screens

---

## 18) What Must Be Avoided

Do not:

- overload `orders.status`
- create duplicate status logic
- make delivery partners see unrelated user data
- make customers see internal logistics actions
- bury the tracking flow
- use confusing terminology
- add features that are not supported by the schema
- make mobile experience clumsy
- create a chat-first flow when the real priority is order fulfillment

---

## 19) Build Priority Order

If work must be phased, build in this order:

1. Delivery dashboard
2. Order detail panel for delivery partners
3. Customer tracking page
4. My Orders page
5. Vendor orders page
6. Improved checkout flow
7. Role-based routing
8. Shared UI components
9. Admin order visibility
10. Refinements and responsiveness

---

## 20) Final Outcome Required

When complete, the frontend should allow:

- customers to buy and track orders
- delivery partners to manage fulfillment
- vendors to view their sales-related orders
- admins to oversee operations
- the whole platform to feel like a real end-to-end commerce system

This is the target state.

---

## 21) Implementation Note for the Builder

The builder should treat the current schema as the operational contract.

Frontend work must be based on the real tables already present and should not assume new structures unless explicitly added later.

The system is already far beyond a basic demo. The task now is to wire the frontend so it actually uses the existing commerce and fulfillment lifecycle correctly.

---

## 22) Deliverable Standard

The output should be a production-ready frontend implementation plan and component set that can be built directly into the current MySuperStore codebase with minimal ambiguity.

No vague placeholders.  
No dead-end screens.  
No fake status flow.  
No confusing UX.  
No broken role separation.

The result should be a working frontend for a real e-commerce operation.
