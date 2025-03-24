import { useEffect } from 'react';

interface PreloadHeroImageProps {
  src: string;
}

/**
 * Component that adds a preload link for the hero image to the document head
 * This helps the browser prioritize downloading the hero image as soon as possible
 */
export const PreloadHeroImage: React.FC<PreloadHeroImageProps> = ({ src }) => {
  useEffect(() => {
    // Create link element
    const linkElement = document.createElement('link');
    linkElement.rel = 'preload';
    linkElement.href = src;
    linkElement.as = 'image';
    linkElement.setAttribute('fetchpriority', 'high');
    
    // Add to head
    document.head.appendChild(linkElement);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(linkElement);
    };
  }, [src]);
  
  return null; // This component doesn't render anything
};

export default PreloadHeroImage;
