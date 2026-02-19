import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, DollarSign, Eye, ShoppingCart, Plus, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVendor } from '../../hooks/useVendor';
import { VendorStats } from '../../types/vendor';

export function VendorDashboard() {
    const navigate = useNavigate();
    const { vendor, loading: vendorLoading, isVendor } = useVendor();
    const [stats, setStats] = useState<VendorStats>({
        totalProducts: 0,
        publishedProducts: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        totalViews: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (vendor) {
            fetchStats();
        }
    }, [vendor]);

    const fetchStats = async () => {
        if (!vendor) return;

        try {
            setLoading(true);

            // Fetch product statistics
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id, published, view_count')
                .eq('seller_id', vendor.id);

            if (productsError) throw productsError;

            const totalProducts = products?.length || 0;
            const publishedProducts = products?.filter((p) => p.published).length || 0;
            const totalViews = products?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;

            const productIds = products?.map((p) => p.id) || [];
            let pendingOrdersCount = 0;
            let orderItems: any[] = [];

            // Only fetch orders and revenue if vendor has products
            if (productIds.length > 0) {
                // Fetch order count (orders containing vendor's products)
                const { count: count, error: ordersError } = await supabase
                    .from('order_items')
                    .select('order_id', { count: 'exact', head: true })
                    .in('product_id', productIds)
                    .eq('orders.status', 'pending');

                if (ordersError) console.error('Error fetching orders:', ordersError);
                pendingOrdersCount = count || 0;

                // Calculate revenue (sum of order_items where product is vendor's)
                const { data: items, error: revenueError } = await supabase
                    .from('order_items')
                    .select('quantity, unit_price')
                    .in('product_id', productIds);

                if (revenueError) console.error('Error fetching revenue:', revenueError);
                orderItems = items || [];
            }

            const totalRevenue =
                orderItems?.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) || 0;

            setStats({
                totalProducts,
                publishedProducts,
                pendingOrders: pendingOrdersCount,
                totalRevenue,
                totalViews,
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (vendorLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
            </div>
        );
    }

    // Show setup prompt if user is not a vendor (regardless of loading state)
    if (!isVendor || !vendor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 border-2 border-[#D4AF37] text-center">
                    <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8 text-[#D4AF37]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        No Vendor Profile Found
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Set up your vendor profile to start selling products and managing your inventory.
                    </p>
                    <button
                        onClick={() => navigate('/vendor/profile')}
                        className="btn-primary inline-flex items-center justify-center gap-2 mx-auto"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Set Up Vendor Profile
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
            </div>
        );
    }
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {vendor.business_name}!
                </h1>
                <p className="text-gray-600">
                    Here's what's happening with your store today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Package className="text-blue-600" size={24} />
                        </div>
                        <TrendingUp className="text-green-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                    <p className="text-sm text-gray-600">Total Products</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {stats.publishedProducts} published
                    </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="text-green-600" size={24} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        ${stats.totalRevenue.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-xs text-gray-500 mt-1">All-time sales</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <ShoppingCart className="text-yellow-600" size={24} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                    <p className="text-sm text-gray-600">Pending Orders</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Eye className="text-purple-600" size={24} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
                    <p className="text-sm text-gray-600">Total Views</p>
                    <p className="text-xs text-gray-500 mt-1">Product page views</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => navigate('/vendor/products/new')}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition"
                    >
                        <div className="p-2 bg-[#D4AF37]/10 rounded-lg">
                            <Plus className="text-[#D4AF37]" size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-gray-900">Add Product</p>
                            <p className="text-sm text-gray-600">Create a new listing</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/vendor/products')}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition"
                    >
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="text-blue-600" size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-gray-900">View Products</p>
                            <p className="text-sm text-gray-600">Manage your inventory</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/vendor/orders')}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition"
                    >
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <ShoppingCart className="text-yellow-600" size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-gray-900">View Orders</p>
                            <p className="text-sm text-gray-600">Check pending orders</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Vendor Info */}
            {!vendor.is_verified && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <svg
                                className="w-5 h-5 text-yellow-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-900 mb-1">
                                Account Verification Pending
                            </h3>
                            <p className="text-sm text-yellow-800 mb-3">
                                Your vendor account is pending verification. Complete your profile to speed up the process.
                            </p>
                            <button
                                onClick={() => navigate('/vendor/profile')}
                                className="text-sm font-medium text-yellow-900 hover:underline"
                            >
                                Complete Profile →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
