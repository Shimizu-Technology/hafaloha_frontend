// src/ordering/components/admin/SearchableMenuItemSelector.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useMenuStore } from '../../store/menuStore';
import { MenuItem, OptionGroup, MenuOption } from '../../types/menu';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { X } from 'lucide-react';

interface SearchableMenuItemSelectorProps {
  onSelect: (item: MenuItem) => void;
  onClose: () => void;
}

export function SearchableMenuItemSelector({ onSelect, onClose }: SearchableMenuItemSelectorProps) {
  const { menuItems, categories, fetchMenuItems, fetchCategories, loading, currentMenuId } = useMenuStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Calculate available quantity (stock minus damaged)
  const calculateAvailableQuantity = useCallback((item: MenuItem): number => {
    if (!item.enable_stock_tracking || item.stock_quantity === undefined) {
      return Infinity;
    }
    
    // If damaged_quantity is defined, subtract it from stock_quantity
    const damagedQty = item.damaged_quantity || 0;
    return Math.max(0, item.stock_quantity - damagedQty);
  }, []);

  // Check if an individual option is available
  const isOptionAvailable = useCallback((option: MenuOption): boolean => {
    // Check manual availability toggle first
    if (option.available === false) {
      return false;
    }
    
    // Check inventory-based availability if option has stock tracking
    if (option.stock_quantity !== undefined) {
      const damagedQty = option.damaged_quantity || 0;
      const availableQty = Math.max(0, option.stock_quantity - damagedQty);
      return availableQty > 0;
    }
    
    // If no stock tracking, option is available (assuming manual toggle is true/undefined)
    return true;
  }, [menuItems]);

  // Check if an option group has any available options
  const hasAvailableOptions = useCallback((optionGroup: OptionGroup): boolean => {
    if (!optionGroup.options || optionGroup.options.length === 0) {
      return true; // No options means no restrictions
    }
    
    return optionGroup.options.some(option => isOptionAvailable(option));
  }, [isOptionAvailable, menuItems]);

  // Get count of available options in a group
  const getAvailableOptionsCount = useCallback((optionGroup: OptionGroup): number => {
    if (!optionGroup.options || optionGroup.options.length === 0) {
      return 0;
    }
    
    return optionGroup.options.filter(option => isOptionAvailable(option)).length;
  }, [isOptionAvailable, menuItems]);

  // Check if a menu item has available options (for items with option groups)
  const hasAvailableItemOptions = useCallback((item: MenuItem): boolean => {
    if (!item.option_groups || item.option_groups.length === 0) {
      return true; // No option groups means item is available (subject to item-level stock)
    }
    
    // Check if all required option groups have available options
    const requiredGroups = item.option_groups.filter(group => group.required);
    
    for (const group of requiredGroups) {
      if (!hasAvailableOptions(group)) {
        return false; // Required group has no available options
      }
    }
    
    return true; // All required groups have available options
  }, [hasAvailableOptions, menuItems]);
  
  // Fetch menu items and categories on mount if not already loaded
  useEffect(() => {
    if (menuItems.length === 0) {
      fetchMenuItems();
    }
    if (!categories || categories.length === 0) {
      fetchCategories();
    }
  }, [menuItems.length, categories, fetchMenuItems, fetchCategories]);
  
  // Filter menu items based on search query, selected category, and active menu
  useEffect(() => {
    // First, filter by active menu
    const menuStore = useMenuStore.getState();
    const activeMenuId = currentMenuId || menuStore.currentMenuId;
    
    // Start with all menu items
    let filtered = [...menuItems];
    
    // Filter by active menu if we have one
    if (activeMenuId) {
      filtered = filtered.filter(item =>
        Number(item.menu_id) === Number(activeMenuId)
      );
      console.log(`SearchableMenuItemSelector - filtered items by menu ${activeMenuId}, ${filtered.length} items remaining`);
    }
    
    // Filter by category if one is selected
    if (selectedCategoryId !== null) {
      filtered = filtered.filter(item =>
        item.category_ids?.includes(selectedCategoryId)
      );
      console.log(`SearchableMenuItemSelector - filtered by category ${selectedCategoryId}, ${filtered.length} items remaining`);
    }
    
    // Filter by search query if one exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
      console.log(`SearchableMenuItemSelector - filtered by search "${searchQuery}", ${filtered.length} items remaining`);
    }
    
    // Filter out items that are completely unavailable (item-level stock or no available options)
    filtered = filtered.filter(item => {
      // Check item-level stock availability
      const availableQty = calculateAvailableQuantity(item);
      const isItemOutOfStock = item.enable_stock_tracking && availableQty <= 0;
      
      // Check option availability for items with option groups
      const hasOptions = item.option_groups && item.option_groups.length > 0;
      const hasAvailableOptions = hasOptions ? hasAvailableItemOptions(item) : true;
      
      // Item is available if it has stock (or no stock tracking) AND has available options (or no options)
      return !isItemOutOfStock && hasAvailableOptions;
    });
    console.log(`SearchableMenuItemSelector - filtered by availability, ${filtered.length} items remaining`);
    
    setFilteredItems(filtered);
  }, [searchQuery, selectedCategoryId, menuItems, currentMenuId, calculateAvailableQuantity, hasAvailableItemOptions]);
  
  // Handle item selection
  const handleItemSelect = (item: MenuItem) => {
    // Check stock availability using available quantity
    const availableQty = calculateAvailableQuantity(item);
    if (item.enable_stock_tracking && availableQty <= 0) {
      // Could add a toast notification here
      alert(`${item.name} is out of stock.`);
      return;
    }
    
    // Check option availability for items with option groups
    if (item.option_groups && item.option_groups.length > 0) {
      if (!hasAvailableItemOptions(item)) {
        alert(`${item.name} cannot be ordered - all required options are currently unavailable.`);
        return;
      }
    }
    
    setSelectedItem(item);
    
    // If the item has option groups, show the customization modal
    if (item.option_groups && item.option_groups.length > 0) {
      setShowCustomizationModal(true);
    } else {
      // If no option groups, complete selection
      onSelect(item);
    }
  };
  
  // Handle customized item being added to cart
  const handleAddCustomizedItem = (item: MenuItem, customizations: unknown[], quantity: number) => {
    // The item already has the customizations property set by ItemCustomizationModal
    // with a properly formatted object for display
    
    // We don't need to modify the item further as the ItemCustomizationModal
    // has already updated the price and added the formatted customizations
    
    // Close the customization modal
    setShowCustomizationModal(false);
    
    // Pass the customized item back to the parent
    onSelect(item);
    
    console.log('Added customized item to cart:', {
      name: item.name,
      price: item.price,
      customizations: item.customizations,
      quantity: quantity
    });
  };
  
  // Get sorted categories for the filter - filter in component like MenuManager.tsx and MenuPage.tsx
  const sortedCategories = useMemo(() => {
    console.log('SearchableMenuItemSelector - categories:', categories);
    console.log('SearchableMenuItemSelector - currentMenuId:', currentMenuId);
    
    // Get the active menu ID from the menuStore
    const menuStore = useMenuStore.getState();
    const activeMenuId = currentMenuId || menuStore.currentMenuId;
    console.log('SearchableMenuItemSelector - using activeMenuId:', activeMenuId);
    
    // If we have categories
    if (categories?.length) {
      // If we have an active menu ID, filter by it
      if (activeMenuId) {
        const filtered = categories.filter(cat => Number(cat.menu_id) === Number(activeMenuId));
        console.log(`SearchableMenuItemSelector - filtered ${filtered.length} categories for menu ${activeMenuId}`);
        
        // If we found categories for this menu, return them
        if (filtered.length > 0) {
          return filtered.sort((a, b) => a.name.localeCompare(b.name));
        }
      }
      
      // Fallback: If no activeMenuId or no categories found for the active menu,
      // group categories by name to avoid duplicates
      console.log('SearchableMenuItemSelector - using fallback: grouping categories by name');
      
      // Create a map to store unique categories by name
      const uniqueCategories = new Map();
      categories.forEach(cat => {
        // If we haven't seen this category name yet, or if this category belongs to the current menu
        if (!uniqueCategories.has(cat.name) ||
            (activeMenuId && Number(cat.menu_id) === Number(activeMenuId))) {
          uniqueCategories.set(cat.name, cat);
        }
      });
      
      // Convert the map values back to an array and sort
      const result = Array.from(uniqueCategories.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`SearchableMenuItemSelector - fallback found ${result.length} unique categories`);
      return result;
    }
    
    // No categories at all
    console.log('SearchableMenuItemSelector - no categories available');
    return [];
  }, [categories, currentMenuId]);
  
  // Debug: Log when sortedCategories changes
  useEffect(() => {
    console.log('SearchableMenuItemSelector - sortedCategories changed:', sortedCategories);
    console.log('SearchableMenuItemSelector - sortedCategories length:', sortedCategories.length);
  }, [sortedCategories]);
  
  // Render the search step
  const renderSearchStep = () => (
    <div className="p-4 space-y-4">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add Menu Item</h3>
          <p className="text-sm text-gray-600">
            Search for an item to add to the order
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X size={20} />
        </button>
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
      
      {/* Category filters - only show if we have categories */}
      {sortedCategories.length > 0 && (
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
      )}
      
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
                
                // Check option availability
                const hasOptions = item.option_groups && item.option_groups.length > 0;
                const hasAvailableOptions = hasOptions ? hasAvailableItemOptions(item) : true;
                const isCompletelyUnavailable = isOutOfStock || (hasOptions && !hasAvailableOptions);
                
                // Get option availability summary for display
                const optionSummary = hasOptions ? item.option_groups?.reduce((acc, group) => {
                  const availableCount = getAvailableOptionsCount(group);
                  const totalCount = group.options?.length || 0;
                  if (totalCount > 0) {
                    acc.push(`${group.name}: ${availableCount}/${totalCount} available`);
                  }
                  return acc;
                }, [] as string[]) : [];
                
                return (
                  <li
                    key={item.id}
                    className={`py-3 px-2 hover:bg-gray-50 cursor-pointer transition-colors rounded-md ${
                      isCompletelyUnavailable ? 'opacity-60' : ''
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
                        
                        {/* Option availability information */}
                        {hasOptions && (
                          <div className="mt-1">
                            {!hasAvailableOptions ? (
                              <span className="text-xs font-medium text-red-600">
                                No available options
                              </span>
                            ) : optionSummary && optionSummary.length > 0 ? (
                              <div className="text-xs text-gray-500">
                                <span className="text-[#c1902f] font-medium">Customizable</span>
                                {optionSummary.some(summary => summary.includes('0/')) && (
                                  <span className="ml-2 text-amber-600">Limited options</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-[#c1902f] font-medium">
                            Customizable
                              </div>
                            )}
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
      
      {/* Cancel button at the bottom */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 z-[10002] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn"
      >
        {renderSearchStep()}
      </div>
      
      {/* ItemCustomizationModal - using a higher z-index to ensure it appears on top */}
      {selectedItem && showCustomizationModal && (
        <div className="z-[10003]">
          <ItemCustomizationModal
            item={selectedItem}
            onClose={() => setShowCustomizationModal(false)}
            onAddToCart={handleAddCustomizedItem}
          />
        </div>
      )}
    </div>
  );
}
