// src/ordering/store/orderStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { Order, OrderItem } from '../types/order';
import websocketService from '../../shared/services/websocketService';
import { useAuthStore } from './authStore';

/** CartItem for local cart usage. */
export interface CartItem extends Omit<OrderItem, 'id'> {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  customizations?: any[];
  advance_notice_hours?: number;
  image?: string;
  type?: 'food' | 'merchandise';
  variant_id?: number;
  size?: string;
  color?: string;
}

interface OrderStore {
  orders: Order[];
  loading: boolean;
  error: string | null;
  websocketConnected: boolean;
  pollingInterval: number | null;

  // WebSocket methods
  startWebSocketConnection: () => void;
  stopWebSocketConnection: () => void;
  handleNewOrder: (order: Order) => void;
  handleOrderUpdate: (order: Order) => void;
  
  // Polling methods (fallback)
  startOrderPolling: () => void;
  stopOrderPolling: () => void;

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
    vipCode?: string,
    staffModal?: boolean,
    paymentDetails?: any
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
      websocketConnected: false,
      pollingInterval: null,
      
      // ---------------------------------------------------------
      // WebSocket Methods
      // ---------------------------------------------------------
      startWebSocketConnection: () => {
        // First stop any existing connections or polling
        get().stopWebSocketConnection();
        get().stopOrderPolling();
        
        const user = useAuthStore.getState().user;
        if (!user?.restaurant_id) {
          console.error('[OrderStore] Cannot start WebSocket connection: No restaurant ID');
          return;
        }
        
        // Define callbacks for WebSocket events
        const callbacks = {
          onNewOrder: (order: Order) => {
            get().handleNewOrder(order);
          },
          onOrderUpdated: (order: Order) => {
            get().handleOrderUpdate(order);
          },
          onConnected: () => {
            set({ websocketConnected: true });
            console.debug('[OrderStore] WebSocket connected');
          },
          onDisconnected: () => {
            set({ websocketConnected: false });
            console.debug('[OrderStore] WebSocket disconnected');
            
            // Fallback to polling if WebSocket disconnects
            get().startOrderPolling();
          },
          onError: (error: any) => {
            console.error('[OrderStore] WebSocket error:', error);
            
            // Fallback to polling on error
            get().startOrderPolling();
          }
        };
        
        // Connect to WebSocket
        websocketService.connect(user.restaurant_id, callbacks);
      },
      
      stopWebSocketConnection: () => {
        if (get().websocketConnected) {
          websocketService.disconnect('orderStore');
          set({ websocketConnected: false });
        }
      },
      
      handleNewOrder: (order: Order) => {
        if (!order || !order.id) return;
        
        console.debug('[OrderStore] Received new order via WebSocket:', order.id);
        
        // Check if we already have this order
        const existingOrderIndex = get().orders.findIndex(o => o.id === order.id);
        
        if (existingOrderIndex === -1) {
          // Add the new order to the store
          set(state => ({
            orders: [order, ...state.orders]
          }));
        }
      },
      
      handleOrderUpdate: (order: Order) => {
        if (!order || !order.id) return;
        
        console.debug('[OrderStore] Received order update via WebSocket:', order.id);
        
        // Update the specific order in the store
        set(state => ({
          orders: state.orders.map(o => 
            o.id === order.id ? { ...o, ...order } : o
          )
        }));
      },
      
      // ---------------------------------------------------------
      // Polling Methods (Fallback)
      // ---------------------------------------------------------
      startOrderPolling: () => {
        // First stop any existing polling
        get().stopOrderPolling();
        
        // Log that we're falling back to polling
        console.debug('[OrderStore] Starting polling for orders (WebSocket fallback)');
        
        // Start a new polling interval
        const intervalId = window.setInterval(async () => {
          console.debug('[OrderStore] Polling for orders');
          await get().fetchOrdersQuietly();
        }, 30000); // Poll every 30 seconds
        
        // Store the interval ID so we can clear it later
        set({ pollingInterval: intervalId });
      },
      
      stopOrderPolling: () => {
        const { pollingInterval } = get();
        
        if (pollingInterval !== null) {
          window.clearInterval(pollingInterval);
          set({ pollingInterval: null });
        }
      },

