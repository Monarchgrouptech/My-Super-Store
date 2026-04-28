import { useState, useEffect } from 'react';
import { Loader2, MapPin, ShoppingBag, AlertCircle, X, CreditCard, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../lib/supabase';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

interface Address {
    id: string;
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
}

interface CartItem {
    id: string;
    quantity: number;
    price_at_time: number;
    products: {
        id: string;
        name: string;
        price: number;
        slug: string;
        product_images: { url: string }[];
    };
}

type PaymentMethod = 'paystack' | 'stripe' | null;

export function Checkout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { rate, formatPrice } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
    const [, setCartId] = useState<string | null>(null);

    const formatUsdAmount = (usdAmount: number) =>
        `$${usdAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const formatNgnAmount = (usdAmount: number) =>
        `₦${Math.round(usdAmount * rate).toLocaleString()}`;

    const formatCheckoutPrice = (usdAmount: number) => {
        if (selectedPaymentMethod === 'paystack') return formatNgnAmount(usdAmount);
        if (selectedPaymentMethod === 'stripe') return formatUsdAmount(usdAmount);
        return formatPrice(usdAmount);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                navigate('/login');
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const { data: cartData, error: cartError } = await supabase
                    .from('carts')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single();

                if (cartError) throw new Error('Failed to load cart');
                setCartId(cartData.id);

                const { data: itemsData, error: itemsError } = await supabase
                    .from('cart_items')
                    .select(`
            id,
            quantity,
            price_at_time,
            products (
              id,
              name,
              price,
              slug,
              product_images (url)
            )
          `)
                    .eq('cart_id', cartData.id);

                if (itemsError) throw new Error('Failed to load cart items');
                const normalizedItems: CartItem[] = (itemsData || [])
                    .map((item: any) => {
                        const product = Array.isArray(item.products) ? item.products[0] : item.products;
                        if (!product) return null;

                        return {
                            id: item.id,
                            quantity: item.quantity,
                            price_at_time: item.price_at_time,
                            products: {
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                slug: product.slug,
                                product_images: product.product_images || [],
                            },
                        } satisfies CartItem;
                    })
                    .filter((item): item is CartItem => item !== null);

                setCartItems(normalizedItems);

                const { data: addressData, error: addressError } = await supabase
                    .from('addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single();

                if (!addressError && addressData) {
                    setShippingAddress(addressData);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load checkout data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, navigate]);

    const subtotal = cartItems.reduce((sum, item) => {
        const price = item.products?.price || item.price_at_time;
        return sum + price * item.quantity;
    }, 0);

    const handlePaystackPayment = async () => {
        setSelectedPaymentMethod('paystack');

        if (!user) {
            setError('Please log in to continue');
            return;
        }

        if (!shippingAddress) {
            setShowAddressModal(true);
            return;
        }

        setProcessingPayment(true);
        setError(null);

        try {
            const items = cartItems.map((item) => ({
                product_id: item.products.id,
                quantity: item.quantity,
                price: item.products.price || item.price_at_time,
            }));

            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', user.id)
                .single();

            const userEmail = profileData?.email || user.email;

            const response = await fetch(
                'https://hoieogginmsfmoarubuu.supabase.co/functions/v1/super-endpoint',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: userEmail,
                        currency: 'NGN',
                        items,
                        shipping_address_id: shippingAddress.id,
                        billing_address_id: shippingAddress.id,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment initialization failed');
            }

            const data = await response.json();

            if (!data.authorization_url || !data.order_id) {
                throw new Error('Invalid response from payment service');
            }

            navigate(`/order-confirmation?order_id=${data.order_id}`);
            window.open(data.authorization_url, '_blank');
        } catch (err) {
            console.error('Payment error:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleStripePayment = async () => {
        setSelectedPaymentMethod('stripe');

        if (!user) {
            setError('Please log in to continue');
            return;
        }

        if (!shippingAddress) {
            setShowAddressModal(true);
            return;
        }

        setProcessingPayment(true);
        setError(null);

        try {
            const items = cartItems.map((item) => ({
                product_id: item.products.id,
                quantity: item.quantity,
                price: item.products.price || item.price_at_time,
            }));

            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', user.id)
                .single();

            const userEmail = profileData?.email || user.email;

            const baseUrl = window.location.origin;
            const success_url = `${baseUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`;
            const cancel_url = `${baseUrl}/checkout`;

            const response = await fetch(
                'https://hoieogginmsfmoarubuu.supabase.co/functions/v1/create-stripe-payment',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: userEmail,
                        currency: 'USD',
                        items,
                        shipping_address_id: shippingAddress.id,
                        billing_address_id: shippingAddress.id,
                        success_url,
                        cancel_url,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment initialization failed');
            }

            const data = await response.json();

            if (!data.checkout_url) {
                throw new Error('Invalid response from payment service');
            }

            window.location.href = data.checkout_url;
        } catch (err) {
            console.error('Payment error:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    if (loading) {
        return (
            <div className="section flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[var(--gold-primary)]" size={48} />
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="section" style={{ overflowX: 'hidden', paddingLeft: 'clamp(1rem, 4vw, 1.5rem)', paddingRight: 'clamp(1rem, 4vw, 1.5rem)' }}>
                <div className="card-black text-center" style={{ padding: 'clamp(2rem, 8vw, 6rem) 1rem' }}>
                    <ShoppingBag size={64} className="mx-auto mb-6 text-[var(--gold-primary)]" />
                    <h3 className="text-white mb-4">Your cart is empty</h3>
                    <p className="text-muted mb-8">Add some items to proceed with checkout</p>
                    <button onClick={() => navigate('/shop')} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="section relative" style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw', paddingLeft: 'clamp(0.75rem, 4vw, 1.5rem)', paddingRight: 'clamp(0.75rem, 4vw, 1.5rem)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '72rem', margin: '0 auto', width: '100%', minWidth: 0 }}>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="page-title" style={{ fontFamily: "'Oswald', sans-serif", fontSize: 'clamp(1.5rem, 5vw, 3rem)', marginBottom: 0 }}>Checkout</h1>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-red-200">{error}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
                    <div className="lg:col-span-2 space-y-6" style={{ minWidth: 0, width: '100%' }}>
                        <div className="card-black" style={{ padding: 'clamp(1rem, 4vw, 2rem)', overflow: 'hidden' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin className="text-[var(--gold-primary)] flex-shrink-0" size={20} />
                                <h3 className="text-white font-bold" style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontFamily: "'Oswald', sans-serif" }}>
                                    Shipping Address
                                </h3>
                            </div>

                            {shippingAddress ? (
                                <div className="bg-white/5 p-6 rounded-lg">
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
                            ) : (
                                <div className="bg-orange-900/20 border border-orange-500/50 p-6 rounded-lg">
                                    <p className="text-orange-200 mb-4">
                                        No shipping address found. Please add your delivery address to continue.
                                    </p>
                                    <button
                                        onClick={() => navigate('/account')}
                                        className="btn-outline-gold"
                                    >
                                        Add Address in Account
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="card-black" style={{ padding: 'clamp(1rem, 4vw, 2rem)', overflow: 'hidden' }}>
                            <h3 className="font-bold mb-4 text-[var(--gold-primary)]" style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontFamily: "'Oswald', sans-serif" }}>
                                Order Items
                            </h3>
                            <div className="space-y-3">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-3 bg-white/5 rounded-lg" style={{ padding: 'clamp(0.5rem, 3vw, 1rem)', minWidth: 0 }}>
                                        <div className="flex-shrink-0" style={{ width: 'clamp(48px, 12vw, 80px)', height: 'clamp(48px, 12vw, 80px)' }}>
                                            <ImageWithFallback
                                                src={item.products?.product_images?.[0]?.url || 'https://via.placeholder.com/150'}
                                                alt={item.products?.name}
                                                className="w-full h-full object-cover rounded"
                                            />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h4 className="text-white font-semibold mb-1 truncate" style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)' }}>{item.products?.name}</h4>
                                            <p className="text-muted text-xs">Qty: {item.quantity}</p>
                                            <p className="text-[var(--gold-primary)] font-semibold text-sm">
                                                {formatCheckoutPrice((item.products?.price || item.price_at_time) * item.quantity)}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-white text-sm">{formatCheckoutPrice(item.products?.price || item.price_at_time)}</p>
                                            <p className="text-muted text-xs">each</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4" style={{ padding: '0 clamp(0rem, 2vw, 1rem)' }}>
                            <h3 className="text-lg font-serif text-[var(--gold-primary)] mb-4">Choose Payment Method</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mx-auto w-full">
                                <button
                                    onClick={handlePaystackPayment}
                                    disabled={processingPayment || !shippingAddress}
                                    className="group relative overflow-hidden bg-black border-[4px] border-[#FFC92E]/20 hover:border-[#FFC92E] text-white py-4 px-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,201,46,0.6),0_0_80px_rgba(255,201,46,0.2)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/5 to-[#FFC92E]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    <div className="p-2 rounded-full bg-[#FFC92E]/10 group-hover:bg-[#FFC92E]/20 transition-colors duration-300">
                                        <Wallet className="text-[#FFC92E]" size={24} />
                                    </div>
                                    <span className="text-white font-bold text-sm font-serif tracking-wide z-10 text-center">
                                        Pay in Naira (₦) — Paystack
                                    </span>
                                    <span className="text-xs text-gray-400 z-10 text-center">
                                        Nigerian Naira payments
                                    </span>
                                </button>

                                <button
                                    onClick={handleStripePayment}
                                    disabled={processingPayment || !shippingAddress}
                                    className="group relative overflow-hidden bg-black border-[4px] border-[#FFC92E]/20 hover:border-[#FFC92E] text-white py-4 px-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,201,46,0.6),0_0_80px_rgba(255,201,46,0.2)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/5 to-[#FFC92E]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    <div className="p-2 rounded-full bg-[#FFC92E]/10 group-hover:bg-[#FFC92E]/20 transition-colors duration-300">
                                        <CreditCard className="text-[#FFC92E]" size={24} />
                                    </div>
                                    <span className="text-white font-bold text-sm font-serif tracking-wide z-10 text-center">
                                        Pay in Dollars ($) — Stripe
                                    </span>
                                    <span className="text-xs text-gray-400 z-10 text-center">
                                        International Dollar payments
                                    </span>
                                </button>
                            </div>

                            {processingPayment && (
                                <div className="flex items-center justify-center gap-2 text-[var(--gold-primary)] py-4">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Processing payment...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ minWidth: 0, width: '100%' }}>
                        <div className="card-black sticky top-24" style={{ padding: 'clamp(1rem, 4vw, 2rem)' }}>
                            <h3 className="font-serif text-xl mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>Order Summary</h3>
                            <div className="space-y-4 text-gray-400">
                                <div className="flex justify-between">
                                    <span>Subtotal ({cartItems.length} items)</span>
                                    <span className="text-white">{formatCheckoutPrice(subtotal)}</span>
                                </div>
                                <div className="border-t border-white/10 pt-4 mt-4">
                                    <p className="text-xs text-muted mb-2">Fees calculated at checkout</p>
                                    <div className="flex justify-between text-white font-bold text-lg">
                                        <span>Subtotal</span>
                                        <span className="text-[var(--gold-primary)]">
                                            {formatCheckoutPrice(subtotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showAddressModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card-black max-w-md w-full relative">
                        <button
                            onClick={() => setShowAddressModal(false)}
                            className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center py-8">
                            <AlertCircle className="mx-auto mb-4 text-orange-500" size={64} />
                            <h3 className="text-2xl font-serif text-white mb-4">Shipping Address Required</h3>
                            <p className="text-muted mb-8">
                                You need to add a delivery address before you can proceed with payment.
                                Please go to your account page and add your shipping address.
                            </p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => setShowAddressModal(false)}
                                    className="btn-outline-gold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => navigate('/account')}
                                    className="btn-primary"
                                >
                                    Go to Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
