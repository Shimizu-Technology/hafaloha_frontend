// src/wholesale/store/wholesaleCartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '../../shared/auth/authStore';
import wholesaleWebSocket, { WholesaleItemStockUpdate } from '../services/wholesaleWebSocket';
import { wholesaleApi } from '../services/wholesaleApi';
import { validateCartItemInventory, generateVariantKey } from '../utils/inventoryUtils';

export interface WholesaleCartItem {
  id: string;
  itemId: number;
  fundraiserId: number;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
  options?: Record<string, any>; // Backend format: group ID -> option IDs array
  selectedOptions?: Record<string, string>; // Display format: group name -> option names
  addedAt: string;
  updatedAt: string;
}

export interface WholesaleFundraiser {
  id: number;
  name: string;
  slug: string;
  description?: string;
  // Pickup information
  pickup_display_name?: string;
  pickup_display_address?: string;
  pickup_instructions?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_hours?: string;
}

export interface WholesaleCartState {
  items: WholesaleCartItem[];
  fundraiser: WholesaleFundraiser | null;
  loading: boolean;
  error: string | null;
  
  // WebSocket state
  websocketConnected: boolean;
  
  // Cart actions
  addToCart: (item: Omit<WholesaleCartItem, 'quantity' | 'addedAt' | 'updatedAt'>, quantity?: number) => boolean;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  
  // Cart calculations
  getCartTotal: () => number;
  getCartTotalCents: () => number;
  getItemCount: () => number;
  getTotalQuantity: () => number;
  
  // Fundraiser management
  setFundraiser: (fundraiser: WholesaleFundraiser) => void;
  
  // Validation
  validateCart: () => Promise<boolean>;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  migrateCartFormat: () => void;
  
  // Cart cleanup
  removeUnavailableItems: () => Promise<void>;
  
  // WebSocket methods
  startWebSocketConnection: () => boolean;
  stopWebSocketConnection: () => void;
  handleInventoryUpdate: (update: WholesaleItemStockUpdate) => void;
}

