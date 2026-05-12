import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Truck,
    LogOut,
    Bell,
    ClipboardList,
    TrendingUp
} from 'lucide-react';
import { useDeliveryPartner } from '../../hooks/useDeliveryPartner';
import { supabase } from '../../lib/supabase';
import '../../styles/delivery.css';

interface DeliveryLayoutProps {
    children: ReactNode;
}

export function DeliveryLayout({ children }: DeliveryLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { partner } = useDeliveryPartner();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const navItems = [
        {
            to: '/delivery/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
        },
        {
            to: '/delivery/orders',
            icon: Truck,
            label: 'Active Shipments',
        },
        {
            to: '/delivery/history',
            icon: ClipboardList,
            label: 'All Orders',
        },
        {
            to: '/delivery/updates',
            icon: TrendingUp,
            label: 'Tracking Updates',
        },
    ];

    const getIsActive = (path: string) => {
        return location.pathname === path;
    };

    const activeItem = navItems.find((item) => getIsActive(item.to)) || navItems[0];

    return (
        <div className="delivery-shell flex overflow-x-hidden">
            {/* Top Navigation Bar - Fixed */}
            <header className="delivery-topbar flex items-center justify-between px-8">
                <div className="flex items-center gap-12">
                    <h1 className="text-[20px] font-black tracking-[0.1em] text-black uppercase">MYSUPERSTORE</h1>
                </div>

                <div className="flex items-center gap-8">
                    <h2 className="hidden lg:block text-[24px] font-semibold tracking-tight text-black">
                        {activeItem.label}
                    </h2>

                    <div className="flex items-center gap-6">
                        <button type="button" className="relative text-black hover:text-zinc-600 transition-colors" aria-label="Delivery notifications">
                            <Bell size={20} />
                            <span className="pulse-dot absolute top-0 right-0 w-2 h-2 bg-[#9f7418] rounded-full ring-2 ring-white"></span>
                        </button>

                        <div className="flex items-center gap-4 border-l border-zinc-200 pl-6">
                            <div className="text-right hidden sm:block">
                                <p className="label-caps text-black leading-none mb-1">PARTNER PORTAL</p>
                                <p className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">PREMIUM DELIVERY</p>
                            </div>
                            <div className="w-10 h-10 bg-white border border-black flex items-center justify-center overflow-hidden shrink-0">
                                {partner?.logo_url ? (
                                    <img src={partner.logo_url} className="w-full h-full object-cover grayscale" alt="Delivery partner avatar" />
                                ) : (
                                    <img src="/images/deliver_man_photo.jpg" className="w-full h-full object-cover grayscale" alt="Delivery partner avatar" />
                                )}
                            </div>
                            <button type="button" onClick={handleSignOut} className="text-zinc-400 hover:text-red-600 transition-colors" aria-label="Sign out">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Side Navigation Bar - Fixed */}
            <aside className="delivery-sidebar hidden md:flex flex-col py-8 overflow-y-auto">
                <div className="px-8 mb-12">
                    <h1 className="text-[18px] font-black tracking-tight text-black uppercase leading-none mb-1">MYSUPERSTORE</h1>
                    <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">OPERATIONS CENTER</p>
                </div>
                
                <nav className="flex-1 flex flex-col">
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={() => {
                                    const isCurrent = getIsActive(item.to);
                                    return `flex items-center gap-4 px-8 py-4 transition-all duration-150 group ${isCurrent
                                        ? 'text-black border-r-4 border-[#9f7418] bg-zinc-50' 
                                        : 'text-zinc-400 hover:bg-zinc-50 hover:text-black'}`;
                                }}
                            >
                                <item.icon size={20} strokeWidth={getIsActive(item.to) ? 2.5 : 2} />
                                <span className="text-[12px] font-bold uppercase tracking-[0.1em]">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center justify-around px-4 z-50">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={() => `flex flex-col items-center gap-1 ${getIsActive(item.to) ? 'text-black' : 'text-zinc-400'}`}
                    >
                        <item.icon size={20} />
                        <span className="text-[8px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
                    </NavLink>
                ))}
                <button type="button" onClick={handleSignOut} className="flex flex-col items-center gap-1 text-zinc-400">
                    <LogOut size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Exit</span>
                </button>
            </nav>

            {/* Main Content Area - Scrollable */}
            <main className="delivery-main flex-1 overflow-x-hidden">
                <div className="h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
