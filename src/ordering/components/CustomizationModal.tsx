// src/ordering/components/CustomizationModal.tsx
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useOrderStore, CartItem } from '../store/orderStore';
import type { MenuItem, OptionGroup, MenuOption } from '../types/menu';

interface CustomizationModalProps {
  item: MenuItem;
  onClose: () => void;
  editMode?: boolean;
  existingCartItem?: CartItem;
  existingCartItemKey?: string;
}

export function CustomizationModal({ 
  item, 
  onClose,
  editMode = false,
  existingCartItem,
  existingCartItemKey
}: CustomizationModalProps) {
  const addToCart = useOrderStore((state) => state.addToCart);
  const updateCartItem = useOrderStore((state) => state.updateCartItem);

  // 1) Track user selections: selections[groupId] = array of optionIds
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  
  // Track which option group is expanded (accordion style)
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  
  // Track whether price breakdown is expanded or collapsed
  const [isPriceBreakdownExpanded, setIsPriceBreakdownExpanded] = useState(false);
  
  // Force re-render when selections change to update price calculations
  const [, forceUpdate] = useState({});

  // Safely handle no option_groups
  const optionGroups = item.option_groups || [];

  // Initialize selections based on option groups
  useEffect(() => {
    // Option groups initialization logic
  }, [optionGroups]);

  // Initialize selections with pre-selected options and set first group as expanded
  useEffect(() => {
    const initialSelections: Record<number, number[]> = {};
    
    // If in edit mode, pre-populate from existing cart item
    if (editMode && existingCartItem?.customizations) {
      const customizations = existingCartItem.customizations;
      
      // Validate customizations structure
      if (typeof customizations === 'object' && customizations !== null) {
        optionGroups.forEach(group => {
          const groupSelections = (customizations as Record<string, any>)[group.name];
          if (Array.isArray(groupSelections)) {
            // Map option names back to option IDs
            const selectedOptionIds = group.options
              .filter(opt => groupSelections.includes(opt.name))
              .map(opt => opt.id);
            initialSelections[group.id] = selectedOptionIds;
            
            // Warn if some options were dropped
            if (selectedOptionIds.length !== groupSelections.length) {
              console.warn(`Some options in ${group.name} are no longer available`);
            }
          } else {
            initialSelections[group.id] = [];
          }
        });
      } else {
        console.error('Invalid customizations structure in existing cart item');
        // Fall back to default pre-selected options
        optionGroups.forEach(group => {
          const preselectedOptions = group.options
            .filter(opt => opt.is_preselected && isOptionAvailable(opt, 1, group))
            .map(opt => opt.id);
          initialSelections[group.id] = preselectedOptions.slice(0, group.max_select);
        });
      }
      
      // Set quantity from existing item
      if (existingCartItem.quantity) {
        setQuantity(existingCartItem.quantity);
      }
    } else {
      // Normal mode: use pre-selected options
      optionGroups.forEach(group => {
        const preselectedOptions = group.options
          .filter(opt => opt.is_preselected && isOptionAvailable(opt, 1, group)) // Only include available options
          .map(opt => opt.id);
        
        if (preselectedOptions.length > 0) {
          // Only add preselected options up to max_select
          initialSelections[group.id] = preselectedOptions.slice(0, group.max_select);
        } else {
          initialSelections[group.id] = [];
        }
      });
    }
    
    setSelections(initialSelections);
    
    // Set the first group as expanded by default, or the first required group if any
    if (optionGroups.length > 0) {
      const requiredGroup = optionGroups.find(group => group.min_select > 0);
      setExpandedGroupId(requiredGroup?.id || optionGroups[0]?.id || null);
    }
  }, [optionGroups, editMode, existingCartItem]);

  // Toggle an option in a group, respecting max_select
  function handleOptionToggle(group: OptionGroup, opt: MenuOption) {
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
      
      // Get the free option count for this group
      const freeCount = group.free_option_count || 0;
      
      // If we have more selections than free options, calculate additional price
      if (chosenIds.length > freeCount) {
        // Get all selected options with their details
        const selectedOptions = chosenIds
          .map(id => {
            const option = group.options.find(o => o.id === id);
            // Debug: Log the option and its price
            // Option found and being processed
            
            // Try different ways to access the price
            const price = option ? 
              (typeof option.additional_price === 'number' ? option.additional_price : 
               typeof option.additional_price_float === 'number' ? option.additional_price_float : 
               typeof (option as any).additional_price_float === 'number' ? (option as any).additional_price_float : 
               2.0) : 0;
            
            // Price calculation for option
            
            return option ? {
              id,
              name: option.name,
              price: price
            } : null;
          })
          .filter(Boolean) as { id: number; name: string; price: number }[];
        
        // Sort by price (highest first) to be customer-friendly
        selectedOptions.sort((a, b) => b.price - a.price);
        
        // Determine which options are paid (options beyond the free count)
        const paidOptions = selectedOptions.slice(freeCount)
          .map(opt => ({ name: opt.name, price: opt.price }));
        
        if (paidOptions.length > 0) {
          breakdown.push({
            groupName: group.name,
            options: paidOptions
          });
        }
      }
    }
    
    return breakdown;
  }

  // Sum up the additional price across all selected options, accounting for free options
  function getAdditionalPrice(): number {
    let sum = 0;
    
    for (const group of optionGroups) {
      const chosenIds = selections[group.id] || [];
      
      // Skip if no selections
      if (chosenIds.length === 0) continue;
      
      // Get the free option count for this group
      const freeCount = group.free_option_count || 0;
      
      // If we have more selections than free options, calculate additional price
      if (chosenIds.length > freeCount) {
        // Get all selected options with their prices
        const selectedOptions = chosenIds
          .map(id => {
            const option = group.options.find(o => o.id === id);
            
            // Try different ways to access the price
            const price = option ? 
              (typeof option.additional_price === 'number' ? option.additional_price : 
               typeof option.additional_price_float === 'number' ? option.additional_price_float : 
               typeof (option as any).additional_price_float === 'number' ? (option as any).additional_price_float : 
               2.0) : 0;
            
            return option ? {
              id,
              name: option.name,
              price: price
            } : null;
          })
          .filter(Boolean) as { id: number; name: string; price: number }[];
        
        // Sort by price (highest first) to be customer-friendly
        selectedOptions.sort((a, b) => b.price - a.price);
        
        // Apply charges only to options beyond the free count
        const paidOptions = selectedOptions.slice(freeCount);
        
        for (const opt of paidOptions) {
          sum += opt.price;
          // Adding option price to total sum
        }
      }
    }
    
    return sum;
  }
  
  // Determine if an option would be free based on current selections
  function isOptionFree(group: OptionGroup, optId: number): boolean {
    const chosenIds = selections[group.id] || [];
    const freeCount = group.free_option_count || 0;
    
    // If no free options available, nothing is free
    if (freeCount === 0) return false;
    
    // If option is not selected, check if it would be free if selected
    if (!chosenIds.includes(optId)) {
      // If we have fewer selections than free options, this option would be free
      return chosenIds.length < freeCount;
    }
    
    // If option is already selected, we need to determine if it's one of the free ones
    // Get all selected options with their prices
    const selectedOptions = chosenIds
      .map(id => {
        const option = group.options.find(o => o.id === id);
        
        // Try different ways to access the price
        const price = option ? 
          (typeof option.additional_price === 'number' ? option.additional_price : 
           typeof option.additional_price_float === 'number' ? option.additional_price_float : 
           typeof (option as any).additional_price_float === 'number' ? (option as any).additional_price_float : 
           2.0) : 0;
        
        return option ? {
          id,
          price: price
        } : null;
      })
      .filter(Boolean) as { id: number, price: number }[];
    
    // Sort by price (highest first) to be customer-friendly
    selectedOptions.sort((a, b) => b.price - a.price);
    
    // Get the IDs of the free options (the first 'freeCount' options after sorting)
    const freeOptionIds = selectedOptions.slice(0, freeCount).map(o => o.id);
    
    // Check if this option is in the free list
    return freeOptionIds.includes(optId);
  }

  // Calculate available quantity for an option (with availability checks)
  const getOptionAvailableQuantity = (option: MenuOption): number => {
    // First check manual availability toggles
    if (!option.available) {
      return 0;
    }
    
    // Also check optional is_available field if present
    if (option.is_available === false) {
      return 0;
    }
    
    // If no inventory tracking, return a large number to indicate unlimited
    if (option.stock_quantity === undefined || option.stock_quantity === null) {
      return 999; // Available but not tracked
    }
    
    // Calculate available quantity (stock - damaged)
    const stockQuantity = option.stock_quantity || 0;
    const damagedQuantity = option.damaged_quantity || 0;
    return Math.max(0, stockQuantity - damagedQuantity);
  };

  // Check if an option is available for the requested quantity (option group aware)
  const isOptionAvailable = (option: MenuOption, requestedQuantity: number = 1, optionGroup?: any): boolean => {
    // First check manual availability toggle
    if (!option.available) {
      return false;
    }
    
    // Also check optional is_available field if present
    if (option.is_available === false) {
      return false;
    }
    
    // Only check stock if this option group has inventory tracking enabled
    const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
    
    // If no inventory tracking for this group, rely only on manual availability
    if (!groupHasInventoryTracking || option.stock_quantity === undefined || option.stock_quantity === null) {
      return true; // Available based on manual toggle only
    }
    
    // Calculate available quantity and check if sufficient for tracked groups
    const availableQuantity = getOptionAvailableQuantity(option);
    return availableQuantity >= requestedQuantity;
  };

  // Get unified option indicator that combines price and stock information (group-aware)
  const getUnifiedOptionIndicator = (option: MenuOption, optionGroup?: any, isSelected: boolean = false) => {
    // Only show stock info for groups with inventory tracking
    const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
    
    const availableQuantity = getOptionAvailableQuantity(option);
    
    // Try different ways to access the price
    const extraPrice = typeof option.additional_price === 'number' ? option.additional_price : 
                      typeof option.additional_price_float === 'number' ? option.additional_price_float : 
                      typeof (option as any).additional_price_float === 'number' ? (option as any).additional_price_float : 
                      2.0;
    
    const isFree = isOptionFree(optionGroup, option.id);
    
    // Determine the display components
    let priceText = '';
    let stockText = '';
    let badgeStyle = '';
    
    // Handle stock information
    if (groupHasInventoryTracking && availableQuantity !== 999) {
      if (availableQuantity === 0) {
        return (
          <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">
            Out of Stock
          </span>
        );
      } else if (availableQuantity <= 5) {
        stockText = `${availableQuantity} left`;
      } else if (availableQuantity <= 20) {
        stockText = `${availableQuantity} in stock`;
      }
    }
    
    // Handle price information
    if (isSelected && isFree) {
      priceText = 'Free';
    } else if (extraPrice > 0) {
      priceText = `+$${extraPrice.toFixed(2)}`;
    }
    
    // If no price or stock info to show, return null
    if (!priceText && !stockText) {
      return null;
    }
    
    // Combine price and stock text
    const combinedText = [priceText, stockText].filter(Boolean).join(' • ');
    
    // Determine badge styling based on content
    if (isSelected && isFree) {
      badgeStyle = "text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium";
    } else if (stockText.includes('left')) {
      badgeStyle = "text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium";
    } else if (stockText.includes('in stock')) {
      badgeStyle = "text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium";
    } else {
      badgeStyle = "text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium";
    }
    
    return (
      <span className={badgeStyle}>
        {combinedText}
      </span>
    );
  };

  // Check if an option has low stock (group-aware)
  const isOptionLowStock = (option: MenuOption, optionGroup?: any): boolean => {
    // Only show stock info for groups with inventory tracking
    const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
    if (!groupHasInventoryTracking) return false;
    
    const availableQuantity = getOptionAvailableQuantity(option);
    if (availableQuantity === 999) return false; // No stock tracking
    
    // Consider low stock if 5 or fewer items available
    return availableQuantity > 0 && availableQuantity <= 5;
  };

  // Check if an option is out of stock (group-aware)
  const isOptionOutOfStock = (option: MenuOption, optionGroup?: any): boolean => {
    return !isOptionAvailable(option, 1, optionGroup);
  };

  // Get stock indicator component for an option (group-aware) - DEPRECATED: Use getUnifiedOptionIndicator instead
  const getStockIndicator = (option: MenuOption, optionGroup?: any) => {
    // Only show stock indicators for groups with inventory tracking
    const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
    if (!groupHasInventoryTracking) return null;
    
    const availableQuantity = getOptionAvailableQuantity(option);
    
    if (availableQuantity === 999) {
      return null; // No stock tracking
    }
    
    if (availableQuantity === 0) {
      return (
        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full ml-2">
          Out of Stock
        </span>
      );
    }
    
    if (availableQuantity <= 5) {
      return (
        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full ml-2">
          {availableQuantity} left
        </span>
      );
    }
    
    if (availableQuantity <= 20) {
      return (
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2">
          {availableQuantity} in stock
        </span>
      );
    }
    
    return null; // Good stock levels, no indicator needed
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
  const basePrice = item.price;
  const addlPrice = getAdditionalPrice();
  const totalItemPrice = (basePrice + addlPrice) * quantity;
  const isValid = validateSelections();

  // Get paid options count per group
  const paidOptionsByGroup = Object.entries(selections).map(([groupId, selectedIds]) => {
    const group = optionGroups.find(g => g.id === Number(groupId));
    if (!group) return null;
    
    const freeCount = group.free_option_count || 0;
    const paidCount = Math.max(0, selectedIds.length - freeCount);
    
    if (paidCount <= 0) return null;
    
    // Calculate total price for this group's paid options
    const selectedOptions = selectedIds
      .map(id => {
        const option = group.options.find(o => o.id === id);
        
        // Try different ways to access the price
        const price = option ? 
          (typeof option.additional_price === 'number' ? option.additional_price : 
           typeof option.additional_price_float === 'number' ? option.additional_price_float : 
           typeof (option as any).additional_price_float === 'number' ? (option as any).additional_price_float : 
           2.0) : 0;
        
        return option ? {
          id,
          name: option.name,
          price: price
        } : null;
      })
      .filter(Boolean) as { id: number; name: string; price: number }[];
    
    // Sort by price (highest first)
    selectedOptions.sort((a, b) => b.price - a.price);
    
    // Get paid options
    const paidOptions = selectedOptions.slice(freeCount);
    
    // Calculate total price
    const totalPrice = paidOptions.reduce((sum, opt) => sum + opt.price, 0);
    
    // Only include groups with a non-zero total price
    if (totalPrice <= 0) return null;
    
    return {
      groupId: Number(groupId),
      groupName: group.name,
      paidCount,
      totalPrice,
      paidOptions: paidOptions.filter(opt => opt.price > 0) // Only include options with a price > 0
    };
  }).filter(Boolean) as {
    groupId: number;
    groupName: string;
    paidCount: number;
    totalPrice: number;
    paidOptions: { id: number; name: string; price: number }[];
  }[];

  // On "Add to Cart" or "Update Item": build a customizations object => groupName => [optionName, ...]
  function handleSubmit() {
    if (!isValid) {
      alert("Please make all required selections before proceeding.");
      return;
    }

    const finalCustomizations: Record<string, string[]> = {};

    // For each group => collect the chosen names
    for (const group of optionGroups) {
      const chosenIds = selections[group.id] || [];
      if (chosenIds.length > 0) {
        const chosenNames = group.options
          .filter((o) => chosenIds.includes(o.id))
          .map((o) => o.name);
        finalCustomizations[group.name] = chosenNames;
      }
    }

    // Use the final price = base + addl
    if (editMode) {
      // Validate that we have the cart item key in edit mode
      if (!existingCartItemKey) {
        console.error('Edit mode requires existingCartItemKey');
        alert('Unable to update item. Please try again.');
        return;
      }
      
      // Update existing cart item
      updateCartItem(existingCartItemKey, {
        price: basePrice + addlPrice,
        customizations: finalCustomizations as any,
        quantity: quantity
      });
    } else {
      // Add new cart item
      addToCart(
        {
          id: item.id,
          name: item.name,
          price: basePrice + addlPrice,
          customizations: finalCustomizations as any,
          image: item.image, // Include the image property
        } as any,
        quantity
      );
    }

    onClose();
  }

  // Toggle expanded/collapsed state for an option group
  function toggleGroupExpansion(groupId: number) {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col animate-slideUp mt-8 sm:mt-16">
        {/* Fixed Header */}
        <div className="sticky top-0 bg-white rounded-t-lg p-6 pb-2 border-b border-gray-100 z-10">
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>

          <h3 className="text-xl font-semibold pr-6">
            Customize: {item.name}
          </h3>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* If no optionGroups, just show "no customizations" */}
          {optionGroups.length === 0 ? (
            <p>No customizations available.</p>
          ) : (
            optionGroups.map((group) => {
              const groupId = group.id;
              const selectedCount = (selections[groupId] || []).length;
              const isRequired = group.min_select > 0;
              const needsMoreSelections = selectedCount < group.min_select;
              const freeCount = group.free_option_count || 0;
              const hasExceededFreeCount = selectedCount > freeCount;
              const isExpanded = expandedGroupId === groupId;
              
              // Determine if this group needs attention (required but not fulfilled)
              const needsAttention = isRequired && needsMoreSelections;
              
              return (
                <div key={groupId} className="mb-4 border rounded-md overflow-hidden">
                  {/* Collapsible Header - Always visible */}
                  <button 
                    onClick={() => toggleGroupExpansion(groupId)}
                    className={`w-full p-3 text-left flex items-center justify-between
                      ${needsAttention ? 'bg-red-50' : isExpanded ? 'bg-[#c1902f]/10' : 'bg-gray-50'}
                      ${needsAttention ? 'border-red-200' : isExpanded ? 'border-[#c1902f]' : 'border-gray-200'}
                      transition-colors duration-200
                    `}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-700 flex items-center flex-wrap">
                        {group.name}{' '}
                        <span className="text-sm ml-2">
                          {isRequired ? (
                            <span className={`${needsMoreSelections ? 'text-red-500' : 'text-green-600'} font-semibold`}>
                              (Required: {selectedCount}/{group.min_select})
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              (Select up to {group.max_select}
                              {group.free_option_count > 0 && 
                                `, ${group.free_option_count} free`}
                              )
                            </span>
                          )}
                        </span>
                      </div>
                      
                      {/* Show a summary of selections when collapsed */}
                      {!isExpanded && selectedCount > 0 && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          Selected: {group.options
                            .filter(opt => selections[groupId]?.includes(opt.id))
                            .map(opt => opt.name)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    
                    {/* Expand/Collapse icon */}
                    <div className="ml-2 text-gray-500">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>
                  
                  {/* Collapsible Content - Only visible when expanded */}
                  {isExpanded && (
                    <div className="p-3 border-t border-gray-200">
                      {group.free_option_count > 0 && (
                        <p className="text-sm text-gray-600 mb-2">
                          First {group.free_option_count} selection{group.free_option_count !== 1 ? 's' : ''} free, additional selections will be charged.
                          {hasExceededFreeCount && (
                            <span className="text-orange-500 font-medium"> You have {selectedCount - freeCount} paid selection{selectedCount - freeCount !== 1 ? 's' : ''}.</span>
                          )}
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        {group.options
                          .filter(opt => isOptionAvailable(opt, 1, group)) // Only show available options
                          .map((opt) => {
                          const selected = selections[groupId]?.includes(opt.id);
                          const isOutOfStock = isOptionOutOfStock(opt, group);

                          const unifiedIndicator = getUnifiedOptionIndicator(opt, group, selected);
                          
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => !isOutOfStock && handleOptionToggle(group, opt)}
                              disabled={isOutOfStock}
                              className={`block w-full text-left px-4 py-2 border rounded-md 
                                ${isOutOfStock 
                                  ? 'cursor-not-allowed opacity-60 border-gray-300 bg-gray-100' 
                                  : ''
                                }
                                ${!isOutOfStock && selected
                                    ? 'border-[#c1902f] bg-[#c1902f]/10'
                                  : !isOutOfStock 
                                    ? 'border-gray-200 hover:border-[#c1902f]'
                                    : ''
                                }

                              `}
                            >
                              <div className="flex justify-between items-center w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center flex-wrap">
                                    <span className="font-medium">{opt.name}</span>
                                    {opt.is_preselected && !selected && (
                                      <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                        Recommended
                                      </span>
                                    )}
                                  </div>
                                  {isOutOfStock && (
                                    <p className="text-xs text-red-600 mt-1">
                                      This option is currently out of stock
                                    </p>
                                  )}
                                </div>
                                {unifiedIndicator && (
                                  <div className="ml-3 flex-shrink-0">
                                    {unifiedIndicator}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      
                      {isRequired && needsMoreSelections && (
                        <p className="text-red-500 text-sm mt-2">
                          Please select at least {group.min_select} option{group.min_select > 1 ? 's' : ''}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Fixed Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-lg border-t border-gray-200 p-6">
          {/* Price breakdown - Collapsible */}
          <div className="mb-4">
            {/* Price breakdown header with toggle button */}
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-700">Price Breakdown</h4>
              <button 
                onClick={() => setIsPriceBreakdownExpanded(!isPriceBreakdownExpanded)}
                className="text-gray-500 hover:text-gray-700 flex items-center text-sm"
              >
                {isPriceBreakdownExpanded ? (
                  <>
                    <span className="mr-1">Hide details</span>
                    <ChevronUp size={16} />
                  </>
                ) : (
                  <>
                    <span className="mr-1">View details</span>
                    <ChevronDown size={16} />
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
                
                {/* Detailed breakdown of paid options by group - only shown when there are paid options */}
                {paidOptionsByGroup.length > 0 && (
                  <div className="mt-2">
                    {paidOptionsByGroup.map((group, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-gray-600">
                          <span>{group.groupName} paid options ({group.paidCount}):</span>
                          <span>+${group.totalPrice.toFixed(2)}</span>
                        </div>
                        {group.paidOptions.map((opt, optIdx) => (
                          <div key={optIdx} className="flex justify-between text-gray-600 text-sm pl-4">
                            <span>{opt.name}:</span>
                            <span>+${opt.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {/* Only show additional options total if there are paid options */}
                    {addlPrice > 0 && (
                      <div className="flex justify-between text-gray-600 mt-2">
                        <span>Additional options total:</span>
                        <span>+${addlPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Item total with more spacing when no paid options */}
                <div className={`flex justify-between font-semibold border-t border-gray-200 pt-1 ${paidOptionsByGroup.length === 0 ? 'mt-4' : 'mt-1'}`}>
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
                  // Force update to recalculate prices
                  forceUpdate({});
                }}
                className="px-3 py-1 border rounded"
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => {
                  setQuantity((q) => q + 1);
                  // Force update to recalculate prices
                  forceUpdate({});
                }}
                className="px-3 py-1 border rounded"
              >
                +
              </button>
            </div>
            <p className="text-lg font-semibold">
              Total: ${totalItemPrice.toFixed(2)}
            </p>
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
              onClick={handleSubmit}
              className={`px-4 py-2 text-white rounded-md ${
                isValid 
                  ? 'bg-[#c1902f] hover:bg-[#d4a43f]' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={!isValid}
            >
              {editMode ? 'Update Item' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
