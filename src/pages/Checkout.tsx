import { useState, useEffect } from 'react';
import { Loader2, MapPin, ShoppingBag, AlertCircle, X, CreditCard, Wallet, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
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

interface ExchangeRates {
    base: string;
    results: Record<string, number>;
    updated: string;
}

// Payment method to currency mappings
// const PAYMENT_CURRENCY_MAP: Record<string, string[]> = {
//     paystack: ['NGN', 'GHS', 'ZAR', 'KES', 'USD'], // Paystack supported currencies
//     stripe: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL'], // Stripe primary supported
// };

export function Checkout() {
    const navigate = useNavigate();
    const { } = useCart();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
    const [, setSelectedPaymentMethod] = useState<'paystack' | 'stripe' | null>(null);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
    const [, setCartId] = useState<string | null>(null);

    // Currency symbol mapping
    const currencySymbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        NGN: '₦',
        CAD: 'C$',
        AUD: 'A$',
        CHF: 'CHF',
        CNY: '¥',
        INR: '₹',
        BRL: 'R$',
        MXN: '$',
        ZAR: 'R',
    };

    // Helper function to format currency
    const formatCurrency = (amount: number, currency: string = selectedCurrency) => {
        const symbol = currencySymbols[currency] || currency;

        // Handle large numbers (for currencies like VND, JPY)
        if (amount > 10000) {
            return `${symbol}${Math.round(amount).toLocaleString()}`;
        }
        return `${symbol}${amount.toFixed(2)}`;
    };

    // Helper function to convert USD to selected currency
    const convertPrice = (usdAmount: number, targetCurrency: string = selectedCurrency) => {
        if (!exchangeRates || targetCurrency === 'USD') return usdAmount;
        const rate = exchangeRates.results[targetCurrency];
        return usdAmount * rate;
    };

    // Fetch cart data, address, and exchange rates on mount
    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                navigate('/login');
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Fetch exchange rates
                const ratesResponse = await fetch('/exchange-rates.json');
                const rates: ExchangeRates = await ratesResponse.json();
                setExchangeRates(rates);

                // Fetch user's cart
                const { data: cartData, error: cartError } = await supabase
                    .from('carts')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single();

                if (cartError) throw new Error('Failed to load cart');
                setCartId(cartData.id);

                // Fetch cart items with product details
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
                setCartItems(itemsData as any);

                // Fetch user's shipping address
                const { data: addressData, error: addressError } = await supabase
                    .from('addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single();

                // It's okay if there's no address - we'll show modal later
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

    // Calculate subtotal only (fees calculated on backend)
    const subtotal = cartItems.reduce((sum, item) => {
        const price = item.products?.price || item.price_at_time;
        return sum + (price * item.quantity);
    }, 0);

    const convertedSubtotal = convertPrice(subtotal, selectedCurrency);

    // Handle Paystack payment
    const handlePaystackPayment = async () => {
        if (!user) {
            setError('Please log in to continue');
            return;
        }

        // Check if address exists
        if (!shippingAddress) {
            setShowAddressModal(true);
            return;
        }

        setSelectedPaymentMethod('paystack');
        setProcessingPayment(true);
        setError(null);

        try {
            // Build items array for Edge Function
            const items = cartItems.map(item => ({
                product_id: item.products.id,
                quantity: item.quantity,
                price: item.products.price || item.price_at_time
            }));

            // Get user email from user_profiles
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', user.id)
                .single();

            const userEmail = profileData?.email || user.email;

            // Call Edge Function to create payment - backend handles currency conversion
            const response = await fetch(
                'https://hoieogginmsfmoarubuu.supabase.co/functions/v1/super-endpoint',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: userEmail,
                        currency: 'USD',
                        items: items,
                        shipping_address_id: shippingAddress.id,
                        billing_address_id: shippingAddress.id
                    })
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

            // Navigate to order confirmation page
            navigate(`/order-confirmation?order_id=${data.order_id}`);

            // Open Paystack in a new tab
            window.open(data.authorization_url, '_blank');

        } catch (err) {
            console.error('Payment error:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Handle Stripe payment
    const handleStripePayment = async () => {
        if (!user) {
            setError('Please log in to continue');
            return;
        }

        // Check if address exists
        if (!shippingAddress) {
            setShowAddressModal(true);
            return;
        }

        setSelectedPaymentMethod('stripe');
        setProcessingPayment(true);
        setError(null);

        try {
            // Build items array for Edge Function
            const items = cartItems.map(item => ({
                product_id: item.products.id,
                quantity: item.quantity,
                price: item.products.price || item.price_at_time
            }));

            // Get user email from user_profiles
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', user.id)
                .single();

            const userEmail = profileData?.email || user.email;

            // Prepare success and cancel URLs
            const baseUrl = window.location.origin;
            const success_url = `${baseUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`;
            const cancel_url = `${baseUrl}/checkout`;

            console.log('Calling Stripe with:', {
                user_id: user.id,
                email: userEmail,
                items_count: items.length,
                success_url,
                cancel_url
            });

            // Call Stripe Edge Function - backend handles currency conversion
            const response = await fetch(
                'https://hoieogginmsfmoarubuu.supabase.co/functions/v1/create-stripe-payment',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: userEmail,
                        currency: 'USD',
                        items: items,
                        shipping_address_id: shippingAddress.id,
                        billing_address_id: shippingAddress.id,
                        success_url: success_url,
                        cancel_url: cancel_url
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Stripe API error:', errorData);
                throw new Error(errorData.error || 'Payment initialization failed');
            }

            const data = await response.json();
            console.log('Stripe response:', data);

            if (!data.checkout_url) {
                throw new Error('Invalid response from payment service');
            }

            // Redirect to Stripe Checkout (don't navigate to order confirmation yet)
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
            <div className="section">
                <div className="card-black p-24 text-center">
                    <ShoppingBag size={64} className="mx-auto mb-6 text-[var(--gold-primary)]" />
                    <h3 className="text-white mb-4">Your cart is empty</h3>
                    <p className="text-muted mb-8">Add some items to proceed with checkout</p>
                    <button onClick={() => navigate('/shop')} className="btn-primary">
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="section relative">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="page-title" style={{ fontFamily: "'Oswald', sans-serif" }}>Checkout</h1>

                    {/* Currency Selector - For display purposes only */}
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-[var(--gold-primary)]/20 hover:border-[var(--gold-primary)]/50 transition-colors">
                        <Globe size={20} className="text-[var(--gold-primary)]" />
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            className="bg-transparent text-white outline-none cursor-pointer text-sm font-medium"
                        >
                            {exchangeRates && Object.keys(exchangeRates.results)
                                .sort()
                                .map((currency) => (
                                    <option key={currency} value={currency} className="bg-gray-900 text-white">
                                        {currency}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-red-200">{error}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Shipping Address Display */}
                        <div className="card-black">
                            <div className="flex items-center gap-3 mb-6">
                                <MapPin className="text-[var(--gold-primary)]" size={24} />
                                <h3 className="text-2xl font-serif text-[var(--gold-primary)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
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

                        {/* Cart Items Summary */}
                        <div className="card-black">
                            <h3 className="text-2xl font-serif mb-6 text-[var(--gold-primary)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                Order Items
                            </h3>
                            <div className="space-y-4">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-4 bg-white/5 p-4 rounded-lg">
                                        <div className="w-20 h-20 flex-shrink-0">
                                            <ImageWithFallback
                                                src={item.products?.product_images?.[0]?.url || 'https://via.placeholder.com/150'}
                                                alt={item.products?.name}
                                                className="w-full h-full object-cover rounded"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-white font-semibold mb-1">{item.products?.name}</h4>
                                            <p className="text-muted text-sm">Quantity: {item.quantity}</p>
                                            <p className="text-[var(--gold-primary)] font-semibold">
                                                {formatCurrency(convertPrice((item.products?.price || item.price_at_time) * item.quantity, selectedCurrency), selectedCurrency)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white">{formatCurrency(convertPrice(item.products?.price || item.price_at_time, selectedCurrency), selectedCurrency)}</p>
                                            <p className="text-muted text-sm">each</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Buttons */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-serif text-[var(--gold-primary)] mb-4">Choose Payment Method</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Paystack Button */}
                                <button
                                    onClick={handlePaystackPayment}
                                    disabled={processingPayment || !shippingAddress}
                                    className="group relative overflow-hidden bg-black border-[4px] border-[#FFC92E]/20 hover:border-[#FFC92E] text-white py-5 px-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,201,46,0.6),0_0_80px_rgba(255,201,46,0.2)] hover:scale-[1.05] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/5 to-[#FFC92E]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                    <div className="p-3 rounded-full bg-[#FFC92E]/10 group-hover:bg-[#FFC92E]/20 transition-colors duration-300">
                                        <Wallet className="text-[#FFC92E]" size={28} />
                                    </div>

                                    <div className="flex flex-col items-center gap-1 z-10">
                                        <span className="text-gray-400 font-medium tracking-wide uppercase text-[10px]">Pay with Paystack</span>
                                        <span className="text-white font-bold text-xl font-serif tracking-wider">
                                            {formatCurrency(convertedSubtotal, selectedCurrency)}
                                        </span>
                                    </div>
                                </button>

                                {/* Stripe Button */}
                                <button
                                    onClick={handleStripePayment}
                                    disabled={processingPayment || !shippingAddress}
                                    className="group relative overflow-hidden bg-black border-[4px] border-[#FFC92E]/20 hover:border-[#FFC92E] text-white py-5 px-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,201,46,0.6),0_0_80px_rgba(255,201,46,0.2)] hover:scale-[1.05] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/5 to-[#FFC92E]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                    <div className="p-3 rounded-full bg-[#FFC92E]/10 group-hover:bg-[#FFC92E]/20 transition-colors duration-300">
                                        <CreditCard className="text-[#FFC92E]" size={28} />
                                    </div>

                                    <div className="flex flex-col items-center gap-1 z-10">
                                        <span className="text-gray-400 font-medium tracking-wide uppercase text-[10px]">Pay with Stripe</span>
                                        <span className="text-white font-bold text-xl font-serif tracking-wider">
                                            {formatCurrency(convertedSubtotal, selectedCurrency)}
                                        </span>
                                    </div>
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

                    {/* Order Summary Sidebar */}
                    <div>
                        <div className="card-black sticky top-24">
                            <h3 className="font-serif text-xl mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>Order Summary</h3>
                            <div className="space-y-4 text-gray-400">
                                <div className="flex justify-between">
                                    <span>Subtotal ({cartItems.length} items)</span>
                                    <span className="text-white">{formatCurrency(convertedSubtotal, selectedCurrency)}</span>
                                </div>
                                <div className="border-t border-white/10 pt-4 mt-4">
                                    <p className="text-xs text-muted mb-2">Fees calculated at checkout</p>
                                    <div className="flex justify-between text-white font-bold text-lg">
                                        <span>Subtotal</span>
                                        <span className="text-[var(--gold-primary)]">
                                            {formatCurrency(convertedSubtotal, selectedCurrency)}
                                        </span>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>

            {/* Address Missing Modal */}
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
