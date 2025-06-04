// src/ordering/wholesale/services/fundraiserOrderService.ts

import axios from 'axios';
import { CartItem } from '../store/cartStore';
import { getRequestHeaders, getRequestParams } from '../../../shared/utils/authUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface OrderPayload {
  items: {
    id: number;
    quantity: number;
    price: number;
    name: string;
    participant_id: number;
  }[];
  total: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  shipping_address?: {
    address: string;
    city: string;
    state: string;
    zip_code: string;
  };
  special_instructions?: string;
  transaction_id?: string;
  payment_method: string;
  payment_details?: any;
  fundraiser_id: number;
  fulfillment_method?: 'pickup' | 'shipping';
  pickup_location_id?: number;
}

interface OrderResponse {
  id: number;
  status: string;
  total: number;
  items: any[];
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  shipping_address: {
    address: string;
    city: string;
    state: string;
    zip_code: string;
  };
  special_instructions?: string;
  transaction_id?: string;
  payment_method: string;
  fundraiser_id: number;
  created_at: string;
  updated_at: string;
  order_number: string;
  fulfillment_method: 'pickup' | 'shipping';
  pickup_location_id?: number;
  pickup_location?: {
    id: number;
    name: string;
    address: string;
    phone_number?: string;
  };
  fundraiser?: {
    id: number;
    name: string;
    slug: string;
    description: string;
    banner_image_url: string;
  };
  fundraiser_participant?: {
    id: number;
    name: string;
    fundraiser_id: number;
  };
}

interface OrdersResponse {
  orders: OrderResponse[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface OrderStats {
  total_orders: number;
  total_revenue: number;
  fundraiser_stats: {
    id: number;
    name: string;
    order_count: number;
    total_revenue: number;
  }[];
  participant_stats: {
    id: number;
    name: string;
    fundraiser_id: number;
    order_count: number;
    total_revenue: number;
  }[];
}

const fundraiserOrderService = {
  /**
   * Create a new fundraiser order with a custom payload
   * This is used by the updated wholesale checkout flow
   */
  createOrderCustom: async (payload: OrderPayload): Promise<OrderResponse> => {
    // Get authentication and restaurant context headers
    const headers = getRequestHeaders();
    
    // Create a clean payload with only the fields the backend expects
    // This prevents both shipping_address errors and nested fundraiser_order duplication
    const cleanPayload = {
      items: payload.items,
      total: payload.total,
      contact_name: payload.contact_name,
      contact_email: payload.contact_email,
      contact_phone: payload.contact_phone,
      transaction_id: payload.transaction_id,
      payment_method: payload.payment_method,
      payment_details: payload.payment_details,
      fundraiser_id: payload.fundraiser_id,
      fulfillment_method: payload.fulfillment_method,
      pickup_location_id: payload.pickup_location_id
    };
    
    // Set custom content type to ensure proper request formatting
    headers['Content-Type'] = 'application/json';
    
    // Use direct axios call with stringified payload to prevent any automatic nesting
    const response = await axios.post(
      `${API_URL}/wholesale/fundraiser_orders`,
      JSON.stringify(cleanPayload),
      { headers }
    );

    return response.data;
  },

  /**
   * Create a new fundraiser order
   */
  createOrder: async (
    cartItems: CartItem[],
    fundraiserId: number,
    contactInfo: {
      name: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
    },
    paymentInfo: {
      transactionId?: string;
      paymentMethod: string;
      paymentDetails?: any;
    },
    specialInstructions?: string
  ): Promise<OrderResponse> => {
    // Get authentication and restaurant context headers
    const headers = getRequestHeaders();

    // Format items for API
    const items = cartItems.map((item) => ({
      id: item.item.id,
      quantity: item.quantity,
      price: item.item.price,
      name: item.item.name,
      participant_id: item.participantId,
    }));

    // Calculate total
    const total = cartItems.reduce(
      (sum, item) => sum + item.item.price * item.quantity,
      0
    );

    // Create a clean payload with only the fields the backend expects
    const cleanPayload = {
      items,
      total,
      contact_name: contactInfo.name,
      contact_email: contactInfo.email,
      contact_phone: contactInfo.phone,
      // Removed shipping_address to prevent database errors
      special_instructions: specialInstructions,
      transaction_id: paymentInfo.transactionId,
      payment_method: paymentInfo.paymentMethod,
      payment_details: paymentInfo.paymentDetails,
      fundraiser_id: fundraiserId,
      // Default to pickup for fundraiser orders
      fulfillment_method: 'pickup'
    };
    
    // Set custom content type to ensure proper request formatting
    headers['Content-Type'] = 'application/json';

    // Use direct axios call with stringified payload to prevent any automatic nesting
    const response = await axios.post(
      `${API_URL}/wholesale/fundraiser_orders`,
      JSON.stringify(cleanPayload),
      { headers }
    );

    return response.data;
  },

  /**
   * Get order by ID
   */
  getOrder: async (orderId: number): Promise<OrderResponse> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraiser_orders/${orderId}`,
      { headers, params }
    );
    return response.data;
  },

  /**
   * Get orders for a fundraiser
   */
  getOrdersByFundraiser: async (fundraiserId: number, page = 1, perPage = 10): Promise<OrdersResponse> => {
    const headers = getRequestHeaders();
    const params = getRequestParams({
      fundraiser_id: fundraiserId,
      page,
      per_page: perPage
    });
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraiser_orders/by_fundraiser`,
      { headers, params }
    );
    return response.data;
  },

