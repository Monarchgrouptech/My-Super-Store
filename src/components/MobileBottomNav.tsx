import { Home, ShoppingCart, ShoppingBag, Info, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * MobileBottomNav - Fixed bottom navigation bar for mobile devices
 * 
 * Features:
 * - 5 navigation items: Home, Cart, Shop (hero), About, Account
 * - Shop icon is center-elevated and prominently styled
 * - Active state highlighting
 * - Safe area padding for iOS devices
 * - Glass morphism design
 */


export function MobileBottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Cart', path: '/cart', icon: ShoppingCart },
        { name: 'Shop', path: '/shop', icon: ShoppingBag, isHero: true },
        { name: 'About', path: '/about', icon: Info },
        { name: 'Account', path: '/account', icon: User }
    ];

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-t border-slate-200 shadow-2xl"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
        >
            <div className="flex items-end justify-around px-4 py-2 relative">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    if (item.isHero) {
                        // Hero Shop button - elevated and styled
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className="flex flex-col items-center justify-center"
                                aria-label={item.name}
                            >
                                {/* Elevated container with glow */}
                                <div
                                    className={`flex items-center justify-center size-16 rounded-full shadow-2xl transition-all duration-300 ${active
                                        ? 'bg-linear-to-br from-[#d4af37] via-[#f4d03f] to-[#c5a028] shadow-[0_8px_32px_rgba(212,175,55,0.6)]'
                                        : 'bg-linear-to-br from-slate-800 via-slate-900 to-black shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.4)]'
                                        }`}
                                    style={{
                                        transform: active ? 'scale(1.05)' : 'scale(1)',
                                    }}
                                >
                                    <Icon
                                        size={28}
                                        strokeWidth={2.5}
                                        className={`${active ? 'text-white' : 'text-white'}`}
                                    />
                                </div>
                                <span
                                    className={`text-[10px] font-bold mt-1 transition-colors ${active ? 'text-[#d4af37]' : 'text-slate-600'
                                        }`}
                                >
                                    {item.name}
                                </span>
                            </button>
                        );
                    }

                    // Regular nav items
                    return (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center justify-center min-w-[60px] py-2"
                            aria-label={item.name}
                        >
                            <div
                                className={`flex items-center justify-center size-10 rounded-full transition-all duration-200 ${active
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Icon size={20} strokeWidth={2} />
                            </div>
                            <span
                                className={`text-[10px] font-semibold mt-1 transition-colors ${active ? 'text-slate-900' : 'text-slate-500'
                                    }`}
                            >
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
