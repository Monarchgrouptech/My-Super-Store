import { supabase } from './supabase';
import { SearchProduct, SearchCategory } from '../types/search';

/**
 * Search products and categories in Supabase
 * Returns only published products and all matching categories
 * Uses case-insensitive ILIKE-style matching
 */
export async function searchProductsAndCategories(
  query: string
): Promise<{ products: SearchProduct[]; categories: SearchCategory[] }> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { products: [], categories: [] };
  }

  try {
    // Search products - only published ones
    const { data: products, error: productError } = await supabase
      .from('products')
      .select(`
        id, 
        name, 
        slug, 
        price, 
        short_description, 
        view_count, 
        search_hit_count, 
        published,
        product_images ( url, alt_text, position )
      `)
      .eq('published', true)
      .or(`name.ilike.%${trimmedQuery}%,slug.ilike.%${trimmedQuery}%`)
      .limit(10);

    if (productError) {
      console.error('Error searching products:', productError);
    }

    // Search categories
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .or(`name.ilike.%${trimmedQuery}%,slug.ilike.%${trimmedQuery}%`)
      .limit(10);

    if (categoryError) {
      console.error('Error searching categories:', categoryError);
    }

    return {
      products: (products || []).map((p: any) => ({
        ...p,
        image_url: p.product_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url || null
      })) as SearchProduct[],
      categories: (categories || []) as SearchCategory[]
    };
  } catch (error) {
    console.error('Unexpected error during search:', error);
    return { products: [], categories: [] };
  }
}

/**
 * Record a successful search in the popular_searches table
 * Increments search_count if the query already exists
 */
export async function recordSearchAnalytics(query: string): Promise<void> {
  const trimmedQuery = query.trim().toLowerCase();

  try {
    // Upsert into popular_searches
    const { error } = await supabase
      .from('popular_searches')
      .upsert(
        {
          query: trimmedQuery,
          search_count: 1,
          last_searched_at: new Date().toISOString()
        },
        { onConflict: 'query' }
      );

    if (error) {
      console.error('Error recording search analytics:', error);
    }
  } catch (error) {
    console.error('Unexpected error recording search analytics:', error);
  }
}

/**
 * Record a category search in the popular_categories table
 * Increments search_count if the category already exists
 */
export async function recordCategoryAnalytics(
  categoryId: string,
  categoryName: string
): Promise<void> {
  try {
    // Upsert into popular_categories
    const { error } = await supabase
      .from('popular_categories')
      .upsert(
        {
          category_id: categoryId,
          category_name: categoryName,
          search_count: 1,
          last_searched_at: new Date().toISOString()
        },
        { onConflict: 'category_id' }
      );

    if (error) {
      console.error('Error recording category analytics:', error);
    }
  } catch (error) {
    console.error('Unexpected error recording category analytics:', error);
  }
}

/**
 * Increment the search_hit_count for a product
 * Called when a search result is returned for a product
 */
export async function incrementProductSearchHitCount(productId: string): Promise<void> {
  try {
    // Get current count
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('search_hit_count')
      .eq('id', productId)
      .single();

    if (fetchError) {
      console.error('Error fetching product search hit count:', fetchError);
      return;
    }

    const currentCount = data?.search_hit_count || 0;

    // Update with incremented count
    const { error: updateError } = await supabase
      .from('products')
      .update({ search_hit_count: currentCount + 1 })
      .eq('id', productId);

    if (updateError) {
      console.error('Error incrementing product search hit count:', updateError);
    }
  } catch (error) {
    console.error('Unexpected error incrementing search hit count:', error);
  }
}

/**
 * Increment the view_count for a product
 * Called when a user clicks on a product to view details
 * Non-blocking: doesn't prevent navigation if it fails
 */
export async function incrementProductViewCount(productId: string): Promise<void> {
  try {
    // Get current count
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('view_count')
      .eq('id', productId)
      .single();

    if (fetchError) {
      console.error('Error fetching product view count:', fetchError);
      return;
    }

    const currentCount = data?.view_count || 0;

    // Update with incremented count
    const { error: updateError } = await supabase
      .from('products')
      .update({ view_count: currentCount + 1 })
      .eq('id', productId);

    if (updateError) {
      console.error('Error incrementing product view count:', updateError);
    }
  } catch (error) {
    console.error('Unexpected error incrementing view count:', error);
  }
}
