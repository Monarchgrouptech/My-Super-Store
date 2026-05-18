import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DeliveryOrder } from '../types/delivery';
import { fetchDeliveryOrders } from '../lib/deliveryOrders';
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
            const hydratedOrders = await fetchDeliveryOrders(searchQuery);
            setOrders(hydratedOrders);
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
