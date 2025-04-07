// src/shared/components/ui/ResponsiveImage.tsx
import React from 'react';
import { getImgixImageUrl, ImgixImageOptions } from '../../utils/imageUtils';

interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src: string | undefined | null; // Original source URL (e.g., from S3)
  widths: number[]; // Array of widths for srcset, e.g., [400, 800, 1200]
  sizes: string; // sizes attribute value, e.g., "(max-width: 600px) 90vw, 800px"
  alt: string;
  // Pass base Imgix options like fit, maybe default quality (q), auto
  imgixOptions?: Omit<ImgixImageOptions, 'width' | 'height'>;
  fallbackSrc?: string; // Local path for placeholder
  priority?: boolean; // For loading="eager" vs "lazy"
}

/**
 * ResponsiveImage component that uses srcset and sizes attributes for optimal image loading
 * Leverages Imgix for on-the-fly image transformations
 */
const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src: sourceUrl,
  widths,
  sizes,
  alt = '',
  imgixOptions = { auto: 'format,compress', fit: 'cover' }, // Default Imgix params
  fallbackSrc = '/placeholder-food.png', // Use a valid local placeholder
  priority = false,
  ...imgProps // Pass other img attributes like className, style, etc.
}) => {
  // Set loading attribute based on priority
  const loadingAttribute = priority ? 'eager' : 'lazy';

  // Handle missing source URL
  if (!sourceUrl || !widths || widths.length === 0) {
    console.log('ResponsiveImage: Missing src or widths, using fallback.');
    return (
      <img 
        src={fallbackSrc} 
        alt={alt} 
        loading={loadingAttribute}
        {...imgProps} 
      />
    );
  }

  // Ensure widths are sorted for predictable defaultSrc
  const sortedWidths = [...widths].sort((a, b) => a - b);

  // Generate srcset using getImgixImageUrl
  const srcset = sortedWidths
    .map(width => {
      // Pass the base options and the specific width for this source
      const url = getImgixImageUrl(sourceUrl, {
        ...imgixOptions,
        width: width,
      });
      // Format: url widthDescriptor (e.g., "image.jpg?w=400 400w")
      return url ? `${url} ${width}w` : '';
    })
    .filter(Boolean) // Remove empty strings if URL generation failed
    .join(', ');

  // Generate a default src (usually the smallest size) for older browsers
  const defaultSrc = getImgixImageUrl(sourceUrl, {
    ...imgixOptions,
    width: sortedWidths[0], // Use the smallest width
  });

  // If essential URLs couldn't be generated, fallback
  if (!srcset || !defaultSrc) {
    console.warn('ResponsiveImage: Could not generate srcset or defaultSrc, using fallback.');
    return (
      <img 
        src={fallbackSrc} // Or maybe sourceUrl if preferred?
        alt={alt} 
        loading={loadingAttribute}
        {...imgProps} 
      />
    );
  }

  return (
    <img
      src={defaultSrc} // Base src
      srcSet={srcset}   // Responsive sources
      sizes={sizes}     // How image relates to viewport
      alt={alt}
      loading={loadingAttribute} // Handle lazy/eager loading
      // Simple onError fallback to placeholder
      onError={(e) => {
        console.error('Imgix image failed to load, falling back:', defaultSrc);
        // Prevent infinite loops if the fallback also fails
        if ((e.target as HTMLImageElement).src !== fallbackSrc) {
          (e.target as HTMLImageElement).src = fallbackSrc;
        }
        // Clear srcset/sizes to prevent browser trying them again
        (e.target as HTMLImageElement).srcset = '';
        (e.target as HTMLImageElement).sizes = '';
      }}
      {...imgProps} // Spread remaining props (className, style, etc.)
    />
  );
};

export default ResponsiveImage;
