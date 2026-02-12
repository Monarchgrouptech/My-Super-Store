import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { ProductCarousel } from '../components/ProductCarousel';
import TypingText from '../components/TypingText';
import Reveal from '../components/Reveal';

import {
  Star,
  Shield,
  Truck,
  ChevronRight,
} from 'lucide-react';

interface AboutProps {
  onNavigate: (page: string, productId?: any) => void;
}

export function About({ onNavigate }: AboutProps) {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_images (url, alt_text, position),
            product_categories (
              categories (name)
            )
          `)
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) throw error;

        if (data) {
          setFeaturedProducts(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              short_description: p.short_description,
              image:
                p.product_images
                  ?.sort(
                    (a: any, b: any) =>
                      (a.position || 0) - (b.position || 0)
                  )[0]?.url || null,
              product_images:
                p.product_images?.sort(
                  (a: any, b: any) =>
                    (a.position || 0) - (b.position || 0)
                ) || [],
              category:
                p.product_categories?.[0]?.categories?.name ||
                'Uncategorized',
            }))
          );
        }
      } catch (err) {
        console.error('Error loading featured products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <div>
      {/* ================= HERO SECTION ================= */}
      <main className="flex items-center justify-center w-full py-12 lg:py-20 px-6 lg:px-10">
        <div className="w-full max-w-[1280px]">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-16 lg:gap-32">

            {/* LEFT CONTENT */}
            <div className="flex flex-col gap-8 flex-1 lg:max-w-[50%]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-px w-8 bg-[#d4af37]" />
                  <span className="text-[#d4af37] text-xs font-bold uppercase tracking-widest">
                    Est. 2024
                  </span>
                </div>

                <h1
                  className="text-slate-900 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1]"
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    textShadow:
                      '0 0 6px rgba(236,211,141,0.03), 0 0 14px rgba(231,227,214,0.36)',
                  }}
                >
                  <TypingText
                    texts={[
                      'Collect the Exceptional.',
                      'Embrace Luxury.',
                      'Redefine Excellence.',
                    ]}
                  />
                </h1>

                <p className="text-lg sm:text-xl text-slate-600 max-w-[540px]">
                  Discover a curated selection of artifacts designed for the few,
                  not the many. Elevate your everyday with unparalleled craftsmanship.
                </p>
              </div>

              {/* CTA BUTTONS */}
              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={() => navigate('/shop')}
                  className="group relative h-14 px-8 min-w-[180px] rounded-lg bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-white font-bold uppercase shadow-lg transition active:scale-95"
                >
                  Shop Collection
                </button>

                <button
                  onClick={() => navigate('/shop')}
                  className="h-14 px-8 min-w-[180px] rounded-lg border border-slate-200 font-bold uppercase hover:bg-slate-50"
                >
                  Explore More
                </button>

                <button
                  onClick={() => navigate('/vendor/dashboard')}
                  className="h-14 px-8 min-w-[180px] rounded-lg bg-slate-900 text-white font-bold uppercase border border-slate-700 hover:bg-slate-800"
                >
                  Vendor Portal
                </button>

                <button
                  onClick={() => navigate('/admin')}
                  className="h-14 px-8 min-w-[180px] rounded-lg bg-gradient-to-r from-[#8B0000] to-[#DC143C] text-white font-bold uppercase border border-[#8B0000] hover:from-[#A00000] hover:to-[#E63049] transition"
                >
                  Admin Dashboard
                </button>
              </div>

              {/* TRUST */}
              <div className="flex items-center gap-8 pt-8 border-t border-slate-100">
                <div>
                  <p className="text-2xl font-bold">{featuredProducts.length}+</p>
                  <p className="text-sm text-slate-500">Exclusive Items</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold">Global</p>
                  <p className="text-sm text-slate-500">Shipping Available</p>
                </div>
              </div>
            </div>

            {/* RIGHT FEATURED IMAGE */}
            <div className="relative w-full lg:flex-1 aspect-square max-h-[700px]">
              <div className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-100 shadow-2xl">
                {featuredProducts[0]?.image ? (
                  <img
                    src={featuredProducts[0].image}
                    alt={featuredProducts[0].name}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    Premium Collection
                  </div>
                )}

                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                      Featured Collection
                    </p>
                    <p className="font-bold text-lg">
                      {featuredProducts[0]?.name || 'Luxury Items'}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      onNavigate('product', featuredProducts[0]?.id)
                    }
                    className="size-10 rounded-full bg-black text-white flex items-center justify-center"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ================= FEATURED CAROUSEL ================= */}
      <section className="section">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-serif text-[#D4AF37] mb-4">
              Featured Collection
            </h2>
            <p className="text-muted max-w-xl">
              Curated selection of our most exclusive pieces.
            </p>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="link-gold"
          >
            View All →
          </button>
        </div>

        {!loading && (
          <ProductCarousel
            products={featuredProducts}
            onProductClick={(id) => onNavigate('product', id)}
          />
        )}
      </section>

      {/* ================= FEATURES ================= */}
      <section className="features-section">
        <div className="container grid grid-cols-3 gap-12">
          <Reveal className="feature-item">
            <Star size={32} />
            <h4>Premium Quality</h4>
            <p>Only the finest materials</p>
          </Reveal>

          <Reveal className="feature-item">
            <Shield size={32} />
            <h4>Authenticity Guaranteed</h4>
            <p>Verified & certified</p>
          </Reveal>

          <Reveal className="feature-item">
            <Truck size={32} />
            <h4>White Glove Delivery</h4>
            <p>Luxury shipping worldwide</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
