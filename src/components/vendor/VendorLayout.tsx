import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    User,
    LogOut,
    ArrowLeft,
} from 'lucide-react';
import { useVendor } from '../../hooks/useVendor';
import { supabase } from '../../lib/supabase';

interface VendorLayoutProps {
    children: ReactNode;
}

export function VendorLayout({ children }: VendorLayoutProps) {
    const navigate = useNavigate();
    const { vendor } = useVendor();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const navItems = [
        {
            to: '/vendor/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
        },
        {
            to: '/vendor/products',
            icon: Package,
            label: 'Products',
        },
        {
            to: '/vendor/orders',
            icon: ShoppingCart,
            label: 'Orders',
        },
        {
            to: '/vendor/profile',
            icon: User,
            label: 'Profile',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-full mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/')}
                                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                            >
                                <ArrowLeft size={20} />
                                <span className="hidden sm:inline">Back to Store</span>
                            </button>
                            <div className="h-6 w-px bg-gray-300" />
                            <h1 className="text-xl font-bold text-gray-900">
                                {vendor?.business_name || 'Vendor Portal'}
                            </h1>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                        >
                            <LogOut size={18} />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <nav className="flex gap-1 overflow-x-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `inline-flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition whitespace-nowrap ${isActive
                                        ? 'border-[#D4AF37] text-[#D4AF37]'
                                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                                    }`
                                }
                            >
                                <item.icon size={18} />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-full mx-auto">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <p className="text-center text-sm text-gray-600">
                        © {new Date().getFullYear()} {vendor?.business_name || 'My Superstore'}. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
