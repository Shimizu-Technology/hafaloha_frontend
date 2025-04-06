// src/shared/components/ui/OptimizedImage.tsx
import React from 'react';
import ResponsiveImage from './ResponsiveImage';
import { NetlifyImageOptions, isNetlifyImageCdnAvailable } from '../../utils/imageUtils';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined | null;
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'avif' | 'webp' | 'jpg' | 'png';
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    context?: 'menuItem' | 'hero' | 'cart' | 'featured';
  };
  placeholder?: 'blur' | 'none';
  priority?: boolean;
  fallbackSrc?: string;
}

/**
 * OptimizedImage component that uses Netlify Image CDN and responsive images
 * for optimal image loading and performance
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src: sourceUrl,
  fallbackSrc = '/placeholder-food.jpg',
  alt = '',
  priority = false,
  options = {},
  placeholder = 'none',
  ...imgProps
}) => {
  // Determine if Netlify Image CDN is available
  const isCdnAvailable = isNetlifyImageCdnAvailable();
  
  // Merge options with defaults
  const mergedOptions: NetlifyImageOptions = {
    format: 'auto',
    quality: 75,
    fit: 'cover',
    ...options
  };
  // Define responsive widths based on context or options
  let responsiveWidths: number[] = [];
  
  // If width is specified, create a range of widths for responsive images
  if (mergedOptions.width) {
    const baseWidth = mergedOptions.width;
    // Create a range of widths for different viewport sizes
    responsiveWidths = [
      Math.round(baseWidth / 2),  // Small screens
      baseWidth,                  // Medium screens
      Math.round(baseWidth * 1.5) // Large screens
    ];
  } else if (options.context) {
    // Use predefined widths based on context
    switch (options.context) {
      case 'menuItem':
        responsiveWidths = [200, 400, 600];
        break;
      case 'hero':
        responsiveWidths = [768, 1280, 1920];
        break;
      case 'cart':
        responsiveWidths = [50, 100, 150];
        break;
      case 'featured':
        responsiveWidths = [300, 600, 900];
        break;
      default:
        responsiveWidths = [300, 600, 900];
    }
  } else {
    // Default widths if no context or width specified
    responsiveWidths = [300, 600, 900];
  }
  
  // Define sizes attribute based on context
  let sizes = '';
  if (options.context) {
    switch (options.context) {
      case 'menuItem':
        sizes = '(max-width: 768px) 90vw, (max-width: 1200px) 50vw, 400px';
        break;
      case 'hero':
        sizes = '100vw'; // Hero images typically span the full viewport width
        break;
      case 'cart':
        sizes = '100px'; // Cart images are usually small and fixed size
        break;
      case 'featured':
        sizes = '(max-width: 768px) 90vw, (max-width: 1200px) 60vw, 600px';
        break;
      default:
        sizes = '(max-width: 768px) 90vw, (max-width: 1200px) 50vw, 600px';
    }
  } else {
    // Default sizes if no context specified
    sizes = '(max-width: 768px) 90vw, (max-width: 1200px) 50vw, 600px';
  }
  
  // If CDN is not available, fall back to regular image
  if (!isCdnAvailable) {
    return (
      <img
        src={sourceUrl || fallbackSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onError={(e) => {
          if (sourceUrl !== fallbackSrc) {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }
        }}
        {...imgProps}
      />
    );
  }
  
  // Use ResponsiveImage component for optimized, responsive images
  return (
    <ResponsiveImage
      src={sourceUrl}
      widths={responsiveWidths}
      sizes={sizes}
      alt={alt}
      options={{
        format: mergedOptions.format,
        quality: mergedOptions.quality,
        fit: mergedOptions.fit,
      }}
      fallbackSrc={fallbackSrc}
      priority={priority}
      {...imgProps}
    />
  );
};

export default OptimizedImage;
