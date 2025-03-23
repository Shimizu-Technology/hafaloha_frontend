# Image Optimization Guide

This document outlines the image optimization techniques implemented in the Hafaloha application to improve performance, reduce loading times, and enhance the user experience.

## Implemented Optimizations

### 1. Lazy Loading

Images are now loaded lazily, meaning they are only loaded when they are about to enter the viewport. This significantly reduces initial page load time and saves bandwidth for images that may never be viewed.

```tsx
<CachedImage
  src={item.image}
  alt={item.name}
  loading="lazy"
  width={400}
  height={192}
/>
```

### 2. Progressive Loading Strategy

We've implemented a progressive loading strategy that prioritizes above-the-fold content:

```tsx
<MenuItem 
  key={item.id} 
  item={item} 
  index={index}
  // Prioritize loading for above-the-fold content (first 6 items)
  loading={index < 6 ? "eager" : "lazy"}
/>
```

This ensures that the most important images (those visible without scrolling) are loaded first, while others are loaded lazily as the user scrolls.

### 3. Image Caching

The `CachedImage` component implements browser caching via localStorage to improve subsequent page loads:

```tsx
// Try to get from cache first
const cachedImage = localStorage.getItem(`img_cache_${src}`);
if (cachedImage) {
  setImageSrc(cachedImage);
  setIsLoading(false);
  return;
}
```

### 4. Loading Placeholders

While images are loading, a placeholder is shown to prevent layout shifts and provide visual feedback to the user:

```tsx
// Placeholder while loading
if (isLoading) {
  return (
    <div 
      className="bg-gray-200 animate-pulse"
      style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
      aria-label={`Loading ${alt}`}
    />
  );
}
```

### 5. Error Handling

The `CachedImage` component gracefully handles loading errors by displaying a fallback UI:

```tsx
// Error fallback
if (hasError) {
  return (
    <div 
      className="bg-gray-100 flex items-center justify-center text-gray-400"
      aria-label={`Failed to load ${alt}`}
    >
      <svg>...</svg>
    </div>
  );
}
```

### 6. Responsive Images

Images are now responsive with appropriate sizing based on the device:

```tsx
// Generate srcset for responsive images
const getSrcSet = () => {
  if (!width) return undefined;
  
  // Get optimized srcset from utility function
  const { srcSet } = getOptimizedImageProps(src, width, height);
  return srcSet;
};
```

### 7. Image URL Optimization

We've implemented utility functions to optimize S3 image URLs by adding query parameters for resizing and format conversion:

```tsx
export function optimizeImageUrl(
  url: string,
  width?: number,
  height?: number,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): string {
  // Implementation details...
}
```

## Usage Guidelines

### Using the CachedImage Component

Replace standard `<img>` tags with the `CachedImage` component:

```tsx
// Before
<img
  src={item.image}
  alt={item.name}
  className="w-full h-48 object-cover"
/>

// After
<CachedImage
  src={item.image}
  alt={item.name}
  className="w-full h-48 object-cover"
  loading="lazy"
  width={400}
  height={192}
/>
```

### Prioritizing Above-the-Fold Content

For list or grid views, prioritize loading for above-the-fold content:

```tsx
{items.map((item, index) => (
  <Item 
    key={item.id} 
    item={item} 
    loading={index < 6 ? "eager" : "lazy"}
  />
))}
```

### Optimizing Image URLs

Use the image utility functions to optimize image URLs:

```tsx
import { getOptimizedImageProps } from '../../utils/imageUtils';

const { src: optimizedSrc, srcSet } = getOptimizedImageProps(
  originalImageUrl,
  400, // width
  300  // height
);
```

## Best Practices

1. **Always specify image dimensions**: This prevents layout shifts during loading.
2. **Use appropriate image formats**: WebP for modern browsers, with JPEG fallbacks.
3. **Optimize image size**: Resize images to the appropriate dimensions before serving.
4. **Prioritize critical images**: Use `loading="eager"` for critical above-the-fold images.
5. **Provide meaningful alt text**: Ensure all images have descriptive alt text for accessibility.

## Future Improvements

1. **Implement a CDN**: Consider using a dedicated image CDN like Cloudinary or Imgix for more advanced image optimization.
2. **Implement image preloading**: For critical images, consider using `<link rel="preload">` to preload them before they're needed.
3. **Add support for art direction**: Use the `<picture>` element for art direction (different images for different screen sizes).
4. **Implement blur-up technique**: Show a tiny, blurred version of the image while the full image loads.
5. **Add WebP detection**: Automatically serve WebP images to browsers that support them.

## Monitoring and Performance

Monitor image loading performance using tools like:

- Chrome DevTools Network panel
- Lighthouse audits
- Web Vitals metrics (LCP, CLS)

Regularly review and optimize images to ensure they're being served efficiently.
