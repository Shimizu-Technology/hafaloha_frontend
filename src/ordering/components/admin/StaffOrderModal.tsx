// src/ordering/componenets/admin/StaffOrderModal.tsx
import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import toastUtils from '../../../shared/utils/toastUtils';
import { useMenuStore } from '../../store/menuStore';
import { useOrderStore } from '../../store/orderStore';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import OptimizedImage from '../../../shared/components/ui/OptimizedImage';
import useIntersectionObserver from '../../../shared/hooks/useIntersectionObserver';
import { useAuthStore } from '../../store/authStore';
import { MenuItem, MenuOption } from '../../types/menu';
import { apiClient } from '../../../shared/api/apiClient';
// import { orderPaymentOperationsApi } from '../../../shared/api/endpoints/orderPaymentOperations';

// Payment components
import { StripeCheckout, StripeCheckoutRef } from '../../components/payment/StripeCheckout';
import { PayPalCheckout, PayPalCheckoutRef } from '../../components/payment/PayPalCheckout';

// Child components
// Used in JSX below - TypeScript doesn't detect this correctly
 
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { StaffOrderOptions } from './StaffOrderOptions';
import { StaffDiscountConfiguration, staffDiscountConfigurationsApi } from '../../../shared/api/endpoints/staffDiscountConfigurations';


interface StaffOrderModalProps {
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  restaurantId?: string; // Optional if needed
}

/** --------------------------------------------------------------------
 * UTILITY FUNCTIONS
 * -------------------------------------------------------------------*/

/** LazyStaffOrderImage component for optimized image loading */
interface LazyStaffOrderImageProps {
  image: string | undefined | null;
  name: string;
  className?: string;
}

const LazyStaffOrderImage = memo(function LazyStaffOrderImage({ 
  image, 
  name,
  className = 'w-full h-full object-cover'
}: LazyStaffOrderImageProps) {
  const [ref, isVisible] = useIntersectionObserver({
    rootMargin: '300px', // Increased to load images earlier
    triggerOnce: true, // Only trigger once
    threshold: 0.1 // Trigger when 10% of the element is visible
  });

  return (
    <div 
      ref={ref as React.RefObject<HTMLDivElement>} 
      className="w-full h-full"
      style={{ contain: 'paint layout' }} // Add content-visibility optimization
    >
      {isVisible ? (
        <OptimizedImage
          src={image}
          alt={name}
          className={className}
          width="160"
          height="160"
          context="menuItem"
          fallbackSrc="/placeholder-food.png"
          fetchPriority="high" // Prioritize loading these images
        />
      ) : (
        <div className="w-full h-full bg-gray-200 animate-pulse" />
      )}
    </div>
  );
});

/** Validate phone e.g. +16711234567 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

/** FE-014: Check if an option has sufficient inventory for the requested quantity */
function isOptionAvailable(option: MenuOption & { stock_quantity?: number; damaged_quantity?: number }, requestedQuantity: number = 1, optionGroup?: any): boolean {
  // Check manual availability first
  if (!option.available || option.is_available === false) {
    return false;
  }
  
  // Only check stock if THIS GROUP has inventory tracking enabled
  const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
  
  // If no tracking for this group, rely only on manual availability
  if (!groupHasInventoryTracking || option.stock_quantity === undefined) {
    return true; // Available based on manual toggle only
  }
  
  // Only check stock quantities for tracked groups
  const stockQuantity = option.stock_quantity || 0;
  const damagedQuantity = option.damaged_quantity || 0;
  const availableQuantity = Math.max(0, stockQuantity - damagedQuantity);
  
  return availableQuantity >= requestedQuantity;
}

/** FE-014: Check if an option group has any available options */
function hasAvailableOptions(optionGroup: { options?: (MenuOption & { stock_quantity?: number; damaged_quantity?: number })[]; enable_inventory_tracking?: boolean }): boolean {
  if (!optionGroup?.options) return false;
  return optionGroup.options.some((option) => isOptionAvailable(option, 1, optionGroup));
}

/** FE-014: Get available quantity for an option (group-aware) */
function getOptionAvailableQuantity(option: any, optionGroup?: any): number {
  // Check if the option's group has inventory tracking enabled
  const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
  
  // If no tracking for this group, return a large number to indicate unlimited availability
  if (!groupHasInventoryTracking) {
    return option.is_available !== false ? 999 : 0;
  }
  
  // Only apply stock logic for groups with inventory tracking enabled
  if (!option.stock_quantity && option.stock_quantity !== 0) {
    return option.is_available !== false ? 999 : 0;
  }
  
  const stockQuantity = option.stock_quantity || 0;
  const damagedQuantity = option.damaged_quantity || 0;
  return Math.max(0, stockQuantity - damagedQuantity);
}

/** FE-014: Get available quantity for a menu item (option-aware) */
function getMenuItemAvailableQuantity(item: MenuItem): number {
  // Use option-aware quantity if available, otherwise fallback to menu item level
  const hasOptionInventory = (item as any).uses_option_level_inventory;
  if (hasOptionInventory && (item as any).effective_available_quantity !== undefined) {
    return (item as any).effective_available_quantity;
  }
  
  return item.available_quantity || 0;
}

/** Hook that returns true if width < 768px (mobile) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  return isMobile;
}

/** Find the correct viewport height for mobile browsers */
function useVh() {
  const [vh, setVh] = useState(0);
  
  useEffect(() => {
    const updateVh = () => {
      // This helps handle mobile browser address bar behavior
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setVh(vh);
    };
    
    updateVh();
    window.addEventListener('resize', updateVh);
    return () => window.removeEventListener('resize', updateVh);
  }, []);
  
  return vh;
}

/** --------------------------------------------------------------------
 * MENU ITEMS PANEL
 * -------------------------------------------------------------------*/
interface MenuItemsPanelProps {
  menuItems: MenuItem[];
  menuLoading: boolean;
  categories: Map<number, string>;
  selectedCategory: number | 'all';
  setSelectedCategory: (cat: number | 'all') => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  findCartItem: (id: string) => any;
  handleAddItem: (item: MenuItem) => void;
  setCustomizingItem: (item: MenuItem) => void;
  setCartQuantity: (key: any, qty: number) => void;
  removeFromCart: (key: any) => void;
  getItemKey: (item: any) => string;
}

