/**
 * Utility functions for image optimization
 */

/**
 * Optimizes an S3 image URL by adding query parameters for resizing and format conversion
 * 
 * @param url The original S3 image URL
 * @param width The desired width of the image
 * @param height The desired height of the image
 * @param format The desired image format (webp, jpeg, etc.)
 * @returns The optimized image URL
 */
export function optimizeImageUrl(
  url: string,
  width?: number,
  height?: number,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): string {
  // Return the original URL if it's not an S3 URL
  if (!url || !url.includes('amazonaws.com')) {
    return url;
  }

  // Start building the query parameters
  const params: string[] = [];

  // Add width parameter if provided
  if (width) {
    params.push(`width=${width}`);
  }

  // Add height parameter if provided
  if (height) {
    params.push(`height=${height}`);
  }

  // Add format parameter
  params.push(`format=${format}`);

  // Add quality parameter for webp and jpeg
  if (format === 'webp' || format === 'jpeg') {
    params.push('quality=85');
  }

  // Add fit parameter to maintain aspect ratio
  params.push('fit=cover');

  // Combine the URL with the query parameters
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.join('&')}`;
}

/**
 * Generates a responsive image srcset for different device pixel ratios
 * 
 * @param url The original image URL
 * @param width The base width of the image
 * @param height The base height of the image
 * @returns A srcset string for responsive images
 */
export function generateSrcSet(
  url: string,
  width: number,
  height?: number
): string {
  if (!url) return '';

  const sizes = [1, 2, 3]; // 1x, 2x, 3x pixel densities
  
  return sizes
    .map(size => {
      const optimizedUrl = optimizeImageUrl(
        url,
        width * size,
        height ? height * size : undefined
      );
      return `${optimizedUrl} ${size}x`;
    })
    .join(', ');
}

/**
 * Enhances the CachedImage component by providing optimized URLs and srcset
 * 
 * @param src The original image URL
 * @param width The desired width of the image
 * @param height The desired height of the image
 * @returns An object with optimized src and srcset
 */
export function getOptimizedImageProps(
  src: string,
  width?: number,
  height?: number
): { src: string; srcSet?: string } {
  if (!src) {
    return { src: '' };
  }

  const optimizedSrc = optimizeImageUrl(src, width, height);
  
  // Only generate srcset if width is provided
  const srcSet = width ? generateSrcSet(src, width, height) : undefined;

  return {
    src: optimizedSrc,
    srcSet
  };
}
