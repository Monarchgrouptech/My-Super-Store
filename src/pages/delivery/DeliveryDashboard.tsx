import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeliveryOrders } from '../../hooks/useDeliveryOrders';
import { getStage } from '../../lib/deliveryUtils';
import { DeliveryOrder } from '../../types/delivery';
import { DeliverySummaryCards } from '../../components/delivery/modular/DeliverySummaryCards';
import { DeliveryOrderList } from '../../components/delivery/modular/DeliveryOrderList';
import { DeliveryOrderDetailPanel } from '../../components/delivery/modular/DeliveryOrderDetailPanel';
import { DeliveryTrackingFeed } from '../../components/delivery/modular/DeliveryTrackingFeed';
import { ShipmentModal } from '../../components/delivery/modular/ShipmentModal';
import { Search, Filter, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';

export function DeliveryDashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const { orders, loading, updateOrderStatus, createShipment } = useDeliveryOrders();
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

    // Determine current tab from URL
    const currentTab = useMemo(() => {
        if (location.pathname.includes('/delivery/orders')) return 'active';
        if (location.pathname.includes('/delivery/history')) return 'all';
        if (location.pathname.includes('/delivery/updates')) return 'updates';
        return 'dashboard';
    }, [location.pathname]);

    // Filter orders based on tab and search
    const filteredOrders = useMemo(() => {
        let result = [...orders];

        if (searchQuery) {
            result = result.filter(o => 
                o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.user_profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.order_fulfillments?.[0]?.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (currentTab === 'dashboard') {
            // Dashboard (Operational Overview): Show orders ready to be accepted or picked up
            result = result.filter(o => {
                const stage = getStage(o);
                return stage === 'ready_for_pickup' || stage === 'packed' || stage === 'processing';
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
                await updateOrderStatus(orderId, { delivery_status: 'processing' }, {
                    status: 'accepted',
                    description: 'Delivery partner has accepted the order and is proceeding to pickup.',
                });
                break;
            case 'PICKUP':
                await updateOrderStatus(orderId, { delivery_status: 'picked_up' }, {
                    status: 'picked_up',
                    description: 'Order has been successfully picked up from the vendor.',
                });
                break;
            case 'SHIP':
                setIsShipmentModalOpen(true);
                break;
            case 'TRANSIT':
                await updateOrderStatus(orderId, { delivery_status: 'in_transit' }, {
                    status: 'in_transit',
                    description: 'Shipment is now in transit to the destination.',
                });
                break;
            case 'OUT_FOR_DELIVERY':
                await updateOrderStatus(orderId, { delivery_status: 'out_for_delivery' }, {
                    status: 'out_for_delivery',
                    description: 'Courier is out for final delivery to the customer.',
                });
                break;
            case 'DELIVER':
                await updateOrderStatus(orderId, { delivery_status: 'delivered' }, {
                    status: 'delivered',
                    description: 'Order has been successfully delivered to the customer.',
                });
                break;
        }
    };

    const handleShipmentConfirm = async (data: { carrierName: string, trackingNumber: string, trackingUrl: string }) => {
        if (selectedOrderId) {
            await createShipment(selectedOrderId, data);
        }
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden">
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

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search by ID or Tracking..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-white border-2 border-zinc-200 pl-12 pr-6 py-3 text-sm font-bold text-black focus:border-black outline-none w-full md:w-64 transition-all"
                                />
                            </div>
                            <button className="w-12 h-12 flex items-center justify-center bg-white border-2 border-zinc-200 text-zinc-500 hover:border-black hover:text-black transition-all">
                                <Filter size={20} />
                            </button>
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
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-black text-black uppercase tracking-widest">
                                        Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 border-2 border-zinc-100 p-1">
                                    <button className="p-2 bg-zinc-100 text-black shadow-sm"><LayoutGrid size={16} /></button>
                                    <button className="p-2 text-zinc-400 hover:text-black"><List size={16} /></button>
                                </div>
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
            <div className={`w-full lg:w-[450px] xl:w-[500px] shrink-0 ${selectedOrderId ? 'block' : 'hidden lg:block'}`}>
                <DeliveryOrderDetailPanel 
                    order={selectedOrder}
                    onClose={() => setSelectedOrderId(null)}
                    onAction={handleAction}
                />
            </div>

            {/* Shipment Modal */}
            <ShipmentModal 
                isOpen={isShipmentModalOpen}
                onClose={() => setIsShipmentModalOpen(false)}
                onConfirm={handleShipmentConfirm}
            />
        </div>
    );
}
