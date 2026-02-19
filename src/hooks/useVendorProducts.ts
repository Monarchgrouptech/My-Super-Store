import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductWithDetails } from '../types/vendor';

interface UseVendorProductsOptions {
    search?: string;
    publishedOnly?: boolean;
    limit?: number;
    offset?: number;
}

interface UseVendorProductsResult {
    products: ProductWithDetails[];
    loading: boolean;
    error: string | null;
    total: number;
    refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch vendor's products with search and pagination
 * @param options - Search, filter, and pagination options
 * @returns Products array, loading state, error, and total count
 */
export function useVendorProducts(options: UseVendorProductsOptions = {}): UseVendorProductsResult {
    const { search = '', publishedOnly = false, limit = 20, offset = 0 } = options;

    const [products, setProducts] = useState<ProductWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) throw authError;
            if (!user) throw new Error('User not authenticated');

            // Get vendor ID for current user
            const { data: vendorData, error: vendorError } = await supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (vendorError) throw vendorError;
            if (!vendorData) throw new Error('Vendor profile not found');

            // Build query
            let query = supabase
                .from('products')
                .select(`
          *,
          product_images(id, url, alt_text, position),
          product_specs(id, spec_key, spec_value),
          product_categories(categories(id, name, slug))
        `, { count: 'exact' })
                .eq('seller_id', vendorData.id)
                .order('created_at', { ascending: false });

            // Apply search filter
            if (search) {
                query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply published filter
            if (publishedOnly) {
                query = query.eq('published', true);
            }

            // Apply pagination
            query = query.range(offset, offset + limit - 1);

            const { data, error: productsError, count } = await query;

            if (productsError) throw productsError;

            setProducts(data as ProductWithDetails[] || []);
            setTotal(count || 0);
        } catch (err) {
            console.error('Error fetching vendor products:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [search, publishedOnly, limit, offset]);

    return {
        products,
        loading,
        error,
        total,
        refetch: fetchProducts,
    };
}
