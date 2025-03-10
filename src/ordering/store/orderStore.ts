// src/ordering/store/orderStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

import type { Order, OrderItem } from '../types/order';

// Define CartItem type since it's not exported from menu.ts
export interface CartItem extends Omit<OrderItem, 'id'> {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  customizations?: any[];
  advance_notice_hours?: number;
  image?: string; // Add image property
  type?: 'food' | 'merchandise'; // Type of item
  variant_id?: number; // For merchandise items with variants
  size?: string; // For merchandise items
  color?: string; // For merchandise items
}

interface OrderStore {
  orders: Order[];
  loading: boolean;
  error: string | null;

  fetchOrders: () => Promise<void>;
  fetchOrdersQuietly: () => Promise<void>;

  /** Creates a new order in the backend and returns it. */
  addOrder: (
    items: CartItem[],
    total: number,
    specialInstructions: string,
    contactName?: string,
    contactPhone?: string,
    contactEmail?: string,
    transactionId?: string,
    paymentMethod?: string,
    vipCode?: string
  ) => Promise<Order>;

  /** Update just status + optional pickupTime. */
  updateOrderStatus: (orderId: string, status: string, pickupTime?: string) => Promise<void>;
  
  /** Update status without showing loading state (for smoother UI) */
  updateOrderStatusQuietly: (orderId: string, status: string, pickupTime?: string) => Promise<void>;

  /** For admin editing an entire order's data (items, total, instructions, etc.). */
  updateOrderData: (orderId: string, updatedOrder: any) => Promise<void>;

  getOrderHistory: (userId: number) => Order[];

  // CART
  cartItems: CartItem[];
  
  /** Utility function to generate a unique key for an item based on id and customizations */
  _getItemKey: (item: any) => string;
  
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  setCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Per‐item notes
  setCartItemNotes: (itemId: string, notes: string) => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: [],
      loading: false,
      error: null,

  // GET /orders - fetch all pages for user's order history
  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      // Start with page 1
      let currentPage = 1;
      let allOrders: Order[] = [];
      let hasMorePages = true;
      
      // Fetch all pages
      while (hasMorePages) {
        // Handle the paginated response format
        const response = await api.get<{orders: Order[], total_count: number, page: number, per_page: number}>(`/orders?page=${currentPage}&per_page=10`);
        
        // Extract the orders array from the response
        const pageOrders = response.orders || [];
        allOrders = [...allOrders, ...pageOrders];
        
        // Calculate if there are more pages
        const totalPages = Math.ceil(response.total_count / response.per_page);
        hasMorePages = currentPage < totalPages;
        currentPage++;
        
        // Safety check to prevent infinite loops
        if (currentPage > 10) break;
      }
      
