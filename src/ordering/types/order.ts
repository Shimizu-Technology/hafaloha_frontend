// src/ordering/types/order.ts

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  options?: string[];
  notes?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
  subtotal: number;
  tax: number;
  tip?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  pickup_time?: string;
  restaurant_id?: string;
}

export interface OrderManagerProps {
  selectedOrderId: number | null;
  setSelectedOrderId: React.Dispatch<React.SetStateAction<number | null>>;
  restaurantId?: string;
}

export interface ManagerProps {
  restaurantId?: string;
}
