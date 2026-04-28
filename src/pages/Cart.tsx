import { Minus, Plus, X, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';


interface CartProps {
  onNavigate: (page: string) => void;
}

export function Cart({ onNavigate }: CartProps) {
  const { items, total, removeFromCart, updateQuantity, loading } = useCart();
  const { formatPrice } = useCurrency();

  const subtotal = total;
  const shipping = subtotal > 500 ? 0 : 50;
  const tax = subtotal * 0.08;
  const finalTotal = subtotal + shipping + tax;

  if (loading) {
    return (
      <div className="section flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[var(--gold-primary)]" size={48} />
      </div>
    );
  }

  return (
    <div className="page-fade section relative" style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw', paddingLeft: 'clamp(0.75rem, 4vw, 1.5rem)', paddingRight: 'clamp(0.75rem, 4vw, 1.5rem)', boxSizing: 'border-box' }}>
      <h1 className="page-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', marginBottom: '1.5rem' }}>Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="card-black text-center" style={{ padding: 'clamp(2rem, 8vw, 6rem) 1rem' }}>
          <h3 className="text-white mb-6" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>Your cart is empty</h3>
          <p className="text-muted mb-8">Discover our exceptional collection</p>
          <button
            onClick={() => onNavigate('shop')}
            className="btn-primary"
            style={{ padding: '0.75rem 2rem' }}
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="cart-grid" style={{ width: '100%', minWidth: 0 }}>
          {/* Cart Items */}
          <div className="col-span-2 space-y-4" style={{ minWidth: 0, width: '100%' }}>
            {items.map((item) => (
              <div key={item.id} className="card-black flex gap-3 sm:gap-6" style={{ padding: 'clamp(0.75rem, 3vw, 1.5rem)' }}>
                {/* Image */}
                <div className="cart-thumb">
                  <ImageWithFallback
                    src={item.products?.product_images?.[0]?.url || 'https://via.placeholder.com/150'}
                    alt={item.products?.name}
                    className="product-image"
                  />
                </div>

                {/* Details */}
                <div className="cart-details" style={{ minWidth: 0 }}>
                  <div className="flex justify-between items-start gap-2">
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                      <h4 className="text-white mb-1 truncate" style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1rem)' }}>{item.products?.name}</h4>
                      <div className="text-white font-bold" style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1rem)' }}>
                        {formatPrice(item.products?.price || 0)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-muted hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0"
                    >
                      <X size={24} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="qty-btn"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="text-white w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="qty-btn"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent font-bold truncate ml-2">
                      {formatPrice((item.products?.price || 0) * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{ minWidth: 0 }}>
            <div className="card-black sticky top-24" style={{ padding: 'clamp(1rem, 4vw, 2rem)' }}>
              <h3 className="text-white mb-8 font-serif" style={{fontFamily: "'Oswald', sans-serif"}}>Order Summary</h3>

              <div className="space-y-4 mb-8">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax</span>
                  <span>{formatPrice(tax)}</span>
                </div>

                <div className="summary-total">
                  <span>Total</span>
                  <div className="total-price">
                    {formatPrice(finalTotal)}
                  </div>
                </div>
              </div>

              <Link to="/checkout" style={{ textDecoration: 'none' }}>
              <button
                className="btn-primary"
                style={{ width: '100%', marginBottom: '1rem', padding: '1rem' }}
                
              >
                Proceed to Checkout
              </button>

              <button
                onClick={() => onNavigate('shop')}
                className="btn-outline-gold"
                style={{ width: '100%', padding: '1rem' }}
              >
                Continue Shopping
              </button>
              </Link>

              {/* Free Shipping Message */}
              {subtotal < 500 && (
                <div className="mt-6 p-4 border border-[rgba(222,157,13,0.3)] text-center">
                  <p className="text-muted text-sm">
                    Add <span style={{ color: 'var(--gold-solid)' }}>{formatPrice(500 - subtotal)}</span> more for free shipping
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
