import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Package, 
    Truck, 
    CheckCircle2, 
    Clock, 
    MapPin, 
    ChevronLeft, 
    ArrowRight,
    Loader2,
    HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TrackingEvent {
    id: string;
    status: string;
    location: string;
    description: string;
    event_time: string;
}

interface OrderDetails {
    id: string;
    status: string;
    fulfillment_status: string;
    total_amount: number;
    placed_at: string;
    order_fulfillments?: {
        carrier_name: string;
        tracking_number: string;
        estimated_delivery_at: string;
    }[];
}

export function OrderTracking() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [events, setEvents] = useState<TrackingEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchTrackingData();
        }
    }, [id]);

    const fetchTrackingData = async () => {
        try {
            setLoading(true);
            
            // Fetch order and fulfillment
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select(`
                    id, status, fulfillment_status, total_amount, placed_at,
                    order_fulfillments (carrier_name, tracking_number, estimated_delivery_at)
                `)
                .eq('id', id)
                .single();

            if (orderError) throw orderError;
            setOrder(orderData);

            // Fetch events
            const { data: eventsData, error: eventsError } = await supabase
                .from('order_tracking_events')
                .select('*')
                .eq('order_id', id)
                .order('event_time', { ascending: false });

            if (eventsError) throw eventsError;
            setEvents(eventsData || []);

        } catch (error) {
            console.error('Error fetching tracking data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin text-[#D4AF37] mb-4" size={48} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Locating Shipment...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <HelpCircle className="text-red-500" size={40} />
                </div>
                <h1 className="text-2xl font-serif font-bold text-gray-900">Track ID Not Found</h1>
                <p className="text-gray-500 mt-2 max-w-xs">We couldn't find a shipment associated with this ID. Please check your order history.</p>
                <button 
                    onClick={() => navigate('/account')}
                    className="mt-8 px-8 py-3 bg-[#0A0A0A] text-[#D4AF37] rounded-full font-bold transition-all"
                >
                    Back to My Orders
                </button>
            </div>
        );
    }

    const currentStep = events[0]?.status || 'pending';
    
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Minimal Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-sm font-bold uppercase tracking-widest text-gray-900">Track Order</h1>
                    <div className="w-10"></div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
                {/* Status Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6">
                        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center border border-[#D4AF37]/20">
                            <Truck className="text-[#D4AF37]" size={24} />
                        </div>
                    </div>
                    
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Current Status</p>
                    <h2 className="text-3xl font-serif font-bold text-[#0A0A0A] capitalize mb-4">
                        {currentStep.replace('_', ' ')}
                    </h2>
                    
                    {order.order_fulfillments?.[0] && (
                        <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-50">
                            <div className="flex-1 min-w-[140px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Carrier</p>
                                <p className="text-sm font-bold text-gray-900">{order.order_fulfillments[0].carrier_name}</p>
                            </div>
                            <div className="flex-1 min-w-[140px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tracking Number</p>
                                <p className="text-sm font-bold text-[#D4AF37] font-mono">{order.order_fulfillments[0].tracking_number}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <Clock size={16} className="text-[#D4AF37]" />
                        Journey History
                    </h3>
                    
                    <div className="space-y-0 relative">
                        {/* Vertical Progress Line */}
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100"></div>
                        
                        {events.length > 0 ? (
                            events.map((event, idx) => (
                                <div key={event.id} className="relative pl-12 pb-10 last:pb-0 group">
                                    <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 transition-all duration-500 ${
                                        idx === 0 ? 'bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/30 scale-110' : 'bg-gray-200'
                                    }`}>
                                        {idx === 0 ? <CheckCircle2 size={16} className="text-black" /> : <div className="w-2 h-2 rounded-full bg-white/50"></div>}
                                    </div>
                                    
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className={`text-sm font-bold uppercase tracking-tight ${idx === 0 ? 'text-[#0A0A0A]' : 'text-gray-400'}`}>
                                                {event.status.replace('_', ' ')}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-400 font-mono">
                                                {new Date(event.event_time).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{event.description}</p>
                                        {event.location && (
                                            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-[#D4AF37]/70 uppercase tracking-widest">
                                                <MapPin size={10} />
                                                <span>{event.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-8 h-8 rounded-full border-4 border-white bg-[#D4AF37] flex items-center justify-center z-10 shadow-lg shadow-[#D4AF37]/30">
                                    <Package size={16} className="text-black" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-tight text-[#0A0A0A]">Order Placed</p>
                                    <p className="text-[10px] font-bold text-gray-400 font-mono mb-2">{new Date(order.placed_at).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Your order has been received and is awaiting processing.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Help Section */}
                <div className="bg-[#0A0A0A] rounded-3xl p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] rounded-full blur-[60px] opacity-10 -mr-16 -mt-16 group-hover:opacity-20 transition-opacity"></div>
                    <div className="relative z-10">
                        <h4 className="text-lg font-serif font-bold text-[#D4AF37] mb-2">Need help with this order?</h4>
                        <p className="text-sm text-gray-400 leading-relaxed mb-6">Our dedicated support team is available 24/7 to assist with your shipment.</p>
                        <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">
                            Contact Support
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
