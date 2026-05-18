import { fetchUserOrders, UserOrderItem, UserOrderPayment, UserOrderRecord } from './userOrders';

export interface UserPaymentOrder {
    id: string;
    status: string;
    total_amount: number;
    currency: string | null;
    placed_at: string;
    fulfillment_status: string | null;
    delivery_status: string | null;
    order_items: UserOrderItem[];
}

export interface UserPaymentRecord extends UserOrderPayment {
    orders: UserPaymentOrder | null;
}

export function buildUserPaymentsFromOrders(orders: UserOrderRecord[]): UserPaymentRecord[] {
    return orders
        .flatMap((order) =>
            order.payments.map((payment) => ({
                ...payment,
                orders: {
                    id: order.id,
                    status: order.status,
                    total_amount: order.total_amount,
                    currency: order.currency,
                    placed_at: order.placed_at,
                    fulfillment_status: order.fulfillment_status,
                    delivery_status: order.delivery_status,
                    order_items: order.order_items,
                },
            }))
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchUserPayments(userId: string): Promise<UserPaymentRecord[]> {
    const orders = await fetchUserOrders(userId);
    const payments = buildUserPaymentsFromOrders(orders);

    console.debug('[userPayments] hydrated', {
        userId,
        orders: orders.length,
        payments: payments.length,
    });

    return payments;
}
