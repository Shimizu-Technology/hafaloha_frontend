// src/ordering/store/orderStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';

import type { Order } from '../types/order';
import type { CartItem } from '../types/menu';

/**
 * We define the store interface that includes methods to manage both
 * existing orders and the cart state.
 */
interface OrderStore {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;

  /** Creates a new order in the backend and returns it. */
  addOrder: (
    items: CartItem[],
    total: number,
    specialInstructions?: string
  ) => Promise<Order>;

  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  getOrderHistory: (userId: string) => Order[];

  // Cart
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  setCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // NEW: to update per-item notes
  setCartItemNotes: (itemId: string, notes: string) => void;
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
      // Build the request payload
      const payload = {
        order: {
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            customizations: i.customizations,
            // Include the notes if present
            notes: i.notes,
          })),
          total,
          special_instructions: specialInstructions,
        },
      };

      const newOrder = await api.post('/orders', payload);

      set({
        orders: [...get().orders, newOrder],
        loading: false,
      });
      // Optionally clear cart after order
      set({ cartItems: [] });

      return newOrder;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
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

  // Local helper to filter by user ID
  getOrderHistory: (userId: string) => {
    return get().orders.filter((o) => o.userId === userId);
  },

  // -------------------------
  // CART STATE
  // -------------------------
  cartItems: [],

  addToCart: (item, quantity = 1) => {
    set((state) => {
      const existing = state.cartItems.find((ci) => ci.id === item.id);
      if (existing) {
        // Increase existing item's quantity
        return {
          cartItems: state.cartItems.map((ci) =>
            ci.id === item.id
              ? { ...ci, quantity: ci.quantity + quantity }
              : ci
          ),
        };
      } else {
        // Add new cart item
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

  // NEW: setCartItemNotes
  setCartItemNotes: (itemId, notes) => {
    set((state) => ({
      cartItems: state.cartItems.map((ci) =>
        ci.id === itemId ? { ...ci, notes } : ci
      ),
    }));
  },
}));
