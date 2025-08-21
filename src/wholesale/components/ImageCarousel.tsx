// src/wholesale/components/ImageCarousel.tsx
import { useState } from 'react';
import { WholesaleItemImage } from '../services/wholesaleApi';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';

interface ImageCarouselProps {
  images: WholesaleItemImage[];
  primaryImageUrl?: string;
  itemName: string;
  className?: string;
  showArrows?: boolean;
  showCounter?: boolean;
}

export default function ImageCarousel({
  images,
  primaryImageUrl,
  itemName,
  className = '',
  showArrows = true,
  showCounter = true
}: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Determine if we have multiple images
  const hasMultipleImages = images && images.length > 1;
  
  // Get current image to display
  const currentImage = hasMultipleImages 
    ? images[currentImageIndex] 
    : (images && images[0]) || { image_url: primaryImageUrl, alt_text: itemName };

  const nextImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <OptimizedImage
        src={currentImage?.image_url || "/placeholder-food.png"}
        alt={currentImage?.alt_text || `${itemName} placeholder`}
        context="menuItem"
        className="w-full h-full object-cover rounded-lg"
        loading="lazy"
        fetchPriority="low"
      />
      
      {/* Navigation Arrows - Only show on hover and when multiple images */}
      {hasMultipleImages && showArrows && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image Counter - Show current position when multiple images */}
      {hasMultipleImages && showCounter && (
        <div className="absolute bottom-2 left-2">
          <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
            {currentImageIndex + 1}/{images.length}
          </span>
        </div>
      )}
    </div>
  );
}