function MenuItemsPanel({
  menuItems,
  menuLoading,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  findCartItem,
  handleAddItem,
  setCustomizingItem,
  setCartQuantity,
  removeFromCart,
  getItemKey
}: MenuItemsPanelProps) {
  // Debug: Log categories when they change
  useEffect(() => {
    // Categories processed for menu items panel
  }, [categories]);
  // Filter items by search term & category & current menu
  const filteredMenuItems = useMemo(() => {
    // Get the current menu ID from context
    const { currentMenuId: contextMenuId } = useMenuStore.getState();
    const activeMenuId = contextMenuId;
    
    console.debug(`[MenuItemsPanel] Filtering ${menuItems.length} items for menu ID: ${activeMenuId}`);
    
    return menuItems.filter(item => {
      // If we have an active menu ID, only show items from that menu
      const matchesMenu = !activeMenuId || (item.menu_id && Number(item.menu_id) === Number(activeMenuId));
      
      const matchesSearch =
        !searchTerm ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat =
        selectedCategory === 'all' ||
        (item.category_ids && item.category_ids.includes(Number(selectedCategory)));
      
      const passes = matchesMenu && matchesSearch && matchesCat;
      
      if (!matchesMenu && activeMenuId) {
        console.debug(`[MenuItemsPanel] Item ${item.name} filtered out - belongs to menu ${item.menu_id}, need ${activeMenuId}`);
      }
      
      return passes;
    });
  }, [menuItems, searchTerm, selectedCategory]);
  
  // Sort menu items by position within their categories
  const sortedMenuItems = useMemo(() => {
    // Create a copy of filtered items to sort
    return [...filteredMenuItems].sort((a, b) => {
      // If items are in the same category, sort by position
      if (selectedCategory !== 'all' && 
          a.category_ids?.includes(Number(selectedCategory)) && 
          b.category_ids?.includes(Number(selectedCategory))) {
        // Sort by position if available - using type assertion since position is added by the API
        if ((a as any).position !== undefined && (b as any).position !== undefined) {
          return (a as any).position - (b as any).position;
        }
      }
      return 0; // Keep original order if no position or different categories
    });
  }, [filteredMenuItems, selectedCategory]);

  // Group items by category
  function groupedMenuItems() {
    if (selectedCategory !== 'all') {
      return {
        [selectedCategory.toString()]: sortedMenuItems.filter(item =>
          item.category_ids?.includes(Number(selectedCategory))
        ),
      };
    }
    const grouped: Record<string, MenuItem[]> = { uncategorized: [] };
    sortedMenuItems.forEach(item => {
      if (!item.category_ids?.length) {
        grouped.uncategorized.push(item);
      } else {
        item.category_ids.forEach(catId => {
          const key = catId.toString();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        });
      }
    });
    if (!grouped.uncategorized.length) delete grouped.uncategorized;
    return grouped;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Search & categories */}
      <div>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-[#c1902f]"
        />
        <div className="flex items-center mt-3 gap-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-4 py-3 rounded-md text-sm font-medium
            ${selectedCategory === 'all'
              ? 'bg-[#c1902f] text-white shadow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          {Array.from(categories.entries()).map(([catId, catName]) => (
            <button
              key={catId}
              onClick={() => setSelectedCategory(catId)}
              className={`whitespace-nowrap px-4 py-3 rounded-md text-sm font-medium
              ${selectedCategory === catId
                ? 'bg-[#c1902f] text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {catName}
            </button>
          ))}
        </div>
      </div>

      {/* Item cards */}
      <div className="mt-4">
        {menuLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c1902f]" />
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No menu items found.</div>
        ) : (
          Object.entries(groupedMenuItems()).map(([catId, items]) => (
            <div key={catId} className="mb-6">
              <h3 className="font-medium text-lg mb-3 pb-1 border-b border-gray-100">
                {categories.get(Number(catId)) ||
                  (catId === 'uncategorized' ? 'Uncategorized' : `Category ${catId}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items
                  // Sort items by position within category
                  .sort((a, b) => {
                    // Using type assertion since position is added by the API but not in the TypeScript interface
                    if ((a as any).position !== undefined && (b as any).position !== undefined) {
                      return (a as any).position - (b as any).position;
                    }
                    return 0;
                  })
                  .map(item => {
                  const cartItem = findCartItem(item.id);
                  const isInCart = !!cartItem;
                  const hasOptions = item.option_groups && item.option_groups.length > 0;
                  
                  // Debug logging for customize button logic
                  if (item.name.toLowerCase().includes('build') || item.name.toLowerCase().includes('bowl')) {
                    console.debug(`[StaffOrderModal] Item "${item.name}" - hasOptions: ${hasOptions}, option_groups:`, item.option_groups);
                  }

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg hover:shadow-md transition-shadow p-1
                        ${isInCart
                          ? 'border-[#c1902f] bg-yellow-50 shadow'
                          : 'border-gray-200'
                        }`}
                    >
                      <div className="flex h-full w-full">
                        {/* Item image with optimized loading */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden rounded-l-lg">
                          <LazyStaffOrderImage
                            image={item.image}
                            name={item.name}
                          />
                        </div>
                        
                        {/* Item details */}
                        <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
                          <div className="flex flex-col mb-1">
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">
                              {item.name}
                            </h4>
                            <p className="text-[#c1902f] font-semibold text-sm sm:text-base mt-1">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                          
                          {/* Stock indicator */}
                          {(item.enable_stock_tracking || item.stock_status === 'out_of_stock' || item.stock_status === 'low_stock') && (
                            <p className="text-xs text-gray-500 mb-1">
                              {(() => {
                                // Check manually set stock status first
                                if (item.stock_status === 'out_of_stock') {
                                  return 'Out of stock';
                                }
                                if (item.stock_status === 'low_stock') {
                                  return 'Low stock';
                                }
                                
                                // Then check inventory tracking
                                if (item.enable_stock_tracking && item.available_quantity !== undefined) {
                                  // Calculate effective available quantity by subtracting cart quantity
                                  const cartItem = findCartItem(item.id);
                                  const cartQuantity = cartItem ? cartItem.quantity : 0;
                                  const effectiveQuantity = getMenuItemAvailableQuantity(item) - cartQuantity;
                                  return effectiveQuantity > 0
                                    ? `${effectiveQuantity} left`
                                    : 'Out of stock';
                                }
                                return '';
                              })()}
                            </p>
                          )}

                          {/* FE-014: Option availability indicator */}
                          {item.option_groups && item.option_groups.length > 0 && (() => {
                            // Only check for required groups that have inventory tracking enabled
                            const requiredGroupsWithoutAvailableOptions = item.option_groups.filter(group => 
                              group.min_select > 0 && group.enable_inventory_tracking === true && !hasAvailableOptions(group)
                            );
                            
                            if (requiredGroupsWithoutAvailableOptions.length > 0) {
                              return (
                                <p className="text-xs text-red-500 mb-1">
                                  Required options unavailable
                                </p>
                              );
                            }
                            
                            // Check if any options have limited availability - only for groups with inventory tracking
                            const optionsWithLimitedStock = item.option_groups
                              .filter(group => group.enable_inventory_tracking === true)
                              .flatMap(group => 
                                group.options.filter(option => {
                                  const availableQty = getOptionAvailableQuantity(option, group);
                                  return availableQty > 0 && availableQty < 10;
                                })
                              );
                            
                            if (optionsWithLimitedStock.length > 0) {
                              return (
                                <p className="text-xs text-amber-600 mb-1">
                                  Some options limited
                                </p>
                              );
                            }
                            
                            return null;
                          })()}

                          {/* Add / Customize / Stock buttons */}
                          <div className="flex justify-end">
                            {(item.stock_status === 'out_of_stock' ||
                              (item.enable_stock_tracking && item.available_quantity !== undefined && (() => {
                                // Calculate effective available quantity by subtracting cart quantity
                                const cartItem = findCartItem(item.id);
                                const cartQuantity = cartItem ? cartItem.quantity : 0;
                                const effectiveQuantity = getMenuItemAvailableQuantity(item) - cartQuantity;
                                return effectiveQuantity <= 0;
                              })())
                            ) ? (
                              // Out of stock
                              <button
                                disabled
                                className="bg-gray-300 text-gray-500 px-3 py-1 rounded text-sm font-medium cursor-not-allowed"
                              >
                                Out of Stock
                              </button>
                            ) : isInCart && !hasOptions ? (
                              <div className="flex items-center">
                                {/* Decrease */}
                                <button
                                  onClick={() => {
                                    const itemKey = getItemKey(item);
                                    if (cartItem.quantity > 1) {
                                      setCartQuantity(itemKey, cartItem.quantity - 1);
                                    } else {
                                      removeFromCart(itemKey);
                                    }
                                  }}
                                  className="text-gray-600 hover:text-[#c1902f] p-2.5"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor">
                                    <path
                                      fillRule="evenodd"
                                      d="M5 10a1 1 0
                                      011-1h8a1 1 0
                                      110 2H6a1 1 0
                                      01-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                                <span className="mx-2 text-sm">{cartItem.quantity}</span>
                                {/* Increase */}
                                <button
                                  onClick={() => {
                                    const itemKey = getItemKey(item);
                                    setCartQuantity(itemKey, cartItem.quantity + 1);
                                  }}
                                  className="text-gray-600 hover:text-[#c1902f] p-2.5"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 5a1 1 0
                                      011 1v3h3a1 1 0
                                      110 2h-3v3a1 1 0
                                      11-2 0v-3H6a1 1 0
                                      110-2h3V6a1 1 0
                                      011-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ) : hasOptions ? (
                              (() => {
                                // FE-014: Check if required options are available - only for groups with inventory tracking
                                const requiredGroupsWithoutAvailableOptions = item.option_groups?.filter(group => 
                                  group.min_select > 0 && group.enable_inventory_tracking === true && !hasAvailableOptions(group)
                                ) || [];
                                
                                const hasUnavailableRequiredOptions = requiredGroupsWithoutAvailableOptions.length > 0;
                                
                                return (
                              <button
                                    onClick={() => hasUnavailableRequiredOptions ? null : setCustomizingItem(item)}
                                    disabled={hasUnavailableRequiredOptions}
                                    className={`px-2 py-2.5 rounded text-base font-medium ${
                                      hasUnavailableRequiredOptions
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-[#c1902f] text-white hover:bg-[#a97c28]'
                                    }`}
                              >
                                    {hasUnavailableRequiredOptions 
                                      ? 'Options Unavailable' 
                                      : (isInCart ? 'Add Another' : 'Customize')
                                    }
                              </button>
                                );
                              })()
                            ) : (
                              <button
                                onClick={() => handleAddItem(item)}
                                className="text-[#c1902f] hover:bg-[#c1902f] hover:text-white px-4 py-2.5 rounded text-base font-medium"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** --------------------------------------------------------------------
 * ORDER PANEL
 * -------------------------------------------------------------------*/
interface OrderPanelProps {
  cartItems: any[];
  findCartItem: (id: string) => any;
  setCartQuantity: (key: any, qty: number) => void;
  removeFromCart: (key: any) => void;
  handleSubmitOrder: () => void;
  orderTotal: number;
  orderLoading: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  setCustomizingItem: (item: MenuItem) => void;
  // Staff order props
  isStaffOrder: boolean;
  setIsStaffOrder: (value: boolean) => void;
  staffMemberId: number | null;
  setStaffMemberId: (value: number | null) => void;
  discountType: StaffDiscountType;
  setDiscountType: (value: StaffDiscountType) => void;
  useHouseAccount: boolean;
  setUseHouseAccount: (value: boolean) => void;
  createdByStaffId: number | null;
  setCreatedByStaffId: (value: number | null) => void;
  preDiscountTotal: number;
  // New props for configurable discounts
  discountConfigurationId?: number | null;
  setDiscountConfigurationId?: (value: number | null) => void;
  discountConfigurations?: StaffDiscountConfiguration[];
}

function OrderPanel({
  cartItems,
  findCartItem,
  setCartQuantity,
  removeFromCart,
  handleSubmitOrder,
  orderTotal,
  orderLoading,
  onClose,
  menuItems,
  setCustomizingItem,
  // Staff order props
  isStaffOrder,
  setIsStaffOrder,
  staffMemberId,
  setStaffMemberId,
  discountType,
  setDiscountType,
  useHouseAccount,
  setUseHouseAccount,
  createdByStaffId,
  setCreatedByStaffId,
  preDiscountTotal,
  // New props for configurable discounts
  discountConfigurationId,
  setDiscountConfigurationId,
  discountConfigurations = [],
}: OrderPanelProps) {
  const getItemKey = useOrderStore(state => state._getItemKey);
  const [staffOptionsExpanded, setStaffOptionsExpanded] = useState(true);
  // Use isMobile to conditionally render content
  const isMobile = useIsMobile();

  // Helper function to get discount label
  const getDiscountLabel = (): string => {
    if (!isStaffOrder) return '0%';
    
    // First, try to get from configuration ID
    if (discountConfigurationId && discountConfigurations.length > 0) {
      const config = discountConfigurations.find(c => c.id === discountConfigurationId);
      if (config) {
        if (config.discount_type === 'percentage') {
          return `${config.discount_percentage}%`;
        } else if (config.discount_type === 'fixed_amount') {
          return `$${config.discount_percentage}`;
        }
      }
    }
    
    // Fallback to configuration by code
    if (discountConfigurations.length > 0) {
      const config = discountConfigurations.find(c => c.code === discountType);
      if (config) {
        if (config.discount_type === 'percentage') {
          return `${config.discount_percentage}%`;
        } else if (config.discount_type === 'fixed_amount') {
          return `$${config.discount_percentage}`;
        }
      }
    }
    
    // Final fallback to hardcoded values
    switch (discountType) {
      case 'on_duty':
        return '50%';
      case 'off_duty':
        return '30%';
      case 'no_discount':
        return '0%';
      default:
        return '0%';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable cart section */}
      <div className="overflow-y-auto flex-1 p-4 pb-[150px] max-h-[calc(100%-150px)]">
        <h3 className="text-lg font-semibold mb-4">Current Order</h3>
        
        {/* Staff Order Checkbox and Toggle */}
        <div className="bg-gray-50 p-3 rounded-md mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="staff-order-checkbox"
                checked={isStaffOrder}
                onChange={(e) => setIsStaffOrder(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="staff-order-checkbox" className="ml-2 text-sm font-medium text-gray-900">
                Staff Order
              </label>
            </div>
            {isStaffOrder && (
              <button 
                onClick={() => setStaffOptionsExpanded(!staffOptionsExpanded)}
                className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                {staffOptionsExpanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
          
          {/* Collapsible Staff Order Options */}
          {isStaffOrder && staffOptionsExpanded && (
            <div className="mt-3">
              <StaffOrderOptions
                isStaffOrder={isStaffOrder}
                setIsStaffOrder={setIsStaffOrder}
                staffMemberId={staffMemberId}
                setStaffMemberId={setStaffMemberId}
                discountType={discountType}
                setDiscountType={setDiscountType}
                useHouseAccount={useHouseAccount}
                setUseHouseAccount={setUseHouseAccount}
                createdByStaffId={createdByStaffId}
                setCreatedByStaffId={setCreatedByStaffId}
                discountConfigurationId={discountConfigurationId}
                setDiscountConfigurationId={setDiscountConfigurationId}
              />
            </div>
          )}
        </div>
        {cartItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No items in the order yet</div>
        ) : (
          <div className="space-y-3">
            {cartItems.map(item => {
              const itemKey = getItemKey(item);
              return (
                <div
                  key={itemKey}
                  className="border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-800 text-sm sm:text-base line-clamp-1 pr-2 flex-1">
                      {item.name}
                    </p>
                    <div className="flex items-center">
                      <span className="text-gray-700 font-medium text-sm sm:text-base mr-2">
                        ${(item.price * item.quantity).toFixed(2)}
                        {item.customizations && item.customizations.length > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            (${item.price.toFixed(2)} each)
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => removeFromCart(itemKey)}
                        className="text-gray-400 hover:text-red-500 p-1 focus:outline-none"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1
                            1 0
                            011.414 0L10
                            8.586l4.293-4.293a1 1 0
                            011.414 1.414L11.414
                            10l4.293
                            4.293a1 1 0
                            01-1.414
                            1.414L10
                            11.414l-4.293
                            4.293a1 1 0
                            01-1.414-1.414L8.586
                            10 4.293
                            5.707a1 1 0
                            010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Customizations */}
                  {item.customizations && (
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {Array.isArray(item.customizations) ? (
                        item.customizations.map((custom: any, idx: number) => {
                          // Attempt to find actual names from menu item
                          const menuItem = menuItems.find(m => m.id === item.id);
                          let optionGroupName = `Group ${custom.option_group_id}`;
                          let optionName = `Option ${custom.option_id}`;
                          if (menuItem && menuItem.option_groups) {
                            const group = menuItem.option_groups.find(g => g.id === custom.option_group_id);
                            if (group) {
                              optionGroupName = group.name;
                              const opt = group.options.find(o => o.id === custom.option_id);
                              if (opt) optionName = opt.name;
                            }
                          }
                          return (
                            <div key={idx} className="flex items-center">
                              <span className="inline-block w-2 h-2 bg-[#c1902f] rounded-full mr-1.5"></span>
                              <span className="font-medium">{optionGroupName}:</span> {optionName}
                            </div>
                          );
                        })
                      ) : (
                        // Object-based customizations
                        Object.entries(item.customizations).map(([groupName, options], idx: number) => (
                          <div key={idx} className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-[#c1902f] rounded-full mr-1.5"></span>
                            <span className="font-medium">{groupName}:</span>{' '}
                            {Array.isArray(options) ? options.join(', ') : String(options)}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* +/- controls */}
                  <div className="flex items-center justify-between mt-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      {/* Decrease */}
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            setCartQuantity(itemKey, item.quantity - 1);
                          } else {
                            removeFromCart(itemKey);
                          }
                        }}
                        className="text-gray-600 hover:text-[#c1902f] p-2.5 rounded-l"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5 10a1 1 0
                            011-1h8a1 1 0
                            110 2H6a1 1 0
                            01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <span className="mx-2 w-6 text-center text-sm font-medium">{item.quantity}</span>
                      {/* Increase */}
                      <button
                        onClick={() => {
                          setCartQuantity(itemKey, item.quantity + 1);
                        }}
                        disabled={(() => {
                          const menuItem = menuItems.find(m => m.id === item.id);
                          
                          // Check item-level inventory first
                          if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                            const cartItem = findCartItem(menuItem.id);
                            const cartQuantity = cartItem ? cartItem.quantity : 0;
                            const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                            if (effectiveQuantity <= 0) {
                              return true;
                            }
                          }
                          
                          // Check option-level inventory for customized items
                          if (item.customizations && menuItem?.option_groups) {
                            const newQuantity = item.quantity + 1;
                            
                            // Check each customization
                            for (const [groupName, selectedOptionNames] of Object.entries(item.customizations)) {
                              const optionGroup = menuItem.option_groups.find(g => g.name === groupName);
                              if (!optionGroup) continue;
                              
                              // Check each selected option in this group
                              const selectedOptions = Array.isArray(selectedOptionNames) ? selectedOptionNames : [selectedOptionNames];
                              for (const optionName of selectedOptions) {
                                const option = optionGroup.options.find(o => o.name === optionName);
                                if (option) {
                                  const availableQuantity = getOptionAvailableQuantity(option, optionGroup);
                                  // Check if this option has enough stock for the new quantity
                                  if (availableQuantity < newQuantity) {
                                    return true; // Disable button if any option doesn't have enough stock
                                  }
                                }
                              }
                            }
                          }
                          
                          return false;
                        })()}
                        className={`text-gray-600 hover:text-[#c1902f] p-2.5 rounded-r ${
                          (() => {
                            const menuItem = menuItems.find(m => m.id === item.id);
                            
                            // Check if disabled due to stock issues
                            if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                              const cartItem = findCartItem(menuItem.id);
                              const cartQuantity = cartItem ? cartItem.quantity : 0;
                              const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                              if (effectiveQuantity <= 0) {
                                return 'opacity-50 cursor-not-allowed';
                              }
                            }
                            
                            // Check option-level stock - only for groups with inventory tracking
                            if (item.customizations && menuItem?.option_groups) {
                              const newQuantity = item.quantity + 1;
                              for (const [groupName, selectedOptionNames] of Object.entries(item.customizations)) {
                                const optionGroup = menuItem.option_groups.find(g => g.name === groupName);
                                if (!optionGroup || !optionGroup.enable_inventory_tracking) continue; // Skip non-tracked groups
                                
                                const selectedOptions = Array.isArray(selectedOptionNames) ? selectedOptionNames : [selectedOptionNames];
                                for (const optionName of selectedOptions) {
                                  const option = optionGroup.options.find(o => o.name === optionName);
                                  if (option) {
                                    const availableQuantity = getOptionAvailableQuantity(option, optionGroup);
                                    if (availableQuantity < newQuantity) {
                                      return 'opacity-50 cursor-not-allowed';
                                    }
                                  }
                                }
                              }
                            }
                            
                            return '';
                          })()
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 5a1 1 0
                            011 1v3h3a1 1 0
                            110 2h-3v3a1 1 0
                            11-2 0v-3H6a1 1 0
                            110-2h3V6a1 1 0
                            011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                    {/* Add Another if custom */}
                    {item.customizations && item.id && (
                      <button
                        onClick={() => {
                          const mi = menuItems.find(m => m.id === item.id);
                          if (mi?.option_groups?.length) {
                            // Check item-level stock before adding
                            if (mi.enable_stock_tracking && mi.available_quantity !== undefined) {
                              const cartItem = findCartItem(mi.id);
                              const cartQuantity = cartItem ? cartItem.quantity : 0;
                              const effectiveQuantity = mi.available_quantity - cartQuantity;
                              if (effectiveQuantity <= 0) {
                                toastUtils.error(`Cannot add more ${mi.name}. Stock limit reached.`);
                                return;
                              }
                            }
                            
                            // Check option-level stock for current item's customizations - only for groups with inventory tracking
                            if (item.customizations && mi.option_groups) {
                              const stockErrors: string[] = [];
                              
                              // Check each customization in the current cart item
                              for (const [groupName, selectedOptionNames] of Object.entries(item.customizations)) {
                                const optionGroup = mi.option_groups.find(g => g.name === groupName);
                                if (!optionGroup || !optionGroup.enable_inventory_tracking) continue; // Skip non-tracked groups
                                
                                const selectedOptions = Array.isArray(selectedOptionNames) ? selectedOptionNames : [selectedOptionNames];
                                for (const optionName of selectedOptions) {
                                  const option = optionGroup.options.find(o => o.name === optionName);
                                  if (option) {
                                    const availableQuantity = getOptionAvailableQuantity(option, optionGroup);
                                    if (availableQuantity < 1) {
                                      stockErrors.push(`${optionName} is out of stock`);
                                    }
                                  }
                                }
                              }
                              
                              if (stockErrors.length > 0) {
                                toastUtils.error(`Cannot add another ${mi.name}:\n\n${stockErrors.join('\n')}`);
                                return;
                              }
                            }
                            
                            setCustomizingItem(mi);
                          }
                        }}
                        disabled={(() => {
                          const menuItem = menuItems.find(m => m.id === item.id);
                          
                          // Check item-level inventory
                          if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                            const cartItem = findCartItem(menuItem.id);
                            const cartQuantity = cartItem ? cartItem.quantity : 0;
                            const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                            if (effectiveQuantity <= 0) {
                              return true;
                            }
                          }
                          
                          // Check option-level inventory for current customizations - only for tracked groups
                          if (item.customizations && menuItem?.option_groups) {
                            for (const [groupName, selectedOptionNames] of Object.entries(item.customizations)) {
                              const optionGroup = menuItem.option_groups.find(g => g.name === groupName);
                              if (!optionGroup || !optionGroup.enable_inventory_tracking) continue; // Skip non-tracked groups
                              
                              const selectedOptions = Array.isArray(selectedOptionNames) ? selectedOptionNames : [selectedOptionNames];
                              for (const optionName of selectedOptions) {
                                const option = optionGroup.options.find(o => o.name === optionName);
                                if (option) {
                                  const availableQuantity = getOptionAvailableQuantity(option, optionGroup);
                                  if (availableQuantity < 1) {
                                    return true; // Disable if any option is out of stock
                                  }
                                }
                              }
                            }
                          }
                          
                          return false;
                        })()}
                        className={`mt-1 sm:mt-0 text-[#c1902f] border border-[#c1902f] px-4 py-2
                                   rounded text-sm font-medium transition-colors ${
                          (() => {
                            const menuItem = menuItems.find(m => m.id === item.id);
                            
                            // Check if disabled due to stock issues
                            let isDisabled = false;
                            
                            if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                              const cartItem = findCartItem(menuItem.id);
                              const cartQuantity = cartItem ? cartItem.quantity : 0;
                              const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                              if (effectiveQuantity <= 0) {
                                isDisabled = true;
                              }
                            }
                            
                            if (item.customizations && menuItem?.option_groups) {
                              for (const [groupName, selectedOptionNames] of Object.entries(item.customizations)) {
                                const optionGroup = menuItem.option_groups.find(g => g.name === groupName);
                                if (!optionGroup || !optionGroup.enable_inventory_tracking) continue; // Skip non-tracked groups
                                
                                const selectedOptions = Array.isArray(selectedOptionNames) ? selectedOptionNames : [selectedOptionNames];
                                for (const optionName of selectedOptions) {
                                  const option = optionGroup.options.find(o => o.name === optionName);
                                  if (option) {
                                    const availableQuantity = getOptionAvailableQuantity(option, optionGroup);
                                    if (availableQuantity < 1) {
                                      isDisabled = true;
                                      break;
                                    }
                                  }
                                }
                                if (isDisabled) break;
                              }
                            }
                            
                            return isDisabled 
                              ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                              : 'hover:bg-[#c1902f] hover:text-white';
                          })()
                        }`}
                      >
                        Add Another
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar for totals and 'Create Order' - only show on desktop */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md">
        {isStaffOrder && (
          <div className="mb-3 bg-gray-50 p-2 rounded-md border border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">Original Price:</span>
              <span className="text-gray-700">${preDiscountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">
                Discount ({getDiscountLabel()}):
              </span>
              <span className="text-green-600">-${(preDiscountTotal - orderTotal).toFixed(2)}</span>
            </div>
          </div>
        )}
        {/* Only show the Total area on desktop to avoid duplication */}
        {!isMobile && (
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-gray-700 text-lg">Total:</span>
            <span className="font-bold text-xl text-[#c1902f]">
              ${orderTotal.toFixed(2)}
            </span>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={onClose}
            className="py-3 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200
              focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={!cartItems.length || orderLoading}
            className="py-3 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28]
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50
              disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {orderLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none" viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              'Create Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


/** --------------------------------------------------------------------
 * CUSTOMER INFO PANEL
 * (with scrollable content, pinned button at bottom)
 * -------------------------------------------------------------------*/
interface CustomerInfoPanelProps {
  contactName: string;
  setContactName: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  contactEmail: string;
  setContactEmail: (val: string) => void;
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;
  onBack: () => void;
}

function CustomerInfoPanel({
  contactName, setContactName,
  contactPhone, setContactPhone,
  contactEmail, setContactEmail,
  specialInstructions, setSpecialInstructions,
  onBack,
}: CustomerInfoPanelProps) {

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="overflow-y-auto flex-1 max-h-[calc(100vh-120px)] md:max-h-[calc(100%-70px)]">
        <div className="px-4 py-4 space-y-4 pb-20">
          <h3 className="text-lg font-semibold text-gray-800 sticky top-0 bg-white z-10 py-2 -mt-2">Customer Information</h3>
          
          <form className="space-y-4 w-full px-4">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">Name <span className="text-gray-400">(Optional)</span></label>
              <input
                type="text"
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
            
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">Phone <span className="text-gray-400">(Optional)</span></label>
              <input
                type="tel"
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+16711234567"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
              <p className="text-xs text-gray-500 mt-1">Format: +1671 followed by 7 digits</p>
            </div>
            
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">Email <span className="text-gray-400">(Optional)</span></label>
              <input
                type="email"
                id="contactEmail"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
            
            <div>
              <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700">Special Instructions <span className="text-gray-400">(Optional)</span></label>
              <textarea
                id="specialInstructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Bottom button: "Back to Order" */}
      <div className="px-4 sticky bottom-0 left-0 right-0 bg-white pt-2 pb-4 shadow-md border-t border-gray-100 z-10">
        <button
          onClick={onBack}
          className="w-full py-2.5 text-sm font-medium bg-gray-50 border border-gray-300
                     hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
        >
          Back to Order
        </button>
      </div>

    </div>
  );
}

/** --------------------------------------------------------------------
 * PAYMENT PANEL
 * (For non-staff payments)
 * -------------------------------------------------------------------*/
interface PaymentPanelProps {
  orderTotal: number;
  onPaymentSuccess: (details: {
    status: string;
    transaction_id: string;
    payment_id?: string;
    amount: string;
    currency?: string;
    payment_details?: any;
  }) => void;
  onPaymentError: (error: Error) => void;
  onBack: () => void;
  isProcessing: boolean;
}

function PaymentPanel({
  orderTotal,
  onPaymentSuccess,
  onPaymentError,
  onBack,
  isProcessing
}: PaymentPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe_reader' | 'cash' | 'credit_card' | 'other'>('stripe_reader');

  const [paymentError, setPaymentError] = useState<string | null>(null);
  // For dynamic height adjustment
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  // Simplified payment state management
  const [paymentState, setPaymentState] = useState<'idle' | 'loading' | 'processing' | 'success' | 'error'>('idle');
  
  // Manual payment details
  const [transactionId, setTransactionId] = useState('');
  // Set default payment date to today
  const today = new Date().toISOString().split('T')[0];
  // Cash register functionality
  const [cashReceived, setCashReceived] = useState<string>(orderTotal.toString());
  
  // For simplicity, we'll use a temporary ID for the cash payment
  // In a real implementation, you would get this from the order being created
  const tempOrderId = 'temp-order';
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Get current user from auth store
  const { user } = useAuthStore();

  // Payment processor config
  const stripeRef = useRef<StripeCheckoutRef>(null);
  const paypalRef = useRef<PayPalCheckoutRef>(null);
  const restaurant = useRestaurantStore((state) => state.restaurant);
  const paymentGateway = restaurant?.admin_settings?.payment_gateway || {};
  const paymentProcessor = paymentGateway.payment_processor || 'paypal';
  const testMode = paymentGateway.test_mode !== false;
  
  // Handle resize when payment method changes or payment elements load
  useEffect(() => {
    const handleResize = () => {
      setContainerHeight(window.innerHeight);
    };
    
    // Call once when payment method changes
    handleResize();
    
    // Also listen for window resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [paymentMethod]);

  const handleCashPayment = async () => {
    // Convert string to number for calculations
    const cashReceivedNum = cashReceived === '' ? 0 : parseFloat(cashReceived);
    
    // Validate that cash received is sufficient
    if (cashReceivedNum < orderTotal) {
      setPaymentError('Cash received must be at least equal to the order total');
      return;
    }
    
    setPaymentState('processing');
    
    // For now, we'll simulate the cash payment without calling the backend
    // In a real implementation, you would call the API endpoint
    try {
      // Calculate change
      const changeDue = cashReceivedNum - orderTotal;
      
      // Show change due to the user if needed
      if (changeDue > 0) {
        toastUtils.success(`Payment successful. Change due: $${changeDue.toFixed(2)}`);
      } else {
        toastUtils.success('Payment successful');
      }
      
      // Complete the order process
      onPaymentSuccess({
        status: 'succeeded',
        transaction_id: `cash_${Date.now()}`,
        amount: orderTotal.toString(),
        payment_details: {
          payment_method: 'cash',
          transaction_id: `cash_${Date.now()}`,
          payment_date: today,
          notes: `Cash payment - Received: $${cashReceivedNum.toFixed(2)}, Change: $${changeDue.toFixed(2)}`,
          cash_received: cashReceivedNum,
          change_due: changeDue,
          status: 'succeeded'
        }
      });
      
      setPaymentState('success');
    } catch (err: any) {
      console.error('Error processing cash payment:', err);
      const errorMessage = err.response?.data?.error || 'Failed to process cash payment';
      toastUtils.error(errorMessage);
      setPaymentError(errorMessage);
      setPaymentState('error');
    }
  };


  const handleProcessPayment = async () => {
    if (paymentState === 'processing') return;
    
    if (paymentMethod === 'cash') {
      handleCashPayment();
      return;
    }
    if (['stripe_reader', 'other'].includes(paymentMethod)) {
      handleManualPayment();
      return;
    }
    
    // Credit Card Payment
    try {
      setPaymentState('processing');
      
      if (paymentProcessor === 'stripe' && stripeRef.current) {
        const success = await stripeRef.current.processPayment();
        if (!success) {
          setPaymentState('error');
        }
      } else if (paymentProcessor === 'paypal' && paypalRef.current) {
        const success = await paypalRef.current.processPayment();
        if (!success) {
          setPaymentState('error');
        }
      } else {
        toastUtils.error('Payment processor not configured');
        setPaymentState('error');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      onPaymentError(error instanceof Error ? error : new Error('Payment processing failed'));
      setPaymentState('error');
    }
  };

  // New function to handle manual payments
  const handleManualPayment = () => {
    // Validate required fields
    if (!paymentDate) {
      setPaymentError('Payment date is required');
      return;
    }
    
    setPaymentState('processing');
    
    try {
      // Create payment details object
      const paymentDetails = {
        payment_method: paymentMethod,
        transaction_id: transactionId || `${paymentMethod}_${Date.now()}`,
        payment_date: paymentDate,
        staff_id: user?.id, // Capture the current user's ID
        notes: paymentNotes || `Payment processed via ${paymentMethod}`,
        status: 'succeeded',
        processor: paymentMethod === 'stripe_reader' ? 'stripe' : paymentMethod
      };
      
      // Call the success callback with the payment details
      onPaymentSuccess({
        status: 'succeeded',
        transaction_id: paymentDetails.transaction_id,
        amount: orderTotal.toString(),
        payment_details: paymentDetails
      });
      
      setPaymentState('success');
    } catch (error) {
      console.error('Error processing manual payment:', error);
      setPaymentError('Failed to process manual payment');
      setPaymentState('error');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area with more padding for payment elements */}
      <div className="overflow-y-auto p-6 pb-28 flex-1">
        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                paymentMethod === 'stripe_reader'
                  ? 'bg-[#c1902f] text-white border-[#c1902f]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setPaymentMethod('stripe_reader')}
            >
              Card Reader
            </button>
            <button
              type="button"
              className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                paymentMethod === 'cash'
                  ? 'bg-[#c1902f] text-white border-[#c1902f]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setPaymentMethod('cash')}
            >
              Cash
            </button>
            <button
              type="button"
              className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                paymentMethod === 'credit_card'
                  ? 'bg-[#c1902f] text-white border-[#c1902f]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setPaymentMethod('credit_card')}
            >
              Stripe
            </button>
            <button
              type="button"
              className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                paymentMethod === 'other'
                  ? 'bg-[#c1902f] text-white border-[#c1902f]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setPaymentMethod('other')}
            >
              Other
            </button>
          </div>
        </div>

        {/* Credit Card Panel - with improved layout */}
        {paymentMethod === 'credit_card' && (
          <div className="border border-gray-200 rounded-md p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Credit Card Payment</h4>
            <div className="sm:flex sm:space-x-4">
              <div className="w-full">
                <div className="w-full">
                  {paymentProcessor === 'stripe' ? (
                    <StripeCheckout
                      ref={stripeRef}
                      amount={orderTotal.toString()}
                      publishableKey={(paymentGateway.publishable_key as string) || ""}
                      currency="USD"
                      testMode={testMode}
                      onPaymentSuccess={onPaymentSuccess}
                      onPaymentError={onPaymentError}
                    />
                  ) : (
                    <PayPalCheckout
                      ref={paypalRef}
                      amount={orderTotal.toString()}
                      clientId={(paymentGateway.client_id as string) || "sandbox_client_id"}
                      currency="USD"
                      testMode={testMode}
                      onPaymentSuccess={onPaymentSuccess}
                      onPaymentError={onPaymentError}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cash Payment Panel */}
        {paymentMethod === 'cash' && (
          <div className="border border-gray-200 rounded-md p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Cash Payment</h4>
            <div className="space-y-4">
              {/* Order Total Display */}
              <div className="flex justify-between items-center font-medium bg-gray-50 p-3 rounded-md">
                <span>Order Total:</span>
                <span className="text-lg text-[#c1902f]">${orderTotal.toFixed(2)}</span>
              </div>
              
              {/* Cash Received Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cash Received
                </label>
                
                {/* Quick denomination buttons */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[5, 10, 20, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashReceived(amount.toString())}
                      className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors
                        ${cashReceived === amount.toString()
                          ? 'bg-[#c1902f] text-white border-[#c1902f]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      ${amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceived(Math.ceil(orderTotal).toString())}
                    className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors
                      ${cashReceived === Math.ceil(orderTotal).toString()
                        ? 'bg-[#c1902f] text-white border-[#c1902f]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    ${Math.ceil(orderTotal)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashReceived(orderTotal.toString())}
                    className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors
                      ${cashReceived === orderTotal.toString()
                        ? 'bg-[#c1902f] text-white border-[#c1902f]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Exact
                  </button>
                </div>
                
                {/* Custom amount input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={e => {
                      // Ensure we're always working with a string
                      const newValue = e.target.value;
                      setCashReceived(newValue);
                    }}
                    onFocus={e => {
                      // Select all text when focused to make it easier to replace
                      e.target.select();
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                    placeholder="Other amount"
                  />
                </div>
              </div>
              
              {/* Change Calculation (only shown if cashReceived > orderTotal) */}
              {parseFloat(cashReceived || '0') > orderTotal && (
                <div className="bg-green-50 border border-green-100 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Change Due:</span>
                    <span className="text-lg font-bold text-green-700">
                      ${(parseFloat(cashReceived || '0') - orderTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
{/* Manual Payment Panel (Stripe Reader, Other) */}
{['stripe_reader', 'other'].includes(paymentMethod) && (
  <div className="border border-gray-200 rounded-md p-4 mb-6">
    <h4 className="text-sm font-medium text-gray-700 mb-3">
      {paymentMethod === 'stripe_reader'
        ? 'Card Reader'
        : 'Other'} Payment Details
    </h4>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Transaction ID/Reference Number (optional)
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
          value={transactionId}
          onChange={e => setTransactionId(e.target.value)}
          placeholder="Enter transaction ID or reference number"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Date
        </label>
        <input
          type="date"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
          value={paymentDate}
          onChange={e => setPaymentDate(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
          value={paymentNotes}
          onChange={e => setPaymentNotes(e.target.value)}
          placeholder="Enter any additional payment notes"
          rows={3}
        />
      </div>
    </div>
  </div>
)}



        {/* Payment Error */}
        {paymentError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16
                      8 8 0 000 16zM8.707 7.293a1 1 0
                      00-1.414 1.414L8.586 10l-1.293
                      1.293a1 1 0 101.414
                      1.414L10 11.414l1.293
                      1.293a1 1 0 001.414-1.414L11.414
                      10l1.293-1.293a1 1 0
                      00-1.414-1.414L10
                      8.586 8.707
                      7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{paymentError}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed buttons at the bottom */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-md z-20 mt-auto">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={onBack}
            className="py-3 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200
              focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-sm transition-colors"
            disabled={isProcessing}
          >
            Back
          </button>
          <button
            onClick={handleProcessPayment}
            disabled={
              paymentState === 'processing' || isProcessing ||
              (paymentMethod === 'cash' && (parseFloat(cashReceived || '0') < orderTotal))
            }
            className="py-3 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28]
                      focus:outline-none focus:ring-2 focus:ring-[#c1902f]
                      focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-sm transition-colors"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0
                        0 5.373 0 12h4zm2
                        5.291A7.962
                        7.962
                        0
                        014
                        12H0c0
                        3.042
                        1.135
                        5.824
                        3
                        7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              paymentMethod === 'cash'
                ? 'Complete Cash Payment'
                : paymentMethod === 'stripe_reader'
                  ? 'Complete Card Reader Payment'
                  : paymentMethod === 'credit_card'
                    ? 'Process Payment'
                    : 'Complete Other Payment'
            )}
                      </button>
        </div>
      </div>
    </div>
  );
}

/** --------------------------------------------------------------------
 * STAFF ORDER MODAL (MAIN)
 * -------------------------------------------------------------------*/
/** Staff discount types */
type StaffDiscountType = 'on_duty' | 'off_duty' | 'no_discount';

/** Calculate the order total with any applicable discounts */
function calculateOrderTotal(
  items: any[], 
  isStaff: boolean, 
  discountType: StaffDiscountType, 
  staffId: number | null,
  discountConfigurations: StaffDiscountConfiguration[] = [],
  discountConfigurationId?: number | null
): number {
  // Calculate raw total from all cart items
  const rawTotal = items.reduce((total: number, item: any) => {
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    const itemQuantity = typeof item.quantity === 'number' ? item.quantity : 1;
    return total + (itemPrice * itemQuantity);
  }, 0);
  
  // Apply staff discount if applicable
  if (isStaff && staffId) {
    // First, try to use the discount configuration ID
    if (discountConfigurationId && discountConfigurations.length > 0) {
      const config = discountConfigurations.find(c => c.id === discountConfigurationId);
      if (config) {
        if (config.discount_type === 'percentage') {
          return rawTotal * (1 - config.discount_percentage / 100);
        } else if (config.discount_type === 'fixed_amount') {
          return Math.max(0, rawTotal - config.discount_percentage);
        }
      }
    }
    
    // Fallback to configured discount by code
    if (discountConfigurations.length > 0) {
      const config = discountConfigurations.find(c => c.code === discountType);
      if (config) {
        if (config.discount_type === 'percentage') {
          return rawTotal * (1 - config.discount_percentage / 100);
        } else if (config.discount_type === 'fixed_amount') {
          return Math.max(0, rawTotal - config.discount_percentage);
        }
      }
    }
    
    // Final fallback to hardcoded values for backward compatibility
    switch (discountType) {
      case 'on_duty':
        return rawTotal * 0.5; // 50% discount
      case 'off_duty':
        return rawTotal * 0.7; // 30% discount
      case 'no_discount':
        return rawTotal; // No discount (full price)
      default:
        return rawTotal;
    }
  }
  
  // No discount for regular orders
  return rawTotal;
}

export function StaffOrderModal({ onClose, onOrderCreated }: StaffOrderModalProps): JSX.Element {
  // Used in conditional rendering logic
  const isMobile = useIsMobile();
  // Handle mobile viewport height issues
  useVh();

  // Data & cart from store
  const { menuItems, fetchMenuItems, fetchAllMenuItemsForAdmin, fetchMenuItemsForAdmin, loading: menuLoading, currentMenuId } = useMenuStore();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    setCartQuantity,
    clearCart,
    addOrder,
    loading: orderLoading
  } = useOrderStore();
  
  // Basic Customer info - used in customer info panel
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('+1671');
  const [contactEmail, setContactEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Staff order info - used in staff order options
  const [isStaffOrder, setIsStaffOrder] = useState(false);
  const [staffMemberId, setStaffMemberId] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<StaffDiscountType>('off_duty');
  const [discountConfigurationId, setDiscountConfigurationId] = useState<number | null>(null);
  const [useHouseAccount, setUseHouseAccount] = useState(false);
  const [discountConfigurations, setDiscountConfigurations] = useState<StaffDiscountConfiguration[]>([]);
  
  // Used for tracking order creation metadata
  const [createdByStaffId, setCreatedByStaffId] = useState<number | null>(null);
  const [createdByUserId, setCreatedByUserId] = useState<number | null>(null);
  
  // Used for payment processing
  const [paymentTransactionId, setPaymentTransactionId] = useState<string>('');
  
  // Calculate pre-discount total (original price before any discounts)
  const preDiscountTotal = useMemo(() => {
    return cartItems.reduce((total: number, item: any) => {
      const itemPrice = typeof item.price === 'number' ? item.price : 0;
      const itemQuantity = typeof item.quantity === 'number' ? item.quantity : 1;
      return total + (itemPrice * itemQuantity);
    }, 0);
  }, [cartItems]);
  
  // Calculate order total based on cart items and applicable discounts
  const orderTotal = useMemo(() => {
    return calculateOrderTotal(cartItems, isStaffOrder, discountType, staffMemberId, discountConfigurations, discountConfigurationId);
  }, [cartItems, isStaffOrder, discountType, staffMemberId, discountConfigurations, discountConfigurationId]);
  
  // Payment processing state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  
  // Categories
  const [categories, setCategories] = useState<Map<number, string>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // For item customization
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  
  // Mobile tabs
  const [activeTab, setActiveTab] = useState<'menu' | 'order' | 'customer' | 'payment'>('menu');

  // Desktop "Add Customer Info" toggle
  const [showCustomerInfoDesktop, setShowCustomerInfoDesktop] = useState(false);
  
  // Payment overlay
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  
  // Store all categories from API
  const [allCategories, setAllCategories] = useState<any[]>([]);
  
  // Reference to track loaded data
  const dataLoadingState = useRef({
    menuItemsLoaded: false,
    categoriesLoaded: false,
    prefetchedCategories: new Set<number>()
  });

  // Reload menu items when currentMenuId changes
  useEffect(() => {
    if (currentMenuId && dataLoadingState.current.menuItemsLoaded) {
      // If menu ID changed and we've already loaded items, reload for the new menu
      console.debug(`[StaffOrderModal] Current menu ID changed to ${currentMenuId}, reloading menu items`);
      dataLoadingState.current.menuItemsLoaded = false; // Reset to allow reload
      
      const { restaurant } = useRestaurantStore.getState();
      if (restaurant?.id) {
        fetchMenuItemsForAdmin({
          menu_id: currentMenuId,
          include_stock: true,
          restaurant_id: restaurant.id,
          hidden: false // Only show visible items in staff order modal
        }).then(() => {
          dataLoadingState.current.menuItemsLoaded = true;
          console.debug(`[StaffOrderModal] Reloaded menu items for menu ID: ${currentMenuId}`);
        }).catch((error) => {
          console.error('Error reloading menu items:', error);
        });
      }
    }
  }, [currentMenuId, fetchMenuItemsForAdmin]);
  
  // Fetch discount configurations when staff order is enabled
  useEffect(() => {
    if (isStaffOrder) {
      fetchDiscountConfigurations();
    } else {
      // Reset when staff order is disabled
      setDiscountConfigurationId(null);
      setDiscountType('off_duty'); // Keep for legacy compatibility
    }
  }, [isStaffOrder]);

  // Initialize default discount when component mounts and staff order is enabled
  useEffect(() => {
    if (isStaffOrder && discountConfigurations.length > 0 && !discountConfigurationId) {
      const defaultConfig = discountConfigurations.find(config => config.is_default);
      if (defaultConfig) {
        setDiscountConfigurationId(defaultConfig.id);
        // Only map to legacy discount type if the config has a matching legacy code
        if (defaultConfig.code === 'on_duty') {
          setDiscountType('on_duty');
        } else if (defaultConfig.code === 'off_duty') {
          setDiscountType('off_duty');
        } else if (defaultConfig.code === 'no_discount') {
          setDiscountType('no_discount');
        }
        // For custom configurations, don't set a legacy discountType
      } else {
        // If no default is set, use the first configuration
        const firstConfig = discountConfigurations[0];
        setDiscountConfigurationId(firstConfig.id);
        // Only map to legacy discount type if the config has a matching legacy code
        if (firstConfig.code === 'on_duty') {
          setDiscountType('on_duty');
        } else if (firstConfig.code === 'off_duty') {
          setDiscountType('off_duty');
        } else if (firstConfig.code === 'no_discount') {
          setDiscountType('no_discount');
        }
        // For custom configurations, don't set a legacy discountType
      }
    }
  }, [isStaffOrder, discountConfigurations, discountConfigurationId]);

  const fetchDiscountConfigurations = async () => {
    try {
      const configs = await staffDiscountConfigurationsApi.getActiveConfigurations();
      setDiscountConfigurations(configs);
      
      // Set the default discount configuration if available
      const defaultConfig = configs.find(config => config.is_default);
      if (defaultConfig) {
        setDiscountConfigurationId(defaultConfig.id);
        // Map to the legacy discount type for backward compatibility
        if (defaultConfig.code === 'on_duty') {
          setDiscountType('on_duty');
        } else if (defaultConfig.code === 'off_duty') {
          setDiscountType('off_duty');
        } else if (defaultConfig.code === 'no_discount') {
          setDiscountType('no_discount');
        }
        // For custom configurations, don't set a legacy discountType
      } else if (configs.length > 0) {
        // If no default is set, use the first configuration
        const firstConfig = configs[0];
        setDiscountConfigurationId(firstConfig.id);
        if (firstConfig.code === 'on_duty') {
          setDiscountType('on_duty');
        } else if (firstConfig.code === 'off_duty') {
          setDiscountType('off_duty');
        } else if (firstConfig.code === 'no_discount') {
          setDiscountType('no_discount');
        }
        // For custom configurations, don't set a legacy discountType
      }
    } catch (error) {
      console.error('Error fetching discount configurations:', error);
      // Set empty array to trigger fallback to hardcoded values
      setDiscountConfigurations([]);
    }
  };

  // Fetch current user's staff member record to auto-set the createdByStaffId and createdByUserId
  useEffect(() => {
    const { user } = useAuthStore.getState();
    // Getting current user from auth store
    
    // Set the created_by_user_id from the current user
    if (user && user.id) {
      // Convert string id to number if needed
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      setCreatedByUserId(userId);
      // Setting order creator to current user
    }
    
    async function fetchCurrentUserStaffRecord() {
      if (user && user.id) {
        try {
          // Fetching staff record for current user
          // Use the updated API endpoint with user_id filter
          const response = await apiClient.get(`/staff_members`, {
            params: { user_id: user.id }
          });
          // Staff members data received
          
          let staffMemberData;
          
          // Handle different response formats
          if (response.data && response.data.staff_members && response.data.staff_members.length > 0) {
            // New format with pagination
            staffMemberData = response.data.staff_members[0];
          } else if (Array.isArray(response.data) && response.data.length > 0) {
            // Old format without pagination
            staffMemberData = response.data[0];
          }
          
          if (staffMemberData && staffMemberData.id) {
            // Found staff record for current user
            setCreatedByStaffId(staffMemberData.id);
          } else {
            // No staff record found for current user
            // Don't set a default staff ID - the system should use the authenticated user
            // This will ensure the order is properly attributed to the current user
          }
        } catch (err) {
          console.error('Error fetching current user staff record:', err);
        }
      } else {
        // No user ID available, cannot fetch staff record
      }
    }
    
    fetchCurrentUserStaffRecord();
  }, []);

  // Ensure changes to cart items update the orderTotal calculation
  useEffect(() => {
    if (cartItems.length > 0) {
      // The orderTotal is already calculated via useMemo, so this is just a hook for side effects
      // We could update other state here if needed based on cart changes
    }
  }, [cartItems, isStaffOrder, discountType, staffMemberId]);
  
  // On mount, fetch menu items with optimized loading
  useEffect(() => {
    const { restaurant } = useRestaurantStore.getState();
    
    // Optimized menu items loading with tenant validation
    const loadMenuItems = async () => {
      // Skip if already loaded (prevents duplicate loading)
      if (dataLoadingState.current.menuItemsLoaded) {
        console.debug('[StaffOrderModal] Menu items already loaded, skipping fetch');
        return;
      }
      
      // Validate restaurant context
      if (!restaurant || !restaurant.id) {
        console.error('[StaffOrderModal] Restaurant context missing, cannot fetch menu items');
        return;
      }

      try {
        console.debug('[StaffOrderModal] Loading menu items for current menu with admin privileges');
        
        // Get the current menu ID
        const menuStore = useMenuStore.getState();
        const activeMenuId = currentMenuId || menuStore.currentMenuId;
        
        if (activeMenuId) {
          // Load menu items for the specific current menu only
          await fetchMenuItemsForAdmin({
            menu_id: activeMenuId,
            include_stock: true,
            restaurant_id: restaurant.id,
            hidden: false // Only show visible items in staff order modal
          });
          console.debug(`[StaffOrderModal] Loaded menu items for menu ID: ${activeMenuId}`);
        } else {
          console.warn('[StaffOrderModal] No current menu ID available, loading all menu items as fallback');
          // Fallback: if no current menu ID, load all items but this shouldn't normally happen
          await fetchAllMenuItemsForAdmin();
        }
        
        dataLoadingState.current.menuItemsLoaded = true;
      } catch (error) {
        console.error('Error fetching menu items:', error);
      }
    };
    
    loadMenuItems();
    
    return () => {
      clearCart();
      // Reset loading state on unmount
      dataLoadingState.current = {
        menuItemsLoaded: false,
        categoriesLoaded: false,
        prefetchedCategories: new Set<number>()
      };
    };
  }, [fetchAllMenuItemsForAdmin, fetchMenuItemsForAdmin, clearCart, currentMenuId]);

  // Load all categories once menuItems is present with tenant validation
  useEffect(() => {
    async function fetchCats() {
      // Skip if categories already loaded (prevents duplicate loading)
      if (dataLoadingState.current.categoriesLoaded) {
        console.debug('[StaffOrderModal] Categories already loaded, skipping fetch');
        return;
      }
      
      const { restaurant } = useRestaurantStore.getState();
      
      // Validate restaurant context
      if (!restaurant || !restaurant.id) {
        console.error('[StaffOrderModal] Restaurant context missing, cannot fetch categories');
        return;
      }
      
      try {
        console.debug('[StaffOrderModal] Loading categories');
        
        // Get the current menu ID to filter categories
        const menuStore = useMenuStore.getState();
        const activeMenuId = currentMenuId || menuStore.currentMenuId;
        
        // Fetching categories with proper tenant isolation and menu filtering
        const params: any = { restaurant_id: restaurant.id };
        if (activeMenuId) {
          params.menu_id = activeMenuId;
          console.debug(`[StaffOrderModal] Loading categories for menu ID: ${activeMenuId}`);
        }
        
        const res = await apiClient.get('/categories', { params });
        
        // Store all categories in state
        setAllCategories(res.data);
        dataLoadingState.current.categoriesLoaded = true;
        
        // We don't need to prefetch category items here anymore
        // App-level prefetching in OnlineOrderingApp handles this
        // This prevents duplicate data loading
      } catch (error) {
        console.error('Error fetching categories:', error);
        setAllCategories([]);
      }
    }
    
    if (menuItems.length > 0) {
      fetchCats();
    }
  }, [menuItems]);
  
  // Filter categories by current menu ID using useMemo
  const filteredCategories = useMemo(() => {
    // Filtering categories by current menu
    
    // Get the active menu ID from the menuStore if currentMenuId is null
    const menuStore = useMenuStore.getState();
    const activeMenuId = currentMenuId || menuStore.currentMenuId;
    // Using active menu ID for category filtering
    
    const catMap = new Map<number, string>();
    
    if (activeMenuId && allCategories.length > 0) {
      // Filter categories by active menu ID and sort by position
      const filteredCats = allCategories
        .filter((c: any) => Number(c.menu_id) === Number(activeMenuId))
        .sort((a: any, b: any) => {
          // Sort by position if available, otherwise fallback to id
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          return a.id - b.id;
        });
      
      // Add sorted categories to the map
      filteredCats.forEach((c: any) => {
        catMap.set(c.id, c.name);
      });
    } else if (allCategories.length > 0) {
      // Fallback: if no activeMenuId but we have categories, use menu item categories as fallback
      // No active menu ID, using fallback from menu items
      menuItems.forEach(item => {
        if (item.category_ids) {
          item.category_ids.forEach(catId => {
            // Try to find the category name in allCategories
            const category = allCategories.find(c => c.id === catId);
            if (category) {
              catMap.set(catId, category.name);
            } else if (!catMap.has(catId)) {
              catMap.set(catId, `Category ${catId}`);
            }
          });
        }
      });
    }
    
    // Category mapping completed
    
    return catMap;
  }, [allCategories, currentMenuId, menuItems]);
  
  // Update categories state when filteredCategories changes
  useEffect(() => {
    setCategories(filteredCategories);
  }, [filteredCategories]);

  // Restaurant store
  
  // Helper function to generate consistent key for cart items
  const getItemKey = useCallback((item: any) => {
    return item.id || item.key || JSON.stringify(item);
  }, []);
  
  // Create category map from allCategories for passing to child components
  const categoriesMap = useMemo(() => {
    const map = new Map<number, string>();
    allCategories.forEach((category: any) => {
      if (category.id) {
        map.set(category.id, category.name || '');
      }
    });
    return map;
  }, [allCategories]);
  
  function findCartItem(id: string) {
    // direct match or fallback to composite key
    let item = cartItems.find(c => c.id === id);
    if (!item) {
      const itemKey = getItemKey({ id });
      item = cartItems.find(c => getItemKey(c) === itemKey);
    }
    return item || null;
  }

  /** Add normal or customized items */
  function handleAddItem(item: MenuItem) {
    // Check manually set stock status first
    if (item.stock_status === 'out_of_stock') {
      toastUtils.error(`${item.name} is out of stock.`);
      return;
    }
    
    // Then check inventory tracking
    if (item.enable_stock_tracking && item.available_quantity !== undefined) {
      const cartItem = findCartItem(item.id);
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const effectiveQuantity = item.available_quantity - cartQuantity;
      if (effectiveQuantity <= 0) {
        toastUtils.error(`${item.name} is out of stock.`);
        return;
      }
    }
    
    // FE-014: Check option availability if item has options
    if (item.option_groups?.length) {
      // Check if any required option groups have no available options
      const requiredGroupsWithoutAvailableOptions = item.option_groups.filter(group => 
        group.min_select > 0 && !hasAvailableOptions(group)
      );
      
      if (requiredGroupsWithoutAvailableOptions.length > 0) {
        const groupNames = requiredGroupsWithoutAvailableOptions.map(g => g.name).join(', ');
        toastUtils.error(`${item.name} cannot be ordered. Required options are out of stock: ${groupNames}`);
        return;
      }
      
      // Open customization modal (option availability will be checked there too)
      setCustomizingItem(item);
    } else {
      addToCart({ ...item, type: 'food' }, 1);
    }
  }

  function handleAddCustomizedItem(item: MenuItem, custom: any[], qty: number) {
    // Check manually set stock status first
    if (item.stock_status === 'out_of_stock') {
      toastUtils.error(`${item.name} is out of stock.`);
      setCustomizingItem(null);
      return;
    }
    
    // Then check inventory tracking
    if (item.enable_stock_tracking && item.available_quantity !== undefined) {
      const cartItem = findCartItem(item.id);
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const effectiveQuantity = item.available_quantity - cartQuantity;
      if (effectiveQuantity <= 0) {
        toastUtils.error(`${item.name} is out of stock.`);
        setCustomizingItem(null);
        return;
      }
      if (qty > effectiveQuantity) {
        toastUtils.error(`Cannot add ${qty} more ${item.name}. Only ${effectiveQuantity} available.`);
        setCustomizingItem(null);
        return;
      }
    }
    
    // FE-014: Validate selected option availability
    if (custom && custom.length > 0) {
      const unavailableOptions: string[] = [];
      
      for (const customization of custom) {
        // Find the option in the item's option groups
        const optionGroup = item.option_groups?.find(group => group.id === customization.option_group_id);
        const option = optionGroup?.options.find(opt => opt.id === customization.option_id);
        
        if (option && !isOptionAvailable(option, qty, optionGroup)) {
          const availableQty = getOptionAvailableQuantity(option, optionGroup);
          if (availableQty === 0) {
            unavailableOptions.push(`${customization.option_name} (out of stock)`);
          } else {
            unavailableOptions.push(`${customization.option_name} (only ${availableQty} available, requested ${qty})`);
          }
        }
      }
      
      if (unavailableOptions.length > 0) {
        toastUtils.error(`Cannot add ${item.name}. Selected options are unavailable: ${unavailableOptions.join(', ')}`);
        setCustomizingItem(null);
        return;
      }
    }
    
    // Important: Use the price that was already calculated in the ItemCustomizationModal
    // The item passed from ItemCustomizationModal already has the updated price
    const finalPrice = item.price;
    
    // The customizations from ItemCustomizationModal are already in the correct format
    // and the price has been properly calculated
    
    // Debug log to help troubleshoot price calculations
    // Adding customized item to cart
    // console.log('Adding customized item to cart:', {
    //   itemName: item.name,
    //   finalPrice: finalPrice,
    //   quantity: qty,
    //   customizations: item.customizations
    // });
    
    // Add to cart with the price and customizations already set in ItemCustomizationModal
    addToCart({
      id: item.id,
      name: item.name,
      price: finalPrice,
      type: 'food',
      image: item.image,
      customizations: item.customizations || custom // Use item.customizations if available, otherwise use custom
    }, qty);
    
    setCustomizingItem(null);
  }

  /** Payment success for non-staff path */
  function handlePaymentSuccess(details: {
    status: string;
    transaction_id: string;
    payment_id?: string;
    amount: string;
    currency?: string;
    payment_method?: string;
    payment_intent_id?: string;
    payment_details?: any;
  }) {
    // Store transaction ID for order submission
    setPaymentProcessing(false);
    setPaymentTransactionId(details.transaction_id);
    
    // Get the payment processor from restaurant settings
    const restaurant = useRestaurantStore.getState().restaurant;
    const paymentGateway = restaurant?.admin_settings?.payment_gateway || {};
    const currentPaymentProcessor = paymentGateway.payment_processor || 'paypal';
    
    // Determine the actual payment method based on the processor
    let actualPaymentMethod = 'credit_card';
    if (currentPaymentProcessor === 'stripe') {
      actualPaymentMethod = 'stripe';
    } else if (currentPaymentProcessor === 'paypal') {
      actualPaymentMethod = 'paypal';
    }
    
    // If payment details are already provided, use them
    let paymentDetails = details.payment_details;
    
    // If not, create comprehensive payment details
    if (!paymentDetails) {
      paymentDetails = {
        status: details.status || 'succeeded',
        payment_method: details.payment_method || actualPaymentMethod,
        transaction_id: details.transaction_id,
        payment_date: new Date().toISOString().split('T')[0],
        payment_intent_id: details.payment_intent_id || details.transaction_id,
        processor: currentPaymentProcessor,
        notes: `Payment processed via ${currentPaymentProcessor === 'stripe' ? 'Stripe' : 'PayPal'}`
      };
    }
    
    // For cash payments, add cash-specific details
    if (actualPaymentMethod === 'cash' && details.payment_details) {
      paymentDetails.cash_received = details.payment_details.cash_received;
      paymentDetails.change_due = details.payment_details.change_due;
    }
    
    submitOrderWithPayment(
      details.transaction_id,
      paymentDetails,
      paymentDetails.payment_method || actualPaymentMethod
    );
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment failed:', error);
    toastUtils.error(`Payment failed: ${error.message}`);
    setPaymentProcessing(false);
  };

  async function submitOrderWithPayment(transactionId?: string, paymentDetails?: any, paymentMethod?: string) {
    // Use transaction ID from state if not provided
    const finalTransactionId = transactionId || paymentTransactionId;
    // Order loading state is managed by the store

    // Phone validation - only validate if phone is provided
    const phoneRegex = /^\+\d{3,4}\d{7}$/;
    if (contactPhone && contactPhone.trim() !== '+1671' && !phoneRegex.test(contactPhone)) {
      toastUtils.error('Phone must be + (3 or 4 digit area code) + 7 digits');
      return;
    }
    
    // Validate staff order parameters if it's a staff order
    if (isStaffOrder && !staffMemberId) {
      toastUtils.error('Please select a staff member for this staff order');
      return;
    }
    
    try {
      // Prepare staff order parameters
      // Preparing staff order parameters
      
      // Use the current user's staff ID as the creator
      const finalCreatedByStaffId = createdByStaffId;
      if (!finalCreatedByStaffId) {
        // No staff ID found for current user
      } else {
        // Using staff ID for order attribution
      }
      
      // Always include created_by_staff_id and created_by_user_id regardless of whether it's a staff order or not
      const staffOrderParams = isStaffOrder ? {
        is_staff_order: true,
        staff_member_id: staffMemberId,
        use_house_account: useHouseAccount,
        created_by_staff_id: finalCreatedByStaffId,
        created_by_user_id: createdByUserId,
        pre_discount_total: preDiscountTotal,
        // If we have a custom discount configuration, use that and omit legacy fields
        ...(discountConfigurationId ? {
        staff_discount_configuration_id: discountConfigurationId
        } : {
          // Only use legacy fields when no custom configuration is selected
          staff_on_duty: discountType === 'on_duty',
          discount_type: discountType,
          no_discount: discountType === 'no_discount'
        })
      } : {
        created_by_staff_id: finalCreatedByStaffId, // Track creator even for customer orders
        created_by_user_id: createdByUserId // Always track the user who created the order
      };
      
      // Staff order parameters prepared
      
      // Include staffOrderParams in the paymentDetails object to work around TypeScript interface limitations
      const enhancedPaymentDetails = {
        ...paymentDetails,
        staffOrderParams: staffOrderParams
      };
      
      // Use contactPhone directly since we already validated it
      const newOrder = await addOrder(
        cartItems,
        orderTotal,
        specialInstructions || '',
        contactName || '',
        contactPhone || '',
        contactEmail || '',
        finalTransactionId || '',
        paymentMethod || '',
        '', // vipCode parameter
        true, // Add staff_modal parameter to indicate this is a staff-created order
        enhancedPaymentDetails // Combined payment details and staff order params
      );
      
      // Create an OrderPayment record for manual payment methods that need it
      // Note: The backend already creates an initial OrderPayment record during order creation
      // We only need to create additional records for cash payments which use a different endpoint
      const method = paymentMethod || '';
      if (method === 'cash') {
        try {
          // Use the cash-specific endpoint for cash payments
          await apiClient.post(`/orders/${newOrder.id}/payments/cash`, {
            order_total: orderTotal,
            cash_received: paymentDetails?.cash_received || orderTotal,
            payment_method: 'cash',
            transaction_id: paymentTransactionId || ''
          });
          // Cash payment record created
        } catch (paymentErr) {
          // Just log the error but don't fail the order creation
          console.error('Failed to create cash payment record:', paymentErr);
        }
      }
      // For other payment methods (other, clover, revel, house_account, etc.), 
      // the backend already creates the OrderPayment record during order creation
      
      toastUtils.success('Order created successfully!');
      onOrderCreated(newOrder.id);
    } catch (err: any) {
      console.error('Error creating order:', err);
      // Stock or generic error
      if (err.response?.data?.error?.includes('stock') || err.response?.data?.error?.includes('inventory')) {
        toastUtils.error('Some items are no longer available.');
        fetchMenuItems();
      } else {
        toastUtils.error('Failed to create order. Please try again.');
      }
    }
  }

  /** Handle order submission */
  async function handleSubmitOrder() {
    if (!cartItems.length) {
      toastUtils.error('Please add items to the order');
      return;
    }
    
    // Make phone validation optional - only validate if phone is provided
    const finalPhone = contactPhone.trim() === '+1671' ? '' : contactPhone.trim();
    if (finalPhone && !isValidPhone(finalPhone)) {
      toastUtils.error('Phone must be + (3 or 4 digit area code) + 7 digits');
      return;
    }
    
    // Validate staff order parameters if it's a staff order
    if (isStaffOrder && !staffMemberId) {
      toastUtils.error('Please select a staff member for this staff order');
      return;
    }
    
    // If this is a staff order using house account, bypass payment panel
    if (isStaffOrder && useHouseAccount && staffMemberId) {
      // Process house account payment directly
      setPaymentProcessing(true);
      try {
        // Generate a unique transaction ID for house account
        const houseAccountTransactionId = `house_account_${Date.now()}_${staffMemberId}`;
        
        // Submit order with house account payment method
        await submitOrderWithPayment(houseAccountTransactionId, {}, 'house_account');
      } catch (error) {
        console.error('Error processing house account payment:', error);
        toastUtils.error('Failed to process house account payment. Please try again.');
      } finally {
        setPaymentProcessing(false);
      }
    } else {
      // Show payment overlay or go to payment tab on mobile for regular payment flow
      if (isMobile) {
        setActiveTab('payment');
      } else {
        setShowPaymentPanel(true);
      }
    }
  }

  // MOBILE Layout
  function renderMobileLayout(): JSX.Element {
    // Calculate cart quantity for badge
    const cartItemCount = cartItems.reduce((total: number, item: any) => total + (item.quantity || 1), 0);
    
    // Handle tab switching
    const handleTabChange = (tab: 'menu' | 'order' | 'customer' | 'payment') => {
      setActiveTab(tab);
    };
    
    return (
      <div className="flex flex-col h-full w-full">
        {/* Mobile Header with Close Button */}
        <div className="sticky top-0 z-10 bg-white shadow-sm px-4 py-3 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Create Order</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none rounded-full hover:bg-gray-100 p-1.5 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Main Content Area with padding at bottom to ensure content isn't covered by fixed nav */}
        <div className="flex-1 overflow-y-auto pb-24 h-full" aria-label="Main content">
          {activeTab === 'menu' && (
            <MenuItemsPanel
              menuItems={menuItems}
              menuLoading={menuLoading}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              findCartItem={findCartItem}
              handleAddItem={handleAddItem}
              setCustomizingItem={setCustomizingItem}
              setCartQuantity={setCartQuantity}
              removeFromCart={removeFromCart}
              getItemKey={getItemKey}
            />
          )}
          
          {activeTab === 'order' && (
            <OrderPanel
              cartItems={cartItems}
              findCartItem={findCartItem}
              setCartQuantity={setCartQuantity}
              removeFromCart={removeFromCart}
              handleSubmitOrder={handleSubmitOrder}
              orderTotal={orderTotal}
              orderLoading={orderLoading}
              onClose={onClose}
              menuItems={menuItems}
              setCustomizingItem={setCustomizingItem}
              isStaffOrder={isStaffOrder}
              setIsStaffOrder={setIsStaffOrder}
              staffMemberId={staffMemberId}
              setStaffMemberId={setStaffMemberId}
              discountType={discountType}
              setDiscountType={setDiscountType}
              useHouseAccount={useHouseAccount}
              setUseHouseAccount={setUseHouseAccount}
              createdByStaffId={createdByStaffId}
              setCreatedByStaffId={setCreatedByStaffId}
              preDiscountTotal={preDiscountTotal}
              discountConfigurationId={discountConfigurationId}
              setDiscountConfigurationId={setDiscountConfigurationId}
              discountConfigurations={discountConfigurations}
            />
          )}
          
          {activeTab === 'customer' && (
            <div className="h-full overflow-hidden">
              <CustomerInfoPanel
                contactName={contactName}
                setContactName={setContactName}
                contactPhone={contactPhone}
                setContactPhone={setContactPhone}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                specialInstructions={specialInstructions}
                setSpecialInstructions={setSpecialInstructions}
                onBack={() => handleTabChange('order')}
              />
            </div>
          )}
          
          {activeTab === 'payment' && (
            <PaymentPanel
              orderTotal={orderTotal}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onBack={() => handleTabChange('customer')}
              isProcessing={paymentProcessing}
            />
          )}
        </div>

        {/* Sticky Footer Tab Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 shadow-lg" aria-label="Mobile navigation">
          {/* Conditional Action Button - only shown in order tab with items */}
          {/* Always show the total area but only enable button when there are items */}
          <div className="p-3 flex justify-between items-center border-b border-gray-200">
            <div>
              <div className="text-sm text-gray-600">Total:</div>
              <div className="text-lg font-bold text-[#c1902f]">${orderTotal.toFixed(2)}</div>
            </div>
            {activeTab === 'order' && cartItems.length > 0 && (
              <button
                onClick={() => handleTabChange('customer')}
                className="bg-[#c1902f] hover:bg-[#a97c28] text-white py-2 px-5 rounded-md font-medium transition-colors"
              >
                Continue
              </button>
            )}
          </div>

          {/* Tab Navigation - Four tab design with custom SVG icons to prevent text leakage */}
          <nav className="flex justify-between items-center py-1 px-2" aria-label="Primary mobile navigation">
            <button
              onClick={() => handleTabChange('menu')}
              className={`flex flex-col items-center justify-center py-2 px-1 w-1/4 relative ${activeTab === 'menu' ? 'text-[#c1902f] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'menu' ? 'page' : undefined}
            >
              <div className="h-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h18v18H3z"></path>
                  <path d="M9 8h10"></path>
                  <path d="M9 12h10"></path>
                  <path d="M9 16h10"></path>
                  <path d="M5 8v.01"></path>
                  <path d="M5 12v.01"></path>
                  <path d="M5 16v.01"></path>
                </svg>
              </div>
              <span className="text-xs mt-1 whitespace-nowrap text-center">Menu</span>
              {activeTab === 'menu' && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#c1902f]"></span>}
            </button>
            
            <button
              onClick={() => handleTabChange('order')}
              className={`flex flex-col items-center justify-center py-2 px-1 w-1/4 relative ${activeTab === 'order' ? 'text-[#c1902f] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'order' ? 'page' : undefined}
            >
              <div className="h-6 flex items-center justify-center relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-3 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[#c1902f] rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 whitespace-nowrap text-center">Order</span>
              {activeTab === 'order' && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#c1902f]"></span>}
            </button>
            
            <button
              onClick={() => handleTabChange('customer')}
              className={`flex flex-col items-center justify-center py-2 px-1 w-1/4 relative ${activeTab === 'customer' ? 'text-[#c1902f] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'customer' ? 'page' : undefined}
            >
              <div className="h-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span className="text-xs mt-1 whitespace-nowrap text-center">Customer</span>
              {activeTab === 'customer' && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#c1902f]"></span>}
            </button>
            
            <button
              onClick={() => handleTabChange('payment')}
              className={`flex flex-col items-center justify-center py-2 px-1 w-1/4 relative ${activeTab === 'payment' ? 'text-[#c1902f] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'payment' ? 'page' : undefined}
            >
              <div className="h-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <span className="text-xs mt-1 whitespace-nowrap text-center">Payment</span>
              {activeTab === 'payment' && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#c1902f]"></span>}
            </button>
          </nav>
        </div>
      </div>
    );
  }

  // DESKTOP / TABLET Layout
  function renderDesktopLayout(): JSX.Element {
    if (showPaymentPanel) {
      // Payment overlay with higher z-index
      return (
        <div className="flex-1 flex overflow-hidden h-full relative">
          {/* Dimmed background with higher z-index to cover the entire modal */}
          <div className="fixed inset-0 bg-black bg-opacity-70 z-[60]"></div>
          
          {/* Payment Panel on top with even higher z-index */}
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 overflow-y-auto">
            <div 
              className="bg-white rounded-lg shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl 
                        my-auto mx-auto max-h-[calc(100vh-40px)] overflow-hidden flex flex-col"
            >
              {/* Payment panel header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-xl font-semibold text-gray-800">Payment</h2>
                <button
                  onClick={() => setShowPaymentPanel(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none rounded-full hover:bg-gray-100 p-1.5 transition-colors"
                  aria-label="Close payment panel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col">
                <PaymentPanel
                  orderTotal={orderTotal}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  onBack={() => setShowPaymentPanel(false)}
                  isProcessing={paymentProcessing}
                />
              </div>
            </div>
          </div>

          {/* Main layout behind overlay */}
          <div className="flex-1 flex overflow-hidden h-full">
            {/* Left column: Menu Items */}
            <div className="w-2/3 flex flex-col border-r border-gray-200 overflow-hidden">
              <MenuItemsPanel
                menuItems={menuItems}
                menuLoading={menuLoading}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                findCartItem={findCartItem}
                handleAddItem={handleAddItem}
                setCustomizingItem={setCustomizingItem}
                setCartQuantity={setCartQuantity}
                removeFromCart={removeFromCart}
                getItemKey={getItemKey}
              />
            </div>

            {/* Right column: Order + optional Customer Info */}
            <div className="w-1/3 flex flex-col relative overflow-hidden">
              <OrderPanel
                cartItems={cartItems}
                findCartItem={findCartItem}
                setCartQuantity={setCartQuantity}
                removeFromCart={removeFromCart}
                handleSubmitOrder={handleSubmitOrder}
                orderTotal={orderTotal}
                orderLoading={orderLoading}
                onClose={onClose}
                menuItems={menuItems}
                setCustomizingItem={setCustomizingItem}
                isStaffOrder={isStaffOrder}
                setIsStaffOrder={setIsStaffOrder}
                staffMemberId={staffMemberId}
                setStaffMemberId={setStaffMemberId}
                discountType={discountType}
                setDiscountType={setDiscountType}
                useHouseAccount={useHouseAccount}
                setUseHouseAccount={setUseHouseAccount}
                createdByStaffId={createdByStaffId}
                setCreatedByStaffId={setCreatedByStaffId}
                preDiscountTotal={preDiscountTotal}
                discountConfigurationId={discountConfigurationId}
                setDiscountConfigurationId={setDiscountConfigurationId}
                discountConfigurations={discountConfigurations}
              />
              <div className={`absolute ${isStaffOrder ? 'bottom-[190px]' : 'bottom-[150px]'} left-0 right-0 px-4`}>
                {!showCustomerInfoDesktop ? (
                  <button
                    onClick={() => setShowCustomerInfoDesktop(true)}
                    className="w-full py-2.5 text-sm font-medium bg-gray-50 border border-gray-300
                      hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                  >
                    Add Customer Info
                  </button>
                ) : (
                  <div className="mt-4 border border-gray-200 rounded-md shadow-sm bg-gray-50 max-h-[300px] md:max-h-[350px] overflow-hidden">
                    <CustomerInfoPanel
                      contactName={contactName}
                      setContactName={setContactName}
                      contactPhone={contactPhone}
                      setContactPhone={setContactPhone}
                      contactEmail={contactEmail}
                      setContactEmail={setContactEmail}
                      specialInstructions={specialInstructions}
                      setSpecialInstructions={setSpecialInstructions}
                      onBack={() => setShowCustomerInfoDesktop(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Normal desktop layout
    return (
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Left: Menu Items */}
        <div className="w-2/3 flex flex-col border-r border-gray-200 overflow-hidden">
          <MenuItemsPanel
            menuItems={menuItems}
            menuLoading={menuLoading}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            findCartItem={findCartItem}
            handleAddItem={handleAddItem}
            setCustomizingItem={setCustomizingItem}
            setCartQuantity={setCartQuantity}
            removeFromCart={removeFromCart}
            getItemKey={getItemKey}
          />
        </div>

        {/* Right: Order + optional Customer Info */}
        <div className="w-1/3 flex flex-col relative overflow-hidden">
          <OrderPanel
            cartItems={cartItems}
            findCartItem={findCartItem}
            setCartQuantity={setCartQuantity}
            removeFromCart={removeFromCart}
            handleSubmitOrder={handleSubmitOrder}
            orderTotal={orderTotal}
            orderLoading={orderLoading}
            onClose={onClose}
            menuItems={menuItems}
            setCustomizingItem={setCustomizingItem}
            isStaffOrder={isStaffOrder}
            setIsStaffOrder={setIsStaffOrder}
            staffMemberId={staffMemberId}
            setStaffMemberId={setStaffMemberId}
            discountType={discountType}
            setDiscountType={setDiscountType}
            useHouseAccount={useHouseAccount}
            setUseHouseAccount={setUseHouseAccount}
            createdByStaffId={createdByStaffId}
            setCreatedByStaffId={setCreatedByStaffId}
            preDiscountTotal={preDiscountTotal}
            discountConfigurationId={discountConfigurationId}
            setDiscountConfigurationId={setDiscountConfigurationId}
            discountConfigurations={discountConfigurations}
          />
          {/* Fixed position Add Customer Info button or Customer Info panel - only shown for non-staff orders */}
          {!isStaffOrder && (
            <div className="absolute bottom-[140px] left-0 right-0 px-4 z-10">
              {!showCustomerInfoDesktop ? (
                <button
                  onClick={() => setShowCustomerInfoDesktop(true)}
                  className="w-full py-2.5 text-sm font-medium bg-gray-50 border border-gray-300
                    hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                >
                  Add Customer Info
                </button>
              ) : (
                <div>
                  <div className="border border-gray-200 rounded-md shadow-sm bg-gray-50 max-h-[450px] overflow-auto mb-4">
                    <div className="px-4 py-4 pb-4 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 sticky top-0 bg-gray-50 z-10 py-2">Customer Information</h3>
                      
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={e => setContactName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                                  focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
                          placeholder="Customer name"
                        />
                      </div>
                      
                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                                  focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
                          placeholder="+1671"
                        />
                      </div>
                      
                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                                  focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
                          placeholder="Email address"
                        />
                      </div>
                      
                      {/* Special Instructions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Special Instructions
                        </label>
                        <textarea
                          value={specialInstructions}
                          onChange={e => setSpecialInstructions(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                                  focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
                          placeholder="Special instructions or notes"
                          rows={4}
                        />
                      </div>

                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowCustomerInfoDesktop(false)}
                    className="w-full py-2.5 text-sm font-medium bg-gray-50 border border-gray-300
                      hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                  >
                    Back to Order
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /** RENDER */
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4">
      <div
        className={`bg-white ${!isMobile ? 'rounded-lg' : ''} shadow-xl w-full ${isMobile ? 'h-[100vh]' : 'h-[90vh] md:h-[80vh]'} ${!isMobile ? 'md:w-[80vw] lg:w-[1024px]' : ''} md:mx-auto overflow-hidden flex flex-col`}
      >
        {/* Header shown only in desktop mode or on mobile when not in the main render */}
        {!isMobile && (
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800">
              Create Order
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none
                        rounded-full hover:bg-gray-100 p-1 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Use conditional rendering for layout */}
        {isMobile ? renderMobileLayout() : renderDesktopLayout()}
      </div>

      {/* Customization modal (shown if user is customizing an item) */}
      {customizingItem && (
        <ItemCustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={handleAddCustomizedItem}
          cartItems={cartItems}
        />
      )}
    </div>
  );
}
