import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useDeliveryOrders } from '../../hooks/useDeliveryOrders';
import { DeliveryOrderDetailPanel } from '../../components/delivery/modular/DeliveryOrderDetailPanel';
import { ShipmentModal } from '../../components/delivery/modular/ShipmentModal';

export function DeliveryOrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { orders, loading, updateOrderStatus, createShipment } = useDeliveryOrders();
    const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

    const order = orders.find(o => o.id === id) || null;

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
        if (id) {
            await createShipment(id, data);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
                <Loader2 className="animate-spin text-zinc-300" size={40} />
                <p className="label-caps text-zinc-400">Loading Order Details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-6 p-8">
                <div className="text-center">
                    <h2 className="text-[24px] font-black text-black uppercase tracking-tight mb-2">Order Not Found</h2>
                    <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest">
                        The order you are looking for does not exist or has been removed
                    </p>
                </div>
                <button 
                    onClick={() => navigate('/delivery/dashboard')}
                    className="prestige-btn-primary flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] overflow-hidden">
            <DeliveryOrderDetailPanel 
                order={order}
                onClose={() => navigate(-1)}
                onAction={handleAction}
            />

            <ShipmentModal 
                isOpen={isShipmentModalOpen}
                onClose={() => setIsShipmentModalOpen(false)}
                onConfirm={handleShipmentConfirm}
            />
        </div>
    );
}
