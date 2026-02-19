import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProductFormData } from '../../types/vendor';
import { ImageUploader } from '../../components/vendor/ImageUploader';
import { SpecsEditor } from '../../components/vendor/SpecsEditor';
import { CategoryMultiSelect } from '../../components/vendor/CategoryMultiSelect';
import { useVendor } from '../../hooks/useVendor';

export function ProductForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { vendor, loading: vendorLoading } = useVendor();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        price: 0,
        stock: 0,
        short_description: '',
        description: '',
        brand: '',
        published: false,
        images: [],
        specs: [],
        category_ids: [],
    });

    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPriceRange, setIsPriceRange] = useState(false);
    const [priceRangeMin, setPriceRangeMin] = useState(0);
    const [priceRangeMax, setPriceRangeMax] = useState(0);


    useEffect(() => {
        if (isEditMode && id) {
            fetchProduct(id);
        }
    }, [id, isEditMode]);

    const fetchProduct = async (productId: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          product_images(*),
          product_specs(*),
          product_categories(category_id)
        `)
                .eq('id', productId)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    name: data.name,
                    sku: data.sku || '',
                    price: data.price,
                    stock: data.stock,
                    short_description: data.short_description || '',
                    description: data.description || '',
                    brand: data.brand || '',
                    published: data.published,
                    images: (data.product_images || []).sort((a: any, b: any) => a.position - b.position),
                    specs: data.product_specs || [],
                    category_ids: (data.product_categories || []).map((pc: any) => pc.category_id),
                });
            }
        } catch (err) {
            console.error('Error fetching product:', err);
            setError('Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!vendor) {
            setError('Vendor profile not found');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Validate required fields
            if (!formData.name.trim()) throw new Error('Product name is required');
            if (formData.price <= 0) throw new Error('Price must be greater than 0');
            if (formData.category_ids.length === 0) throw new Error('Select at least one category');

            if (isEditMode && id) {
                // Update existing product
                await updateProduct(id);
            } else {
                // Create new product
                await createProduct();
            }

            navigate('/vendor/products');
        } catch (err) {
            console.error('Error saving product:', err);
            setError(err instanceof Error ? err.message : 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const createProduct = async () => {
        if (!vendor) return;

        // Generate slug from name
        const slug = formData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Insert product
        const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
                name: formData.name,
                slug,
                sku: formData.sku || null,
                short_description: formData.short_description || null,
                description: formData.description || null,
                price: formData.price,
                stock: formData.stock,
                brand: formData.brand || null,
                published: formData.published,
                seller_id: vendor.id,
            })
            .select()
            .single();

        if (productError) throw productError;

        // Insert images
        if (formData.images.length > 0) {
            const imageInserts = formData.images.map((img) => ({
                product_id: product.id,
                url: img.url,
                alt_text: img.alt_text,
                position: img.position,
            }));

            const { error: imagesError } = await supabase
                .from('product_images')
                .insert(imageInserts);

            if (imagesError) throw imagesError;
        }

        // Insert specs
        if (formData.specs.length > 0) {
            const specsInserts = formData.specs
                .filter((spec) => spec.spec_key.trim())
                .map((spec) => ({
                    product_id: product.id,
                    spec_key: spec.spec_key,
                    spec_value: spec.spec_value,
                }));

            if (specsInserts.length > 0) {
                const { error: specsError } = await supabase
                    .from('product_specs')
                    .insert(specsInserts);

                if (specsError) throw specsError;
            }
        }

        // Insert categories
        if (formData.category_ids.length > 0) {
            const categoryInserts = formData.category_ids.map((catId) => ({
                product_id: product.id,
                category_id: catId,
            }));

            const { error: categoriesError } = await supabase
                .from('product_categories')
                .insert(categoryInserts);

            if (categoriesError) throw categoriesError;
        }
    };

    const updateProduct = async (productId: string) => {
        // Update product
        const { error: productError } = await supabase
            .from('products')
            .update({
                name: formData.name,
                sku: formData.sku || null,
                short_description: formData.short_description || null,
                description: formData.description || null,
                price: formData.price,
                stock: formData.stock,
                brand: formData.brand || null,
                published: formData.published,
                updated_at: new Date().toISOString(),
            })
            .eq('id', productId);

        if (productError) throw productError;

        // Delete existing images and insert new ones
        await supabase.from('product_images').delete().eq('product_id', productId);

        if (formData.images.length > 0) {
            const imageInserts = formData.images.map((img) => ({
                product_id: productId,
                url: img.url,
                alt_text: img.alt_text,
                position: img.position,
            }));

            const { error: imagesError } = await supabase
                .from('product_images')
                .insert(imageInserts);

            if (imagesError) throw imagesError;
        }

        // Delete existing specs and insert new ones
        await supabase.from('product_specs').delete().eq('product_id', productId);

        const validSpecs = formData.specs.filter((spec) => spec.spec_key.trim());
        if (validSpecs.length > 0) {
            const specsInserts = validSpecs.map((spec) => ({
                product_id: productId,
                spec_key: spec.spec_key,
                spec_value: spec.spec_value,
            }));

            const { error: specsError } = await supabase
                .from('product_specs')
                .insert(specsInserts);

            if (specsError) throw specsError;
        }

        // Delete existing categories and insert new ones
        await supabase.from('product_categories').delete().eq('product_id', productId);

        if (formData.category_ids.length > 0) {
            const categoryInserts = formData.category_ids.map((catId) => ({
                product_id: productId,
                category_id: catId,
            }));

            const { error: categoriesError } = await supabase
                .from('product_categories')
                .insert(categoryInserts);

            if (categoriesError) throw categoriesError;
        }
    };

    if (vendorLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Vendor Access Required
                </h2>
                <p className="text-gray-600 mb-6">
                    You need a vendor account to manage products.
                </p>
                <button
                    onClick={() => navigate('/vendor/profile')}
                    className="btn-primary"
                >
                    Set Up Vendor Profile
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/vendor/products')}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft size={20} />
                    Back to Products
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Product' : 'New Product'}
                </h1>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        Basic Information
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                placeholder="Enter product name"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    SKU
                                </label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) =>
                                        setFormData({ ...formData, sku: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="e.g., PROD-001"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Brand
                                </label>
                                <input
                                    type="text"
                                    value={formData.brand}
                                    onChange={(e) =>
                                        setFormData({ ...formData, brand: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="Enter brand name"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price *
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isPriceRange"
                                            checked={isPriceRange}
                                            onChange={(e) => setIsPriceRange(e.target.checked)}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                        <label htmlFor="isPriceRange" className="text-sm text-gray-600 cursor-pointer">
                                            Use price range
                                        </label>
                                    </div>

                                    {!isPriceRange ? (
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                                                }
                                                min="0"
                                                step="0.01"
                                                required
                                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p>Min Price</p>
                                            <div className="relative">

                                                <span className="absolute left-3 top-2.5 text-gray-500">$</span>

                                                <input
                                                    type="number"
                                                    value={priceRangeMin}
                                                    onChange={(e) => setPriceRangeMin(parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                                    placeholder="Min: 0.00"
                                                />
                                            </div>

                                            <p>Max Price</p>
                                            <div className="relative">

                                                <span className="absolute left-3 top-2.5 text-gray-500">$</span>

                                                <input
                                                    type="number"
                                                    value={priceRangeMax}
                                                    onChange={(e) => setPriceRangeMax(parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                                    placeholder="Max: 0.00"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stock *
                                </label>
                                <input
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) =>
                                        setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                                    }
                                    min="0"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Short Description
                            </label>
                            <input
                                type="text"
                                value={formData.short_description}
                                onChange={(e) =>
                                    setFormData({ ...formData, short_description: e.target.value })
                                }
                                maxLength={200}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                placeholder="Brief product description (max 200 characters)"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.short_description.length}/200 characters
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                rows={6}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                placeholder="Detailed product description"
                            />
                        </div>
                    </div>
                </div>

                {/* Images */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Images</h2>
                    <ImageUploader
                        images={formData.images}
                        onChange={(images) => setFormData({ ...formData, images })}
                        maxImages={10}
                    />
                </div>

                {/* Categories */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Categories *</h2>
                    <CategoryMultiSelect
                        selectedIds={formData.category_ids}
                        onChange={(ids) => setFormData({ ...formData, category_ids: ids })}
                    />
                </div>

                {/* Specifications */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        Specifications
                    </h2>
                    <SpecsEditor
                        specs={formData.specs}
                        onChange={(specs) => setFormData({ ...formData, specs })}
                    />
                </div>

                {/* Publishing */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Publishing</h2>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.published}
                            onChange={(e) =>
                                setFormData({ ...formData, published: e.target.checked })
                            }
                            className="w-5 h-5 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-900">
                                Publish this product
                            </span>
                            <p className="text-sm text-gray-500">
                                Published products are visible to customers
                            </p>
                        </div>
                    </label>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/vendor/products')}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                {isEditMode ? 'Update Product' : 'Create Product'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
