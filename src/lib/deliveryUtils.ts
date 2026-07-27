import { DeliveryOrder, DeliveryStage } from '../types/delivery';

export function normalizeStatus(status?: string | null): string {
    return (status || 'pending').replace(/\s+/g, '_').toLowerCase();
}

export function getFulfillment(order: DeliveryOrder) {
    return order.order_fulfillments?.[0] || null;
}

export function getStage(order: DeliveryOrder): DeliveryStage {
    const fulfillment = getFulfillment(order);
    const fulfillmentRowStatus = normalizeStatus(fulfillment?.status);
    const deliveryStatus = normalizeStatus(order.delivery_status);
    const fulfillmentStatus = normalizeStatus(order.fulfillment_status);
    
    // Priority 1: Progress made by delivery partner in order_fulfillments table or delivery_status column
    const activeStatus = (fulfillmentRowStatus && fulfillmentRowStatus !== 'pending' && fulfillmentRowStatus !== 'not_started')
        ? fulfillmentRowStatus
        : deliveryStatus;

    if (activeStatus === 'completed' || activeStatus === 'delivered') return 'delivered';
    if (activeStatus === 'out_for_delivery') return 'out_for_delivery';
    if (activeStatus === 'in_transit') return 'in_transit';
    if (activeStatus === 'shipped') return 'shipped';
    if (activeStatus === 'picked_up') return 'picked_up';
    if (activeStatus === 'ready_for_pickup') return 'ready_for_pickup';
    
    // Priority 2: Vendor readiness
    if (fulfillmentStatus === 'packed' || fulfillmentStatus === 'ready_for_pickup') return 'ready_for_pickup';
    
    // Priority 3: Order state
    if (order.status === 'paid') return 'pending'; // Paid but not yet packed by vendor
    
    return 'pending';
}

export function displayStage(stage: DeliveryStage): string {
    switch (stage) {
        case 'ready_for_pickup':
            return 'Ready for Pickup';
        case 'picked_up':
            return 'Picked Up';
        case 'shipped':
            return 'Shipped';
        case 'in_transit':
            return 'In Transit';
        case 'out_for_delivery':
            return 'Out for Delivery';
        case 'delivered':
            return 'Delivered';
        case 'pending':
            return 'Pending Vendor';
        default:
            return (stage as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
}

export function getStageDescription(stage: DeliveryStage): string {
    switch (stage) {
        case 'pending':
            return 'Vendor is preparing the package.';
        case 'ready_for_pickup':
            return 'Packed by vendor and ready for delivery partner pickup.';
        case 'picked_up':
            return 'Package collected from vendor.';
        case 'shipped':
            return 'Shipment details confirmed.';
        case 'in_transit':
            return 'Shipment is moving through the network.';
        case 'out_for_delivery':
            return 'Courier is on the final delivery run.';
        case 'delivered':
            return 'Customer handoff completed.';
        default:
            return 'Waiting for updates.';
    }
}

export function getStatusBadgeClass(stage: DeliveryStage): string {
    switch (stage) {
        case 'ready_for_pickup':
            return 'status-pickup';
        case 'picked_up':
            return 'status-processing';
        case 'shipped':
        case 'in_transit':
            return 'status-in-transit';
        case 'out_for_delivery':
            return 'status-out';
        case 'delivered':
            return 'status-delivered';
        default:
            return 'status-pending';
    }
}

export function shortOrderId(id: string): string {
    return `#${id.slice(0, 8).toUpperCase()}`;
}

export function formatTimeAgo(dateString?: string | null): string {
    if (!dateString) return 'just now';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'just now';
    
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

export function isActionAllowed(currentStage: DeliveryStage, action: string, hasPartner: boolean): boolean {
    switch (action) {
        case 'ACCEPT':
            return currentStage === 'ready_for_pickup' && !hasPartner;
        case 'PICKUP':
            return currentStage === 'ready_for_pickup' && hasPartner;
        case 'SHIP':
            return currentStage === 'picked_up';
        case 'TRANSIT':
            return currentStage === 'shipped';
        case 'OUT_FOR_DELIVERY':
            return currentStage === 'in_transit';
        case 'DELIVER':
            return currentStage === 'out_for_delivery';
        default:
            return false;
    }
}
