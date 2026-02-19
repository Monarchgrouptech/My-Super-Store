# Paystack Payment Integration - Testing Guide

This guide explains how to test the complete Paystack payment flow end-to-end.

## Prerequisites

Before testing, ensure the following are set up:

### 1. Environment Variables

Verify these variables exist in your `.env` file:

```bash
VITE_SUPABASE_URL=https://hoieogginmsfmoarubuu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_49be81370d1961274703ef82c61eb60de1dabf80
```

### 2. Edge Functions

Ensure both Supabase Edge Functions are deployed:

- **Create Payment Endpoint**: `https://hoieogginmsfmoarubuu.supabase.co/functions/v1/super-endpoint`
- **Webhook Endpoint**: `https://hoieogginmsfmoarubuu.supabase.co/functions/v1/super-api`

### 3. Paystack Webhook Configuration

In your Paystack dashboard, configure the webhook URL:
- URL: `https://hoieogginmsfmoarubuu.supabase.co/functions/v1/super-api`
- Events: `charge.success`

## Paystack Test Cards

Use these test card numbers in **test mode**:

### Successful Payment
- **Card Number**: `4084 0840 8408 4081`
- **CVV**: Any 3 digits (e.g., `408`)
- **Expiry**: Any future date (e.g., `12/25`)
- **PIN**: `0000`
- **OTP**: `123456`

### Failed Payment (Insufficient Funds)
- **Card Number**: `5060 6666 6666 6666 6666`
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **PIN**: `0000`

### Failed Payment (Declined)
- **Card Number**: `5060 6666 6666 6666 6666`
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- Enter wrong PIN: `1234` (should be `0000`)

## End-to-End Testing Workflow

### Test 1: Successful Payment Flow

1. **Login** to your application
2. **Add items** to your cart
3. **Navigate to `/checkout`**
4. **Verify shipping address**:
   - If no address exists, modal should appear
   - Go to `/account` and add an address
   - Return to checkout
5. **Click "Pay with Paystack"** button
6. **Verify**:
   - Browser navigates to `/order-confirmation?order_id=xxx`
   - New tab opens with Paystack payment page
   - Order confirmation page shows "Waiting for Payment..." with polling indicator
7. **In Paystack tab**, complete payment:
   - Enter test card: `4084 0840 8408 4081`
   - CVV: `408`
   - Expiry: `12/25`
   - PIN: `0000`
   - OTP: `123456`
8. **Return to order confirmation tab**:
   - Within 3-6 seconds, status should update to "Order Confirmed!"
   - Payment details should show `status: SUCCESS`
   - Full order receipt is displayed
9. **Verify cart is cleared**:
   - Navigate to `/cart`
   - Cart should be empty

### Test 2: No Shipping Address

1. **Delete** your address from the account page (or logout and use a new account)
2. **Add items** to cart
3. **Navigate to `/checkout`**
4. **Verify**:
   - Orange warning box appears: "No shipping address found"
   - "Pay with Paystack" button is disabled
5. **Click payment button** (if enabled):
   - Modal should appear: "Shipping Address Required"
6. **Click "Go to Account"**:
   - Should navigate to `/account`
7. **Add address** and return to checkout
8. **Verify** payment button is now enabled

### Test 3: Failed Payment

1. **Complete steps 1-6** from Test 1
2. **In Paystack tab**, enter incorrect PIN:
   - Card: `4084 0840 8408 4081`
   - PIN: `1234` (wrong PIN)
3. **Verify**:
   - Paystack shows error
   - Order confirmation page continues polling
4. **Click "Refresh Payment Status"**:
   - Should manually re-check status
5. **Retry payment** in Paystack (use correct PIN: `0000`)
6. **Verify** order confirmation updates to success

### Test 4: Abandoned Payment

1. **Complete steps 1-6** from Test 1
2. **Close Paystack tab** without completing payment
3. **On order confirmation page**:
   - Should continue showing "Waiting for Payment..."
   - Should continue polling
4. **Re-open Paystack** by clicking "Pay with Paystack" again in checkout
5. **Complete payment**
6. **Verify** order confirmation updates

## Testing Edge Function Directly

You can test the Edge Function with `curl`:

### Create Payment Request

```bash
curl -X POST https://hoieogginmsfmoarubuu.supabase.co/functions/v1/super-endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "user_id": "your-user-id",
    "email": "test@example.com",
    "currency": "NGN",
    "items": [
      {
        "product_id": "product-uuid",
        "quantity": 2,
        "price": 15000
      }
    ],
    "shipping_address_id": "address-uuid",
    "billing_address_id": "address-uuid"
  }'
```

**Expected Response**:
```json
{
  "authorization_url": "https://checkout.paystack.com/...",
  "access_code": "...",
  "order_id": "order-uuid"
}
```

### Verify Webhook

After a successful payment, check the database:

```sql
-- Check payment status
SELECT * FROM payments WHERE order_id = 'your-order-id';

-- Check order status
SELECT * FROM orders WHERE id = 'your-order-id';

-- Check cart items (should be empty)
SELECT ci.* FROM cart_items ci
JOIN carts c ON c.id = ci.cart_id
WHERE c.user_id = 'your-user-id';
```

## Common Issues & Troubleshooting

### Issue: Payment button disabled
- **Cause**: No shipping address
- **Fix**: Add address in account page

### Issue: Order confirmation not updating
- **Cause**: Webhook not configured or failing
- **Fix**: 
  1. Check Paystack webhook configuration
  2. Check Edge Function logs
  3. Verify webhook signature validation

### Issue: Cart not cleared
- **Cause**: Webhook cart cleanup not working
- **Fix**: Verify cart cleanup code in `super-api` Edge Function

### Issue: "Order not found" error
- **Cause**: Invalid order_id or order creation failed
- **Fix**: Check Edge Function logs for errors in order creation

### Issue: Polling never stops
- **Cause**: Order status never updates to "paid"
- **Fix**: 
  1. Check webhook is receiving events
  2. Manually update order status in database for testing
  3. Click "Refresh Payment Status" button

## Database Verification

After successful payment, verify data in Supabase:

1. **Orders table**: Status should be `"paid"`
2. **Payments table**: Status should be `"success"`, `provider_payment_id` populated
3. **Order_items table**: Should contain all purchased items
4. **Cart_items table**: Should be empty for that user
5. **Addresses table**: Shipping address should exist

## Security Notes

- ✅ Use test mode keys during development
- ✅ Never commit real API keys to version control
- ✅ Webhook should verify Paystack signature (already implemented in Edge Function)
- ✅ Never trust client-side payment confirmation - always verify via webhook
- ✅ Product prices are fetched server-side to prevent tampering

## Production Checklist

Before going live:

- [ ] Replace test keys with live keys in environment variables
- [ ] Update Paystack webhook URL to production Edge Function
- [ ] Test with real payment (small amount)
- [ ] Verify all database triggers and RLS policies
- [ ] Set up monitoring for failed payments
- [ ] Configure proper error logging
- [ ] Test cart cleanup with real accounts
- [ ] Verify email notifications (if implemented)
