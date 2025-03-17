// src/ordering/components/admin/StaffOrderModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useMenuStore } from '../../store/menuStore';
import { useOrderStore } from '../../store/orderStore';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { MenuItem } from '../../types/menu';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { apiClient } from '../../../shared/api/apiClient';
import { StripeCheckout, StripeCheckoutRef } from '../../components/payment/StripeCheckout';
import { PayPalCheckout, PayPalCheckoutRef } from '../../components/payment/PayPalCheckout';
import toast from 'react-hot-toast';

/**
 * Validate phone e.g. +16711234567 or +17025551234
 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

/**
 * Hook that returns true if width < 768px
 */
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

/** --------------------------------------------------------------------
 * MenuItemsPanel: Renders the search, categories, and item cards
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
  // Filter items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === 'all' ||
      (item.category_ids && item.category_ids.includes(Number(selectedCategory)));
    return matchesSearch && matchesCat;
  });

  // Group items
  function groupedMenuItems() {
    if (selectedCategory !== 'all') {
      return {
        [selectedCategory.toString()]: filteredMenuItems.filter(item =>
          item.category_ids?.includes(Number(selectedCategory))
        ),
      };
    }
    const grouped: Record<string, MenuItem[]> = { uncategorized: [] };
    filteredMenuItems.forEach(item => {
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
        <div className="flex items-center mt-3 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium
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
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium
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
          <div className="text-center py-8 text-gray-500">
            No menu items found matching your search.
          </div>
        ) : (
          Object.entries(groupedMenuItems()).map(([catId, items]) => (
            <div key={catId} className="mb-6">
              <h3 className="font-medium text-lg mb-3 pb-1 border-b border-gray-100">
                {categories.get(Number(catId)) ||
                  (catId === 'uncategorized' ? 'Uncategorized' : `Category ${catId}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                  const cartItem = findCartItem(item.id);
                  const isInCart = !!cartItem;
                  const hasOptions = item.option_groups && item.option_groups.length > 0;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg hover:shadow-md transition-shadow
                        ${isInCart
                          ? 'border-[#c1902f] bg-yellow-50 shadow'
                          : 'border-gray-200'
                        }`}
                    >
                      <div className="flex h-full w-full">
                        {/* Image */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden rounded-l-lg">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                            }}
                          />
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
                          <div className="flex flex-col mb-1">
                            {/* Title with better visibility */}
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">
                              {item.name}
                            </h4>
                            
                            {/* Price below title */}
                            <p className="text-[#c1902f] font-semibold text-sm sm:text-base mt-1">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                          
                          {/* Stock indicator - only show if stock tracking is enabled */}
                          {item.enable_stock_tracking && item.available_quantity !== undefined && (
                            <p className="text-xs text-gray-500 mt-0.5 mb-1">
                              {(() => {
                                // Calculate effective available quantity by subtracting cart quantity
                                const cartItem = findCartItem(item.id);
                                const cartQuantity = cartItem ? cartItem.quantity : 0;
                                const effectiveQuantity = item.available_quantity - cartQuantity;
                                
                                return effectiveQuantity > 0 
                                  ? `${effectiveQuantity} left` 
                                  : 'Out of stock';
                              })()}
                            </p>
                          )}

                          {/* Add / Customize Buttons */}
                          <div className="flex justify-end mt-2">
                            {/* Check if item is out of stock */}
                            {item.enable_stock_tracking && item.available_quantity !== undefined && (() => {
                              // Calculate effective available quantity by subtracting cart quantity
                              const cartItem = findCartItem(item.id);
                              const cartQuantity = cartItem ? cartItem.quantity : 0;
                              const effectiveQuantity = item.available_quantity - cartQuantity;
                              return effectiveQuantity <= 0;
                            })() ? (
                              // Out of stock button
                              <button
                                disabled
                                className="bg-gray-300 text-gray-500 px-3 py-1 rounded text-sm font-medium cursor-not-allowed"
                              >
                                Out of Stock
                              </button>
                            ) : isInCart && !hasOptions ? (
                              // Show +/- if in cart and has no options
                              <div className="flex items-center">
                                <button
                                  onClick={() => {
                                    const itemKey = getItemKey(item);
                                    console.log('Minus button clicked, itemKey:', itemKey);
                                    if (cartItem.quantity > 1) {
                                      setCartQuantity(itemKey, cartItem.quantity - 1);
                                    } else {
                                      removeFromCart(itemKey);
                                    }
                                  }}
                                  className="text-gray-600 hover:text-[#c1902f] p-1"
                                  aria-label="Decrease quantity"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
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
                                <button
                                  onClick={() => {
                                    const itemKey = getItemKey(item);
                                    console.log('Plus button clicked, itemKey:', itemKey);
                                    setCartQuantity(itemKey, cartItem.quantity + 1);
                                  }}
                                  // Disable plus button if we've reached the effective available quantity
                                  disabled={(() => {
                                    if (item.enable_stock_tracking && item.available_quantity !== undefined) {
                                      // Calculate effective available quantity
                                      const effectiveQuantity = item.available_quantity - cartItem.quantity;
                                      return effectiveQuantity <= 0;
                                    }
                                    return false;
                                  })()}
                                  className={`text-gray-600 hover:text-[#c1902f] p-1 ${
                                    (() => {
                                      if (item.enable_stock_tracking && item.available_quantity !== undefined) {
                                        // Calculate effective available quantity
                                        const effectiveQuantity = item.available_quantity - cartItem.quantity;
                                        return effectiveQuantity <= 0 ? 'opacity-50 cursor-not-allowed' : '';
                                      }
                                      return '';
                                    })()
                                  }`}
                                  aria-label="Increase quantity"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 5a1 1 0
                                      011 1v3h3a1 1 0
                                      110 2h-3v3a1 1 0
                                      11-2
                                      0v-3H6a1 1 0
                                      110-2h3V6a1 1 0
                                      011-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ) : hasOptions ? (
                              <button
                                onClick={() => setCustomizingItem(item)}
                                className="bg-[#c1902f] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#a97c28]"
                              >
                                {isInCart ? 'Add Another' : 'Customize'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddItem(item)}
                                className="text-[#c1902f] hover:bg-[#c1902f] hover:text-white px-2 py-1 rounded text-sm font-medium"
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
 * OrderPanel: Renders cart items, total, "Create Order"
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
  setCustomizingItem
}: OrderPanelProps) {
  // Use the store's getItemKey function for consistency
  const getItemKey = useOrderStore(state => state._getItemKey);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable cart section */}
      <div className="overflow-y-auto flex-1 p-4 pb-[150px]">
        <h3 className="text-lg font-semibold mb-4">Current Order</h3>
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
                      </span>
                      <button
                        onClick={() => {
                          console.log('X button clicked, itemKey:', itemKey);
                          removeFromCart(itemKey);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1 focus:outline-none"
                        aria-label="Remove item"
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

                  {/* If custom, show them */}
                  {item.customizations && (
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {Array.isArray(item.customizations) ? (
                        // Handle array-based customizations (option_id and option_group_id)
                        item.customizations.map((custom: { option_group_id: number; option_id: number }, idx: number) => {
                          // Try to find the option group and option names if available
                          const menuItem = menuItems.find(m => m.id === item.id);
                          let optionGroupName = `Group ${custom.option_group_id}`;
                          let optionName = `Option ${custom.option_id}`;
                          
                          if (menuItem && menuItem.option_groups) {
                            const group = menuItem.option_groups.find(g => g.id === custom.option_group_id);
                            if (group) {
                              optionGroupName = group.name;
                              const option = group.options.find(o => o.id === custom.option_id);
                              if (option) {
                                optionName = option.name;
                              }
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
                        // Handle object-based customizations (group names as keys, option names as values)
                        Object.entries(item.customizations).map(([groupName, options], idx: number) => (
                          <div key={idx} className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-[#c1902f] rounded-full mr-1.5"></span>
                            <span className="font-medium">{groupName}:</span> {
                              Array.isArray(options) 
                                ? options.join(', ') 
                                : String(options)
                            }
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* +/- controls */}
                  <div className="flex items-center justify-between mt-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => {
                          console.log('OrderPanel minus button clicked, itemKey:', itemKey);
                          if (item.quantity > 1) {
                            setCartQuantity(itemKey, item.quantity - 1);
                          } else {
                            removeFromCart(itemKey);
                          }
                        }}
                        className="text-gray-600 hover:text-[#c1902f] p-1 rounded-l"
                        aria-label="Decrease quantity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
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
                      <span className="mx-2 w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          console.log('OrderPanel plus button clicked, itemKey:', itemKey);
                          setCartQuantity(itemKey, item.quantity + 1);
                        }}
                        // Check if we need to disable the button due to stock limitations
                        disabled={(() => {
                          // Find the corresponding menu item to check stock
                          const menuItem = menuItems.find(m => m.id === item.id);
                          if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                            // Calculate effective available quantity
                            const cartItem = findCartItem(menuItem.id);
                            const cartQuantity = cartItem ? cartItem.quantity : 0;
                            const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                            return effectiveQuantity <= 0;
                          }
                          return false;
                        })()}
                        className={`text-gray-600 hover:text-[#c1902f] p-1 rounded-r ${
                          (() => {
                            // Find the corresponding menu item to check stock
                            const menuItem = menuItems.find(m => m.id === item.id);
                            if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                              // Calculate effective available quantity
                              const cartItem = findCartItem(menuItem.id);
                              const cartQuantity = cartItem ? cartItem.quantity : 0;
                              const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                              
                              if (effectiveQuantity <= 0) {
                                return 'opacity-50 cursor-not-allowed';
                              }
                            }
                            return '';
                          })()
                        }`}
                        aria-label="Increase quantity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
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
                    {/* "Add Another" if custom */}
                    {item.customizations && item.id && (
                      <button
                        onClick={() => {
                          const mi = menuItems.find(m => m.id === item.id);
                          if (mi?.option_groups?.length) {
                            // Check if adding another would exceed effective available quantity
                            if (mi.enable_stock_tracking && mi.available_quantity !== undefined) {
                              // Calculate effective available quantity
                              const cartItem = findCartItem(mi.id);
                              const cartQuantity = cartItem ? cartItem.quantity : 0;
                              const effectiveQuantity = mi.available_quantity - cartQuantity;
                              
                              if (effectiveQuantity <= 0) {
                                toast.error(`Cannot add more ${mi.name}. Stock limit reached.`);
                                return;
                              }
                            }
                            setCustomizingItem(mi);
                          }
                        }}
                        disabled={(() => {
                          // Find the corresponding menu item to check stock
                          const menuItem = menuItems.find(m => m.id === item.id);
                          if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                            // Calculate effective available quantity
                            const cartItem = findCartItem(menuItem.id);
                            const cartQuantity = cartItem ? cartItem.quantity : 0;
                            const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                            return effectiveQuantity <= 0;
                          }
                          return false;
                        })()}
                        className={`mt-1 sm:mt-0 text-[#c1902f] border border-[#c1902f]
                                   hover:bg-[#c1902f] hover:text-white px-3 py-1
                                   rounded text-xs font-medium transition-colors ${
                          (() => {
                            // Find the corresponding menu item to check stock
                            const menuItem = menuItems.find(m => m.id === item.id);
                            if (menuItem?.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                              // Calculate effective available quantity
                              const cartItem = findCartItem(menuItem.id);
                              const cartQuantity = cartItem ? cartItem.quantity : 0;
                              const effectiveQuantity = menuItem.available_quantity - cartQuantity;
                              
                              if (effectiveQuantity <= 0) {
                                return 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-500';
                              }
                            }
                            return '';
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

      {/* Fixed bottom bar for total & create/cancel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-gray-700 text-lg">Total:</span>
          <span className="font-bold text-xl text-[#c1902f]">${orderTotal.toFixed(2)}</span>
        </div>
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
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0
                      018-8V0C5.373
                      0 0 5.373
                      0 12h4zm2
                      5.291A7.962
                      7.962
                      0
                      014
                      12H0c0
                      3.042
                      1.135
                      5.824
                      3
                      7.938l3-2.647z"
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
 * PaymentPanel: Handles payment processing
 * -------------------------------------------------------------------*/
interface PaymentPanelProps {
  orderTotal: number;
  onPaymentSuccess: (details: {
    status: string;
    transaction_id: string;
    payment_id?: string;
    amount: string;
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
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'cash' | 'payment_link'>('credit_card');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentLinkUrl, setPaymentLinkUrl] = useState('');
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Payment processor refs
  const stripeRef = useRef<StripeCheckoutRef>(null);
  const paypalRef = useRef<PayPalCheckoutRef>(null);
  
  // Get restaurant settings for payment configuration
  const restaurant = useRestaurantStore((state) => state.restaurant);
  const paymentGateway = restaurant?.admin_settings?.payment_gateway || {};
  const paymentProcessor = paymentGateway.payment_processor || 'paypal';
  const testMode = paymentGateway.test_mode !== false;

  const handleCashPayment = () => {
    // Generate a mock transaction ID for cash payments
    const mockTransactionId = `cash_${Date.now()}`;
    onPaymentSuccess({
      status: 'succeeded',
      transaction_id: mockTransactionId,
      amount: orderTotal.toString()
    });
  };
  
  const handleSendPaymentLink = async () => {
    if (!customerEmail && !customerPhone) {
      setPaymentError('Please provide either an email or phone number to send the payment link.');
      return;
    }
    
    setPaymentError(null);
    try {
      // In a real implementation, this would call an API endpoint
      // to generate and send a payment link to the customer
      console.log('Generating payment link:', {
        email: customerEmail,
        phone: customerPhone,
        amount: orderTotal
      });
      
      // Simulate API response with a mock payment link
      const mockPaymentLink = `https://payment.example.com/order/${Date.now()}?token=abc123`;
      
      // Display the payment link URL and mark as sent
      setPaymentLinkUrl(mockPaymentLink);
      setPaymentLinkSent(true);
    } catch (error) {
      console.error('Error creating payment link:', error);
      setPaymentError('Failed to create payment link. Please try again.');
    }
  };

  const handleProcessPayment = async () => {
    if (paymentMethod === 'cash') {
      handleCashPayment();
      return;
    }
    
    if (paymentMethod === 'payment_link') {
      handleSendPaymentLink();
      return;
    }

    try {
      if (paymentProcessor === 'stripe' && stripeRef.current) {
        // Process with Stripe
        await stripeRef.current.processPayment();
      } else if (paypalRef.current) {
        // Process with PayPal
        await paypalRef.current.processPayment();
      } else {
        // Fallback if no payment processor is configured
        toast.error('Payment processor not configured');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      onPaymentError(error instanceof Error ? error : new Error('Payment processing failed'));
    }
  };

  return (
    <div className="overflow-y-auto flex-1 p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Payment</h3>
      
      {/* Payment Method Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
              paymentMethod === 'credit_card'
                ? 'bg-[#c1902f] text-white border-[#c1902f]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setPaymentMethod('credit_card')}
          >
            Credit Card
          </button>
          <button
            type="button"
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
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
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
              paymentMethod === 'payment_link'
                ? 'bg-[#c1902f] text-white border-[#c1902f]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setPaymentMethod('payment_link')}
          >
            Send Link
          </button>
        </div>
      </div>

      {/* Payment Processor */}
      {paymentMethod === 'credit_card' && !paymentLinkSent && (
        <div className="border border-gray-200 rounded-md p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Credit Card Payment</h4>
          
          {/* Conditionally render Stripe or PayPal components based on restaurant settings */}
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
      )}
      
      {/* Payment Link Form */}
      {paymentMethod === 'payment_link' && !paymentLinkSent && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Email (optional)
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Phone (optional)
            </label>
            <input
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
          <p className="text-sm text-gray-500">
            Please provide at least one contact method to send the payment link.
          </p>
        </div>
      )}
      
      {/* Payment Link Sent */}
      {paymentLinkSent && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Payment Link Sent</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  A payment link has been sent to the customer. They can use this link to complete
                  the payment:
                </p>
                <div className="mt-2 bg-white p-2 rounded border border-gray-200 break-all">
                  <a
                    href={paymentLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {paymentLinkUrl}
                  </a>
                </div>
                <p className="mt-2">
                  You can close this panel and mark the items as paid once the customer completes the
                  payment, or leave it open to track payment status.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
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

      {/* Buttons */}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button
          onClick={onBack}
          className="py-3 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200
                     focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-sm transition-colors"
          disabled={isProcessing}
        >
          Back
        </button>
        {!paymentLinkSent ? (
          <button
            onClick={handleProcessPayment}
            disabled={isProcessing || (paymentMethod === 'payment_link' && !customerEmail && !customerPhone)}
            className="py-3 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28]
                      focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50
                      disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none" viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373
                          0 0 5.373 0
                          12h4zm2
                          5.291A7.962
                          7.962
                          0
                          014
                          12H0c0
                          3.042
                          1.135
                          5.824
                          3
                          7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              paymentMethod === 'cash' 
                ? 'Complete Cash Payment' 
                : paymentMethod === 'payment_link'
                  ? 'Send Payment Link'
                  : 'Process Payment'
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              // Mock transaction ID for payment link
              const mockTransactionId = `link_${Date.now()}`;
              onPaymentSuccess({
                status: 'pending',
                transaction_id: mockTransactionId,
                amount: orderTotal.toString()
              });
            }}
            className="py-3 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28]
                      focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50"
          >
            Mark as Paid & Close
          </button>
        )}
      </div>
    </div>
  );
}

/** --------------------------------------------------------------------
 * CustomerInfoPanel
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
  handleSubmitOrder: () => void;
  cartItems: any[];
  orderLoading: boolean;
  onBack: () => void;
  onNext?: () => void;
}
function CustomerInfoPanel({
  contactName, setContactName,
  contactPhone, setContactPhone,
  contactEmail, setContactEmail,
  specialInstructions, setSpecialInstructions,
  handleSubmitOrder,
  cartItems,
  orderLoading,
  onBack
}: CustomerInfoPanelProps) {
  return (
    <div className="overflow-y-auto flex-1 p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Customer Information</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                       focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                       focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
            placeholder="+1671"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                       focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
            placeholder="Email address"
          />
        </div>
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
      {/* Button */}
      <div className="mt-6">
        <button
          onClick={onBack}
          className="w-full py-3 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200
                     focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-sm transition-colors"
        >
          Back to Order
        </button>
      </div>
    </div>
  );
}

/** --------------------------------------------------------------------
 * The main StaffOrderModal
 * - Mobile: tabbed
 * - Desktop/iPad: side-by-side
 * - Fixed size
 * - Menu item cards from older styling
 * -------------------------------------------------------------------*/
interface StaffOrderModalProps {
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  restaurantId?: string;
}

export function StaffOrderModal({ onClose, onOrderCreated }: StaffOrderModalProps) {
  const isMobile = useIsMobile();

  // Customer info
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('+1671');
  const [contactEmail, setContactEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Use the store's getItemKey function for consistency
  const getItemKey = useOrderStore(state => state._getItemKey);

  // Data
  const { menuItems, fetchMenuItems, loading: menuLoading } = useMenuStore();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    setCartQuantity,
    clearCart,
    addOrder,
    loading: orderLoading
  } = useOrderStore();

  // Categories
  const [categories, setCategories] = useState<Map<number, string>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // For customization
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Mobile tab
  const [activeTab, setActiveTab] = useState<'menu' | 'order' | 'customer' | 'payment'>('menu');

  // Desktop "Show Customer Info" toggle
  const [showCustomerInfoDesktop, setShowCustomerInfoDesktop] = useState(false);
  
  // Payment state
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);

  // Calculate total
  const orderTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // On mount, fetch
  useEffect(() => {
    fetchMenuItems();
    return () => {
      clearCart();
    };
  }, [fetchMenuItems, clearCart]);

  // Load categories
  useEffect(() => {
    async function fetchCats() {
      try {
        const res = await apiClient.get('/categories');
        const catMap = new Map<number, string>();
        res.data.forEach((c: any) => {
          catMap.set(c.id, c.name);
        });
        setCategories(catMap);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // fallback
        const fallback = new Map<number, string>();
        menuItems.forEach(it => {
          if (it.category_ids) {
            it.category_ids.forEach(catId => {
              if (!fallback.has(catId)) fallback.set(catId, `Category ${catId}`);
            });
          }
        });
        setCategories(fallback);
      }
    }
    if (menuItems.length > 0) {
      fetchCats();
    }
  }, [menuItems]);

  function findCartItem(id: string) {
    console.log('Finding cart item with id:', id);
    // First try to find by direct ID match
    let item = cartItems.find(c => c.id === id);
    
    if (!item) {
      // If not found, try to find by matching the item key
      // This requires creating a temporary object with the ID to generate a key
      const tempItem = { id };
      const itemKey = getItemKey(tempItem);
      console.log('Looking for item with key:', itemKey);
      
      // Now try to find an item with a matching key
      item = cartItems.find(c => getItemKey(c) === itemKey);
    }
    
    console.log('Found item:', item);
    return item || null;
  }

  function handleAddItem(item: MenuItem) {
    // Check if stock tracking is enabled for this item
    if (item.enable_stock_tracking && item.available_quantity !== undefined) {
      // Calculate effective available quantity by subtracting cart quantity
      const cartItem = findCartItem(item.id);
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const effectiveQuantity = item.available_quantity - cartQuantity;
      
      // Check if item is out of stock
      if (effectiveQuantity <= 0) {
        toast.error(`${item.name} is out of stock.`);
        return;
      }
    }
    
    if (item.option_groups?.length) {
      setCustomizingItem(item);
    } else {
      addToCart({ id: item.id, name: item.name, price: item.price, type: 'food', image: item.image }, 1);
    }
  }

  function handleAddCustomizedItem(item: MenuItem, custom: any[], qty: number) {
    // Check if stock tracking is enabled for this item
    if (item.enable_stock_tracking && item.available_quantity !== undefined) {
      // Calculate effective available quantity by subtracting cart quantity
      const cartItem = findCartItem(item.id);
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const effectiveQuantity = item.available_quantity - cartQuantity;
      
      // Check if item is out of stock
      if (effectiveQuantity <= 0) {
        toast.error(`${item.name} is out of stock.`);
        setCustomizingItem(null);
        return;
      }
      
      // Check if adding the requested quantity would exceed available quantity
      if (qty > effectiveQuantity) {
        toast.error(`Cannot add ${qty} more ${item.name}. Only ${effectiveQuantity} available.`);
        setCustomizingItem(null);
        return;
      }
    }
    
    addToCart(
      { id: item.id, name: item.name, price: item.price, type: 'food', image: item.image, customizations: custom },
      qty
    );
    setCustomizingItem(null);
  }

  // Handle payment success
  const handlePaymentSuccess = (details: {
    status: string;
    transaction_id: string;
    payment_id?: string;
    amount: string;
    currency?: string;
  }) => {
    setPaymentProcessing(false);
    setPaymentTransactionId(details.transaction_id);
    
    // Submit the order with the transaction ID
    submitOrderWithPayment(details.transaction_id);
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error('Payment failed:', error);
    toast.error(`Payment failed: ${error.message}`);
    setPaymentProcessing(false);
  };

  // Submit order with payment
  async function submitOrderWithPayment(transactionId: string) {
    if (!cartItems.length) {
      toast.error('Please add items to the order');
      return;
    }
    
    const finalPhone = contactPhone.trim() === '+1671' ? '' : contactPhone.trim();
    if (finalPhone && !isValidPhone(finalPhone)) {
      toast.error('Phone must be + (3 or 4 digit area code) + 7 digits');
      return;
    }
    
    try {
      const newOrder = await addOrder(
        cartItems,
        orderTotal,
        specialInstructions,
        contactName,
        finalPhone,
        contactEmail,
        transactionId,
        'credit_card'
      );
      
      toast.success('Order created successfully!');
      onOrderCreated(newOrder.id);
    } catch (err: any) {
      console.error('Error creating order:', err);
      
      // Check if the error is related to stock availability
      if (err.response?.data?.error?.includes('stock') || 
          err.response?.data?.error?.includes('inventory') ||
          err.response?.data?.error?.includes('available quantity')) {
        // Stock-related error
        toast.error('Some items are no longer available in the requested quantity.');
        
        // Refresh menu items to get updated stock quantities
        fetchMenuItems();
      } else {
        // Generic error
        toast.error('Failed to create order. Please try again.');
      }
    }
  }

  // Original submit order function - now redirects to payment
  async function handleSubmitOrder() {
    if (!cartItems.length) {
      toast.error('Please add items to the order');
      return;
    }
    
    const finalPhone = contactPhone.trim() === '+1671' ? '' : contactPhone.trim();
    if (finalPhone && !isValidPhone(finalPhone)) {
      toast.error('Phone must be + (3 or 4 digit area code) + 7 digits');
      return;
    }
    
    // Show payment panel
    if (isMobile) {
      setActiveTab('payment');
    } else {
      setShowPaymentPanel(true);
    }
  }

  /** MOBILE TABBED LAYOUT */
  function renderMobileLayout() {
    return (
      <div className="flex flex-col overflow-hidden h-full">
        {/* Tab bar */}
        <div className="border-b border-gray-200 flex items-center justify-around bg-white shadow-sm">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'menu'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`flex-1 py-3 text-sm font-medium text-center relative ${
              activeTab === 'order'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Current Order
            {cartItems.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#c1902f] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'customer'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Customer Info
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'payment'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Payment
          </button>
        </div>

        {/* Tab content */}
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
          />
        )}
        {activeTab === 'customer' && (
          <CustomerInfoPanel
            contactName={contactName} setContactName={setContactName}
            contactPhone={contactPhone} setContactPhone={setContactPhone}
            contactEmail={contactEmail} setContactEmail={setContactEmail}
            specialInstructions={specialInstructions} setSpecialInstructions={setSpecialInstructions}
            handleSubmitOrder={handleSubmitOrder}
            cartItems={cartItems}
            orderLoading={orderLoading}
            onBack={() => setActiveTab('order')}
            onNext={() => setActiveTab('payment')}
          />
        )}
        {activeTab === 'payment' && (
          <PaymentPanel
            orderTotal={orderTotal}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onBack={() => setActiveTab('customer')}
            isProcessing={paymentProcessing}
          />
        )}
      </div>
    );
  }

  /** DESKTOP/IPAD SIDE-BY-SIDE LAYOUT */
  function renderDesktopLayout() {
    // If payment panel is shown, display it in a modal-like overlay
    if (showPaymentPanel) {
      return (
        <div className="flex-1 flex overflow-hidden h-full relative">
          {/* Dimmed background */}
          <div className="absolute inset-0 bg-black bg-opacity-30 z-10"></div>
          
          {/* Payment Panel */}
          <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <PaymentPanel
                orderTotal={orderTotal}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                onBack={() => setShowPaymentPanel(false)}
                isProcessing={paymentProcessing}
              />
            </div>
          </div>
          
          {/* Regular layout (dimmed in background) */}
          <div className="flex-1 flex overflow-hidden h-full">
            {/* Left: Menu Items */}
            <div className="w-2/3 flex flex-col border-r border-gray-200">
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

            {/* Right: Order + optional Customer Info toggle */}
            <div className="w-1/3 flex flex-col relative">
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
              />

              {/* Customer Info (toggle) */}
              <div className="absolute bottom-[150px] left-0 right-0 px-4">
                {!showCustomerInfoDesktop ? (
                  <button
                    onClick={() => setShowCustomerInfoDesktop(true)}
                    className="w-full py-2.5 text-sm font-medium bg-gray-50 border border-gray-300
                               hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
                  >
                    Add Customer Info
                  </button>
                ) : (
                  <div className="mt-4 border border-gray-200 rounded-md p-3 shadow-sm bg-gray-50">
                    <CustomerInfoPanel
                      contactName={contactName}
                      setContactName={setContactName}
                      contactPhone={contactPhone}
                      setContactPhone={setContactPhone}
                      contactEmail={contactEmail}
                      setContactEmail={setContactEmail}
                      specialInstructions={specialInstructions}
                      setSpecialInstructions={setSpecialInstructions}
                      handleSubmitOrder={handleSubmitOrder}
                      cartItems={cartItems}
                      orderLoading={orderLoading}
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
    
    // Regular layout when payment panel is not shown
    return (
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Left: Menu Items */}
        <div className="w-2/3 flex flex-col border-r border-gray-200">
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

        {/* Right: Order + optional Customer Info toggle */}
        <div className="w-1/3 flex flex-col relative">
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
          />

          {/* Customer Info (toggle) */}
          <div className="absolute bottom-[150px] left-0 right-0 px-4">
            {!showCustomerInfoDesktop ? (
              <button
                onClick={() => setShowCustomerInfoDesktop(true)}
                className="w-full py-2.5 text-sm font-medium bg-gray-50 border border-gray-300
                           hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
              >
                Add Customer Info
              </button>
            ) : (
              <div className="mt-4 border border-gray-200 rounded-md p-3 shadow-sm bg-gray-50">
                <CustomerInfoPanel
                  contactName={contactName}
                  setContactName={setContactName}
                  contactPhone={contactPhone}
                  setContactPhone={setContactPhone}
                  contactEmail={contactEmail}
                  setContactEmail={setContactEmail}
                  specialInstructions={specialInstructions}
                  setSpecialInstructions={setSpecialInstructions}
                  handleSubmitOrder={handleSubmitOrder}
                  cartItems={cartItems}
                  orderLoading={orderLoading}
                  onBack={() => setShowCustomerInfoDesktop(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4"
    >
      <div
        className="
          bg-white rounded-lg shadow-xl
          w-[95vw] max-w-[1100px]
          h-[90vh] max-h-[800px]
          flex flex-col
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">Create Staff Order</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none
                       rounded-full hover:bg-gray-100 p-1 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile or Desktop/iPad? */}
        {isMobile ? renderMobileLayout() : renderDesktopLayout()}
      </div>

      {/* Customization modal */}
      {customizingItem && (
        <ItemCustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={handleAddCustomizedItem}
        />
      )}
    </div>
  );
}
