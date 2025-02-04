// src/ordering/store/orderStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';

import type { Order } from '../types/order';
import type { CartItem } from '../types/menu'; // e.g. { id, name, price, quantity, customizations? }

interface OrderStore {
  /** Existing order-related state and methods */
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  addOrder: (items: CartItem[], total: number, specialInstructions?: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  getOrderHistory: (userId: string) => Order[];

  /** New cart-related state and methods */
  cartItems: CartItem[]; 
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  setCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  // -------------------------
  // ORDER STATE
  // -------------------------
  orders: [],
  loading: false,
  error: null,

  // GET /orders
  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const orders = await api.get('/orders');
      set({ orders, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // POST /orders
  addOrder: async (items, total, specialInstructions) => {
    set({ loading: true, error: null });
    try {
      // Transform cart items to match your backend’s expected structure
      const payload = {
        order: {
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            customizations: i.customizations,
          })),
          total,
          special_instructions: specialInstructions,
        },
      };

      const newOrder = await api.post('/orders', payload);
      // Add newly created order to local state
      set({ orders: [...get().orders, newOrder], loading: false });

      // Optionally clear the cart after a successful order
      set({ cartItems: [] });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // PATCH /orders/:id
  updateOrderStatus: async (orderId, status) => {
    set({ loading: true, error: null });
    try {
      const updatedOrder = await api.patch(`/orders/${orderId}`, {
        order: { status },
      });
      const updatedOrders = get().orders.map((o) =>
        o.id === updatedOrder.id ? updatedOrder : o
      );
      set({ orders: updatedOrders, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Filter local orders by user
  getOrderHistory: (userId: string) => {
    return get().orders.filter((o) => o.userId === userId);
  },

  // -------------------------
  // CART STATE
  // -------------------------
  cartItems: [],

  // Example addToCart: merges quantity if item already exists
  addToCart: (item, quantity = 1) => {
    set((state) => {
      const existing = state.cartItems.find((ci) => ci.id === item.id);
      if (existing) {
        // Increase existing item’s quantity
        return {
          cartItems: state.cartItems.map((ci) =>
            ci.id === item.id
              ? { ...ci, quantity: ci.quantity + quantity }
              : ci
          ),
        };
      } else {
        // Add a new cart item
        return {
          cartItems: [
            ...state.cartItems,
            { ...item, quantity },
          ],
        };
      }
    });
  },

  removeFromCart: (itemId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.id !== itemId),
    }));
  },

  // Sets a specific item’s quantity (removes if quantity <= 0)
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
}));
