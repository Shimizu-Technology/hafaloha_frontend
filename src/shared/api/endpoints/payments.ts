// src/shared/api/endpoints/payments.ts
import { api } from '../apiClient';

/**
 * Get a client token for Braintree
 * @param restaurantId The ID of the restaurant
 * @returns A client token for initializing Braintree
 */
export const getClientToken = async (restaurantId: string): Promise<string> => {
  const response: any = await api.get(`/payments/client_token?restaurant_id=${restaurantId}`);
  return response.token;
};

/**
 * Process a payment with Braintree
 * @param restaurantId The ID of the restaurant
 * @param amount The amount to charge
 * @param paymentMethodNonce The payment method nonce from Braintree
 * @returns The transaction result
 */
export const processPayment = async (
  restaurantId: string,
  amount: number,
  paymentMethodNonce: string
): Promise<{
  success: boolean;
  transaction?: {
    id: string;
    status: string;
    amount: number;
  };
  message?: string;
  errors?: string[];
}> => {
  return await api.post('/payments/process', {
    restaurant_id: restaurantId,
    amount,
    payment_method_nonce: paymentMethodNonce,
  });
};

/**
 * Get transaction details
 * @param restaurantId The ID of the restaurant
 * @param transactionId The transaction ID
 * @returns The transaction details
 */
export const getTransaction = async (
  restaurantId: string,
  transactionId: string
): Promise<{
  success: boolean;
  transaction?: {
    id: string;
    status: string;
    amount: number;
    created_at: string;
    updated_at: string;
  };
  message?: string;
}> => {
  return await api.get(`/payments/transaction/${transactionId}?restaurant_id=${restaurantId}`);
};
