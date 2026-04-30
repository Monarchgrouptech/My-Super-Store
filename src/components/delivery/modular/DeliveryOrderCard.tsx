import React from 'react';
import { MapPin, User, Package, ArrowRight } from 'lucide-react';
import { DeliveryOrder } from '../../../types/delivery';
import { 
    getStage, 
    displayStage, 
    getStatusBadgeClass, 
    shortOrderId, 
    formatTimeAgo 
} from '../../../lib/deliveryUtils';

interface DeliveryOrderCardProps {
    order: DeliveryOrder;
    isSelected: boolean;
    onClick: (order: DeliveryOrder) => void;
}

export function DeliveryOrderCard({ order, isSelected, onClick }: DeliveryOrderCardProps) {
    const stage = getStage(order);
    const badgeClass = getStatusBadgeClass(stage);
    const customerName = order.user_profiles?.display_name || 'Anonymous Customer';
    const city = order.addresses?.city || 'Unknown City';
    const itemCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return (
        <div 
            onClick={() => onClick(order)}
            className={`group cursor-pointer border p-5 transition-all duration-200 ${
                isSelected 
                    ? 'border-black bg-zinc-50 shadow-md ring-1 ring-black' 
                    : 'border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm'
            }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-black tracking-tight text-black">
                        {shortOrderId(order.id)}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Placed {formatTimeAgo(order.placed_at)}
                    </span>
                </div>
                <span className={`status-badge ${badgeClass}`}>
                    {displayStage(stage)}
                </span>
            </div>

            <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                        <User size={14} className="text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] font-bold text-black truncate">{customerName}</p>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <MapPin size={10} />
                            <span className="truncate">{city}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                        <Package size={14} className="text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-zinc-600">
                            {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                        </p>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            {order.currency || 'USD'} {order.total_amount.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Tracking</span>
                    <span className="text-[11px] font-black text-black">
                        {order.order_fulfillments?.[0]?.tracking_number || 'UNASSIGNED'}
                    </span>
                </div>
                <ArrowRight 
                    size={18} 
                    className={`transition-transform duration-300 ${
                        isSelected ? 'translate-x-1 text-black' : 'text-zinc-300 group-hover:text-zinc-500'
                    }`} 
                />
            </div>
        </div>
    );
}
