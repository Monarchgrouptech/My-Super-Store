import { supabase } from './supabase';

const SUCCESS_PAYMENT_STATUSES = new Set(['succeeded', 'success', 'paid', 'completed']);

interface OrderRow {
    id: string;
    user_id: string | null;
    status: string;
    total_amount: number | string;
    currency: string | null;
    shipping_address_id: string | null;
    billing_address_id: string | null;
    placed_at: string;
    updated_at: string;
    fulfillment_status: string | null;
    delivery_status: string | null;
}

interface OrderItemRow {
    id: string;
    order_id: string;
    product_id: string;
    vendor_id: string | null;
    quantity: number | null;
    unit_price: number | string | null;
    created_at: string;
}

interface ProductRow {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    price: number | string;
    seller_id: string | null;
    product_images?: Array<{
        url: string;
        position?: number | null;
    }> | null;
}

interface PaymentRow {
    id: string;
    order_id: string;
    provider: string | null;
    provider_payment_id: string | null;
    amount: number | string | null;
    currency: string | null;
    status: string | null;
    created_at: string;
}

export interface UserOrderProductImage {
    url: string;
    position?: number | null;
}

export interface UserOrderProduct {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    price: number;
    seller_id: string | null;
    product_images: UserOrderProductImage[];
}

export interface UserOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    vendor_id: string | null;
    quantity: number;
    unit_price: number;
    created_at: string;
    products: UserOrderProduct | null;
}

export interface UserOrderPayment {
    id: string;
    order_id: string;
    provider: string | null;
    provider_payment_id: string | null;
    amount: number;
    currency: string | null;
    status: string | null;
    created_at: string;
}

export interface UserOrderRecord {
    id: string;
    user_id: string | null;
    status: string;
    total_amount: number;
    currency: string | null;
    shipping_address_id: string | null;
    billing_address_id: string | null;
    placed_at: string;
    updated_at: string;
    fulfillment_status: string | null;
    delivery_status: string | null;
    order_items: UserOrderItem[];
    payments: UserOrderPayment[];
    primary_payment: UserOrderPayment | null;
}

export function isSuccessfulPaymentStatus(status: string | null | undefined): boolean {
    return SUCCESS_PAYMENT_STATUSES.has((status ?? '').toLowerCase());
}

function normalizePayment(payment: PaymentRow): UserOrderPayment {
    return {
        id: payment.id,
        order_id: payment.order_id,
        provider: payment.provider,
        provider_payment_id: payment.provider_payment_id,
        amount: Number(payment.amount ?? 0),
        currency: payment.currency,
        status: payment.status,
        created_at: payment.created_at,
    };
}

function pickPrimaryPayment(payments: UserOrderPayment[]): UserOrderPayment | null {
    if (payments.length === 0) {
        return null;
    }

    const sortedPayments = [...payments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const successfulPayment = sortedPayments.find((payment) =>
        SUCCESS_PAYMENT_STATUSES.has((payment.status ?? '').toLowerCase())
    );

    return successfulPayment ?? sortedPayments[0];
}

export async function fetchUserOrders(userId: string): Promise<UserOrderRecord[]> {
    const { data: orderRows, error: ordersError } = await supabase
        .from('orders')
        .select(`
            id,
            user_id,
            status,
            total_amount,
            currency,
            shipping_address_id,
            billing_address_id,
            placed_at,
            updated_at,
            fulfillment_status,
            delivery_status
        `)
        .eq('user_id', userId)
        .order('placed_at', { ascending: false });

    if (ordersError) {
        throw ordersError;
    }

    const orders = (orderRows ?? []) as OrderRow[];
    if (orders.length === 0) {
        return [];
    }

    const orderIds = orders.map((order) => order.id);

    const [
        { data: orderItemRows, error: orderItemsError },
        { data: paymentRows, error: paymentsError },
    ] = await Promise.all([
        supabase
            .from('order_items')
            .select('id, order_id, product_id, vendor_id, quantity, unit_price, created_at')
            .in('order_id', orderIds),
        supabase
            .from('payments')
            .select('id, order_id, provider, provider_payment_id, amount, currency, status, created_at')
            .in('order_id', orderIds)
            .order('created_at', { ascending: false }),
    ]);

    if (orderItemsError) {
        throw orderItemsError;
    }

    if (paymentsError) {
        throw paymentsError;
    }

    const orderItems = (orderItemRows ?? []) as OrderItemRow[];
    const productIds = Array.from(new Set(orderItems.map((item) => item.product_id).filter(Boolean)));

    let productsById = new Map<string, UserOrderProduct>();

    if (productIds.length > 0) {
        const { data: productRows, error: productsError } = await supabase
            .from('products')
            .select('id, name, slug, sku, price, seller_id, product_images(url, position)')
            .in('id', productIds);

        if (productsError) {
            throw productsError;
        }

        productsById = new Map(
            ((productRows ?? []) as ProductRow[]).map((product) => [
                product.id,
                {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    sku: product.sku,
                    price: Number(product.price ?? 0),
                    seller_id: product.seller_id,
                    product_images: product.product_images ?? [],
                },
            ])
        );
    }

    const itemsByOrderId = new Map<string, UserOrderItem[]>();
    for (const item of orderItems) {
        const normalizedItem: UserOrderItem = {
            id: item.id,
            order_id: item.order_id,
            product_id: item.product_id,
            vendor_id: item.vendor_id,
            quantity: Number(item.quantity ?? 0),
            unit_price: Number(item.unit_price ?? 0),
            created_at: item.created_at,
            products: productsById.get(item.product_id) ?? null,
        };

        const currentItems = itemsByOrderId.get(item.order_id) ?? [];
        currentItems.push(normalizedItem);
        itemsByOrderId.set(item.order_id, currentItems);
    }

    const paymentsByOrderId = new Map<string, UserOrderPayment[]>();
    for (const payment of (paymentRows ?? []) as PaymentRow[]) {
        const normalizedPayment = normalizePayment(payment);
        const currentPayments = paymentsByOrderId.get(payment.order_id) ?? [];
        currentPayments.push(normalizedPayment);
        paymentsByOrderId.set(payment.order_id, currentPayments);
    }

    const hydratedOrders = orders.map((order) => {
        const normalizedPayments = paymentsByOrderId.get(order.id) ?? [];

        return {
            id: order.id,
            user_id: order.user_id,
            status: order.status,
            total_amount: Number(order.total_amount ?? 0),
            currency: order.currency,
            shipping_address_id: order.shipping_address_id,
            billing_address_id: order.billing_address_id,
            placed_at: order.placed_at,
            updated_at: order.updated_at,
            fulfillment_status: order.fulfillment_status,
            delivery_status: order.delivery_status,
            order_items: itemsByOrderId.get(order.id) ?? [],
            payments: normalizedPayments,
            primary_payment: pickPrimaryPayment(normalizedPayments),
        };
    });

    console.debug('[userOrders] hydrated', {
        userId,
        orders: hydratedOrders.length,
        items: orderItems.length,
        payments: (paymentRows ?? []).length,
    });

    return hydratedOrders;
}
