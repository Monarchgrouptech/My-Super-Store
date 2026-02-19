import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LuxuryCategoryCard } from '../components/home/LuxuryCategoryCard';

import { HeroCarousel } from '../components/home/HeroCarousel';
import { AutoScrollProductSection } from '../components/home/AutoScrollProductSection';

// Keep the Product interface here for data fetching typing, or move to a types file
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

interface Category {
  id: string;
  name: string;
}

const PRODUCTS_PER_SECTION = 8;

export function Home() {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [seasonalProducts, setSeasonalProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [electronicsProducts, setElectronicsProducts] = useState<Product[]>([]);
  const [fashionProducts, setFashionProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const recommendedSeedRef = useRef(Math.random());

  // Memoize a random product for the Promo Banner
  const promoProduct = useMemo(() => {
    if (allProducts.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * allProducts.length);
    return allProducts[randomIndex];
  }, [allProducts]);

  // Fetch products
  const fetchAllProducts = async () => {
    try {
      setLoading(true);
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

      // Transform data
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
        view_count: p.view_count || 0,
      })) || [];

      setAllProducts(transformedProducts);
      return transformedProducts;
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Process products after fetching
  const processProducts = (products: Product[]) => {
    // Filter products with images only
    const productsWithImages = products.filter(p => p.image && p.image.trim() !== '');

    // Trending: sorted by view_count
    const trending = [...productsWithImages]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, PRODUCTS_PER_SECTION);
    setTrendingProducts(trending);

    // Seasonal: duplicate of trending (same logic)
    const seasonal = [...productsWithImages]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, PRODUCTS_PER_SECTION);
    setSeasonalProducts(seasonal);

    // Recommended: randomized with session seed
    const seed = recommendedSeedRef.current;
    const recommended = [...productsWithImages]
      .sort(() => Math.sin(seed * (Math.random() + 1)) - 0.5)
      .slice(0, PRODUCTS_PER_SECTION);
    setRecommendedProducts(recommended);

    // Electronics: filtered by category with images
    const electronics = productsWithImages
      .filter(p => p.category === 'Electrical Appliances')
      .slice(0, PRODUCTS_PER_SECTION);
    setElectronicsProducts(electronics);

    // Fashion: filtered by category with images
    const fashion = productsWithImages
      .filter(p => p.category === 'Clothing and Fashion')
      .slice(0, PRODUCTS_PER_SECTION);
    setFashionProducts(fashion);
  };

  // Load all data on mount
  useEffect(() => {
    const loadAllData = async () => {
      await fetchCategories();
      const products = await fetchAllProducts();
      processProducts(products);
    };

    loadAllData();
  }, []);

  // Removed the setInterval auto-rotate effect for carousels

  return (
    <main className="bg-white">
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes goldGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.3), 0 0 40px rgba(212, 175, 55, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(212, 175, 55, 0.5), 0 0 60px rgba(212, 175, 55, 0.2);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        .animate-gold-glow {
          animation: goldGlow 3s ease-in-out infinite;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* ================= DESKTOP 3-COLUMN GRID (lg+) / MOBILE STACK ================= */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-4 lg:px-4 lg:py-4">

        {/* LEFT COLUMN: Hero Carousel - 50% on desktop */}
        <section className="relative w-full h-[400px] sm:h-[450px] md:h-[550px] lg:col-span-6 lg:h-[600px] bg-gradient-to-br from-[#0F0F0F] via-[#1A1A1A] to-[#0F0F0F] overflow-hidden group lg:rounded-2xl">
          {/* Auto-sliding carousel background */}
          <HeroCarousel />

          {/* Content */}
          <div className="absolute inset-0 flex items-start sm:items-center px-3 py-4 sm:px-6 md:px-8 lg:px-6 z-10">
            <div
              className="w-full max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl bg-black/40 backdrop-blur-sm p-3 sm:p-4 md:p-6 lg:p-6 rounded-lg md:rounded-xl lg:rounded-2xl"
              style={{ animation: 'slideUp 0.8s ease-out' }}
            >
              <div className="inline-block mb-2 sm:mb-3 md:mb-4 lg:mb-4">
                <span className="text-[10px] sm:text-xs md:text-sm font-bold sm:font-extrabold uppercase tracking-wider sm:tracking-widest bg-[rgba(212,175,55,0.25)] px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full border border-[rgba(212,175,55,0.6)] shadow-md">
                  ✨ Premium
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-4xl xl:text-5xl mb-2 sm:mb-3 md:mb-4 lg:mb-3 leading-tight text-white font-extrabold" style={{ fontFamily: 'dosis', textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
                Discover <span className="bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>Luxury</span>
              </h1>
              <p className="hidden sm:block text-sm md:text-base lg:text-sm xl:text-base text-white mb-4 md:mb-6 lg:mb-4 leading-relaxed" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
                Explore our curated collection of premium products.
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="relative group/btn inline-block w-full"
              >
                <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] rounded-lg sm:rounded-xl opacity-50 group-hover/btn:opacity-100 blur transition duration-500 group-hover/btn:duration-200" />
                <div className="relative bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] text-[#050505] px-4 py-2 sm:px-5 sm:py-2.5 md:px-8 md:py-3 lg:px-6 lg:py-2.5 rounded-lg sm:rounded-xl font-extrabold text-xs sm:text-sm md:text-base lg:text-sm hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] sm:hover:shadow-[0_20px_40px_rgba(212,175,55,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95 text-center">
                  Shop Now
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: Promo Banner - 25% on desktop */}
        <section className="w-full bg-gradient-to-b from-[rgba(255,229,92,0.05)] via-white to-[rgba(212,175,55,0.03)] py-6 lg:py-0 lg:col-span-3 border-y lg:border-0 border-[rgba(212,175,55,0.2)] mt-4 lg:mt-0">
          <div className="mx-auto px-6 lg:px-2 h-full flex items-center">
            {promoProduct ? (
              <div
                className="relative rounded-[24px] lg:rounded-2xl overflow-hidden group cursor-pointer border-2 border-[rgba(212,175,55,0.3)] hover:border-[rgba(212,175,55,0.8)] transition-all duration-500 w-full"
                onClick={() => navigate(`/product/${promoProduct.id}`)}
              >
                <img
                  src={promoProduct.image}
                  alt={promoProduct.name}
                  className="w-full lg:h-[600px] object-cover rounded-[22px] lg:rounded-xl group-hover:scale-110 transition-transform duration-700 brightness-95 group-hover:brightness-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 group-hover:to-black/60 transition-all duration-500 rounded-[22px] lg:rounded-xl" />
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <h3 className="text-white font-extrabold text-lg truncate shadow-black drop-shadow-md">
                    {promoProduct.name}
                  </h3>
                  <p className="text-[#D4AF37] font-bold text-sm">
                    ${promoProduct.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full lg:h-[600px] bg-slate-100 animate-pulse rounded-[22px] lg:rounded-xl" />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Hot Categories - 25% on desktop */}
        <div className="lg:col-span-3 mt-4 lg:mt-0 lg:h-[600px] flex flex-col">

          {/* Hot Categories */}
          <div className="w-full flex-1 flex flex-col lg:overflow-hidden">
            <div className="mb-4 lg:mb-3 flex-shrink-0">
              <h2 className="text-2xl lg:text-xl font-extrabold bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent flex items-center gap-2">
                🔥 Hot Categories
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-3 lg:gap-2 lg:overflow-y-auto lg:pr-2 scrollbar-hide">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-[16px] h-32 lg:h-24 bg-slate-100 animate-pulse flex-shrink-0" />
                ))
              ) : categories.filter(cat => allProducts.some(p => p.category === cat.name && p.image && p.image.trim() !== '')).length > 0 ? (
                categories
                  .filter(cat => allProducts.some(p => p.category === cat.name && p.image && p.image.trim() !== ''))
                  .map((cat) => (
                    <LuxuryCategoryCard
                      key={cat.id}
                      category={cat}
                      products={allProducts}
                    />
                  ))
              ) : (
                <p className="col-span-full text-slate-500 text-sm">No categories found</p>
              )}
            </div>
          </div>
        </div>

        {/* Featured Products - Two-Row Auto-scrolling Carousel - Desktop only */}
        {trendingProducts.length > 0 && (
          <div className="hidden lg:block lg:col-span-12 mt-4">
            <AutoScrollProductSection title="⭐ Featured Products" products={trendingProducts} />
          </div>
        )}

        {/* ================= SEASONAL PRODUCTS WITH SALES BANNER ================= */}
        {seasonalProducts.length > 0 && (
          <div className="lg:col-span-12 mt-4 w-full bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent">
                🎉 Seasonal Products
              </h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Carousel - Left side, takes more space */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-4 overflow-hidden py-2">
                  {/* Row 1 - Scroll Left */}
                  <div className="relative w-full overflow-hidden">
                    <div className="flex gap-4 animate-scroll w-max hover:pause">
                      {[...seasonalProducts, ...seasonalProducts, ...seasonalProducts].map((product, index) => (
                        <div
                          key={`seasonal-row1-${product.id}-${index}`}
                          onClick={() => navigate(`/product/${product.id}`)}
                          className="flex-shrink-0 w-[220px] bg-white border border-slate-100 rounded-xl p-3 cursor-pointer hover:shadow-lg hover:border-[#D4AF37]/30 transition-all duration-300 group"
                        >
                          <div className="relative aspect-square mb-3 overflow-hidden rounded-lg bg-slate-50">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 truncate mb-1">{product.name}</h3>
                          <div className="flex items-center justify-between">
                            <p className="text-base font-extrabold text-[#D4AF37]">${product.price.toFixed(2)}</p>
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {product.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 2 - Scroll Right (Reverse) */}
                  <div className="relative w-full overflow-hidden">
                    <div className="flex gap-4 animate-scroll-reverse w-max hover:pause">
                      {[...seasonalProducts].reverse().concat([...seasonalProducts].reverse()).concat([...seasonalProducts].reverse()).map((product, index) => (
                        <div
                          key={`seasonal-row2-${product.id}-${index}`}
                          onClick={() => navigate(`/product/${product.id}`)}
                          className="flex-shrink-0 w-[220px] bg-white border border-slate-100 rounded-xl p-3 cursor-pointer hover:shadow-lg hover:border-[#D4AF37]/30 transition-all duration-300 group"
                        >
                          <div className="relative aspect-square mb-3 overflow-hidden rounded-lg bg-slate-50">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-30% h-20% object-contain group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 truncate mb-1">{product.name}</h3>
                          <div className="flex items-center justify-between">
                            <p className="text-base font-extrabold text-[#D4AF37]">${product.price.toFixed(2)}</p>
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {product.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Flash Sales Banner - Right side */}
              <div className="flex-shrink-0 w-20% lg:w-[280px] relative rounded-xl overflow-hidden border-2 border-[rgba(212,175,55,0.3)] hover:border-[rgba(212,175,55,0.8)] transition-all duration-500 group cursor-pointer" style={{ minHeight: '300px' }}>
                <img
                  src="https://via.placeholder.com/300x400?text=FLASH+SALES"
                  alt="Flash Sales & Offers"
                  className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 group-hover:to-black/50 transition-all duration-500 rounded-xl flex items-end justify-start p-4" />
                <div className="absolute bottom-4 left-4 right-4 z-10 text-white">
                  <p className="text-xs font-bold opacity-90 uppercase tracking-wider">Flash</p>
                  <h3 className="text-xl font-extrabold text-[#FFE55C]">Sales</h3>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= FULL-WIDTH CATEGORY CAROUSEL (Mobile Featured Categories) ================= */}
      <section className="lg:hidden w-full max-w-[4000px] mx-auto mt-8">
        {/* Top gold divider */}
        <div className="h-[4px] bg-gradient-to-r from-[rgba(95,82,17,0.71)] via-[#D4AF37] to-[rgba(46,38,0,0.94)] opacity-50 mb-20" />

        <div className="relative mb-20 bg-black py-12 px-6 lg:px-10">
          <h2 style={{ fontFamily: 'revert' }} className="text-5xl md:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent">
            Shop by Category
          </h2>

          <div className="h-[4px] w-48 bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] rounded-full mt-6 shadow-lg shadow-[#D4AF37]/40" />
        </div>

        <div className="py-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[16px] h-40 bg-slate-100 animate-pulse" />
            ))
          ) : categories.filter(cat => allProducts.some(p => p.category === cat.name && p.image && p.image.trim() !== '')).length > 0 ? (
            categories
              .filter(cat => allProducts.some(p => p.category === cat.name && p.image && p.image.trim() !== ''))
              .map((cat) => (
                <LuxuryCategoryCard
                  key={cat.id}
                  category={cat}
                  products={allProducts}
                />
              ))
          ) : (
            <p className="col-span-full text-slate-500">No categories with images found</p>
          )}
        </div>
      </section>

      {/* ================= TRENDING PRODUCTS ================= */}
      <div className="mt-8 px-4">
        <AutoScrollProductSection title="🔥 Trending Products" products={trendingProducts} />
      </div>

      {/* ================= RECOMMENDED FOR YOU ================= */}
      <div className="mt-8 px-4">
        <AutoScrollProductSection title="💎 Recommended For You" products={recommendedProducts} />
      </div>

      {/* ================= ELECTRONICS PICKS ================= */}
      <div className="mt-8 px-4">
        <AutoScrollProductSection title="⚡ Electronics Picks" products={electronicsProducts} />
      </div>

      {/* ================= FASHION ESSENTIALS ================= */}
      <div className="mt-8 px-4 mb-8">
        <AutoScrollProductSection title="👗 Fashion Essentials" products={fashionProducts} />
      </div>

      {/* ================= LUXURY FULL WIDTH AD ================= */}
      <section className="w-full py-20 bg-gradient-to-b from-[#0F0F0F] via-[#1A1A1A] to-[#0F0F0F] relative overflow-hidden group">
        {/* Decorative gold accent lights */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#FFE55C] rounded-full mix-blend-screen filter blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] bg-[#D4AF37] rounded-full mix-blend-screen filter blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />

        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 relative z-10">
          <div className="relative rounded-[24px] overflow-hidden group cursor-pointer border-2 border-[rgba(212,175,55,0.3)] hover:border-[rgba(212,175,55,0.8)] transition-all duration-500">
            <img
              src="https://via.placeholder.com/1600x400"
              alt="Bottom Ad"
              className="w-full rounded-[22px] group-hover:scale-110 transition-transform duration-700 brightness-75 group-hover:brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFE55C]/50 via-[#D4AF37]/30 to-[#B8941F]/50 group-hover:from-[#FFE55C]/70 group-hover:via-[#D4AF37]/50 group-hover:to-[#B8941F]/70 transition-all duration-500 rounded-[22px]" />
          </div>
        </div>
      </section>
    </main>
  );
}
