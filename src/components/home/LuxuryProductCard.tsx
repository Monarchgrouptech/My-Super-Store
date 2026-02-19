import { useNavigate } from 'react-router-dom';

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

interface LuxuryProductCardProps {
    product: Product;
    delay?: number;
    isTrending?: boolean;
}

export function LuxuryProductCard({ product, delay = 0, isTrending = false }: LuxuryProductCardProps) {
    const navigate = useNavigate();

    return (
        <div
            className="group w-50 relative bg-white rounded-[20px] border-2 border-[rgba(212,175,55,0.3)] overflow-hidden cursor-pointer transition-all duration-500 hover:border-[rgba(212,175,55,0.8)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.25),inset_0_0_30px_rgba(212,175,55,0.1)] flex flex-col h-full"
            style={{
                animation: `slideUp 0.6s ease-out ${delay}s both`,
            }}
            onClick={() => navigate(`/shop/${product.id}`)}
        >
            {/* Gold gradient accent on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] rounded-[20px] opacity-0 group-hover:opacity-20 blur transition-opacity duration-500 -z-10" />

            {/* Luxury Shimmer Badge */}
            {isTrending && (
                <div className="absolute top-4 right-4 z-20 animate-gold-glow">
                    <div className="relative">
                        <div className="absolute -inset-2 bg-gradient-to-r from-[#FFE55C]/60 to-[#D4AF37]/40 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-300 animate-pulse-glow" />
                        <div className="relative bg-gradient-to-r from-[#FFE55C] via-[#F4E04D] to-[#D4AF37] px-3 py-1.5 rounded-full text-[0.65rem] font-extrabold text-[#050505] uppercase tracking-wider shadow-[0_4px_12px_rgba(212,175,55,0.4)] border border-[rgba(255,248,220,0.6)] hover:shadow-[0_6px_16px_rgba(212,175,55,0.6)]">
                            🔥 Trending
                        </div>
                    </div>
                </div>
            )}

            {/* Image Container with Premium Zoom & Fixed Aspect Ratio */}
            <div className="relative w-full h-20 bg-transparent overflow-hidden border-b-2 border-[rgba(212,175,55,0.2)]">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        className="w-full h-full transition-opacity duration-700"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">No image</span>
                    </div>
                )}
                {/* Premium overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col gap-2 flex-grow">
                <span className="text-[0.6rem] font-extrabold text-[#D4AF37] uppercase tracking-widest bg-[rgba(212,175,55,0.15)] px-1.5 py-0.5 rounded-md inline-block w-fit">
                    {product.category.toUpperCase()}
                </span>
                <p className="font-bold text-[#0F0F0F] line-clamp-2 text-xs leading-tight transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFE55C] group-hover:via-[#D4AF37] group-hover:to-[#B8941F]">
                    {product.name}
                </p>
                <p className="text-base font-extrabold bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent mt-auto">
                    ${product.price.toFixed(2)}
                </p>
            </div>

            {/* Premium "Add to Cart" button */}
            <div className="px-3 pb-3">
                <button className="w-full bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] text-[#050505] font-bold text-sm py-2 rounded-[10px] opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 hover:shadow-[0_12px_24px_rgba(212,175,55,0.35)] transform group-hover:scale-100 scale-95 active:scale-95">
                    Add to Cart
                </button>
            </div>
        </div>
    );
}
