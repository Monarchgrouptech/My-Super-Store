import { useEffect, useState } from 'react';
import { CreditCard, LogOut, ChevronRight, ShoppingBag, Loader2, Sparkles, Crown, Star, Package, X, MapPin, Truck, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Receipt, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { useDeliveryPartner } from '../hooks/useDeliveryPartner';
import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../lib/avatarUtils';
import { Avatar } from '../components/Avatar';
import { useNavigate, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { getAddressFromLocation } from '../lib/geolocationUtils';
import { useCurrency } from '../context/CurrencyContext';
import { fetchUserOrders, isSuccessfulPaymentStatus, UserOrderRecord } from '../lib/userOrders';
import { buildUserPaymentsFromOrders, UserPaymentRecord } from '../lib/userPayments';

// Raw payment display — reads currency symbol from DB, NO conversion applied
const CURRENCY_SYMBOLS: Record<string, string> = {
    NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: '₵',
    KES: 'KSh', ZAR: 'R', CAD: 'CA$', AUD: 'A$', JPY: '¥',
};
function rawAmount(amount: number | null | undefined, currency: string | null | undefined): string {
    const code = (currency ?? 'USD').toUpperCase();
    const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
    const value = Number(amount ?? 0);
    return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Account() {
    const { user, signOut, loading: authLoading } = useAuth();
    const { isAdmin, loading: adminLoading } = useAdmin();
    const { isPartner, loading: partnerLoading } = useDeliveryPartner();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('orders');
    const [ordersPage, setOrdersPage] = useState(0);
    const [orders, setOrders] = useState<UserOrderRecord[]>([]);
    const [payments, setPayments] = useState<UserPaymentRecord[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<any>({
        display_name: '',
        email: '',
    });
    const [editAddressData, setEditAddressData] = useState<any>({
        line1: '',
        line2: '',
        neighborhood: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        label: 'Home',
    });
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
        if (user) fetchData();
    }, [user, authLoading, navigate]);

    // Redirect admins to admin panel
    useEffect(() => {
        if (!authLoading && !adminLoading && user && isAdmin) {
            navigate('/admin');
        }
    }, [user, isAdmin, authLoading, adminLoading, navigate]);

    // Redirect delivery partners to delivery dashboard
    useEffect(() => {
        if (!authLoading && !partnerLoading && user && isPartner) {
            navigate('/delivery/dashboard');
        }
    }, [user, isPartner, authLoading, partnerLoading, navigate]);

    const fetchData = async () => {
        setLoading(true);
        setPaymentsLoading(true);
        try {
            const [
                { data: profileData },
                { data: addressesData },
                userOrders,
            ] = await Promise.all([
                supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user!.id)
                    .single(),
                supabase
                    .from('addresses')
                    .select('*')
                    .eq('user_id', user!.id),
                fetchUserOrders(user!.id),
            ]);

            setProfile(profileData);
            setEditFormData({
                display_name: profileData?.display_name || '',
                email: user?.email || '',
            });

            // Load avatar URL - prioritize user_profiles.avatar_url, then auth user metadata
            if (profileData?.avatar_url) {
                const url = await getAvatarUrl(profileData.avatar_url);
                setAvatarUrl(url);
            } else if (user?.user_metadata?.avatar_url) {
                const url = await getAvatarUrl(user.user_metadata.avatar_url);
                setAvatarUrl(url);
            }

            setAddresses(addressesData || []);
            setOrders(userOrders);
            setPayments(
                buildUserPaymentsFromOrders(userOrders)
                    .filter((payment) => isSuccessfulPaymentStatus(payment.status))
                    .slice(0, 3)
            );

            // Fetch user's cart from carts table, then get cart_items with products
            const { data: cartData } = await supabase
                .from('carts')
                .select('id')
                .eq('user_id', user!.id)
                .single();

            if (cartData?.id) {
                const { data: cartItemsData } = await supabase
                    .from('cart_items')
                    .select(`*, products ( name, price, product_images ( url ) )`)
                    .eq('cart_id', cartData.id);
                setCartItems(cartItemsData || []);
            } else {
                setCartItems([]);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setOrders([]);
            setPayments([]);
            setCartItems([]);
        } finally {
            setPaymentsLoading(false);
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleEditProfileClick = () => {
        setEditFormData({
            display_name: profile?.display_name || '',
            email: user?.email || '',
        });
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    display_name: editFormData.display_name,
                })
                .eq('user_id', user!.id);

            if (error) throw error;

            console.log('[Profile] Profile updated successfully');
            setProfile({ ...profile, display_name: editFormData.display_name });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('[Profile] Error saving profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGetLocation = async () => {
        try {
            setIsLoadingLocation(true);

            const addressData = await getAddressFromLocation();

            setEditAddressData({
                line1: addressData.line1,
                neighborhood: addressData.neighborhood,
                city: addressData.city,
                state: addressData.state,
                country: addressData.country,
                postal_code: addressData.postal_code,
                label: 'Current Location',
            });
        } catch (error) {
            const errorMessage = (error as Error).message;
            let userMessage = 'Failed to get location.';

            if (errorMessage.includes('not supported')) {
                userMessage = 'Geolocation is not supported in your browser.';
            } else if (errorMessage.includes('permission denied')) {
                userMessage = 'Please enable location access in your browser settings and try again.';
            } else if (errorMessage.includes('timed out')) {
                userMessage = 'Location request timed out. Please ensure location services are enabled.';
            } else if (errorMessage.includes('internet')) {
                userMessage = 'Please check your internet connection and try again.';
            }

            alert(userMessage);
            console.error('[AddressTracking] Location error:', error);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleSaveAddress = async () => {
        try {
            setLoading(true);
            const fullLine1 = [editAddressData.line1, editAddressData.neighborhood].filter(Boolean).join(', ');
            console.log('[Address] Saving address:', { ...editAddressData, line1: fullLine1 });

            // Check if address exists for user
            const { data: existingAddress } = await supabase
                .from('addresses')
                .select('id')
                .eq('user_id', user!.id)
                .single();

            const addressData = {
                user_id: user!.id,
                label: editAddressData.label,
                line1: fullLine1,
                line2: editAddressData.line2,
                city: editAddressData.city,
                state: editAddressData.state,
                country: editAddressData.country,
                postal_code: editAddressData.postal_code,
            };

            if (existingAddress) {
                // Update existing
                const { error } = await supabase
                    .from('addresses')
                    .update(addressData)
                    .eq('id', existingAddress.id);
                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('addresses')
                    .insert(addressData);
                if (error) throw error;
            }

            console.log('[Address] Address saved successfully');
            await fetchData();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('[Address] Error saving address:', error);
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        { id: 'orders', label: 'Orders', icon: Crown, description: 'Track your purchases' },
        { id: 'cart', label: 'Cart', icon: ShoppingBag, description: 'Items in your cart' },
        { id: 'addresses', label: 'Addresses', icon: Sparkles, description: 'Delivery locations' },
        { id: 'payment', label: 'Payment', icon: CreditCard, description: 'Cards & billing' },
        { id: 'profile', label: 'Profile', icon: Star, description: 'Personal info' },
    ];

    if (authLoading || adminLoading || partnerLoading || (loading && !profile && !orders.length)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center">
                    <Loader2 className="animate-spin text-[#FFC92E] mx-auto mb-4" size={48} />
                    <p className="text-gray-500">Verifying access...</p>
                </div>
            </div>
        );
    }

    const ORDERS_PER_PAGE = 5;
    const totalOrderPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
    const pagedOrders = orders.slice(ordersPage * ORDERS_PER_PAGE, (ordersPage + 1) * ORDERS_PER_PAGE);

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            <SEO title="My Account" description="Manage your profile, shipping addresses, order history, and payment details." robots="noindex, nofollow" />
            <div className="w-full max-w-7xl mx-auto px-4 py-8">
                    {/* Welcome Header */}
                    <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B0B0B] via-[#111] to-[#0B0B0B] p-4 sm:p-6 border border-[#FFC92E]/30 shadow-[0_0_30px_rgba(255,201,46,0.1)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FEFDFE] via-[#FFC92E] to-[#DE9D0D] opacity-5"></div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFC92E] rounded-full blur-[60px] opacity-10"></div>
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-[#FFC92E]/10 rounded-full border border-[#FFC92E]/20 flex-shrink-0">
                                        <Crown className="text-[#FFC92E]" size={20} strokeWidth={1.5} />
                                    </div>
                                    <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold bg-gradient-to-r from-[#FEFDFE] via-[#FFC92E] to-[#DE9D0D] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] truncate">
                                        Welcome Back
                                    </h1>
                                </div>
                                <p className="text-gray-400 text-sm sm:text-base truncate">{profile?.display_name || user?.user_metadata?.full_name || 'Valued Customer'}</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex-shrink-0">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5 font-bold">Orders</p>
                                    <p className="text-lg font-bold bg-gradient-to-b from-[#FFC92E] to-[#DE9D0D] bg-clip-text text-transparent">{orders.length}</p>
                                </div>
                                <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5 font-bold">Tier</p>
                                    <p className="text-sm font-semibold text-white flex items-center gap-1 justify-end">
                                        <Star size={12} className="fill-[#FFC92E] text-[#FFC92E]" />
                                        Gold
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
                        {/* Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* User Card */}
                            <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-[#FFC92E]/20 shadow-xl group" style={{ padding: 'clamp(1rem, 4vw, 1.5rem)' }}>
                                <div className="absolute inset-0 bg-gradient-to-b from-[#FFC92E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#FEFDFE] via-[#FFC92E] to-[#DE9D0D] rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                                        <div className="relative w-24 h-24 rounded-full p-[2px] bg-gradient-to-r from-[#FEFDFE] via-[#FFC92E] to-[#DE9D0D]">
                                            <Avatar
                                                src={avatarUrl}
                                                displayName={profile?.display_name || user?.user_metadata?.full_name || user?.email}
                                                className="w-full h-full"
                                                fallbackClassName="bg-[#0B0B0B] border border-[#FFC92E]/30 text-3xl font-bold"
                                            />
                                        </div>
                                        <div className="absolute bottom-0 right-0 bg-[#0B0B0B] rounded-full p-1 border border-[#FFC92E]">
                                            <div className="w-3 h-3 bg-[#00FF00] rounded-full animate-pulse"></div>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {profile?.display_name || user?.user_metadata?.full_name || 'Valued Customer'}
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-6 font-mono">{user?.email}</p>

                                    <button
                                        onClick={handleEditProfileClick}
                                        className="w-full py-2 rounded-lg bg-[#FFC92E]/10 border border-[#FFC92E]/30 text-[#FFC92E] text-xs font-bold uppercase tracking-widest hover:bg-[#FFC92E] hover:text-black transition-all duration-300">
                                        Edit Profile
                                    </button>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#0F0F0F] shadow-lg">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={`w-full flex items-center gap-4 p-5 transition-all duration-300 text-left border-b border-white/5 last:border-b-0 group relative overflow-hidden
                                            ${activeSection === item.id
                                                ? 'bg-white/5'
                                                : 'hover:bg-white/5'
                                            }`}
                                    >
                                        {activeSection === item.id && (
                                            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#FFC92E] to-[#DE9D0D]"></div>
                                        )}
                                        <div className={`relative z-10 p-2 rounded-lg transition-all duration-300 ${activeSection === item.id
                                            ? 'bg-gradient-to-br from-[#FFC92E] to-[#DE9D0D] text-black shadow-[0_0_15px_rgba(255,201,46,0.3)]'
                                            : 'bg-white/5 text-gray-400 group-hover:text-[#FFC92E] group-hover:bg-[#FFC92E]/10'
                                            }`}>
                                            <item.icon size={18} strokeWidth={activeSection === item.id ? 2.5 : 2} />
                                        </div>
                                        <div className="flex-1 relative z-10">
                                            <div className={`text-sm font-bold tracking-wide transition-colors ${activeSection === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                                {item.label}
                                            </div>
                                            <div className={`text-[10px] uppercase tracking-wider ${activeSection === item.id ? 'text-[#FFC92E]' : 'text-gray-600'}`}>
                                                {item.description}
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={16}
                                            className={`relative z-10 transition-all duration-300 ${activeSection === item.id
                                                ? 'text-[#FFC92E] translate-x-0'
                                                : 'text-gray-600 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'
                                                }`}
                                        />
                                    </button>
                                ))}

                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-4 p-5 text-gray-500 hover:text-red-400 transition-all text-left group relative overflow-hidden hover:bg-red-500/5"
                                >
                                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-red-500/10 transition-all">
                                        <LogOut size={18} strokeWidth={2} />
                                    </div>
                                    <span className="font-medium text-sm tracking-wide">Sign Out</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="lg:col-span-3" style={{ minWidth: 0, width: '100%' }}>
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-serif font-bold text-white">
                                        {menuItems.find(i => i.id === activeSection)?.label}
                                    </h2>
                                    <div className="h-px w-12 bg-[#FFC92E]/30"></div>
                                </div>
                            </div>

                            {activeSection === 'orders' && (
                                <div className="space-y-6">
                                    {orders.length === 0 ? (
                                        <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] p-16 text-center border border-dashed border-[#FFC92E]/20">
                                            <div className="relative z-10">
                                                <div className="w-20 h-20 bg-[#FFC92E]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FFC92E]/20">
                                                    <ShoppingBag size={32} className="text-[#FFC92E]" strokeWidth={1.5} />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-3">No orders placed yet</h3>
                                                <p className="text-gray-500 mb-8 max-w-md mx-auto">Start your collection of premium products today.</p>
                                                <Link
                                                    to="/shop"
                                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.3)] transition-all transform hover:-translate-y-0.5 no-underline"
                                                >
                                                    <Sparkles size={18} />
                                                    Explore Shop
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                        {pagedOrders.map((order) => (
                                            <div key={order.id} className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-white/5 shadow-lg hover:border-[#FFC92E]/30 transition-all duration-300 group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/5 to-[#FFC92E]/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                <div className="relative z-10 p-4 border-b border-white/5 bg-white/[0.02]">
                                                    <div className="flex flex-wrap gap-3 justify-between items-center">
                                                        <div className="flex flex-wrap gap-4">
                                                            <div>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Order ID</p>
                                                                <p className="font-mono text-white text-xs sm:text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Date</p>
                                                                <p className="text-gray-300 text-xs sm:text-sm">{new Date(order.placed_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Amount Paid</p>
                                                                <p className="text-base font-bold text-[#FFC92E]">
                                                                    {order.primary_payment
                                                                        ? rawAmount(order.primary_payment.amount, order.primary_payment.currency)
                                                                        : 'Awaiting payment'}
                                                                </p>
                                                                {order.primary_payment ? (
                                                                    <p className="text-[10px] text-gray-600 uppercase">
                                                                        {(order.primary_payment.currency ?? 'USD')} {order.primary_payment.provider ? `• ${order.primary_payment.provider}` : ''}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[10px] text-gray-600 uppercase">No successful payment yet</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="px-2 py-1 rounded border border-[#FFC92E]/30 text-[10px] font-bold uppercase tracking-widest text-[#FFC92E] bg-[#FFC92E]/10">
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {order.primary_payment && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className="px-2 py-1 rounded border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300 bg-white/5">
                                                                Payment: {order.primary_payment.status ?? 'unknown'}
                                                            </span>
                                                            {order.primary_payment.provider && (
                                                                <span className="px-2 py-1 rounded border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300 bg-white/5">
                                                                    Provider: {order.primary_payment.provider}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="relative z-10 p-4 space-y-3">
                                                    {order.order_items?.map((item: any) => (
                                                        <div key={item.id} className="flex gap-3 items-center p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                                            <div className="w-12 h-12 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/10">
                                                                {item.products?.product_images?.[0]?.url && (
                                                                    <img src={item.products.product_images[0].url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-white text-sm font-medium mb-0.5 truncate">{item.products?.name}</h4>
                                                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Tracking Link */}
                                                    <div className="pt-3 mt-3 border-t border-white/5 flex justify-end">
                                                        <button 
                                                            onClick={() => navigate(`/track/${order.id}`)}
                                                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#FFC92E] hover:text-[#FFE55C] transition-colors"
                                                        >
                                                            <Truck size={14} />
                                                            Track Order Journey
                                                            <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Pagination */}
                                        {totalOrderPages > 1 && (
                                            <div className="pagination-controls">
                                                <button
                                                    className="pagination-btn"
                                                    onClick={() => setOrdersPage(p => Math.max(0, p - 1))}
                                                    disabled={ordersPage === 0}
                                                >← Prev</button>
                                                <span className="pagination-info">Page {ordersPage + 1} of {totalOrderPages}</span>
                                                <button
                                                    className="pagination-btn"
                                                    onClick={() => setOrdersPage(p => Math.min(totalOrderPages - 1, p + 1))}
                                                    disabled={ordersPage >= totalOrderPages - 1}
                                                >Next →</button>
                                            </div>
                                        )}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeSection === 'cart' && (
                                <div className="space-y-6">
                                    {cartItems.length === 0 ? (
                                        <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] p-16 text-center border border-dashed border-[#FFC92E]/20">
                                            <div className="relative z-10">
                                                <div className="w-20 h-20 bg-[#FFC92E]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FFC92E]/20">
                                                    <Package size={32} className="text-[#FFC92E]" strokeWidth={1.5} />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-3">Your cart is empty</h3>
                                                <p className="text-gray-500 mb-8 max-w-md mx-auto">Add items to your cart to get started.</p>
                                                <Link
                                                    to="/shop"
                                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.3)] transition-all transform hover:-translate-y-0.5 no-underline"
                                                >
                                                    <Sparkles size={18} />
                                                    Start Shopping
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-white/5 shadow-lg group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/5 to-[#FFC92E]/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="relative z-10 p-6 border-b border-white/5 bg-white/[0.02]">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-lg font-bold text-white">Cart Preview</h3>
                                                    <span className="px-3 py-1 rounded bg-[#FFC92E]/10 border border-[#FFC92E]/30 text-[#FFC92E] text-sm font-bold">
                                                        {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="relative z-10 p-6 space-y-4">
                                                {cartItems.map((item: any) => (
                                                    <div key={item.id} className="flex gap-4 items-center p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                                        <div className="w-16 h-16 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/10">
                                                            {item.products?.product_images?.[0]?.url && (
                                                                <img src={item.products.product_images[0].url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-white font-medium mb-1">{item.products?.name}</h4>
                                                            <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatPrice(parseFloat(item.price_at_time))}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-white">{formatPrice(item.quantity * parseFloat(item.price_at_time))}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="relative z-10 p-6 border-t border-white/5 bg-white/[0.01]">
                                                <div className="flex justify-between items-center mb-4">
                                                    <p className="text-gray-400">Subtotal</p>
                                                    <p className="text-white font-bold">
                                                        {formatPrice(cartItems.reduce((sum, item) => sum + (item.quantity * parseFloat(item.price_at_time)), 0))}
                                                    </p>
                                                </div>
                                                <Link
                                                    to="/cart"
                                                    className="w-full py-3 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.3)] transition-all flex items-center justify-center gap-2 no-underline"
                                                >
                                                    <ShoppingBag size={18} />
                                                    View Full Cart
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment Section */}
                            {activeSection === 'payment' && (
                                <div className="space-y-5">
                                    {paymentsLoading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="animate-spin text-[#FFC92E]" size={36} />
                                        </div>
                                    ) : payments.length === 0 ? (
                                        <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] p-16 text-center border border-dashed border-[#FFC92E]/20">
                                            <div className="w-20 h-20 bg-[#FFC92E]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FFC92E]/20">
                                                <Receipt size={32} className="text-[#FFC92E]" strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-3">No payment records yet</h3>
                                            <p className="text-gray-500 mb-8 max-w-md mx-auto">Complete a purchase to see your payment history here.</p>
                                            <Link
                                                to="/shop"
                                                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.3)] transition-all transform hover:-translate-y-0.5 no-underline"
                                            >
                                                <ShoppingBag size={18} />
                                                Shop Now
                                            </Link>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Summary strip */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {[
                                                    { label: 'Total Transactions', value: payments.length + (payments.length >= 3 ? '+' : ''), icon: CreditCard },
                                                    { label: 'Latest Amount', value: rawAmount(payments[0]?.amount, payments[0]?.currency), icon: Receipt },
                                                    { label: 'Latest Status', value: (payments[0]?.status ?? 'N/A').charAt(0).toUpperCase() + (payments[0]?.status ?? '').slice(1), icon: CheckCircle2 },
                                                ].map((stat) => (
                                                    <div key={stat.label} className="relative overflow-hidden rounded-xl bg-[#0F0F0F] border border-white/5 p-4 group hover:border-[#FFC92E]/20 transition-all">
                                                        <div className="absolute top-0 right-0 w-12 h-12 bg-[#FFC92E] rounded-full blur-[30px] opacity-0 group-hover:opacity-10 transition-opacity" />
                                                        <stat.icon size={16} className="text-[#FFC92E] mb-2" strokeWidth={1.5} />
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{stat.label}</p>
                                                        <p className="text-lg font-bold text-white">{stat.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Recent payments list */}
                                            <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-white/5 shadow-lg">
                                                <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                                    <h3 className="text-base font-bold text-white">Recent Payments</h3>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">Preview — last 3</span>
                                                </div>

                                                <div className="divide-y divide-white/5">
                                                    {payments.map((payment: any) => {
                                                        const statusMap: Record<string, { icon: any; color: string; bg: string; border: string }> = {
                                                            succeeded:  { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
                                                            success:    { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
                                                            paid:       { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
                                                            completed:  { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
                                                            pending:    { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30' },
                                                            processing: { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30' },
                                                            failed:     { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30' },
                                                            refunded:   { icon: RefreshCw,    color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30' },
                                                        };
                                                        const key = (payment.status ?? '').toLowerCase();
                                                        const cfg = statusMap[key] ?? { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30' };
                                                        const StatusIcon = cfg.icon;

                                                        return (
                                                            <div key={payment.id} className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors group">
                                                                {/* Status icon */}
                                                                <div className={`p-2.5 rounded-xl ${cfg.bg} border ${cfg.border} flex-shrink-0`}>
                                                                    <StatusIcon size={18} className={cfg.color} />
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                                                            {(payment.status ?? 'unknown').charAt(0).toUpperCase() + (payment.status ?? '').slice(1)}
                                                                        </span>
                                                                        {payment.provider && (
                                                                            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                                                {payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 mt-1 font-mono">
                                                                        Order #{payment.order_id?.slice(0, 8).toUpperCase()}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                                                        {new Date(payment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                        {' · '}
                                                                        {new Date(payment.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>

                                                                {/* Amount — raw from DB, no conversion */}
                                                                <div className="text-right flex-shrink-0">
                                                                    <p className="text-lg font-bold text-white">{rawAmount(payment.amount, payment.currency)}</p>
                                                                    <p className="text-[10px] text-gray-600 uppercase">{(payment.currency ?? 'USD').toUpperCase()}</p>
                                                                </div>

                                                                {/* Track link */}
                                                                {payment.order_id && (
                                                                    <button
                                                                        onClick={() => navigate(`/track/${payment.order_id}`)}
                                                                        className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-[#FFC92E]/10 hover:text-[#FFC92E] text-gray-600 transition-all"
                                                                        title="Track this order"
                                                                    >
                                                                        <ExternalLink size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* View all CTA */}
                                                <div className="p-5 border-t border-white/5 bg-white/[0.01]">
                                                    <button
                                                        onClick={() => navigate('/account/payments')}
                                                        className="w-full py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,201,46,0.3)] transition-all transform hover:-translate-y-0.5 text-sm"
                                                    >
                                                        <CreditCard size={16} />
                                                        View Full Payment History
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Placeholders for other sections to handle layout */}
                            {activeSection === 'addresses' && (
                                <div className="space-y-6">
                                    <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] p-8 border border-[#FFC92E]/20 shadow-lg">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC92E] rounded-full blur-[100px] opacity-5"></div>
                                        <div className="relative z-10 max-w-3xl mx-auto">
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8">
                                                <MapPin size={24} className="text-[#FFC92E]" />
                                                Delivery Addresses
                                            </h3>

                                            {/* Address List */}
                                            {addresses.length > 0 && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                                    {addresses.map((addr) => (
                                                        <div key={addr.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#FFC92E]/30 transition-all group relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="w-2 h-2 rounded-full bg-[#FFC92E] shadow-[0_0_10px_#FFC92E]"></div>
                                                            </div>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <p className="font-bold text-white text-base">{addr.label}</p>
                                                                <span className="p-1 rounded-full bg-[#FFC92E]/10 text-[#FFC92E]">
                                                                    <MapPin size={12} />
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1 text-sm text-gray-400">
                                                                <p className="text-gray-300 font-medium">{addr.line1}</p>
                                                                {addr.line2 && <p>{addr.line2}</p>}
                                                                <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                                                                <p>{addr.country}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Address Form */}
                                            <div className="bg-white/[0.02] rounded-xl p-6 border border-white/5">
                                                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                                    <Sparkles size={16} className="text-[#FFC92E]" />
                                                    Add / Update Address
                                                </h4>

                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Address Label</label>
                                                        <input
                                                            type="text"
                                                            value={editAddressData.label}
                                                            onChange={(e) => setEditAddressData({ ...editAddressData, label: e.target.value })}
                                                            placeholder="e.g., Home, Work"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Address Line 1</label>
                                                        <input
                                                            type="text"
                                                            value={editAddressData.line1}
                                                            onChange={(e) => setEditAddressData({ ...editAddressData, line1: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Neighborhood/Region (Added to Line 1)</label>
                                                        <input
                                                            type="text"
                                                            value={editAddressData.neighborhood}
                                                            onChange={(e) => setEditAddressData({ ...editAddressData, neighborhood: e.target.value })}
                                                            placeholder="e.g., Shonibare Estate"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Address Line 2 (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={editAddressData.line2}
                                                            onChange={(e) => setEditAddressData({ ...editAddressData, line2: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">City</label>
                                                            <input
                                                                type="text"
                                                                value={editAddressData.city}
                                                                onChange={(e) => setEditAddressData({ ...editAddressData, city: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">State/Province</label>
                                                            <input
                                                                type="text"
                                                                value={editAddressData.state}
                                                                onChange={(e) => setEditAddressData({ ...editAddressData, state: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Country</label>
                                                            <input
                                                                type="text"
                                                                value={editAddressData.country}
                                                                onChange={(e) => setEditAddressData({ ...editAddressData, country: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Postal Code</label>
                                                            <input
                                                                type="text"
                                                                value={editAddressData.postal_code}
                                                                onChange={(e) => setEditAddressData({ ...editAddressData, postal_code: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleGetLocation}
                                                        disabled={isLoadingLocation}
                                                        className="w-full py-3 bg-white/5 border border-white/10 hover:border-[#FFC92E]/50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                        title="Uses device GPS for accuracy, falls back to IP geolocation"
                                                    >
                                                        {isLoadingLocation ? (
                                                            <>
                                                                <Loader2 size={18} className="animate-spin" />
                                                                Getting Location...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <MapPin size={18} />
                                                                Use Current Location
                                                            </>
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={handleSaveAddress}
                                                        disabled={loading}
                                                        className="w-full py-4 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <Loader2 size={18} className="animate-spin" />
                                                                Saving Address...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles size={18} />
                                                                Save Address
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'profile' && (
                                <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] p-8 border border-[#FFC92E]/20 shadow-lg">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC92E] rounded-full blur-[100px] opacity-5"></div>
                                    <form className="relative z-10 space-y-6 max-w-2xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Full Name</label>
                                                <input
                                                    type="text"
                                                    defaultValue={profile?.display_name || user?.user_metadata?.full_name}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Phone</label>
                                                <input
                                                    type="tel"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Email</label>
                                            <input
                                                disabled
                                                value={user?.email}
                                                className="w-full bg-black/20 border border-white/5 rounded-lg p-3 text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="px-8 py-3 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.2)] transition-all flex items-center gap-2"
                                        >
                                            <Sparkles size={18} />
                                            Save Changes
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-[#FFC92E]/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 p-6 border-b border-white/5 bg-gradient-to-r from-[#0B0B0B] via-[#111] to-[#0B0B0B] flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Edit Profile & Addresses</h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="mini-btn p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-white" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-8">
                            {/* Profile Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Star size={20} className="text-[#FFC92E]" />
                                    Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Full Name</label>
                                        <input
                                            type="text"
                                            value={editFormData.display_name}
                                            onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Email</label>
                                        <input
                                            type="email"
                                            disabled
                                            value={editFormData.email}
                                            className="w-full bg-black/20 border border-white/5 rounded-lg p-3 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Addresses Section */}
                            <div className="space-y-4 border-t border-white/5 pt-8">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <MapPin size={20} className="text-[#FFC92E]" />
                                    Delivery Addresses
                                </h3>

                                {/* Current Addresses */}
                                {addresses.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-400">Your saved addresses:</p>
                                        {addresses.map((addr) => (
                                            <div key={addr.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                                <p className="font-semibold text-white text-sm mb-1">{addr.label}</p>
                                                <p className="text-xs text-gray-400">{addr.line1}</p>
                                                {addr.neighborhood && <p className="text-xs text-gray-400">{addr.neighborhood}</p>}
                                                {addr.line2 && <p className="text-xs text-gray-400">{addr.line2}</p>}
                                                <p className="text-xs text-gray-400">{addr.city}, {addr.state} {addr.postal_code}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add New Address Form */}
                                <div className="space-y-4 mt-6 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                                    <h4 className="text-sm font-bold text-white">Add New Address</h4>
                                    <div>
                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Address Label</label>
                                        <input
                                            type="text"
                                            value={editAddressData.label}
                                            onChange={(e) => setEditAddressData({ ...editAddressData, label: e.target.value })}
                                            placeholder="e.g., Home, Work, Apartment"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Address Line 1</label>
                                        <input
                                            type="text"
                                            value={editAddressData.line1}
                                            onChange={(e) => setEditAddressData({ ...editAddressData, line1: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Neighborhood/Region</label>
                                        <input
                                            type="text"
                                            value={editAddressData.neighborhood}
                                            onChange={(e) => setEditAddressData({ ...editAddressData, neighborhood: e.target.value })}
                                            placeholder="e.g., Shonibare Estate, Maryland"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Address Line 2 (Optional)</label>
                                        <input
                                            type="text"
                                            value={editAddressData.line2}
                                            onChange={(e) => setEditAddressData({ ...editAddressData, line2: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">City</label>
                                            <input
                                                type="text"
                                                value={editAddressData.city}
                                                onChange={(e) => setEditAddressData({ ...editAddressData, city: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">State/Province</label>
                                            <input
                                                type="text"
                                                value={editAddressData.state}
                                                onChange={(e) => setEditAddressData({ ...editAddressData, state: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Country</label>
                                            <input
                                                type="text"
                                                value={editAddressData.country}
                                                onChange={(e) => setEditAddressData({ ...editAddressData, country: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 mb-2 text-[10px] uppercase tracking-widest font-bold">Postal Code</label>
                                            <input
                                                type="text"
                                                value={editAddressData.postal_code}
                                                onChange={(e) => setEditAddressData({ ...editAddressData, postal_code: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGetLocation}
                                        disabled={isLoadingLocation}
                                        className="w-full py-3 bg-white/5 border border-white/10 hover:border-[#FFC92E]/50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        title="Uses device GPS for accuracy, falls back to IP geolocation"
                                    >
                                        {isLoadingLocation ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Getting Location...
                                            </>
                                        ) : (
                                            <>
                                                <MapPin size={18} />
                                                Use Current Location
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 p-6 border-t border-white/5 bg-gradient-to-r from-[#0B0B0B] via-[#111] to-[#0B0B0B] flex gap-4">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-lg hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleSaveProfile();
                                    handleSaveAddress();
                                }}
                                disabled={loading}
                                className="flex-1 py-3 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
