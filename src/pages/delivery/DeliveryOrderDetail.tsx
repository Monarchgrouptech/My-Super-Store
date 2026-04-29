import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Package, 
    Truck, 
    CheckCircle2, 
    Clock, 
    MapPin, 
    User, 
    Phone, 
    Mail, 
    ShieldCheck, 
    Loader2,
    AlertCircle,
    X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDeliveryPartner } from '../../hooks/useDeliveryPartner';
import { useCurrency } from '../../context/CurrencyContext';

interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    products: {
        name: string;
        image_url?: string;
        product_images?: { url: string }[];
    };
}

interface Order {
    id: string;
    user_id: string;
    status: string;
    total_amount: number;
    placed_at: string;
    fulfillment_status: string;
    delivery_status: string;
    shipping_address_id: string;
    user_profiles: {
        display_name: string;
        email: string;
    };
    addresses: {
        label: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        country: string;
        postal_code: string;
    };
}

interface Fulfillment {
    id: string;
    status: string;
    carrier_name?: string;
    tracking_number?: string;
    tracking_url?: string;
    last_status_note?: string;
}

interface TrackingEvent {
    id: string;
    status: string;
    location: string;
    description: string;
    event_time: string;
}

export function DeliveryOrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { partner } = useDeliveryPartner();
    const { formatPrice } = useCurrency();
    
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
    const [events, setEvents] = useState<TrackingEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    
    // Form states
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [carrierName, setCarrierName] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [location, setLocation] = useState(partner?.city || '');

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
        }
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Order with User Profile and Address
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select(`
                    *,
                    user_profiles:user_id (display_name, email),
                    addresses:shipping_address_id (*)
                `)
                .eq('id', id)
                .single();

            if (orderError) throw orderError;
            setOrder(orderData);

            // 2. Fetch Order Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                    *,
                    products (
                        name,
                        product_images (url)
                    )
                `)
                .eq('order_id', id);

            if (itemsError) throw itemsError;
            setItems(itemsData || []);

            // 3. Fetch Fulfillment
            const { data: fData } = await supabase
                .from('order_fulfillments')
                .select('*')
                .eq('order_id', id)
                .maybeSingle();
            
            setFulfillment(fData);
            if (fData) {
                setCarrierName(fData.carrier_name || '');
                setTrackingNumber(fData.tracking_number || '');
            }

            // 4. Fetch Tracking Events
            const { data: eventsData } = await supabase
                .from('order_tracking_events')
                .select('*')
                .eq('order_id', id)
                .order('event_time', { ascending: false });

            setEvents(eventsData || []);

        } catch (error) {
            console.error('Error fetching order details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!order || !partner || !newStatus) return;
        
        try {
            setUpdating(true);
            const now = new Date().toISOString();

            // 1. Ensure fulfillment record exists
            let fulfillmentId = fulfillment?.id;
            if (!fulfillmentId) {
                const { data: newF, error: fError } = await supabase
                    .from('order_fulfillments')
                    .insert({
                        order_id: order.id,
                        delivery_partner_id: partner.id,
                        status: newStatus,
                        carrier_name: carrierName,
                        tracking_number: trackingNumber,
                        last_status_note: statusNote
                    })
                    .select()
                    .single();
                
                if (fError) throw fError;
                fulfillmentId = newF.id;
            } else {
                const { error: fUpdateError } = await supabase
                    .from('order_fulfillments')
                    .update({
                        status: newStatus,
                        carrier_name: carrierName,
                        tracking_number: trackingNumber,
                        last_status_note: statusNote,
                        updated_at: now,
                        ...(newStatus === 'shipped' ? { shipped_at: now } : {}),
                        ...(newStatus === 'delivered' ? { delivered_at: now } : {})
                    })
                    .eq('id', fulfillmentId);
                
                if (fUpdateError) throw fUpdateError;
            }

            // 2. Update Order Status
            const { error: orderUpdateError } = await supabase
                .from('orders')
                .update({
                    fulfillment_status: newStatus,
                    updated_at: now
                })
                .eq('id', order.id);
            
            if (orderUpdateError) throw orderUpdateError;

            // 3. Create Tracking Event
            const { error: eventError } = await supabase
                .from('order_tracking_events')
                .insert({
                    order_id: order.id,
                    fulfillment_id: fulfillmentId,
                    status: newStatus,
                    location: location,
                    description: statusNote || `Order status updated to ${newStatus}`,
                    event_time: now
                });
            
            if (eventError) throw eventError;

            // 4. Log to Status History
            await supabase.from('order_status_history').insert({
                order_id: order.id,
                status_type: 'fulfillment',
                old_value: order.fulfillment_status,
                new_value: newStatus,
                note: statusNote,
                changed_by: partner.user_id
            });

            setShowStatusModal(false);
            await fetchOrderDetails();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin text-[#D4AF37] mb-4" size={48} />
                <p className="label-caps text-zinc-400">Loading Operational Profile...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-white p-8">
                <AlertCircle size={64} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-black mb-4 uppercase">ORDER NOT FOUND</h2>
                <button onClick={() => navigate('/delivery/dashboard')} className="prestige-btn-primary">Return to Dashboard</button>
            </div>
        );
    }

    const statuses = [
        { id: 'pending', label: 'Pending', icon: Clock },
        { id: 'processing', label: 'Processing', icon: Package },
        { id: 'packed', label: 'Packed', icon: ShieldCheck },
        { id: 'shipped', label: 'Shipped', icon: Truck },
        { id: 'in_transit', label: 'In Transit', icon: Truck },
        { id: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
        { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    ];

    return (
        <div className="min-h-full bg-zinc-50 p-8 lg:p-12 overflow-y-auto h-[calc(100vh-5rem)]">
            {/* Header Section */}
            <header className="mb-12">
                <button 
                    onClick={() => navigate('/delivery/dashboard')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-black transition-colors mb-8 group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="label-caps">BACK TO MANIFEST</span>
                </button>

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <p className="label-caps text-[#D4AF37] mb-2">OPERATIONAL PROFILE</p>
                        <h1 className="text-[48px] font-bold text-black tracking-tighter leading-none mb-4 uppercase">
                            #{order.id.slice(0, 8)}
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-black text-white text-[11px] font-bold uppercase tracking-[0.2em]">
                                {order.delivery_status || 'PENDING'}
                            </span>
                            <p className="text-[12px] text-zinc-400 font-bold uppercase tracking-widest">
                                PLACED: {new Date(order.placed_at).toLocaleDateString()} — {new Date(order.placed_at).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button className="prestige-btn-secondary border-black">DOWNLOAD MANIFEST</button>
                        <button className="prestige-btn-gold">PRINT LABEL</button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column: Details & Consignment (col-span-7) */}
                <div className="lg:col-span-7 space-y-12">
                    {/* Customer & Address Bento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-zinc-200 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-black flex items-center justify-center">
                                    <User className="text-[#D4AF37]" size={20} />
                                </div>
                                <p className="label-caps text-zinc-400">RECIPIENT</p>
                            </div>
                            <h3 className="text-[24px] font-bold text-black mb-4 uppercase">{order.user_profiles?.display_name || 'GUEST'}</h3>
                            <div className="space-y-2 text-[14px] text-zinc-600">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} />
                                    <span>+234 800 000 0000</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} />
                                    <span className="truncate">{order.user_profiles?.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-200 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-black flex items-center justify-center">
                                    <MapPin className="text-[#D4AF37]" size={20} />
                                </div>
                                <p className="label-caps text-zinc-400">SHIPPING DESTINATION</p>
                            </div>
                            <div className="space-y-1 text-[14px] text-zinc-800 font-bold uppercase">
                                <p>{order.addresses?.line1 || '221B BAKER STREET'}</p>
                                {order.addresses?.line2 && <p>{order.addresses.line2}</p>}
                                <p>{order.addresses?.city || 'LAGOS'}, {order.addresses?.state || 'NIGERIA'}</p>
                                <p className="font-mono text-zinc-500 mt-2">{order.addresses?.postal_code || '101233'}, {order.addresses?.country || 'NG'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Consignment List */}
                    <div className="bg-white border border-black overflow-hidden">
                        <div className="bg-zinc-50 px-8 py-4 border-b border-black">
                            <p className="label-caps text-black">CONSIGNMENT LIST — {items.length} ITEMS</p>
                        </div>
                        <div className="divide-y divide-zinc-100">
                            {items.map((item) => (
                                <div key={item.id} className="p-8 flex gap-6">
                                    <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                        <Package size={32} className="text-zinc-300" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-[18px] font-bold text-black uppercase">{item.products?.name}</h4>
                                            <p className="text-[18px] font-bold text-black">{formatPrice(item.unit_price)}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-[12px] font-bold text-zinc-400 font-mono">SKU: {item.product_id.slice(0, 12).toUpperCase()}</p>
                                            <p className="text-[14px] font-black text-black">QTY: {item.quantity}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 bg-zinc-50 border-t border-black flex justify-between items-center">
                            <p className="text-[18px] font-bold text-black uppercase tracking-widest">DECLARED VALUE</p>
                            <p className="text-[32px] font-bold text-[#D4AF37] leading-none">{formatPrice(order.total_amount)}</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Timeline & Actions (col-span-5) */}
                <div className="lg:col-span-5 space-y-12">
                    {/* Action Grid */}
                    <section>
                        <p className="label-caps text-zinc-400 mb-6 tracking-[0.2em]">OPERATIONAL ACTIONS</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={() => { setNewStatus('processing'); setShowStatusModal(true); }}
                                className="prestige-btn-gold"
                            >
                                ACCEPT ORDER
                            </button>
                            <button 
                                onClick={() => { setNewStatus('ready for pickup'); setShowStatusModal(true); }}
                                className="prestige-btn-secondary border-black"
                            >
                                MARK PICKED UP
                            </button>
                            <button 
                                onClick={() => { setNewStatus('in transit'); setShowStatusModal(true); }}
                                className="prestige-btn-primary"
                            >
                                MARK IN TRANSIT
                            </button>
                            <button 
                                onClick={() => { setNewStatus('delivered'); setShowStatusModal(true); }}
                                className="prestige-btn-gold metallic-shadow"
                            >
                                MARK DELIVERED
                            </button>
                        </div>
                    </section>

                    {/* Tracking Timeline */}
                    <section className="bg-white border border-zinc-200 p-10">
                        <p className="label-caps text-zinc-400 mb-10 tracking-[0.2em]">TRACKING HISTORY</p>
                        <div className="relative pl-10 border-l-2 border-zinc-100 space-y-12">
                            {events.length > 0 ? events.map((event, index) => (
                                <div key={event.id} className="relative">
                                    <div className={`absolute -left-[51px] top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 ${
                                        index === 0 ? 'bg-black' : 'bg-zinc-200'
                                    }`}>
                                        {index === 0 && <div className="w-2 h-2 bg-[#D4AF37] rounded-full"></div>}
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <p className={`text-[14px] font-bold uppercase tracking-tight ${index === 0 ? 'text-black' : 'text-zinc-500'}`}>
                                                {event.status}
                                            </p>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                {new Date(event.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-[12px] text-zinc-400 font-bold uppercase mb-2">{event.location}</p>
                                        {event.description && (
                                            <p className="text-[13px] text-zinc-600 leading-relaxed bg-zinc-50 p-3 border-l-2 border-zinc-200">
                                                {event.description}
                                            </p>
                                        )}
                                        <p className="text-[11px] text-zinc-400 uppercase mt-2">{new Date(event.event_time).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="label-caps text-zinc-300">NO HISTORY YET</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Logistics Metrics */}
                    <div className="bg-black p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37] to-[#F5E0A3] opacity-10 -mr-16 -mt-16 rotate-45"></div>
                        <div className="relative z-10 grid grid-cols-2 gap-8">
                            <div>
                                <p className="label-caps text-[#D4AF37] mb-2">AVG. TRANSIT</p>
                                <p className="text-3xl font-black text-white leading-none">2.4h</p>
                            </div>
                            <div>
                                <p className="label-caps text-[#D4AF37] mb-2">PRECISION</p>
                                <p className="text-3xl font-black text-white leading-none">99.8%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Update Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg border-2 border-[#D4AF37] ring-2 ring-black p-10 relative">
                        <button 
                            onClick={() => setShowStatusModal(false)}
                            className="absolute top-8 right-8 text-zinc-400 hover:text-black transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-10">
                            <p className="label-caps text-zinc-400 mb-2">LOGISTICS SYNCHRONIZATION</p>
                            <h2 className="text-[24px] font-bold text-black uppercase">COMMIT STATUS CHANGE</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {statuses.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setNewStatus(s.id)}
                                        className={`flex items-center gap-4 px-6 py-4 border text-[11px] font-bold transition-all uppercase tracking-widest ${
                                            newStatus === s.id 
                                            ? 'bg-black text-[#D4AF37] border-black shadow-[4px_4px_0px_0px_#D4AF37]' 
                                            : 'bg-white text-zinc-400 border-zinc-200 hover:border-black'
                                        }`}
                                    >
                                        <s.icon size={16} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-[14px] font-bold text-black mb-2 uppercase">CURRENT LOCATION</label>
                                <input 
                                    type="text" 
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full p-4 bg-white border border-zinc-200 outline-none focus:border-black text-sm uppercase font-bold tracking-wider"
                                    placeholder="ENTER HUB OR COORDINATES"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-bold text-black mb-2 uppercase">STATUS NOTE</label>
                                <textarea 
                                    value={statusNote}
                                    onChange={(e) => setStatusNote(e.target.value)}
                                    className="w-full p-4 bg-white border border-zinc-200 outline-none focus:border-black text-sm uppercase font-bold tracking-wider min-h-[100px]"
                                    placeholder="OPTIONAL OPERATIONAL REMARKS..."
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button 
                                    onClick={() => setShowStatusModal(false)}
                                    className="flex-1 prestige-btn-secondary"
                                    disabled={updating}
                                >
                                    CANCEL
                                </button>
                                <button 
                                    onClick={handleUpdateStatus}
                                    className="flex-1 prestige-btn-gold flex items-center justify-center gap-2"
                                    disabled={updating}
                                >
                                    {updating ? <Loader2 className="animate-spin" size={18} /> : 'COMMIT CHANGE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
