// src/ordering/components/admin/SearchableMenuItemSelector.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMenuStore } from '../../store/menuStore';
import { MenuItem, OptionGroup, Category } from '../../types/menu';
import { useClickOutside } from '../../../shared/hooks/useClickOutside';

interface SearchableMenuItemSelectorProps {
  onSelect: (item: MenuItem) => void;
  onClose: () => void;
}

export function SearchableMenuItemSelector({ onSelect, onClose }: SearchableMenuItemSelectorProps) {
  const { menuItems, categories, fetchMenuItems, fetchCategories, loading } = useMenuStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [step, setStep] = useState<'search' | 'customize'>('search');
  
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);
  
  // Fetch menu items and categories on mount if not already loaded
  useEffect(() => {
    if (menuItems.length === 0) {
      fetchMenuItems();
    }
    if (!categories || categories.length === 0) {
      fetchCategories();
    }
  }, [menuItems.length, categories, fetchMenuItems, fetchCategories]);
  
  // Filter menu items based on search query and selected category
  useEffect(() => {
    let filtered = [...menuItems];
    
    // Filter by category if one is selected
    if (selectedCategoryId !== null) {
      filtered = filtered.filter(item => 
        item.category_ids?.includes(selectedCategoryId)
      );
    }
    
    // Filter by search query if one exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.description?.toLowerCase().includes(query)
      );
    }
    
    setFilteredItems(filtered);
  }, [searchQuery, selectedCategoryId, menuItems]);
  
  // Calculate available quantity (stock minus damaged)
  const calculateAvailableQuantity = (item: MenuItem): number => {
    if (!item.enable_stock_tracking || item.stock_quantity === undefined) {
      return Infinity;
    }
    
    // If damaged_quantity is defined, subtract it from stock_quantity
    const damagedQty = item.damaged_quantity || 0;
    return Math.max(0, item.stock_quantity - damagedQty);
  };
  
  // Handle item selection
  const handleItemSelect = (item: MenuItem) => {
    // Check stock availability using available quantity
    const availableQty = calculateAvailableQuantity(item);
    if (item.enable_stock_tracking && availableQty <= 0) {
      // Could add a toast notification here
      alert(`${item.name} is out of stock.`);
      return;
    }
    
    setSelectedItem(item);
    
    // If the item has option groups, go to customize step
    if (item.option_groups && item.option_groups.length > 0) {
      // Initialize selected options
      const initialOptions: Record<string, string[]> = {};
      item.option_groups.forEach(group => {
        // For required single-select groups, preselect the first option
        if (group.min_select > 0 && group.max_select === 1) {
          initialOptions[group.name] = [group.options[0]?.name || ''];
        } else {
          initialOptions[group.name] = [];
        }
      });
      
      setSelectedOptions(initialOptions);
      setStep('customize');
    } else {
      // If no option groups, complete selection
      completeSelection(item, {});
    }
  };
  
  // Handle option selection/deselection
  const handleOptionToggle = (groupName: string, optionName: string, isMultiSelect: boolean) => {
    setSelectedOptions(prev => {
      const currentSelections = [...(prev[groupName] || [])];
      
      if (isMultiSelect) {
        // For multi-select, toggle the option
        const optionIndex = currentSelections.indexOf(optionName);
        if (optionIndex >= 0) {
          currentSelections.splice(optionIndex, 1);
        } else {
          currentSelections.push(optionName);
        }
      } else {
        // For single-select, replace the selection
        return {
          ...prev,
          [groupName]: [optionName]
        };
      }
      
      return {
        ...prev,
        [groupName]: currentSelections
      };
    });
  };
  
  // Complete the selection process
  const completeSelection = (item: MenuItem, options: Record<string, string[]>) => {
    // Create a copy of the item with selected options
    const itemWithOptions: MenuItem = {
      ...item,
      customizations: options
    };
    
    // Calculate additional price from options
    let additionalPrice = 0;
    
    if (item.option_groups) {
      item.option_groups.forEach(group => {
        const selectedOptionNames = options[group.name] || [];
        
        group.options.forEach(option => {
          if (selectedOptionNames.includes(option.name)) {
            additionalPrice += option.additional_price || 0;
          }
        });
      });
    }
    
    // Update the price if there are additional charges
    if (additionalPrice > 0) {
      itemWithOptions.price = (parseFloat(String(item.price)) || 0) + additionalPrice;
    }
    
    onSelect(itemWithOptions);
  };
  
  // Check if all required options are selected
  const areRequiredOptionsSelected = (): boolean => {
    if (!selectedItem || !selectedItem.option_groups) return true;
    
    return selectedItem.option_groups.every(group => {
      if (!(group.min_select > 0)) return true;
      
      const selections = selectedOptions[group.name] || [];
      return selections.length > 0;
    });
  };
  
  // Get sorted categories for the filter
  const sortedCategories = useMemo(() => {
    return [...(categories || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);
  
  // Render the search step
  const renderSearchStep = () => (
    <div className="p-4 space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Add Menu Item</h3>
        <p className="text-sm text-gray-600">
          Search for an item to add to the order
        </p>
      </div>
      
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md px-4 py-2 pl-10 focus:ring-[#c1902f] focus:border-[#c1902f]"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* Category filters */}
      <div className="mb-2">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Category</h4>
        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pb-1">
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              selectedCategoryId === null
                ? 'bg-[#c1902f] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedCategoryId(null)}
          >
            All
          </button>
          
          {sortedCategories.map(category => (
            <button
              key={category.id}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedCategoryId === category.id
                  ? 'bg-[#c1902f] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c1902f]"></div>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchQuery ? 'No items found matching your search' : 'No menu items available'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const availableQty = calculateAvailableQuantity(item);
                const isOutOfStock = item.enable_stock_tracking && availableQty <= 0;
                const isLowStock = item.enable_stock_tracking && availableQty > 0 && availableQty <= (item.low_stock_threshold || 5);
                
                return (
                  <li 
                    key={item.id} 
                    className={`py-3 px-2 hover:bg-gray-50 cursor-pointer transition-colors rounded-md ${
                      isOutOfStock ? 'opacity-60' : ''
                    }`}
                    onClick={() => handleItemSelect(item)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                        )}
                        {/* Stock information */}
                        {item.enable_stock_tracking && item.stock_quantity !== undefined && (
                          <div className="mt-1">
                            {isOutOfStock ? (
                              <span className="text-xs font-medium text-red-600">Out of stock</span>
                            ) : isLowStock ? (
                              <span className="text-xs font-medium text-amber-600">Low stock: {availableQty} left</span>
                            ) : (
                              <span className="text-xs text-gray-500">{availableQty} in stock</span>
                            )}
                          </div>
                        )}
                        {item.option_groups && item.option_groups.length > 0 && (
                          <div className="mt-1 text-xs text-[#c1902f] font-medium">
                            Customizable
                          </div>
                        )}
                      </div>
                      <div className="text-gray-900 font-medium">
                        ${parseFloat(String(item.price)).toFixed(2)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
  
  // Render the customize step
  const renderCustomizeStep = () => {
    if (!selectedItem || !selectedItem.option_groups) return null;
    
    return (
      <div className="p-4 space-y-4">
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <button
              type="button"
              className="mr-2 text-gray-500 hover:text-gray-700"
              onClick={() => setStep('search')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg font-medium text-gray-900">Customize {selectedItem.name}</h3>
          </div>
          <p className="text-sm text-gray-600">
            Select options for this item
          </p>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto space-y-6">
          {selectedItem.option_groups.map((group) => (
            <div key={group.name} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">{group.name}</h4>
                {group.min_select > 0 && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    Required
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {group.max_select > 1 ? `Select up to ${group.max_select}` : 'Select one'}
              </p>
              
              <ul className="space-y-2">
                {group.options.map((option) => {
                  const isSelected = (selectedOptions[group.name] || []).includes(option.name);
                  
                  return (
                    <li key={option.name}>
                      <button
                        type="button"
                        className={`w-full flex justify-between items-center px-3 py-2 rounded-md ${
                          isSelected 
                            ? 'bg-[#f8f3e7] border border-[#c1902f]' 
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleOptionToggle(group.name, option.name, group.max_select > 1)}
                      >
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected 
                              ? 'border-[#c1902f] bg-[#c1902f]' 
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {option.name}
                          </span>
                        </div>
                        {option.additional_price > 0 && (
                          <span className="text-sm text-gray-600">
                            +${option.additional_price.toFixed(2)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              areRequiredOptionsSelected()
                ? 'bg-[#c1902f] hover:bg-[#d4a43f]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            disabled={!areRequiredOptionsSelected()}
            onClick={() => {
              if (selectedItem && areRequiredOptionsSelected()) {
                completeSelection(selectedItem, selectedOptions);
              }
            }}
          >
            Add to Order
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 z-[10002] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn"
      >
        {step === 'search' ? renderSearchStep() : renderCustomizeStep()}
      </div>
    </div>
  );
}
