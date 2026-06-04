import React, { useEffect, useRef, useState } from 'react';
import type { Stripe, StripeCardElement, StripeCardElementChangeEvent, StripeElements } from '@stripe/stripe-js';

import { api } from '../../../shared/api/apiClient';
import { LoadingSpinner } from '../../../shared/components/ui';

interface PaymentIntentResponse {
  success: boolean;
  client_secret?: string;
  free_order?: boolean;
  small_order?: boolean;
  order_id?: string;
  payment_intent_id?: string;
  errors?: string[];
  status?: string;
}

interface StripeCheckoutProps {
  amount: string;
  currency?: string;
  publishableKey: string;
  testMode: boolean;
  onPaymentSuccess: (details: {
    status: string;
    transaction_id: string;
    payment_id?: string;
    payment_intent_id?: string;
    amount: string;
  }) => void;
  onPaymentError: (error: Error) => void;
}

export interface StripeCheckoutRef {
  processPayment: () => Promise<boolean>;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => Stripe;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
}

export const StripeCheckout = React.forwardRef<StripeCheckoutRef, StripeCheckoutProps>((props, ref) => {
  const {
    amount,
    currency = 'USD',
    publishableKey,
    testMode,
    onPaymentSuccess,
    onPaymentError,
  } = props;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isFreeOrder, setIsFreeOrder] = useState(false);
  const [isSmallOrder, setIsSmallOrder] = useState(false);
  const [specialOrderId, setSpecialOrderId] = useState<string | null>(null);

  const stripeLoaded = useRef(false);
  const paymentIntentCreated = useRef(false);
  const elementsInitialized = useRef(false);
  const cardElementMounted = useRef(false);
  const cardElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stripeLoaded.current || testMode) {
      setLoading(false);
      return;
    }

    stripeLoaded.current = true;

    if (!publishableKey) {
      setError('Stripe publishable key is missing');
      setLoading(false);
      return;
    }

    if (window.Stripe) {
      setStripe(window.Stripe(publishableKey));
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      if (!window.Stripe) {
        setError('Stripe.js loaded without initializing correctly');
        setLoading(false);
        return;
      }

      setStripe(window.Stripe(publishableKey));
      setLoading(false);
    };
    script.onerror = () => {
      setError('Failed to load Stripe.js');
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [publishableKey, testMode]);

  useEffect(() => {
    if (testMode || paymentIntentCreated.current || clientSecret || error || isFreeOrder || isSmallOrder) {
      return;
    }

    paymentIntentCreated.current = true;

    const createPaymentIntent = async () => {
      try {
        const restaurantId = localStorage.getItem('restaurant_id') || import.meta.env.VITE_RESTAURANT_ID || '1';
        const response = await api.post<PaymentIntentResponse>('/stripe/create_intent', {
          amount,
          currency,
          restaurant_id: restaurantId,
        });

        if (response.free_order || response.small_order) {
          setIsFreeOrder(Boolean(response.free_order));
          setIsSmallOrder(Boolean(response.small_order));
          setSpecialOrderId(response.order_id || `special_${Math.random().toString(36).substring(2, 10)}`);
          return;
        }

        if (!response.client_secret) {
          throw new Error('No client secret returned');
        }

        setClientSecret(response.client_secret);
      } catch (err: unknown) {
        const message = errorMessage(err, 'Failed to create payment intent');
        setError(message);
        onPaymentError(err instanceof Error ? err : new Error(message));
      }
    };

    void createPaymentIntent();
  }, [amount, clientSecret, currency, error, isFreeOrder, isSmallOrder, onPaymentError, testMode]);

  useEffect(() => {
    if (testMode || !stripe || elementsInitialized.current || error || isFreeOrder || isSmallOrder) {
      return;
    }

    elementsInitialized.current = true;

    try {
      const elementsInstance = stripe.elements({
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#c1902f',
            colorText: '#111827',
            colorDanger: '#dc2626',
            borderRadius: '8px',
          },
        },
      });

      setElements(elementsInstance);
    } catch (err: unknown) {
      const message = errorMessage(err, 'Failed to initialize Stripe Elements');
      setError(message);
      onPaymentError(err instanceof Error ? err : new Error(message));
    }
  }, [error, isFreeOrder, isSmallOrder, onPaymentError, stripe, testMode]);

  useEffect(() => {
    if (testMode || !elements || !clientSecret || !cardElementRef.current || cardElementMounted.current || isFreeOrder || isSmallOrder) {
      return;
    }

    cardElementMounted.current = true;
    let card: StripeCardElement | null = null;

    try {
      card = elements.create('card', {
        hidePostalCode: true,
        style: {
          base: {
            color: '#111827',
            fontSize: '16px',
            '::placeholder': {
              color: '#9ca3af',
            },
          },
          invalid: {
            color: '#dc2626',
          },
        },
      });

      card.mount(cardElementRef.current);
      setCardElement(card);

      card.on('change', (event: StripeCardElementChangeEvent) => {
        if (event.error) {
          setError(event.error.message);
        } else {
          setError(null);
        }
      });
    } catch (err: unknown) {
      const message = errorMessage(err, 'Failed to mount card input');
      setError(message);
      onPaymentError(err instanceof Error ? err : new Error(message));
    }

    return () => {
      if (cardElementMounted.current && card) {
        try {
          card.unmount();
        } catch (err) {
          console.error('Error unmounting Stripe card element:', err);
        }
      }
      cardElementMounted.current = false;
    };
  }, [clientSecret, elements, isFreeOrder, isSmallOrder, onPaymentError, testMode]);

  const processPayment = async (): Promise<boolean> => {
    if (processing) return false;

    setProcessing(true);

    if (testMode) {
      setTimeout(() => {
        const testId = `pi_test_${Math.random().toString(36).substring(2, 15)}`;
        onPaymentSuccess({
          status: 'succeeded',
          transaction_id: testId,
          payment_id: testId,
          payment_intent_id: testId,
          amount,
        });
        setProcessing(false);
      }, 1000);

      return true;
    }

    if (isFreeOrder || isSmallOrder) {
      setTimeout(() => {
        onPaymentSuccess({
          status: 'succeeded',
          transaction_id: specialOrderId || `special_${Math.random().toString(36).substring(2, 10)}`,
          payment_id: specialOrderId || undefined,
          payment_intent_id: specialOrderId || undefined,
          amount: isFreeOrder ? '0' : '0.50',
        });
        setProcessing(false);
      }, 500);

      return true;
    }

    if (!stripe || !cardElement || !clientSecret) {
      setError('Stripe is not ready yet');
      setProcessing(false);
      return false;
    }

    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
        return_url: `${window.location.origin}/checkout/return`,
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Payment failed');
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(paymentIntent ? `Payment status: ${paymentIntent.status}` : 'Payment failed');
      }

      onPaymentSuccess({
        status: paymentIntent.status,
        transaction_id: paymentIntent.id,
        payment_id: paymentIntent.id,
        payment_intent_id: paymentIntent.id,
        amount: (paymentIntent.amount / 100).toString(),
      });

      return true;
    } catch (err: unknown) {
      const message = errorMessage(err, 'Payment failed');
      setError(message);
      onPaymentError(err instanceof Error ? err : new Error(message));
      return false;
    } finally {
      setProcessing(false);
    }
  };

  React.useImperativeHandle(ref, () => ({
    processPayment,
  }), [processPayment]);

  if (loading && !isFreeOrder && !isSmallOrder) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2">Loading secure card checkout...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <p>Error: {error}</p>
        <p className="mt-2">Please review your payment details or contact support.</p>
      </div>
    );
  }

  if (isFreeOrder) {
    return (
      <div className="bg-green-50 border border-green-100 p-3 rounded-md">
        <p className="font-bold text-green-700 inline-block mr-2">FREE ORDER</p>
        <span className="text-green-700">No payment is required for this order.</span>
      </div>
    );
  }

  if (isSmallOrder) {
    return (
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-md">
        <p className="font-bold text-blue-700 inline-block mr-2">SMALL ORDER</p>
        <span className="text-blue-700">This order will be completed without collecting card details.</span>
      </div>
    );
  }

  if (testMode) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-md">
          <p className="font-bold text-yellow-700 inline-block mr-2">TEST MODE</p>
          <span className="text-yellow-700">Payments are simulated in this environment.</span>
        </div>
        <div className="rounded-md border border-gray-200 p-4 bg-gray-50">
          <p className="font-medium text-gray-900 mb-1">Card checkout only</p>
          <p className="text-sm text-gray-600">Use Stripe test card `4242 4242 4242 4242` when testing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gray-200 p-4 bg-gray-50">
        <p className="font-medium text-gray-900 mb-1">Card checkout only</p>
        <p className="text-sm text-gray-600">
          V1 currently supports secure card payments only to ensure the order is finalized reliably.
        </p>
      </div>

      {!clientSecret || !elements ? (
        <div className="flex justify-center items-center p-4">
          <LoadingSpinner className="w-8 h-8" />
          <span className="ml-2">Preparing secure card form...</span>
        </div>
      ) : (
        <div className="rounded-md border border-gray-300 bg-white px-3 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Card Information</label>
          <div ref={cardElementRef} />
        </div>
      )}
    </div>
  );
});

StripeCheckout.displayName = 'StripeCheckout';
