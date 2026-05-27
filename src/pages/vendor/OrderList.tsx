import { useState, useEffect } from 'react';
import { 
    Loader2, 
    Package, 
    Copy, 
    CheckCircle2, 
    MapPin,
    Calendar,
    X,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVendor } from '../../hooks/useVendor';
import { OrderWithDetails } from '../../types/vendor';
import { 
    fetchVendorOrderFulfillments, 
    updateVendorReadiness 
} from '../../lib/vendorOrderFulfillments';

const CURRENCY_SYMBOLS: Record<string, string> = {
    NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: '₵', KES: 'KSh', ZAR: 'R',
};
function rawAmount(amount: number, currency: string | null): string {
    const code = (currency ?? 'USD').toUpperCase();
    const sym = CURRENCY_SYMBOLS[code] ?? `${code} `;
    return `${sym}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OrderList() {
    const { vendor, loading: vendorLoading } = useVendor();
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    // Modal state for vendor readiness submission
    const [showReadinessModal, setShowReadinessModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [readinessForm, setReadinessForm] = useState({
        pickup_contact_name: '',
        pickup_contact_phone: '',
        pickup_address: '',
        pickup_city: '',
        pickup_state: '',
        pickup_country: '',
        pickup_notes: '',
    });
    const [readinessErrors, setReadinessErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (vendor) {
            fetchOrders();
        }
    }, [vendor, filterStatus]);

    const fetchOrders = async () => {
        if (!vendor) return;

        try {
            setLoading(true);

            // Get order_items for this vendor
            const { data: orderItems, error: orderItemsError } = await supabase
                .from('order_items')
                .select('*')
                .eq('vendor_id', vendor.id);

            if (orderItemsError) throw orderItemsError;

            if (!orderItems || orderItems.length === 0) {
                setOrders([]);
                return;
            }

            // Get unique order IDs
            const orderIds = [...new Set(orderItems.map(item => item.order_id).filter(Boolean))];

            if (orderIds.length === 0) {
                setOrders([]);
                return;
            }

            // Get orders by IDs
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .in('id', orderIds)
                .order('placed_at', { ascending: false });

            if (ordersError) throw ordersError;

            if (!ordersData || ordersData.length === 0) {
                setOrders([]);
                return;
            }

            // Get products with images
            const productIds = [...new Set(orderItems.map(item => item.product_id).filter(Boolean))];
            let productsData: any[] = [];
            if (productIds.length > 0) {
                const { data: products } = await supabase
                    .from('products')
                    .select('id, name, price, sku, product_images(url, position)')
                    .in('id', productIds);
                productsData = products || [];
            }

            // Get addresses
            const addressIds = [...new Set(ordersData.map(order => order.shipping_address_id).filter(Boolean))];
            let addressesData: any[] = [];
            if (addressIds.length > 0) {
                const { data: addresses } = await supabase
                    .from('addresses')
                    .select('*')
                    .in('id', addressIds);
                addressesData = addresses || [];
            }

            // Get payments
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('*')
                .in('order_id', orderIds.map(id => id as string));

            // Get vendor order fulfillments for all these orders
            const vendorFulfillmentsMap = new Map<string, any[]>();
            for (const orderId of orderIds) {
                const fulfillments = await fetchVendorOrderFulfillments(orderId);
                vendorFulfillmentsMap.set(orderId, fulfillments);
            }

            // Combine all data
            const ordersMap = new Map<string, OrderWithDetails>();
            ordersData.forEach((order: any) => {
                ordersMap.set(order.id, {
                    ...order,
                    order_items: [],
                    payments: paymentsData?.filter(p => p.order_id === order.id) || [],
                    shipping_address: addressesData.find(addr => addr.id === order.shipping_address_id) || null,
                    vendor_order_fulfillments: vendorFulfillmentsMap.get(order.id) || [],
                });
            });

            orderItems.forEach((item: any) => {
                const order = ordersMap.get(item.order_id);
                if (order) {
                    const items = order.order_items || [];
                    items.push({
                        ...item,
                        products: productsData.find(p => p.id === item.product_id) || null,
                    });
                    order.order_items = items;
                }
            });

            let ordersList = Array.from(ordersMap.values());
            if (filterStatus !== 'all') {
                if (filterStatus === 'paid') {
                    ordersList = ordersList.filter(o => (o.status || '').toLowerCase() === 'paid');
                } else if (filterStatus === 'processing') {
                    ordersList = ordersList.filter(o => (o.fulfillment_status || '').toLowerCase() === 'pending' || (o.fulfillment_status || '').toLowerCase() === 'packed');
                } else {
                    ordersList = ordersList.filter(o => (o.fulfillment_status || '').toLowerCase() === filterStatus);
                }
            }

            setOrders(ordersList);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const openReadinessModal = (orderId: string) => {
        setSelectedOrderId(orderId);
        setShowReadinessModal(true);
        setReadinessErrors({});
        setSubmitError(null);
        // Reset form
        setReadinessForm({
            pickup_contact_name: '',
            pickup_contact_phone: '',
            pickup_address: '',
            pickup_city: '',
            pickup_state: '',
            pickup_country: '',
            pickup_notes: '',
        });
    };

    const validateReadinessForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!readinessForm.pickup_contact_name.trim()) {
            errors.pickup_contact_name = 'Contact name is required';
        }

        if (!readinessForm.pickup_contact_phone.trim()) {
            errors.pickup_contact_phone = 'Contact phone is required';
        }

        if (!readinessForm.pickup_address.trim()) {
            errors.pickup_address = 'Pickup address is required';
        }

        if (!readinessForm.pickup_city.trim()) {
            errors.pickup_city = 'City is required';
        }

        if (!readinessForm.pickup_state.trim()) {
            errors.pickup_state = 'State is required';
        }

        if (!readinessForm.pickup_country.trim()) {
            errors.pickup_country = 'Country is required';
        }

        setReadinessErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitReadiness = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateReadinessForm() || !selectedOrderId || !vendor) {
            return;
        }

        try {
            setUpdating(selectedOrderId);
            setSubmitError(null);

            // Update vendor_order_fulfillments table
            // This will trigger database triggers to sync order state
            await updateVendorReadiness(selectedOrderId, vendor.id, {
                pickup_contact_name: readinessForm.pickup_contact_name,
                pickup_contact_phone: readinessForm.pickup_contact_phone,
                pickup_address: readinessForm.pickup_address,
                pickup_city: readinessForm.pickup_city,
                pickup_state: readinessForm.pickup_state,
                pickup_country: readinessForm.pickup_country,
                pickup_notes: readinessForm.pickup_notes || undefined,
            });

            // Refresh orders to show updated state
            await fetchOrders();

            // Close modal
            setShowReadinessModal(false);
            setSelectedOrderId(null);
        } catch (err) {
            console.error('Error updating vendor readiness:', err);
            setSubmitError(err instanceof Error ? err.message : 'Failed to update readiness');
        } finally {
            setUpdating(null);
        }
    };

    const handleMarkReady = (orderId: string) => {
        openReadinessModal(orderId);
    };

    const getVendorReadinessStatus = (orderId: string): 'not_ready' | 'ready' | null => {
        const order = orders.find(o => o.id === orderId);
        if (!order || !vendor) return null;

        const fulfillment = order.vendor_order_fulfillments?.find(f => f.vendor_id === vendor.id);
        return fulfillment?.status || 'not_ready';
    };

    const isOrderGloballyReady = (order: OrderWithDetails): boolean => {
        if (!order.vendor_order_fulfillments || order.vendor_order_fulfillments.length === 0) {
            return false;
        }
        return order.vendor_order_fulfillments.every(f => f.status === 'ready');
    };

    const getOtherVendorsReadiness = (orderId: string): Array<{ vendor_id: string; status: string }> => {
        const order = orders.find(o => o.id === orderId);
        if (!order || !vendor) return [];

        return (order.vendor_order_fulfillments || [])
            .filter(f => f.vendor_id !== vendor.id)
            .map(f => ({ vendor_id: f.vendor_id, status: f.status }));
    };
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[#D4AF37] mb-4" size={48} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Orders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 md:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-[#0A0A0A]">Sales Orders</h2>
                    <p className="text-gray-500 mt-1">Manage products sold and prepare them for delivery.</p>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'paid', 'processing', 'delivered'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                filterStatus === status
                                ? 'bg-[#0A0A0A] text-[#D4AF37] shadow-lg shadow-black/10'
                                : 'bg-white text-gray-500 border border-gray-100 hover:border-[#D4AF37]'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 gap-6">
                {orders.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-gray-200">
                            <Package className="text-gray-300" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
                        <p className="text-gray-500 mt-2">When customers buy your products, they will appear here.</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group">
                            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                                {/* Order Summary Sidebar */}
                                <div className="md:w-64 shrink-0 space-y-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order Ref</p>
                                        <div className="flex items-center gap-2 group/id cursor-pointer" onClick={() => {
                                            navigator.clipboard.writeText(order.id);
                                            setCopiedOrderId(order.id);
                                            setTimeout(() => setCopiedOrderId(null), 2000);
                                        }}>
                                            <span className="text-sm font-bold text-[#0A0A0A] font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                                            <Copy size={12} className={`transition-opacity ${copiedOrderId === order.id ? 'text-emerald-500' : 'text-[#D4AF37] opacity-0 group-hover/id:opacity-100'}`} />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                        <div className="flex">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                                order.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-50">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Earnings</p>
                                        {order.payments && order.payments.length > 0 ? (
                                            <p className="text-2xl font-serif font-bold text-[#0A0A0A]">
                                                {rawAmount(
                                                    Number(order.payments[0].amount ?? 0),
                                                    order.payments[0].currency
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-2xl font-serif font-bold text-[#0A0A0A]">
                                                ${(order.order_items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0).toFixed(2)}
                                                <span className="text-xs text-gray-400 ml-1 font-normal">USD</span>
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-0.5">Actual amount paid</p>
                                    </div>
                                </div>

                                {/* Order Items Content */}
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                                            <Calendar size={14} />
                                            {new Date(order.placed_at).toLocaleDateString()} at {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            {getVendorReadinessStatus(order.id) === 'ready' && (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100">
                                                    <CheckCircle2 size={14} />
                                                    Your Items Ready
                                                </div>
                                            )}
                                            {getVendorReadinessStatus(order.id) === 'not_ready' && (
                                                <button 
                                                    onClick={() => handleMarkReady(order.id)}
                                                    disabled={updating === order.id}
                                                    className="px-6 py-2 bg-[#0A0A0A] text-[#D4AF37] rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    Mark Ready
                                                </button>
                                            )}
                                            {!isOrderGloballyReady(order) && getOtherVendorsReadiness(order.id).length > 0 && (
                                                <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-100">
                                                    <AlertCircle size={12} />
                                                    Waiting for {getOtherVendorsReadiness(order.id).length} vendor(s)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {(order.order_items || []).map((item) => (
                                            <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-50 group-hover:border-[#D4AF37]/10 transition-colors">
                                                <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                                    <img 
                                                        src={item.products?.product_images?.[0]?.url || '/placeholder-product.png'} 
                                                        alt={item.products?.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-[#0A0A0A] truncate">{item.products?.name}</h4>
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-widest">SKU: {item.products?.sku || 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-[#0A0A0A]">Qty: {item.quantity}</p>
                                                    <p className="text-xs text-gray-500 font-medium">${Number(item.unit_price).toFixed(2)} <span className="text-[10px] text-gray-400">USD ea</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Shipping Summary for Context */}
                                    {order.shipping_address && (
                                        <div className="pt-6 border-t border-gray-50 flex items-start gap-3">
                                            <MapPin className="text-gray-400 shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Shipping To</p>
                                                <p className="text-xs text-gray-600 font-medium">{order.shipping_address.city}, {order.shipping_address.country}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Vendor Readiness Modal */}
            {showReadinessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
                            <h2 className="text-2xl font-serif font-bold text-[#0A0A0A]">
                                Mark Items Ready for Pickup
                            </h2>
                            <button
                                onClick={() => setShowReadinessModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmitReadiness} className="p-6 md:p-8 space-y-6">
                            {submitError && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
                                    <p className="text-sm text-red-800">{submitError}</p>
                                </div>
                            )}

                            <p className="text-gray-600 text-sm">
                                Please provide your pickup location and contact information. This will allow delivery partners to collect the order.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Contact Name */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Contact Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={readinessForm.pickup_contact_name}
                                        onChange={(e) =>
                                            setReadinessForm({
                                                ...readinessForm,
                                                pickup_contact_name: e.target.value,
                                            })
                                        }
                                        onBlur={() => {
                                            setReadinessErrors((prev) => {
                                                const next = { ...prev };
                                                if (!readinessForm.pickup_contact_name.trim()) {
                                                    next.pickup_contact_name = 'Contact name is required';
                                                } else {
                                                    delete next.pickup_contact_name;
                                                }
                                                return next;
                                            });
                                        }}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            readinessErrors.pickup_contact_name
                                                ? 'border-red-300 focus:ring-red-300'
                                                : 'border-gray-200 focus:ring-[#D4AF37]'
                                        }`}
                                        placeholder="John Doe"
                                    />
                                    {readinessErrors.pickup_contact_name && (
                                        <p className="text-red-600 text-xs mt-1">{readinessErrors.pickup_contact_name}</p>
                                    )}
                                </div>

                                {/* Contact Phone */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Contact Phone *
                                    </label>
                                    <input
                                        type="tel"
                                        value={readinessForm.pickup_contact_phone}
                                        onChange={(e) =>
                                            setReadinessForm({
                                                ...readinessForm,
                                                pickup_contact_phone: e.target.value,
                                            })
                                        }
                                        onBlur={() => {
                                            setReadinessErrors((prev) => {
                                                const next = { ...prev };
                                                if (!readinessForm.pickup_contact_phone.trim()) {
                                                    next.pickup_contact_phone = 'Contact phone is required';
                                                } else {
                                                    delete next.pickup_contact_phone;
                                                }
                                                return next;
                                            });
                                        }}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            readinessErrors.pickup_contact_phone
                                                ? 'border-red-300 focus:ring-red-300'
                                                : 'border-gray-200 focus:ring-[#D4AF37]'
                                        }`}
                                        placeholder="+234 123 456 7890"
                                    />
                                    {readinessErrors.pickup_contact_phone && (
                                        <p className="text-red-600 text-xs mt-1">{readinessErrors.pickup_contact_phone}</p>
                                    )}
                                </div>

                                {/* Pickup Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Pickup Address *
                                    </label>
                                    <input
                                        type="text"
                                        value={readinessForm.pickup_address}
                                        onChange={(e) =>
                                            setReadinessForm({
                                                ...readinessForm,
                                                pickup_address: e.target.value,
                                            })
                                        }
                                        onBlur={() => {
                                            setReadinessErrors((prev) => {
                                                const next = { ...prev };
                                                if (!readinessForm.pickup_address.trim()) {
                                                    next.pickup_address = 'Pickup address is required';
                                                } else {
                                                    delete next.pickup_address;
                                                }
                                                return next;
                                            });
                                        }}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            readinessErrors.pickup_address
                                                ? 'border-red-300 focus:ring-red-300'
                                                : 'border-gray-200 focus:ring-[#D4AF37]'
                                        }`}
                                        placeholder="123 Business Street"
                                    />
                                    {readinessErrors.pickup_address && (
                                        <p className="text-red-600 text-xs mt-1">{readinessErrors.pickup_address}</p>
                                    )}
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        City *
                                    </label>
                                    <input
                                        type="text"
                                        value={readinessForm.pickup_city}
                                        onChange={(e) =>
                                            setReadinessForm({
                                                ...readinessForm,
                                                pickup_city: e.target.value,
                                            })
                                        }
                                        onBlur={() => {
                                            setReadinessErrors((prev) => {
                                                const next = { ...prev };
                                                if (!readinessForm.pickup_city.trim()) {
                                                    next.pickup_city = 'City is required';
                                                } else {
                                                    delete next.pickup_city;
                                                }
                                                return next;
                                            });
                                        }}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            readinessErrors.pickup_city
                                                ? 'border-red-300 focus:ring-red-300'
                                                : 'border-gray-200 focus:ring-[#D4AF37]'
                                        }`}
                                        placeholder="Lagos"
                                    />
                                    {readinessErrors.pickup_city && (
                                        <p className="text-red-600 text-xs mt-1">{readinessErrors.pickup_city}</p>
                                    )}
                                </div>

                                {/* State */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        State *
                                    </label>
                                    <input
                                        type="text"
                                        value={readinessForm.pickup_state}
                                        onChange={(e) =>
                                            setReadinessForm({
                                                ...readinessForm,
                                                pickup_state: e.target.value,
                                            })
                                        }
                                        onBlur={() => {
                                            setReadinessErrors((prev) => {
                                                const next = { ...prev };
                                                if (!readinessForm.pickup_state.trim()) {
                                                    next.pickup_state = 'State is required';
                                                } else {
                                                    delete next.pickup_state;
                                                }
                                                return next;
                                            });
                                        }}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            readinessErrors.pickup_state
                                                ? 'border-red-300 focus:ring-red-300'
                                                : 'border-gray-200 focus:ring-[#D4AF37]'
                                        }`}
                                        placeholder="Lagos"
                                    />
                                    {readinessErrors.pickup_state && (
                                        <p className="text-red-600 text-xs mt-1">{readinessErrors.pickup_state}</p>
                                    )}
                                </div>

                                {/* Country */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Country *
                                    </label>
                                    <input
                                        type="text"
                                        value={readinessForm.pickup_country}
                                        onChange={(e) =>
                                            setReadinessForm({
                                                ...readinessForm,
                                                pickup_country: e.target.value,
                                            })
                                        }
                                        onBlur={() => {
                                            setReadinessErrors((prev) => {
                                                const next = { ...prev };
                                                if (!readinessForm.pickup_country.trim()) {
                                                    next.pickup_country = 'Country is required';
                                                } else {
                                                    delete next.pickup_country;
                                                }
                                                return next;
                                            });
                                        }}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            readinessErrors.pickup_country
                                                ? 'border-red-300 focus:ring-red-300'
                                                : 'border-gray-200 focus:ring-[#D4AF37]'
                                        }`}
                                        placeholder="Nigeria"
                                    />
                                    {readinessErrors.pickup_country && (
                                        <p className="text-red-600 text-xs mt-1">{readinessErrors.pickup_country}</p>
                                    )}
                                </div>

                                {/* Notes (Optional) */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Additional Notes (Optional)
                                    </label>
                                    <textarea
                                        value={readinessForm.pickup_notes}
                                        onChange={(e) =>
                                            setReadinessForm({
                                                ...readinessForm,
                                                pickup_notes: e.target.value,
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all resize-none"
                                        rows={3}
                                        placeholder="e.g., Best time to pick up, specific instructions, etc."
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-4 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowReadinessModal(false)}
                                    disabled={updating === selectedOrderId}
                                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating === selectedOrderId || Object.keys(readinessErrors).length > 0}
                                    className="flex-1 px-6 py-3 bg-[#0A0A0A] text-[#D4AF37] rounded-xl font-bold hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating === selectedOrderId ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            Submit Readiness
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

