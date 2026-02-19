import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVendorProducts } from '../../hooks/useVendorProducts';
import { ProductCard } from '../../components/vendor/ProductCard';
import { ConfirmModal } from '../../components/vendor/ConfirmModal';

export function ProductList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [publishedOnly, setPublishedOnly] = useState(false);
    const [page, setPage] = useState(0);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const limit = 12;
    const offset = page * limit;

    const { products, loading, error, total, refetch } = useVendorProducts({
        search,
        publishedOnly,
        limit,
        offset,
    });

    const totalPages = Math.ceil(total / limit);

    const handleDelete = async () => {
        if (!productToDelete) return;

        setDeleting(true);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productToDelete);

            if (error) throw error;

            setDeleteModalOpen(false);
            setProductToDelete(null);
            refetch();
        } catch (err) {
            console.error('Error deleting product:', err);
            alert('Failed to delete product');
        } finally {
            setDeleting(false);
        }
    };

    const confirmDelete = (productId: string) => {
        setProductToDelete(productId);
        setDeleteModalOpen(true);
    };

    return (
        <div className="max-w-full mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
                    <p className="text-gray-600 mt-1">{total} products total</p>
                </div>
                <button
                    onClick={() => navigate('/vendor/products/new')}
                    className="btn-primary inline-flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Product
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Search products by name, SKU, or description..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                        />
                    </div>

                    {/* Filter */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={publishedOnly}
                            onChange={(e) => {
                                setPublishedOnly(e.target.checked);
                                setPage(0);
                            }}
                            className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                        />
                        <span className="text-sm text-gray-700">Published only</span>
                    </label>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
                </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {search ? 'No products found' : 'No products yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {search
                            ? 'Try adjusting your search or filters'
                            : 'Get started by adding your first product'}
                    </p>
                    {!search && (
                        <button
                            onClick={() => navigate('/vendor/products/new')}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add Your First Product
                        </button>
                    )}
                </div>
            )}

            {/* Products Grid */}
            {!loading && products.length > 0 && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 justify-items-center mb-8">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onEdit={(id) => navigate(`/vendor/products/${id}/edit`)}
                                onDelete={confirmDelete}
                                onView={(id) => navigate(`/vendor/products/${id}`)}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Delete Product"
                message="Are you sure you want to delete this product? This action cannot be undone."
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setProductToDelete(null);
                }}
                variant="danger"
            />
        </div>
    );
}
