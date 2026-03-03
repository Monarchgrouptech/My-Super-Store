import { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Search, X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useCurrency } from '../../context/CurrencyContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Address, Order, Payment } from '../../types/vendor';

interface AdminUserProfile {
    user_id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
}

interface AdminVendorInfo {
    id: string;
    user_id: string | null;
    business_name: string;
    email: string;
    is_verified: boolean;
}

interface AdminProductInfo {
    id: string;
    name: string;
    sku: string | null;
}

interface AdminOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    vendor_id: string | null;
    quantity: number;
    unit_price: number;
    created_at: string;
    products?: AdminProductInfo | null;
}

interface AdminOrderDetails {
    order: Order;
    userProfile: AdminUserProfile | null;
    shippingAddress: Address | null;
    billingAddress: Address | null;
    orderItems: AdminOrderItem[];
    payments: Payment[];
    vendors: AdminVendorInfo[];
}

function toTitle(value: string) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function AdminOrders() {
    const { isAdmin } = useAdmin();
    const { currency, formatPrice } = useCurrency();

    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<AdminOrderDetails | null>(null);

    useEffect(() => {
        if (isAdmin) fetchOrders();
    }, [isAdmin]);

    useEffect(() => {
        const filtered = orders.filter((order) =>
            order.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOrders(filtered);
    }, [orders, searchTerm]);

    const statusOptions = useMemo(() => {
        const defaults = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
        const seen = orders
            .map((order) => (order.status || '').toLowerCase().trim())
            .filter(Boolean);
        return Array.from(new Set([...seen, ...defaults]));
    }, [orders]);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('placed_at', { ascending: false });

            if (error) throw error;
            const rows = (data || []) as Order[];
            setOrders(rows);
            setFilteredOrders(rows);
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

            if (error) {
                alert('Error updating order');
                return;
            }

            setOrders((prev) =>
                prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
            );

            setSelectedOrderDetails((prev) =>
                prev && prev.order.id === orderId
                    ? { ...prev, order: { ...prev.order, status: newStatus } }
                    : prev
            );
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    const openOrderDetails = async (orderId: string) => {
        setDetailsOpen(true);
        setDetailsLoading(true);
        setDetailsError(null);
        setSelectedOrderDetails(null);

        try {
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError || !orderData) {
                throw new Error(orderError?.message || 'Order not found');
            }

            const addressIds = [orderData.shipping_address_id, orderData.billing_address_id].filter(
                Boolean
            ) as string[];

            const [userRes, addressRes, itemRes, paymentRes] = await Promise.all([
                orderData.user_id
                    ? supabase
                          .from('user_profiles')
                          .select('user_id, display_name, email, avatar_url')
                          .eq('user_id', orderData.user_id)
                          .maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
                addressIds.length > 0
                    ? supabase.from('addresses').select('*').in('id', addressIds)
                    : Promise.resolve({ data: [], error: null }),
                supabase
                    .from('order_items')
                    .select(
                        `
                        id,
                        order_id,
                        product_id,
                        vendor_id,
                        quantity,
                        unit_price,
                        created_at,
                        products (id, name, sku)
                    `
                    )
                    .eq('order_id', orderId),
                supabase
                    .from('payments')
                    .select('*')
                    .eq('order_id', orderId)
                    .order('created_at', { ascending: false }),
            ]);

            if (userRes.error) throw userRes.error;
            if (addressRes.error) throw addressRes.error;
            if (itemRes.error) throw itemRes.error;
            if (paymentRes.error) throw paymentRes.error;

            const normalizedItems: AdminOrderItem[] = ((itemRes.data as any[]) || []).map((item) => ({
                id: item.id,
                order_id: item.order_id,
                product_id: item.product_id,
                vendor_id: item.vendor_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                created_at: item.created_at,
                products: Array.isArray(item.products) ? item.products[0] : item.products,
            }));

            const vendorIds = Array.from(
                new Set(normalizedItems.map((item) => item.vendor_id).filter(Boolean))
            ) as string[];

            let vendors: AdminVendorInfo[] = [];
            if (vendorIds.length > 0) {
                const { data: vendorData, error: vendorError } = await supabase
                    .from('vendors')
                    .select('id, user_id, business_name, email, is_verified')
                    .in('id', vendorIds);
                if (vendorError) throw vendorError;
                vendors = (vendorData || []) as AdminVendorInfo[];
            }

            const addresses = (addressRes.data || []) as Address[];
            const shippingAddress =
                addresses.find((address) => address.id === orderData.shipping_address_id) || null;
            const billingAddress =
                addresses.find((address) => address.id === orderData.billing_address_id) || null;

            setSelectedOrderDetails({
                order: orderData as Order,
                userProfile: (userRes.data || null) as AdminUserProfile | null,
                shippingAddress,
                billingAddress,
                orderItems: normalizedItems,
                payments: (paymentRes.data || []) as Payment[],
                vendors,
            });
        } catch (error) {
            console.error('Error loading order details:', error);
            setDetailsError(error instanceof Error ? error.message : 'Failed to load order details');
        } finally {
            setDetailsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'paid':
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'shipped':
                return 'bg-purple-100 text-purple-800';
            case 'delivered':
                return 'bg-emerald-100 text-emerald-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const renderAddress = (address: Address | null) => {
        if (!address) return <p className="text-sm text-gray-500">No address attached</p>;

        return (
            <div className="text-sm text-gray-700 space-y-1">
                {address.label && <p className="font-semibold text-gray-900">{address.label}</p>}
                {address.line1 && <p>{address.line1}</p>}
                {address.line2 && <p>{address.line2}</p>}
                <p>{[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}</p>
                {address.country && <p>{address.country}</p>}
            </div>
        );
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-500">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-500">Pending Orders</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {orders.filter((order) => (order.status || '').toLowerCase() === 'pending').length}
                        </p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-500">Paid Orders</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {orders.filter((order) => (order.status || '').toLowerCase() === 'paid').length}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-2">
                        <Search size={20} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by order ID..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="flex-1 outline-none text-gray-700"
                        />
                    </div>
                </div>

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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Currency</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{formatPrice(order.total_amount)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{currency}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <select
                                                    value={(order.status || '').toLowerCase().trim()}
                                                    onChange={(event) => handleUpdateOrderStatus(order.id, event.target.value)}
                                                    className={`px-2 py-1 rounded text-xs cursor-pointer ${getStatusColor(order.status)}`}
                                                >
                                                    {statusOptions.map((status) => (
                                                        <option key={status} value={status}>{toTitle(status)}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.placed_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openOrderDetails(order.id)}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                                    title="View order details"
                                                >
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
            </div>

            {detailsOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 p-4 overflow-y-auto">
                    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl border">
                        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
                            <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                            <button onClick={() => setDetailsOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {detailsLoading ? (
                                <div className="py-20 text-center text-gray-500">
                                    <Loader2 className="animate-spin mx-auto mb-3 text-gray-400" size={32} />
                                    Loading order details...
                                </div>
                            ) : detailsError ? (
                                <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">{detailsError}</div>
                            ) : selectedOrderDetails ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-lg border bg-gray-50">
                                            <p className="text-xs text-gray-500">STATUS</p>
                                            <p className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrderDetails.order.status)}`}>
                                                {toTitle(selectedOrderDetails.order.status)}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-lg border bg-gray-50">
                                            <p className="text-xs text-gray-500">TOTAL</p>
                                            <p className="mt-2 text-lg font-bold text-gray-900">{formatPrice(selectedOrderDetails.order.total_amount)}</p>
                                        </div>
                                        <div className="p-4 rounded-lg border bg-gray-50">
                                            <p className="text-xs text-gray-500">PLACED</p>
                                            <p className="mt-2 text-sm font-medium text-gray-800">{new Date(selectedOrderDetails.order.placed_at).toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 rounded-lg border bg-gray-50">
                                            <p className="text-xs text-gray-500">UPDATED</p>
                                            <p className="mt-2 text-sm font-medium text-gray-800">{new Date(selectedOrderDetails.order.updated_at).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="p-4 rounded-lg border">
                                            <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                                            {selectedOrderDetails.userProfile ? (
                                                <div className="text-sm text-gray-700 space-y-1">
                                                    <p><span className="font-medium">Name:</span> {selectedOrderDetails.userProfile.display_name || 'N/A'}</p>
                                                    <p><span className="font-medium">Email:</span> {selectedOrderDetails.userProfile.email}</p>
                                                    <p><span className="font-medium">User ID:</span> {selectedOrderDetails.userProfile.user_id}</p>
                                                </div>
                                            ) : <p className="text-sm text-gray-500">No user profile found</p>}
                                        </div>
                                        <div className="p-4 rounded-lg border">
                                            <h3 className="font-semibold text-gray-900 mb-2">Vendors</h3>
                                            {selectedOrderDetails.vendors.length > 0 ? (
                                                <div className="space-y-2">
                                                    {selectedOrderDetails.vendors.map((vendor) => (
                                                        <div key={vendor.id} className="p-2 rounded bg-gray-50 border text-sm text-gray-700">
                                                            <p className="font-semibold text-gray-900">{vendor.business_name}</p>
                                                            <p>{vendor.email}</p>
                                                            <p className="text-xs text-gray-500">Vendor ID: {vendor.id}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-sm text-gray-500">No vendor records found</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="p-4 rounded-lg border">
                                            <h3 className="font-semibold text-gray-900 mb-2">Shipping Address</h3>
                                            {renderAddress(selectedOrderDetails.shippingAddress)}
                                        </div>
                                        <div className="p-4 rounded-lg border">
                                            <h3 className="font-semibold text-gray-900 mb-2">Billing Address</h3>
                                            {renderAddress(selectedOrderDetails.billingAddress)}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-lg border">
                                        <h3 className="font-semibold text-gray-900 mb-2">Order Items</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left border-b text-gray-600">
                                                        <th className="py-2 pr-4">Product</th>
                                                        <th className="py-2 pr-4">Vendor</th>
                                                        <th className="py-2 pr-4">Qty</th>
                                                        <th className="py-2 pr-4">Unit Price</th>
                                                        <th className="py-2">Line Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedOrderDetails.orderItems.map((item) => (
                                                        <tr key={item.id} className="border-b last:border-0">
                                                            <td className="py-2 pr-4">
                                                                <p className="font-medium text-gray-900">{item.products?.name || 'Unknown Product'}</p>
                                                                {item.products?.sku && <p className="text-xs text-gray-500">SKU: {item.products.sku}</p>}
                                                            </td>
                                                            <td className="py-2 pr-4">
                                                                {selectedOrderDetails.vendors.find((vendor) => vendor.id === item.vendor_id)?.business_name || 'Unknown Vendor'}
                                                            </td>
                                                            <td className="py-2 pr-4">{item.quantity}</td>
                                                            <td className="py-2 pr-4">{formatPrice(item.unit_price)}</td>
                                                            <td className="py-2 font-semibold">{formatPrice(item.quantity * item.unit_price)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-lg border">
                                        <h3 className="font-semibold text-gray-900 mb-2">Payments</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left border-b text-gray-600">
                                                        <th className="py-2 pr-4">Provider</th>
                                                        <th className="py-2 pr-4">Status</th>
                                                        <th className="py-2 pr-4">Amount</th>
                                                        <th className="py-2 pr-4">Provider Payment ID</th>
                                                        <th className="py-2">Created</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedOrderDetails.payments.map((payment) => (
                                                        <tr key={payment.id} className="border-b last:border-0">
                                                            <td className="py-2 pr-4">{payment.provider || 'N/A'}</td>
                                                            <td className="py-2 pr-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status || '')}`}>
                                                                    {toTitle(payment.status || 'unknown')}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 pr-4 font-semibold">{formatPrice(payment.amount || 0)}</td>
                                                            <td className="py-2 pr-4">{payment.provider_payment_id || 'N/A'}</td>
                                                            <td className="py-2">{new Date(payment.created_at).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-20 text-center text-gray-500">No order selected</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
