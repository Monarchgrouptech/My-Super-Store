import { useNavigate } from 'react-router-dom';
import { LuxuryProductCard } from './LuxuryProductCard';

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

interface ProductSectionProps {
    title: string;
    products: Product[];
    categoryName?: string;
    index: number;
    loading: boolean;
    productsPerSection: number;
}

// Skeleton loader for products with luxury styling
const SkeletonLoader = () => (
    <div className="bg-white rounded-[20px] border-2 border-[rgba(212,175,55,0.2)] overflow-hidden h-full flex flex-col">
        <div className="aspect-[4/5] bg-gradient-to-r from-[#F0F0F0] via-[#E8E8E8] to-[#F0F0F0] animate-shimmer" />
        <div className="p-5 space-y-3 flex-grow">
            <div className="h-4 bg-[#E0E0E0] rounded-md w-3/4" />
            <div className="h-3 bg-[#E8E8E8] rounded-md w-full" />
            <div className="h-6 bg-gradient-to-r from-[#F0F0F0] to-[#E8E8E8] rounded-md w-1/2 mt-auto" />
        </div>
    </div>
);

export function ProductSection({
    title,
    products,
    categoryName,
    index,
    loading,
    productsPerSection
}: ProductSectionProps) {
    const navigate = useNavigate();

    const bgGradients = [
        'from-[rgba(255,229,92,0.05)] via-white to-[rgba(212,175,55,0.03)]',
        'from-white via-[rgba(255,229,92,0.04)] to-white',
        'from-[rgba(212,175,55,0.05)] via-white to-[rgba(255,229,92,0.04)]',
        'from-white to-[rgba(212,175,55,0.04)]',
    ];
    const bgGradient = bgGradients[index % bgGradients.length];

    // Extract icon (first part before space) from title
    const titleParts = title.split(' ');
    const icon = titleParts[0];
    const titleText = titleParts.slice(1).join(' ');

    return (
        <section
            className={`bg-gradient-to-b ${bgGradient} relative overflow-hidden max-w-[4000px]`}
        >
            {/* Decorative gold accent elements */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-[#FFE55C]/10 to-[#D4AF37]/5 rounded-full filter blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-full h-[500px] bg-gradient-to-tl from-[#D4AF37]/5 to-[#FFE55C]/10 rounded-full filter blur-3xl -z-10" />

            {/* Top gold divider line */}
            <div className="h-[2px] bg-gradient-to-r w-full from-transparent via-[#D4AF37] to-transparent opacity-50" />

            {/* Title Header with Black Background - Full Width */}
            <div className="bg-black px-6 lg:px-10 py-6 border-t-2 border-[#D4AF37] relative">
                <div className="max-w-[4000px] mx-auto">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-4">
                            {/* Icon with gold glow effect */}
                            <span className="text-5xl text-white drop-shadow-lg" style={{
                                filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.8)) drop-shadow(0 0 20px rgba(212, 175, 55, 0.5))'
                            }}>
                                {icon}
                            </span>
                            {/* Title text */}
                            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] bg-clip-text text-transparent">
                                {titleText}
                            </h2>
                        </div>
                        <button
                            onClick={() =>
                                navigate(`/shop${categoryName ? `?category=${categoryName}` : ''}`)
                            }
                            className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] hover:opacity-80 transition-all flex items-right gap-2 group"
                        >
                            See all
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>
                    {/* Underline spanning full width under See all text */}
                    <div className="h-[3px] w-full bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] rounded-full shadow-lg shadow-[#D4AF37]/30 mt-4" />
                </div>
            </div>

            {/* Bottom Divider Under Title */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

            {/* Products Content Container */}
            <div className="py-16">
                <div className="max-w-[1280px] mx-auto px-6 lg:px-10 relative z-10">

                    {/* Desktop Grid - Adjusted for better spacing/alignment */}
                    <div className="hidden md:block">
                        <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-6 gap-2 lg:gap-3">
                            {loading ? (
                                Array.from({ length: productsPerSection }).map((_, i) => (
                                    <SkeletonLoader key={i} />
                                ))
                            ) : products.length > 0 ? (
                                products.map((p, i) => (
                                    <div
                                        key={p.id}
                                        className="scale-[0.88] origin-top"
                                    >
                                        <LuxuryProductCard
                                            product={p}
                                            delay={i * 0.05}
                                            isTrending={index === 0}
                                        /></div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-[#B8941F] text-lg">No products found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Horizontal Carousel */}
                    <div className="md:hidden overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6">
                        <div className="flex gap-4 sm:gap-9 md:gap-9 min-w-min">
                            {loading ? (
                                Array.from({ length: productsPerSection }).map((_, i) => (
                                    <div key={i} className="w-[50vw] sm:w-[50vw] flex-shrink-0">
                                        <SkeletonLoader />
                                    </div>
                                ))
                            ) : products.length > 0 ? (
                                products.map((p, i) => (
                                    <div key={p.id} className="w-[50vw] sm:w-[50vw] flex-shrink-0">
                                        <LuxuryProductCard
                                            product={p}
                                            delay={i * 0.05}
                                            isTrending={index === 0}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="w-full text-center py-12">
                                    <p className="text-[#B8941F]">No products found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom gold divider line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
        </section>
    );
}
