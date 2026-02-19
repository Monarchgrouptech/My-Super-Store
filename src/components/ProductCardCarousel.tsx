import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  product_images?: { url: string }[];
  category: string;
}

interface ProductCardCarouselProps {
  product: Product;
  onProductClick: (id: number) => void;
  variant?: 'default' | 'black';
}

export function ProductCardCarousel({ product, onProductClick, variant = 'default' }: ProductCardCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const images = product.product_images?.map(img => img.url) || [product.image || 'https://via.placeholder.com/500'];

  // Auto-rotate images every 10 seconds
  useEffect(() => {
    if (!isAutoPlaying || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, images.length]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const getPrevIndex = () => (currentImageIndex - 1 + images.length) % images.length;
  const getNextIndex = () => (currentImageIndex + 1) % images.length;

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  return (
    <div
      onClick={() => onProductClick(product.id)}
      className={`product-card ${variant === 'black' ? 'card-black p-4' : ''}`}
    >
      {/* Image Carousel Container */}
      <div
        className="product-image-container relative group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Side images - previous and next */}
        <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none z-10">
          {/* Previous image - left side */}
          {images.length > 1 && (
            <div className="w-12 h-full flex items-center justify-start">
              <div className="w-10 h-16 rounded-sm overflow-hidden opacity-30 border border-[#D4AF37]/20 shadow-lg">
                <ImageWithFallback
                  src={images[getPrevIndex()]}
                  alt="Previous"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Next image - right side */}
          {images.length > 1 && (
            <div className="w-12 h-full flex items-center justify-end">
              <div className="w-10 h-16 rounded-sm overflow-hidden opacity-30 border border-[#D4AF37]/20 shadow-lg">
                <ImageWithFallback
                  src={images[getNextIndex()]}
                  alt="Next"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main image */}
        <div className="relative w-full h-full rounded-lg overflow-hidden">
          <ImageWithFallback
            src={images[currentImageIndex]}
            alt={product.name}
            className="product-image"
          />

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-xs text-[#D4AF37] backdrop-blur-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}

          {/* Navigation arrows - visible on hover */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 hover:bg-[#D4AF37] text-white hover:text-black p-2 rounded-full backdrop-blur-sm z-20 pointer-events-auto"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>

              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 hover:bg-[#D4AF37] text-white hover:text-black p-2 rounded-full backdrop-blur-sm z-20 pointer-events-auto"
              >
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>



        {/* Carousel indicator dots - visible on hover */}
        {images.length > 1 && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoPlaying(false);
                  setCurrentImageIndex(index);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentImageIndex
                  ? 'bg-[#D4AF37] w-3'
                  : 'bg-white/40 hover:bg-white/60'
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="product-info">
        
        <h3 className="product-name">{product.name}</h3>
        <div className="product-price">
          ${product.price.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
