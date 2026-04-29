import { useState, useEffect } from 'react';
import { 
    Loader2, 
    Package, 
    Clock, 
    CheckCircle, 
    XCircle, 
    Copy, 
    CreditCard, 
    CheckCircle2, 
    AlertCircle,
    ChevronRight,
    MapPin,
    Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVendor } from '../../hooks/useVendor';
import { OrderWithDetails } from '../../types/vendor';
import { useCurrency } from '../../context/CurrencyContext';

export function OrderList() {
    const { vendor, loading: vendorLoading } = useVendor();
    const { currency, formatPrice } = useCurrency();
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

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

            // Combine all data
            const ordersMap = new Map<string, OrderWithDetails>();
            ordersData.forEach((order: any) => {
                ordersMap.set(order.id, {
                    ...order,
                    order_items: [],
                    payments: paymentsData?.filter(p => p.order_id === order.id) || [],
                    shipping_address: addressesData.find(addr => addr.id === order.shipping_address_id) || null,
                });
            });

            orderItems.forEach((item: any) => {
                const order = ordersMap.get(item.order_id);
                if (order) {
                    order.order_items.push({
                        ...item,
                        products: productsData.find(p => p.id === item.product_id) || null,
                    });
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

    const handleMarkReady = async (orderId: string) => {
        try {
            setUpdating(orderId);
            const now = new Date().toISOString();

            // Update order fulfillment_status to 'packed' (meaning ready for pickup)
            const { error } = await supabase
                .from('orders')
                .update({ 
                    fulfillment_status: 'packed',
                    updated_at: now
                })
                .eq('id', orderId);

            if (error) throw error;

            // Log status change
            await supabase.from('order_status_history').insert({
                order_id: orderId,
                status_type: 'fulfillment',
                old_value: orders.find(o => o.id === orderId)?.fulfillment_status,
                new_value: 'packed',
                note: 'Vendor marked items as ready for pickup.',
                changed_by: vendor?.user_id
            });

            // Create tracking event
            await supabase.from('order_tracking_events').insert({
                order_id: orderId,
                status: 'packed',
                location: vendor?.city || 'Vendor Location',
                description: 'Items have been packed and are ready for pickup by the delivery partner.',
                event_time: now
            });

            // Update local state instead of full refresh
            setOrders(prev => prev.map(o => 
                o.id === orderId 
                    ? { ...o, fulfillment_status: 'packed', updated_at: now } 
                    : o
            ));
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status.');
        } finally {
            setUpdating(null);
        }
    };

    if (vendorLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[#D4AF37] mb-4" size={48} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Orders...</p>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'pending':
                return <Clock className="text-yellow-600" size={20} />;
            case 'paid':
                return <CheckCircle className="text-green-600" size={20} />;
            case 'processing':
                return <Clock className="text-blue-600" size={20} />;
            case 'delivered':
            case 'completed':
                return <CheckCircle className="text-green-600" size={20} />;
            case 'shipped':
                return <Package className="text-blue-600" size={20} />;
            case 'cancelled':
                return <XCircle className="text-red-600" size={20} />;
            default:
                return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'delivered':
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'shipped':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const copyShippingAddress = async (address: any, orderId: string) => {
        if (!address) return;

        const formattedAddress = `${address.line1 || ''}${address.line2 ? '\n' + address.line2 : ''}\n${address.city || ''}, ${address.state || ''} ${address.postal_code || ''}\n${address.country || ''}`;

        try {
            await navigator.clipboard.writeText(formattedAddress);
            setCopiedOrderId(orderId);
            setTimeout(() => setCopiedOrderId(null), 2000);
        } catch (err) {
            console.error('Failed to copy address:', err);
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

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
                                        <p className="text-2xl font-serif font-bold text-[#0A0A0A]">{formatPrice(order.order_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}</p>
                                    </div>
                                </div>

                                {/* Order Items Content */}
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                                            <Calendar size={14} />
                                            {new Date(order.placed_at).toLocaleDateString()} at {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {order.fulfillment_status === 'pending' && (
                                            <button 
                                                onClick={() => handleMarkReady(order.id)}
                                                disabled={updating === order.id}
                                                className="px-6 py-2 bg-[#0A0A0A] text-[#D4AF37] rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {updating === order.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                Ready for Pickup
                                            </button>
                                        )}
                                        {order.fulfillment_status === 'packed' && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100">
                                                <CheckCircle2 size={14} />
                                                Ready for Dispatch
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {order.order_items.map((item) => (
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
                                                    <p className="text-xs text-gray-500 font-medium">{formatPrice(item.unit_price)} ea</p>
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
        </div>
    );
}


