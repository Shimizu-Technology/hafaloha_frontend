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
  description?: string;
  image?: string;
  customizations?: Record<string, string[]>;
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
    contactEmail?: string
  ) => Promise<Order>;

  /** Update just status + optional pickupTime. */
  updateOrderStatus: (orderId: string, status: string, pickupTime?: string) => Promise<void>;

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

      // GET /orders
      fetchOrders: async () => {
        set({ loading: true, error: null });
        try {
          const orders = await api.get<Order[]>('/orders');
          set({ orders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      // GET /orders without showing loading state
      fetchOrdersQuietly: async () => {
        try {
          const orders = await api.get<Order[]>('/orders');
          // Only update orders, don't change loading state
          set({ orders });
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
        contactEmail
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
        return get().orders.filter((o) => (o as any).userId === userId);
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
