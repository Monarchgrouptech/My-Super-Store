import { Clock, MapPin, Activity, Package, CheckCircle, Truck } from 'lucide-react';
import { DeliveryOrder } from '../../../types/delivery';
import { shortOrderId, formatTimeAgo } from '../../../lib/deliveryUtils';

interface DeliveryTrackingFeedProps {
    orders: DeliveryOrder[];
}

export function DeliveryTrackingFeed({ orders }: DeliveryTrackingFeedProps) {
    // Extract all events from all orders and sort them by time (newest first)
    const allEvents = orders.flatMap(order => 
        (order.order_tracking_events || []).map(event => ({
            ...event,
            order_id: order.id,
            customer: order.user_profiles?.display_name || 'Anonymous'
        }))
    ).sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

    if (allEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed border-zinc-200 bg-zinc-50/50">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                    <Activity size={32} className="text-zinc-300" />
                </div>
                <div className="text-center">
                    <p className="text-[14px] font-bold text-black uppercase tracking-tight">No activity logs yet</p>
                    <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                        Recent delivery updates will appear here
                    </p>
                </div>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('delivered')) return <CheckCircle size={16} className="text-black" />;
        if (s.includes('transit') || s.includes('out')) return <Truck size={16} className="text-black" />;
        if (s.includes('pickup') || s.includes('picked')) return <Package size={16} className="text-black" />;
        if (s.includes('ready')) return <Clock size={16} className="text-black" />;
        return <Activity size={16} className="text-black" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-[20px] font-black text-black tracking-tight uppercase">Live Tracking Feed</h2>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                        Chronological log of all delivery network events
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2">
                    <div className="w-2 h-2 bg-[#9f7418] rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-black uppercase tracking-widest">Live Updates</span>
                </div>
            </div>

            <div className="relative">
                <div className="absolute left-[27px] top-4 bottom-4 w-[1px] bg-zinc-200"></div>
                
                <div className="space-y-8">
                    {allEvents.map((event) => (
                        <div key={event.id} className="flex gap-6 relative z-10">
                            <div className="w-14 h-14 bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-sm metallic-shadow">
                                {getStatusIcon(event.status)}
                            </div>
                            
                            <div className="flex-1 bg-white border border-zinc-200 p-5 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                    <div>
                                        <p className="text-[13px] font-black text-black uppercase tracking-tight leading-none mb-1">
                                            {event.status.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                                            Order {shortOrderId(event.order_id)} • {event.customer}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-3 py-1 self-start">
                                        <Clock size={12} />
                                        {formatTimeAgo(event.event_time)}
                                    </div>
                                </div>

                                <p className="text-[13px] text-zinc-600 font-medium leading-relaxed italic mb-4">
                                    "{event.description}"
                                </p>

                                {event.location && (
                                    <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                                        <MapPin size={12} />
                                        {event.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
