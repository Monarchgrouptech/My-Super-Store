import { supabase } from './supabase';

const REVENUE_ORDER_STATUSES = new Set(['paid', 'completed']);
const PENDING_ORDER_STATUS = 'pending';

interface ProductStatRow {
    id: string;
    published: boolean | null;
    view_count: number | null;
}

interface VendorOrderItemRow {
    order_id: string | null;
    quantity: number | null;
    unit_price: number | string | null;
}

interface VendorOrderRow {
    id: string;
    status: string | null;
}

export interface VendorAnalyticsSummary {
    totalProducts: number;
    publishedProducts: number;
    pendingOrders: number;
    totalRevenue: number;
    totalUnitsSold: number;
    totalViews: number;
    revenueCurrency: string;
}

export async function fetchVendorAnalytics(vendorId: string): Promise<VendorAnalyticsSummary> {
    const [
        { data: productRows, error: productsError },
        { data: orderItemRows, error: orderItemsError },
    ] = await Promise.all([
        supabase
            .from('products')
            .select('id, published, view_count')
            .eq('seller_id', vendorId),
        supabase
            .from('order_items')
            .select('order_id, quantity, unit_price')
            .eq('vendor_id', vendorId),
    ]);

    if (productsError) {
        throw productsError;
    }

    if (orderItemsError) {
        throw orderItemsError;
    }

    const products = (productRows ?? []) as ProductStatRow[];
    const orderItems = (orderItemRows ?? []) as VendorOrderItemRow[];
    const orderIds = Array.from(new Set(
        orderItems
            .map((item) => item.order_id)
            .filter((orderId): orderId is string => Boolean(orderId))
    ));

    let ordersById = new Map<string, VendorOrderRow>();

    if (orderIds.length > 0) {
        const { data: orderRows, error: ordersError } = await supabase
            .from('orders')
            .select('id, status')
            .in('id', orderIds);

        if (ordersError) {
            throw ordersError;
        }

        ordersById = new Map(
            ((orderRows ?? []) as VendorOrderRow[]).map((order) => [order.id, order])
        );
    }

    const pendingOrderIds = new Set<string>();
    let totalRevenue = 0;
    let totalUnitsSold = 0;

    for (const item of orderItems) {
        if (!item.order_id) {
            continue;
        }

        const orderStatus = (ordersById.get(item.order_id)?.status ?? '').toLowerCase();
        const quantity = Number(item.quantity ?? 0);
        const unitPrice = Number(item.unit_price ?? 0);

        if (orderStatus === PENDING_ORDER_STATUS) {
            pendingOrderIds.add(item.order_id);
        }

        if (REVENUE_ORDER_STATUSES.has(orderStatus)) {
            totalUnitsSold += quantity;
            totalRevenue += unitPrice * quantity;
        }
    }

    console.debug('[vendorAnalytics] hydrated', {
        vendorId,
        products: products.length,
        orderItems: orderItems.length,
        linkedOrders: orderIds.length,
        totalRevenue,
        totalUnitsSold,
    });

    return {
        totalProducts: products.length,
        publishedProducts: products.filter((product) => Boolean(product.published)).length,
        pendingOrders: pendingOrderIds.size,
        totalRevenue,
        totalUnitsSold,
        totalViews: products.reduce((sum, product) => sum + Number(product.view_count ?? 0), 0),
        revenueCurrency: 'USD',
    };
}
