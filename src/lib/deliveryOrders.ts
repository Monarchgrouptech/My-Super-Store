import { DeliveryOrder } from '../types/delivery';
import { supabase } from './supabase';

interface DeliveryOrderRow {
    id: string;
    user_id: string | null;
    status: string;
    total_amount: number | string;
    currency: string | null;
    shipping_address_id: string | null;
    placed_at: string;
    updated_at: string | null;
    fulfillment_status: string | null;
    delivery_status: string | null;
}

interface DeliveryOrderItemRow {
    id: string;
    order_id: string;
    product_id: string;
    vendor_id: string | null;
    quantity: number | null;
    unit_price: number | string | null;
}

interface DeliveryProductRow {
    id: string;
    name: string | null;
    sku: string | null;
    product_images?: Array<{
        url: string;
        position?: number | null;
    }> | null;
}

interface DeliveryFulfillmentRow {
    id: string;
    order_id: string;
    status: string;
    carrier_name: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    assigned_at: string | null;
    packed_at: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    estimated_delivery_at: string | null;
    last_status_note: string | null;
    delivery_partner_id: string | null;
}

interface DeliveryTrackingEventRow {
    id: string;
    order_id: string;
    status: string;
    location: string | null;
    description: string | null;
    event_time: string;
}

interface DeliveryProfileRow {
    user_id: string;
    display_name: string | null;
    email: string;
}

interface DeliveryAddressRow {
    id: string;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
}

interface VendorOrderFulfillmentRow {
    id: string;
    order_id: string;
    vendor_id: string;
    status: string;
    pickup_contact_name: string | null;
    pickup_contact_phone: string | null;
    pickup_address: string | null;
    pickup_city: string | null;
    pickup_state: string | null;
    pickup_country: string | null;
    pickup_notes: string | null;
    submitted_at: string | null;
}

function matchesSearch(order: DeliveryOrder, searchQuery: string): boolean {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
        return true;
    }

    const productMatch = (order.order_items ?? []).some((item) =>
        (item.products?.name ?? '').toLowerCase().includes(needle)
    );

    const trackingMatch = (order.order_fulfillments ?? []).some((fulfillment) =>
        (fulfillment.tracking_number ?? '').toLowerCase().includes(needle)
    );

    return (
        order.id.toLowerCase().includes(needle) ||
        (order.user_profiles?.display_name ?? '').toLowerCase().includes(needle) ||
        (order.user_profiles?.email ?? '').toLowerCase().includes(needle) ||
        productMatch ||
        trackingMatch
    );
}

