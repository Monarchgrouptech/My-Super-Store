import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Search, Trash2, Eye, EyeOff, ShoppingBag, Package, FileText, AlertTriangle } from 'lucide-react';
import { Product } from '../../types/vendor';
import { StatCard } from '../../components/admin/StatCard';
import { useCurrency } from '../../context/CurrencyContext';

export function AdminProducts() {
    const { isAdmin } = useAdmin();
    const { formatPrice } = useCurrency();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    useEffect(() => {
        if (isAdmin) {
            fetchProducts();
        }
    }, [isAdmin]);

    useEffect(() => {
        const filtered = products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProducts(filtered);
        setPage(0);
    }, [searchTerm, products]);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    vendors:seller_id (
                        id,
                        business_name,
                        is_verified
                    )
                `)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setProducts(data);
                setFilteredProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePublish = async (productId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ published: !currentStatus })
                .eq('id', productId);

            if (!error) {
                setProducts(products.map(p =>
                    p.id === productId ? { ...p, published: !currentStatus } : p
                ));
            } else {
                alert('Error updating product');
            }
        } catch (error) {
            console.error('Error updating product:', error);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', productId);

                if (!error) {
                    setProducts(products.filter(p => p.id !== productId));
                    alert('Product deleted successfully');
                } else {
                    alert('Error deleting product');
                }
            } catch (error) {
                console.error('Error deleting product:', error);
            }
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
                    <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
                    <p className="text-gray-600">Manage all products in the store</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Products"
                        value={products.length}
                        icon={ShoppingBag}
                        color="purple"
                    />
                    <StatCard
                        title="Published"
                        value={products.filter(p => p.published).length}
                        icon={Package}
                        color="blue"
                    />
                    <StatCard
                        title="Drafts"
                        value={products.filter(p => !p.published).length}
                        icon={FileText}
                        color="gray"
                    />
                    <StatCard
                        title="Out of Stock"
                        value={products.filter(p => p.stock === 0).length}
                        icon={AlertTriangle}
                        color="red"
                    />
                </div>


                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-2">
                        <Search size={20} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by product name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 outline-none text-gray-700"
                        />
                    </div>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading products...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No products found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Product Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            SKU
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Price
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Stock
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Vendor
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-gray-900 font-medium">{product.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {product.sku || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {formatPrice(product.price)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <span className={`px-2 py-1 rounded text-xs ${product.stock > 10
                                                    ? 'bg-green-100 text-green-800'
                                                    : product.stock > 0
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {product.stock} units
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {product.vendors?.business_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded text-xs ${product.published
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {product.published ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleTogglePublish(product.id, product.published)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        title={product.published ? 'Unpublish' : 'Publish'}
                                                    >
                                                        {product.published ? <Eye size={18} /> : <EyeOff size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="Delete product"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {/* Pagination */}
                {filteredProducts.length > PAGE_SIZE && (
                    <div className="pagination-controls" style={{ justifyContent: 'flex-start', background: '#fff', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <button
                            className="pagination-btn"
                            style={{ color: '#374151', borderColor: '#D1D5DB', background: 'transparent' }}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >? Prev</button>
                        <span className="pagination-info" style={{ color: '#6B7280' }}>
                            Page {page + 1} of {Math.ceil(filteredProducts.length / PAGE_SIZE)} ({filteredProducts.length} products)
                        </span>
                        <button
                            className="pagination-btn"
                            style={{ color: '#374151', borderColor: '#D1D5DB', background: 'transparent' }}
                            onClick={() => setPage(p => Math.min(Math.ceil(filteredProducts.length / PAGE_SIZE) - 1, p + 1))}
                            disabled={page >= Math.ceil(filteredProducts.length / PAGE_SIZE) - 1}
                        >Next ?</button>
                    </div>
                )}

                {/* Stats */}

            </div>
        </AdminLayout>
    );
}
