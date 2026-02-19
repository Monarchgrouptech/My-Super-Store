import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  searchProductsAndCategories,
  recordSearchAnalytics,
  recordCategoryAnalytics,
  incrementProductSearchHitCount,
  incrementProductViewCount
} from '../lib/searchUtils';
import { SearchProduct, SearchCategory } from '../types/search';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle the search when user types (debounced)
   */
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      const trimmedQuery = query.trim();

      if (trimmedQuery.length === 0) {
        setIsOpen(false);
        setProducts([]);
        setCategories([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchProductsAndCategories(trimmedQuery);
        setProducts(results.products);
        setCategories(results.categories);
        setIsOpen(true);
      } catch (error) {
        console.error('Search failed:', error);
        setProducts([]);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [query]);

  /**
   * Handle search submission (Enter key or Search button)
   * Only records analytics if there are actual results
   */
  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    navigate(`/shop?search=${encodeURIComponent(trimmedQuery)}`);

    if (!trimmedQuery) {
      setIsOpen(false);
      return;
    }

    // Check if search is "successful" (has results)
    const hasResults = products.length > 0 || categories.length > 0;

    if (!hasResults) {
      // Don't record analytics for empty searches
      console.log('Search query has no results:', trimmedQuery);
      return;
    }

    // Record analytics for successful search
    await recordSearchAnalytics(trimmedQuery);

    // If a category was matched, record category analytics and increment search_hit_count
    if (categories.length > 0) {
      const firstCategory = categories[0];
      await recordCategoryAnalytics(firstCategory.id, firstCategory.name);

      // Navigate to shop filtered by category
      navigate(`/shop?category=${encodeURIComponent(firstCategory.slug)}&search=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setQuery('');
      return;
    }

    // If a product was matched, increment search_hit_count and navigate to first product
    if (products.length > 0) {
      const firstProduct = products[0];
      await incrementProductSearchHitCount(firstProduct.id);

      // Navigate to product detail
      navigate(`/product/${firstProduct.slug}?search=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setQuery('');
      return;
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();

    }
  };

  /**
   * Handle product click - increment view count and navigate
   */
  const handleProductClick = async (product: SearchProduct) => {
    // Non-blocking increment of view count
    incrementProductViewCount(product.id).catch((error) => {
      console.error('Failed to increment view count, but navigation will proceed:', error);
    });

    navigate(`/product/${encodeURIComponent(product.id)}`);
    setIsOpen(false);
    setQuery('');
  };

  /**
   * Handle category click - record analytics and navigate
   */
  const handleCategoryClick = async (category: SearchCategory) => {
    // Record analytics
    await recordCategoryAnalytics(category.id, category.name);
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      await recordSearchAnalytics(trimmedQuery);
    }

    navigate(`/shop?category=${encodeURIComponent(category.slug)}`);
    setIsOpen(false);
    setQuery('');
  };

  /**
   * Clear the search input
   */
  const handleClear = () => {
    setQuery('');
    setProducts([]);
    setCategories([]);
    setIsOpen(false);
  };

  const hasResults = products.length > 0 || categories.length > 0;

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-5 w-5 text-slate-400" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search products or categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 bg-white/80 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
        />

        {/* Clear Button or Loading Indicator */}
        <div className="absolute right-3">
          {isLoading ? (
            <Loader className="h-5 w-5 text-blue-500 animate-spin" strokeWidth={2} />
          ) : query && (
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-slate-500">
              <Loader className="h-5 w-5 animate-spin mx-auto mb-2" strokeWidth={2} />
              Searching...
            </div>
          )}

          {!isLoading && !hasResults && query.trim() && (
            <div className="p-4 text-center text-slate-500">
              No products or categories found for "{query}"
            </div>
          )}

          {!isLoading && hasResults && (
            <>
              {/* Products Section */}
              {products.length > 0 && (
                <div className="border-b border-slate-200">
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                    Products
                  </div>
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex gap-3 items-start">
                        {/* Product Image */}
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-12 w-12 bg-slate-200 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-slate-200 rounded flex-shrink-0 flex items-center justify-center text-xs text-slate-500">
                            Image
                          </div>
                        )}

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-slate-900 truncate">
                            {product.name}
                          </h4>
                          {product.short_description && (
                            <p className="text-xs text-slate-600 truncate">
                              {product.short_description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-blue-600">
                              ${product.price.toFixed(2)}
                            </span>
                            {product.category_name && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {product.category_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Categories Section */}
              {categories.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                    Categories
                  </div>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <h4 className="font-semibold text-sm text-slate-900">{category.name}</h4>
                      {category.parent_id && (
                        <p className="text-xs text-slate-500 mt-1">Subcategory</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
