import { useState, useEffect, useRef, useCallback } from 'react';
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

/**
 * MobileSearch - Enhanced search component for mobile devices
 * 
 * Features:
 * - Full-width rounded input
 * - Debounced search (300ms)
 * - Keyboard and touch navigable suggestions
 * - Smart routing: products → /product/:id, categories → /shop?category=...
 * - Enter key → generic search results page
 * - Clear button
 * - Loading states
 */
export function MobileSearch() {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<SearchProduct[]>([]);
    const [categories, setCategories] = useState<SearchCategory[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const navigate = useNavigate();
    const debounceTimerRef = useRef<NodeJS.Timeout>();
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounced search function
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setProducts([]);
            setCategories([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoading(true);
        try {
            const { products: searchProducts, categories: searchCategories } =
                await searchProductsAndCategories(searchQuery);

            setProducts(searchProducts);
            setCategories(searchCategories);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle input change with debouncing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        setSelectedIndex(-1);

        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer for 300ms debounce
        debounceTimerRef.current = setTimeout(() => {
            performSearch(newQuery);
        }, 300);
    };

    // Clear search
    const handleClear = () => {
        setQuery('');
        setProducts([]);
        setCategories([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    // Handle product click
    const handleProductClick = async (product: SearchProduct) => {
        // Record analytics
        await incrementProductViewCount(product.id);
        await incrementProductSearchHitCount(product.id);

        // Navigate to product detail
        navigate(`/product/${product.id}`);

        // Close suggestions and clear
        setShowSuggestions(false);
        setQuery('');
    };

    // Handle category click
    const handleCategoryClick = async (category: SearchCategory) => {
        // Record analytics
        await recordCategoryAnalytics(category.id, category.name);

        // Navigate to shop with category filter
        navigate(`/shop?category=${category.name}`);

        // Close suggestions and clear
        setShowSuggestions(false);
        setQuery('');
    };

    // Handle Enter key - navigate to generic search results
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const totalItems = products.length + categories.length;

        if (e.key === 'Enter') {
            if (selectedIndex >= 0 && totalItems > 0) {
                // Navigate to selected item
                if (selectedIndex < products.length) {
                    handleProductClick(products[selectedIndex]);
                } else {
                    handleCategoryClick(categories[selectedIndex - products.length]);
                }
            } else if (query.trim()) {
                // Generic search results
                recordSearchAnalytics(query);
                navigate(`/shop?search=${encodeURIComponent(query)}`);
                setShowSuggestions(false);
                setQuery('');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const totalItems = products.length + categories.length;
    const hasResults = totalItems > 0;

    return (
        <div ref={searchRef} className="relative w-full">
            {/* Search Input */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {isLoading ? (
                        <Loader size={20} className="animate-spin" />
                    ) : (
                        <Search size={20} />
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products, brands and categories"
                    className="w-full pl-12 pr-12 py-3 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                    aria-label="Search"
                    aria-autocomplete="list"
                    aria-controls="search-suggestions"
                    aria-expanded={showSuggestions}
                />

                {/* Clear button */}
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Clear search"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
                <div
                    id="search-suggestions"
                    role="listbox"
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-slate-200 max-h-[400px] overflow-y-auto z-50"
                >
                    {hasResults ? (
                        <>
                            {/* Products Section */}
                            {products.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                                        Products
                                    </div>
                                    {products.map((product, index) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            role="option"
                                            aria-selected={selectedIndex === index}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${selectedIndex === index ? 'bg-slate-100' : ''
                                                }`}
                                        >
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="size-12 rounded-lg object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="size-12 bg-slate-200 rounded-lg shrink-0 flex items-center justify-center text-xs text-slate-500">
                                                    Image
                                                </div>
                                            )}
                                            <div className="flex-1 text-left">
                                                <p className="font-semibold text-slate-900 text-sm">{product.name}</p>
                                                {product.price && (
                                                    <p className="text-xs text-slate-500">${product.price.toFixed(2)}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Categories Section */}
                            {categories.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                                        Categories
                                    </div>
                                    {categories.map((category, index) => (
                                        <button
                                            key={category.id}
                                            onClick={() => handleCategoryClick(category)}
                                            role="option"
                                            aria-selected={selectedIndex === products.length + index}
                                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${selectedIndex === products.length + index ? 'bg-slate-100' : ''
                                                }`}
                                        >
                                            <p className="font-semibold text-slate-900 text-sm">{category.name}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : query.trim() && !isLoading ? (
                        <div className="px-4 py-8 text-center text-slate-500">
                            <p className="text-sm">No results found for "{query}"</p>
                            <p className="text-xs mt-1">Try a different search term</p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
