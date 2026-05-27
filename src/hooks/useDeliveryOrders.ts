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
            
            // Filter orders so delivery partners only see ready-for-pickup orders (unassigned)
            // or orders explicitly assigned to them.
            const filtered = hydratedOrders.filter(o => {
                if (o.delivery_status === 'ready_for_pickup') return true;
                const fulfillment = o.order_fulfillments?.[0];
                return fulfillment?.delivery_partner_id === partner?.id;
            });
            
            setOrders(filtered);
        } catch (err) {
            console.error('Error fetching delivery orders:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, [partner]);

    const updateOrderStatus = async (
        orderId: string,
        action: 'accept_order' | 'mark_picked_up' | 'confirm_shipment' | 'mark_in_transit' | 'out_for_delivery' | 'mark_delivered',
        extra?: { carrierName?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; location?: string | null; note?: string | null }
    ) => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: invokeError } = await supabase.functions.invoke('delivery-lifecycle', {
                body: {
                    orderId,
                    action,
                    carrierName: extra?.carrierName || null,
                    trackingNumber: extra?.trackingNumber || null,
                    trackingUrl: extra?.trackingUrl || null,
                    location: extra?.location || null,
                    note: extra?.note || null
                }
            });

            if (invokeError) throw invokeError;

            if (data && data.ok === false) {
                throw new Error(data.error || 'Action failed');
            }

            await fetchOrders();
            return { success: true };
        } catch (err) {
            console.error('Error updating delivery status via edge function:', err);
            const msg = err instanceof Error ? err.message : 'Action failed';
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const createShipment = async (orderId: string, data: { carrierName: string, trackingNumber: string, trackingUrl: string }) => {
        try {
            await updateOrderStatus(orderId, 'confirm_shipment', data);
            return { success: true };
        } catch (err) {
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
