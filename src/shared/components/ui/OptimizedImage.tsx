// src/shared/components/ui/OptimizedImage.tsx
import React from 'react';

// Simplified version of OptimizedImage that just passes through the original image URL
interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined | null;
  options?: any; // Keep this for API compatibility
  placeholder?: 'blur' | 'none'; // Keep this for API compatibility
  priority?: boolean; // Keep this for API compatibility
  fallbackSrc?: string;
}

/**
 * Simplified OptimizedImage component that just renders a standard img tag
 * with the original source URL. This is a temporary solution until we can
 * properly implement image optimization.
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src: sourceUrl,
  fallbackSrc = '/placeholder-food.jpg',
  alt = '',
  priority = false,
  // Unused props kept for API compatibility
  options = {},
  placeholder = 'none',
  ...imgProps
}) => {
  // Use the original source URL or fallback if not available
  const imageSrc = sourceUrl || fallbackSrc;
  
  // Set loading attribute based on priority
  const loadingAttribute = priority ? 'eager' : 'lazy';

  // Simple error handler to use fallback image
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (sourceUrl !== fallbackSrc) {
      (e.target as HTMLImageElement).src = fallbackSrc;
    }
    
    // Call the original onError handler if provided
    if (imgProps.onError) {
      imgProps.onError(e);
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading={loadingAttribute}
      onError={handleError}
      {...imgProps}
    />
  );
};

export default OptimizedImage;
