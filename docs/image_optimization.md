# Image Optimization with Netlify Image CDN

## Overview

Hafaloha uses Netlify's Image CDN service to optimize image loading performance throughout the application. This document outlines the implementation details, configuration, and best practices for image handling.

The implementation leverages modern web techniques including responsive images with `srcset` and `sizes` attributes, lazy loading, and automatic format selection to provide the best possible user experience.

## Architecture

### Image Storage and Delivery Flow

1. **Storage**: Images are stored in AWS S3 (`hafaloha.s3.ap-southeast-2.amazonaws.com`)
2. **Transformation**: Netlify Image CDN fetches, optimizes, and caches images on-demand
3. **Delivery**: Optimized images are served to users via Netlify's global CDN network

```
┌────────────┐    ┌───────────┐    ┌─────────────────┐    ┌──────────┐
│ S3 Bucket  │───>│ Netlify   │───>│ Netlify Image   │───>│ Browser  │
│ (Storage)  │    │ CDN       │    │ Transformation  │    │          │
└────────────┘    └───────────┘    └─────────────────┘    └──────────┘
```

### Key Benefits

1. **Performance**: Faster load times via optimized formats (AVIF/WebP), compression, and CDN caching
2. **Automation**: No need to pre-process images into multiple formats/sizes
3. **Modern Formats**: Automatic AVIF/WebP negotiation with `fm=auto`
4. **Responsiveness**: Integration with `srcset`/`sizes` for optimal image delivery
5. **Cost-Effective**: Leverages Netlify's existing CDN infrastructure

## Implementation

### Components

The image optimization implementation consists of the following components:

1. **ResponsiveImage.tsx**: A component that implements responsive images using `srcset` and `sizes` attributes
   - Generates multiple image URLs with different width parameters
   - Creates appropriate `srcset` and `sizes` attributes for optimal browser selection
   - Handles fallback images and loading priorities

2. **OptimizedImage.tsx**: A wrapper component that provides a simple API for image optimization
   - Determines appropriate image dimensions based on context (menu item, hero, cart)
   - Uses ResponsiveImage for CDN-enabled environments
   - Falls back to standard image tags when CDN is not available
   - Maintains backward compatibility with existing code

3. **imageUtils.ts**: Utility functions for image URL transformation
   - `getNetlifyImageUrl`: Transforms S3 URLs into Netlify Image CDN URLs
   - `isNetlifyImageCdnAvailable`: Detects if the Netlify Image CDN is available
   - `getImageDimensionsForContext`: Provides appropriate dimensions for different contexts

### Usage Examples

#### Basic Usage

```tsx
<OptimizedImage 
  src="https://hafaloha.s3.ap-southeast-2.amazonaws.com/menu-items/spam-musubi.jpg"
  alt="Spam Musubi"
  options={{ context: 'menuItem' }}
/>
```

#### Advanced Usage with Custom Options

```tsx
<OptimizedImage 
  src="https://hafaloha.s3.ap-southeast-2.amazonaws.com/hero/banner.jpg"
  alt="Hero Banner"
  priority={true} // Load with high priority
  options={{
    width: 1600,
    height: 900,
    format: 'auto',
    quality: 80,
    fit: 'cover'
  }}
/>
```

## Configuration

### S3 Bucket Configuration

The S3 bucket is configured with public read access to allow Netlify to fetch the original images:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::hafaloha/*"
    }
  ]
}
```

### Netlify Configuration

The `netlify.toml` file in the frontend project root includes the following configuration:

```toml
# Image CDN configuration
[images]
  # Allow Netlify to fetch images from the Hafaloha S3 bucket
  remote_images = [
    "https:\\/\\/hafaloha\\.s3\\.ap-southeast-2\\.amazonaws\\.com\\/.*"
  ]
  
  # Default image optimization settings
  quality = 80
  format = "auto"  # Will serve WebP or AVIF when supported by the browser
```

## Frontend Implementation

### OptimizedImage Component

The application uses a dedicated `OptimizedImage` React component that transforms S3 URLs to use Netlify's Image CDN:

```tsx
// Example usage
<OptimizedImage
  src="https://hafaloha.s3.ap-southeast-2.amazonaws.com/menu_item_1_1739747989.jpeg"
  alt="Menu Item"
  width={400}
  height={300}
  priority={false}
  placeholder="blur"
  options={{
    width: 400,
    height: 300,
    quality: 80,
    format: 'auto',
    fit: 'cover'
  }}
/>
```

### Image Utilities

The `imageUtils.ts` file provides helper functions for image optimization:

- `getNetlifyImageUrl`: Transforms S3 URLs to Netlify Image CDN URLs
- `isNetlifyImageCdnAvailable`: Detects if Netlify Image CDN is available in the current environment
- `getImageDimensionsForContext`: Provides appropriate dimensions for different image contexts

## Best Practices

### Image Sizing

The application uses context-specific image dimensions:

| Context    | Width (px) | Height (px) | Purpose                       |
|------------|------------|-------------|-------------------------------|
| menuItem   | 400        | 300         | Menu item cards               |
| hero       | 1920       | 1080        | Hero banner images            |
| cart       | 100        | 100         | Cart item thumbnails          |
| featured   | 600        | 400         | Featured item highlights      |

### Priority Loading

Critical images use priority loading to improve Core Web Vitals:

- Hero images
- Featured menu items
- Above-the-fold content

### Placeholder Strategy

The application uses blur placeholders for a better user experience:

- Hero images use blur placeholders
- Menu items use blur placeholders
- Other images load with standard loading

## Troubleshooting

### Common Issues

1. **Images not optimized**: Check browser network tab for requests to `/.netlify/images`
2. **CORS errors**: Verify S3 bucket CORS configuration
3. **404 errors**: Ensure S3 objects have public read access
4. **Low quality images**: Adjust quality parameter in image options

### Verification

To verify the Netlify Image CDN is working:

1. Inspect image elements in the browser
2. Look for `src` attributes starting with `/.netlify/images?url=...`
3. Check network requests for image format (WebP/AVIF in supported browsers)
4. Compare image file sizes before and after optimization

## Local Development

During local development:

- The Netlify Image CDN is only available when using Netlify Dev CLI
- Without Netlify Dev, the application falls back to original S3 URLs
- To test locally with Netlify Image CDN, run: `netlify dev`

## Backend Implementation

### Image Upload

The Rails backend handles image uploads to S3 using Active Storage:

1. Images are uploaded to the API
2. Active Storage processes and stores images in S3
3. The API returns the S3 URL which is then transformed by the frontend

### Image URL Structure

S3 image URLs follow this pattern:
```
https://hafaloha.s3.ap-southeast-2.amazonaws.com/[object_type]_[id]_[timestamp].[extension]
```

Example:
```
https://hafaloha.s3.ap-southeast-2.amazonaws.com/menu_item_1_1739747989.jpeg
```

## Performance Impact

The Netlify Image CDN implementation provides several performance benefits:

- **Reduced file sizes**: Modern formats (WebP, AVIF) reduce file size by 30-50%
- **Faster loading**: CDN caching reduces latency
- **Appropriate sizing**: Images are served at the appropriate dimensions for each device
- **Improved Core Web Vitals**: Faster Largest Contentful Paint (LCP) times
- **Reduced bandwidth**: Smaller files mean less data transfer for users

## Future Improvements

Potential future enhancements to the image optimization system:

1. Implement responsive `srcset` attributes for different viewport sizes
2. Add art direction for different device types
3. Implement image preloading for critical paths
4. Add automatic image compression during upload
5. Implement lazy-loaded image galleries for merchandise
