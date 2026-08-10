import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Package, Truck, CreditCard, RefreshCw } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { AppNotification } from '../types/notifications';
import {
    formatNotificationTime,
    notificationEventTypeLabel,
    notificationMessage,
    notificationTitle,
} from '../lib/notifications';

interface NotificationBellProps {
    /** Build a navigation target for a notification. Defaults to order tracking. */
    getLink?: (notification: AppNotification) => string;
    /** Bell size in px. */
    size?: number;
    /** Tooltip / aria label prefix. */
    label?: string;
}

function NotificationIcon({ eventType }: { eventType: AppNotification['event_type'] }) {
    const cls = 'text-[#d4af37]';
    switch (eventType) {
        case 'vendor_order_paid':
        case 'order_ready_for_delivery':
            return <Truck size={16} className={cls} />;
        case 'order_paid':
            return <CreditCard size={16} className={cls} />;
        default:
            return <Package size={16} className={cls} />;
    }
}

export function NotificationBell({ getLink, size = 20, label = 'Notifications' }: NotificationBellProps) {
    const { notifications, unreadCount, refresh, markAllRead, markRead, loading } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [isOpen]);

    // Mark all read when the panel opens
    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            const timer = setTimeout(() => {
                void markAllRead();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, unreadCount, markAllRead]);

    const handleOpen = () => {
        setIsOpen((open) => !open);
    };

    const handleItemClick = (notification: AppNotification) => {
        if (!notification.read_at) {
            void markRead([notification.id]);
        }
        setIsOpen(false);

        const link = getLink ? getLink(notification) : notification.order_id ? `/track/${notification.order_id}` : '';
        if (link) {
            navigate(link);
        }
    };

    const handleRefresh = () => {
        void refresh();
    };

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                onClick={handleOpen}
                aria-label={label}
                className="mini-btn relative flex items-center justify-center rounded-full p-0 transition-opacity hover:opacity-70"
                style={{ width: 40, height: 40 }}
            >
                <Bell size={size} strokeWidth={2} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-[90] mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f3e4b2]">
                            Notifications
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={loading}
                                aria-label="Refresh notifications"
                                className="mini-btn flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:text-white disabled:opacity-40"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={() => void markAllRead()}
                                aria-label="Mark all as read"
                                disabled={unreadCount === 0}
                                className="mini-btn flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:text-white disabled:opacity-30"
                            >
                                <CheckCheck size={16} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[380px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <Bell size={28} className="mx-auto mb-3 text-white/20" />
                                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
                                    No notifications yet
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const unread = !notification.read_at;
                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() => handleItemClick(notification)}
                                        className={`block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 ${
                                            unread ? 'bg-white/[0.03]' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10">
                                                <NotificationIcon eventType={notification.event_type} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-[13px] font-bold text-white">
                                                        {notificationTitle(notification)}
                                                    </span>
                                                    <span className="shrink-0 text-[10px] font-medium text-white/30">
                                                        {formatNotificationTime(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">
                                                    {notificationMessage(notification)}
                                                </p>
                                                <span className="mt-1.5 inline-block rounded-full border border-[#d4af37]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#d8c17a]">
                                                    {notificationEventTypeLabel(notification.event_type)}
                                                </span>
                                                {unread && (
                                                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#d4af37] align-middle" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
