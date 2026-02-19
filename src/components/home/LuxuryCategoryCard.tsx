import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Product {
    id: any;
    name: string;
    image?: string;
    category: string;
}

interface Category {
    id: string;
    name: string;
}

interface LuxuryCategoryCardProps {
    category: Category;
    products: Product[];
}

export function LuxuryCategoryCard({ category, products }: LuxuryCategoryCardProps) {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);

    // Get products from this category that have images
    const categoryProducts = products.filter(
        p => p.category === category.name && p.image && p.image.trim() !== ''
    );

    const currentProduct = categoryProducts[currentIndex];

    // Auto-rotate carousel
    useEffect(() => {
        if (categoryProducts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % categoryProducts.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [categoryProducts.length]);

    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(prev =>
            prev - 1 < 0 ? categoryProducts.length - 1 : prev - 1
        );
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev + 1) % categoryProducts.length);
    };

    return (
        <button
            onClick={() => navigate(`/shop?category=${category.name}`)}
            className="group relative rounded-[20px] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 hover:-translate-y-2 bg-white border-2 border-[rgba(212,175,55,0.3)] hover:border-[rgba(212,175,55,0.8)] w-full h-full flex flex-col"
        >
            {/* Gold gradient glow background */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] rounded-[20px] opacity-0 group-hover:opacity-20 blur transition-opacity duration-500 -z-10" />

            {/* Premium gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFE55C]/20 via-[#D4AF37]/10 to-[#B8941F]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Image Carousel */}
            <div className="relative h-44 bg-transparent overflow-hidden flex items-center justify-center border-b-2 border-[rgba(212,175,55,0.2)]">
                {currentProduct && currentProduct.image ? (
                    <img
                        src={currentProduct.image}
                        alt={currentProduct.name}
                        loading="lazy"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        className="w-full h-full transition-opacity duration-700 p-2"

                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">No images</span>
                    </div>
                )}

                {/* Premium overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Carousel Controls */}
                {categoryProducts.length > 1 && (
                    <>
                        {/* Previous Button */}
                        <button
                            onClick={goToPrevious}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:shadow-[0_4px_12px_rgba(212,175,55,0.3)]"
                        >
                            <svg className="w-4 h-4 text-[#0F0F0F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Next Button */}
                        <button
                            onClick={goToNext}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:shadow-[0_4px_12px_rgba(212,175,55,0.3)]"
                        >
                            <svg className="w-4 h-4 text-[#0F0F0F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Carousel Indicators */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5 md:gap-1.5 z-10">
                            {categoryProducts.map((_, idx) => (
                                <div
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(idx);
                                    }}
                                    className={`rounded-full transition-all duration-300 cursor-pointer ${idx === currentIndex
                                        ? 'w-[14px] h-[5px] md:w-7 md:h-2 bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.8),0_0_12px_rgba(255,165,0,0.6)]'
                                        : 'bg-white/60 hover:bg-white/80 w-[3px] h-[3px] md:w-2 md:h-2'
                                        }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Label with Gold Accent */}
            <div className="relative bg-white px-5 py-4 group-hover:bg-gradient-to-r group-hover:from-[#FFE55C] group-hover:via-[#D4AF37] group-hover:to-[#B8941F] transition-all duration-500 flex-grow flex flex-col justify-center">
                <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-[#0F0F0F] group-hover:text-[#050505] transition-colors text-base">
                        {category.name}
                    </span>
                    {categoryProducts.length > 0 && (
                        <span className="text-xs font-semibold text-[#B8941F] group-hover:text-[#050505] transition-colors bg-[rgba(212,175,55,0.1)] px-2 py-1 rounded-md">
                            {categoryProducts.length}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
