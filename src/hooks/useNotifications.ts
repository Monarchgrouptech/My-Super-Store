import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types/notifications';
import {
    drainMyNotifications,
    fetchMyNotifications,
    markNotificationsRead,
    subscribeToNotifications,
} from '../lib/notifications';

const POLL_INTERVAL_MS = 60_000; // 1 minute

interface UseNotificationsResult {
    notifications: AppNotification[];
    loading: boolean;
    unreadCount: number;
    refresh: () => Promise<void>;
    markAllRead: () => Promise<void>;
    markRead: (ids: string[]) => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const fetchedRef = useRef(false);

    const refresh = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            return;
        }

        setLoading(true);
        try {
            // 1) Ask the edge function to send this user's pending notifications
            //    (this is what flips sent_at and actually delivers the emails).
            await drainMyNotifications(false);

            // 2) Re-read what remains (sent + pending) for the in-app list.
            const rows = await fetchMyNotifications();
            setNotifications(rows);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            fetchedRef.current = false;
            return;
        }

        if (!fetchedRef.current) {
            fetchedRef.current = true;
            void refresh();
        }

        const interval = setInterval(() => {
            void refresh();
        }, POLL_INTERVAL_MS);

        const unsubscribe = subscribeToNotifications((incoming) => {
            setNotifications((prev) => {
                const seen = new Set(prev.map((n) => n.id));
                const fresh = incoming.filter((n) => !seen.has(n.id));
                return fresh.length ? [...fresh, ...prev].slice(0, 50) : prev;
            });
        });

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [user, refresh]);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.read_at).length,
        [notifications],
    );

    const markAllRead = useCallback(async () => {
        const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
        if (unreadIds.length === 0) return;
        await markNotificationsRead(unreadIds);
        setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    }, [notifications]);

    const markRead = useCallback(async (ids: string[]) => {
        await markNotificationsRead(ids);
        setNotifications((prev) =>
            prev.map((n) =>
                ids.includes(n.id) && !n.read_at
                    ? { ...n, read_at: new Date().toISOString() }
                    : n,
            ),
        );
    }, []);

    return { notifications, loading, unreadCount, refresh, markAllRead, markRead };
}
