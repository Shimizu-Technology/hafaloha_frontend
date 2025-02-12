// src/ordering/hooks/useOrders.ts
import { useState, useCallback } from 'react';
import { useOrderingApi } from './useOrderingApi';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  customizations?: any;
}
export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: string;
  userId?: number; // etc.
  [key: string]: any; // for any other fields
}

export function useOrders() {
  const { get, post, patch } = useOrderingApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GET /orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get('/orders');
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // POST /orders
  const addOrder = useCallback(
    async ({
      specialInstructions,
      contactName,
      contactPhone,
      contactEmail,
    }: {
      specialInstructions?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const payload = {
          order: {
            items: cartItems.map((i) => ({
              id: i.id,
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              customizations: i.customizations,
              notes: i.notes,
            })),
            total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            special_instructions: specialInstructions,
            contact_name: contactName,
            contact_phone: contactPhone,
            contact_email: contactEmail,
          },
        };
        const newOrder = await post('/orders', payload);
        setOrders((prev) => [...prev, newOrder]);
        // clear cart after successful order
        setCartItems([]);
        return newOrder;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [post, cartItems]
  );

  // PATCH /orders/:id (for status updates, etc.)
  const updateOrderStatus = useCallback(
    async (orderId: string, status: string) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await patch(`/orders/${orderId}`, { order: { status } });
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [patch]
  );

  // Filtering by userId (if needed)
  const getOrderHistory = useCallback(
    (userId: number) => {
      return orders.filter((o) => o.userId === userId);
    },
    [orders]
  );

  // Cart logic: in-memory state
  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
      setCartItems((prev) => {
        const existing = prev.find((p) => p.id === item.id);
        if (existing) {
          return prev.map((p) =>
            p.id === item.id ? { ...p, quantity: p.quantity + quantity } : p
          );
        }
        return [...prev, { ...item, quantity }];
      });
    },
    []
  );

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((p) => p.id !== itemId));
  }, []);

  const setCartQuantity = useCallback((itemId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, quantity } : p))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const setCartItemNotes = useCallback((itemId: string, notes: string) => {
    setCartItems((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, notes } : p))
    );
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    addOrder,
    updateOrderStatus,
    getOrderHistory,

    // Cart
    cartItems,
    addToCart,
    removeFromCart,
    setCartQuantity,
    clearCart,
    setCartItemNotes,
  };
}
