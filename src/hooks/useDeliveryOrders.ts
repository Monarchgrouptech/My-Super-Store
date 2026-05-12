import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DeliveryOrder } from '../types/delivery';
import { useDeliveryPartner } from './useDeliveryPartner';

export function useDeliveryOrders() {
    const { partner } = useDeliveryPartner();
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async (searchQuery?: string) => {
        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('orders')
                .select(`
                    *,
                    order_items(*, products(name, sku, product_images(url, position))),
                    order_fulfillments(*),
                    order_tracking_events(*)
                `)
                .eq('status', 'paid');

            if (searchQuery) {
                // If it looks like a UUID (Order ID), query by ID
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery);
                if (isUuid) {
                    query = query.eq('id', searchQuery);
                } else {
                    // Otherwise, we'll need to filter by email which requires hydrating user_profiles first or using a join if possible
                    // But based on schema audit, we hydrate manually. 
                    // So for email search, we first find the user_ids associated with that email.
                    const { data: userRes } = await supabase
                        .from('user_profiles')
                        .select('user_id')
                        .ilike('email', `%${searchQuery}%`);
                    
                    const matchedUserIds = userRes?.map(u => u.user_id) || [];
                    if (matchedUserIds.length > 0) {
                        query = query.in('user_id', matchedUserIds);
                    } else if (!isUuid) {
                        // If no users found and it's not a UUID, return empty
                        setOrders([]);
                        setLoading(false);
                        return;
                    }
                }
            }

            const { data: rawOrders, error: ordersError } = await query.order('placed_at', { ascending: false });

            if (ordersError) throw ordersError;

            if (!rawOrders || rawOrders.length === 0) {
                setOrders([]);
                return;
            }

            // Manual hydration for user_profiles and addresses
            const userIds = Array.from(new Set(rawOrders.map(o => o.user_id).filter(Boolean))) as string[];
            const addressIds = Array.from(new Set(rawOrders.map(o => o.shipping_address_id).filter(Boolean))) as string[];

            const [profilesRes, addressesRes] = await Promise.all([
                userIds.length > 0 
                    ? supabase.from('user_profiles').select('user_id, display_name, email').in('user_id', userIds)
                    : Promise.resolve({ data: [] }),
                addressIds.length > 0
                    ? supabase.from('addresses').select('*').in('id', addressIds)
                    : Promise.resolve({ data: [] })
            ]);

            const profilesMap = new Map(profilesRes.data?.map(p => [p.user_id, p]));
            const addressesMap = new Map(addressesRes.data?.map(a => [a.id, a]));

            const hydratedOrders = rawOrders.map(order => ({
                ...order,
                user_profiles: profilesMap.get(order.user_id) || null,
                addresses: addressesMap.get(order.shipping_address_id) || null
            }));

            setOrders(hydratedOrders as DeliveryOrder[]);
        } catch (err) {
            console.error('Error fetching delivery orders:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, [partner]);

    const updateOrderStatus = async (orderId: string, status: Partial<DeliveryOrder>, event?: { status: string, description: string, location?: string }) => {
        try {
            const { error: updateError } = await supabase
                .from('orders')
                .update(status)
                .eq('id', orderId);

            if (updateError) throw updateError;

            if (event) {
                const { error: eventError } = await supabase
                    .from('order_tracking_events')
                    .insert({
                        order_id: orderId,
                        status: event.status,
                        description: event.description,
                        location: event.location || 'Logistics Hub',
                        event_time: new Date().toISOString()
                    });
                
                if (eventError) throw eventError;
            }

            // Also update fulfillment if needed
            if (status.delivery_status === 'shipped' && status.order_fulfillments) {
                // This is a bit simplified, usually you'd update the specific fulfillment record
            }

            await fetchOrders();
            return { success: true };
        } catch (err) {
            console.error('Error updating order status:', err);
            return { success: false, error: err };
        }
    };

    const createShipment = async (orderId: string, data: { carrierName: string, trackingNumber: string, trackingUrl: string }) => {
        try {
            // 1. Update order status
            const { error: orderError } = await supabase
                .from('orders')
                .update({ 
                    delivery_status: 'shipped',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (orderError) throw orderError;

            // 2. Find and update the fulfillment record
            const { data: fulfillmentData } = await supabase
                .from('order_fulfillments')
                .select('id')
                .eq('order_id', orderId)
                .maybeSingle();

            if (fulfillmentData) {
                await supabase
                    .from('order_fulfillments')
                    .update({
                        carrier_name: data.carrierName,
                        tracking_number: data.trackingNumber,
                        tracking_url: data.trackingUrl,
                        shipped_at: new Date().toISOString(),
                        status: 'shipped'
                    })
                    .eq('id', fulfillmentData.id);
            }

            // 3. Add tracking event
            await supabase
                .from('order_tracking_events')
                .insert({
                    order_id: orderId,
                    status: 'shipped',
                    description: `Shipment created with ${data.carrierName}. Tracking: ${data.trackingNumber}`,
                    location: 'Sorting Facility',
                    event_time: new Date().toISOString()
                });

            await fetchOrders();
            return { success: true };
        } catch (err) {
            console.error('Error creating shipment:', err);
            return { success: false, error: err };
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return {
        orders,
        loading,
        error,
        refetch: fetchOrders,
        updateOrderStatus,
        createShipment
    };
}
