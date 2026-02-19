
import { useNavigate } from 'react-router-dom';

interface Product {
    id: any;
    name: string;
    price: number;
    image?: string;
    category: string;
}

interface AutoScrollProductSectionProps {
    title: string;
    products: Product[];
    className?: string;
}

export function AutoScrollProductSection({ title, products, className = '' }: AutoScrollProductSectionProps) {
    const navigate = useNavigate();

    if (!products || products.length === 0) return null;

    return (
        <section className={`w-full bg-white border border-slate-200 rounded-lg p-4 shadow-sm ${className}`}>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent">
                    {title}
                </h2>
            </div>

            <div className="flex flex-col gap-4 overflow-hidden py-2">
                {/* Row 1 - Scroll Left */}
                <div className="relative w-full overflow-hidden">
                    <div className="flex gap-4 animate-scroll w-max hover:pause">
                        {/* Duplicate products for seamless loop (3 sets for smooth scrolling) */}
                        {[...products, ...products, ...products].map((product, index) => (
                            <div
                                key={`row1-${product.id}-${index}`}
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
                        {/* Duplicate products for seamless loop (reverse order for variety) */}
                        {[...products].reverse().concat([...products].reverse()).concat([...products].reverse()).map((product, index) => (
                            <div
                                key={`row2-${product.id}-${index}`}
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
            </div>
        </section>
    );
}
