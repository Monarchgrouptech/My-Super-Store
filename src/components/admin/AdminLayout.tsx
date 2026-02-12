import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Menu,
    X,
    BarChart3,
    Users,
    ShoppingBag,
    Store,
    Settings,
    LogOut,
    Activity,
    Grid3X3,
} from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const menuItems = [
        {
            label: 'Dashboard',
            icon: BarChart3,
            path: '/admin/dashboard',
            permission: 'VIEW_ANALYTICS',
        },
        {
            label: 'Users',
            icon: Users,
            path: '/admin/users',
            permission: 'VIEW_USERS',
        },
        {
            label: 'Products',
            icon: ShoppingBag,
            path: '/admin/products',
            permission: 'VIEW_PRODUCTS',
        },
        {
            label: 'Vendors',
            icon: Store,
            path: '/admin/vendors',
            permission: 'VIEW_VENDORS',
        },
        {
            label: 'Orders',
            icon: Grid3X3,
            path: '/admin/orders',
            permission: 'VIEW_ORDERS',
        },
        {
            label: 'Categories',
            icon: Activity,
            path: '/admin/categories',
            permission: 'MANAGE_CATEGORIES',
        },
        {
            label: 'Settings',
            icon: Settings,
            path: '/admin/settings',
            permission: 'MANAGE_SETTINGS',
        },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div
                className={`${
                    sidebarOpen ? 'w-64' : 'w-20'
                } bg-gray-900 text-white transition-all duration-300 fixed h-full z-50`}
            >
                <div className="p-4 flex items-center justify-between">
                    {sidebarOpen && <h1 className="text-2xl font-bold">Admin</h1>}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1 hover:bg-gray-800 rounded"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="mt-8">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex items-center px-4 py-3 hover:bg-gray-800 transition-colors group"
                            title={!sidebarOpen ? item.label : ''}
                        >
                            <item.icon size={20} className="flex-shrink-0" />
                            {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 hover:bg-gray-800 rounded transition-colors"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="ml-3 text-sm">Logout</span>}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={`${sidebarOpen ? 'ml-64' : 'ml-20'} flex-1 flex flex-col overflow-hidden`}>
                {/* Content Area */}
                <main className="flex-1 overflow-auto p-6 bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
