import { useEffect, useState } from 'react';
import {
    CreditCard, ArrowLeft, Loader2, CheckCircle2, XCircle,
    Clock, AlertCircle, Receipt, ExternalLink, ShoppingBag,
    Calendar, Hash, RefreshCw, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchUserPayments, UserPaymentRecord } from '../lib/userPayments';

// Maps currency codes to their symbols — no conversion, just display as-is from DB
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

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
    succeeded:  { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'Succeeded' },
    success:    { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'Success' },
    paid:       { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'Paid' },
    completed:  { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'Completed' },
    pending:    { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   label: 'Pending' },
    processing: { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   label: 'Processing' },
    failed:     { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30',     label: 'Failed' },
    cancelled:  { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30',     label: 'Cancelled' },
    refunded:   { icon: RefreshCw,    color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30',    label: 'Refunded' },
};

function getStatusConfig(status: string | null) {
    if (!status) return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30', label: 'Unknown' };
    return statusConfig[status.toLowerCase()] ?? { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30', label: status };
}

function formatProvider(provider: string | null) {
    if (!provider) return 'Unknown';
    const map: Record<string, string> = {
        stripe: 'Stripe',
        paystack: 'Paystack',
        flutterwave: 'Flutterwave',
        paypal: 'PayPal',
        razorpay: 'Razorpay',
    };
    return map[provider.toLowerCase()] ?? provider;
}

export function PaymentHistory() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [payments, setPayments] = useState<UserPaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
        if (user) fetchPayments();
    }, [user, authLoading, navigate]);

    const fetchPayments = async () => {
        setLoading(true);
        setError(null);
        try {
            const hydratedPayments = await fetchUserPayments(user!.id);
            setPayments(hydratedPayments);
        } catch (err) {
            console.error('[PaymentHistory] Error fetching payments:', err);
            setError('Failed to load payment history. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Group successful payment totals by currency (no conversion)
    const paidByCurrency = payments
        .filter(p => ['succeeded', 'success', 'paid', 'completed'].includes((p.status ?? '').toLowerCase()))
        .reduce((acc: Record<string, number>, p) => {
            const code = (p.currency ?? 'USD').toUpperCase();
            acc[code] = (acc[code] ?? 0) + Number(p.amount ?? 0);
            return acc;
        }, {});
    const totalPaidDisplay = Object.entries(paidByCurrency)
        .map(([code, sum]) => rawAmount(sum as number, code))
        .join(' + ') || '—';

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center">
                    <Loader2 className="animate-spin text-[#FFC92E] mx-auto mb-4" size={48} />
                    <p className="text-gray-500">Loading payment history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="w-full max-w-5xl mx-auto px-4 py-8">

                {/* Back button */}
                <button
                    onClick={() => navigate('/account')}
                    className="flex items-center gap-2 text-gray-400 hover:text-[#FFC92E] transition-colors mb-8 group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Account</span>
                </button>

                {/* Page Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B0B0B] via-[#111] to-[#0B0B0B] p-6 sm:p-8 border border-[#FFC92E]/30 shadow-[0_0_40px_rgba(255,201,46,0.08)] mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/5 to-[#FFC92E]/0" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC92E] rounded-full blur-[120px] opacity-10" />
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-[#FFC92E]/10 rounded-xl border border-[#FFC92E]/20">
                                    <CreditCard className="text-[#FFC92E]" size={24} strokeWidth={1.5} />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-serif font-bold bg-gradient-to-r from-[#FEFDFE] via-[#FFC92E] to-[#DE9D0D] bg-clip-text text-transparent">
                                    Payment History
                                </h1>
                            </div>
                            <p className="text-gray-400 text-sm">Complete record of all your transactions</p>
                        </div>

                        {/* Stats strip */}
                        <div className="flex gap-6 items-center bg-white/5 rounded-xl px-5 py-3 border border-white/5 flex-shrink-0">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Transactions</p>
                                <p className="text-xl font-bold text-white">{payments.length}</p>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Paid</p>
                                <p className="text-xl font-bold bg-gradient-to-b from-[#FFC92E] to-[#DE9D0D] bg-clip-text text-transparent">
                                    {totalPaidDisplay}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error state */}
                {error && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
                        <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                        <button
                            onClick={fetchPayments}
                            className="ml-auto text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-sm font-medium"
                        >
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!error && payments.length === 0 && (
                    <div className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] p-16 text-center border border-dashed border-[#FFC92E]/20">
                        <div className="w-20 h-20 bg-[#FFC92E]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FFC92E]/20">
                            <Receipt size={32} className="text-[#FFC92E]" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">No payment records yet</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">Once you complete a purchase, your payment history will appear here.</p>
                        <button
                            onClick={() => navigate('/shop')}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,201,46,0.3)] transition-all"
                        >
                            <ShoppingBag size={18} />
                            Start Shopping
                        </button>
                    </div>
                )}

                {/* Payment list */}
                {payments.length > 0 && (
                    <div className="space-y-4">
                        {payments.map((payment) => {
                            const cfg = getStatusConfig(payment.status);
                            const StatusIcon = cfg.icon;
                            const isExpanded = expandedId === payment.id;
                            const orderItems = payment.orders?.order_items ?? [];

                            return (
                                <div
                                    key={payment.id}
                                    className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-white/5 shadow-lg hover:border-[#FFC92E]/20 transition-all duration-300 group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/3 to-[#FFC92E]/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Main row */}
                                    <div className="relative z-10 p-5 sm:p-6">
                                        <div className="flex flex-wrap gap-4 items-start justify-between">

                                            {/* Left: status + basic info */}
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${cfg.bg} border ${cfg.border} flex-shrink-0`}>
                                                    <StatusIcon size={20} className={cfg.color} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                                            {cfg.label}
                                                        </span>
                                                        {payment.provider && (
                                                            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                                via {formatProvider(payment.provider)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-2xl font-bold text-white mt-1">
                                                        {rawAmount(payment.amount, payment.currency)}
                                                        <span className="text-sm text-gray-500 ml-2 font-normal">{(payment.currency ?? 'USD').toUpperCase()}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right: meta */}
                                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                    <Calendar size={12} />
                                                    {new Date(payment.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric', month: 'long', day: 'numeric'
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                    <Clock size={12} />
                                                    {new Date(payment.created_at).toLocaleTimeString('en-US', {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* IDs row */}
                                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div className="flex items-center gap-2">
                                                <Hash size={12} className="text-gray-600 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">Payment ID</p>
                                                    <p className="font-mono text-xs text-gray-400 truncate">{payment.id.slice(0, 20)}…</p>
                                                </div>
                                            </div>
                                            {payment.order_id && (
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBag size={12} className="text-gray-600 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] text-gray-600 uppercase tracking-widest">Order ID</p>
                                                        <p className="font-mono text-xs text-gray-400 truncate">#{payment.order_id.slice(0, 8).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {payment.provider_payment_id && (
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={12} className="text-gray-600 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] text-gray-600 uppercase tracking-widest">Provider Ref</p>
                                                        <p className="font-mono text-xs text-gray-400 truncate">{payment.provider_payment_id}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Order status badges */}
                                        {payment.orders && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-[#FFC92E]/30 text-[#FFC92E] bg-[#FFC92E]/5 font-bold">
                                                    Order: {payment.orders.status}
                                                </span>
                                                {payment.orders.fulfillment_status && (
                                                    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 text-gray-400 bg-white/5 font-bold">
                                                        Fulfillment: {payment.orders.fulfillment_status}
                                                    </span>
                                                )}
                                                {payment.orders.delivery_status && (
                                                    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 text-gray-400 bg-white/5 font-bold">
                                                        Delivery: {payment.orders.delivery_status}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="mt-4 flex flex-wrap gap-3 items-center justify-between">
                                            {orderItems.length > 0 && (
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                                                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FFC92E] hover:text-[#FFE55C] transition-colors"
                                                >
                                                    <Package size={14} />
                                                    {isExpanded ? 'Hide' : 'View'} {orderItems.length} item{orderItems.length !== 1 ? 's' : ''}
                                                </button>
                                            )}
                                            <div className="flex gap-3 ml-auto">
                                                {payment.order_id && (
                                                    <button
                                                        onClick={() => navigate(`/track/${payment.order_id}`)}
                                                        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <ExternalLink size={12} />
                                                        Track Order
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded order items */}
                                    {isExpanded && orderItems.length > 0 && (
                                        <div className="relative z-10 border-t border-white/5 bg-white/[0.02]">
                                            <div className="p-5 sm:p-6">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">Items in this order</p>
                                                <div className="space-y-3">
                                                    {orderItems.map((item: any) => (
                                                        <div key={item.id} className="flex gap-3 items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#FFC92E]/20 transition-colors">
                                                            <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 border border-white/10">
                                                                {item.products?.product_images?.[0]?.url && (
                                                                    <img
                                                                        src={item.products.product_images[0].url}
                                                                        className="w-full h-full object-cover"
                                                                        alt={item.products?.name ?? ''}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-white text-sm font-medium truncate">{item.products?.name ?? 'Unknown Product'}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    Qty: {item.quantity}
                                                                    <span className="text-gray-600 ml-1">× ${Number(item.unit_price).toFixed(2)} <span className="text-[10px] uppercase tracking-widest">USD</span></span>
                                                                </p>
                                                                <p className="text-[10px] text-gray-700 mt-0.5">Vendor listing price</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <p className="text-white font-bold text-sm">${(item.quantity * Number(item.unit_price)).toFixed(2)}</p>
                                                                <p className="text-[10px] text-gray-600">USD</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Order metadata */}
                                                {payment.orders?.placed_at && (
                                                    <div className="mt-4 pt-4 border-t border-white/5">
                                                        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                            <Calendar size={12} />
                                                            Order placed: {new Date(payment.orders.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
