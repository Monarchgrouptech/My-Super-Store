export type DeliveryStage =
    | 'ready_for_pickup' // Vendor marked items as ready
    | 'picked_up'        // Delivery partner picked up the order
    | 'processing'       // Delivery partner is processing
    | 'shipped'          // Shipment created (carrier/tracking info added)
    | 'in_transit'       // Package is moving
    | 'out_for_delivery' // On final delivery run
    | 'delivered'        // Completed handoff
    | 'pending'          // Initial state before vendor readiness
    | 'packed';          // Same as ready_for_pickup from vendor perspective

export interface DeliveryAddress {
    id?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
}

export interface CustomerProfile {
    user_id?: string | null;
    display_name?: string | null;
    email?: string | null;
}

export interface DeliveryProduct {
    name?: string | null;
    sku?: string | null;
    product_images?: { url: string; position?: number | null }[];
}

export interface DeliveryOrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    products?: DeliveryProduct | null;
}

export interface DeliveryFulfillment {
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

export interface VendorReadiness {
    id: string;
    vendor_id: string;
    status: 'not_ready' | 'ready';
    pickup_contact_name: string | null;
    pickup_contact_phone: string | null;
    pickup_address: string | null;
    pickup_city: string | null;
    pickup_state: string | null;
    pickup_country: string | null;
    pickup_notes: string | null;
    submitted_at: string | null;
}

export interface DeliveryTrackingEvent {
    id: string;
    order_id: string;
    status: string;
    location?: string | null;
    description?: string | null;
    event_time: string;
}

export interface DeliveryOrder {
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
    user_profiles?: CustomerProfile | null;
    addresses?: DeliveryAddress | null;
    order_items?: DeliveryOrderItem[];
    order_fulfillments?: DeliveryFulfillment[];
    order_tracking_events?: DeliveryTrackingEvent[];
    vendor_order_fulfillments?: VendorReadiness[];
}
