import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    ArrowRight,
    Boxes,
    Headphones,
    Link as LinkIcon,
    Loader2,
    MapPin,
    Plug,
    Search,
    ShieldCheck,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../context/CurrencyContext';
import { useDeliveryPartner } from '../../hooks/useDeliveryPartner';

interface Address {
    id?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
}

interface UserProfileSummary {
    user_id?: string | null;
    display_name?: string | null;
    email?: string | null;
}

interface ProductSummary {
    name?: string | null;
    sku?: string | null;
    product_images?: { url: string; position?: number | null }[];
}

interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    products?: ProductSummary | null;
}

interface Fulfillment {
    id: string;
    status: string;
    carrier_name?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    assigned_at?: string | null;
    packed_at?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    estimated_delivery_at?: string | null;
    last_status_note?: string | null;
}

interface TrackingEvent {
    id: string;
    status: string;
    location?: string | null;
    description?: string | null;
    event_time: string;
}

interface ShipmentOrder {
    id: string;
    user_id?: string | null;
    status: string;
    total_amount: number;
    currency?: string | null;
    shipping_address_id?: string | null;
    placed_at: string;
    updated_at?: string | null;
    fulfillment_status?: string | null;
    delivery_status?: string | null;
    user_profiles?: UserProfileSummary | null;
    addresses?: Address | null;
    order_items?: OrderItem[];
    order_fulfillments?: Fulfillment[];
    order_tracking_events?: TrackingEvent[];
}

type Stage =
    | 'vendor_packing'
    | 'packed'
    | 'assigned'
    | 'processing'
    | 'picked_up'
    | 'shipped'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'not_started'
    | 'pending';

