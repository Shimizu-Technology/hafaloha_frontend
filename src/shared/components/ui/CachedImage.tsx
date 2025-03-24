import React, { useState, useEffect, useRef } from 'react';

// Global cache to share across component instances
const imageCache = new Map<string, boolean>();

interface CachedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto'; // Add fetchPriority support
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * CachedImage component for optimized image loading
 * - Uses in-memory cache for faster access
 * - Supports lazy loading
 * - Shows a loading placeholder
 * - Handles errors gracefully
 * - Supports fetchPriority for LCP optimization
 * - Enhanced for better mobile performance
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto', // Default to auto
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    // Set up cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    
    // Check if image is already in our in-memory cache
    if (imageCache.has(src)) {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
      return;
    }
    
    // Try to get from localStorage cache as fallback
    try {
      const cachedImage = localStorage.getItem(`img_cache_${src}`);
      if (cachedImage) {
        setImageSrc(cachedImage);
        setIsLoading(false);
        // Also add to in-memory cache
        imageCache.set(src, true);
        onLoad?.();
        return;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // If not in cache, load it
    const img = new Image();
    
    // Set priority before setting src
    if (fetchPriority === 'high') {
      img.fetchPriority = 'high';
    } else if (fetchPriority === 'low') {
      img.fetchPriority = 'low';
    }
    
    img.src = src;
    
    img.onload = () => {
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      setImageSrc(src);
      setIsLoading(false);
      
      // Add to in-memory cache
      imageCache.set(src, true);
      
      // Also cache in localStorage as backup
      try {
        localStorage.setItem(`img_cache_${src}`, src);
      } catch (e) {
        // Handle localStorage errors (e.g., quota exceeded)
        console.warn('Failed to cache image URL in localStorage:', e);
      }
      
      onLoad?.();
    };
    
    img.onerror = () => {
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      setIsLoading(false);
      setHasError(true);
      onError?.();
    };
  }, [src, onLoad, onError, fetchPriority]);

  // Generate srcset for responsive images if width is provided
  const generateSrcSet = () => {
    if (!width) return undefined;
    
    // Create srcset for 1x, 2x, and 3x pixel densities
    return `${src} 1x, ${src} 2x, ${src} 3x`;
  };

  // Placeholder while loading
  if (isLoading) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  // Error fallback
  if (hasError) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
        aria-label={`Failed to load ${alt}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    );
  }

  // Actual image with fetchPriority support
  return (
    <img
      src={imageSrc || ''}
      srcSet={generateSrcSet()}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      {...{ fetchpriority: fetchPriority } as any}
    />
  );
};

export default CachedImage;
