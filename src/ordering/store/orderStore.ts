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
    paymentMethod?: string
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
        paymentMethod = 'credit_card'
      ) => {
        set({ loading: true, error: null });
        try {
          const payload = {
            order: {
              items: items.map((i) => ({
                id: i.id,
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                customizations: i.customizations,
                notes: i.notes,
              })),
              total,
              special_instructions: specialInstructions,
              contact_name: contactName,
              contact_phone: contactPhone,
              contact_email: contactEmail,
              transaction_id: transactionId,
              payment_method: paymentMethod,
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
      addToCart: (item, quantity = 1) => {
        set((state) => {
          const existing = state.cartItems.find((ci) => ci.id === item.id);
          if (existing) {
            return {
              cartItems: state.cartItems.map((ci) =>
                ci.id === item.id
                  ? { ...ci, quantity: ci.quantity + quantity }
                  : ci
              ),
            };
          } else {
            return {
              cartItems: [...state.cartItems, { ...item, quantity }],
            };
          }
        });
      },
      removeFromCart: (itemId) => {
        set((state) => ({
          cartItems: state.cartItems.filter((ci) => ci.id !== itemId),
        }));
      },
      setCartQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          set((state) => ({
            cartItems: state.cartItems.filter((ci) => ci.id !== itemId),
          }));
        } else {
          set((state) => ({
            cartItems: state.cartItems.map((ci) =>
              ci.id === itemId ? { ...ci, quantity } : ci
            ),
          }));
        }
      },
      clearCart: () => {
        set({ cartItems: [] });
      },
      setCartItemNotes: (itemId, notes) => {
        set((state) => ({
          cartItems: state.cartItems.map((ci) =>
            ci.id === itemId ? { ...ci, notes } : ci
          ),
        }));
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ cartItems: state.cartItems }),
    }
  )
);