  /**
   * Get orders for a participant
   */
  getOrdersByParticipant: async (participantId: number, page = 1, perPage = 10): Promise<OrdersResponse> => {
    const headers = getRequestHeaders();
    const params = getRequestParams({
      participant_id: participantId,
      page,
      per_page: perPage
    });
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraiser_orders/by_participant`,
      { headers, params }
    );
    return response.data;
  },

  /**
   * Get all fundraiser orders
   */
  getAllOrders: async (page = 1, perPage = 10, filters = {}): Promise<OrdersResponse> => {
    const headers = getRequestHeaders();
    const params = getRequestParams({
      page,
      per_page: perPage,
      ...filters
    });
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraiser_orders`,
      { headers, params }
    );
    return response.data;
  },

  /**
   * Get fundraiser order statistics
   */
  getOrderStats: async (): Promise<OrderStats> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraiser_orders/stats`,
      { headers, params }
    );
    return response.data;
  },

  /**
   * Get orders for a user
   */
  getUserOrders: async (userId: number): Promise<OrderResponse[]> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    
    const response = await axios.get(
      `${API_URL}/users/${userId}/fundraiser_orders`,
      { headers, params }
    );
    return response.data;
  },

  /**
   * Bulk update order statuses
   */
  bulkUpdateStatus: async (orderIds: number[], status: string): Promise<{ success: boolean, count: number }> => {
    return axios
      .put(`${API_URL}/fundraiser-orders/bulk-update`, 
        { order_ids: orderIds, status }, 
        {
          headers: getRequestHeaders(),
          params: getRequestParams()
        }
      )
      .then(response => response.data)
      .catch(error => {
        console.error('Error updating order statuses:', error);
        throw error;
      });
  },

  /**
   * Export orders to CSV
   */
  exportOrders(orderIds: number[]): Promise<Blob> {
    return axios
      .post(
        `${API_URL}/fundraiser_orders/export`,
        { order_ids: orderIds },
        {
          headers: {
            ...getRequestHeaders(),
            'Content-Type': 'application/json',
            'Accept': 'text/csv'
          },
          params: getRequestParams(),
          responseType: 'blob'
        }
      )
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
  },

  /**
   * Update an existing fundraiser order
   */
  updateOrder(orderId: number, updates: { status?: string; admin_notes?: string }): Promise<OrderResponse> {
    return axios
      .put(
        `${API_URL}/fundraiser_orders/${orderId}`,
        updates,
        {
          headers: {
            ...getRequestHeaders(),
            'Content-Type': 'application/json'
          },
          params: getRequestParams()
        }
      )
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
  },

};

export default fundraiserOrderService;
