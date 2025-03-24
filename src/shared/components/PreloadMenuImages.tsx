import { useEffect } from 'react';
import type { MenuItem } from '../../ordering/types/menu';

interface PreloadMenuImagesProps {
  items: MenuItem[];
  count?: number; // Number of images to preload
}

/**
 * Component that adds preload links for menu item images to the document head
 * This helps the browser prioritize downloading important menu images as soon as possible
 */
export const PreloadMenuImages: React.FC<PreloadMenuImagesProps> = ({ 
  items, 
  count = 3 // Default to preloading first 3 images
}) => {
  useEffect(() => {
    // Only preload if we have items
    if (!items || items.length === 0) return;
    
    // Get the first N items to preload
    const itemsToPreload = items.slice(0, count);
    
    // Create link elements for each image
    itemsToPreload.forEach(item => {
      if (!item.image) return;
      
      const linkElement = document.createElement('link');
      linkElement.rel = 'preload';
      linkElement.href = item.image;
      linkElement.as = 'image';
      linkElement.setAttribute('fetchpriority', 'high');
      
      // Add to head
      document.head.appendChild(linkElement);
    });
    
    // Clean up on unmount
    return () => {
      itemsToPreload.forEach(item => {
        if (!item.image) return;
        
        const linkElement = document.querySelector(`link[rel="preload"][href="${item.image}"]`);
        if (linkElement && linkElement.parentNode) {
          linkElement.parentNode.removeChild(linkElement);
        }
      });
    };
  }, [items, count]);
  
  return null; // This component doesn't render anything
};

export default PreloadMenuImages;
