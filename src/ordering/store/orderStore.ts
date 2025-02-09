// src/ordering/store/orderStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';

import type { Order } from '../types/order';
import type { CartItem } from '../types/menu';

interface OrderStore {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;

  /** Creates a new order in the backend and returns it. */
  addOrder: (
    items: CartItem[],
    total: number,
    specialInstructions: string,
    contactName?: string,
    contactPhone?: string,
    contactEmail?: string
  ) => Promise<Order>;

  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  getOrderHistory: (userId: number) => Order[];  // or string, but be consistent

  // CART
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  setCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Per‐item notes
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
      // Build the request payload
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

      const newOrder = await api.post('/orders', payload);

      // Insert into local store
      set({
        orders: [...get().orders, newOrder],
        loading: false,
      });
      // Clear cart afterwards (optional)
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

  // Filter by userId => must match the 'userId' in the JSON from Rails
  getOrderHistory: (userId) => {
    // If your user’s ID is a string, do: const idNum = Number(userId)
    // But if user.id is numeric, just match directly:
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
        // Increase existing quantity
        return {
          cartItems: state.cartItems.map((ci) =>
            ci.id === item.id
              ? { ...ci, quantity: ci.quantity + quantity }
              : ci
          ),
        };
      } else {
        // Add new item
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
}));
