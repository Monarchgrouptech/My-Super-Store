import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { ProductCarousel } from '../components/ProductCarousel';
import TypingText from '../components/TypingText';
import Reveal from '../components/Reveal';

import {
  ChevronRight,
  Sparkles,
  Users,
  Truck,
  ChevronDown,
} from 'lucide-react';

interface AboutProps {
  onNavigate: (page: string, productId?: any) => void;
}

export function About({ onNavigate }: AboutProps) {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);

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
    <div className="bg-[#050505] text-white min-h-screen selection:bg-[#D4AF37]/30 selection:text-white">
      {/* ================= HERO SECTION ================= */}
      <section className="relative w-full py-20 lg:py-36 px-6 lg:px-10 overflow-hidden border-b border-slate-900 bg-gradient-to-b from-[#110e05] via-[#050505] to-[#050505]">
        {/* Floating Ambient Glowing Blobs */}
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-[#D4AF37]/5 rounded-full filter blur-[80px] sm:blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-[#B8941F]/5 rounded-full filter blur-[60px] sm:blur-[100px] pointer-events-none" />

        {/* Diagonal Tech-line Overlay for Luxury/Precision vibe */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(212,175,55,0.05)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(212,175,55,0.05)_1px,_transparent_1px)] bg-[size:100px_100px] pointer-events-none" />

        <div className="w-full max-w-[1280px] mx-auto relative z-10">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* LEFT CONTENT */}
            <div className="flex flex-col gap-8 flex-1 text-center lg:text-left items-center lg:items-start lg:max-w-[50%]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  <span className="h-px w-8 bg-[#D4AF37]" />
                  <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
                    Est. 2024
                  </span>
                </div>

                <h1
                  className="text-white text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight"
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  <span className="block text-slate-400 text-2xl sm:text-3xl font-medium tracking-wide mb-2">My Super Store</span>
                  <TypingText
                    texts={[
                      'Collect the Exceptional.',
                      'Embrace Luxury.',
                      'Redefine Excellence.',
                    ]}
                  />
                </h1>

                <p className="text-base sm:text-lg text-slate-300 max-w-[540px] leading-relaxed">
                  Discover a vetted, edge-optimized marketplace where discerning collectors acquire authenticated masterpieces directly from heritage artisans and independent creators, delivered via our white-glove courier network.
                </p>
              </div>

              {/* CTA BUTTONS */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2 w-full">
                <button
                  onClick={() => navigate('/shop')}
                  className="group relative h-14 px-8 min-w-[180px] rounded-lg bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black font-extrabold uppercase shadow-lg transition active:scale-95 hover:shadow-[#D4AF37]/20 hover:shadow-xl cursor-pointer"
                >
                  Shop Collection
                </button>

                <button
                  onClick={() => navigate('/shop')}
                  className="h-14 px-8 min-w-[180px] rounded-lg border border-slate-700 bg-white/5 font-extrabold uppercase hover:bg-white/10 hover:border-[#D4AF37]/50 text-white transition cursor-pointer"
                >
                  Explore More
                </button>

                <button
                  onClick={() => navigate('/vendor/dashboard')}
                  className="h-14 px-8 min-w-[180px] rounded-lg bg-slate-900 text-[#D4AF37] font-extrabold uppercase border border-slate-800 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  Vendor Portal
                </button>
              </div>

              {/* KEY STATS QUICK VIEW */}
              <div className="flex items-center gap-8 pt-8 border-t border-slate-800/80 w-full justify-center lg:justify-start">
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent">
                    {featuredProducts.length || '8'}+
                  </p>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Luxury Pieces</p>
                </div>
                <div className="w-px h-10 bg-slate-800" />
                <div>
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Vetted Creators</p>
                </div>
                <div className="w-px h-10 bg-slate-800" />
                <div>
                  <p className="text-2xl font-bold text-white">Global</p>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">White-Glove Delivery</p>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE CURATED IMAGE GRID */}
            <div className="relative w-full lg:flex-1 flex justify-center items-center">
              {/* Decorative Frame */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] rounded-2xl transform rotate-3 opacity-20 scale-95 blur-sm" />
              
              <div className="relative w-full aspect-square max-h-[500px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/50 shadow-2xl group/image">
                {featuredProducts[0]?.image ? (
                  <img
                    src={featuredProducts[0].image}
                    alt={featuredProducts[0].name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover/image:scale-105 brightness-90 group-hover/image:brightness-100"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Sparkles className="text-[#D4AF37] size-12 animate-pulse" />
                    <span className="font-serif tracking-widest text-[#D4AF37] uppercase">Premium Curation</span>
                  </div>
                )}

                {/* Info Overlay */}
                <div className="absolute bottom-6 left-6 right-6 bg-[#0c0c0c]/90 border border-slate-800/80 backdrop-blur-md p-5 rounded-xl flex items-center justify-between shadow-xl">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">
                      Featured Collection Piece
                    </span>
                    <p className="font-bold text-base text-white mt-1">
                      {featuredProducts[0]?.name || 'Luxury Curated Item'}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      onNavigate('product', featuredProducts[0]?.id)
                    }
                    className="size-11 rounded-full bg-gradient-to-r from-[#BF953F] to-[#B38728] text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition cursor-pointer"
                  >
                    <ChevronRight size={22} className="text-black" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= ECOSYSTEM PILLARS ================= */}
      <section className="py-24 px-6 lg:px-10 bg-[#0c0c0c] border-b border-slate-900 relative">
        <div className="max-w-[1280px] mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-16 max-w-2xl mx-auto flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-widest font-extrabold text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1.5 rounded-full border border-[#D4AF37]/20">
              The Prestige Ecosystem
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white mt-2">
              A Unified Luxury Platform
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              We connect three distinct worlds into a seamless, trusted cycle of authenticated commerce, transparent tracking, and premium operations.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Collector Card */}
            <Reveal className="bg-[#050505] border border-slate-800 hover:border-[#D4AF37]/40 p-8 rounded-xl transition-all duration-300 hover:-translate-y-2 flex flex-col gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full pointer-events-none group-hover:bg-[#D4AF37]/10 transition-colors" />
              <div className="size-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37]">
                <Users size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">For Collectors</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Browse a rigorously authenticated catalog of premium goods. Experience secure payments, custom curation alerts, and dynamic real-time tracking for every unique acquisition.
                </p>
              </div>
              <ul className="text-xs text-slate-500 flex flex-col gap-2 mt-auto border-t border-slate-900 pt-4">
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Guaranteed Authenticity</li>
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Paystack Escrow Integration</li>
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Dedicated Customer Suite</li>
              </ul>
            </Reveal>

            {/* Creator Card */}
            <Reveal className="bg-[#050505] border border-slate-800 hover:border-[#D4AF37]/40 p-8 rounded-xl transition-all duration-300 hover:-translate-y-2 flex flex-col gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full pointer-events-none group-hover:bg-[#D4AF37]/10 transition-colors" />
              <div className="size-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37]">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">For Creators & Vendors</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Empower your brand with our premium digital storefront tools. Manage products, view rich sales analytics, sync real-time inventories, and interact directly with premium clientele.
                </p>
              </div>
              <ul className="text-xs text-slate-500 flex flex-col gap-2 mt-auto border-t border-slate-900 pt-4">
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Self-Service Inventory Sync</li>
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Detailed Revenue Insights</li>
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Infinite Marketplace Reach</li>
              </ul>
            </Reveal>

            {/* Courier Card */}
            <Reveal className="bg-[#050505] border border-slate-800 hover:border-[#D4AF37]/40 p-8 rounded-xl transition-all duration-300 hover:-translate-y-2 flex flex-col gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full pointer-events-none group-hover:bg-[#D4AF37]/10 transition-colors" />
              <div className="size-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37]">
                <Truck size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">For Logistics Partners</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Operate inside our edge-optimized routing interface. Manage pickup logs, declare custody hand-offs, and track multi-phase delivery updates directly to destination doorsteps.
                </p>
              </div>
              <ul className="text-xs text-slate-500 flex flex-col gap-2 mt-auto border-t border-slate-900 pt-4">
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Mobile-Optimized Driver App</li>
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Edge-Function Delivery Routing</li>
                <li className="flex items-center gap-2"><span className="size-1.5 bg-[#D4AF37] rounded-full" /> Direct Signature Validation</li>
              </ul>
            </Reveal>
          </div>

        </div>
      </section>

      {/* ================= TIMELINE SECTION ================= */}
      <section className="py-24 px-6 lg:px-10 bg-[#050505] border-b border-slate-900 relative">
        <div className="max-w-[800px] mx-auto">
          
          <div className="text-center mb-20 flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-widest font-extrabold text-[#D4AF37]">
              Our Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">
              The Evolution of Custody
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              How we built a comprehensive luxury network by connecting premium creators, logistics, and discerning collectors.
            </p>
          </div>

          {/* Timeline Nodes */}
          <div className="relative border-l border-slate-800 ml-4 md:ml-32 flex flex-col gap-16">
            
            {/* Node 1 */}
            <div className="relative pl-8 md:pl-12 group">
              {/* Date Marker (Desktop: positioned absolute on left line) */}
              <div className="hidden md:flex absolute right-full mr-8 top-1 text-right flex-col items-end w-32">
                <span className="text-lg font-bold text-white">2024</span>
                <span className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider">The Genesis</span>
              </div>
              {/* Mobile Date indicator */}
              <div className="md:hidden flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-[#D4AF37]">2024</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">— The Genesis</span>
              </div>
              {/* Bullet Node */}
              <div className="absolute left-0 top-1.5 -translate-x-1/2 size-4 rounded-full bg-[#050505] border-2 border-[#D4AF37] group-hover:bg-[#D4AF37] transition-all duration-300 shadow-[0_0_8px_#D4AF37]" />
              <h3 className="text-lg font-bold text-white mb-2">Curating the Exceptional</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                My Super Store was founded to bridge the gap between niche artisans producing highly exceptional pieces and collectors who value design. We began by sourcing and verifying rare items in small, limited collections.
              </p>
            </div>

            {/* Node 2 */}
            <div className="relative pl-8 md:pl-12 group">
              <div className="hidden md:flex absolute right-full mr-8 top-1 text-right flex-col items-end w-32">
                <span className="text-lg font-bold text-white">2025</span>
                <span className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider">Self-Service</span>
              </div>
              <div className="md:hidden flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-[#D4AF37]">2025</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">— Self-Service</span>
              </div>
              <div className="absolute left-0 top-1.5 -translate-x-1/2 size-4 rounded-full bg-[#050505] border-2 border-[#D4AF37] group-hover:bg-[#D4AF37] transition-all duration-300 shadow-[0_0_8px_#D4AF37]" />
              <h3 className="text-lg font-bold text-white mb-2">Empowering the Creator Economy</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                To scale our curation, we developed and launched our **Vendor Portal**, allowing independent boutique brands, designers, and heritage workshops to directly manage their products, analyze orders, and control their brand showcase autonomously.
              </p>
            </div>

            {/* Node 3 */}
            <div className="relative pl-8 md:pl-12 group">
              <div className="hidden md:flex absolute right-full mr-8 top-1 text-right flex-col items-end w-32">
                <span className="text-lg font-bold text-white">2026</span>
                <span className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider">Logistics Edge</span>
              </div>
              <div className="md:hidden flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-[#D4AF37]">2026</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">— Logistics Edge</span>
              </div>
              <div className="absolute left-0 top-1.5 -translate-x-1/2 size-4 rounded-full bg-[#050505] border-2 border-[#D4AF37] group-hover:bg-[#D4AF37] transition-all duration-300 shadow-[0_0_8px_#D4AF37]" />
              <h3 className="text-lg font-bold text-white mb-2">White-Glove & Edge Deployment</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We completed integration of our **Delivery Partner Dashboard** powered by edge-optimized logistics functions. This enables verified logistics partners to track and handle multi-phase deliveries, providing clients with unparalleled confidence and live custody hand-off verification.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ================= ACCORDION SECTION ================= */}
      <section className="py-24 px-6 lg:px-10 bg-[#0c0c0c] border-b border-slate-900 relative">
        <div className="max-w-[800px] mx-auto">
          
          <div className="text-center mb-16 flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-widest font-extrabold text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1.5 rounded-full border border-[#D4AF37]/20">
              The Authenticity Charter
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">
              Securing Luxury Commerce
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Our strict operation protocols ensure that trust is never compromised between buyers and vendors.
            </p>
          </div>

          {/* Accordion Panels */}
          <div className="flex flex-col gap-4">
            {[
              {
                title: "1. Vetted Artisans & Dual-Phase Inspection",
                desc: "We do not open our platform to general public sellers. Every vendor goes through an intensive business verification process. Additionally, high-value luxury goods undergo certified verification checks, ensuring the authenticity of hallmarks, raw materials, and serial numbers before shipping."
              },
              {
                title: "2. Escrow Payment Infrastructure",
                desc: "Your payment is fully secured. Utilizing our integration with Paystack infrastructure, client funds are held safely until the white-glove logistics partner updates the status to 'Delivered' and the collector confirms hand-off. Only then is vendor payout unlocked."
              },
              {
                title: "3. Smart Logistics Custody Hand-off",
                desc: "Through our edge-function logistics ecosystem, deliveries are logged at every checkpoint. Delivery drivers must use their designated portal to log exact pickup conditions, vehicle custody transition, and client signature validation at delivery."
              },
              {
                title: "4. Carbon-Neutral Curated Shipping",
                desc: "We offset the shipping footprint of all premium deliveries by bundling logistics routes through optimized batch-processing. Every delivery is handled by vetted, trained representatives, guaranteeing the items remain in pristine condition."
              }
            ].map((item, index) => {
              const isOpen = activeAccordion === index;
              return (
                <div 
                  key={index}
                  className="bg-[#050505] border border-slate-800 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setActiveAccordion(isOpen ? null : index)}
                    className="w-full py-5 px-6 flex items-center justify-between text-left font-bold text-white hover:text-[#D4AF37] transition-colors focus:outline-none cursor-pointer"
                  >
                    <span>{item.title}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-[#D4AF37] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div 
                    className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-60 border-t border-slate-900 py-5 px-6 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ================= FEATURED CAROUSEL SECTION ================= */}
      <section className="py-24 px-6 lg:px-10 bg-[#050505]">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-16">
            <div>
              <span className="text-xs uppercase tracking-widest font-extrabold text-[#D4AF37] mb-2 block">
                The Showcase
              </span>
              <h2 className="text-3xl font-bold font-serif text-white">
                Featured Masterpieces
              </h2>
              <p className="text-slate-400 text-sm max-w-xl mt-2">
                A dynamic selection of our most popular authenticated items from our global artisan catalog.
              </p>
            </div>
            <button
              onClick={() => onNavigate('shop')}
              className="px-6 py-2.5 rounded-lg border border-[#D4AF37]/40 text-[#D4AF37] font-semibold text-sm hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] transition cursor-pointer"
            >
              Browse Full Shop →
            </button>
          </div>

          {loading ? (
            <div className="w-full h-80 flex items-center justify-center">
              <div className="size-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ProductCarousel
              products={featuredProducts}
              onProductClick={(id) => onNavigate('product', id)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
