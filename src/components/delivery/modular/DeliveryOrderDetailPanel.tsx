import { useState } from 'react';
import { 
    X, 
    User, 
    MapPin, 
    Package, 
    Clock, 
    ChevronRight,
    Info
} from 'lucide-react';
import { DeliveryOrder } from '../../../types/delivery';
import { 
    getStage, 
    displayStage, 
    getStatusBadgeClass, 
    getStageDescription,
    shortOrderId,
    formatTimeAgo
} from '../../../lib/deliveryUtils';

interface DeliveryOrderDetailPanelProps {
    order: DeliveryOrder | null;
    onClose: () => void;
    onAction: (orderId: string, action: string) => void;
}

export function DeliveryOrderDetailPanel({ 
    order, 
    onClose, 
    onAction 
}: DeliveryOrderDetailPanelProps) {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    if (!order) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-50 border-l border-zinc-200">
                <div className="w-20 h-20 bg-white border border-zinc-200 flex items-center justify-center mb-6 shadow-sm">
                    <Info size={32} className="text-zinc-300" />
                </div>
                <h3 className="text-[16px] font-black text-black uppercase tracking-tight mb-2">No Order Selected</h3>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed max-w-[240px]">
                    Select an order from the list to view full details and perform actions
                </p>
            </div>
        );
    }

    const stage = getStage(order);
    const badgeClass = getStatusBadgeClass(stage);
    const address = order.addresses;
    const profile = order.user_profiles;
    const items = order.order_items || [];
    const events = order.order_tracking_events || [];

    const renderActionButtons = () => {
        return (
            <div className="grid grid-cols-1 gap-3 p-6 bg-white border-t border-zinc-200">
                <p className="label-caps text-zinc-400 mb-1">Available Actions</p>
                
                {stage === 'ready_for_pickup' && (
                    <button 
                        onClick={() => onAction(order.id, 'ACCEPT')}
                        className="prestige-btn-primary w-full flex items-center justify-center gap-2"
                    >
                        Accept Order <ChevronRight size={16} />
                    </button>
                )}

                {stage === 'processing' && (
                    <button 
                        onClick={() => onAction(order.id, 'PICKUP')}
                        className="prestige-btn-primary w-full flex items-center justify-center gap-2"
                    >
                        Mark Picked Up <ChevronRight size={16} />
                    </button>
                )}

                {stage === 'picked_up' && (
                    <button 
                        onClick={() => onAction(order.id, 'SHIP')}
                        className="prestige-btn-primary w-full flex items-center justify-center gap-2"
                    >
                        Confirm Shipment <ChevronRight size={16} />
                    </button>
                )}

                {stage === 'shipped' && (
                    <button 
                        onClick={() => onAction(order.id, 'TRANSIT')}
                        className="prestige-btn-primary w-full flex items-center justify-center gap-2"
                    >
                        Mark In Transit <ChevronRight size={16} />
                    </button>
                )}

                {stage === 'in_transit' && (
                    <button 
                        onClick={() => onAction(order.id, 'OUT_FOR_DELIVERY')}
                        className="prestige-btn-primary w-full flex items-center justify-center gap-2"
                    >
                        Out for Delivery <ChevronRight size={16} />
                    </button>
                )}

                {stage === 'out_for_delivery' && (
                    <button 
                        onClick={() => onAction(order.id, 'DELIVER')}
                        className="prestige-btn-gold w-full flex items-center justify-center gap-2"
                    >
                        Mark Delivered <CheckCircle size={16} />
                    </button>
                )}

                {stage === 'delivered' && (
                    <div className="p-4 bg-zinc-50 border border-zinc-200 text-center">
                        <p className="text-[11px] font-black text-black uppercase tracking-widest">
                            Delivery Completed
                        </p>
                    </div>
                )}

                {stage === 'pending' && (
                    <div className="p-4 bg-zinc-50 border border-zinc-200 text-center">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                            Waiting for Vendor
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white border-l border-zinc-200 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-[18px] font-black text-black tracking-tight uppercase">
                            {shortOrderId(order.id)}
                        </h2>
                        <span className={`status-badge ${badgeClass}`}>
                            {displayStage(stage)}
                        </span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                        Placed on {new Date(order.placed_at).toLocaleDateString()} at {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <button 
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all hover:bg-[radial-gradient(circle_at_30%_30%,#fff6d5_0%,#e2c56d_20%,#c59a24_48%,#090909_100%)] hover:text-black"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Status Alert */}
                <div className="p-6 bg-zinc-50 border-b border-zinc-200">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-sm">
                            <Clock size={18} className="text-black" />
                        </div>
                        <div>
                            <p className="text-[12px] font-black text-black uppercase tracking-tight mb-1">Current Status</p>
                            <p className="text-[13px] text-zinc-600 leading-relaxed font-medium italic">
                                "{getStageDescription(stage)}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Customer & Shipping */}
                <section className="p-6 border-b border-zinc-200 space-y-6">
                    <div>
                        <p className="label-caps text-zinc-400 mb-4">Customer Details</p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <User size={16} className="text-zinc-400 mt-1" />
                                <div>
                                    <p className="text-[13px] font-black text-black">{profile?.display_name || 'N/A'}</p>
                                    <p className="text-[12px] text-zinc-500 font-medium">{profile?.email || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="label-caps text-zinc-400 mb-4">Shipping Address</p>
                        <div className="flex items-start gap-4">
                            <MapPin size={16} className="text-zinc-400 mt-1" />
                            <div className="text-[13px] font-bold text-zinc-700 leading-relaxed uppercase tracking-tight">
                                <p>{address?.line1}</p>
                                {address?.line2 && <p>{address.line2}</p>}
                                <p>{address?.city}, {address?.state} {address?.postal_code}</p>
                                <p>{address?.country}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Order Items */}
                <section className="p-6 border-b border-zinc-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="label-caps text-zinc-400">Order Items</p>
                        <span className="text-[11px] font-black text-black uppercase bg-zinc-100 px-2 py-0.5">
                            {items.length} {items.length === 1 ? 'Unit' : 'Units'}
                        </span>
                    </div>
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-4 group">
                                <div 
                                    onClick={() => item.products?.product_images?.[0]?.url && setExpandedImage(item.products.product_images[0].url)}
                                    className="w-14 h-14 bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 overflow-hidden cursor-zoom-in group-hover:border-[var(--delivery-gold-primary)] transition-colors"
                                >
                                    {item.products?.product_images?.[0]?.url ? (
                                        <img 
                                            src={item.products.product_images[0].url} 
                                            alt={item.products.name || 'Product'} 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package size={20} className="text-zinc-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <p className="text-[12px] font-black text-black truncate uppercase tracking-tight">
                                        {item.products?.name || 'Unknown Product'}
                                    </p>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                        Qty: {item.quantity} × USD {item.unit_price.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Financial Summary */}
                <section className="p-6 bg-zinc-50 border-b border-zinc-200">
                    <p className="label-caps text-zinc-400 mb-4">Payment Summary</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[12px] font-bold text-zinc-500 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span>USD {order.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[12px] font-bold text-zinc-500 uppercase tracking-widest">
                            <span>Shipping</span>
                            <span className="text-zinc-400 italic">Included</span>
                        </div>
                        <div className="flex justify-between pt-2 mt-2 border-t border-zinc-200">
                            <span className="text-[13px] font-black text-black uppercase tracking-tight">Total Amount</span>
                            <span className="text-[13px] font-black text-black">
                                USD {order.total_amount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Timeline Preview */}
                <section className="p-6">
                    <p className="label-caps text-zinc-400 mb-6">Tracking Timeline</p>
                    <div className="space-y-6 relative">
                        <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-zinc-200"></div>
                        {events.length > 0 ? (
                            events.map((event, idx) => (
                                <div key={event.id} className="flex gap-4 relative z-10">
                                    <div className={`w-[15px] h-[15px] rounded-full border-2 border-white shrink-0 mt-1 shadow-sm ${
                                        idx === 0 ? 'bg-[var(--delivery-gold-primary)] ring-2 ring-[var(--delivery-gold-light)]/20' : 'bg-zinc-300'
                                    }`}></div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black text-black uppercase tracking-tight leading-none mb-1">
                                            {event.status.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                            {event.description}
                                        </p>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                            <Clock size={10} /> {formatTimeAgo(event.event_time)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center py-4 text-center">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No tracking events recorded</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Action Section */}
            {renderActionButtons()}

            {/* Image Expansion Overlay */}
            {expandedImage && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/95 backdrop-blur-md cursor-zoom-out"
                    onClick={() => setExpandedImage(null)}
                >
                    <button 
                        className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
                        onClick={() => setExpandedImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img 
                        src={expandedImage} 
                        alt="Product Expansion" 
                        className="max-w-full max-h-full object-contain shadow-2xl border-2 border-[var(--delivery-gold-primary)]"
                    />
                </div>
            )}
        </div>
    );
}

function CheckCircle({ size, className }: { size: number, className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
