import { supabase } from './supabase';
import { AppNotification, DrainNotificationsResult, NotificationEventType } from '../types/notifications';

const MAX_NOTIFICATIONS = 50;

/**
 * Fetch the current user's notifications (scoped by RLS policies on
 * notification_outbox for customers / vendors / delivery partners).
 */
export async function fetchMyNotifications(): Promise<AppNotification[]> {
    const { data, error } = await supabase
        .from('notification_outbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

    if (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
    }

    return (data ?? []) as AppNotification[];
}

/**
 * Ask the notifications-drain edge function to send this user's pending
 * notifications (Brevo email) and mark them sent. Safe to call repeatedly;
 * the function skips rows already marked sent.
 */
export async function drainMyNotifications(dryRun = false): Promise<DrainNotificationsResult> {
    try {
        const { data, error } = await supabase.functions.invoke('notifications-drain', {
            body: { dryRun },
        });
        if (error) {
            console.error('notifications-drain invoke error:', error);
            return { ok: false, error: error.message || 'Drain request failed' };
        }
        return (data ?? { ok: false, error: 'Empty response' }) as DrainNotificationsResult;
    } catch (err) {
        console.error('notifications-drain failed:', err);
        return { ok: false, error: err instanceof Error ? err.message : 'Drain request failed' };
    }
}

/** Mark a set of notifications as read in-app. */
export async function markNotificationsRead(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;

    const { error } = await supabase
        .from('notification_outbox')
        .update({ read_at: new Date().toISOString() })
        .in('id', uniqueIds);

    if (error) {
        console.error('Failed to mark notifications read:', error);
    }
}

/**
 * Subscribe to new notification rows. Realtime may not be enabled on the
 * table, so callers should also poll via fetchMyNotifications.
 */
export function subscribeToNotifications(onNew: (notifications: AppNotification[]) => void) {
    const channel = supabase
        .channel('notifications-realtime')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notification_outbox' },
            (payload) => {
                const record = payload.new as AppNotification;
                if (record && record.id) {
                    onNew([record]);
                }
            },
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function notificationTitle(notification: AppNotification): string {
    const orderId = notification.order_id ? `#${notification.order_id.slice(0, 8).toUpperCase()}` : '';
    switch (notification.event_type) {
        case 'vendor_order_paid':
            return `New paid order ${orderId}`;
        case 'order_ready_for_delivery':
            return `Order ${orderId} ready for pickup`;
        case 'order_paid':
            return `Payment confirmed${orderId ? ` for ${orderId}` : ''}`;
        case 'order_status_updated':
        default:
            return `Order ${orderId || ''} updated`.trim();
    }
}

export function notificationMessage(notification: AppNotification): string {
    const payload = notification.payload ?? {};
    const newStatus = typeof payload.new_status === 'string' ? payload.new_status : null;
    const oldStatus = typeof payload.old_status === 'string' ? payload.old_status : null;

    switch (notification.event_type) {
        case 'vendor_order_paid': {
            const business = typeof payload.business_name === 'string' ? payload.business_name : '';
            return business
                ? `${business}: a customer just paid. Mark the order ready for pickup.`
                : 'A customer just paid. Mark the order ready for pickup.';
        }
        case 'order_ready_for_delivery':
            return 'Packed by the vendor and ready for pickup — accept it to begin delivery.';
        case 'order_paid':
            return 'Your payment was successful and your order is confirmed.';
        case 'order_status_updated':
        default: {
            const from = oldStatus ? ` (from ${oldStatus.replace(/_/g, ' ')})` : '';
            return `Status changed to ${newStatus ? newStatus.replace(/_/g, ' ') : 'updated'}${from}.`;
        }
    }
}

export function notificationEventTypeLabel(eventType: NotificationEventType): string {
    switch (eventType) {
        case 'vendor_order_paid':
            return 'New Order';
        case 'order_ready_for_delivery':
            return 'Ready for Pickup';
        case 'order_paid':
            return 'Payment';
        case 'order_status_updated':
            return 'Status Update';
        default:
            return 'Update';
    }
}

export function formatNotificationTime(createdAt: string): string {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}
