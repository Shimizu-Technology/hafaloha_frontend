// src/shared/components/ui/OptimizedImage.tsx
import React from 'react';
import ResponsiveImage from './ResponsiveImage';
import { ImgixImageOptions } from '../../utils/imageUtils';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined | null;
  // Allow overriding Imgix options like fit, quality, auto
  imgixOptions?: Omit<ImgixImageOptions, 'width' | 'height'>;
  // Context helps determine default sizes/widths
  context?: 'menuItem' | 'hero' | 'cart' | 'featured';
  // Allow explicitly setting widths/sizes if context isn't enough
  widths?: number[];
  sizes?: string;
  alt?: string;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  fallbackSrc?: string;
}

/**
 * OptimizedImage component that uses Imgix and responsive images
 * for optimal image loading and performance
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src: sourceUrl,
  fallbackSrc = '/placeholder-food.png',
  alt = '',
  priority = false,
  fetchPriority,
  imgixOptions: explicitImgixOptions, // Renamed to avoid clash
  context,
  widths: explicitWidths,
  sizes: explicitSizes,
  ...imgProps // Pass down className, style etc.
}) => {
  // Determine responsive widths based on context or explicit prop
  let responsiveWidths: number[];
  if (explicitWidths) {
    responsiveWidths = explicitWidths;
  } else if (context) {
    switch (context) {
      case 'menuItem': responsiveWidths = [200, 400, 600]; break;
      case 'hero': responsiveWidths = [768, 1280, 1920, 2400]; break; // Added larger size
      case 'cart': responsiveWidths = [100, 200]; break; // Simplified cart
      case 'featured': responsiveWidths = [300, 600, 900, 1200]; break;
      default: responsiveWidths = [400, 800, 1200]; // Default set
    }
  } else {
    responsiveWidths = [400, 800, 1200]; // Fallback default
  }
  
  // Determine sizes attribute based on context or explicit prop
  let sizes: string;
  if (explicitSizes) {
    sizes = explicitSizes;
  } else if (context) {
    switch (context) {
      case 'menuItem': sizes = '(max-width: 500px) 90vw, (max-width: 768px) 45vw, 300px'; break; // Example sizes
      case 'hero': sizes = '100vw'; break; // Hero usually full width
      case 'cart': sizes = '100px'; break; // Fixed small size
      case 'featured': sizes = '(max-width: 768px) 90vw, 600px'; break; // Example sizes
      default: sizes = '(max-width: 768px) 90vw, 50vw'; // Default sizes
    }
  } else {
    sizes = '(max-width: 768px) 90vw, 50vw'; // Fallback default sizes
  }
  
  // Special case for 'cart' context - still use ResponsiveImage but with optimized settings
  if (context === 'cart') {
    // Use smaller widths and fixed size for cart items
    const cartImgixOptions: Omit<ImgixImageOptions, 'width' | 'height'> = {
      auto: 'format,compress',
      fit: 'crop',
      quality: 80,
      // Apply a higher DPR for sharper thumbnails
      dpr: 2,
      ...explicitImgixOptions
    };
    
    return (
      <ResponsiveImage
        src={sourceUrl}
        widths={[100, 200]} // Small widths for cart thumbnails
        sizes="100px" // Fixed size
        alt={alt}
        imgixOptions={cartImgixOptions}
        fallbackSrc={fallbackSrc}
        priority={false} // Cart items don't need priority loading
        fetchPriority={fetchPriority}
        loading="lazy" // Always lazy load cart items
        {...imgProps}
      />
    );
  }
  
  // Default base Imgix options
  const baseImgixOptions: Omit<ImgixImageOptions, 'width' | 'height'> = {
    auto: 'format,compress', // Default optimization
    fit: 'cover',             // Default fit
    quality: 75,              // Default quality
    ...explicitImgixOptions,  // Allow user overrides
  };

  // Use ResponsiveImage component for optimized, responsive images
  return (
    <ResponsiveImage
      src={sourceUrl}
      widths={responsiveWidths}
      sizes={sizes}
      alt={alt}
      imgixOptions={baseImgixOptions}
      fallbackSrc={fallbackSrc}
      priority={priority}
      fetchPriority={fetchPriority}
      {...imgProps} // Pass down className, style etc.
    />
  );
};

export default OptimizedImage;
