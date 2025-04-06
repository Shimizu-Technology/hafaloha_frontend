// src/shared/components/ui/ResponsiveImage.tsx
import React from 'react';
import { getNetlifyImageUrl, NetlifyImageOptions } from '../../utils/imageUtils';

interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined | null;
  widths: number[]; // e.g., [400, 800, 1200]
  sizes: string; // e.g., "(max-width: 600px) 90vw, (max-width: 1200px) 50vw, 800px"
  alt: string;
  options?: Omit<NetlifyImageOptions, 'width'>; // Other options like format, quality, fit
  fallbackSrc?: string;
  priority?: boolean;
}

/**
 * ResponsiveImage component that uses srcset and sizes attributes for optimal image loading
 * Leverages Netlify Image CDN for on-the-fly image transformations
 */
const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src: sourceUrl,
  widths,
  sizes,
  alt = '',
  options = {},
  fallbackSrc = '/placeholder-food.jpg',
  priority = false,
  ...imgProps
}) => {
  // Set loading attribute based on priority
  const loadingAttribute = priority ? 'eager' : 'lazy';

  // If no source URL is provided, use fallback
  if (!sourceUrl) {
    return (
      <img 
        src={fallbackSrc} 
        alt={alt} 
        loading={loadingAttribute}
        {...imgProps} 
      />
    );
  }

  // Sort widths in ascending order
  const sortedWidths = [...widths].sort((a, b) => a - b);

  // Generate srcset with multiple widths
  const srcset = sortedWidths
    .map(width => {
      const url = getNetlifyImageUrl(sourceUrl, { 
        ...options,
        width, 
        format: options.format || 'auto',
        quality: options.quality || 75
      });
      return url ? `${url} ${width}w` : '';
    })
    .filter(Boolean) // Remove any empty entries if URL generation failed
    .join(', ');

  // Use the smallest width as the default src for browsers that don't support srcset
  const defaultSrc = getNetlifyImageUrl(sourceUrl, { 
    ...options,
    width: sortedWidths[0], 
    format: options.format || 'auto',
    quality: options.quality || 75
  });

  // If we couldn't generate a valid srcset or default src, fall back to the original URL or fallback
  if (!srcset || !defaultSrc) {
    return (
      <img 
        src={sourceUrl || fallbackSrc} 
        alt={alt} 
        loading={loadingAttribute}
        onError={(e) => {
          if (sourceUrl !== fallbackSrc) {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }
        }}
        {...imgProps} 
      />
    );
  }

  return (
    <img
      src={defaultSrc}
      srcSet={srcset}
      sizes={sizes}
      alt={alt}
      loading={loadingAttribute}
      onError={(e) => {
        if (sourceUrl !== fallbackSrc) {
          (e.target as HTMLImageElement).src = fallbackSrc;
        }
      }}
      {...imgProps}
    />
  );
};

export default ResponsiveImage;
