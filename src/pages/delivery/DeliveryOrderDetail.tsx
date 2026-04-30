import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    ExternalLink,
    Link as LinkIcon,
    Loader2,
    MapPin,
    Package,
    Route,
    Truck,
    X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../context/CurrencyContext';
import { useDeliveryPartner } from '../../hooks/useDeliveryPartner';

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
    | 'pending'
    | 'not_started';

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

function normalizeStatus(status?: string | null) {
    return (status || 'pending').replace(/\s+/g, '_').toLowerCase();
}

function getFulfillment(order: ShipmentOrder | null) {
    return order?.order_fulfillments?.[0] || null;
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

function stageLabel(stage: Stage) {
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
            return 'Vendor is preparing the items. Logistics should wait for pickup confirmation.';
        case 'packed':
            return 'Items have been packed and are ready for pickup.';
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
            return 'Waiting for the next logistics action.';
    }
}

function shortOrderId(id: string) {
    return `#${id.slice(0, 8).toUpperCase()}`;
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
            console.warn('Delivery detail could not hydrate customer profile:', error);
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
            console.warn('Delivery detail could not hydrate shipping address:', error);
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

export function DeliveryOrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { partner } = useDeliveryPartner();
    const [order, setOrder] = useState<ShipmentOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStage, setUpdatingStage] = useState<Stage | null>(null);
    const [showShipmentModal, setShowShipmentModal] = useState(false);
    const [carrierName, setCarrierName] = useState('DHL EXPRESS');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [statusError, setStatusError] = useState<string | null>(null);

    useEffect(() => {
        if (id) void fetchOrder();
    }, [id]);

    async function fetchOrder() {
        try {
            setLoading(true);
            setStatusError(null);

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
                .eq('id', id)
                .single();

            if (error) throw error;
            const [nextOrder] = await hydrateShipmentOrders([data as ShipmentOrder]);
            setOrder(nextOrder);
            const fulfillment = getFulfillment(nextOrder);
            setCarrierName(fulfillment?.carrier_name || 'DHL EXPRESS');
            setTrackingNumber(fulfillment?.tracking_number || '');
            setTrackingUrl(fulfillment?.tracking_url || '');
        } catch (error) {
            console.error('Error fetching delivery order:', error);
            setStatusError('Unable to load this fulfillment. Check delivery partner RLS access to this order.');
        } finally {
            setLoading(false);
        }
    }

    const stage = order ? getStage(order) : null;
    const fulfillment = getFulfillment(order);
    const events = useMemo(() => {
        if (!order) return [];

        const visibleEvents = [...(order.order_tracking_events || [])].sort((a, b) => (
            new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
        ));

        if (visibleEvents.length) return visibleEvents;

        return [{
            id: `${order.id}-fallback`,
            status: order.fulfillment_status || 'pending',
            location: order.addresses?.city || 'Fulfillment queue',
            description: stageDescription(getStage(order)),
            event_time: order.placed_at,
        }];
    }, [order]);

    function destination(orderValue: ShipmentOrder) {
        const address = orderValue.addresses;
        return [
            address?.line1,
            address?.line2,
            [address?.city, address?.state].filter(Boolean).join(', '),
            [address?.postal_code, address?.country].filter(Boolean).join(', '),
        ].filter(Boolean);
    }

    async function ensureFulfillment(status: Stage, details: Partial<Fulfillment> = {}) {
        if (!order || !partner) return fulfillment?.id;

        const now = new Date().toISOString();
        const timestampFields = {
            ...(status === 'processing' && !fulfillment?.assigned_at ? { assigned_at: now } : {}),
            ...(status === 'packed' ? { packed_at: now } : {}),
            ...(status === 'shipped' ? { shipped_at: now } : {}),
            ...(status === 'delivered' ? { delivered_at: now } : {}),
        };
        const payload = {
            status,
            delivery_partner_id: partner.id,
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
            console.warn('Fulfillment write failed; continuing with order/tracking update if allowed.', error);
            return fulfillment?.id;
        }
    }

    async function updateStatus(action: 'accept' | 'pickup' | 'transit' | 'out_for_delivery' | 'deliver' | 'shipped', details: Partial<Fulfillment> = {}) {
        if (!order || !partner) {
            setStatusError('Partner profile or order data missing.');
            return;
        }

        try {
            setUpdatingStage(action as Stage);
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
                    newFulfillmentStatus = 'packed';
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
                    description = `Shipped via ${details.carrier_name || carrierName} — Tracking #${details.tracking_number || trackingNumber}`;
                    location = 'sorting center';
                    break;
                default:
                    newFulfillmentStatus = action;
            }

            const fulfillmentId = await ensureFulfillment(newFulfillmentStatus as Stage, details);

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
            const { error: eventError } = await supabase.from('order_tracking_events').insert({
                order_id: order.id,
                fulfillment_id: fulfillmentId,
                status: newFulfillmentStatus,
                location: location,
                description: statusNote.trim() || description,
                event_time: now,
            });

            if (eventError) throw eventError;

            // Insert Status History
            await supabase.from('order_status_history').insert({
                order_id: order.id,
                status_type: 'fulfillment',
                old_value: oldStage,
                new_value: newFulfillmentStatus,
                note: statusNote.trim() || note || description,
                changed_by: partner.user_id,
                created_at: now
            });

            setOrder((current) => current ? {
                ...current,
                fulfillment_status: orderFulfillmentStatus,
                delivery_status: orderDeliveryStatus,
                updated_at: now,
                order_fulfillments: [
                    {
                        ...(getFulfillment(current) || { id: fulfillmentId || `${current.id}-local`, status: newFulfillmentStatus }),
                        ...details,
                        status: newFulfillmentStatus,
                    } as Fulfillment,
                ],
                order_tracking_events: [
                    {
                        id: `${current.id}-${newFulfillmentStatus}-${now}`,
                        status: newFulfillmentStatus,
                        location: location,
                        description: statusNote.trim() || description,
                        event_time: now,
                    },
                    ...(current.order_tracking_events || []),
                ],
            } : current);
            setStatusNote('');
        } catch (error) {
            console.error('Delivery status update failed:', error);
            setStatusError('Status update failed. If the UI is correct but writes fail, the delivery partner needs update access on orders/fulfillments for this shipment.');
        } finally {
            setUpdatingStage(null);
        }
    }

    async function confirmShipment() {
        if (!carrierName.trim() || !trackingNumber.trim()) {
            setStatusError('Carrier name and tracking number are required before confirming shipment.');
            return;
        }

        await updateStatus('shipped', {
            carrier_name: carrierName.trim(),
            tracking_number: trackingNumber.trim(),
            tracking_url: trackingUrl.trim() || null,
        });
        setShowShipmentModal(false);
    }

    if (loading) {
        return (
            <div className="delivery-detail-shell flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-[#9f7418] mb-4" size={44} />
                <p className="label-caps text-zinc-500">Loading fulfillment profile</p>
            </div>
        );
    }

    if (!order || !stage) {
        return (
            <div className="delivery-detail-shell flex flex-col items-center justify-center text-center">
                <AlertCircle className="text-zinc-400 mb-5" size={60} />
                <h1 className="text-2xl font-black text-black">Fulfillment unavailable</h1>
                <p className="text-sm text-zinc-500 mt-3 max-w-md">{statusError || 'This delivery order could not be loaded.'}</p>
                <button type="button" onClick={() => navigate('/delivery/dashboard')} className="prestige-btn-primary mt-8">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const lockedByVendor = stage === 'vendor_packing';

    return (
        <div className="delivery-detail-shell">
            <div className="flex items-center justify-between gap-4 mb-6">
                <button
                    type="button"
                    onClick={() => navigate('/delivery/dashboard')}
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500 hover:text-black"
                >
                    <ArrowLeft size={17} />
                    Back to Operations
                </button>
                <button type="button" onClick={() => void fetchOrder()} className="delivery-metal-gold px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em]">
                    Refresh
                </button>
            </div>

            {statusError && (
                <div className="mb-6 bg-white border border-[#9f7418] p-4 flex gap-3 text-sm text-zinc-700">
                    <AlertCircle className="text-[#9f7418] shrink-0" size={18} />
                    <p>{statusError}</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
                <section className="space-y-6">
                    <div className="delivery-metal-panel p-8">
                        <p className="label-caps text-[#d7b65d] mb-3">Fulfillment Management</p>
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <h1 className="text-5xl font-black tracking-[-0.05em] leading-none">{shortOrderId(order.id)}</h1>
                                <p className="text-zinc-300 text-sm mt-4 max-w-xl">{stageDescription(stage)}</p>
                            </div>
                            <span className={`status-badge ${stageClass(stage)}`}>{stageLabel(stage)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-black/10 p-5">
                            <p className="label-caps text-zinc-400 mb-3">Customer</p>
                            <p className="text-xl font-black text-black">{order.user_profiles?.display_name || 'Customer'}</p>
                            <p className="text-sm text-zinc-500 mt-1">{order.user_profiles?.email || 'No email'}</p>
                        </div>
                        <div className="bg-white border border-black/10 p-5">
                            <p className="label-caps text-zinc-400 mb-3">Value</p>
                            <p className="text-2xl font-black text-black">{formatPrice(order.total_amount)}</p>
                            <p className="text-sm text-zinc-500 mt-1">{order.order_items?.length || 0} item rows</p>
                        </div>
                        <div className="bg-white border border-black/10 p-5">
                            <p className="label-caps text-zinc-400 mb-3">Carrier</p>
                            <p className="text-lg font-black text-black">{fulfillment?.carrier_name || 'Not assigned'}</p>
                            <p className="text-sm text-zinc-500 mt-1">{fulfillment?.tracking_number || 'Tracking pending'}</p>
                        </div>
                    </div>

                    <div className="bg-white border border-black p-6">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
                            <p className="label-caps text-black">Destination</p>
                            <MapPin className="text-[#9f7418]" size={18} />
                        </div>
                        <div className="space-y-1">
                            {destination(order).map((line) => (
                                <p key={line} className="text-[15px] text-zinc-700 font-semibold">{line}</p>
                            ))}
                            {!destination(order).length && <p className="text-sm text-zinc-500">Address not visible</p>}
                        </div>
                    </div>

                    <div className="bg-white border border-black">
                        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex justify-between">
                            <p className="label-caps text-black">Consignment</p>
                            <p className="label-caps text-zinc-400">{order.order_items?.length || 0} items</p>
                        </div>
                        <div className="divide-y divide-zinc-100">
                            {(order.order_items || []).map((item) => (
                                <div key={item.id} className="p-6 flex gap-5">
                                    <div className="w-16 h-16 bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                        <Package className="text-zinc-400" size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between gap-5">
                                            <h3 className="text-base font-black text-black truncate">{item.products?.name || 'Product'}</h3>
                                            <p className="text-base font-black text-black">{formatPrice(item.unit_price)}</p>
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-2">SKU: {item.products?.sku || item.product_id.slice(0, 8).toUpperCase()} - Qty {item.quantity}</p>
                                    </div>
                                </div>
                            ))}
                            {!order.order_items?.length && (
                                <div className="p-10 text-center">
                                    <p className="label-caps text-zinc-400">No consignment rows visible</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="space-y-6">
                    <div className="delivery-insight-card p-6">
                        <p className="label-caps text-zinc-400 mb-6">Status Actions</p>
                        {lockedByVendor && (
                            <div className="mb-5 bg-zinc-50 border border-zinc-200 p-4 text-sm text-zinc-600">
                                This order is still waiting for vendor pickup readiness. Delivery actions unlock once the vendor marks it packed.
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => void updateStatus('processing')}
                                disabled={lockedByVendor || stage === 'processing'}
                                className="prestige-btn-secondary border-black"
                            >
                                Processing
                            </button>
                            <button
                                type="button"
                                onClick={() => void updateStatus('pickup')}
                                disabled={lockedByVendor || stage !== 'processing'}
                                className="prestige-btn-secondary border-black"
                            >
                                Mark Picked Up
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowShipmentModal(true)}
                                disabled={lockedByVendor || !!updatingStage}
                                className="prestige-btn-primary"
                            >
                                Confirm Shipment
                            </button>
                            <button
                                type="button"
                                onClick={() => void updateStatus('in_transit')}
                                disabled={lockedByVendor || updatingStage === 'in_transit'}
                                className="prestige-btn-primary"
                            >
                                In Transit
                            </button>
                            <button
                                type="button"
                                onClick={() => void updateStatus('out_for_delivery')}
                                disabled={lockedByVendor || updatingStage === 'out_for_delivery'}
                                className="prestige-btn-secondary border-black"
                            >
                                Out For Delivery
                            </button>
                            <button
                                type="button"
                                onClick={() => void updateStatus('delivered')}
                                disabled={lockedByVendor || updatingStage === 'delivered'}
                                className="delivery-metal-gold col-span-2 py-4 text-[12px] font-black uppercase tracking-[0.12em]"
                            >
                                {updatingStage === 'delivered' ? 'Updating...' : 'Mark as Delivered'}
                            </button>
                        </div>
                        <label className="block mt-5">
                            <span className="label-caps text-zinc-400">Optional status note</span>
                            <textarea
                                value={statusNote}
                                onChange={(event) => setStatusNote(event.target.value)}
                                className="delivery-soft-input w-full mt-2 p-4 min-h-[96px] text-sm"
                                placeholder="Add hub, driver, or delivery note..."
                            />
                        </label>
                    </div>

                    <div className="delivery-insight-card p-6">
                        <p className="label-caps text-zinc-400 mb-7">Customer Timeline Preview</p>
                        <div className="delivery-timeline space-y-8">
                            {events.map((event, index) => (
                                <div key={event.id} className="relative flex gap-5">
                                    <div className={`delivery-timeline-dot ${index === 0 ? 'delivery-timeline-dot-active' : 'delivery-timeline-dot-done'}`} />
                                    <div>
                                        <p className="text-sm font-black uppercase text-black">{stageLabel(normalizeStatus(event.status) as Stage)}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{event.description || stageDescription(normalizeStatus(event.status) as Stage)}</p>
                                        <p className="label-caps text-zinc-400 mt-2">{new Date(event.event_time).toLocaleString()}</p>
                                        {event.location && <p className="text-xs text-[#80601a] font-bold mt-1">{event.location}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="delivery-metal-panel p-6">
                        <p className="label-caps text-[#d7b65d] mb-5">Lifecycle Contract</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex gap-3">
                                <Clock3 className="text-[#d7b65d] shrink-0" size={18} />
                                <span>Vendor marks packed</span>
                            </div>
                            <div className="flex gap-3">
                                <Truck className="text-[#d7b65d] shrink-0" size={18} />
                                <span>Partner confirms carrier</span>
                            </div>
                            <div className="flex gap-3">
                                <Route className="text-[#d7b65d] shrink-0" size={18} />
                                <span>Timeline updates live</span>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle2 className="text-[#d7b65d] shrink-0" size={18} />
                                <span>Customer receives proof</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {showShipmentModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#9f7418] ring-2 ring-black max-w-lg w-full p-8 relative">
                        <button
                            type="button"
                            onClick={() => setShowShipmentModal(false)}
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
                        {trackingUrl && (
                            <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#80601a]">
                                Preview Tracking URL
                                <ExternalLink size={13} />
                            </a>
                        )}
                        <div className="flex gap-3 mt-8">
                            <button type="button" onClick={() => setShowShipmentModal(false)} className="prestige-btn-secondary flex-1 border-black">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmShipment()}
                                disabled={updatingStage === 'shipped'}
                                className="delivery-metal-gold flex-1 text-[12px] font-black uppercase tracking-[0.1em] disabled:opacity-50"
                            >
                                {updatingStage === 'shipped' ? 'Confirming...' : 'Confirm Shipment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