export async function fetchDeliveryOrders(searchQuery?: string): Promise<DeliveryOrder[]> {
    const { data: orderRows, error: ordersError } = await supabase
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
            delivery_status
        `)
        .in('delivery_status', ['ready_for_pickup', 'processing', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'])
        .order('placed_at', { ascending: false });

    if (ordersError) {
        throw ordersError;
    }

    const orders = (orderRows ?? []) as DeliveryOrderRow[];
    if (orders.length === 0) {
        return [];
    }

    const orderIds = orders.map((order) => order.id);
    const userIds = Array.from(new Set(
        orders
            .map((order) => order.user_id)
            .filter((userId): userId is string => Boolean(userId))
    ));
    const addressIds = Array.from(new Set(
        orders
            .map((order) => order.shipping_address_id)
            .filter((addressId): addressId is string => Boolean(addressId))
    ));

    const [
        { data: orderItemRows, error: orderItemsError },
        { data: fulfillmentRows, error: fulfillmentsError },
        { data: trackingEventRows, error: trackingEventsError },
        { data: vendorFulfillmentRows, error: vendorFulfillmentsError },
        profileResponse,
        addressResponse,
    ] = await Promise.all([
        supabase
            .from('order_items')
            .select('id, order_id, product_id, vendor_id, quantity, unit_price')
            .in('order_id', orderIds),
        supabase
            .from('order_fulfillments')
            .select(`
                id,
                order_id,
                status,
                carrier_name,
                tracking_number,
                tracking_url,
                assigned_at,
                packed_at,
                shipped_at,
                delivered_at,
                estimated_delivery_at,
                last_status_note,
                delivery_partner_id
            `)
            .in('order_id', orderIds),
        supabase
            .from('order_tracking_events')
            .select('id, order_id, status, location, description, event_time')
            .in('order_id', orderIds),
        supabase
            .from('vendor_order_fulfillments')
            .select('id, order_id, vendor_id, status, pickup_contact_name, pickup_contact_phone, pickup_address, pickup_city, pickup_state, pickup_country, pickup_notes, submitted_at')
            .in('order_id', orderIds),
        userIds.length > 0
            ? supabase
                .from('user_profiles')
                .select('user_id, display_name, email')
                .in('user_id', userIds)
            : Promise.resolve({ data: [], error: null }),
        addressIds.length > 0
            ? supabase
                .from('addresses')
                .select('id, line1, line2, city, state, country, postal_code')
                .in('id', addressIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (orderItemsError) {
        throw orderItemsError;
    }

    if (fulfillmentsError) {
        throw fulfillmentsError;
    }

    if (trackingEventsError) {
        throw trackingEventsError;
    }

    if (vendorFulfillmentsError) {
        throw vendorFulfillmentsError;
    }

    if (profileResponse.error) {
        throw profileResponse.error;
    }

    if (addressResponse.error) {
        throw addressResponse.error;
    }

    const orderItems = (orderItemRows ?? []) as DeliveryOrderItemRow[];
    const productIds = Array.from(new Set(orderItems.map((item) => item.product_id).filter(Boolean)));

    let productsById = new Map<string, DeliveryProductRow>();

    if (productIds.length > 0) {
        const { data: productRows, error: productsError } = await supabase
            .from('products')
            .select('id, name, sku, product_images(url, position)')
            .in('id', productIds);

        if (productsError) {
            throw productsError;
        }

        productsById = new Map(
            ((productRows ?? []) as DeliveryProductRow[]).map((product) => [product.id, product])
        );
    }

    const itemsByOrderId = new Map<string, DeliveryOrder['order_items']>();
    for (const item of orderItems) {
        const currentItems = itemsByOrderId.get(item.order_id) ?? [];
        currentItems.push({
            id: item.id,
            product_id: item.product_id,
            quantity: Number(item.quantity ?? 0),
            unit_price: Number(item.unit_price ?? 0),
            products: productsById.has(item.product_id)
                ? {
                    name: productsById.get(item.product_id)?.name ?? null,
                    sku: productsById.get(item.product_id)?.sku ?? null,
                    product_images: productsById.get(item.product_id)?.product_images ?? [],
                }
                : null,
        });
        itemsByOrderId.set(item.order_id, currentItems);
    }

    const fulfillmentsByOrderId = new Map<string, DeliveryOrder['order_fulfillments']>();
    for (const fulfillment of (fulfillmentRows ?? []) as DeliveryFulfillmentRow[]) {
        const currentFulfillments = fulfillmentsByOrderId.get(fulfillment.order_id) ?? [];
        currentFulfillments.push({
            id: fulfillment.id,
            status: fulfillment.status,
            carrier_name: fulfillment.carrier_name,
            tracking_number: fulfillment.tracking_number,
            tracking_url: fulfillment.tracking_url,
            assigned_at: fulfillment.assigned_at,
            packed_at: fulfillment.packed_at,
            shipped_at: fulfillment.shipped_at,
            delivered_at: fulfillment.delivered_at,
            estimated_delivery_at: fulfillment.estimated_delivery_at,
            last_status_note: fulfillment.last_status_note,
            delivery_partner_id: fulfillment.delivery_partner_id,
        });
        fulfillmentsByOrderId.set(fulfillment.order_id, currentFulfillments);
    }

    const trackingByOrderId = new Map<string, DeliveryOrder['order_tracking_events']>();
    for (const event of (trackingEventRows ?? []) as DeliveryTrackingEventRow[]) {
        const currentEvents = trackingByOrderId.get(event.order_id) ?? [];
        currentEvents.push({
            id: event.id,
            order_id: event.order_id,
            status: event.status,
            location: event.location,
            description: event.description,
            event_time: event.event_time,
        });
        trackingByOrderId.set(event.order_id, currentEvents);
    }

    const vendorFulfillmentsByOrderId = new Map<string, DeliveryOrder['vendor_order_fulfillments']>();
    for (const vendorFulfillment of (vendorFulfillmentRows ?? []) as VendorOrderFulfillmentRow[]) {
        const currentVendorFulfillments = vendorFulfillmentsByOrderId.get(vendorFulfillment.order_id) ?? [];
        currentVendorFulfillments.push({
            id: vendorFulfillment.id,
            vendor_id: vendorFulfillment.vendor_id,
            status: vendorFulfillment.status as 'not_ready' | 'ready',
            pickup_contact_name: vendorFulfillment.pickup_contact_name,
            pickup_contact_phone: vendorFulfillment.pickup_contact_phone,
            pickup_address: vendorFulfillment.pickup_address,
            pickup_city: vendorFulfillment.pickup_city,
            pickup_state: vendorFulfillment.pickup_state,
            pickup_country: vendorFulfillment.pickup_country,
            pickup_notes: vendorFulfillment.pickup_notes,
            submitted_at: vendorFulfillment.submitted_at,
        });
        vendorFulfillmentsByOrderId.set(vendorFulfillment.order_id, currentVendorFulfillments);
    }

    for (const [orderId, events] of trackingByOrderId.entries()) {
        if (!events) {
            continue;
        }
        events.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
        trackingByOrderId.set(orderId, events);
    }

    const profilesByUserId = new Map(
        ((profileResponse.data ?? []) as DeliveryProfileRow[]).map((profile) => [
            profile.user_id,
            profile,
        ])
    );

    const addressesById = new Map(
        ((addressResponse.data ?? []) as DeliveryAddressRow[]).map((address) => [address.id, address])
    );

    const hydratedOrders = orders.map((order) => ({
        id: order.id,
        user_id: order.user_id,
        status: order.status,
        total_amount: Number(order.total_amount ?? 0),
        currency: order.currency,
        shipping_address_id: order.shipping_address_id,
        placed_at: order.placed_at,
        updated_at: order.updated_at,
        fulfillment_status: order.fulfillment_status,
        delivery_status: order.delivery_status,
        user_profiles: order.user_id ? profilesByUserId.get(order.user_id) ?? null : null,
        addresses: order.shipping_address_id ? addressesById.get(order.shipping_address_id) ?? null : null,
        order_items: itemsByOrderId.get(order.id) ?? [],
        order_fulfillments: fulfillmentsByOrderId.get(order.id) ?? [],
        order_tracking_events: trackingByOrderId.get(order.id) ?? [],
        vendor_order_fulfillments: vendorFulfillmentsByOrderId.get(order.id) ?? [],
    })) as DeliveryOrder[];

    const filteredOrders = searchQuery
        ? hydratedOrders.filter((order) => matchesSearch(order, searchQuery))
        : hydratedOrders;

    console.debug('[deliveryOrders] hydrated', {
        orders: hydratedOrders.length,
        filteredOrders: filteredOrders.length,
        items: orderItems.length,
        fulfillments: (fulfillmentRows ?? []).length,
        trackingEvents: (trackingEventRows ?? []).length,
        vendorFulfillments: (vendorFulfillmentRows ?? []).length,
    });

    return filteredOrders;
}
