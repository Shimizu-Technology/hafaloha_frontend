// src/wholesale/store/wholesaleCartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '../../shared/auth/authStore';
import wholesaleWebSocket, { WholesaleItemStockUpdate } from '../services/wholesaleWebSocket';

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
        
        // TODO: Add API call to validate items are still available/prices haven't changed
        // For now, assume cart is valid
        set({ error: null });
        return true;
      },

      setLoading: (loading) => {
        set({ loading });
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