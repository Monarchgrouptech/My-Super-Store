import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { AdminStats } from '../../types/admin';
import { Users, ShoppingBag, Store, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { useCurrency } from '../../context/CurrencyContext';

export function AdminDashboard() {
    const navigate = useNavigate();
    const { isAdmin } = useAdmin();
    const { formatPrice } = useCurrency();
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalVendors: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingVendorApprovals: 0,
        pendingProductApprovals: 0,
    });
    const [loading, setLoading] = useState(true);
    const [orderBreakdown, setOrderBreakdown] = useState({
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
    });
    const [productBreakdown, setProductBreakdown] = useState({
        published: 0,
        drafts: 0,
    });
    const [vendorBreakdown, setVendorBreakdown] = useState({
        verified: 0,
        pending: 0,
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Fetch total users from user_profiles
            const { count: usersCount } = await supabase
                .from('user_profiles')
                .select('id', { count: 'exact', head: true });

            // Fetch total vendors
            const { count: vendorsCount } = await supabase
                .from('vendors')
                .select('id', { count: 'exact', head: true });

            // Fetch total products
            const { count: productsCount } = await supabase
                .from('products')
                .select('id', { count: 'exact', head: true });

            // Fetch total orders
            const { count: ordersCount } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true });

            // Fetch pending approvals
            const { count: pendingVendors } = await supabase
                .from('vendors')
                .select('id', { count: 'exact', head: true })
                .eq('is_verified', false);

            // Calculate total revenue from order_items (matching vendor panel logic)
            // Revenue = sum of (quantity * unit_price) for all order items
            const { data: orderItems, error: revenueError } = await supabase
                .from('order_items')
                .select('quantity, unit_price');

            if (revenueError) {
                console.error('Error fetching revenue:', revenueError);
            }

            const totalRevenue = orderItems?.reduce(
                (sum, item) => sum + (item.quantity * item.unit_price),
                0
            ) || 0;

            // Fetch order breakdown
            const { data: orders } = await supabase
                .from('orders')
                .select('status');

            const breakdown = {
                pending: orders?.filter(o => o.status === 'pending').length || 0,
                processing: orders?.filter(o => o.status === 'processing').length || 0,
                shipped: orders?.filter(o => o.status === 'shipped').length || 0,
                delivered: orders?.filter(o => o.status === 'delivered').length || 0,
                cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
            };

            setOrderBreakdown(breakdown);

            // Fetch product breakdown
            const { data: products } = await supabase
                .from('products')
                .select('published');

            setProductBreakdown({
                published: products?.filter(p => p.published).length || 0,
                drafts: products?.filter(p => !p.published).length || 0,
            });

            // Fetch vendor breakdown
            const { data: vendors } = await supabase
                .from('vendors')
                .select('is_verified');

            setVendorBreakdown({
                verified: vendors?.filter(v => v.is_verified).length || 0,
                pending: vendors?.filter(v => !v.is_verified).length || 0,
            });

            setStats({
                totalUsers: usersCount || 0,
                totalVendors: vendorsCount || 0,
                totalProducts: productsCount || 0,
                totalOrders: ordersCount || 0,
                totalRevenue: totalRevenue,
                pendingVendorApprovals: pendingVendors || 0,
                pendingProductApprovals: 0,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <p className="text-red-600 text-lg">Access Denied</p>
                    <p className="text-gray-600">You do not have admin privileges.</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600">Welcome to your admin panel</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">Loading stats...</p>
                    </div>
                ) : (
                    <>
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Total Users */}
                            <StatCard
                                title="Total Users"
                                value={stats.totalUsers}
                                icon={Users}
                                color="blue"
                            />

                            {/* Total Vendors */}
                            <StatCard
                                title="Total Vendors"
                                value={stats.totalVendors}
                                icon={Store}
                                color="green"
                                breakdown={[
                                    { label: 'Verified', value: vendorBreakdown.verified, color: 'bg-green-500' },
                                    { label: 'Pending Approval', value: vendorBreakdown.pending, color: 'bg-yellow-500' },
                                ]}
                            />

                            {/* Total Products */}
                            <StatCard
                                title="Total Products"
                                value={stats.totalProducts}
                                icon={ShoppingBag}
                                color="purple"
                                breakdown={[
                                    { label: 'Published', value: productBreakdown.published, color: 'bg-green-500' },
                                    { label: 'Drafts', value: productBreakdown.drafts, color: 'bg-gray-400' },
                                ]}
                            />

                            {/* Total Revenue */}
                            <StatCard
                                title="Total Revenue"
                                value={formatPrice(stats.totalRevenue)}
                                icon={DollarSign}
                                color="blue"
                            />

                            {/* Total Orders */}
                            <StatCard
                                title="Total Orders"
                                value={stats.totalOrders}
                                icon={TrendingUp}
                                color="orange"
                                breakdown={[
                                    { label: 'Pending', value: orderBreakdown.pending, color: 'bg-yellow-500' },
                                    { label: 'Processing', value: orderBreakdown.processing, color: 'bg-blue-500' },
                                    { label: 'Shipped', value: orderBreakdown.shipped, color: 'bg-purple-500' },
                                    { label: 'Delivered', value: orderBreakdown.delivered, color: 'bg-green-500' },
                                    { label: 'Cancelled', value: orderBreakdown.cancelled, color: 'bg-red-500' },
                                ]}
                                action={{
                                    label: 'All Orders',
                                    onClick: () => navigate('/admin/orders'),
                                }}
                            />

                            {/* Pending Approvals */}
                            <StatCard
                                title="Pending Vendor Approvals"
                                value={stats.pendingVendorApprovals}
                                icon={AlertCircle}
                                color="red"
                                action={{
                                    label: 'View Vendors',
                                    onClick: () => navigate('/admin/vendors'),
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
