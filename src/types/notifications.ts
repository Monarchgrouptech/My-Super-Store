export type NotificationEventType =
    | 'vendor_order_paid'
    | 'order_ready_for_delivery'
    | 'order_paid'
    | 'order_status_updated';

export interface AppNotification {
    id: string;
    event_type: NotificationEventType;
    order_id: string | null;
    vendor_id: string | null;
    delivery_partner_id: string | null;
    recipient_email: string | null;
    recipient_phone: string | null;
    payload: Record<string, unknown> | null;
    sent_at: string | null;
    read_at: string | null;
    created_at: string;
}

export interface DrainNotificationsResult {
    ok: boolean;
    dryRun?: boolean;
    sent?: number;
    failed?: number;
    failures?: string[];
    error?: string;
    message?: string;
}