const activeStages = new Set<Stage>(['vendor_packing', 'packed', 'assigned', 'processing', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery', 'not_started', 'pending']);

function normalizeStatus(status?: string | null) {
    return (status || 'pending').replace(/\s+/g, '_').toLowerCase();
}

function getFulfillment(order: ShipmentOrder) {
    return order.order_fulfillments?.[0] || null;
}

function getStage(order: ShipmentOrder): Stage {
    const deliveryStatus = normalizeStatus(order.delivery_status);
    const fulfillmentStatus = normalizeStatus(order.fulfillment_status);
    const fulfillment = getFulfillment(order);
    const fulfillmentInternalStatus = normalizeStatus(fulfillment?.status);

    // Primary driver: delivery_status from orders table (updated by partner)
    if (deliveryStatus === 'assigned') return 'processing';
    if (deliveryStatus === 'picked_up') return 'picked_up';
    if (deliveryStatus === 'shipped') return 'shipped';
    if (deliveryStatus === 'in_transit') return 'in_transit';
    if (deliveryStatus === 'out_for_delivery') return 'out_for_delivery';
    if (deliveryStatus === 'completed') return 'delivered';

    // Secondary driver: fulfillment_status from orders table (updated by vendor)
    if (fulfillmentStatus === 'packed' || fulfillmentStatus === 'ready_for_pickup') return 'packed';
    
    // Fallback to internal fulfillment status if available
    if (fulfillmentInternalStatus === 'processing') return 'processing';
    if (fulfillmentInternalStatus === 'packed' && deliveryStatus === 'picked_up') return 'picked_up';
    if (fulfillmentInternalStatus === 'shipped') return 'shipped';
    
    if (fulfillmentStatus === 'pending') return 'vendor_packing';

    return (deliveryStatus || fulfillmentStatus || 'pending') as Stage;
}

function displayStage(stage: Stage) {
    switch (stage) {
        case 'vendor_packing':
            return 'Vendor Packing';
        case 'packed':
            return 'Ready for Pickup';
        case 'picked_up':
            return 'Picked Up';
        case 'in_transit':
            return 'In Transit';
        case 'out_for_delivery':
            return 'Out for Delivery';
        case 'not_started':
            return 'Not Started';
        case 'assigned':
        case 'processing':
            return 'Accepted';
        default:
            return stage.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
}

function stageClass(stage: Stage) {
    switch (stage) {
        case 'packed':
            return 'status-pickup';
        case 'processing':
        case 'assigned':
            return 'status-processing';
        case 'picked_up':
            return 'status-processing';
        case 'shipped':
        case 'in_transit':
            return 'status-in-transit';
        case 'out_for_delivery':
            return 'status-out';
        case 'delivered':
            return 'status-delivered';
        default:
            return 'status-pending';
    }
}

function stageDescription(stage: Stage) {
    switch (stage) {
        case 'vendor_packing':
            return 'Vendor is preparing the package. Delivery can monitor but not collect yet.';
        case 'packed':
            return 'Packed by vendor and ready for delivery partner pickup.';
        case 'processing':
        case 'assigned':
            return 'Accepted by logistics. Partner is moving to collect the package.';
        case 'picked_up':
            return 'Package collected from vendor and is being processed for shipment.';
        case 'shipped':
            return 'Package collected and shipping details confirmed.';
        case 'in_transit':
            return 'Shipment is moving through the logistics network.';
        case 'out_for_delivery':
            return 'Courier is on the final delivery run.';
        case 'delivered':
            return 'Customer handoff completed.';
        default:
            return 'Waiting for logistics handoff.';
    }
}

function shortOrderId(id: string) {
    return `#${id.slice(0, 8).toUpperCase()}`;
}

function timeAgo(dateString?: string | null) {
    if (!dateString) return 'just now';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

function eventLabel(status: string) {
    return displayStage(normalizeStatus(status) as Stage);
}

async function hydrateShipmentOrders(orders: ShipmentOrder[]) {
    const userIds = Array.from(new Set(orders.map((order) => order.user_id).filter(Boolean))) as string[];
    const addressIds = Array.from(new Set(orders.map((order) => order.shipping_address_id).filter(Boolean))) as string[];
    const profilesByUserId = new Map<string, UserProfileSummary>();
    const addressesById = new Map<string, Address>();

    if (userIds.length) {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id, display_name, email')
            .in('user_id', userIds);

        if (error) {
            console.warn('Delivery dashboard could not hydrate customer profiles:', error);
        } else {
            (data || []).forEach((profile) => {
                if (profile.user_id) profilesByUserId.set(profile.user_id, profile);
            });
        }
    }

    if (addressIds.length) {
        const { data, error } = await supabase
            .from('addresses')
            .select('id, line1, line2, city, state, country, postal_code')
            .in('id', addressIds);

        if (error) {
            console.warn('Delivery dashboard could not hydrate shipping addresses:', error);
        } else {
            (data || []).forEach((address) => {
                if (address.id) addressesById.set(address.id, address);
            });
        }
    }

    return orders.map((order) => ({
        ...order,
        user_profiles: order.user_profiles || profilesByUserId.get(order.user_id || '') || null,
        addresses: order.addresses || addressesById.get(order.shipping_address_id || '') || null,
    }));
}

export function DeliveryDashboard() {
    const navigate = useNavigate();
    const { partner, loading: partnerLoading } = useDeliveryPartner();
    const { formatPrice } = useCurrency();
    const [shipments, setShipments] = useState<ShipmentOrder[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [stageFilter, setStageFilter] = useState<'all' | Stage>('all');
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [shipmentModalOrder, setShipmentModalOrder] = useState<ShipmentOrder | null>(null);
    const [carrierName, setCarrierName] = useState('DHL EXPRESS');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [statusError, setStatusError] = useState<string | null>(null);

    useEffect(() => {
        if (partnerLoading) return;
        void fetchShipments();
    }, [partnerLoading, partner?.id]);

    async function fetchShipments() {
        if (!partner && !partnerLoading) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setStatusError(null);

            // Fetch all paid orders that are not completed.
            // We'll filter for assignment in memory or via a more complex query.
            // For now, let's get orders that either have NO fulfillment OR are assigned to this partner.
            const { data, error } = await supabase
                .from('orders')
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
                    delivery_status,
                    order_items (
                        id,
                        product_id,
                        quantity,
                        unit_price,
                        products (name, sku, product_images(url, position))
                    ),
                    order_fulfillments (
                        id,
                        status,
                        delivery_partner_id,
                        carrier_name,
                        tracking_number,
                        tracking_url,
                        assigned_at,
                        packed_at,
                        shipped_at,
                        delivered_at,
                        estimated_delivery_at,
                        last_status_note
                    ),
                    order_tracking_events (
                        id,
                        status,
                        location,
                        description,
                        event_time
                    )
                `)
                .eq('status', 'paid')
                .or('delivery_status.is.null,delivery_status.neq.completed')
                .order('placed_at', { ascending: false });

            if (error) throw error;

            const hydratedOrders = await hydrateShipmentOrders((data || []) as ShipmentOrder[]);
            
            // Filter: 
            // 1. Unassigned orders (delivery_partner_id is null in fulfillment)
            // 2. Orders assigned to THIS partner
            const filteredByPartner = hydratedOrders.filter(order => {
                const fulfillment = getFulfillment(order);
                return !fulfillment || !fulfillment.delivery_partner_id || fulfillment.delivery_partner_id === partner?.id;
            });

            const nextShipments = filteredByPartner
                .filter((order) => activeStages.has(getStage(order)))
                .sort((a, b) => {
                    const aStagePrio = bStagePriority(getStage(a));
                    const bStagePrio = bStagePriority(getStage(b));
                    return aStagePrio - bStagePrio || new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime();
                });

            setShipments(nextShipments);
            setSelectedId((current) => current && nextShipments.some((order) => order.id === current)
                ? current
                : nextShipments[0]?.id || null);
        } catch (error) {
            console.error('Error fetching delivery shipments:', error);
            setStatusError('Delivery data could not be loaded. If rows exist, check the orders/fulfillment RLS policies for delivery partners.');
        } finally {
            setLoading(false);
        }
    }

    function bStagePriority(stage: Stage): number {
    switch (stage) {
        case 'packed': return 0; // Highest priority (Ready for Pickup)
        case 'processing': return 1;
        case 'assigned': return 1;
        case 'picked_up': return 2;
        case 'shipped': return 3;
        case 'in_transit': return 4;
        case 'out_for_delivery': return 5;
        case 'vendor_packing': return 6;
        case 'delivered': return 7;
        case 'not_started': return 8;
        default: return 9;
    }
}

    const filteredShipments = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return shipments.filter((order) => {
            const stage = getStage(order);
            const matchesStage = stageFilter === 'all' || stage === stageFilter;
            const matchesQuery = !needle ||
                order.id.toLowerCase().includes(needle) ||
                order.user_profiles?.display_name?.toLowerCase().includes(needle) ||
                order.addresses?.city?.toLowerCase().includes(needle);
            return matchesStage && matchesQuery;
        });
    }, [query, shipments, stageFilter]);

    const selectedOrder = shipments.find((order) => order.id === selectedId) || filteredShipments[0] || null;
    const selectedStage = selectedOrder ? getStage(selectedOrder) : null;
    const activeCount = shipments.filter((order) => getStage(order) !== 'vendor_packing').length;
    const pickupCount = shipments.filter((order) => getStage(order) === 'packed').length;
    const motionCount = shipments.filter((order) => ['processing', 'shipped', 'in_transit', 'out_for_delivery'].includes(getStage(order))).length;

    function destination(order: ShipmentOrder) {
        const city = order.addresses?.city || partner?.city || 'Unknown city';
        const country = order.addresses?.country || partner?.country || 'Unknown country';
        return `${city}, ${country}`;
    }

    function sortedEvents(order: ShipmentOrder): TrackingEvent[] {
        const events = [...(order.order_tracking_events || [])].sort((a, b) => (
            new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
        ));

        if (events.length) return events;

        return [
            {
                id: `${order.id}-synthetic-paid`,
                status: 'pending',
                description: 'Order paid successfully. Waiting for fulfillment processing.',
                location: destination(order),
                event_time: order.placed_at,
            },
        ];
    }

    async function writeTrackingEvent(order: ShipmentOrder, status: string, description: string, fulfillmentId?: string) {
        const now = new Date().toISOString();
        const { error } = await supabase.from('order_tracking_events').insert({
            order_id: order.id,
            fulfillment_id: fulfillmentId,
            status,
            location: partner?.city || 'Delivery Operations',
            description,
            event_time: now,
        });

        if (error) throw error;

        setShipments((current) => current.map((item) => item.id === order.id
            ? {
                ...item,
                order_tracking_events: [
                    {
                        id: `${order.id}-${status}-${now}`,
                        status,
                        location: partner?.city || 'Delivery Operations',
                        description,
                        event_time: now,
                    },
                    ...(item.order_tracking_events || []),
                ],
            }
            : item));
    }

    async function ensureFulfillment(order: ShipmentOrder, status: string, details: Partial<Fulfillment> = {}) {
        const fulfillment = getFulfillment(order);
        const now = new Date().toISOString();
        const timestampFields = {
            ...(status === 'processing' && !fulfillment?.assigned_at ? { assigned_at: now } : {}),
            ...(status === 'packed' ? { packed_at: now } : {}),
            ...(status === 'shipped' ? { shipped_at: now } : {}),
            ...(status === 'delivered' ? { delivered_at: now } : {}),
        };
        const payload = {
            status,
            delivery_partner_id: partner?.id,
            updated_at: now,
            ...timestampFields,
            ...details,
        };

        try {
            if (fulfillment?.id) {
                const { error } = await supabase
                    .from('order_fulfillments')
                    .update(payload)
                    .eq('id', fulfillment.id);
                if (error) throw error;
                return fulfillment.id;
            }

            const { data, error } = await supabase
                .from('order_fulfillments')
                .insert({
                    order_id: order.id,
                    ...payload,
                })
                .select('id')
                .single();

            if (error) throw error;
            return data.id as string;
        } catch (error) {
            console.warn('Fulfillment write failed; order/tracking update will continue if allowed by RLS.', error);
            return fulfillment?.id;
        }
    }

    async function updateShipmentStatus(order: ShipmentOrder, action: 'accept' | 'pickup' | 'transit' | 'out_for_delivery' | 'deliver' | 'shipped', details: Partial<Fulfillment> = {}) {
        if (!partner) {
            setStatusError('You must be logged in as a delivery partner to perform this action.');
            return;
        }

        try {
            setUpdatingOrderId(order.id);
            setStatusError(null);
            const now = new Date().toISOString();
            const oldStage = getStage(order);

            let newFulfillmentStatus: string = 'processing';
            let orderDeliveryStatus = '';
            let orderFulfillmentStatus = order.fulfillment_status;
            let note = '';
            let location = partner.city || 'OPERATIONS CENTER';
            let description = '';

            switch (action) {
                case 'accept':
                    newFulfillmentStatus = 'processing';
                    orderDeliveryStatus = 'assigned';
                    note = 'Delivery partner accepted order';
                    description = 'Delivery partner accepted the order';
                    location = 'dispatch center';
                    break;
                case 'pickup':
                    newFulfillmentStatus = 'packed'; // Match matrix Step 3: status = 'packed' in order_fulfillments
                    orderDeliveryStatus = 'picked_up';
                    note = 'Package picked up from vendor';
                    description = 'Package picked up from vendor';
                    location = 'vendor warehouse';
                    break;
                case 'transit':
                    newFulfillmentStatus = 'in_transit';
                    orderDeliveryStatus = 'in_transit';
                    note = 'Package is in transit';
                    description = 'Package is in transit';
                    break;
                case 'out_for_delivery':
                    newFulfillmentStatus = 'out_for_delivery';
                    orderDeliveryStatus = 'out_for_delivery';
                    note = 'Package is out for delivery';
                    description = 'Package is out for delivery';
                    break;
                case 'deliver':
                    newFulfillmentStatus = 'delivered';
                    orderDeliveryStatus = 'completed';
                    orderFulfillmentStatus = 'delivered';
                    note = 'Order delivered successfully';
                    description = 'Order delivered successfully';
                    location = 'customer address';
                    break;
                case 'shipped':
                    newFulfillmentStatus = 'shipped';
                    orderDeliveryStatus = 'shipped';
                    note = 'Shipment created with tracking';
                    description = `Shipped via ${details.carrier_name || 'DHL'} — Tracking #${details.tracking_number || 'XXX'}`;
                    location = 'sorting center';
                    break;
                default:
                    newFulfillmentStatus = action;
            }

            const fulfillmentId = await ensureFulfillment(order, newFulfillmentStatus, details);

            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    fulfillment_status: orderFulfillmentStatus,
                    delivery_status: orderDeliveryStatus,
                    updated_at: now,
                })
                .eq('id', order.id);

            if (orderError) throw orderError;

            // Insert Tracking Event
            await supabase.from('order_tracking_events').insert({
                order_id: order.id,
                fulfillment_id: fulfillmentId,
                status: newFulfillmentStatus,
                location: location,
                description,
                event_time: now,
            });

            // Insert Status History
            await supabase.from('order_status_history').insert({
                order_id: order.id,
                status_type: 'fulfillment',
                old_value: oldStage,
                new_value: newFulfillmentStatus,
                note: note || description,
                changed_by: partner.user_id,
                created_at: now
            });

            // Update local state
            setShipments((current) => current.map((item) => item.id === order.id
                ? {
                    ...item,
                    fulfillment_status: orderFulfillmentStatus,
                    delivery_status: orderDeliveryStatus,
                    updated_at: now,
                    order_fulfillments: [
                        {
                            ...(getFulfillment(item) || { id: fulfillmentId || `${order.id}-local`, status: newFulfillmentStatus }),
                            ...details,
                            status: newFulfillmentStatus,
                        } as Fulfillment,
                    ],
                    order_tracking_events: [
                        {
                            id: `${order.id}-${newFulfillmentStatus}-${now}`,
                            status: newFulfillmentStatus,
                            location: location,
                            description,
                            event_time: now,
                        },
                        ...(item.order_tracking_events || []),
                    ],
                }
                : item));
        } catch (error) {
            console.error('Shipment update failed:', error);
            setStatusError('Status update failed. The UI is wired correctly, but the database policy may not allow this delivery partner to update the order yet.');
        } finally {
            setUpdatingOrderId(null);
        }
    }

    async function confirmShipment() {
        if (!shipmentModalOrder || !carrierName.trim() || !trackingNumber.trim()) {
            setStatusError('Carrier name and tracking number are required to confirm shipment.');
            return;
        }

        await updateShipmentStatus(shipmentModalOrder, 'shipped', {
            carrier_name: carrierName.trim(),
            tracking_number: trackingNumber.trim(),
            tracking_url: trackingUrl.trim() || null,
        });
        setShipmentModalOrder(null);
        setTrackingNumber('');
        setTrackingUrl('');
    }

    const filterOptions: Array<{ id: 'all' | Stage; label: string }> = [
        { id: 'all', label: 'All' },
        { id: 'packed', label: 'Pickup' },
        { id: 'processing', label: 'Processing' },
        { id: 'shipped', label: 'Shipped' },
        { id: 'out_for_delivery', label: 'Final Mile' },
    ];

    return (
        <div className="delivery-page">
            <div className="delivery-dashboard-grid">
                <section className="space-y-5">
                    <div className="delivery-command-card p-6">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <p className="label-caps text-[#80601a] mb-3">Operations Command</p>
                                <h1 className="text-[34px] font-black tracking-[-0.03em] text-black leading-none">Shipment Flow</h1>
                                <p className="text-[13px] text-zinc-600 mt-3 max-w-xl">
                                    Live logistics queue from paid orders, vendor handoff, fulfillment records, and customer tracking events.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void fetchShipments()}
                                className="delivery-metal-gold px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em]"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-6">
                            <div className="delivery-metal-panel p-4">
                                <p className="label-caps text-[#d7b65d] mb-3">Active</p>
                                <p className="text-3xl font-black">{activeCount}</p>
                            </div>
                            <div className="bg-white border border-black/10 p-4">
                                <p className="label-caps text-zinc-400 mb-3">Pickup Ready</p>
                                <p className="text-3xl font-black text-black">{pickupCount}</p>
                            </div>
                            <div className="bg-white border border-black/10 p-4">
                                <p className="label-caps text-zinc-400 mb-3">In Motion</p>
                                <p className="text-3xl font-black text-black">{motionCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="delivery-command-card p-4">
                        <div className="flex flex-col xl:flex-row gap-3">
                            <label className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search order, customer, city..."
                                    className="delivery-soft-input w-full py-3 pl-11 pr-4 text-sm"
                                />
                            </label>
                            <div className="flex gap-2 overflow-x-auto">
                                {filterOptions.map((filter) => (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        onClick={() => setStageFilter(filter.id)}
                                        className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] border ${
                                            stageFilter === filter.id
                                                ? 'bg-black text-white border-black'
                                                : 'bg-white text-zinc-500 border-black/10 hover:border-black'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {statusError && (
                        <div className="bg-white border border-[#9f7418] p-4 flex gap-3 text-sm text-zinc-700">
                            <AlertCircle className="text-[#9f7418] shrink-0" size={18} />
                            <p>{statusError}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {loading ? (
                            <div className="delivery-command-card py-24 text-center">
                                <Loader2 className="animate-spin mx-auto mb-4 text-[#9f7418]" size={34} />
                                <p className="label-caps text-zinc-400">Loading logistics queue</p>
                            </div>
                        ) : filteredShipments.length === 0 ? (
                            <div className="delivery-command-card p-10 text-center">
                                <Boxes className="mx-auto mb-5 text-zinc-300" size={54} />
                                <h3 className="text-xl font-black text-black">No visible shipments yet</h3>
                                <p className="text-sm text-zinc-500 mt-3 max-w-md mx-auto">
                                    Paid orders will appear here once the database policies allow delivery partners to read them and vendors mark items packed.
                                </p>
                            </div>
                        ) : (
                            filteredShipments.map((order) => {
                                const stage = getStage(order);
                                const active = selectedOrder?.id === order.id;
                                const fulfillment = getFulfillment(order);

                                return (
                                    <article
                                        key={order.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedId(order.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setSelectedId(order.id);
                                            }
                                        }}
                                        className={`delivery-queue-card p-5 pl-7 cursor-pointer ${active ? 'delivery-queue-card-active' : ''}`}
                                    >
                                        <div className="delivery-stage-rail" />
                                        <div className="flex items-start justify-between gap-5">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <p className="font-mono text-sm font-black text-black">{shortOrderId(order.id)}</p>
                                                    <span className={`status-badge ${stageClass(stage)}`}>{displayStage(stage)}</span>
                                                </div>
                                                <h2 className="text-[21px] font-black tracking-[-0.02em] text-black">
                                                    {order.user_profiles?.display_name || 'Customer'}
                                                </h2>
                                                <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                                                    <MapPin size={14} />
                                                    {destination(order)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[22px] font-black text-black">{formatPrice(order.total_amount)}</p>
                                                <p className="label-caps text-zinc-400 mt-2">{timeAgo(order.updated_at || order.placed_at)}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-100">
                                            <div>
                                                <p className="label-caps text-zinc-400 mb-1">Items</p>
                                                <p className="text-sm font-black">{order.order_items?.length || 0}</p>
                                            </div>
                                            <div>
                                                <p className="label-caps text-zinc-400 mb-1">Carrier</p>
                                                <p className="text-sm font-black truncate">{fulfillment?.carrier_name || 'Unassigned'}</p>
                                            </div>
                                            <div>
                                                <p className="label-caps text-zinc-400 mb-1">Tracking</p>
                                                <p className="text-sm font-black truncate">{fulfillment?.tracking_number || 'Pending'}</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center mt-5">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    navigate(`/delivery/orders/${order.id}`);
                                                }}
                                                className="text-[11px] font-black uppercase tracking-[0.14em] text-black flex items-center gap-2 hover:text-[#80601a]"
                                            >
                                                Details
                                                <ArrowRight size={14} />
                                            </button>
                                            {stage === 'packed' && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void updateShipmentStatus(order, 'accept');
                                                    }}
                                                    disabled={updatingOrderId === order.id}
                                                    className="delivery-metal-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] disabled:opacity-50"
                                                >
                                                    Accept Order
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                </section>

                <aside className="delivery-insight-card p-6 self-start sticky top-[104px] max-h-[calc(100vh-128px)] overflow-y-auto">
                    {selectedOrder && selectedStage ? (
                        <div className="space-y-7">
                            <div className="delivery-metal-panel p-6">
                                <p className="label-caps text-[#d7b65d] mb-3">Fulfillment Management</p>
                                <div className="flex items-start justify-between gap-5">
                                    <div>
                                        <h2 className="text-4xl font-black tracking-[-0.04em]">{shortOrderId(selectedOrder.id)}</h2>
                                        <p className="text-sm text-zinc-300 mt-2">{stageDescription(selectedStage)}</p>
                                    </div>
                                    <span className={`status-badge ${stageClass(selectedStage)}`}>{displayStage(selectedStage)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white border border-zinc-200 p-5">
                                    <p className="label-caps text-zinc-400 mb-4">Customer</p>
                                    <h3 className="text-xl font-black text-black">{selectedOrder.user_profiles?.display_name || 'Customer'}</h3>
                                    <p className="text-sm text-zinc-500 mt-1">{selectedOrder.user_profiles?.email || 'No email available'}</p>
                                </div>
                                <div className="bg-white border border-zinc-200 p-5">
                                    <p className="label-caps text-zinc-400 mb-4">Destination</p>
                                    <h3 className="text-base font-black text-black">{selectedOrder.addresses?.line1 || 'Address pending'}</h3>
                                    <p className="text-sm text-zinc-500 mt-1">{destination(selectedOrder)}</p>
                                </div>
                            </div>

                            <div className="bg-white border border-black">
                                <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-100 flex justify-between">
                                    <p className="label-caps text-black">Consignment</p>
                                    <p className="label-caps text-zinc-400">{selectedOrder.order_items?.length || 0} items</p>
                                </div>
                                <div className="divide-y divide-zinc-100">
                                    {(selectedOrder.order_items || []).slice(0, 4).map((item, index) => (
                                        <div key={item.id} className="p-5 flex gap-4">
                                            <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                                {index % 2 === 0 ? <Headphones size={19} className="text-zinc-400" /> : <Plug size={19} className="text-zinc-400" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex justify-between gap-4">
                                                    <p className="text-sm font-black text-black truncate">{item.products?.name || 'Product'}</p>
                                                    <p className="text-sm font-black text-black">{formatPrice(item.unit_price)}</p>
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-1">SKU: {item.products?.sku || item.product_id.slice(0, 8).toUpperCase()} - Qty {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {!selectedOrder.order_items?.length && (
                                        <div className="p-8 text-center">
                                            <p className="label-caps text-zinc-400">No item rows visible</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white border border-zinc-200 p-6">
                                <p className="label-caps text-zinc-400 mb-7">Live Timeline</p>
                                <div className="delivery-timeline space-y-8">
                                    {sortedEvents(selectedOrder).slice(0, 5).map((event, index) => (
                                        <div key={event.id} className="relative flex gap-5">
                                            <div className={`delivery-timeline-dot ${index === 0 ? 'delivery-timeline-dot-active' : 'delivery-timeline-dot-done'}`} />
                                            <div>
                                                <p className="text-sm font-black uppercase text-black">{eventLabel(event.status)}</p>
                                                <p className="text-xs text-zinc-500 mt-1">{event.description || stageDescription(normalizeStatus(event.status) as Stage)}</p>
                                                <p className="label-caps text-zinc-400 mt-2">{new Date(event.event_time).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => void updateShipmentStatus(selectedOrder, 'accept')}
                                    disabled={updatingOrderId === selectedOrder.id || selectedStage === 'processing'}
                                    className="prestige-btn-secondary border-black"
                                >
                                    Accept Order
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void updateShipmentStatus(selectedOrder, 'pickup')}
                                    disabled={updatingOrderId === selectedOrder.id || selectedStage !== 'processing'}
                                    className="prestige-btn-secondary border-black"
                                >
                                    Mark Picked Up
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShipmentModalOrder(selectedOrder)}
                                    disabled={updatingOrderId === selectedOrder.id || selectedStage === 'vendor_packing' || selectedStage === 'delivered'}
                                    className="prestige-btn-primary"
                                >
                                    Confirm Shipment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void updateShipmentStatus(selectedOrder, 'transit')}
                                    disabled={updatingOrderId === selectedOrder.id || (selectedStage !== 'shipped' && selectedStage !== 'packed')}
                                    className="prestige-btn-primary"
                                >
                                    In Transit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void updateShipmentStatus(selectedOrder, 'out_for_delivery')}
                                    disabled={updatingOrderId === selectedOrder.id || selectedStage !== 'in_transit'}
                                    className="prestige-btn-secondary border-black"
                                >
                                    Out For Delivery
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void updateShipmentStatus(selectedOrder, 'deliver')}
                                    disabled={updatingOrderId === selectedOrder.id || selectedStage !== 'out_for_delivery'}
                                    className="delivery-metal-gold text-[12px] font-black uppercase tracking-[0.1em]"
                                >
                                    Mark Delivered
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/delivery/orders/${selectedOrder.id}`)}
                                    className="prestige-btn-secondary border-black col-span-2"
                                >
                                    Open Full Logistics Details
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-[520px] flex flex-col items-center justify-center text-center">
                            <ShieldCheck className="text-zinc-300 mb-5" size={58} />
                            <h2 className="text-2xl font-black text-black">No shipment selected</h2>
                            <p className="text-sm text-zinc-500 mt-3 max-w-sm">
                                Select an order from the queue to inspect customer details, consignment, timeline, and available logistics actions.
                            </p>
                        </div>
                    )}
                </aside>
            </div>

            {shipmentModalOrder && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#9f7418] ring-2 ring-black max-w-lg w-full p-8 relative">
                        <button
                            type="button"
                            onClick={() => setShipmentModalOrder(null)}
                            className="absolute top-6 right-6 text-zinc-400 hover:text-black"
                            aria-label="Close shipment confirmation"
                        >
                            <X size={22} />
                        </button>
                        <p className="label-caps text-zinc-400 mb-2">Carrier Handoff</p>
                        <h2 className="text-3xl font-black tracking-[-0.03em] text-black mb-8">Confirm Shipment</h2>

                        <div className="space-y-5">
                            <label className="block">
                                <span className="text-sm font-black uppercase tracking-[0.08em]">Carrier Name</span>
                                <input
                                    value={carrierName}
                                    onChange={(event) => setCarrierName(event.target.value)}
                                    className="delivery-soft-input w-full mt-2 p-4 text-sm font-bold uppercase"
                                    placeholder="DHL, FedEx, GIG Logistics"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-black uppercase tracking-[0.08em]">Tracking Number</span>
                                <input
                                    value={trackingNumber}
                                    onChange={(event) => setTrackingNumber(event.target.value)}
                                    className="delivery-soft-input w-full mt-2 p-4 text-sm font-mono font-bold uppercase"
                                    placeholder="Enter tracking code"
                                />
                            </label>
                            <label className="block">
                                <span className="flex justify-between text-sm font-black uppercase tracking-[0.08em]">
                                    Tracking URL
                                    <span className="label-caps text-zinc-400">Optional</span>
                                </span>
                                <span className="relative block mt-2">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
                                    <input
                                        value={trackingUrl}
                                        onChange={(event) => setTrackingUrl(event.target.value)}
                                        className="delivery-soft-input w-full p-4 pl-11 text-sm"
                                        placeholder="https://..."
                                    />
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setShipmentModalOrder(null)}
                                className="prestige-btn-secondary flex-1 border-black"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmShipment()}
                                disabled={updatingOrderId === shipmentModalOrder.id}
                                className="delivery-metal-gold flex-1 text-[12px] font-black uppercase tracking-[0.1em] disabled:opacity-50"
                            >
                                {updatingOrderId === shipmentModalOrder.id ? 'Confirming...' : 'Confirm Shipment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
