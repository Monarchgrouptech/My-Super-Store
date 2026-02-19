import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, X } from 'lucide-react';

interface GlobalNotification {
    id: string;
    product_id: string | null;
    user_id: string | null;
    message: string;
    created_at: string;
}

export function GlobalNotifications() {
    const [notifications, setNotifications] = useState<GlobalNotification[]>([]);

    useEffect(() => {
        // Track when this component mounted - we only want to show events AFTER this time
        let lastChecked = new Date().toISOString();

        // Subscribing to real-time changes
        const channel = supabase
            .channel('public:global_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'global_notifications'
                },
                (payload) => {
                    console.log('Realtime notification received:', payload);
                    const newNotif = payload.new as GlobalNotification;

                    // Update lastChecked to prevent polling from re-fetching this
                    if (newNotif.created_at > lastChecked) {
                        lastChecked = newNotif.created_at;
                    }

                    setNotifications((prev) => {
                        // Avoid duplicates
                        if (prev.some(n => n.id === newNotif.id)) return prev;
                        return [newNotif, ...prev].slice(0, 3);
                    });

                    // Auto-dismiss
                    setTimeout(() => {
                        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
                    }, 8000);
                }
            )
            .subscribe();

        // Polling fallback (every 3 seconds)
        const pollInterval = setInterval(async () => {
            // Fetch notifications created AFTER the last check (or mount time)
            const { data } = await supabase
                .from('global_notifications')
                .select('*')
                .gt('created_at', lastChecked)
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                console.log('Polled new notifications:', data);

                // Update lastChecked to the most recent item's time
                lastChecked = data[data.length - 1].created_at;

                // Add each new notification
                data.forEach(newNotif => {
                    setNotifications(prev => {
                        if (prev.some(n => n.id === newNotif.id)) return prev;
                        return [newNotif, ...prev].slice(0, 3);
                    });

                    setTimeout(() => {
                        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
                    }, 8000);
                });
            }
        }, 3000);

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, []);

    const dismiss = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    console.log('GlobalNotifications rendering with:', notifications.length, 'notifications');

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" style={{ zIndex: 9999 }}>
            {notifications.map((notif, index) => (
                <div
                    key={notif.id}
                    className="pointer-events-auto bg-[#0A0A0A]/90 backdrop-blur-md border border-(--gold-primary)/30 p-4 rounded-lg shadow-2xl transform transition-all duration-500 ease-out animate-in slide-in-from-left-full"
                    style={{
                        animationDelay: `${index * 100}ms`
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-(--gold-primary)/10 rounded-full shrink-0">
                            <ShoppingBag size={18} className="text-(--gold-primary)" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-white/90 text-sm leading-relaxed font-light">
                                {/* We render the message as HTML to potentially style parts of it if the DB sends rich text, 
                    but simpler to just render text. The user's DB function sends plain text with emojis. */} 
                                {notif.message}
                            </p>
                            <span className="text-[10px] text-white/40 mt-1 block">
                                Just now
                            </span>
                        </div>

                        <button
                            onClick={() => dismiss(notif.id)}
                            className="text-white/40 hover:text-white transition-colors shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
