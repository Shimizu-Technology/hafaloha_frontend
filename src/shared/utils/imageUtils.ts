// src/shared/utils/imageUtils.ts

/**
 * Interface for Netlify Image CDN transformation options
 */
export interface NetlifyImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'avif' | 'webp' | 'jpg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Transforms a source URL into a Netlify Image CDN URL with optimization options
 * 
 * @param sourceUrl - The original image URL (typically from S3)
 * @param options - Image transformation options
 * @returns The transformed Netlify Image CDN URL or the original URL if transformation fails
 */
export function getNetlifyImageUrl(sourceUrl: string | undefined | null, options: NetlifyImageOptions = {}): string | undefined {
  // Return undefined if no source URL is provided
  if (!sourceUrl) {
    return undefined;
  }

  // Skip transformation for local development placeholder images
  if (sourceUrl.startsWith('/')) {
    return sourceUrl;
  }

  try {
    // Basic validation: Check if it looks like an HTTP(S) URL
    new URL(sourceUrl);
  } catch (error) {
    console.error("Invalid source URL for Netlify Image:", sourceUrl, error);
    return sourceUrl; // Return original URL on error
  }

  // Create URL parameters for the Netlify Image CDN
  const params = new URLSearchParams();
  
  // The source URL must be the first parameter
  params.set('url', sourceUrl);

  // Add transformation options if provided
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  if (options.quality) params.set('q', String(options.quality));
  if (options.format) params.set('fm', options.format);
  if (options.fit) params.set('fit', options.fit);

  // Set defaults if not provided
  if (!options.format) params.set('fm', 'auto'); // Use best format for browser
  if (!options.quality && !params.has('q')) params.set('q', '80'); // Default quality 80%

  // Return the Netlify Image CDN URL
  return `/.netlify/images?${params.toString()}`;
}

/**
 * Determines if the Netlify Image CDN is available in the current environment
 * 
 * @returns boolean indicating if Netlify Image CDN is available
 */
export function isNetlifyImageCdnAvailable(): boolean {
  // In development, the Netlify Image CDN is only available when using Netlify Dev
  // In production on Netlify, it's always available
  const isNetlifyProduction = process.env.NETLIFY === 'true';
  const isNetlifyDev = process.env.NETLIFY_DEV === 'true';
  
  return isNetlifyProduction || isNetlifyDev;
}

/**
 * Gets appropriate image dimensions based on the usage context
 * 
 * @param context - Where the image will be used (e.g., 'menuItem', 'hero', 'cart')
 * @returns The recommended dimensions for the given context
 */
export function getImageDimensionsForContext(context: 'menuItem' | 'hero' | 'cart' | 'featured'): NetlifyImageOptions {
  switch (context) {
    case 'menuItem':
      return {
        width: 400,
        height: 300,
        fit: 'cover'
      };
    case 'hero':
      return {
        width: 1920,
        height: 1080,
        fit: 'cover'
      };
    case 'cart':
      return {
        width: 100,
        height: 100,
        fit: 'cover'
      };
    case 'featured':
      return {
        width: 600,
        height: 400,
        fit: 'cover'
      };
    default:
      return {};
  }
}