export const useWholesaleCartStore = create<WholesaleCartState>()(
  persist(
    (set, get) => ({
      items: [],
      fundraiser: null,
      loading: false,
      error: null,
      websocketConnected: false,

      addToCart: (item, quantity = 1) => {
        const state = get();
        
        // Prevent adding items from different fundraisers - let the UI handle this
        if (state.fundraiser && state.fundraiser.id !== item.fundraiserId) {
          return false;
        }
        
        // Check if item with same options already exists in cart
        const existingItemIndex = state.items.findIndex(cartItem => 
          cartItem.itemId === item.itemId && 
          JSON.stringify(cartItem.selectedOptions || {}) === JSON.stringify(item.selectedOptions || {})
        );
        
        const now = new Date().toISOString();
        
        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...state.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity,
            updatedAt: now
          };
          
          set({ 
            items: updatedItems,
            error: null 
          });
        } else {
          // Add new item to cart
          const newItem: WholesaleCartItem = {
            ...item,
            id: `${item.itemId}-${Date.now()}`,
            quantity,
            addedAt: now,
            updatedAt: now
          };
          
          set({ 
            items: [...state.items, newItem],
            error: null 
          });
        }
        
        return true;
      },

      updateQuantity: (itemId, quantity) => {
        const state = get();
        
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          get().removeFromCart(itemId);
          return;
        }
        
        const updatedItems = state.items.map(item =>
          item.id === itemId 
            ? { ...item, quantity, updatedAt: new Date().toISOString() }
            : item
        );
        
        set({ 
          items: updatedItems,
          error: null 
        });
      },

      removeFromCart: (itemId) => {
        const state = get();
        const updatedItems = state.items.filter(item => item.id !== itemId);
        
        // Clear fundraiser if cart becomes empty
        const newFundraiser = updatedItems.length === 0 ? null : state.fundraiser;
        
        set({ 
          items: updatedItems,
          fundraiser: newFundraiser,
          error: null 
        });
      },

            clearCart: () => {
        set({ 
          items: [], 
          fundraiser: null, 
          error: null 
        });
      },

      // Migration helper: Clear cart if items have old format
      migrateCartFormat: () => {
        const state = get();
        const hasOldFormatItems = state.items.some(item => {
          // Check if selectedOptions contains array values (old format)
          return item.selectedOptions && Object.values(item.selectedOptions).some(value => 
            Array.isArray(value) || (typeof value === 'string' && value.includes(','))
          );
        });
        
        if (hasOldFormatItems) {
          console.warn('Detected old cart format, clearing cart for compatibility');
          get().clearCart();
        }
      },

      getCartTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getCartTotalCents: () => {
        const state = get();
        return state.items.reduce((total, item) => total + (item.priceCents * item.quantity), 0);
      },

      getItemCount: () => {
        const state = get();
        return state.items.length;
      },

      getTotalQuantity: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      setFundraiser: (fundraiser) => {
        set({ 
          fundraiser,
          error: null 
        });
      },

      validateCart: async () => {
        const state = get();
        
        if (state.items.length === 0) {
          set({ error: 'Cart is empty' });
          return false;
        }
        
        if (!state.fundraiser) {
          set({ error: 'No fundraiser selected' });
          return false;
        }
        
        try {
          // Convert cart items to the format expected by the backend
          const cartItemsForValidation = state.items.map(item => ({
            item_id: item.itemId,
            fundraiser_id: item.fundraiserId,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            price_cents: item.priceCents,
            selected_options: item.options || {}
          }));
          
          // Call the backend to validate cart items against current inventory
          const response = await wholesaleApi.validateCart(cartItemsForValidation);
          
          if (response.success && response.data?.valid) {
            set({ error: null });
            return true;
          } else {
            // Handle specific validation issues
            const issues = response.data?.issues || [];
            if (issues.length > 0) {
              // Create user-friendly error messages
              const errorMessages = issues.map((issue: any) => {
                if (issue.type === 'out_of_stock') {
                  if (issue.option_name) {
                    // Option-level out of stock - emphasize the option, include item for context
                    return `❌ "${issue.option_name}" is out of stock (from ${issue.item_name})`;
                  } else {
                    // Item-level out of stock
                    return `❌ "${issue.item_name}" is out of stock`;
                  }
                } else if (issue.type === 'insufficient_stock') {
                  if (issue.option_name) {
                    // Option-level insufficient stock - emphasize the option and quantity
                    return `⚠️ Only ${issue.available} "${issue.option_name}" left (from ${issue.item_name}) - you have ${issue.requested} in your cart`;
                  } else {
                    // Item-level insufficient stock
                    return `⚠️ Only ${issue.available} left of "${issue.item_name}" - you have ${issue.requested} in your cart`;
                  }
                } else if (issue.type === 'option_unavailable') {
                  // Option marked as unavailable by admin
                  return `❌ "${issue.option_name}" is no longer available${issue.group_name ? ` for ${issue.group_name}` : ''} (from ${issue.item_name})`;
                } else if (issue.type === 'item_inactive' || issue.type === 'item_not_found') {
                  return `❌ "${issue.item_name}" is no longer available`;
                } else if (issue.type === 'fundraiser_inactive') {
                  return `❌ This fundraiser is no longer accepting orders`;
                } else if (issue.type === 'price_changed') {
                  return `💰 Price changed for "${issue.item_name}" - please review`;
                } else {
                  return issue.message || 'Unknown issue with cart item';
                }
              });
              
              const errorMessage = `Some items in your cart need attention:\n\n${errorMessages.join('\n')}\n\nYou can fix these issues automatically using the button below, or update your cart manually.`;
              set({ error: errorMessage });
            } else {
              set({ error: response.message || 'Cart validation failed' });
            }
            return false;
          }
        } catch (error) {
          console.error('Cart validation error:', error);
          set({ error: 'Unable to validate cart. Please try again.' });
          return false;
        }
      },

      setLoading: (loading) => {
        set({ loading });
      },

      removeUnavailableItems: async () => {
        const state = get();
        
        if (state.items.length === 0) {
          return;
        }
        
        try {
          // Convert cart items to the format expected by the backend
          const cartItemsForValidation = state.items.map(item => ({
            item_id: item.itemId,
            fundraiser_id: item.fundraiserId,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            price_cents: item.priceCents,
            selected_options: item.options || {}
          }));
          
          // Get validation issues
          const response = await wholesaleApi.validateCart(cartItemsForValidation);
          
          if (response.success && response.data?.issues) {
            const issues = response.data.issues;
            const itemsToRemove: string[] = [];
            const itemsToUpdate: { id: string; newQuantity: number }[] = [];
            const itemsWithPriceUpdates: string[] = [];
            
            // Process each issue (enhanced for variant tracking)
            issues.forEach((issue: any) => {
              if (issue.type === 'out_of_stock' || issue.type === 'option_unavailable' || issue.type === 'variant_out_of_stock' || issue.type === 'variant_inactive' || issue.type === 'variant_not_found') {
                // Find and mark items for removal
                const cartItemsToRemove = state.items.filter(item => {
                  if (item.itemId === issue.item_id) {
                    // NEW: Variant-level out of stock (highest priority)
                    if ((issue.type === 'variant_out_of_stock' || issue.type === 'variant_inactive' || issue.type === 'variant_not_found') && issue.variant_id) {
                      // For variant issues, we can match by variant_id or by generating variant key
                      const itemOptions = item.options || {};
                      const cartVariantKey = generateVariantKey(itemOptions);
                      // Try to match by variant key if available, otherwise by variant_id
                      if (issue.variant_key) {
                        return cartVariantKey === issue.variant_key;
                      } else if (issue.variant_name) {
                        // Fallback: match by checking if this item's options would generate the same variant
                        return true; // For now, assume match - could be enhanced with more specific logic
                      }
                      return false;
                    }
                    // Option-level out of stock
                    else if (issue.option_id) {
                      const itemOptions = item.options || {};
                      return Object.values(itemOptions).some((optionIds: any) => 
                        Array.isArray(optionIds) && optionIds.includes(issue.option_id)
                      );
                    } 
                    // Item-level out of stock
                    else {
                      return true;
                    }
                  }
                  return false;
                });
                
                cartItemsToRemove.forEach(item => {
                  if (!itemsToRemove.includes(item.id)) {
                    itemsToRemove.push(item.id);
                  }
                });
              } else if (issue.type === 'insufficient_stock' || issue.type === 'variant_insufficient_stock') {
                // Find items to update quantity
                const cartItemsToUpdate = state.items.filter(item => {
                  if (item.itemId === issue.item_id) {
                    // NEW: Variant-level insufficient stock (highest priority)
                    if (issue.type === 'variant_insufficient_stock' && issue.variant_id) {
                      // Check if this cart item matches the variant with insufficient stock
                      const itemOptions = item.options || {};
                      const cartVariantKey = generateVariantKey(itemOptions);
                      // Try to match by variant key if available
                      if (issue.variant_key) {
                        return cartVariantKey === issue.variant_key;
                      } else if (issue.variant_name) {
                        // Fallback: match by checking if this item's options would generate the same variant
                        return true; // For now, assume match - could be enhanced with more specific logic
                      }
                      return false;
                    }
                    // Option-level insufficient stock
                    else if (issue.option_id) {
                      const itemOptions = item.options || {};
                      return Object.values(itemOptions).some((optionIds: any) => 
                        Array.isArray(optionIds) && optionIds.includes(issue.option_id)
                      );
                    } 
                    // Item-level insufficient stock
                    else {
                      return true;
                    }
                  }
                  return false;
                });
                
                cartItemsToUpdate.forEach(item => {
                  if (!itemsToRemove.includes(item.id)) {
                    itemsToUpdate.push({
                      id: item.id,
                      newQuantity: Math.min(item.quantity, issue.available)
                    });
                  }
                });
              } else if (issue.type === 'price_changed') {
                // Find items to update price
                const cartItemsToUpdatePrice = state.items.filter(item => {
                  return item.itemId === issue.item_id;
                });
                
                cartItemsToUpdatePrice.forEach(item => {
                  if (!itemsToRemove.includes(item.id)) {
                    // Update the price for this item
                    const itemIndex = state.items.findIndex(stateItem => stateItem.id === item.id);
                    if (itemIndex !== -1) {
                      state.items[itemIndex] = {
                        ...state.items[itemIndex],
                        price: issue.new_price,
                        totalPrice: issue.new_price * item.quantity
                      };
                      
                      // Track that this item had a price update
                      if (!itemsWithPriceUpdates.includes(item.id)) {
                        itemsWithPriceUpdates.push(item.id);
                      }
                    }
                  }
                });
              }
            });
            
            // Apply changes
            let updatedItems = state.items.filter(item => !itemsToRemove.includes(item.id));
            
            // Update quantities for insufficient stock items
            itemsToUpdate.forEach(update => {
              const itemIndex = updatedItems.findIndex(item => item.id === update.id);
              if (itemIndex !== -1 && update.newQuantity > 0) {
                updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  quantity: update.newQuantity
                };
              }
            });
            
            // Update the cart
            set({ 
              items: updatedItems,
              error: null // Clear the error since we've fixed the issues
            });
            
            // Show a success message about what was cleaned up (enhanced for variants)
            const removedCount = itemsToRemove.length;
            const updatedCount = itemsToUpdate.length;
            const priceUpdatedCount = itemsWithPriceUpdates.length;
            
            // Count variant-specific issues for more detailed messaging
            let variantIssuesCount = 0;
            let optionIssuesCount = 0;
            let itemIssuesCount = 0;
            
            issues.forEach((issue: any) => {
              if (issue.type === 'variant_out_of_stock' || issue.type === 'variant_insufficient_stock' || issue.type === 'variant_inactive' || issue.type === 'variant_not_found') {
                variantIssuesCount++;
              } else if (issue.type === 'option_unavailable' || (issue.type === 'insufficient_stock' && issue.option_id)) {
                optionIssuesCount++;
              } else if (issue.type === 'out_of_stock' || issue.type === 'insufficient_stock') {
                itemIssuesCount++;
              }
            });
            
            let message = '';
            const actions = [];
            
            if (removedCount > 0) {
              if (variantIssuesCount > 0) {
                actions.push(`removed ${removedCount} unavailable variant${removedCount === 1 ? '' : 's'}`);
              } else if (optionIssuesCount > 0) {
                actions.push(`removed ${removedCount} unavailable option${removedCount === 1 ? '' : 's'}`);
              } else {
                actions.push(`removed ${removedCount} out-of-stock item${removedCount === 1 ? '' : 's'}`);
              }
            }
            
            if (updatedCount > 0) {
              if (variantIssuesCount > 0) {
                actions.push(`adjusted quantities for ${updatedCount} variant${updatedCount === 1 ? '' : 's'} with limited stock`);
              } else if (optionIssuesCount > 0) {
                actions.push(`adjusted quantities for ${updatedCount} option${updatedCount === 1 ? '' : 's'} with limited stock`);
              } else {
                actions.push(`adjusted quantities for ${updatedCount} item${updatedCount === 1 ? '' : 's'} with limited stock`);
              }
            }
            
            if (priceUpdatedCount > 0) {
              actions.push(`updated prices for ${priceUpdatedCount} item${priceUpdatedCount === 1 ? '' : 's'}`);
            }
            
            if (actions.length > 0) {
              message = `✅ Cart fixed! ${actions.join(', ').replace(/,([^,]*)$/, ' and$1')}.`;
            } else {
              message = '✅ Your cart is already up to date!';
            }
            
            // Temporarily show success message
            set({ error: message });
            setTimeout(() => {
              const currentState = get();
              if (currentState.error === message) {
                set({ error: null });
              }
            }, 3000);
          }
        } catch (error) {
          console.error('Error removing unavailable items:', error);
          set({ error: 'Failed to update cart. Please try again.' });
        }
      },

      setError: (error) => {
        set({ error });
      },

      // WebSocket methods
      startWebSocketConnection: () => {
        const state = get();
        
        // Don't start if already connected
        if (state.websocketConnected) {
          return true;
        }

        try {
          // Get restaurant ID from auth store or localStorage
          const authState = useAuthStore.getState();
          const restaurantId = authState.user?.restaurant_id || localStorage.getItem('restaurant_id') || '1';
          
          // Initialize WebSocket connection
          const connected = wholesaleWebSocket.initialize(restaurantId);
          
          if (connected) {
            // Subscribe to inventory updates for real-time stock changes
            wholesaleWebSocket.subscribeToInventory((update: WholesaleItemStockUpdate) => {
              get().handleInventoryUpdate(update);
            });
            
            set({ websocketConnected: true });
            console.log('[WholesaleCart] WebSocket connected successfully');
            return true;
          } else {
            console.warn('[WholesaleCart] WebSocket connection failed');
            set({ websocketConnected: false });
            return false;
          }
        } catch (error) {
          console.error('[WholesaleCart] WebSocket connection error:', error);
          set({ websocketConnected: false });
          return false;
        }
      },

      stopWebSocketConnection: () => {
        try {
          wholesaleWebSocket.unsubscribeFromInventory();
          set({ websocketConnected: false });
          console.log('[WholesaleCart] WebSocket disconnected');
        } catch (error) {
          console.error('[WholesaleCart] Error disconnecting WebSocket:', error);
        }
      },

      handleInventoryUpdate: (update: WholesaleItemStockUpdate) => {
        const state = get();
        
        // Update cart items if any match the updated item
        const updatedItems = state.items.map(cartItem => {
          if (cartItem.itemId === update.id) {
            // If item is out of stock, optionally show a warning
            if (!update.inStock) {
              set({ 
                error: `${update.name} is now out of stock. Please review your cart.` 
              });
            }
            
            return {
              ...cartItem,
              updatedAt: new Date().toISOString()
            };
          }
          return cartItem;
        });
        
        // Update items if any changes were made
        if (updatedItems.some((item, index) => item !== state.items[index])) {
          set({ items: updatedItems });
          console.log('[WholesaleCart] Cart updated due to inventory change:', update);
        }
      }
    }),
    {
      name: 'wholesale-cart-storage',
      partialize: (state) => ({
        items: state.items,
        fundraiser: state.fundraiser
      })
    }
  )
);