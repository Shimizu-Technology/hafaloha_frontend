// src/ordering/wholesale/components/QuickViewModal.tsx

import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Settings } from 'lucide-react';
import { FundraiserItem } from '../services/fundraiserService';
import useFundraiserItemOptionStore from '../store/fundraiserItemOptionStore';

interface QuickViewModalProps {
  item: FundraiserItem | null;
  onClose: () => void;
  onAddToCart: (item: FundraiserItem) => void;
  showCustomizeOptions?: boolean;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({
  item,
  onClose,
  onAddToCart,
  showCustomizeOptions = false
}) => {
  if (!item) return null;
  
  // State for button animation
  const [buttonClicked, setButtonClicked] = useState(false);
  
  // Get option groups from the store
  const { getOptionGroupsForItem, fetchOptionGroups } = useFundraiserItemOptionStore();
  const optionGroups = item ? getOptionGroupsForItem(item.id) : null;
  
  // State for selected options
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});
  
  // Initialize selected options if item has customizations (for reopening customization)
  useEffect(() => {
    if (item?.customizations && optionGroups && showCustomizeOptions) {
      // We need to convert the customization names back to option IDs
      const newSelectedOptions: Record<number, number[]> = {};
      
      optionGroups.forEach(group => {
        const groupCustomizations = item.customizations?.[group.name];
        if (groupCustomizations && Array.isArray(groupCustomizations)) {
          // Find the option IDs for each customization name
          const optionIds = groupCustomizations.map(customName => {
            const option = group.options.find(opt => opt.name === customName);
            return option ? option.id : null;
          }).filter(id => id !== null) as number[];
          
          if (optionIds.length > 0) {
            newSelectedOptions[group.id] = optionIds;
          }
        }
      });
      
      // Only update if we found some options to restore
      if (Object.keys(newSelectedOptions).length > 0) {
        setSelectedOptions(newSelectedOptions);
      }
    }
  }, [item, optionGroups, showCustomizeOptions]);
  
  // Fetch option groups if not already loaded
  useEffect(() => {
    if (item && showCustomizeOptions && !optionGroups) {
      console.log(`[QuickViewModal] Fetching options for item: ${item.id}, fundraiserId: ${item.fundraiser_id}`);
      fetchOptionGroups(item.id, item.fundraiser_id);
    }
  }, [item, fetchOptionGroups, showCustomizeOptions, optionGroups]);
  
  // Calculate the additional price from selected options
  const calculateAdditionalPrice = (): number => {
    if (!optionGroups) return 0;
    
    let additionalPrice = 0;
    
    for (const group of optionGroups) {
      const selectedIds = selectedOptions[group.id] || [];
      
      if (selectedIds.length === 0) continue;
      
      selectedIds.forEach(optionId => {
        const option = group.options.find(opt => opt.id === optionId);
        if (option && option.additional_price_float) {
          additionalPrice += option.additional_price_float;
        }
      });
    }
    
    return additionalPrice;
  };
  
  // Get customizations as a record of group name to option names, and track prices
  const getCustomizationsWithPrices = (): {
    customizations: Record<string, string[]>;
    customizationPrices: Record<string, number>;
  } => {
    if (!optionGroups) return { customizations: {}, customizationPrices: {} };
    
    const customizations: Record<string, string[]> = {};
    const customizationPrices: Record<string, number> = {};
    
    for (const group of optionGroups) {
      const selectedIds = selectedOptions[group.id] || [];
      
      if (selectedIds.length > 0) {
        const selectedOptionNames = selectedIds.map(optionId => {
          const option = group.options.find(opt => opt.id === optionId);
          
          // If option has additional price, record it
          if (option) {
            if (option.additional_price_float && option.additional_price_float > 0) {
              customizationPrices[option.name] = option.additional_price_float;
            }
            return option.name;
          }
          
          return '';
        }).filter(Boolean);
        
        customizations[group.name] = selectedOptionNames;
      }
    }
    
    return { customizations, customizationPrices };
  };
  
  // Handle add to cart
  const handleAddToCart = () => {
    // Trigger animation
    setButtonClicked(true);
    
    setTimeout(() => {
      setButtonClicked(false);
      
      // Include selected options and update price
      const additionalPrice = calculateAdditionalPrice();
      const { customizations, customizationPrices } = getCustomizationsWithPrices();
      const basePrice = typeof item.price === 'number' 
        ? item.price 
        : parseFloat(String(item.price));
      
      const itemWithCustomizations = {
        ...item,
        price: basePrice + additionalPrice,
        customizations: customizations,
        customizationPrices: customizationPrices,
        basePrice: basePrice,
        selectedOptions // Include raw selected options for potential later use
      };
      
      onAddToCart(itemWithCustomizations);
      onClose();
    }, 300);
  };
  
  // Handle option selection
  const handleOptionSelect = (groupId: number, optionId: number, isMultiSelect: boolean) => {
    setSelectedOptions(prev => {
      // Create a copy of the current selections
      const newSelections = { ...prev };
      
      // If this is a multi-select option group
      if (isMultiSelect) {
        // Get current selections for this group or initialize empty array
        const currentSelections = newSelections[groupId] || [];
        
        // Check if option is already selected
        if (currentSelections.includes(optionId)) {
          // Remove it if already selected
          newSelections[groupId] = currentSelections.filter(id => id !== optionId);
        } else {
          // Add it if not selected
          newSelections[groupId] = [...currentSelections, optionId];
        }
      } else {
        // For single-select, just set the option
        newSelections[groupId] = [optionId];
      }
      
      return newSelections;
    });
  };
  
  // Check if an option is selected
  const isOptionSelected = (groupId: number, optionId: number) => {
    return selectedOptions[groupId]?.includes(optionId) || false;
  };
  
  // Check if item is available
  const isAvailable = !item.enable_stock_tracking || !item.out_of_stock;
  
  // Check if user can add to cart (item is available)
  const canAddToCart = isAvailable;
  
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full z-10"
        >
          <X size={20} />
        </button>
        
        {/* Item image */}
        <div className="md:w-1/2 h-64 md:h-auto bg-gray-200 relative">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 text-lg">No image available</span>
            </div>
          )}
          
          {/* Stock status badge */}
          {item.enable_stock_tracking && (
            <div className="absolute top-4 left-4">
              {item.out_of_stock ? (
                <div className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  Out of Stock
                </div>
              ) : item.low_stock ? (
                <div className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  Low Stock
                </div>
              ) : (
                <div className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  In Stock
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Item details */}
        <div className="md:w-1/2 p-6 flex flex-col overflow-y-auto">
          <div className="mb-2">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
                <div className="flex items-baseline">
                  <p className="text-xl text-[#c1902f] font-semibold mt-1">
                    ${(parseFloat(String(item.price)) + calculateAdditionalPrice()).toFixed(2)}
                  </p>
                  
                  {calculateAdditionalPrice() > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      (Base: ${parseFloat(String(item.price)).toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="prose prose-sm mb-6 flex-grow">
            <p className="text-gray-700">{item.description}</p>
            
            {/* Additional details */}
            <div className="mt-6 space-y-4">
              {item.enable_stock_tracking && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Availability:</span>
                  {item.out_of_stock ? (
                    <span className="text-red-600 text-sm font-medium">Out of stock</span>
                  ) : item.low_stock ? (
                    <span className="text-orange-600 text-sm font-medium">Low stock - order soon!</span>
                  ) : (
                    <span className="text-green-600 text-sm font-medium">In stock</span>
                  )}
                </div>
              )}
              
              {/* Item ID */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Item ID:</span>
                <span className="text-sm text-gray-600">{item.id}</span>
              </div>
            </div>
          </div>
          
          {/* Customization options */}
          {showCustomizeOptions && optionGroups && optionGroups.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customize Your Item</h3>
              
              {optionGroups.map(group => (
                <div key={group.id} className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-2">
                    {group.name}
                    {group.min_select > 0 && (
                      <span className="text-red-600 ml-1">*</span>
                    )}
                  </h4>
                  
                  {group.min_select > 0 && (
                    <p className="text-sm text-gray-600 mb-2">
                      {group.min_select === group.max_select
                        ? `Select exactly ${group.min_select} option${group.min_select !== 1 ? 's' : ''}`
                        : `Select ${group.min_select === 0 ? 'up to' : 'between ' + group.min_select + ' and'} ${group.max_select} option${group.max_select !== 1 ? 's' : ''}`}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    {group.options && group.options.map(option => (
                      <div 
                        key={option.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          isOptionSelected(group.id, option.id)
                            ? 'border-[#c1902f] bg-[#c1902f]/10'
                            : 'border-gray-200 hover:border-[#c1902f]/50'
                        }`}
                        onClick={() => handleOptionSelect(group.id, option.id, group.max_select > 1)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                              isOptionSelected(group.id, option.id)
                                ? 'border-[#c1902f] bg-[#c1902f]'
                                : 'border-gray-300'
                            }`}>
                              {isOptionSelected(group.id, option.id) && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            <span className="font-medium">{option.name}</span>
                          </div>
                          
                          {option.additional_price_float && option.additional_price_float > 0 && (
                            <span className="text-gray-600">+${option.additional_price_float.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="mt-6">
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
              You'll be able to select a participant to support during checkout.
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`w-full py-3 px-4 rounded text-white font-medium flex items-center justify-center gap-2 ${buttonClicked ? 'animate-bounce' : ''} ${
                !canAddToCart
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#c1902f] hover:bg-[#d4a43f] transition-colors duration-300'
              }`}
            >
              {showCustomizeOptions ? (
                <>
                  <Settings size={18} className={buttonClicked ? 'animate-spin' : ''} />
                  {item.enable_stock_tracking && item.out_of_stock
                    ? 'Out of stock'
                    : 'Add Customized Item'}
                </>
              ) : (
                <>
                  <ShoppingCart size={18} className={buttonClicked ? 'animate-spin' : ''} />
                  {item.enable_stock_tracking && item.out_of_stock
                    ? 'Out of stock'
                    : 'Add to Cart'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