      // ---------------------------------------------------------
      // Fetch all orders with pagination
      // ---------------------------------------------------------
      fetchOrders: async () => {
        set({ loading: true, error: null });
        try {
          let currentPage = 1;
          let allOrders: Order[] = [];
          let hasMorePages = true;
          while (hasMorePages) {
            const response = await api.get<{
              orders: Order[];
              total_count: number;
              page: number;
              per_page: number;
            }>(`/orders?page=${currentPage}&per_page=10`);
            const pageOrders = response.orders || [];
            allOrders = [...allOrders, ...pageOrders];
            const totalPages = Math.ceil(response.total_count / response.per_page);
            hasMorePages = currentPage < totalPages;
            currentPage++;
            if (currentPage > 20) break; // safety
          }
          set({ orders: allOrders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      // ---------------------------------------------------------
      // Fetch quietly (no loading state) 
      // ---------------------------------------------------------
      fetchOrdersQuietly: async () => {
        try {
          // Start with page 1
          let currentPage = 1;
          let allOrders: Order[] = [];
          let hasMorePages = true;
          
          // Fetch all pages
          while (hasMorePages) {
            const response = await api.get<{
              orders: Order[];
              total_count: number;
              page: number;
              per_page: number;
            }>(`/orders?page=${currentPage}&per_page=10`);
            const pageOrders = response.orders || [];
            allOrders = [...allOrders, ...pageOrders];
            
            // Calculate if there are more pages
            const totalPages = Math.ceil(response.total_count / response.per_page);
            hasMorePages = currentPage < totalPages;
            currentPage++;
            if (currentPage > 20) break;
          }
          
          // Only update orders, don't change loading state
          set({ orders: allOrders });
        } catch (err: any) {
          // Only update error, don't change loading state
          set({ error: err.message });
          console.error('Error fetching orders:', err.message);
        }
      },

      // ---------------------------------------------------------
      // Create Order
      // ---------------------------------------------------------
      addOrder: async (
        items,
        total,
        specialInstructions,
        contactName,
        contactPhone,
        contactEmail,
        transactionId,
        paymentMethod = 'credit_card',
        vipCode,
        staffModal = false,
        paymentDetails = null
      ) => {
        // Skip setting loading state since we're showing a payment processing overlay already
        // This avoids unnecessary UI updates that can slow down the process
        set({ error: null });
        try {
          // Separate food vs merchandise
          const foodItems = [];
          const merchandiseItems = [];
          
          // Single-pass categorization is more efficient
          for (const item of items) {
            if (item.type === 'merchandise') {
              merchandiseItems.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                variant_id: item.variant_id,
                size: item.size,
                color: item.color,
                notes: item.notes
              });
            } else {
              foodItems.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                customizations: item.customizations,
                notes: item.notes
              });
            }
          }

          const payload = {
            order: {
              items: foodItems,
              merchandise_items: merchandiseItems,
              total,
              special_instructions: specialInstructions,
              contact_name: contactName,
              contact_phone: contactPhone,
              contact_email: contactEmail,
              transaction_id: transactionId,
              payment_method: paymentMethod,
              vip_code: vipCode,
              staff_modal: staffModal,
              payment_details: paymentDetails
            },
          };

          // Optimistic UI: create a temporary order
          const tempId = `temp-${Date.now()}`;
          const optimisticOrder: Order = {
            id: tempId,
            status: 'pending',
            items: foodItems,
            merchandise_items: merchandiseItems,
            total,
            special_instructions: specialInstructions,
            contact_name: contactName || '',
            contact_phone: contactPhone || '',
            contact_email: contactEmail || '',
            transaction_id: transactionId || '',
            payment_method: paymentMethod,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set({
            orders: [...get().orders, optimisticOrder],
            cartItems: [] // Clear the cart right away for fast UI
          });

          // Real API call
          const newOrder = await api.post<Order>('/orders', payload);

          // Replace the optimistic order with the real one
          set({
            orders: get().orders.map(order => 
              order.id === tempId ? newOrder : order
            )
          });

          return newOrder;
        } catch (err: any) {
          set({ error: err.message });
          console.error('Failed to create order:', err);
          return {
            id: `error-${Date.now()}`,
            status: 'error',
            error: err.message
          } as any;
        }
      },

      // ---------------------------------------------------------
      // Update order status
      // ---------------------------------------------------------
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
          const updatedOrders = get().orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
          set({ orders: updatedOrders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      // ---------------------------------------------------------
      // Update order status quietly (no loading spinner)
      // ---------------------------------------------------------
      updateOrderStatusQuietly: async (orderId, status, pickupTime) => {
        set({ error: null });
        const existingOrder = get().orders.find(o => o.id === orderId);
        if (existingOrder) {
          const typedStatus = status as Order['status'];
          const optimisticOrder = { ...existingOrder, status: typedStatus };
          if (pickupTime) {
            (optimisticOrder as any).estimated_pickup_time = pickupTime;
          }
          const optimisticOrders = get().orders.map(o =>
            o.id === orderId ? optimisticOrder : o
          );
          set({ orders: optimisticOrders });
        }
        try {
          const orderPayload: any = { status };
          if (pickupTime) {
            orderPayload.estimated_pickup_time = pickupTime;
          }
          const updatedOrder = await api.patch<Order>(`/orders/${orderId}`, {
            order: orderPayload,
          });
          const newOrders = get().orders.map(o =>
            o.id === updatedOrder.id ? updatedOrder : o
          );
          set({ orders: newOrders });
        } catch (err: any) {
          set({ error: err.message });
          // revert or re-fetch if needed
        }
      },

      // ---------------------------------------------------------
      // Update entire order
      // ---------------------------------------------------------
      updateOrderData: async (orderId, updatedOrder) => {
        set({ loading: true, error: null });
        try {
          const resp = await api.patch<Order>(`/orders/${orderId}`, {
            order: updatedOrder
          });
          const updatedOrders = get().orders.map(o =>
            o.id === resp.id ? resp : o
          );
          set({ orders: updatedOrders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      // ---------------------------------------------------------
      // Return order history for a user
      // ---------------------------------------------------------
      getOrderHistory: (userId: number) => {
        return get().orders.filter(o => (o as any).user_id === userId || (o as any).userId === userId);
      },

      // ---------------------------------------------------------
      // CART
      // ---------------------------------------------------------
      cartItems: [],
      _getItemKey: (item: any): string => {
        let customizationsKey = '';
        if (item.customizations) {
          if (Array.isArray(item.customizations)) {
            // Sort by group/option ID
            customizationsKey = JSON.stringify(
              item.customizations.sort((a: any, b: any) => {
                if (a.option_group_id === b.option_group_id) {
                  return a.option_id - b.option_id;
                }
                return a.option_group_id - b.option_group_id;
              })
            );
          } else {
            // Object-based
            const sortedGroups = Object.keys(item.customizations).sort();
            const groupStrings = sortedGroups.map(groupName => {
              const options = item.customizations[groupName];
              return `${groupName}:${Array.isArray(options)
                ? [...options].sort().join(',')
                : options}`;
            });
            customizationsKey = JSON.stringify(groupStrings);
          }
        }
        return `${item.id}-${customizationsKey}`;
      },

      addToCart: (item, quantity = 1) => {
        set((state) => {
          const getItemKey = get()._getItemKey;
          const itemKey = getItemKey(item);
          const existing = state.cartItems.find(ci => getItemKey(ci) === itemKey);
          if (existing) {
            return {
              cartItems: state.cartItems.map(ci =>
                getItemKey(ci) === itemKey
                  ? { ...ci, quantity: ci.quantity + quantity }
                  : ci
              )
            };
          }
          return { cartItems: [...state.cartItems, { ...item, quantity }] };
        });
      },

      removeFromCart: (itemId) => {
        set((state) => {
          const itemToRemove = state.cartItems.find(ci =>
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          if (!itemToRemove) return state;
          const fullKey = get()._getItemKey(itemToRemove);
          return {
            cartItems: state.cartItems.filter(ci => get()._getItemKey(ci) !== fullKey)
          };
        });
      },

      setCartQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
        } else {
          set((state) => {
            const itemToUpdate = state.cartItems.find(ci =>
              ci.id === itemId || get()._getItemKey(ci) === itemId
            );
            if (!itemToUpdate) return state;
            const fullKey = get()._getItemKey(itemToUpdate);
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
          const itemToUpdate = state.cartItems.find(ci =>
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          if (!itemToUpdate) return state;
          const fullKey = get()._getItemKey(itemToUpdate);
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
