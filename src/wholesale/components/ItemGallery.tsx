// src/wholesale/components/ItemGallery.tsx
import React, { useState, useEffect, useRef } from 'react';
import { WholesaleItemImage } from '../services/wholesaleApi';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';

interface ItemGalleryProps {
  images: WholesaleItemImage[];
  itemName: string;
  className?: string;
}

export default function ItemGallery({ images, itemName, className = '' }: ItemGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort images by position, with primary image first
  const sortedImages = [...images].sort((a, b) => {
    if (a.primary) return -1;
    if (b.primary) return 1;
    return a.position - b.position;
  });

  const currentImage = sortedImages[currentImageIndex];

  useEffect(() => {
    setImageLoading(true);
  }, [currentImageIndex]);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? sortedImages.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => 
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleZoomToggle = () => {
    setIsZoomed(!isZoomed);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isZoomed || !imageRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handlePrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNext();
        break;
      case 'Escape':
        e.preventDefault();
        setIsZoomed(false);
        break;
    }
  };

  if (!sortedImages.length) {
    return (
      <div className={`aspect-square rounded-lg overflow-hidden ${className}`}>
        <OptimizedImage
          src="/placeholder-food.png"
          alt={`${itemName} placeholder`}
          context="menuItem"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`item-gallery ${className}`} onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Main Image Display */}
      <div 
        ref={containerRef}
        className="relative aspect-square mb-4 group cursor-pointer overflow-hidden rounded-lg"
        onClick={handleZoomToggle}
        onMouseMove={handleMouseMove}
      >
        {/* Loading State */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Main Image - Using regular img tag for ref support needed for zoom functionality */}
        <img
          ref={imageRef}
          src={currentImage.image_url}
          alt={currentImage.alt_text || `${itemName} - Image ${currentImageIndex + 1}`}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isZoomed 
              ? 'scale-150 cursor-zoom-out' 
              : 'scale-100 cursor-zoom-in hover:scale-105'
          } ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          style={isZoomed ? {
            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
          } : {}}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />

        {/* Navigation Arrows (show only if multiple images) */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded">
            {currentImageIndex + 1} / {sortedImages.length}
          </div>
        )}

        {/* Zoom Indicator */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {isZoomed ? 'Click to zoom out' : 'Click to zoom in'}
        </div>

        {/* Primary Badge */}
        {currentImage.primary && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            Primary
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {sortedImages.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => handleThumbnailClick(index)}
              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                index === currentImageIndex
                  ? 'border-blue-600 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <OptimizedImage
                src={image.image_url}
                alt={image.alt_text || `${itemName} thumbnail ${index + 1}`}
                context="cart"
                className="w-full h-full object-cover"
              />
              
              {/* Primary indicator */}
              {image.primary && (
                <div className="absolute inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Keyboard Navigation Hint */}
      {sortedImages.length > 1 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Use ← → arrow keys to navigate • ESC to exit zoom
        </div>
      )}
    </div>
  );
}