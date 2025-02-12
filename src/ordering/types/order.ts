// src/ordering/types/order.ts
export interface Order {
  id: string;
  userId: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    customizations?: Record<string, string[]>;
  }>;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  total: number;
  specialInstructions?: string;
  promoCode?: string;
  createdAt: string;
  estimatedPickupTime: string;
}