import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Eye, Package, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProductWithDetails } from '../../types/vendor';
import { ConfirmModal } from '../../components/vendor/ConfirmModal';

export function ProductDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<ProductWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (id) fetchProduct(id);
    }, [id]);

    const fetchProduct = async (productId: string) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          product_images(*),
          product_specs(*),
          product_categories(categories(*))
        `)
                .eq('id', productId)
                .single();

            if (error) throw error;
            setProduct(data);
        } catch (err) {
            console.error('Error fetching product:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        setDeleting(true);
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            navigate('/vendor/products');
        } catch (err) {
            console.error('Error deleting product:', err);
            alert('Failed to delete product');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
                <button
                    onClick={() => navigate('/vendor/products')}
                    className="btn-primary"
                >
                    Back to Products
                </button>
            </div>
        );
    }

    const images = product.product_images?.sort((a, b) => a.position - b.position) || [];
    const specs = product.product_specs || [];
    const categories = product.product_categories?.map((pc) => pc.categories).filter(Boolean) || [];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/vendor/products')}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft size={20} />
                    Back to Products
                </button>

                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                            {product.published ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                    Published
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                                    Draft
                                </span>
                            )}
                        </div>
                        {product.sku && (
                            <p className="text-gray-500">SKU: {product.sku}</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/vendor/products/${product.id}/edit`)}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <Edit size={18} />
                            Edit
                        </button>
                        <button
                            onClick={() => setDeleteModalOpen(true)}
                            className="px-4 py-2 text-red-600 border border-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#D4AF37]/10 rounded-lg">
                            <Package className="text-[#D4AF37]" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{product.stock}</p>
                            <p className="text-sm text-gray-600">In Stock</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Eye className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{product.view_count}</p>
                            <p className="text-sm text-gray-600">Views</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">Price</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Images */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Images</h2>
                    {images.length > 0 ? (
                        <div className="space-y-4">
                            {images.map((image, index) => (
                                <div key={image.id || index}>
                                    <img
                                        src={image.url}
                                        alt={image.alt_text || `Product image ${index + 1}`}
                                        className="w-full rounded-lg border border-gray-200"
                                    />
                                    {image.alt_text && (
                                        <p className="text-sm text-gray-600 mt-2">{image.alt_text}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No images uploaded</p>
                    )}
                </div>

                {/* Details */}
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
                        <dl className="space-y-3">
                            {product.brand && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Brand</dt>
                                    <dd className="text-sm text-gray-900">{product.brand}</dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Price</dt>
                                <dd className="text-2xl font-bold text-[#D4AF37]">
                                    ${product.price.toFixed(2)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Stock</dt>
                                <dd className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {product.stock > 0 ? `${product.stock} units available` : 'Out of stock'}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Categories */}
                    {categories.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories</h2>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <span
                                        key={category.id}
                                        className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-sm font-medium"
                                    >
                                        {category.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Specifications */}
                    {specs.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
                            <dl className="space-y-2">
                                {specs.map((spec) => (
                                    <div key={spec.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                                        <dt className="text-sm font-medium text-gray-700">{spec.spec_key}</dt>
                                        <dd className="text-sm text-gray-900">{spec.spec_value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            {(product.short_description || product.description) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                    {product.short_description && (
                        <p className="text-gray-700 mb-4 font-medium">{product.short_description}</p>
                    )}
                    {product.description && (
                        <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
                    )}
                </div>
            )}

            {/* Delete Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Delete Product"
                message="Are you sure you want to delete this product? This action cannot be undone."
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                onCancel={() => setDeleteModalOpen(false)}
                variant="danger"
            />
        </div>
    );
}
