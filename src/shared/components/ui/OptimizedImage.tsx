// src/shared/components/ui/OptimizedImage.tsx
import React, { useState, useEffect } from 'react';
import { getNetlifyImageUrl, NetlifyImageOptions, isNetlifyImageCdnAvailable } from '../../utils/imageUtils';

// Omit the src from ImgHTMLAttributes to avoid type conflicts
interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined | null;
  options?: NetlifyImageOptions;
  placeholder?: 'blur' | 'none';
  priority?: boolean;
  fallbackSrc?: string;
}

/**
 * OptimizedImage component that leverages Netlify Image CDN for image optimization
 * 
 * This component transforms regular image URLs to use Netlify's image optimization service,
 * which provides benefits like:
 * - Modern format conversion (WebP, AVIF)
 * - Responsive sizing
 * - Quality optimization
 * - CDN caching
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src: sourceUrl,
  options = {},
  placeholder = 'none',
  priority = false,
  fallbackSrc = '/placeholder-food.jpg',
  alt = '',
  onError,
  ...imgProps
}) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset states when source URL changes
    setIsLoading(true);
    setHasError(false);

    if (!sourceUrl) {
      setImageSrc(fallbackSrc);
      setIsLoading(false);
      return;
    }

    try {
      // Check if Netlify Image CDN is available
      if (isNetlifyImageCdnAvailable()) {
        // Transform the URL to use Netlify Image CDN
        const optimizedUrl = getNetlifyImageUrl(sourceUrl, options);
        setImageSrc(optimizedUrl);
      } else {
        // Fall back to original URL if Netlify Image CDN is not available
        setImageSrc(sourceUrl);
      }
    } catch (error) {
      console.error("Error processing image URL:", error);
      setImageSrc(sourceUrl); // Fall back to original URL
      setHasError(true);
    }
  }, [sourceUrl, options, fallbackSrc]);

  // Handle image load completion
  const handleImageLoaded = () => {
    setIsLoading(false);
  };

  // Handle image load error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoading(false);
    
    // Use fallback image
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
    
    // Call the original onError handler if provided
    if (onError) {
      onError(e);
    }
  };

  // Generate loading and priority attributes
  const loadingAttribute = priority ? 'eager' : 'lazy';
  const fetchPriorityAttribute = priority ? 'high' : 'auto';

  return (
    <div className="relative">
      {/* Main image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          loading={loadingAttribute}
          fetchPriority={fetchPriorityAttribute as any}
          onLoad={handleImageLoaded}
          onError={handleImageError}
          className={`
            ${imgProps.className || ''}
            ${isLoading && placeholder === 'blur' ? 'blur-sm' : ''}
            ${isLoading ? 'opacity-0' : 'opacity-100'}
            transition-opacity duration-300
          `}
          {...imgProps}
        />
      )}

      {/* Loading placeholder */}
      {isLoading && placeholder === 'blur' && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            width: imgProps.width,
            height: imgProps.height
          }}
        />
      )}

      {/* Error state - only shown if image fails to load and fallback also fails */}
      {hasError && imageSrc === fallbackSrc && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-sm"
          style={{
            width: imgProps.width,
            height: imgProps.height
          }}
        >
          Image not available
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
