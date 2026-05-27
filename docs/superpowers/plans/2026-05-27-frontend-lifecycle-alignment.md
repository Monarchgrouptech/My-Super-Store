# Frontend Lifecycle Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align vendor, delivery, and customer-facing React data flows with the backend lifecycle without regressing existing screens.

**Architecture:** Keep `src/lib/deliveryOrders.ts` as the delivery read hydrator, move delivery mutations behind command-style action wrappers in `src/hooks/useDeliveryOrders.ts`, tighten vendor readiness validation in `src/pages/vendor/OrderList.tsx`, and make delivery UI operationally focused instead of total-focused. Customer payment screens remain payment-centric and only get cleanup if any total-based display leaks remain.

**Tech Stack:** React 18, TypeScript, Supabase JS, React Router, Vite

---

### Task 1: Fix Delivery Data Contract

**Files:**
- Modify: `src/types/delivery.ts`
- Modify: `src/lib/deliveryOrders.ts`
- Verify: `src/pages/delivery/DeliveryDashboard.tsx`

- [ ] **Step 1: Expand delivery types for backend-driven presentation**

Add or adjust delivery-facing types in `src/types/delivery.ts` so the read model can safely carry:

```ts
export interface DeliveryVendorReadiness {
    id: string;
    vendor_id: string;
    status: 'not_ready' | 'ready';
    pickup_contact_name: string | null;
    pickup_contact_phone: string | null;
    pickup_address: string | null;
    pickup_city: string | null;
    pickup_state: string | null;
    pickup_country: string | null;
    pickup_notes: string | null;
    submitted_at: string | null;
}

export interface DeliveryOrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    vendor_id?: string | null;
    products?: DeliveryProduct | null;
}
```

- [ ] **Step 2: Keep `deliveryOrders.ts` read-only and hydrate vendor pickup fields**

Update `src/lib/deliveryOrders.ts` to:

```ts
.select(`
    id,
    user_id,
    status,
    total_amount,
    currency,
    shipping_address_id,
    placed_at,
    updated_at,
    fulfillment_status,
    delivery_status
`)
```

and keep the order query read-only while hydrating:

```ts
vendor_order_fulfillments: vendorFulfillmentsByOrderId.get(order.id) ?? [],
order_items: itemsByOrderId.get(order.id) ?? [],
order_fulfillments: fulfillmentsByOrderId.get(order.id) ?? [],
order_tracking_events: trackingByOrderId.get(order.id) ?? [],
```

Do not add any mutation logic in this file.

- [ ] **Step 3: Preserve backend gating**

Keep the delivery query constrained by backend lifecycle truth for available pickup orders:

```ts
.eq('delivery_status', 'ready_for_pickup')
```

and keep search filtering only as a read concern. Do not add local readiness inference.

- [ ] **Step 4: Verify type usage**

Run:

```bash
npx tsc --noEmit
```

Expected: type errors may still exist in other tasks, but `deliveryOrders.ts` and `delivery.ts` should use consistent field names and no missing delivery-readiness properties.

- [ ] **Step 5: Commit**

```bash
git add src/types/delivery.ts src/lib/deliveryOrders.ts
git commit -m "refactor: align delivery read model with backend lifecycle"
```

### Task 2: Replace Direct Delivery Mutations With Action Wrappers

**Files:**
- Modify: `src/hooks/useDeliveryOrders.ts`
- Verify: `src/pages/delivery/DeliveryDashboard.tsx`
- Verify: `src/pages/delivery/DeliveryOrderDetail.tsx`

- [ ] **Step 1: Remove direct `orders` updates from the hook**

Delete or replace logic shaped like:

```ts
await supabase
    .from('orders')
    .update(status)
    .eq('id', orderId);
```

and:

```ts
await supabase
    .from('orders')
    .update({
        delivery_status: 'shipped',
        updated_at: new Date().toISOString()
    })
    .eq('id', orderId);
```

- [ ] **Step 2: Add command-style wrappers**

Implement a helper in `src/hooks/useDeliveryOrders.ts` shaped like:

```ts
interface DeliveryActionResult {
    success: boolean;
    unavailable?: boolean;
    error?: string;
}

async function runDeliveryAction(action: string, orderId: string, payload?: Record<string, unknown>): Promise<DeliveryActionResult> {
    try {
        // Call safe backend path only if present
        return {
            success: false,
            unavailable: true,
            error: 'This delivery action is not yet connected to backend processing.',
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Delivery action failed',
        };
    }
}
```

Expose hook methods such as:

```ts
acceptDelivery(orderId: string)
confirmPickup(orderId: string)
confirmDelivered(orderId: string)
```

and keep them read-through by calling `fetchOrders()` only after successful backend action completion.

- [ ] **Step 3: Return explicit unavailable state**

Make the hook return action metadata:

```ts
return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    acceptDelivery,
    confirmPickup,
    confirmDelivered,
    actionUnavailableMessage: 'This delivery action is not yet connected to backend processing.',
};
```

The exact method list may vary if the current UI still includes more stages, but no method may directly mutate delivery lifecycle columns.

- [ ] **Step 4: Keep dashboard callers compiling**

Update call sites in `DeliveryDashboard.tsx` and `DeliveryOrderDetail.tsx` so they use the new wrapper methods or gracefully disable unavailable actions instead of calling removed mutation helpers.

