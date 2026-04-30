import React from 'react';
import { DeliveryOrder } from '../../../types/delivery';
import { DeliveryOrderCard } from './DeliveryOrderCard';
import { Loader2, Inbox } from 'lucide-react';

interface DeliveryOrderListProps {
    orders: DeliveryOrder[];
    loading: boolean;
    selectedOrderId?: string;
    onOrderSelect: (order: DeliveryOrder) => void;
}

export function DeliveryOrderList({ 
    orders, 
    loading, 
    selectedOrderId, 
    onOrderSelect 
}: DeliveryOrderListProps) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-zinc-300" size={40} />
                <p className="label-caps text-zinc-400">Loading Orders...</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed border-zinc-200 bg-zinc-50/50">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                    <Inbox size={32} className="text-zinc-300" />
                </div>
                <div className="text-center">
                    <p className="text-[14px] font-bold text-black uppercase tracking-tight">No orders found</p>
                    <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                        Try adjusting your filters or tabs
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {orders.map((order) => (
                <DeliveryOrderCard
                    key={order.id}
                    order={order}
                    isSelected={order.id === selectedOrderId}
                    onClick={onOrderSelect}
                />
            ))}
        </div>
    );
}
