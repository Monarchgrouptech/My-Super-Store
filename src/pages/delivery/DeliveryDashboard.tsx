import { useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    ArrowRight,
    Headphones,
    Link as LinkIcon,
    Loader2,
    Map as MapIcon,
    MapPin,
    Package,
    Plug,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../context/CurrencyContext';
import { useDeliveryPartner } from '../../hooks/useDeliveryPartner';

interface Address {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
}

interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    products?: {
        name?: string;
    };
}

interface Order {
    id: string;
    status?: string;
    total_amount: number;
    placed_at: string;
    fulfillment_status?: string;
    delivery_status?: string;
    user_profiles?: {
        display_name?: string;
        email?: string;
    };
    addresses?: Address | null;
    order_items?: OrderItem[];
}

interface LocalTimelineEvent {
    id: string;
    status: string;
    description: string;
    event_time: string;
}

type TimelineState = 'active' | 'done' | 'future';

interface TimelineRow {
    id: string;
    title: string;
    timestamp: string;
    description: string;
    state: TimelineState;
}

function normalizeStatus(status?: string | null) {
    return (status || 'pending').replace(/_/g, ' ').toLowerCase();
}

function toDisplayStatus(status?: string | null) {
    const normalized = normalizeStatus(status);
    if (normalized === 'shipped') return 'IN TRANSIT';
    return normalized.toUpperCase();
}

function formatOrderId(orderId: string) {
    return `#${orderId.slice(0, 8).toUpperCase()}`;
}

