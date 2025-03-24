import { useEffect, useRef } from 'react';
import type { MenuItem } from '../../ordering/types/menu';

interface PreloadMenuImagesProps {
  items: MenuItem[];
  count?: number; // Number of images to preload
  allItems?: MenuItem[]; // All menu items, regardless of category
  categoryId?: number | null; // Current category ID
}

/**
 * Component that adds preload links for menu item images to the document head
 * This helps the browser prioritize downloading important menu images as soon as possible
 *
 * Enhanced to handle category switching by preloading images from all categories
 * and maintaining preload links across category changes
 */
export const PreloadMenuImages: React.FC<PreloadMenuImagesProps> = ({
  items,
  count = 3, // Default to preloading first 3 images
  allItems = [],
  categoryId
}) => {
  // Keep track of all preloaded image URLs to avoid duplicates
  const preloadedUrls = useRef<Set<string>>(new Set());
  
  // Preload images for the current category with high priority
  useEffect(() => {
    // Only preload if we have items
    if (!items || items.length === 0) return;
    
    // Get the first N items to preload with high priority
    const itemsToPreload = items.slice(0, count);
    const newPreloadLinks: HTMLLinkElement[] = [];
    
    // Create link elements for each image with high priority
    itemsToPreload.forEach(item => {
      if (!item.image) {
        console.warn('[PreloadMenuImages] Item missing image property:', item);
        return;
      }
      
      if (preloadedUrls.current.has(item.image)) {
        console.log('[PreloadMenuImages] Image already preloaded:', item.image);
        return;
      }
      
      console.log('[PreloadMenuImages] Preloading high priority image:', item.image);
      
      const linkElement = document.createElement('link');
      linkElement.rel = 'preload';
      linkElement.href = item.image;
      linkElement.as = 'image';
      linkElement.setAttribute('fetchpriority', 'high');
      linkElement.setAttribute('data-category', categoryId?.toString() || 'all');
      
      // Add to head
      document.head.appendChild(linkElement);
      newPreloadLinks.push(linkElement);
      preloadedUrls.current.add(item.image);
    });
    
    // No cleanup for high priority images - we want to keep them preloaded
  }, [items, count, categoryId]);
  
  // Preload images for other categories with lower priority
  useEffect(() => {
    // Skip if we don't have all items
    if (!allItems || allItems.length === 0) return;
    
    // On mobile, preload more aggressively
    const isMobile = window.innerWidth < 768;
    const preloadCount = isMobile ? 2 : 1; // Preload fewer items per category on mobile to avoid overwhelming
    
    // Group items by category for selective preloading
    const itemsByCategory: Record<string, MenuItem[]> = {};
    
    allItems.forEach(item => {
      if (!item.image) return;
      
      // Skip if already preloaded with high priority
      if (preloadedUrls.current.has(item.image)) return;
      
      // Group by category
      (item.category_ids || []).forEach(catId => {
        const catKey = catId.toString();
        if (!itemsByCategory[catKey]) {
          itemsByCategory[catKey] = [];
        }
        
        // Only add if not already in this category's list
        if (!itemsByCategory[catKey].some(i => i.id === item.id)) {
          itemsByCategory[catKey].push(item);
        }
      });
    });
    
    const newPreloadLinks: HTMLLinkElement[] = [];
    
    // For each category, preload the first few items
    Object.entries(itemsByCategory).forEach(([catId, catItems]) => {
      // Skip current category as it's handled with high priority
      if (categoryId !== null && categoryId !== undefined && catId === categoryId.toString()) return;
      
      // Preload first few items from each category
      catItems.slice(0, preloadCount).forEach(item => {
        if (!item.image || preloadedUrls.current.has(item.image)) return;
        
        const linkElement = document.createElement('link');
        linkElement.rel = 'preload';
        linkElement.href = item.image;
        linkElement.as = 'image';
        // Use lower priority for other categories
        linkElement.setAttribute('fetchpriority', 'low');
        linkElement.setAttribute('data-category', catId);
        
        // Add to head
        document.head.appendChild(linkElement);
        newPreloadLinks.push(linkElement);
        preloadedUrls.current.add(item.image);
      });
    });
    
    // Clean up only these low-priority preloads on unmount
    return () => {
      newPreloadLinks.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
          // Remove from our tracking set
          preloadedUrls.current.delete(link.href);
        }
      });
    };
  }, [allItems, categoryId]);
  
  return null; // This component doesn't render anything
};

export default PreloadMenuImages;
