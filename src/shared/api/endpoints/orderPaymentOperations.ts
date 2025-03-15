import { apiClient } from '../apiClient';

export const orderPaymentOperationsApi = {
  // Create a partial refund
  createPartialRefund: (orderId: number, params: {
    amount: number;
    reason: string;
    items: { id: number | string; name: string; quantity: number; price: number }[];
    refunded_items?: { id: number | string; name: string; quantity: number; price: number }[];
  }) => {
    return apiClient.post(`/orders/${orderId}/payments/refund`, params);
  },
  
  // Add store credit
  addStoreCredit: (orderId: number, params: {
    amount: number;
    reason: string;
    customer_id?: number;
    email?: string;
  }) => {
    return apiClient.post(`/orders/${orderId}/store-credit`, params);
  },
  
  // Just adjust order total (for accounting)
  adjustOrderTotal: (orderId: number, params: {
    new_total: number;
    reason: string;
  }) => {
    return apiClient.post(`/orders/${orderId}/adjust-total`, params);
  },
  
  // Process additional payment
  processAdditionalPayment: (orderId: number, params: {
    items: { id: number | string; name: string; quantity: number; price: number }[];
    payment_method: string;
  }) => {
    return apiClient.post(`/orders/${orderId}/payments/additional`, params);
  },
  
  // Capture additional payment after processing
  captureAdditionalPayment: (orderId: number, params: {
    payment_id: string;
    payment_intent_id?: string;
    order_id?: string;
    items?: any[];
  }) => {
    return apiClient.post(`/orders/${orderId}/payments/additional/capture`, params);
  },
  
  // Get payment history for an order
  getPayments: (orderId: number) => {
    return apiClient.get(`/orders/${orderId}/payments`);
  }
};
