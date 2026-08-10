import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, SlidersHorizontal, Loader2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

import { supabase } from '../lib/supabase';
import { useCurrency } from '../context/CurrencyContext';

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
  slug?: string;
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
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [shopPage, setShopPage] = useState(0);
  const { formatPrice } = useCurrency();
  const categories = ['All', 'Cosmetics', 'Construction', 'Furniture', 'Clothing and Fashion', 'Events Tools', 'Electrical Appliances'];

  const normalizeCategoryValue = (value: string) =>
    decodeURIComponent(value).trim().toLowerCase().replace(/-/g, ' ');

  const resolveCategoryName = (value: string | null) => {
    if (!value) return 'All';
    const normalizedValue = normalizeCategoryValue(value);
    const matchedCategory = categories.find((category) => normalizeCategoryValue(category) === normalizedValue);
    return matchedCategory ?? 'All';
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const searchFromUrl = searchParams.get('search');

    setSelectedCategory(resolveCategoryName(categorySlug ?? categoryFromUrl));
    setSearchTerm(searchFromUrl ?? '');
    setShopPage(0); // reset page when filters change
  }, [categorySlug, searchParams]);

  const categoryDescriptions: Record<string, string> = {
    'Cosmetics': "Enhance your natural beauty with our exclusive collection of organic cosmetics, designer fragrances, and premium skincare from world-renowned luxury brands.",
    'Construction': "Discover premium hardware, building supplies, and professional-grade materials engineered for durability, safety, and high-precision engineering.",
    'Furniture': "Elevate your living spaces with hand-crafted statement furniture, minimalist office desks, and custom decor items representing the pinnacle of interior design.",
    'Clothing and Fashion': "Shop premium luxury apparel, bespoke couture, and runway-inspired fashion accessories curated from independent heritage designers.",
    'Events Tools': "Plan flawless events with professional sound systems, premium stage lighting tools, and elegant decoration equipment designed for high-profile celebrations.",
    'Electrical Appliances': "Experience high-performance home automation, state-of-the-art kitchen appliances, and cutting-edge consumer electronics.",
    'All': "Browse our complete collection of exceptional pieces representing the pinnacle of craftsmanship, luxury, and premium quality."
  };

  const seoTitle = selectedCategory && selectedCategory !== 'All' 
    ? `${selectedCategory} Collection` 
    : (searchTerm ? `Search results for "${searchTerm}"` : 'Luxury Collection');

  const seoDesc = selectedCategory && selectedCategory !== 'All'
    ? categoryDescriptions[selectedCategory]
    : (searchTerm ? `Browse search results for "${searchTerm}" at MySuperStore.` : categoryDescriptions['All']);

  const seoKeywords = `luxury products, online shopping nigeria, ${selectedCategory !== 'All' ? selectedCategory.toLowerCase() + ',' : ''} premium items, mysuperstore`;

  const robotsDirective = (searchTerm || categorySlug === 'gfygf' || selectedCategory.toLowerCase() === 'test')
    ? 'noindex, nofollow'
    : 'index, follow';



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

  const SHOP_PAGE_SIZE = 12;
  const totalShopPages = Math.ceil(filteredProducts.length / SHOP_PAGE_SIZE);
  const pagedProducts = filteredProducts.slice(shopPage * SHOP_PAGE_SIZE, (shopPage + 1) * SHOP_PAGE_SIZE);

  // ItemList Schema
  const itemListSchema = useMemo(() => {
    if (pagedProducts.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": selectedCategory === 'All' ? "Luxury Collection" : `${selectedCategory} Products`,
      "numberOfItems": filteredProducts.length,
      "itemListElement": pagedProducts.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://mysuperstore.co/product/${product.slug || product.id}`,
        "name": product.name,
        "image": product.image,
        "price": product.price,
        "priceCurrency": "NGN"
      }))
    };
  }, [pagedProducts, selectedCategory, filteredProducts.length]);

  // Breadcrumb Schema
  const breadcrumbSchema = useMemo(() => {
    const items = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://mysuperstore.co"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Shop",
        "item": "https://mysuperstore.co/shop"
      }
    ];

    if (selectedCategory && selectedCategory !== 'All') {
      const slug = selectedCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      items.push({
        "@type": "ListItem",
        "position": 3,
        "name": selectedCategory,
        "item": `https://mysuperstore.co/categories/${slug}`
      });
    }

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items
    };
  }, [selectedCategory]);

  // Combined schemas
  const shopSchemas = useMemo(() => {
    const schemas: any[] = [breadcrumbSchema];
    if (itemListSchema) schemas.push(itemListSchema);
    return schemas;
  }, [breadcrumbSchema, itemListSchema]);

  if (loading) {
    return (
      <div className="section flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[var(--gold-primary)]" size={48} />
      </div>
    );
  }

  return (
    <div className="page-fade section relative">
      <SEO 
        title={seoTitle} 
        description={seoDesc} 
        keywords={seoKeywords} 
        schema={shopSchemas} 
        robots={robotsDirective} 
      />
      {/* Breadcrumb Navigation */}
      <nav className="mb-4 text-sm text-gray-500 flex items-center gap-2 relative z-10" style={{ padding: '0 1rem' }}>
        <Link to="/" className="hover:text-[var(--gold-primary)] transition-colors">Home</Link>
        <span>/</span>
        <span className="text-gray-300">Shop</span>
        {selectedCategory !== 'All' && (
          <>
            <span>/</span>
            <span className="text-gray-300">{selectedCategory}</span>
          </>
        )}
      </nav>

      {/* Header with Particles Behind */}
      <div className="relative min-h-[180px] sm:min-h-[300px] flex items-center justify-center -mx-4 sm:-mx-8 -mt-8 px-4 sm:px-8 pt-8 mb-8" style={{ overflow: 'hidden' }}>
        <div className="relative z-10 text-center">
          <h1 className="page-title" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {selectedCategory === 'All' ? 'Luxury Collection' : `${selectedCategory} Products`}
          </h1>
          <p className="page-desc max-w-2xl mx-auto mt-2 text-slate-500 text-sm leading-relaxed">
            {searchTerm
              ? `${filteredProducts.length} results for “${searchTerm}”`
              : (categoryDescriptions[selectedCategory] || categoryDescriptions['All'])}
          </p>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="filters-container" style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        {/* Category Filters */}
        <div className="filter-group" style={{ padding: '0' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0 0.25rem' }}>
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
                placeholder={formatPrice(0)}
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
                placeholder={formatPrice(10000)}
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
            {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
          </p>
        </div>
      )}

      {/* Products Grid */}
 <div
  className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-3 md:gap-5"
>
  {pagedProducts.map((product) => (
    <div key={product.id}>
      <ProductCard
        product={product}
        onProductClick={(id) => onNavigate('product', id)}
      />
    </div>
  ))}
</div>

      {/* Pagination */}
      {totalShopPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: '2rem' }}>
          <button
            className="pagination-btn"
            onClick={() => { setShopPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={shopPage === 0}
            style={{ color: '#000', borderColor: 'rgba(0,0,0,0.3)', background: 'transparent' }}
          >← Prev</button>
          <span style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>
            Page {shopPage + 1} of {totalShopPages} &nbsp;({filteredProducts.length} items)
          </span>
          <button
            className="pagination-btn"
            onClick={() => { setShopPage(p => Math.min(totalShopPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={shopPage >= totalShopPages - 1}
            style={{ color: '#000', borderColor: 'rgba(0,0,0,0.3)', background: 'transparent' }}
          >Next →</button>
        </div>
      )}
    </div>
  );
}

