import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Loader2, AlertCircle, RefreshCw, Package, CreditCard, MapPin } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

interface Order {
    id: string;
    user_id: string;
    status: string;
    total_amount: number;
    currency: string;
    placed_at: string;
    shipping_address_id?: string;
    billing_address_id?: string;
}

interface OrderItem {
    id: string;
    quantity: number;
    unit_price: number;
    product_id: string;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    product_images: { url: string }[];
}

interface Payment {
    id: string;
    provider: string;
    provider_payment_id?: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    order_id?: string;
}

interface Address {
    id: string;
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
}

export function OrderConfirmation() {
    const [searchParams] = useSearchParams();

    const orderIdParam = searchParams.get('order_id'); // legacy / direct flow
    const reference = searchParams.get('reference'); // Paystack redirect: reference=...

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<(OrderItem & { product?: Product })[]>([]);
    const [payment, setPayment] = useState<Payment | null>(null);
    const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchOrderData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Determine the order id: direct param or via payment reference lookup
            let resolvedOrderId: string | null = null;

            if (orderIdParam) {
                resolvedOrderId = orderIdParam;
            } else if (reference) {
                // Try to find payment by provider_payment_id (provider_payment_id stores Paystack reference)
                const { data: paymentData, error: paymentErr } = await supabase
                    .from('payments')
                    .select('order_id, status, provider_payment_id, amount, currency, created_at')
                    .eq('provider_payment_id', reference)
                    .maybeSingle();

                if (paymentErr) {
                    console.warn('Payment lookup error:', paymentErr);
                }

                if (paymentData && paymentData.order_id) {
                    resolvedOrderId = paymentData.order_id;
                    setPayment(paymentData as Payment);
                } else {
                    // No payment yet — clear states and return. Polling will try again.
                    setOrder(null);
                    setOrderItems([]);
                    setPayment(null);
                    setShippingAddress(null);
                    setLoading(false);
                    return;
                }
            } else {
                setError('No order reference provided in the URL.');
                setLoading(false);
                return;
            }

            // Fetch order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', resolvedOrderId)
                .maybeSingle();

            if (orderError) throw new Error('Order fetch failed');
            if (!orderData) {
                setError('Order not found');
                setLoading(false);
                return;
            }
            setOrder(orderData);

            // Fetch order items
            const { data: itemsData, error: itemsError } = await supabase
                .from('order_items')
                .select('id, quantity, unit_price, product_id')
                .eq('order_id', resolvedOrderId);

            if (itemsError) throw new Error('Failed to load order items');

            // Fetch products for order items (if any)
            const productIds = (itemsData || []).map((item: any) => item.product_id).filter(Boolean);
            let productsData: Product[] = [];
            if (productIds.length > 0) {
                const { data: prods, error: productsError } = await supabase
                    .from('products')
                    .select('id, name, slug, product_images(url)')
                    .in('id', productIds);
                if (productsError) {
                    console.warn('Failed to load product details', productsError);
                } else {
                    productsData = prods || [];
                }
            }

            // Combine order items with product data
            const combinedItems = (itemsData || []).map((item: any) => ({
                ...item,
                product: productsData.find(p => p.id === item.product_id)
            }));
            setOrderItems(combinedItems);

            // If payment wasn't already set from reference lookup, try fetching by order_id
            if (!payment) {
                const { data: paymentData2, error: paymentErr2 } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('order_id', resolvedOrderId)
                    .maybeSingle();

                if (paymentErr2) {
                    console.warn('Payment not found yet:', paymentErr2);
                } else if (paymentData2) {
                    setPayment(paymentData2);
                }
            }

            // Fetch shipping & billing addresses (do independently)
            if (orderData.shipping_address_id) {
                const { data: shippingData, error: shippingErr } = await supabase
                    .from('addresses')
                    .select('*')
                    .eq('id', orderData.shipping_address_id)
                    .maybeSingle();
                if (!shippingErr && shippingData) setShippingAddress(shippingData);
            }

            setError(null);
        } catch (err) {
            console.error('Error fetching order:', err);
            setError(err instanceof Error ? err.message : 'Failed to load order');
        } finally {
            setLoading(false);
        }
    }, [orderIdParam, reference, payment]);

    // Initial fetch on mount and when params change
    useEffect(() => {
        fetchOrderData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchOrderData]);

    // Polling effect:
    // Poll while:
    // - We have an order and it's not paid, OR
    // - We have a reference and no order yet (waiting for webhook to create payment/order)
    useEffect(() => {
        const shouldPoll =
            (!!order && order.status !== 'paid') || (!!reference && !order);

        if (!shouldPoll) {
            setIsPolling(false);
            return;
        }

        setIsPolling(true);
        const interval = setInterval(() => {
            fetchOrderData();
        }, 3000);

        return () => clearInterval(interval);
    }, [order, reference, fetchOrderData]);

    const handleRefresh = () => {
        setLoading(true);
        fetchOrderData();
    };

    // UI rendering
    if (loading && !order) {
        return (
            <div className="section flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[var(--gold-primary)]" size={48} />
            </div>
        );
    }

    if (error || (!order && !loading)) {
        return (
            <div className="section">
                <div className="card-black p-16 text-center max-w-2xl mx-auto">
                    <AlertCircle size={64} className="mx-auto mb-6 text-red-500" />
                    <h2 className="text-2xl font-serif text-white mb-4">Order Not Found</h2>
                    <p className="text-muted mb-8">{error || 'Invalid order reference'}</p>
                    <Link to="/cart" className="btn-primary no-underline">
                        Return to Cart
                    </Link>
                </div>
            </div>
        );
    }

    const isPaid = order?.status === 'paid';
    const isPending = order?.status === 'pending' || (!order && !!reference);

    return (
        <div className="section relative">
            <div className="max-w-4xl mx-auto">

                {/* Status Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                        {isPaid ? (
                            <CheckCircle size={80} className="text-[var(--gold-primary)]" strokeWidth={1.5} />
                        ) : (
                            <Loader2 size={80} className="animate-spin text-orange-500" strokeWidth={1.5} />
                        )}
                    </div>

                    <h1 className="font-serif text-4xl mb-4 bg-gradient-to-r from-[var(--gold-light)] via-[var(--gold-primary)] to-[var(--gold-dark)] bg-clip-text text-transparent">
                        {isPaid ? 'Order Confirmed!' : 'Waiting for Payment...'}
                    </h1>

                    <p className="text-gray-400 text-lg mb-2">
                        {isPaid
                            ? 'Thank you for your purchase. Your order has been confirmed.'
                            : 'Please complete your payment in the Paystack window.'}
                    </p>

                    <p className="text-muted">
                        Order ID: <span className="text-[var(--gold-primary)] font-mono">{order?.id?.slice(0, 8).toUpperCase() ?? '—'}</span>
                    </p>

                    {isPolling && (
                        <div className="mt-4 inline-flex items-center gap-2 text-sm text-orange-400">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Checking payment status...</span>
                        </div>
                    )}
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

                    {/* Payment Information */}
                    <div className="card-black">
                        <div className="flex items-center gap-3 mb-6">
                            <CreditCard className="text-[var(--gold-primary)]" size={24} />
                            <h3 className="text-xl font-serif text-[var(--gold-primary)]">Payment Details</h3>
                        </div>

                        {payment ? (
                            <div className="space-y-3 text-gray-400">
                                <div className="flex justify-between">
                                    <span>Provider</span>
                                    <span className="text-white capitalize">{payment.provider}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Amount</span>
                                    <span className="text-white">
                                        {payment.currency} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status</span>
                                    <span className={`font-semibold ${payment.status === 'success' ? 'text-green-400' : 'text-orange-400'}`}>
                                        {payment.status.toUpperCase()}
                                    </span>
                                </div>
                                {payment.provider_payment_id && (
                                    <div className="flex justify-between">
                                        <span>Transaction ID</span>
                                        <span className="text-white font-mono text-sm">{payment.provider_payment_id.slice(0, 12)}...</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted">Payment information not available yet</p>
                        )}
                    </div>

                    {/* Shipping Address */}
                    {shippingAddress && (
                        <div className="card-black">
                            <div className="flex items-center gap-3 mb-6">
                                <MapPin className="text-[var(--gold-primary)]" size={24} />
                                <h3 className="text-xl font-serif text-[var(--gold-primary)]">Shipping Address</h3>
                            </div>

                            <div className="text-gray-400">
                                {shippingAddress.label && (
                                    <p className="text-[var(--gold-primary)] font-semibold mb-2">{shippingAddress.label}</p>
                                )}
                                <p className="text-white">{shippingAddress.line1}</p>
                                {shippingAddress.line2 && <p className="text-white">{shippingAddress.line2}</p>}
                                <p className="text-white">
                                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                                </p>
                                <p className="text-white">{shippingAddress.country}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Items */}
                <div className="card-black mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Package className="text-[var(--gold-primary)]" size={24} />
                        <h3 className="text-xl font-serif text-[var(--gold-primary)]">Order Items</h3>
                    </div>

                    <div className="space-y-4">
                        {orderItems.map((item) => (
                            <div key={item.id} className="flex gap-4 bg-white/5 p-4 rounded-lg">
                                <div className="w-20 h-20 flex-shrink-0">
                                    <ImageWithFallback
                                        src={item.product?.product_images?.[0]?.url || 'https://via.placeholder.com/150'}
                                        alt={item.product?.name}
                                        className="w-full h-full object-cover rounded"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white font-semibold mb-1">{item.product?.name}</h4>
                                    <p className="text-muted text-sm">Quantity: {item.quantity}</p>
                                    <p className="text-[var(--gold-primary)] font-semibold">
                                        ₦{(item.unit_price * item.quantity).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white">₦{item.unit_price.toLocaleString()}</p>
                                    <p className="text-muted text-sm">each</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Total */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-xl font-serif text-white">Total Amount</span>
                            <span className="text-2xl font-bold text-[var(--gold-primary)]">
                                {order?.currency} {order?.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 justify-center">
                    {isPending && (
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="btn-outline-gold flex items-center gap-2"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            Refresh Payment Status
                        </button>
                    )}

                    {isPaid && (
                        <>
                            <Link to="/account" className="btn-outline-gold no-underline">
                                View Orders
                            </Link>
                            <Link to="/shop" className="btn-primary no-underline">
                                Continue Shopping
                            </Link>
                        </>
                    )}
                </div>

                {/* Order Timestamp */}
                <div className="text-center mt-8 text-muted text-sm">
                    Order placed: {order && new Date(order.placed_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            </div>
        </div>
    );
}
