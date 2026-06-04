import { api } from '../apiClient';

interface PaymentIntentResponse {
  client_secret: string;
}

interface PaymentIntentDetailsResponse {
  id: string;
  amount: number;
  amount_received?: number;
  status: string;
  client_secret: string;
  currency?: string;
  payment_method?: string;
  payment_method_types?: string[];
}

/**
 * API client for Stripe-related endpoints
 */
export const stripeApi = {
  /**
   * Create a payment intent for a given amount
   * @param amount - The amount to charge (in dollars)
   * @param currency - The currency code (default: USD)
   * @returns A promise that resolves to the payment intent with client secret
   */
  createPaymentIntent: async (
    amount: string,
    currency: string = 'USD'
  ): Promise<PaymentIntentResponse> => {
    const response = await api.post<PaymentIntentResponse>('/stripe/create_intent', {
      amount,
      currency,
    });
    return response;
  },

  /**
   * Get details about a payment intent
   * @param id - The ID of the payment intent
   * @returns A promise that resolves to the payment intent details
   */
  getPaymentIntent: async (
    id: string,
    restaurantId: string
  ): Promise<PaymentIntentDetailsResponse> => {
    const response = await api.get<PaymentIntentDetailsResponse>(`/stripe/payment_intent/${id}`, {
      restaurant_id: restaurantId,
    });
    return response;
  },

  /**
   * Confirm a payment intent (if needed server-side)
   * @param paymentIntentId - The ID of the payment intent to confirm
   * @returns A promise that resolves to the confirmed payment intent
   */
  confirmPaymentIntent: async (
    paymentIntentId: string
  ): Promise<PaymentIntentDetailsResponse> => {
    const response = await api.post<PaymentIntentDetailsResponse>('/stripe/confirm_intent', {
      payment_intent_id: paymentIntentId,
    });
    return response;
  },
};
