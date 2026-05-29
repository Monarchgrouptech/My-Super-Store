import { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';

// ============================================================================
// 1. Memory Cache for Avatar URLs (Shared across all component instances)
// ============================================================================
// Set to store successful avatar URLs so they bypass the queue and load immediately
const successCache = new Set<string>();
// Set to store failed avatar URLs to completely block future network requests to them (prevents ORB/429)
const failureCache = new Set<string>();

// ============================================================================
// 2. Throttled Image Queue Manager (Coordinates concurrent loads)
// ============================================================================
class ImageQueueManager {
    private maxConcurrent = 4; // Limits concurrent network requests to 4 at a time
    private activeCount = 0;
    private queue: (() => void)[] = [];

    /**
     * Requests permission to load an image URL. Resolves when loading is allowed.
     */
    requestLoad(url: string): Promise<void> {
        return new Promise((resolve) => {
            const run = () => {
                this.activeCount++;
                resolve();
            };

            // If it's already in success cache, load immediately without blocking a queue slot
            if (successCache.has(url)) {
                resolve();
                return;
            }

            if (this.activeCount < this.maxConcurrent) {
                run();
            } else {
                this.queue.push(run);
            }
        });
    }

    /**
     * Notifies the queue manager that an image load attempt is complete (success or error).
     */
    notifyComplete(url: string) {
        // Cached loads don't consume active slots, so they don't decrement activeCount
        if (!successCache.has(url)) {
            this.activeCount = Math.max(0, this.activeCount - 1);
            const next = this.queue.shift();
            if (next) {
                next();
            }
        }
    }
}

const imageQueue = new ImageQueueManager();

// ============================================================================
// 3. Reusable Avatar Component
// ============================================================================
interface AvatarProps {
    src?: string | null;
    alt?: string;
    displayName?: string | null;
    className?: string;
    fallbackClassName?: string;
}

export function Avatar({
    src,
    alt = 'User Avatar',
    displayName,
    className = 'w-10 h-10',
    fallbackClassName = 'bg-[#0B0B0B] border border-[#FFC92E]/30 text-[#FFC92E]'
}: AvatarProps) {
    const [loadState, setLoadState] = useState<'idle' | 'queued' | 'loading' | 'success' | 'failed'>(() => {
        if (!src) return 'failed';
        if (failureCache.has(src)) return 'failed';
        if (successCache.has(src)) return 'success';
        return 'idle';
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const hasRequested = useRef(false);

    // Compute user's initials for a tailored fallback
    const getInitials = () => {
        if (!displayName) return 'U';
        const parts = displayName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Effect: Intersection Observer staggers image loading to when the avatar is in-view
    useEffect(() => {
        if (!src || loadState === 'failed' || loadState === 'success' || hasRequested.current) return;

        const el = containerRef.current;
        if (!el) return;

        // SSR Graceful degradation or fallback
        if (typeof IntersectionObserver === 'undefined') {
            triggerQueueLoad();
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                triggerQueueLoad();
                observer.unobserve(el);
            }
        }, {
            rootMargin: '100px', // Pre-load 100px before scrolling into view
        });

        observer.observe(el);

        return () => {
            if (el) observer.unobserve(el);
        };

        function triggerQueueLoad() {
            hasRequested.current = true;
            setLoadState('queued');
            imageQueue.requestLoad(src!).then(() => {
                setLoadState('loading');
            });
        }
    }, [src, loadState]);

    // Effect: Clean up active queue slot if component unmounts while loading
    useEffect(() => {
        return () => {
            if (loadState === 'loading' && src) {
                imageQueue.notifyComplete(src);
            }
        };
    }, [loadState, src]);

    const handleLoad = () => {
        if (src) {
            successCache.add(src);
            imageQueue.notifyComplete(src);
            setLoadState('success');
        }
    };

    const handleError = () => {
        if (src) {
            failureCache.add(src);
            imageQueue.notifyComplete(src);
            setLoadState('failed');
        }
    };

    // Custom design fallback - rich gold & charcoal styling with glassmorphism matching premium dashboard
    const renderFallback = () => {
        const initials = getInitials();
        return (
            <div className={`w-full h-full rounded-full flex items-center justify-center font-bold font-serif select-none transition-all duration-300 hover:scale-105 ${fallbackClassName}`}>
                {displayName ? (
                    <span className="bg-gradient-to-r from-[#FFC92E] via-[#FFE28A] to-[#DE9D0D] bg-clip-text text-transparent filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-sm tracking-wider">
                        {initials}
                    </span>
                ) : (
                    <User size={16} className="text-[#FFC92E]/70" />
                )}
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className={`relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center select-none ${className}`}
        >
            {/* If load failed or no src, display premium initials fallback */}
            {loadState === 'failed' && renderFallback()}

            {/* Display loading state/skeleton while queued */}
            {(loadState === 'idle' || loadState === 'queued') && (
                <div className="w-full h-full rounded-full bg-[#0F0F0F] border border-white/5 animate-pulse" />
            )}

            {/* Display image element inside DOM for queue execution and loading */}
            {(loadState === 'loading' || loadState === 'success') && src && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                        loadState === 'success' ? 'opacity-100' : 'opacity-0'
                    }`}
                />
            )}
        </div>
    );
}
