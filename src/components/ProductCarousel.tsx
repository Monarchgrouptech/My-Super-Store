import { useEffect, useRef, useState } from "react";
import { ProductCard } from "./ProductCard";

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  product_images?: { url: string }[];
  category: string;
}

interface ProductCarouselProps {
  products: Product[];
  onProductClick: (id: number) => void;
}

export function ProductCarousel({
  products,
  onProductClick,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cardWidth, setCardWidth] = useState(300);

  const GAP = 24;
  const AUTO_SCROLL_INTERVAL = 3000;

  // Responsive card width — smaller on mobile, capped on desktop
  useEffect(() => {
    const updateCardWidth = () => {
      const vw = window.innerWidth || 1024;
      setCardWidth(Math.min(300, Math.max(200, Math.round(vw * 0.72))));
    };
    updateCardWidth();
    window.addEventListener("resize", updateCardWidth);
    return () => window.removeEventListener("resize", updateCardWidth);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % products.length;
      scrollToIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeIndex, isPaused, products.length, cardWidth]);

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      left: index * (cardWidth + GAP),
      behavior: "smooth",
    });

    setActiveIndex(index);
  };

  // Detect active card on manual scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;

    const scrollLeft = scrollRef.current.scrollLeft;
    const index = Math.round(scrollLeft / (cardWidth + GAP));
    setActiveIndex(index);
  };

  return (
    <div
      className="relative w-full py-12 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          flex gap-6 px-4 sm:px-12 overflow-x-auto
          scroll-smooth
          snap-x snap-mandatory
          overflow-y-hidden
        "
        style={{
          minHeight: "440px",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {products.map((product, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={product.id}
              className={`
                snap-center shrink-0 transition-all duration-500
                ${isActive ? "scale-100 opacity-100" : "scale-95 opacity-70"}
              `}
              style={{ 
                width: cardWidth,
                minHeight: "380px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div className="glass-border shadow-2xl w-full" style={{ minHeight: "400px" }}>
                <ProductCard
                  product={product}
                  onProductClick={onProductClick}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="carousel-dots flex justify-center gap-1.5 sm:gap-2 mt-5 sm:mt-6">
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#D4AF37]"
                : "w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
