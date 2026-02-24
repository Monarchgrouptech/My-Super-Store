import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Search, Eye } from 'lucide-react';
import { Order } from '../../types/vendor';
import { useCurrency } from '../../context/CurrencyContext';

export function AdminOrders() {
    const { isAdmin } = useAdmin();
    const { currency, formatPrice } = useCurrency();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (isAdmin) {
            fetchOrders();
        }
    }, [isAdmin]);

    useEffect(() => {
        const filtered = orders.filter(order =>
            order.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOrders(filtered);
    }, [searchTerm, orders]);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('placed_at', { ascending: false });

            if (!error && data) {
                setOrders(data);
                setFilteredOrders(data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (!error) {
                setOrders(orders.map(o =>
                    o.id === orderId ? { ...o, status: newStatus } : o
                ));
            } else {
                alert('Error updating order');
            }
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'shipped':
                return 'bg-purple-100 text-purple-800';
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (!isAdmin) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <p className="text-red-600 text-lg">Access Denied</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                    <p className="text-gray-600">Manage all customer orders</p>
                </div>

                {/* Order Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Total Orders - Purple Card with Button */}
                    <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                        <p className="text-4xl font-bold text-purple-600 mb-2">{orders.length}</p>
                        <p className="text-sm text-gray-600 mb-4">Total Orders</p>
                        <button className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm">
                            All Orders
                        </button>
                    </div>

                    {/* Pending Orders - Red/Pink Card */}
                    <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg">
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-600">Pending Orders</p>
                        </div>
                        <p className="text-4xl font-bold text-red-600">{orders.filter(o => o.status === 'pending').length}</p>
                    </div>

                    {/* Order Placed - Blue Card */}
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-600">Processing</p>
                        </div>
                        <p className="text-4xl font-bold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
                    </div>

                    {/* Confirmed Order - Green Card */}
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-600">Delivered</p>
                        </div>
                        <p className="text-4xl font-bold text-green-600">{orders.filter(o => o.status === 'delivered').length}</p>
                    </div>

                    {/* Order Shipped - Yellow Card */}
                    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg">
                                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-600">Shipped</p>
                        </div>
                        <p className="text-4xl font-bold text-yellow-600">{orders.filter(o => o.status === 'shipped').length}</p>
                    </div>

                    {/* Cancelled - Gray Card */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg">
                                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-600">Cancelled</p>
                        </div>
                        <p className="text-4xl font-bold text-gray-600">{orders.filter(o => o.status === 'cancelled').length}</p>
                    </div>
                </div>


                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-2">
                        <Search size={20} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by order ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 outline-none text-gray-700"
                        />
                    </div>
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading orders...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No orders found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Order ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Currency
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-gray-900 font-medium">{order.id}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {formatPrice(order.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {currency}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                                    className={`px-2 py-1 rounded text-xs cursor-pointer ${getStatusColor(
                                                        order.status
                                                    )}`}
                                                >
                                                    {statusOptions.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(order.placed_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-blue-600 hover:text-blue-800 transition-colors">
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Total Orders</p>
                        <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Pending</p>
                        <p className="text-3xl font-bold text-yellow-600">
                            {orders.filter(o => o.status === 'pending').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Processing</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {orders.filter(o => o.status === 'processing').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Delivered</p>
                        <p className="text-3xl font-bold text-green-600">
                            {orders.filter(o => o.status === 'delivered').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Cancelled</p>
                        <p className="text-3xl font-bold text-red-600">
                            {orders.filter(o => o.status === 'cancelled').length}
                        </p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
