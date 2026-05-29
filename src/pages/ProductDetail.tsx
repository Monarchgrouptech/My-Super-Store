import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Truck, Shield, RotateCcw, Star, Minus, Plus, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { LoginPrompt } from '../components/LoginPrompt';

import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('One Size');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { formatPrice } = useCurrency();

  const sizes = ['Small', 'Medium', 'Large', 'One Size'];

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const productQuery = supabase
        .from('products')
        .select(`
          *,
          product_images ( url, alt_text, position ),
          product_categories (
            categories ( name, slug )
          ),
          product_specs ( spec_key, spec_value )
        `);

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const { data, error } = await (uuidPattern.test(id ?? '')
        ? productQuery.eq('id', id).single()
        : productQuery.eq('slug', id).single());

      if (error) throw error;

      setProduct({
        ...data,
        slug: data.slug,
        image: data.product_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url,
        category: data.product_categories?.[0]?.categories?.name || 'Uncategorized',
        product_images: data.product_images?.sort((a: any, b: any) => a.position - b.position) || [],
        product_specs: data.product_specs || []
      });
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product) {
      // Set Page Title, Description, and Keywords
      document.title = `${product.name} | MySuperStore Nigeria`;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      const descText = product.short_description || product.description || "Premium product from MySuperStore.";
      metaDesc.setAttribute('content', descText.slice(0, 155));

      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', `${product.name.toLowerCase()}, ${product.category?.toLowerCase() || 'product'}, premium shopping, mysuperstore`);

      // Inject JSON-LD Schema
      const schemaProduct = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": product.product_images?.map((img: any) => img.url) || [product.image],
        "description": product.short_description || product.description || "Premium product from MySuperStore",
        "sku": product.sku || `MSS-${product.id}`,
        "brand": {
          "@type": "Brand",
          "name": product.brand || "MySuperStore"
        },
        "offers": {
          "@type": "Offer",
          "url": window.location.href,
          "priceCurrency": "NGN",
          "price": product.price,
          "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "itemCondition": "https://schema.org/NewCondition"
        }
      };

      const scriptId = 'jsonld-schema-product';
      let scriptEl = document.getElementById(scriptId);
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schemaProduct);

      return () => {
        const el = document.getElementById(scriptId);
        if (el) el.remove();
      };
    }
  }, [product]);

  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setShowLoginPrompt(true);
      return;
    }

    if (product) {
      await addToCart(product, quantity);
      alert('Product added to cart');
    }
  };

  if (loading) {
    return (
      <div className="section flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[var(--gold-primary)]" size={48} />
      </div>
    );
  }

  if (!product) {
    return <div className="section text-center text-white">Product not found</div>;
  }

  return (
    <div className="section relative" style={{ overflowX: 'hidden', paddingLeft: 'clamp(1rem, 4vw, 1.5rem)', paddingRight: 'clamp(1rem, 4vw, 1.5rem)' }}>
      {/* Breadcrumb Navigation */}
      <nav className="mb-6 text-sm text-gray-400 flex items-center gap-2 relative z-10">
        <Link to="/" className="hover:text-[var(--gold-primary)] transition-colors">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-[var(--gold-primary)] transition-colors">Shop</Link>
        <span>/</span>
        <Link to={`/categories/${product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="hover:text-[var(--gold-primary)] transition-colors">{product.category}</Link>
        <span>/</span>
        <span className="text-gray-300 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="detail-grid relative z-10">
        {/* Product Images - Left Column on White */}
        <div>
          <div className="gallery-main">
            <ImageWithFallback
              src={product.image || 'https://via.placeholder.com/800'}
              alt={product.name ? `${product.name} - ${product.category || 'Product'}` : undefined}
              className="product-image"
            />
          </div>
          <div className="gallery-thumbnails">
            {product.product_images?.map((img: any, i: number) => (
              <div key={i} className="gallery-thumb">
                <ImageWithFallback
                  src={img.url}
                  alt={img.alt_text || (product.name ? `${product.name} - Thumbnail ${i + 1}` : undefined)}
                  className="product-image"
                />
              </div>
            )) || (
                [1, 2, 3].map(i => (
                  <div key={i} className="gallery-thumb">
                    <div className="w-full h-full bg-gray-200" />
                  </div>
                ))
              )}
          </div>
        </div>

        {/* Product Info - Right Column Black Card */}
        <div className="card-black" style={{ padding: 'clamp(1rem, 4vw, 2rem)' }}>
          <p className="text-muted mb-2" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{product.category}</p>
          <h1
            data-chat-product-name
            className="text-white mb-4"
            style={{ fontSize: 'clamp(1.25rem, 4vw, 2.5rem)', fontFamily: "'Oswald', sans-serif", lineHeight: 1.2 }}
          >
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  strokeWidth={2.5}
                  style={{
                    fill: 'url(#gold-gradient)',
                    stroke: '#D4AF37',
                    filter: 'drop-shadow(0 0 4px rgba(244, 224, 77, 0.5))'
                  }}
                />
              ))}
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE55C" />
                    <stop offset="50%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#B8941F" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-muted">(127 reviews)</span>
          </div>

          {/* Price & Stock */}
          <div className="flex items-center gap-4 mb-4">
            <span className="detail-price">
              {formatPrice(Number(product.price || 0))}
            </span>
            {product.stock !== undefined && product.stock !== null ? (
              product.stock > 0 ? (
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  {product.stock} in stock
                </span>
              ) : (
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">
                  Out of stock
                </span>
              )
            ) : (
              <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-sm">
                Stock unavailable
              </span>
            )}
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-gray-300 mb-4 font-medium">
              {product.short_description}
            </p>
          )}

          {/* Description */}
          <p className="detail-desc">
            {product.description || 'No detailed description available for this product.'}
          </p>

          {/* Product Specifications */}
          {product.product_specs && product.product_specs.length > 0 && (
            <div className="mb-6 mt-6 pt-6 border-t border-gray-700">
              <h4 className="text-white mb-4 font-semibold">Specifications</h4>
              <div className="grid grid-cols-2 gap-3">
                {product.product_specs.map((spec: any, index: number) => (
                  <div key={index} className="bg-gray-800/50 rounded px-3 py-2">
                    <span className="text-gray-400 text-sm block">{spec.spec_key}</span>
                    <span className="text-white">{spec.spec_value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="mb-4">
            <h4 className="text-white mb-3" style={{fontFamily: "'Oswald', sans-serif", fontSize: 'clamp(0.875rem, 2vw, 1rem)'}}>Select Size</h4>
            <div className="size-grid">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <h4 className="text-white mb-3" style={{fontFamily: "'Oswald', sans-serif", fontSize: 'clamp(0.875rem, 2vw, 1rem)'}}>Quantity</h4>
            <div className="quantity-controls">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="qty-btn"
              >
                <Minus size={20} strokeWidth={2.5} />
              </button>
              <span className="qty-display">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="qty-btn"
                disabled={product.stock !== undefined && quantity >= product.stock}
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="detail-actions">
            <button
              onClick={handleAddToCart}
              className="btn-primary"
              style={{ flex: 1, padding: '1rem' }}
              disabled={product.stock !== undefined && product.stock <= 0}
            >
              {product.stock !== undefined && product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button className="qty-btn" style={{ width: '64px', height: 'auto', border: '1px solid var(--white)' }}>
              <Heart size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Features */}
          <div className="detail-features">
            <div className="feature-row">
              <Truck size={24} strokeWidth={2.5} style={{ color: '#D4AF37' }} />
              <span>Free shipping worldwide</span>
            </div>
            <div className="feature-row">
              <Shield size={24} strokeWidth={2.5} style={{ color: '#D4AF37' }} />
              <span>Authenticity guaranteed</span>
            </div>
            <div className="feature-row">
              <RotateCcw size={24} strokeWidth={2.5} style={{ color: '#D4AF37' }} />
              <span>30-day return policy</span>
            </div>
          </div>
        </div>
      </div>
      <LoginPrompt isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div >
  );
}