      set({ orders: allOrders, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

      // GET /orders without showing loading state - fetch all pages
      fetchOrdersQuietly: async () => {
        try {
          // Start with page 1
          let currentPage = 1;
          let allOrders: Order[] = [];
          let hasMorePages = true;
          
          // Fetch all pages
          while (hasMorePages) {
            // Handle the paginated response format
            const response = await api.get<{orders: Order[], total_count: number, page: number, per_page: number}>(`/orders?page=${currentPage}&per_page=10`);
            
            // Extract the orders array from the response
            const pageOrders = response.orders || [];
            allOrders = [...allOrders, ...pageOrders];
            
            // Calculate if there are more pages
            const totalPages = Math.ceil(response.total_count / response.per_page);
            hasMorePages = currentPage < totalPages;
            currentPage++;
            
            // Safety check to prevent infinite loops
            if (currentPage > 10) break;
          }
          
          // Only update orders, don't change loading state
          set({ orders: allOrders });
        } catch (err: any) {
          // Only update error, don't change loading state
          set({ error: err.message });
          console.error('Error fetching orders:', err.message);
        }
      },

      // POST /orders
      addOrder: async (
        items,
        total,
        specialInstructions,
        contactName,
        contactPhone,
        contactEmail,
        transactionId,
        paymentMethod = 'credit_card',
        vipCode
      ) => {
        set({ loading: true, error: null });
        try {
          // Separate food items and merchandise items
          const foodItems = items.filter(item => item.type !== 'merchandise');
          const merchandiseItems = items.filter(item => item.type === 'merchandise');
          
          const payload = {
            order: {
              items: foodItems.map((i) => ({
                id: i.id,
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                customizations: i.customizations,
                notes: i.notes,
              })),
              merchandise_items: merchandiseItems.map((i) => ({
                id: i.id,
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                variant_id: i.variant_id,
                size: i.size,
                color: i.color,
                notes: i.notes,
              })),
              total,
              special_instructions: specialInstructions,
              contact_name: contactName,
              contact_phone: contactPhone,
              contact_email: contactEmail,
              transaction_id: transactionId,
              payment_method: paymentMethod,
              vip_code: vipCode,
            },
          };

          const newOrder = await api.post<Order>('/orders', payload);

          // Insert new order into state
          set({
            orders: [...get().orders, newOrder],
            loading: false,
          });

          // clear cart
          set({ cartItems: [] });

          return newOrder;
        } catch (err: any) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      /**
       * PATCH /orders/:id
       * Optionally pass in `pickupTime` if we want to set `estimated_pickup_time` too.
       */
      updateOrderStatus: async (orderId, status, pickupTime) => {
        set({ loading: true, error: null });
        try {
          const orderPayload: any = { status };
          if (pickupTime) {
            orderPayload.estimated_pickup_time = pickupTime;
          }
          const updatedOrder = await api.patch<Order>(`/orders/${orderId}`, {
            order: orderPayload,
          });
          const updatedOrders = get().orders.map((o) =>
            o.id === updatedOrder.id ? updatedOrder : o
          );
          set({ orders: updatedOrders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      /**
       * PATCH /orders/:id without showing loading state
       * For smoother UI transitions when changing order status
       */
      updateOrderStatusQuietly: async (orderId, status, pickupTime) => {
        // Don't set loading state
        set({ error: null });
        
        // Optimistically update the UI
        const orderToUpdate = get().orders.find(o => o.id === orderId);
        if (orderToUpdate) {
          // Cast status to the correct type for Order
          const typedStatus = status as Order['status'];
          const optimisticOrder = { ...orderToUpdate, status: typedStatus };
          
          if (pickupTime) {
            (optimisticOrder as any).estimated_pickup_time = pickupTime;
            (optimisticOrder as any).estimatedPickupTime = pickupTime;
          }
          
          const optimisticOrders = get().orders.map((o) =>
            o.id === orderId ? optimisticOrder : o
          );
          
          set({ orders: optimisticOrders });
        }
        
        try {
          const orderPayload: any = { status };
          if (pickupTime) {
            orderPayload.estimated_pickup_time = pickupTime;
          }
          
          // Make the API call
          const updatedOrder = await api.patch<Order>(`/orders/${orderId}`, {
            order: orderPayload,
          });
          
          // Update with the actual server response
          const updatedOrders = get().orders.map((o) =>
            o.id === updatedOrder.id ? updatedOrder : o
          );
          
          set({ orders: updatedOrders });
          // Don't return the updatedOrder, just return void to match the interface
        } catch (err: any) {
          // If there's an error, revert the optimistic update
          set({ error: err.message });
          
          // Refresh orders to ensure UI is in sync with server
          try {
            // Start with page 1
            let currentPage = 1;
            let allOrders: Order[] = [];
            let hasMorePages = true;
            
            // Fetch all pages
            while (hasMorePages) {
              // Handle the paginated response format
              const response = await api.get<{orders: Order[], total_count: number, page: number, per_page: number}>(`/orders?page=${currentPage}&per_page=10`);
              
              // Extract the orders array from the response
              const pageOrders = response.orders || [];
              allOrders = [...allOrders, ...pageOrders];
              
              // Calculate if there are more pages
              const totalPages = Math.ceil(response.total_count / response.per_page);
              hasMorePages = currentPage < totalPages;
              currentPage++;
              
              // Safety check to prevent infinite loops
              if (currentPage > 10) break;
            }
            
            set({ orders: allOrders });
          } catch (refreshErr: any) {
            console.error('Error refreshing orders after failed update:', refreshErr);
          }
          
          throw err;
        }
      },

      /** The new method: pass a whole updated order, we send it in a PATCH. */
      updateOrderData: async (orderId, updatedOrder) => {
        set({ loading: true, error: null });
        try {
          const payload = { order: updatedOrder };
          const resp = await api.patch<Order>(`/orders/${orderId}`, payload);
          const updatedOrders = get().orders.map((o) =>
            o.id === resp.id ? resp : o
          );
          set({ orders: updatedOrders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      getOrderHistory: (userId) => {
        // Filter orders by user ID if available
        // Check both user_id (from API) and userId (camelCase version) for compatibility
        return get().orders.filter((o) => 
          (o as any).user_id === userId || (o as any).userId === userId
        );
      },

      // CART -------------
      cartItems: [],
      // Helper function to generate a unique key for cart items based on ID and customizations
      // This allows distinguishing between same menu items with different customizations
      _getItemKey: (item: any): string => {
        let customizationsKey = '';
        
        if (item.customizations) {
          // Check if customizations is an array (which can be sorted directly)
          if (Array.isArray(item.customizations)) {
            // If it's an array of customization objects with option_id and option_group_id
            customizationsKey = JSON.stringify(item.customizations.sort((a: any, b: any) => 
              // Sort by option_group_id first, then by option_id
              a.option_group_id === b.option_group_id 
                ? (a.option_id - b.option_id)
                : (a.option_group_id - b.option_group_id)
            ));
          } else {
            // If it's an object where keys are group names and values are arrays of option names
            // Convert to stable sortable string representation
            const sortedGroups = Object.keys(item.customizations).sort();
            const sortedCustomizations = sortedGroups.map(groupName => {
              const options = item.customizations[groupName];
              return `${groupName}:${Array.isArray(options) ? [...options].sort().join(',') : options}`;
            });
            customizationsKey = JSON.stringify(sortedCustomizations);
          }
        }
        
        return `${item.id}-${customizationsKey}`;
      },
      
      addToCart: (item, quantity = 1) => {
        set((state) => {
          // Get the unique key for this item with its customizations
          const getItemKey = get()._getItemKey;
          const itemKey = getItemKey(item);
          
          // Find if this exact item (with same customizations) already exists
          const existing = state.cartItems.find((ci) => getItemKey(ci) === itemKey);
          
          if (existing) {
            // Update quantity of existing item with same customizations
            return {
              cartItems: state.cartItems.map((ci) =>
                getItemKey(ci) === itemKey
                  ? { ...ci, quantity: ci.quantity + quantity }
                  : ci
              ),
            };
          } else {
            // Add as a new item
            return {
              cartItems: [...state.cartItems, { ...item, quantity }],
            };
          }
        });
      },
      removeFromCart: (itemId) => {
        set((state) => {
          // Generate a key using the composite approach or find by ID if it's already a generated key
          // This handles both direct IDs and composite keys with customizations
          const itemToRemove = state.cartItems.find(ci => 
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          
          if (!itemToRemove) return state;
          
          // Generate the full key for the item
          const fullKey = get()._getItemKey(itemToRemove);
          
          // Remove the item with the matching key
          return {
            cartItems: state.cartItems.filter(ci => get()._getItemKey(ci) !== fullKey)
          };
        });
      },
      
      setCartQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          // Use removeFromCart to ensure consistency
          get().removeFromCart(itemId);
        } else {
          set((state) => {
            // Find the item either by its ID or its complete composite key
            const itemToUpdate = state.cartItems.find(ci => 
              ci.id === itemId || get()._getItemKey(ci) === itemId
            );
            
            if (!itemToUpdate) return state;
            
            // Generate the full key for the item
            const fullKey = get()._getItemKey(itemToUpdate);
            
            // Update the quantity of the matching item
            return {
              cartItems: state.cartItems.map(ci => 
                get()._getItemKey(ci) === fullKey
                  ? { ...ci, quantity }
                  : ci
              )
            };
          });
        }
      },
      clearCart: () => {
        set({ cartItems: [] });
      },
      setCartItemNotes: (itemId, notes) => {
        set((state) => {
          // Find the item either by its ID or its complete composite key
          const itemToUpdate = state.cartItems.find(ci => 
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          
          if (!itemToUpdate) return state;
          
          // Generate the full key for the item
          const fullKey = get()._getItemKey(itemToUpdate);
          
          // Update the notes of the matching item
          return {
            cartItems: state.cartItems.map(ci => 
              get()._getItemKey(ci) === fullKey
                ? { ...ci, notes }
                : ci
            )
          };
        });
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ cartItems: state.cartItems }),
    }
  )
);
