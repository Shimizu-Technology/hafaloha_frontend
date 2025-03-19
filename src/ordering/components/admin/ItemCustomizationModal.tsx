// src/ordering/components/admin/ItemCustomizationModal.tsx
import React, { useState } from 'react';
import { MenuItem, OptionGroup, MenuOption } from '../../types/menu';

interface ItemCustomizationModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, customizations: any[], quantity: number) => void;
}

export function ItemCustomizationModal({ item, onClose, onAddToCart }: ItemCustomizationModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, MenuOption[]>>({});

  // Initialize selected options for required option groups
  React.useEffect(() => {
    if (item.option_groups && item.option_groups.length > 0) {
      const initialSelections: Record<string, MenuOption[]> = {};
      
      item.option_groups.forEach(group => {
        // For required groups with min_select = 1, pre-select the first option
        if (group.min_select > 0 && group.min_select === 1 && group.max_select === 1 && group.options.length > 0) {
          initialSelections[group.id.toString()] = [group.options[0]];
        } else {
          initialSelections[group.id.toString()] = [];
        }
      });
      
      setSelectedOptions(initialSelections);
    }
  }, [item]);

  // Handle option selection/deselection
  const toggleOption = (groupId: number, option: MenuOption) => {
    const groupIdStr = groupId.toString();
    
    setSelectedOptions(prev => {
      const currentSelections = [...(prev[groupIdStr] || [])];
      const optionIndex = currentSelections.findIndex(opt => opt.id === option.id);
      
      // Find the group to get its max_select
      const group = item.option_groups?.find(g => g.id === groupId);
      
      if (optionIndex >= 0) {
        // Option is already selected, remove it
        currentSelections.splice(optionIndex, 1);
      } else {
        // Option is not selected, add it if we haven't reached max_select
        if (group && currentSelections.length < group.max_select) {
          currentSelections.push(option);
        } else if (group && group.max_select === 1) {
          // If max_select is 1, replace the current selection
          return {
            ...prev,
            [groupIdStr]: [option]
          };
        } else {
          // Skip if we've reached the limit
          return prev;
        }
      }
      
      return {
        ...prev,
        [groupIdStr]: currentSelections
      };
    });
  };

  // Check if we've selected the minimum required options for each group
  const isValid = (): boolean => {
    if (!item.option_groups) return true;
    
    return item.option_groups.every(group => {
      const selections = selectedOptions[group.id.toString()] || [];
      return selections.length >= group.min_select;
    });
  };

  // Convert selected options to the format expected by the cart
  const formatCustomizations = () => {
    if (!item.option_groups) return [];
    
    return Object.entries(selectedOptions).flatMap(([groupId, options]) => {
      const group = item.option_groups?.find(g => g.id.toString() === groupId);
      
      return options.map(option => ({
        option_group_id: parseInt(groupId),
        option_group_name: group?.name || '',
        option_id: option.id,
        option_name: option.name,
        price: option.additional_price || 0
      }));
    });
  };

  // Calculate additional price from options
  const calculateAdditionalPrice = (): number => {
    return Object.values(selectedOptions).flat().reduce((sum, option) => 
      sum + (option.additional_price || 0), 0);
  };

  // Calculate total price (base + options) * quantity
  const totalPrice = (item.price + calculateAdditionalPrice()) * quantity;

  // Handle adding to cart
  const handleAddToCart = () => {
    if (isValid()) {
      const customizations = formatCustomizations();
      onAddToCart(item, customizations, quantity);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Customize: {item.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content - Option groups */}
        <div className="flex-1 overflow-y-auto p-6">
          {item.option_groups && item.option_groups.map(group => (
            <div key={group.id} className="mb-6">
              <h3 className="font-medium text-lg mb-2">
                {group.name} 
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {group.min_select > 0 ? '(Required)' : '(Optional)'} 
                  {group.max_select > 1 ? ` (Min ${group.min_select}, Max ${group.max_select})` : ''}
                </span>
              </h3>
              
              <div className="space-y-2">
                {group.options.map(option => {
                  const isSelected = (selectedOptions[group.id.toString()] || [])
                    .some(opt => opt.id === option.id);
                    
                  return (
                    <div 
                      key={option.id}
                      className={`
                        border rounded-md p-3 cursor-pointer transition-colors
                        ${isSelected 
                          ? 'border-[#c1902f] bg-yellow-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      onClick={() => toggleOption(group.id, option)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className={`
                              w-5 h-5 border rounded-md mr-3 flex items-center justify-center
                              ${isSelected ? 'bg-[#c1902f] border-[#c1902f]' : 'border-gray-300'}
                            `}
                          >
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium">{option.name}</span>
                        </div>
                        
                        {option.additional_price > 0 && (
                          <span className="text-gray-600">+${option.additional_price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer with quantity and add to cart button */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <button
                onClick={() => setQuantity(prev => Math.max(prev - 1, 1))}
                className="p-2 border border-gray-300 rounded-md focus:outline-none"
                aria-label="Decrease quantity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <span className="mx-4 font-medium w-6 text-center">{quantity}</span>
              
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className="p-2 border border-gray-300 rounded-md focus:outline-none"
                aria-label="Increase quantity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            <div className="font-semibold text-xl">
              <span>Total: ${totalPrice.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleAddToCart}
              disabled={!isValid()}
              className={`
                flex-1 py-3 bg-[#c1902f] text-white rounded-md font-medium
                focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50
                ${isValid() 
                  ? 'hover:bg-[#a97c28]' 
                  : 'opacity-50 cursor-not-allowed'
                }
              `}
            >
              Add to Cart
            </button>
            
            <button 
              onClick={onClose}
              className="py-3 px-4 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
