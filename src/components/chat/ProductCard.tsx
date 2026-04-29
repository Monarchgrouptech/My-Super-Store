import { Link } from 'react-router-dom';
import { useCurrency } from '../../context/CurrencyContext';
import type { ProductCardData } from './chat.types';

interface ProductCardProps {
  product: ProductCardData;
}

export function ProductCard({ product }: ProductCardProps) {
  const { formatPrice } = useCurrency();
  const isInStock = product.stock > 0;

  return (
    <article className="relative flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-3 shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
      <div className="flex w-full items-start gap-3">
        {/* Image Container */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f6f3ea]">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
              No image
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
            {product.name}
          </h4>
          {product.brand && (
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
              {product.brand}
            </p>
          )}
          <div className="mt-2">
            <p className="text-sm font-extrabold text-[#b38b1a]">
              {formatPrice(product.price)}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isInStock ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {isInStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
        </div>
      </div>

      <Link
        to={isInStock ? `/products/${product.slug}` : '#'}
        aria-disabled={!isInStock}
        className={`mt-3 flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
          isInStock
            ? 'bg-[#d4af37] text-black hover:bg-[#c5a02d] active:scale-[0.98]'
            : 'cursor-not-allowed bg-slate-100 text-slate-400'
        }`}
        onClick={(event) => {
          if (!isInStock) {
            event.preventDefault();
          }
        }}
      >
        View Product
        <svg
          className="ml-2 h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </article>
  );
}
