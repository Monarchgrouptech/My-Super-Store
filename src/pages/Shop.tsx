import { useEffect, useState } from 'react';
import { ChevronDown, SlidersHorizontal, Loader2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useSearchParams } from 'react-router-dom';

import { supabase } from '../lib/supabase';

interface Product {
  id: any;
  name: string;
  price: number;
  stock: number;
  brand?: string;
  sku?: string;
  short_description?: string;
  description?: string;
  image?: string;
  product_images?: { url: string; alt_text?: string; position?: number }[];
  category: string;
  product_specs?: { spec_key: string; spec_value: string }[];
  view_count?: number;
}

interface ShopProps {
  onNavigate: (page: string, productId?: any) => void;
}

export function Shop({ onNavigate }: ShopProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000000 });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');




  const categories = ['All', 'Cosmetics', 'Construction', 'Furniture', 'Clothing and Fashion', 'Events Tools', 'Electrical Appliances'];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const searchFromUrl = searchParams.get('search');

    setSelectedCategory(categoryFromUrl ?? 'All');
    setSearchTerm(searchFromUrl ?? '');
  }, [searchParams]);



  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch ALL published products with complete data including images, categories, and specs
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images ( url, alt_text, position ),
          product_categories (
            categories ( name )
          ),
          product_specs ( spec_key, spec_value )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched products:', data?.length); // Debug log

      // Transform data to match component needs
      const transformedProducts = data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock || 0,
        brand: p.brand,
        sku: p.sku,
        short_description: p.short_description,
        description: p.description,
        image: p.product_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url,
        product_images: p.product_images?.sort((a: any, b: any) => a.position - b.position) || [],
        category: p.product_categories?.[0]?.categories?.name || 'Uncategorized',
        product_specs: p.product_specs || [],
        view_count: p.view_count
      })) || [];

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products
    .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
    .filter(p => p.price >= priceRange.min && p.price <= priceRange.max)
    .filter(p =>
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.short_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return 0; // 'featured' or 'newest' (assuming default order is fine for now)
    });

  if (loading) {
    return (
      <div className="section flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[var(--gold-primary)]" size={48} />
      </div>
    );
  }

  return (
    <div className="page-fade section relative">
      {/* Header with Particles Behind */}
      <div className="relative min-h-[300px] flex items-center justify-center -mx-8 -mt-8 px-8 pt-8 mb-8" style={{ overflow: 'hidden' }}>
        <div className="absolute inset-0 z-0">

        </div>
        <div className="relative z-10 text-center">
          <h1 className="page-title" style={{ fontFamily: "'Oswald', sans-serif" }}>Luxury Collection</h1>
          <p className="page-desc">
            {searchTerm
              ? `${filteredProducts.length} results for “${searchTerm}”`
              : `${filteredProducts.length} exceptional pieces representing the pinnacle of craftsmanship.`}
          </p>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="filters-container">
        {/* Category Filters */}
        <div className="filter-group">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);

                if (category === 'All') {
                  searchParams.delete('category');
                  setSearchParams(searchParams);
                } else {
                  setSearchParams({
                    category,
                    ...(searchTerm && { search: searchTerm })
                  });
                }
              }}
              className={`filter-chip ${selectedCategory === category ? 'active' : ''}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Sort and Filter Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="link-gold"
            style={{ background: 'none', WebkitBackgroundClip: 'unset', color: 'var(--black)', display: 'flex', alignItems: 'center' }}
          >
            <SlidersHorizontal size={20} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
            Filters
          </button>
          <div className="sort-wrapper">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
            <ChevronDown
              size={16}
              className="sort-icon"
              strokeWidth={3}
            />
          </div>
        </div>
      </div>

      {/* Price Filter - Shows when Filters button is clicked */}
      {isFilterOpen && (
        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '0.95rem' }}>Price Range</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#666' }}>Min</label>
              <input
                type="number"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: Math.max(0, parseInt(e.target.value) || 0) })}
                min="0"
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                placeholder="$0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#666' }}>Max</label>
              <input
                type="number"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: Math.max(priceRange.min, parseInt(e.target.value) || 1000000) })}
                min="0"
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                placeholder="$10,000"
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>Min Price Slider</label>
              <input
                type="range"
                min="0"
                max={priceRange.max}
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: Math.min(parseInt(e.target.value), priceRange.max) })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>Max Price Slider</label>
              <input
                type="range"
                min={priceRange.min}
                max="10000"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: Math.max(priceRange.min, parseInt(e.target.value)) })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: '500' }}>
            ${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}
          </p>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id}>
            <ProductCard
              product={product}
              onProductClick={(id) => onNavigate('product', id)}
            />
          </div>
        ))}
      </div>

      {/* Load More */}
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <button className="load-more-btn">
          Load More
        </button>
      </div>
    </div>
  );
}