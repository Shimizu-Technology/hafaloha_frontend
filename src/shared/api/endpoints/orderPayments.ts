// src/shared/api/endpoints/orderPayments.ts

import { apiClient } from '../apiClient';

interface RefundRequest {
  amount: number;
  reason?: string;
}

interface AdditionalPaymentRequest {
  items: {
    id: number;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export const orderPaymentsApi = {
  /**
   * Get all payments for an order
   * @param orderId The order ID
   * @returns Promise with payment data
   */
  getPayments: (orderId: number) => {
    return apiClient.get(`/orders/${orderId}/payments`);
  },

  /**
   * Create a refund for an order
   * @param orderId The order ID
   * @param data Refund data (amount and reason)
   * @returns Promise with refund result
   */
  createRefund: (orderId: number, data: RefundRequest) => {
    return apiClient.post(`/orders/${orderId}/payments/refund`, data);
  },

  /**
   * Create an additional payment for new items added to an order
   * @param orderId The order ID
   * @param data Additional payment data (items)
   * @returns Promise with payment intent data
   */
  createAdditionalPayment: (orderId: number, data: AdditionalPaymentRequest) => {
    return apiClient.post(`/orders/${orderId}/payments/additional`, data);
  },

  /**
   * Capture an additional payment after it's been authorized
   * @param orderId The order ID
   * @param paymentIntentId The payment intent ID
   * @returns Promise with capture result
   */
  captureAdditionalPayment: (orderId: number, paymentIntentId: string) => {
    return apiClient.post(`/orders/${orderId}/payments/additional/capture`, {
      payment_intent_id: paymentIntentId
    });
  },
};
