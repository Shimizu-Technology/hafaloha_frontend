// src/ordering/components/CartPage.tsx
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, Minus, Plus, Settings } from 'lucide-react';
import { useOrderStore, CartItem } from '../store/orderStore';
import { useMenuStore } from '../store/menuStore';
import { CustomizationModal } from './CustomizationModal';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';
import { calculateAvailableQuantity } from '../utils/inventoryUtils';
import toastUtils from '../../shared/utils/toastUtils';

export function CartPage() {
  const navigate = useNavigate();
  const { menuItems, fetchMenuItems } = useMenuStore();
  
  // State for customization modal
  const [itemToCustomize, setItemToCustomize] = useState<any>(null);

  // FE-018: Option availability helper functions
  const getOptionAvailableQuantity = useCallback((option: any): number => {
    if (option.stock_quantity === undefined) {
      return Infinity; // No stock tracking
    }
    const damagedQty = option.damaged_quantity || 0;
    return Math.max(0, option.stock_quantity - damagedQty);
  }, [menuItems]);

  const isOptionAvailable = useCallback((option: any, requestedQuantity: number = 1, optionGroup?: any): boolean => {
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
  }, [getOptionAvailableQuantity, menuItems]);

  const validateCartItemOptions = useCallback((cartItem: CartItem, menuItem: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!cartItem.customizations || !menuItem?.option_groups) {
      return { isValid: true, errors };
    }
    
    // Extract selected options from customizations
    const selectedOptions: Array<{
      option_group_id: number;
      option_id: number;
      option_name: string;
      quantity: number;
    }> = [];
    
    Object.entries(cartItem.customizations).forEach(([groupName, selections]) => {
      if (Array.isArray(selections)) {
        selections.forEach((selectionName) => {
          // Find the option group and option
          const optionGroup = menuItem.option_groups.find((group: any) => group.name === groupName);
          const option = optionGroup?.options.find((opt: any) => opt.name === selectionName);
          
          if (optionGroup && option) {
            selectedOptions.push({
              option_group_id: optionGroup.id,
              option_id: option.id,
              option_name: option.name,
              quantity: cartItem.quantity
            });
          }
        });
      }
    });
    
    // Validate each selected option
    selectedOptions.forEach((selectedOption) => {
      const optionGroup = menuItem.option_groups.find((group: any) => group.id === selectedOption.option_group_id);
      const option = optionGroup?.options.find((opt: any) => opt.id === selectedOption.option_id);
      
      if (option && !isOptionAvailable(option, selectedOption.quantity, optionGroup)) {
        const availableQty = getOptionAvailableQuantity(option);
        if (availableQty === 0) {
          errors.push(`${selectedOption.option_name} is out of stock`);
        } else {
          errors.push(`${selectedOption.option_name} has only ${availableQty} available (need ${selectedOption.quantity})`);
        }
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }, [isOptionAvailable, getOptionAvailableQuantity, menuItems]);

  // We pull the actions from our store
  const {
    cartItems,
    setCartQuantity,
    removeFromCart,
    setCartItemNotes
  } = useOrderStore();
  
  // Make sure menu items are loaded (for finding original items with option groups)
  React.useEffect(() => {
    if (menuItems.length === 0) {
      fetchMenuItems();
    }
  }, [fetchMenuItems, menuItems.length]);

  // Sum up the total
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">
          Add some delicious items to get started!
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center px-6 py-3 border border-transparent
                     text-base font-medium rounded-md text-white
                     bg-[#c1902f] hover:bg-[#d4a43f]"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
          Your Cart
        </h1>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart items list */}
          <div className="lg:col-span-7">
            {
              cartItems.map((item: CartItem) => {
                // Generate a unique key for this item using our composite key function
                const itemKey = useOrderStore.getState()._getItemKey(item);
                
                return (
                  <div
                    key={itemKey}
                    className="flex flex-col sm:flex-row sm:items-start
                             space-y-4 sm:space-y-0 sm:space-x-4 py-6 border-b"
                  >
                  {/* Image */}
                  <OptimizedImage
                    src={(item as any).image}
                    alt={item.name}
                    className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-md"
                    context="cart"
                    fallbackSrc="/placeholder-food.png"
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>

                    {(item as any).description && (
                      <p className="mt-1 text-sm text-gray-500">{(item as any).description}</p>
                    )}

                    {/* If the item requires 24 hours, show it */}
                    {item.advance_notice_hours && item.advance_notice_hours >= 24 && (
                      <p className="mt-1 text-sm text-red-600">
                        Requires 24 hours notice
                      </p>
                    )}

                    {/* If customizations exist, show them */}
                    {item.customizations && (
                      <div className="mt-1 text-sm text-gray-600">
                        {Object.entries(item.customizations).map(([groupName, picks]) => (
                          <p key={groupName}>
                            <strong>{groupName}:</strong> {picks.join(', ')}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* FE-018: Availability warnings */}
                    {(() => {
                      const menuItem = menuItems.find(mi => mi.id === item.id);
                      if (!menuItem) return null;
                      
                      const warnings: string[] = [];
                      
                      // Check item-level stock
                      if (menuItem.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                        const availableQty = calculateAvailableQuantity(menuItem);
                        if (availableQty < item.quantity) {
                          warnings.push(`Only ${availableQty} available in stock (you have ${item.quantity} in cart)`);
                        } else if (availableQty <= item.quantity + 2) {
                          warnings.push(`Low stock: ${availableQty} remaining`);
                        }
                      }
                      
                      // Check option-level availability
                      const optionValidation = validateCartItemOptions(item, menuItem);
                      if (!optionValidation.isValid) {
                        warnings.push(...optionValidation.errors);
                      }
                      
                      if (warnings.length === 0) return null;
                      
                      return (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex items-start">
                            <svg className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-amber-800">
                              {warnings.map((warning, index) => (
                                <p key={index} className={index > 0 ? 'mt-1' : ''}>
                                  {warning}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* NEW: Per-item notes text area */}
                    <textarea
                      className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm
                               focus:ring-[#c1902f] focus:border-[#c1902f]"
                      placeholder="Any notes for this item? (e.g. 'No onions', 'Extra sauce')"
                      value={item.notes || ''}
                      onChange={(e) => setCartItemNotes(itemKey, e.target.value)}
                    />

                    <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
                      {/* Quantity controls */}
                      <div className="flex items-center border rounded-md">
                        <button
                          className="p-2 text-gray-600 hover:text-gray-900"
                          onClick={() => setCartQuantity(itemKey, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 border-x">{item.quantity}</span>
                        <button
                          className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            // FE-018: Validate item-level and option-level availability before increasing quantity
                            const menuItem = menuItems.find(mi => mi.id === item.id);
                            
                            if (menuItem) {
                              // Check item-level stock availability
                              if (menuItem.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                                const availableQty = calculateAvailableQuantity(menuItem);
                                if (availableQty <= item.quantity) {
                                  toastUtils.error(`Cannot add more ${item.name}. Only ${availableQty} available in stock.`);
                                  return;
                                }
                              }
                              
                              // Check option-level availability
                              const optionValidation = validateCartItemOptions(
                                { ...item, quantity: item.quantity + 1 }, 
                                menuItem
                              );
                              
                              if (!optionValidation.isValid) {
                                toastUtils.error(`Cannot add more ${item.name}. ${optionValidation.errors.join(', ')}`);
                                return;
                              }
                            }
                            
                            setCartQuantity(itemKey, item.quantity + 1);
                          }}
                          disabled={(() => {
                            const menuItem = menuItems.find(mi => mi.id === item.id);
                            if (!menuItem) return false;
                            
                            // Check item-level stock
                            if (menuItem.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                              const availableQty = calculateAvailableQuantity(menuItem);
                              if (availableQty <= item.quantity) return true;
                            }
                            
                            // Check option-level availability
                            const optionValidation = validateCartItemOptions(
                              { ...item, quantity: item.quantity + 1 }, 
                              menuItem
                            );
                            
                            return !optionValidation.isValid;
                          })()}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center">
                        {/* "Customize Again" button - only show for items that can be customized */}
                        {item.customizations && Object.keys(item.customizations).length > 0 && (
                          <button
                            className="mr-2 px-3 py-1.5 text-sm text-[#c1902f] border border-[#c1902f] rounded-md hover:bg-[#c1902f]/10 flex items-center"
                            onClick={() => {
                              // Find the original menu item to get its option groups
                              const originalItem = menuItems.find(mi => mi.id === item.id);
                              if (originalItem) {
                                setItemToCustomize(originalItem);
                              }
                            }}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Customize Again
                          </button>
                        )}
                      
                        {/* Remove item */}
                        <button
                          className="text-red-600 hover:text-red-800 p-2"
                          onClick={() => removeFromCart(itemKey)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="text-lg font-medium text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  </div>
                );
              })
            }
          </div>

          {/* Order summary */}
          <div className="lg:col-span-5 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Order Summary
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <button
                  className="w-full flex items-center justify-center px-6 py-3 border
                           border-transparent text-base font-medium rounded-md text-white
                           bg-[#c1902f] hover:bg-[#d4a43f] disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={() => {
                    // FE-018: Validate all cart items before proceeding to checkout
                    const validationIssues: string[] = [];
                    
                    cartItems.forEach((item) => {
                      const menuItem = menuItems.find(mi => mi.id === item.id);
                      if (!menuItem) return;
                      
                      // Check item-level stock
                      if (menuItem.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                        const availableQty = calculateAvailableQuantity(menuItem);
                        if (availableQty < item.quantity) {
                          validationIssues.push(`${item.name}: Only ${availableQty} available (you have ${item.quantity} in cart)`);
                        }
                      }
                      
                      // Check option-level availability
                      const optionValidation = validateCartItemOptions(item, menuItem);
                      if (!optionValidation.isValid) {
                        validationIssues.push(`${item.name}: ${optionValidation.errors.join(', ')}`);
                      }
                    });
                    
                    if (validationIssues.length > 0) {
                      toastUtils.error(`Cannot proceed to checkout. Please resolve the following issues:\n${validationIssues.join('\n')}`);
                      return;
                    }
                    
                    navigate('/checkout');
                  }}
                  disabled={(() => {
                    // Check if any cart items have availability issues
                    return cartItems.some((item) => {
                      const menuItem = menuItems.find(mi => mi.id === item.id);
                      if (!menuItem) return false;
                      
                      // Check item-level stock
                      if (menuItem.enable_stock_tracking && menuItem.available_quantity !== undefined) {
                        const availableQty = calculateAvailableQuantity(menuItem);
                        if (availableQty < item.quantity) return true;
                      }
                      
                      // Check option-level availability
                      const optionValidation = validateCartItemOptions(item, menuItem);
                      return !optionValidation.isValid;
                    });
                  })()}
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Customization Modal */}
      {itemToCustomize && (
        <CustomizationModal
          item={itemToCustomize}
          onClose={() => setItemToCustomize(null)}
        />
      )}
    </>
  );
}
