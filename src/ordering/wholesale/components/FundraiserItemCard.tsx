// src/ordering/wholesale/components/FundraiserItemCard.tsx

import React, { useState, useEffect } from 'react';
import { FundraiserItem } from '../services/fundraiserService';
import { Eye, ShoppingCart, Settings } from 'lucide-react';
import useFundraiserItemOptionStore from '../store/fundraiserItemOptionStore';

interface FundraiserItemCardProps {
  item: FundraiserItem;
  featured?: boolean;
  selectedParticipantId?: number | null; // Kept for compatibility but no longer required
  onAddToCart: (item: FundraiserItem) => void;
  onQuickView: (item: FundraiserItem) => void;
  onCustomize?: (item: FundraiserItem) => void;
}

const FundraiserItemCard: React.FC<FundraiserItemCardProps> = ({
  item,
  featured = false,
  onAddToCart,
  onQuickView,
  onCustomize
}) => {
  // State for button animation
  const [buttonClicked, setButtonClicked] = useState(false);
  
  // Get option groups from the store
  const { getOptionGroupsForItem, fetchOptionGroups, isLoading } = useFundraiserItemOptionStore();
  const optionGroups = getOptionGroupsForItem(item.id);
  console.log(`[FundraiserItemCard] Item: ${item.id} (${item.name}) - optionGroups:`, optionGroups);
  
  // Flag to track if we attempted to fetch options
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  // For testing, you can hardcode some option groups to test the customize button
  // Comment this out in production
  // const testOptionGroups = [
  //   { id: 1, name: 'Test Options', min_select: 1, max_select: 1, options: [] }
  // ];
  
  // Fetch option groups on component mount if they don't exist
  useEffect(() => {
    if (!optionGroups && !fetchAttempted) {
      console.log(`[FundraiserItemCard] Fetching options for item: ${item.id}, fundraiserId: ${item.fundraiser_id}`);
      if (!item.fundraiser_id) {
        console.error(`[FundraiserItemCard] Missing fundraiser_id for item: ${item.id} (${item.name})`);
      }
      fetchOptionGroups(item.id, item.fundraiser_id);
      setFetchAttempted(true);
    }
  }, [fetchOptionGroups, item.id, item.fundraiser_id, optionGroups, fetchAttempted]);

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Add item to cart without participant (participant will be selected at checkout)
    // Toast notification is handled in the parent component
    onAddToCart(item);
    
    // Trigger animation
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 300);
  };
  
  // Handle customize click
  const handleCustomize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCustomize) {
      onCustomize(item);
    }
  };
  
  // Handle quick view click
  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(item);
  };
  
  // Check if item is available
  const isAvailable = !item.enable_stock_tracking || !item.out_of_stock;
  
  // Only check if the item is available, no longer requiring participant selection
  const canAddToCart = isAvailable;
  
  // Show customize button if the item has option groups
  // Use option groups loaded from the API
  const hasApiOptionGroups = Boolean(optionGroups?.length);
  const showCustomizeButton = hasApiOptionGroups;
  
  console.log(`[FundraiserItemCard] Item: ${item.id} (${item.name})`);
  console.log(`  - hasApiOptionGroups: ${hasApiOptionGroups}`);
  console.log(`  - showCustomizeButton: ${showCustomizeButton}`);
  console.log(`  - isLoading: ${isLoading}`);
  console.log(`  - fetchAttempted: ${fetchAttempted}`);

  return (
    <div 
      className={`bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 ${
        featured ? 'border-[#c1902f]/20 ring-1 ring-[#c1902f]/10' : 'border-gray-200'
      }`}
    >
      {/* Item image */}
      <div className="h-48 bg-gray-200 relative">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500">No image</span>
          </div>
        )}
        
        {/* Featured badge */}
        {featured && (
          <div className="absolute top-2 left-2">
            <div className="bg-[#c1902f] text-white text-xs font-bold px-2 py-1 rounded-full">
              Featured
            </div>
          </div>
        )}
        
        {/* Stock status badge */}
        {item.enable_stock_tracking && (
          <div className="absolute top-2 right-2">
            {item.out_of_stock ? (
              <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Out of Stock
              </div>
            ) : item.low_stock ? (
              <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Low Stock
              </div>
            ) : null}
          </div>
        )}
        
        {/* Quick actions */}
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            onClick={handleQuickView}
            className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-sm hover:shadow transition-all duration-200"
            aria-label="Quick view"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>
      
      {/* Item details */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
          <div className="text-lg font-bold text-[#c1902f]">
            ${typeof item.price === 'number' 
              ? item.price.toFixed(2) 
              : parseFloat(String(item.price)).toFixed(2)}
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
        
        {showCustomizeButton ? (
          <button
            onClick={handleCustomize}
            disabled={!canAddToCart}
            className={`w-full py-2 px-4 rounded text-white font-medium flex items-center justify-center gap-2 ${buttonClicked ? 'animate-bounce' : ''} ${
              !canAddToCart
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#c1902f] hover:bg-[#d4a43f] transition-colors duration-300'
            }`}
          >
            <Settings size={16} className={buttonClicked ? 'animate-spin' : ''} />
            {item.enable_stock_tracking && item.out_of_stock
              ? 'Out of stock'
              : 'Customize'}
          </button>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className={`w-full py-2 px-4 rounded text-white font-medium flex items-center justify-center gap-2 ${buttonClicked ? 'animate-bounce' : ''} ${
              !canAddToCart
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#c1902f] hover:bg-[#d4a43f] transition-colors duration-300'
            }`}
          >
            <ShoppingCart size={16} className={buttonClicked ? 'animate-spin' : ''} />
            {item.enable_stock_tracking && item.out_of_stock
              ? 'Out of stock'
              : 'Add to Cart'}
          </button>
        )}
        {/* Debug info */}
        <div className="mt-2 text-xs text-gray-500">
          {item.fundraiser_id ? `FundraiserId: ${item.fundraiser_id}` : 'No fundraiserId!'}
        </div>
      </div>
    </div>
  );
};

export default FundraiserItemCard;
