import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselSlide {
    id: number;
    image: string;
    alt: string;
    category: string;
}

const slides: CarouselSlide[] = [
    { id: 1, image: '/assets/hero/Cosmetics.jpg', alt: 'Premium Cosmetics Collection', category: 'Cosmetics' },
    { id: 2, image: '/assets/hero/building_materials.jpg', alt: 'Construction Tools & Equipment', category: 'Construction' },
    { id: 3, image: '/assets/hero/funiture.jpg', alt: 'Luxury Furniture Showroom', category: 'Furniture' },
    { id: 4, image: '/assets/hero/fashion.jpg', alt: 'Fashion & Clothing Collection', category: 'Fashion' },
    { id: 5, image: '/assets/hero/events.jpg', alt: 'Event Tools & Equipment', category: 'Events' },
    { id: 6, image: '/assets/hero/Electric gadgets.jpg', alt: 'Electrical Appliances', category: 'Electrical' },
];

const AUTO_SLIDE_INTERVAL = 5000; // 5 seconds

export function HeroCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

    // Auto-slide functionality
    const startAutoSlide = useCallback(() => {
        if (autoSlideTimerRef.current) {
            clearInterval(autoSlideTimerRef.current);
        }
        autoSlideTimerRef.current = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, AUTO_SLIDE_INTERVAL);
    }, []);

    const stopAutoSlide = useCallback(() => {
        if (autoSlideTimerRef.current) {
            clearInterval(autoSlideTimerRef.current);
            autoSlideTimerRef.current = null;
        }
    }, []);

    // Start auto-slide on mount and when not hovered
    useEffect(() => {
        if (!isHovered) {
            startAutoSlide();
        } else {
            stopAutoSlide();
        }

        return () => stopAutoSlide();
    }, [isHovered, startAutoSlide, stopAutoSlide]);

    // Navigation functions
    const goToSlide = (index: number) => {
        setCurrentSlide(index);
        stopAutoSlide();
        setTimeout(startAutoSlide, 1000); // Resume auto-slide after 1 second
    };

    const nextSlide = () => {
        goToSlide((currentSlide + 1) % slides.length);
    };

    const prevSlide = () => {
        goToSlide((currentSlide - 1 + slides.length) % slides.length);
    };

    // Touch/swipe handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const swipeThreshold = 50;
        const diff = touchStartX.current - touchEndX.current;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                nextSlide(); // Swipe left - next slide
            } else {
                prevSlide(); // Swipe right - previous slide
            }
        }
    };

    // Determine if we should load the image (Current, Next, Previous) to save bandwidth
    const shouldLoadImage = (index: number) => {
        if (index === currentSlide) return true;

        // Preload next slide
        const nextIndex = (currentSlide + 1) % slides.length;
        if (index === nextIndex) return true;

        // Keep previous slide loaded for smooth transition back
        const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
        if (index === prevIndex) return true;

        // Keep already loaded images to avoid re-fetching/flicker
        // if (loadedImages[slides[index].id]) return true; 

        return loadedImages[slides[index].id] || false;
    };

    return (
        <div
            className="relative w-full overflow-hidden bg-slate-900"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <img
                src={slides[currentSlide].image}
                alt=""
                className="block w-full h-auto opacity-0 pointer-events-none select-none"
                aria-hidden="true"
            />

            {/* Carousel slides */}
            {slides.map((slide, index) => {
                const isLoaded = loadedImages[slide.id];
                const shouldLoad = shouldLoadImage(index);
                const isActive = index === currentSlide;

                return (
                    <div
                        key={slide.id}
                        className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                        style={{ pointerEvents: isActive ? 'auto' : 'none' }}
                    >
                        {/* Loading Skeleton/Placeholder */}
                        {(!isLoaded || !shouldLoad) && (
                            <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
                                <span className="text-slate-600 text-sm font-medium">Loading...</span>
                            </div>
                        )}

                        {/* Image */}
                        {shouldLoad && (
                            <img
                                src={slide.image}
                                alt={slide.alt}
                                className={`absolute inset-0 w-full h-full object-fill object-center transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'
                                    }`}
                                onLoad={() => setLoadedImages(prev => ({ ...prev, [slide.id]: true }))}
                                loading={index === 0 ? 'eager' : 'lazy'}
                                decoding="async"
                            />
                        )}

                        {/* Gradient Overlay for Text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                    </div>
                );
            })}

            {/* Navigation arrows */}
            <div className="absolute inset-0 pointer-events-none z-20">
                <button
                    onClick={prevSlide}
                    className="absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2 pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-1 sm:p-1.5 md:p-2 lg:p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2 pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-1 sm:p-1.5 md:p-2 lg:p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
                    aria-label="Next slide"
                >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                </button>
            </div>

            {/* Navigation dots */}
            <div className="hidden sm:flex absolute bottom-2 sm:bottom-3 md:bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 gap-1 sm:gap-1.5 md:gap-2 z-20">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`transition-all duration-300 rounded-full ${index === currentSlide
                            ? 'w-4 h-1 sm:w-5 sm:h-1.5 md:w-6 md:h-1.5 lg:w-8 lg:h-2 bg-[#FFE55C]'
                            : 'w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-white/40 hover:bg-white/60'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
