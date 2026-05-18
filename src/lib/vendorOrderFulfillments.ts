import { supabase } from './supabase';
import { VendorOrderFulfillment } from '../types/vendor';

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
    created_at: string;
    updated_at: string;
}

/**
 * Fetch vendor order fulfillment records for an order
 */
export async function fetchVendorOrderFulfillments(orderId: string): Promise<VendorOrderFulfillment[]> {
    const { data, error } = await supabase
        .from('vendor_order_fulfillments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }

    return ((data ?? []) as VendorOrderFulfillmentRow[]).map((row) => ({
        id: row.id,
        order_id: row.order_id,
        vendor_id: row.vendor_id,
        status: row.status as 'not_ready' | 'ready',
        pickup_contact_name: row.pickup_contact_name,
        pickup_contact_phone: row.pickup_contact_phone,
        pickup_address: row.pickup_address,
        pickup_city: row.pickup_city,
        pickup_state: row.pickup_state,
        pickup_country: row.pickup_country,
        pickup_notes: row.pickup_notes,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

/**
 * Get the vendor fulfillment record for a specific order_id + vendor_id pair
 */
export async function fetchVendorFulfillmentForOrderAndVendor(
    orderId: string,
    vendorId: string
): Promise<VendorOrderFulfillment | null> {
    const { data, error } = await supabase
        .from('vendor_order_fulfillments')
        .select('*')
        .eq('order_id', orderId)
        .eq('vendor_id', vendorId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    const row = data as VendorOrderFulfillmentRow;
    return {
        id: row.id,
        order_id: row.order_id,
        vendor_id: row.vendor_id,
        status: row.status as 'not_ready' | 'ready',
        pickup_contact_name: row.pickup_contact_name,
        pickup_contact_phone: row.pickup_contact_phone,
        pickup_address: row.pickup_address,
        pickup_city: row.pickup_city,
        pickup_state: row.pickup_state,
        pickup_country: row.pickup_country,
        pickup_notes: row.pickup_notes,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/**
 * Update vendor readiness for an order_id + vendor_id
 * Requires all pickup details and marks status as 'ready'
 * The database trigger will validate and handle order-level state sync
 */
export async function updateVendorReadiness(
    orderId: string,
    vendorId: string,
    data: {
        pickup_contact_name: string;
        pickup_contact_phone: string;
        pickup_address: string;
        pickup_city: string;
        pickup_state: string;
        pickup_country: string;
        pickup_notes?: string;
    }
): Promise<VendorOrderFulfillment> {
    // First check if a row exists
    const existing = await fetchVendorFulfillmentForOrderAndVendor(orderId, vendorId);

    let result;
    if (existing) {
        // Update existing row
        const { data: updatedData, error } = await supabase
            .from('vendor_order_fulfillments')
            .update({
                status: 'ready',
                pickup_contact_name: data.pickup_contact_name,
                pickup_contact_phone: data.pickup_contact_phone,
                pickup_address: data.pickup_address,
                pickup_city: data.pickup_city,
                pickup_state: data.pickup_state,
                pickup_country: data.pickup_country,
                pickup_notes: data.pickup_notes || null,
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        result = updatedData as VendorOrderFulfillmentRow;
    } else {
        // Insert new row
        const { data: insertedData, error } = await supabase
            .from('vendor_order_fulfillments')
            .insert({
                order_id: orderId,
                vendor_id: vendorId,
                status: 'ready',
                pickup_contact_name: data.pickup_contact_name,
                pickup_contact_phone: data.pickup_contact_phone,
                pickup_address: data.pickup_address,
                pickup_city: data.pickup_city,
                pickup_state: data.pickup_state,
                pickup_country: data.pickup_country,
                pickup_notes: data.pickup_notes || null,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        result = insertedData as VendorOrderFulfillmentRow;
    }

    return {
        id: result.id,
        order_id: result.order_id,
        vendor_id: result.vendor_id,
        status: result.status as 'not_ready' | 'ready',
        pickup_contact_name: result.pickup_contact_name,
        pickup_contact_phone: result.pickup_contact_phone,
        pickup_address: result.pickup_address,
        pickup_city: result.pickup_city,
        pickup_state: result.pickup_state,
        pickup_country: result.pickup_country,
        pickup_notes: result.pickup_notes,
        submitted_at: result.submitted_at,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };
}

/**
 * Check if an order is globally ready for delivery
 * i.e., all vendors on the order have status 'ready'
 */
export async function isOrderGloballyReady(orderId: string): Promise<boolean> {
    const fulfillments = await fetchVendorOrderFulfillments(orderId);

    if (fulfillments.length === 0) {
        // No vendors on this order yet
        return false;
    }

    // Order is ready when all vendors are ready
    return fulfillments.every((f) => f.status === 'ready');
}
