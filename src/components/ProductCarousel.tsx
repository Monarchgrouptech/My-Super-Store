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

  const CARD_WIDTH = 300;
  const GAP = 24;
  const AUTO_SCROLL_INTERVAL = 3000;

  // Auto-scroll
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % products.length;
      scrollToIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeIndex, isPaused, products.length]);

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      left: index * (CARD_WIDTH + GAP),
      behavior: "smooth",
    });

    setActiveIndex(index);
  };

  // Detect active card on manual scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;

    const scrollLeft = scrollRef.current.scrollLeft;
    const index = Math.round(scrollLeft / (CARD_WIDTH + GAP));
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
          flex gap-6 px-12 overflow-x-auto
          scroll-smooth
          snap-x snap-mandatory
          overflow-y-hidden
        "
        style={{
         
          minHeight: "500px",
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
                ${isActive ? "scale-100 opacity-100" : "scale-90 opacity-50"}
              `}
              style={{ 
                width: CARD_WIDTH,
                minHeight: "420px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div className="glass-border shadow-2xl w-full" style={{ height: "450px" }}>
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
      <div className="flex justify-center gap-2 mt-6">
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={`rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-3 h-3 bg-[#D4AF37]"
                : "w-2 h-2 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
