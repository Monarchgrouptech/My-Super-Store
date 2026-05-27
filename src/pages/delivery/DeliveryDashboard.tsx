import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDeliveryOrders } from '../../hooks/useDeliveryOrders';
import { getStage } from '../../lib/deliveryUtils';
import { DeliverySummaryCards } from '../../components/delivery/modular/DeliverySummaryCards';
import { DeliveryOrderList } from '../../components/delivery/modular/DeliveryOrderList';
import { DeliveryOrderDetailPanel } from '../../components/delivery/modular/DeliveryOrderDetailPanel';
import { DeliveryTrackingFeed } from '../../components/delivery/modular/DeliveryTrackingFeed';
import { ShipmentModal } from '../../components/delivery/modular/ShipmentModal';
import { Search, Filter } from 'lucide-react';

export function DeliveryDashboard() {
    const location = useLocation();
    const { orders, loading, updateOrderStatus, createShipment, refetch } = useDeliveryOrders();
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        refetch(searchQuery);
    };

    // Determine current tab from URL
    const currentTab = useMemo(() => {
        if (location.pathname.includes('/delivery/orders')) return 'active';
        if (location.pathname.includes('/delivery/history')) return 'all';
        if (location.pathname.includes('/delivery/updates')) return 'updates';
        return 'dashboard';
    }, [location.pathname]);

    // Close detail panel whenever the user switches tabs
    useEffect(() => {
        setSelectedOrderId(null);
    }, [currentTab]);

    // Filter orders based on tab
    const filteredOrders = useMemo(() => {
        let result = [...orders];

        // Search is now handled server-side in the hook, but we can still do a local pass for display consistency
        if (searchQuery) {
            result = result.filter(o => 
                o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.user_profiles && o.user_profiles.display_name && o.user_profiles.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (o.user_profiles && o.user_profiles.email && o.user_profiles.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (o.order_fulfillments && o.order_fulfillments[0] && o.order_fulfillments[0].tracking_number && o.order_fulfillments[0].tracking_number.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        if (currentTab === 'dashboard') {
            // Dashboard (Operational Overview): Show orders ready to be accepted or picked up
            result = result.filter(o => {
                const stage = getStage(o);
                return stage === 'ready_for_pickup';
            });
        } else if (currentTab === 'active') {
            // Active Shipments: Orders currently being handled (picked up, shipped, in transit, out for delivery)
            result = result.filter(o => {
                const stage = getStage(o);
                return stage === 'picked_up' || stage === 'shipped' || stage === 'in_transit' || stage === 'out_for_delivery';
            });
        } else if (currentTab === 'all') {
            // All Orders: Everything paid (full list from hook)
        } else if (currentTab === 'updates') {
            // Tracking Updates: Filter orders with actual events
            result = result.filter(o => (o.order_tracking_events?.length || 0) > 0);
        }

        return result;
    }, [orders, currentTab, searchQuery]);

    const selectedOrder = useMemo(() => 
        orders.find(o => o.id === selectedOrderId) || null
    , [orders, selectedOrderId]);

    // Summary counts for dashboard
    const stats = useMemo(() => {
        return {
            totalShipments: orders.filter(o => {
                const stage = getStage(o);
                return stage !== 'pending' && stage !== 'delivered' && stage !== 'ready_for_pickup';
            }).length,
            pickupReady: orders.filter(o => getStage(o) === 'ready_for_pickup').length,
            inMotion: orders.filter(o => {
                const stage = getStage(o);
                return stage === 'in_transit' || stage === 'out_for_delivery';
            }).length,
            deliveredToday: orders.filter(o => {
                const stage = getStage(o);
                if (stage !== 'delivered') return false;
                const deliveredAt = o.order_fulfillments?.[0]?.delivered_at;
                if (!deliveredAt) return false;
                return new Date(deliveredAt).toDateString() === new Date().toDateString();
            }).length
        };
    }, [orders]);

    const handleAction = async (orderId: string, action: string) => {
        switch (action) {
            case 'ACCEPT':
                await updateOrderStatus(orderId, 'accept_order');
                break;
            case 'PICKUP':
                await updateOrderStatus(orderId, 'mark_picked_up');
                break;
            case 'SHIP':
                setIsShipmentModalOpen(true);
                break;
            case 'TRANSIT':
                await updateOrderStatus(orderId, 'mark_in_transit');
                break;
            case 'OUT_FOR_DELIVERY':
                await updateOrderStatus(orderId, 'out_for_delivery');
                break;
            case 'DELIVER':
                await updateOrderStatus(orderId, 'mark_delivered');
                break;
        }
    };

    const handleShipmentConfirm = async (data: { carrierName: string, trackingNumber: string, trackingUrl: string }) => {
        if (selectedOrderId) {
            await createShipment(selectedOrderId, data);
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 ${selectedOrderId ? 'hidden lg:flex' : 'flex'}`}>
                {/* Dashboard Toolbar */}
                <div className="p-8 pb-4 bg-zinc-50 border-b border-zinc-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h2 className="text-[28px] font-black text-black tracking-tight uppercase leading-tight">
                                {currentTab === 'dashboard' ? 'Operations Overview' : 
                                 currentTab === 'active' ? 'Active Shipments' : 
                                 currentTab === 'updates' ? 'Tracking Logs' : 'Order History'}
                            </h2>
                            <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">
                                {currentTab === 'dashboard' ? 'Real-time logistics performance' : 
                                 currentTab === 'active' ? 'Manage your ongoing deliveries' : 
                                 currentTab === 'updates' ? 'Live event stream' : 'Full system record'}
                            </p>
                        </div>
                    </div>

                    {currentTab === 'dashboard' && (
                        <div className="mb-8">
                            <DeliverySummaryCards {...stats} />
                        </div>
                    )}
                </div>

                {/* Tab Specific Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {currentTab === 'updates' ? (
                        <DeliveryTrackingFeed orders={orders} />
                    ) : (
                        <div className="max-w-5xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-4 md:p-6 border-2 border-zinc-100 shadow-xl rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-8 bg-[var(--delivery-gold-primary)] rounded-full"></div>
                                    <span className="text-[14px] font-black text-black uppercase tracking-widest">
                                        {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
                                    </span>
                                </div>
                                
                                <form onSubmit={handleSearch} className="flex flex-row items-center gap-2 flex-1 md:max-w-md w-full">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[var(--delivery-gold-primary)] transition-colors" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="ID or Email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-zinc-50 border-2 border-zinc-100 pl-10 pr-3 py-2.5 text-[13px] font-bold text-black focus:border-[var(--delivery-gold-primary)] focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="prestige-btn-gold !min-height-0 !py-2.5 !px-4 text-[11px] shrink-0"
                                    >
                                        Search
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setSearchQuery(''); refetch(); }}
                                        className="w-10 h-10 shrink-0 flex items-center justify-center bg-zinc-50 border-2 border-zinc-100 text-zinc-400 hover:border-black hover:text-black transition-all rounded-lg"
                                    >
                                        <Filter size={18} />
                                    </button>
                                </form>
                            </div>
                            
                            <DeliveryOrderList 
                                orders={filteredOrders}
                                loading={loading}
                                selectedOrderId={selectedOrderId || undefined}
                                onOrderSelect={(order) => setSelectedOrderId(order.id)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Panel */}
            {currentTab !== 'updates' && selectedOrderId && (
                <>
                    {/* Mobile: full-screen fixed overlay so it never bleeds under list content */}
                    <div className="fixed inset-0 z-50 flex lg:hidden">
                        {/* backdrop */}
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setSelectedOrderId(null)}
                        />
                        <div className="relative ml-auto w-full max-w-[480px] h-full bg-white shadow-2xl overflow-hidden">
                            <DeliveryOrderDetailPanel
                                order={selectedOrder}
                                onClose={() => setSelectedOrderId(null)}
                                onAction={handleAction}
                            />
                        </div>
                    </div>
                    {/* Desktop: side panel (no overlay needed, layout is flex row) */}
                    <div className="hidden lg:block w-[450px] xl:w-[500px] shrink-0 border-l border-zinc-200 bg-white">
                        <DeliveryOrderDetailPanel
                            order={selectedOrder}
                            onClose={() => setSelectedOrderId(null)}
                            onAction={handleAction}
                        />
                    </div>
                </>
            )}

            {/* Shipment Modal */}
            <ShipmentModal 
                isOpen={isShipmentModalOpen}
                onClose={() => setIsShipmentModalOpen(false)}
                onConfirm={handleShipmentConfirm}
            />
        </div>
    );
}