- [ ] **Step 5: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: no references remain to the old direct `updateOrderStatus()` or direct `createShipment()` mutation paths unless they now safely wrap a backend command.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDeliveryOrders.ts src/pages/delivery/DeliveryDashboard.tsx src/pages/delivery/DeliveryOrderDetail.tsx
git commit -m "refactor: replace delivery lifecycle mutations with action wrappers"
```

### Task 3: Make Vendor Readiness Validation Truly Required

**Files:**
- Modify: `src/pages/vendor/OrderList.tsx`

- [ ] **Step 1: Add live validity state**

In `src/pages/vendor/OrderList.tsx`, derive validity from current form values:

```ts
const readinessFormValid =
    readinessForm.pickup_contact_name.trim() !== '' &&
    readinessForm.pickup_contact_phone.trim() !== '' &&
    readinessForm.pickup_address.trim() !== '' &&
    readinessForm.pickup_city.trim() !== '' &&
    readinessForm.pickup_state.trim() !== '' &&
    readinessForm.pickup_country.trim() !== '';
```

Keep field-level errors if useful, but do not rely on them as the only gate.

- [ ] **Step 2: Disable submit until the form is valid**

Change the modal submit button from:

```tsx
disabled={updating === selectedOrderId || Object.keys(readinessErrors).length > 0}
```

to logic shaped like:

```tsx
disabled={updating === selectedOrderId || !readinessFormValid}
```

Keep existing validation messages for UX clarity.

- [ ] **Step 3: Keep vendor scope explicit**

Preserve vendor-scoped items by leaving this pattern intact:

```ts
const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('vendor_id', vendor.id);
```

Do not broaden vendor order hydration to all vendor rows in `order_items`.

- [ ] **Step 4: Fix payment context display**

If the vendor order screen shows customer-paid amount context, derive a latest successful payment instead of using `order.payments[0]`. Implement a helper shaped like:

```ts
const successfulPayment = [...(order.payments || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((payment) => ['succeeded', 'success', 'paid', 'completed'].includes((payment.status || '').toLowerCase()));
```

Then render:

```tsx
{successfulPayment ? rawAmount(Number(successfulPayment.amount ?? 0), successfulPayment.currency) : 'Awaiting payment'}
```

- [ ] **Step 5: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: no type errors caused by the new validity or payment helper usage.

- [ ] **Step 6: Commit**

```bash
git add src/pages/vendor/OrderList.tsx
git commit -m "fix: enforce vendor readiness validation and payment context"
```

### Task 4: Make Delivery UI Operationally Focused

**Files:**
- Modify: `src/components/delivery/modular/DeliveryOrderCard.tsx`
- Modify: `src/components/delivery/modular/DeliveryOrderDetailPanel.tsx`

- [ ] **Step 1: Remove misleading money display from delivery card**

Replace display shaped like:

```tsx
<p className="text-[10px] text-zinc-400 uppercase tracking-wider">
    USD {order.total_amount.toLocaleString()}
</p>
```

with operational metadata such as:

```tsx
<p className="text-[10px] text-zinc-400 uppercase tracking-wider">
    {itemCount} {itemCount === 1 ? 'unit queued' : 'units queued'}
</p>
```

- [ ] **Step 2: Surface pickup/contact details on cards**

Add a compact readiness summary in `DeliveryOrderCard.tsx` using the first or aggregated readiness rows:

```tsx
const readinessRows = order.vendor_order_fulfillments || [];
const pickupSummary = readinessRows[0];
```

Render compact details such as contact name and pickup city if available.

- [ ] **Step 3: Expand pickup section in detail panel**

In `DeliveryOrderDetailPanel.tsx`, add a section shaped like:

```tsx
<section>
    <p className="label-caps text-zinc-400 mb-4">Pickup Contacts</p>
    {(order.vendor_order_fulfillments || []).map((row) => (
        <div key={row.id}>
            <p>{row.pickup_contact_name || 'No contact provided'}</p>
            <p>{row.pickup_contact_phone || 'No phone provided'}</p>
            <p>{row.pickup_address || 'No pickup address provided'}</p>
        </div>
    ))}
</section>
```

Keep it safe for multi-vendor orders by iterating readiness rows instead of assuming one vendor.

- [ ] **Step 4: Make unavailable actions explicit**

Where action buttons still render in `DeliveryOrderDetailPanel.tsx`, use unavailable state from the hook or parent and show:

```tsx
<div className="p-4 bg-zinc-50 border border-zinc-200 text-center">
    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
        Action temporarily unavailable
    </p>
</div>
```

Do not silently no-op on click.

- [ ] **Step 5: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: delivery components compile with the updated readiness and action props.

- [ ] **Step 6: Commit**

```bash
git add src/components/delivery/modular/DeliveryOrderCard.tsx src/components/delivery/modular/DeliveryOrderDetailPanel.tsx
git commit -m "refactor: focus delivery ui on operational readiness data"
```

### Task 5: Final Cleanup And Verification

**Files:**
- Verify: `src/pages/Account.tsx`
- Verify: `src/pages/PaymentHistory.tsx`
- Verify: `src/lib/vendorAnalytics.ts`

- [ ] **Step 1: Confirm customer payment screens remain payment-centric**

Check that `Account.tsx` and `PaymentHistory.tsx` still use:

```ts
order.primary_payment
fetchUserPayments(user!.id)
buildUserPaymentsFromOrders(userOrders)
```

and do not regress to using `orders.total_amount` as the paid amount.

- [ ] **Step 2: Confirm vendor analytics remain separate**

Check that `src/lib/vendorAnalytics.ts` still calculates:

```ts
totalRevenue += unitPrice * quantity;
```

and does not switch to payment totals.

- [ ] **Step 3: Run full verification**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS

Then inspect diagnostics for edited files.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDeliveryOrders.ts src/lib/deliveryOrders.ts src/pages/vendor/OrderList.tsx src/components/delivery/modular/DeliveryOrderCard.tsx src/components/delivery/modular/DeliveryOrderDetailPanel.tsx
git commit -m "fix: align frontend lifecycle flows with backend truth"
```
