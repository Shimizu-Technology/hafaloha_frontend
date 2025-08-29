// src/wholesale/components/WholesaleCustomizationModal.tsx
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import { wholesaleApi } from '../services/wholesaleApi';
import type { WholesaleItem, WholesaleOptionGroup, WholesaleOption } from '../services/wholesaleApi';
import { 
  isOptionAvailable, 
  getOptionAvailableQuantity, 
  validateCartItemInventory, 
  getMaxQuantityForItem,
  getStockStatusDisplay 
} from '../utils/inventoryUtils';

interface WholesaleCustomizationModalProps {
  item: WholesaleItem;
  fundraiserId: number;
  fundraiserSlug: string;
  onClose: () => void;
}

export function WholesaleCustomizationModal({ item, fundraiserId, fundraiserSlug, onClose }: WholesaleCustomizationModalProps) {
  // State for detailed item data with inventory info
  const [detailedItem, setDetailedItem] = useState<WholesaleItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const { addToCart, items: cartItems } = useWholesaleCart();

  // Track user selections: selections[groupId] = array of optionIds
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  
  // Track which option group is expanded (accordion style)
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  
  // Track whether price breakdown is expanded or collapsed
  const [isPriceBreakdownExpanded, setIsPriceBreakdownExpanded] = useState(false);
  
  // Force re-render when selections change to update price calculations
  const [, forceUpdate] = useState({});

  // Fetch detailed item data with inventory information
  useEffect(() => {
    const fetchDetailedItem = async () => {
      try {
        setLoadingDetails(true);
        const response = await wholesaleApi.getFundraiserItems(fundraiserSlug);
        
        if (response.success && response.data?.items) {
          const foundItem = response.data.items.find(i => i.id === item.id);
          if (foundItem) {
            setDetailedItem(foundItem);
            console.log('[WholesaleCustomizationModal] Loaded detailed item:', foundItem);
          } else {
            console.warn('[WholesaleCustomizationModal] Item not found in detailed response');
            setDetailedItem(item); // Fallback to original item
          }
        } else {
          console.warn('[WholesaleCustomizationModal] Failed to fetch detailed items');
          setDetailedItem(item); // Fallback to original item
        }
      } catch (error) {
        console.error('[WholesaleCustomizationModal] Error fetching detailed item:', error);
        setDetailedItem(item); // Fallback to original item
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetailedItem();
  }, [item.id, fundraiserSlug, item]);

  // Use detailed item data if available, otherwise fallback to original item
  const currentItem = detailedItem || item;
  
  // Safely handle no option_groups
  const optionGroups = currentItem.option_groups || [];

  // Initialize selections with pre-selected options and set first group as expanded
  useEffect(() => {
    const initialSelections: Record<number, number[]> = {};
    
    optionGroups.forEach(group => {
      // For wholesale, we don't have pre-selected options, so start empty
      initialSelections[group.id] = [];
    });
    
    setSelections(initialSelections);
    
    // Set the first group as expanded by default, or the first required group if any
    if (optionGroups.length > 0) {
      const requiredGroup = optionGroups.find(group => group.min_select > 0);
      setExpandedGroupId(requiredGroup?.id || optionGroups[0]?.id || null);
    }
  }, [optionGroups]);

  // Toggle an option in a group, respecting max_select
  function handleOptionToggle(group: WholesaleOptionGroup, opt: WholesaleOption) {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      let newSelections;
      
      if (current.includes(opt.id)) {
        // Remove this opt.id
        newSelections = {
          ...prev,
          [group.id]: current.filter((id) => id !== opt.id),
        };
      } else if (current.length >= group.max_select) {
        // If we are at max => remove the first selected
        newSelections = {
          ...prev,
          [group.id]: [...current.slice(1), opt.id],
        };
      } else {
        // Otherwise, just add it
        newSelections = {
          ...prev,
          [group.id]: [...current, opt.id],
        };
      }
      
      // Force a re-render to update price calculations
      setTimeout(() => forceUpdate({}), 0);
      
      return newSelections;
    });
  }

  // Get detailed price breakdown for each option group
  function getPriceBreakdown(): { groupName: string; options: { name: string; price: number }[] }[] {
    const breakdown: { groupName: string; options: { name: string; price: number }[] }[] = [];
    
    for (const group of optionGroups) {
      const chosenIds = selections[group.id] || [];
      
      // Skip if no selections
      if (chosenIds.length === 0) continue;
      
      // Get all selected options with their details
      const selectedOptions = chosenIds
        .map(id => {
          const option = group.options.find(o => o.id === id);
          return option ? {
            id,
            name: option.name,
            price: option.additional_price
          } : null;
        })
        .filter(Boolean) as { id: number; name: string; price: number }[];
      
      // All options are paid in wholesale (no free options concept)
      const paidOptions = selectedOptions
        .filter(opt => opt.price > 0)
        .map(opt => ({ name: opt.name, price: opt.price }));
      
      if (paidOptions.length > 0) {
        breakdown.push({
          groupName: group.name,
          options: paidOptions
        });
      }
    }
    
    return breakdown;
  }

  // Sum up the additional price across all selected options
  function getAdditionalPrice(): number {
    let sum = 0;
    
    for (const group of optionGroups) {
      const chosenIds = selections[group.id] || [];
      
      // Skip if no selections
      if (chosenIds.length === 0) continue;
      
      // Get all selected options with their prices
      const selectedOptions = chosenIds
        .map(id => {
          const option = group.options.find(o => o.id === id);
          return option ? {
            id,
            name: option.name,
            price: option.additional_price
          } : null;
        })
        .filter(Boolean) as { id: number; name: string; price: number }[];
      
      // Add all option prices (no free options in wholesale)
      for (const opt of selectedOptions) {
        sum += opt.price;
      }
    }
    
    return sum;
  }

  // Get existing cart quantity for this item with same options
  const getExistingCartQuantity = (): number => {
    const backendSelectedOptions: Record<string, number[]> = {};
    optionGroups.forEach(group => {
      const chosenIds = selections[group.id] || [];
      if (chosenIds.length > 0) {
        backendSelectedOptions[group.id.toString()] = chosenIds;
      }
    });

    const existingItem = cartItems.find(cartItem => 
      cartItem.itemId === item.id && 
      JSON.stringify(cartItem.options || {}) === JSON.stringify(backendSelectedOptions)
    );
    
    return existingItem ? existingItem.quantity : 0;
  };

  // Check if all required groups have the minimum number of selections
  function validateSelections(): boolean {
    for (const group of optionGroups) {
      // If min_select > 0, the group is required
      if (group.min_select > 0) {
        const selectedCount = (selections[group.id] || []).length;
        if (selectedCount < group.min_select) {
          return false;
        }
      }
    }
    return true;
  }

  // Calculate prices
  const basePrice = currentItem.price;
  const addlPrice = getAdditionalPrice();
  const totalItemPrice = (basePrice + addlPrice) * quantity;
  const isValid = validateSelections();

  // Helper function to get current stock status
  const getCurrentStockStatus = () => {
    const backendSelectedOptions: Record<string, number[]> = {};
    optionGroups.forEach(group => {
      const chosenIds = selections[group.id] || [];
      if (chosenIds.length > 0) {
        backendSelectedOptions[group.id.toString()] = chosenIds;
      }
    });
    
    if (Object.keys(backendSelectedOptions).length === 0) {
      return { canAddMore: true, maxQuantity: 999, availableToAdd: 999, hasSelections: false };
    }
    
    const existingCartQuantity = getExistingCartQuantity();
    const maxQuantity = getMaxQuantityForItem(currentItem, backendSelectedOptions, existingCartQuantity);
    const availableToAdd = maxQuantity - existingCartQuantity;
    const canAddMore = quantity < maxQuantity;
    
    return { canAddMore, maxQuantity, availableToAdd, hasSelections: true };
  };

  const stockStatus = getCurrentStockStatus();

  // Handle add to cart
  function handleAddToCart() {
    if (!isValid) return;

    // Convert selections to the format expected by the backend (group ID -> option IDs)
    const backendSelectedOptions: Record<string, number[]> = {};
    // Convert selections to display format (group name -> option names)
    const displaySelectedOptions: Record<string, string> = {};
    
    optionGroups.forEach(group => {
      const chosenIds = selections[group.id] || [];
      if (chosenIds.length > 0) {
        // Backend format: group ID -> array of option IDs
        backendSelectedOptions[group.id.toString()] = chosenIds;
        
        // Display format: group name -> comma-separated option names
        const selectedOptionNames = chosenIds
          .map(id => group.options.find(o => o.id === id)?.name)
          .filter(Boolean);
        displaySelectedOptions[group.name] = selectedOptionNames.join(', ');
      }
    });

    // Validate inventory before adding to cart
    const existingCartQuantity = getExistingCartQuantity();
    const inventoryValidation = validateCartItemInventory(
      currentItem, 
      backendSelectedOptions, 
      quantity, 
      existingCartQuantity
    );

    if (!inventoryValidation.isValid) {
      alert(`Cannot add to cart:\n\n${inventoryValidation.errors.join('\n')}`);
      return;
    }

    // Note: Low stock warnings removed - we show this info inline instead

    const success = addToCart({
      id: `${currentItem.id}-${Date.now()}`,
      itemId: currentItem.id,
      fundraiserId: fundraiserId,
      name: currentItem.name,
      description: currentItem.description,
      sku: currentItem.sku,
      price: totalItemPrice / quantity, // Price per item including customizations
      priceCents: Math.round((totalItemPrice / quantity) * 100),
      imageUrl: currentItem.primary_image_url,
      options: backendSelectedOptions, // For backend processing
      selectedOptions: displaySelectedOptions // For display in cart/checkout
    }, quantity);

    if (success) {
      onClose();
    }
  }

  // Get validation message for a group
  function getGroupValidationMessage(group: WholesaleOptionGroup): string | null {
    const selectedCount = (selections[group.id] || []).length;
    
    if (group.min_select > 0 && selectedCount < group.min_select) {
      if (group.min_select === 1) {
        return "Please select an option";
      }
      return `Please select at least ${group.min_select} options`;
    }
    
    if (selectedCount > group.max_select) {
      return `Please select no more than ${group.max_select} options`;
    }
    
    return null;
  }

  // Show loading state while fetching detailed item data
  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-4 mx-auto border w-full max-w-lg shadow-lg rounded-lg bg-white my-8 p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c1902f]"></div>
            <span className="ml-3 text-gray-600">Loading item details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto border w-full max-w-lg shadow-lg rounded-lg bg-white my-8 max-h-[90vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Customize: {currentItem.name}</h3>
            {currentItem.description && (
              <p className="text-sm text-gray-600 mt-1">{currentItem.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Option Groups */}
        <div className="space-y-4 mb-6">
          {optionGroups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
            const selectedCount = (selections[group.id] || []).length;
            const validationMessage = getGroupValidationMessage(group);
            
            return (
              <div key={group.id} className="border border-gray-200 rounded-lg">
                {/* Group Header */}
                <button
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">
                      {group.name}
                      {group.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    <span className="text-sm text-gray-500">
                      (Select {group.min_select === group.max_select 
                        ? group.min_select 
                        : `${group.min_select}-${group.max_select}`})
                    </span>
                    {selectedCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#c1902f] text-white">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>



                {/* Group Options */}
                {isExpanded && (
                  <div className="p-3 border-t border-gray-200">
                    <div className="space-y-2">
                      {group.options.map((option) => {
                        const isSelected = (selections[group.id] || []).includes(option.id);
                        const isAvailable = isOptionAvailable(option, 1, group);
                        const availableQuantity = getOptionAvailableQuantity(option, group);
                        const stockDisplay = getStockStatusDisplay(availableQuantity);
                        
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => isAvailable && handleOptionToggle(group, option)}
                            disabled={!isAvailable}
                            className={`block w-full text-left px-4 py-3 border rounded-md transition-colors ${
                              !isAvailable 
                                ? 'cursor-not-allowed opacity-60 border-gray-300 bg-gray-100' 
                                : ''
                            }
                            ${!isAvailable ? '' : isSelected
                                ? 'border-[#c1902f] bg-[#c1902f]/10'
                              : 'border-gray-200 hover:border-[#c1902f] hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap">
                                  <span className={`font-medium ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {option.name}
                                  </span>
                                  {/* Show stock status badges for tracked options */}
                                  {group.enable_inventory_tracking && availableQuantity < 999 && (
                                    <>
                                      {availableQuantity === 0 && (
                                        <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                                          Out of Stock
                                        </span>
                                      )}
                                      {availableQuantity > 0 && availableQuantity <= 5 && (
                                        <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          Only {availableQuantity} left
                                        </span>
                                      )}
                                      {availableQuantity > 5 && (
                                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                          {availableQuantity} available
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                {!isAvailable && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {availableQuantity === 0 ? 'Out of stock' : 'This option is currently unavailable'}
                                  </p>
                                )}
                              </div>
                              {option.additional_price > 0 && (
                                <div className="ml-3 flex-shrink-0">
                                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                    isAvailable ? 'bg-[#c1902f] text-white' : 'bg-gray-100 text-gray-400'
                                  }`}>
                                    +${option.additional_price.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    {validationMessage && (
                      <p className="text-red-500 text-sm mt-2">
                        {validationMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        </div>
        
        {/* Fixed Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-lg border-t border-gray-200 p-6">
          {/* Price Breakdown */}
          <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-700">Price Breakdown</h4>
            <button 
              onClick={() => setIsPriceBreakdownExpanded(!isPriceBreakdownExpanded)}
              className="text-gray-500 hover:text-gray-700 flex items-center text-sm"
            >
              {isPriceBreakdownExpanded ? (
                <>
                  <span className="mr-1">Hide details</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span className="mr-1">View details</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          
          {/* Collapsed view - Summary only */}
          {!isPriceBreakdownExpanded ? (
            <div className="space-y-1 mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <span>Base: ${basePrice.toFixed(2)}</span>
                  {addlPrice > 0 && (
                    <span className="ml-1">+ Add-ons: ${addlPrice.toFixed(2)}</span>
                  )}
                </div>
                <span className="font-semibold">${(basePrice + addlPrice).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            /* Expanded view - Full breakdown */
            <div className="space-y-1 mb-3 animate-fadeIn">
              <div className="flex justify-between">
                <span>Base price:</span>
                <span>${basePrice.toFixed(2)}</span>
              </div>
              
              {/* Detailed breakdown of paid options by group */}
              {getPriceBreakdown().length > 0 && (
                <div className="mt-2">
                  {getPriceBreakdown().map((group, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-gray-600">
                        <span>{group.groupName} options ({group.options.length}):</span>
                        <span>+${group.options.reduce((sum, opt) => sum + opt.price, 0).toFixed(2)}</span>
                      </div>
                      {group.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex justify-between text-gray-600 text-sm pl-4">
                          <span>{opt.name}:</span>
                          <span>+${opt.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {addlPrice > 0 && (
                    <div className="flex justify-between text-gray-600 mt-2">
                      <span>Additional options total:</span>
                      <span>+${addlPrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className={`flex justify-between font-semibold border-t border-gray-200 pt-1 ${getPriceBreakdown().length === 0 ? 'mt-4' : 'mt-1'}`}>
                <span>Item total:</span>
                <span>${(basePrice + addlPrice).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quantity & total row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setQuantity((q) => Math.max(1, q - 1));
                forceUpdate({});
              }}
              disabled={quantity <= 1}
              className={`px-3 py-2 border rounded-md transition-colors ${
                quantity <= 1 
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              -
            </button>
            <span className="font-medium text-lg min-w-[2rem] text-center">{quantity}</span>
            <button
              onClick={() => {
                if (stockStatus.canAddMore) {
                  setQuantity((q) => q + 1);
                  forceUpdate({});
                }
              }}
              disabled={!stockStatus.canAddMore}
              className={`px-3 py-2 border rounded-md transition-colors ${
                stockStatus.canAddMore
                  ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              +
            </button>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">
              Total: ${totalItemPrice.toFixed(2)}
            </p>
            {stockStatus.hasSelections && stockStatus.availableToAdd < 999 && (
              <p className={`text-xs flex items-center justify-end mt-1 ${
                stockStatus.availableToAdd === 0 ? 'text-red-600' :
                stockStatus.availableToAdd <= 5 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {stockStatus.availableToAdd <= 5 && <AlertTriangle className="w-3 h-3 mr-1" />}
                {stockStatus.availableToAdd === 0 ? 'Out of stock' :
                 stockStatus.availableToAdd <= 5 ? `Only ${stockStatus.availableToAdd} left` :
                 `${stockStatus.availableToAdd} available`}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCart}
            className={`px-4 py-2 text-white rounded-md ${
              isValid 
                ? 'bg-[#c1902f] hover:bg-[#d4a43f]' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!isValid}
          >
            Add to Cart
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

export default WholesaleCustomizationModal;