function formatRelativeTime(dateString: string) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatTimelineTimestamp(dateString: string) {
    return new Date(dateString).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getTrackingNumber(order: Order) {
    return `TRK-${order.id.slice(0, 4).toUpperCase()}-${order.id.slice(-4).toUpperCase()}`;
}

export function DeliveryDashboard() {
    const navigate = useNavigate();
    const { partner, loading: partnerLoading } = useDeliveryPartner();
    const { formatPrice } = useCurrency();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [carrierName, setCarrierName] = useState('DHL EXPRESS');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [timelineEventsByOrderId, setTimelineEventsByOrderId] = useState<Record<string, LocalTimelineEvent[]>>({});
    const detailsPanelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (partnerLoading) return;
        if (!partner) {
            setLoading(false);
            return;
        }

        void fetchOrders();
    }, [partner, partnerLoading]);

    useEffect(() => {
        detailsPanelRef.current?.scrollTo({ top: 0 });
    }, [selectedOrder?.id]);

    async function fetchOrders() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    user_profiles (*),
                    addresses:shipping_address_id (*),
                    order_items (*, products (*))
                `)
                .eq('status', 'paid')
                .order('placed_at', { ascending: false });

            if (error) throw error;

            const nextOrders = (data || []) as Order[];
            setOrders(nextOrders);
            setSelectedOrder((current) => {
                if (!nextOrders.length) return null;
                if (!current) return nextOrders[0];
                return nextOrders.find((order) => order.id === current.id) || nextOrders[0];
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleQuickStatusUpdate(orderId: string, newStatus: string) {
        if (!partner || updatingStatus) return;

        try {
            setUpdatingStatus(true);
            const now = new Date().toISOString();
            const eventDescription = `Shipment status updated to ${toDisplayStatus(newStatus)}`;

            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    delivery_status: newStatus,
                    updated_at: now,
                })
                .eq('id', orderId);

            if (orderError) throw orderError;

            const { error: trackingError } = await supabase.from('order_tracking_events').insert({
                order_id: orderId,
                status: newStatus,
                location: partner.city || 'OPERATIONS CENTER',
                description: eventDescription,
                event_time: now,
            });

            if (trackingError) throw trackingError;

            const optimisticEvent: LocalTimelineEvent = {
                id: `${orderId}-${now}`,
                status: newStatus,
                description: eventDescription,
                event_time: now,
            };

            setTimelineEventsByOrderId((current) => ({
                ...current,
                [orderId]: [optimisticEvent, ...(current[orderId] || [])],
            }));
            setOrders((current) => current.map((order) => (
                order.id === orderId ? { ...order, delivery_status: newStatus } : order
            )));
            setSelectedOrder((current) => (
                current?.id === orderId ? { ...current, delivery_status: newStatus } : current
            ));

            await fetchOrders();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Status update failed. Please check permissions.');
        } finally {
            setUpdatingStatus(false);
        }
    }

    async function handleCreateShipment() {
        if (!selectedOrder || !partner || !trackingNumber.trim()) {
            alert('Please provide a tracking number.');
            return;
        }

        try {
            setCreating(true);
            const now = new Date().toISOString();
            const { data: existingFulfillment } = await supabase
                .from('order_fulfillments')
                .select('id')
                .eq('order_id', selectedOrder.id)
                .maybeSingle();

            let fulfillmentId: string | undefined = existingFulfillment?.id;

            if (fulfillmentId) {
                const { error } = await supabase
                    .from('order_fulfillments')
                    .update({
                        carrier_name: carrierName,
                        tracking_number: trackingNumber,
                        tracking_url: trackingUrl,
                        status: 'shipped',
                        updated_at: now,
                    })
                    .eq('id', fulfillmentId);

                if (error) throw error;
            } else {
                const { data: newFulfillment, error } = await supabase
                    .from('order_fulfillments')
                    .insert({
                        order_id: selectedOrder.id,
                        delivery_partner_id: partner.id,
                        carrier_name: carrierName,
                        tracking_number: trackingNumber,
                        tracking_url: trackingUrl,
                        status: 'shipped',
                    })
                    .select()
                    .single();

                if (error) throw error;
                fulfillmentId = newFulfillment.id;
            }

            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    delivery_status: 'shipped',
                    updated_at: now,
                })
                .eq('id', selectedOrder.id);

            if (orderError) throw orderError;

            const description = `Shipment initialized via ${carrierName}. Tracking: ${trackingNumber}`;
            const { error: trackingError } = await supabase.from('order_tracking_events').insert({
                order_id: selectedOrder.id,
                fulfillment_id: fulfillmentId,
                status: 'shipped',
                location: partner.city || 'OPERATIONS CENTER',
                description,
                event_time: now,
            });

            if (trackingError) throw trackingError;

            setTimelineEventsByOrderId((current) => ({
                ...current,
                [selectedOrder.id]: [
                    {
                        id: `${selectedOrder.id}-${now}`,
                        status: 'shipped',
                        description,
                        event_time: now,
                    },
                    ...(current[selectedOrder.id] || []),
                ],
            }));
            setSelectedOrder((current) => (
                current?.id === selectedOrder.id ? { ...current, delivery_status: 'shipped' } : current
            ));
            setShowCreateModal(false);
            setTrackingNumber('');
            setTrackingUrl('');

            await fetchOrders();
        } catch (error) {
            console.error('Error creating shipment:', error);
            alert('Failed to initialize shipment.');
        } finally {
            setCreating(false);
        }
    }

    function getDestination(order: Order) {
        const city = order.addresses?.city || partner?.city || 'Lagos';
        const country = order.addresses?.country || partner?.country || 'Nigeria';
        return `${city}, ${country}`;
    }

    function getAddressLines(order: Order) {
        const address = order.addresses;
        if (!address) {
            return ['221B Baker Street', `${partner?.city || 'Lagos'}, ${partner?.country || 'Nigeria'}`, '101233, NG'];
        }

        return [
            address.line1 || 'Shipping address pending',
            [address.line2, address.city, address.state].filter(Boolean).join(', '),
            [address.postal_code, address.country].filter(Boolean).join(', '),
        ].filter(Boolean);
    }

    function getStatusBadge(status?: string | null) {
        const normalized = normalizeStatus(status);
        switch (normalized) {
            case 'processing':
                return <span className="status-badge status-processing">PROCESSING</span>;
            case 'in transit':
            case 'shipped':
                return <span className="status-badge status-in-transit">IN TRANSIT</span>;
            case 'ready for pickup':
                return <span className="status-badge status-pickup">READY FOR PICKUP</span>;
            case 'out for delivery':
                return <span className="status-badge status-out">OUT FOR DELIVERY</span>;
            case 'delivered':
                return <span className="status-badge status-delivered">DELIVERED</span>;
            case 'pending':
            default:
                return <span className="status-badge status-pending">{toDisplayStatus(status)}</span>;
        }
    }

    function buildTimelineEvents(order: Order, localEvents: LocalTimelineEvent[]): TimelineRow[] {
        const eventRows: TimelineRow[] = localEvents.map((event, index) => ({
            id: event.id,
            title: toDisplayStatus(event.status),
            timestamp: formatTimelineTimestamp(event.event_time),
            description: event.description,
            state: index === 0 ? 'active' : 'done',
        }));

        return [
            ...eventRows,
            {
                id: `${order.id}-pickup`,
                title: 'VENDOR READY FOR PICKUP',
                timestamp: formatTimelineTimestamp(new Date().toISOString()),
                description: 'Awaiting carrier assignment',
                state: eventRows.length ? 'done' : 'active',
            },
            {
                id: `${order.id}-paid`,
                title: 'ORDER PAID & VERIFIED',
                timestamp: formatTimelineTimestamp(order.placed_at),
                description: 'Transaction verified successfully',
                state: 'done',
            },
            {
                id: `${order.id}-terminal`,
                title: 'IN TRANSIT TO TERMINAL',
                timestamp: 'Scheduled',
                description: 'Next logistics handoff',
                state: 'future',
            },
        ];
    }

    const selectedStatus = normalizeStatus(selectedOrder?.delivery_status);
    const selectedTimelineEvents = selectedOrder
        ? buildTimelineEvents(selectedOrder, timelineEventsByOrderId[selectedOrder.id] || [])
        : [];

    return (
        <div className="delivery-content-row">
            <section className="delivery-panel-left p-8 lg:p-12">
                <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-8">
                    <div>
                        <p className="label-caps text-zinc-500 mb-1">LIVE OPERATIONS</p>
                        <h2 className="text-[32px] font-bold text-black tracking-tight leading-none">Active Shipments</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="pulse-dot w-2 h-2 bg-[#D4AF37] rounded-full" />
                        <span className="label-caps text-black">{orders.length} ACTIVE SHIPMENTS</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 mb-8">
                    <button type="button" className="px-4 py-1 border border-black text-[12px] font-bold uppercase tracking-[0.1em] bg-white hover:bg-black hover:text-white transition-all">
                        FILTERS
                    </button>
                    <button type="button" className="px-4 py-1 border border-zinc-200 text-[12px] font-bold uppercase tracking-[0.1em] bg-white text-zinc-400 hover:text-black hover:border-black transition-all">
                        SORT BY DATE
                    </button>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="py-20 text-center border border-zinc-100">
                            <Loader2 className="animate-spin text-[#D4AF37] mx-auto mb-4" size={32} />
                            <p className="label-caps text-zinc-400">Synchronizing Manifest...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 text-center border border-zinc-100">
                            <Package className="text-zinc-100 mx-auto mb-4" size={64} />
                            <p className="label-caps text-zinc-400">No active shipments</p>
                        </div>
                    ) : (
                        orders.map((order) => {
                            const isSelected = selectedOrder?.id === order.id;

                            return (
                                <div
                                    key={order.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedOrder(order)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setSelectedOrder(order);
                                        }
                                    }}
                                    className={`delivery-card p-6 ${isSelected ? 'delivery-card-active' : ''}`}
                                >
                                    {isSelected && <div className="delivery-card-corner" />}

                                    <div className="flex justify-between items-start mb-4">
                                        <p className={`label-caps ${isSelected ? 'text-[#D4AF37]' : 'text-zinc-400'}`}>
                                            {formatOrderId(order.id)}
                                        </p>
                                        <p className="text-[20px] font-semibold text-black tracking-tight">
                                            {formatPrice(order.total_amount)}
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h3 className={`text-[20px] font-semibold tracking-tight leading-none mb-2 ${isSelected ? 'text-black' : 'text-zinc-800'}`}>
                                                {order.user_profiles?.display_name || 'Guest User'}
                                            </h3>
                                            <div className="flex items-center gap-2 text-zinc-500 text-[14px]">
                                                <MapPin size={14} />
                                                <span>{getDestination(order)}</span>
                                            </div>
                                        </div>
                                        {getStatusBadge(order.delivery_status)}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">TRACKING NUMBER</p>
                                            <p className="text-[12px] font-bold text-black font-mono">{getTrackingNumber(order)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">LAST UPDATED</p>
                                            <p className="text-[12px] font-bold text-black">{formatRelativeTime(order.placed_at)}</p>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="mt-4 flex items-center gap-3">
                                            <span className="px-3 py-2 border border-black text-[10px] font-bold uppercase tracking-[0.1em] leading-none">
                                                Ready for Pickup
                                            </span>
                                            <ArrowRight size={14} className="text-[#D4AF37]" />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <aside ref={detailsPanelRef} className="delivery-panel-right p-8 lg:p-12">
                {selectedOrder ? (
                    <div className="space-y-12">
                        <header>
                            <p className="label-caps text-[#D4AF37] mb-2">ORDER DETAILS</p>
                            <div className="flex justify-between items-start gap-6 mb-4">
                                <h2 className="text-[48px] font-bold text-black tracking-tighter leading-none">
                                    {formatOrderId(selectedOrder.id)}
                                </h2>
                                <div className="text-right shrink-0">
                                    <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold uppercase tracking-[0.15em]">PAYMENT PAID</span>
                                    <p className="text-[12px] text-zinc-400 uppercase font-bold mt-2">VIA PAYSTACK</p>
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div className="bg-white border border-zinc-200 p-6">
                                <p className="label-caps text-zinc-400 mb-4">RECIPIENT</p>
                                <h3 className="text-[20px] font-semibold text-black mb-2">{selectedOrder.user_profiles?.display_name || 'Guest User'}</h3>
                                <p className="text-[14px] text-zinc-600 mb-1">+234 800 000 0000</p>
                                <p className="text-[14px] text-zinc-600 truncate">{selectedOrder.user_profiles?.email || 'delivery@mysuperstore.com'}</p>
                            </div>
                            <div className="bg-white border border-zinc-200 p-6">
                                <p className="label-caps text-zinc-400 mb-4">SHIPPING ADDRESS</p>
                                {getAddressLines(selectedOrder).map((line, index) => (
                                    <p
                                        key={line}
                                        className={`text-[14px] ${index === 0 ? 'font-bold text-zinc-800' : 'text-zinc-600'} mb-1`}
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div className="border border-black bg-white overflow-hidden">
                            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-100">
                                <p className="label-caps text-black">CONSIGNMENT LIST</p>
                            </div>
                            <div className="divide-y divide-zinc-100">
                                {selectedOrder.order_items?.length ? selectedOrder.order_items.map((item, index) => (
                                    <div key={item.id} className="p-6 flex gap-4">
                                        <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                            {index === 0 ? (
                                                <Headphones size={20} className="text-zinc-400" />
                                            ) : (
                                                <Plug size={20} className="text-zinc-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start gap-4 mb-1">
                                                <p className="text-[14px] font-bold text-black">{item.products?.name || 'Manifest Item'}</p>
                                                <p className="text-[14px] font-bold text-black shrink-0">{formatPrice(item.unit_price)}</p>
                                            </div>
                                            <div className="flex justify-between items-center text-[12px] text-zinc-500">
                                                <p className="font-mono">SKU: {item.product_id.slice(0, 8).toUpperCase()}</p>
                                                <p>QTY: {item.quantity}</p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 text-center">
                                        <p className="label-caps text-zinc-400">Consignment items unavailable</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-white border-t border-black flex justify-between items-center">
                                <p className="text-[16px] font-bold text-black">TOTAL VALUE</p>
                                <p className="text-[20px] font-bold text-[#D4AF37]">{formatPrice(selectedOrder.total_amount)}</p>
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-200 p-8">
                            <p className="label-caps text-zinc-400 mb-8 tracking-[0.2em]">TRACKING HISTORY</p>
                            <div className="delivery-timeline space-y-12">
                                {selectedTimelineEvents.map((event) => (
                                    <div key={event.id} className={`relative flex gap-6 items-start ${event.state === 'future' ? 'opacity-40' : ''}`}>
                                        <div className={`delivery-timeline-dot ${
                                            event.state === 'active'
                                                ? 'delivery-timeline-dot-active'
                                                : event.state === 'future'
                                                    ? 'delivery-timeline-dot-future'
                                                    : 'delivery-timeline-dot-done'
                                        }`} />
                                        <div>
                                            <p className={`text-[14px] font-bold uppercase mb-1 ${event.state === 'future' ? 'text-zinc-800' : 'text-black'}`}>
                                                {event.title}
                                            </p>
                                            <p className="text-[12px] text-zinc-400">{event.timestamp}</p>
                                            <p className="text-[12px] text-zinc-500 mt-1">{event.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(selectedOrder.id, 'processing')}
                                disabled={updatingStatus || selectedStatus === 'processing'}
                                className="prestige-btn-gold py-4"
                            >
                                ACCEPT ORDER
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(selectedOrder.id, 'ready for pickup')}
                                disabled={updatingStatus || selectedStatus === 'ready for pickup'}
                                className="prestige-btn-secondary py-4 border-black"
                            >
                                MARK PICKED UP
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="prestige-btn-primary py-4"
                            >
                                CREATE SHIPMENT
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(selectedOrder.id, 'in transit')}
                                disabled={updatingStatus || selectedStatus === 'in transit' || selectedStatus === 'shipped'}
                                className="prestige-btn-primary py-4"
                            >
                                MARK IN TRANSIT
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(selectedOrder.id, 'out for delivery')}
                                disabled={updatingStatus || selectedStatus === 'out for delivery'}
                                className="prestige-btn-secondary py-4"
                            >
                                OUT FOR DELIVERY
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(selectedOrder.id, 'delivered')}
                                disabled={updatingStatus || selectedStatus === 'delivered'}
                                className="prestige-btn-gold py-4 metallic-shadow"
                            >
                                MARK DELIVERED
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate(`/delivery/orders/${selectedOrder.id}`)}
                            className="w-full prestige-btn-primary flex items-center justify-center gap-3"
                        >
                            FULL LOGISTICS PROFILE
                            <ArrowRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <AlertCircle size={64} className="mb-4 text-zinc-400" />
                        <p className="label-caps text-zinc-500">SELECT A SHIPMENT TO VIEW OPERATIONAL INSIGHTS</p>
                    </div>
                )}
            </aside>

            <button type="button" className="delivery-fab" aria-label="Open delivery map">
                <MapIcon size={30} />
            </button>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg border-2 border-[#D4AF37] ring-2 ring-black p-8 relative">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-6 right-6 text-zinc-400 hover:text-black transition-colors"
                            aria-label="Close create shipment modal"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-8">
                            <p className="label-caps text-zinc-400 mb-1">NEW LOGISTICS ENTRY</p>
                            <h2 className="text-[24px] font-bold text-black uppercase">CREATE SHIPMENT</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[14px] font-semibold text-black mb-2 uppercase">CARRIER NAME</label>
                                <select
                                    value={carrierName}
                                    onChange={(event) => setCarrierName(event.target.value)}
                                    className="w-full p-4 bg-white border border-zinc-200 outline-none focus:border-black text-sm uppercase font-bold tracking-wider"
                                >
                                    <option>DHL EXPRESS</option>
                                    <option>FEDEX PRIORITY</option>
                                    <option>UPS WORLDWIDE</option>
                                    <option>GIG LOGISTICS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[14px] font-semibold text-black mb-2 uppercase">TRACKING NUMBER</label>
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(event) => setTrackingNumber(event.target.value)}
                                    className="w-full p-4 bg-white border border-zinc-200 outline-none focus:border-black text-sm uppercase font-bold tracking-wider font-mono"
                                    placeholder="ENTER ALPHANUMERIC CODE"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[14px] font-semibold text-black uppercase">TRACKING URL</label>
                                    <span className="label-caps text-zinc-400">OPTIONAL</span>
                                </div>
                                <div className="relative">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <input
                                        type="text"
                                        value={trackingUrl}
                                        onChange={(event) => setTrackingUrl(event.target.value)}
                                        className="w-full p-4 pl-12 bg-white border border-zinc-200 outline-none focus:border-black text-sm placeholder:text-zinc-300"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 p-4 bg-zinc-50 border border-zinc-200">
                                <AlertCircle className="text-[#D4AF37] shrink-0" size={20} />
                                <p className="text-[13px] text-zinc-600 leading-relaxed">
                                    Providing a tracking URL allows the client to access a real-time white-labeled tracking dashboard immediately upon confirmation.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-4 border border-black font-bold uppercase tracking-widest text-[14px] hover:bg-zinc-50 transition-all"
                                    disabled={creating}
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateShipment}
                                    className="flex-1 py-4 gold-gradient border border-black font-bold uppercase tracking-widest text-[14px] hover:brightness-105 transition-all flex items-center justify-center gap-2"
                                    disabled={creating}
                                >
                                    {creating ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRM SHIPMENT'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
