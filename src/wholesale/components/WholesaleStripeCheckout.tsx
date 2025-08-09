// src/wholesale/components/WholesaleStripeCheckout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { wholesaleApi } from '../services/wholesaleApi';

// (unused) Placeholder for future API typings – intentionally omitted to avoid linter noise

interface WholesaleStripeCheckoutProps {
  amount: number; // Amount in cents
  publishableKey: string;
  testMode: boolean;
  onPaymentSuccess: (details: {
    status: string;
    transaction_id: string;
    payment_intent_id?: string;
    amount: number;
  }) => void;
  onPaymentError: (error: Error) => void;
}

export interface WholesaleStripeCheckoutRef {
  processPayment: (orderId: number) => Promise<boolean>;
}

export const WholesaleStripeCheckout = React.forwardRef<WholesaleStripeCheckoutRef, WholesaleStripeCheckoutProps>((props, ref) => {
  const {
    amount,
    publishableKey,
    testMode,
    onPaymentSuccess,
    onPaymentError
  } = props;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  // Track current order if needed later (removed unused state to satisfy linter)

  // Use refs to track initialization state
  const stripeLoaded = useRef(false);
  const elementsInitialized = useRef(false);
  const cardElementMounted = useRef(false);
  const cardElementRef = useRef<HTMLDivElement>(null);

  // Load Stripe.js
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

    if ((window as any).Stripe) {
      setStripe((window as any).Stripe(publishableKey));
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      setStripe((window as any).Stripe(publishableKey));
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

  // Initialize Stripe Elements once
  useEffect(() => {
    if (testMode || !stripe || elementsInitialized.current || error) {
      return;
    }

    elementsInitialized.current = true;

    try {
      const options = {
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#2563eb',
            colorBackground: '#ffffff',
            colorText: '#374151',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px'
          }
        }
      };

      const elementsInstance = stripe.elements(options);
      setElements(elementsInstance);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Stripe Elements');
      onPaymentError(err);
    }
  }, [stripe, testMode, error, onPaymentError]);

  // Mount Card Element (always visible)
  useEffect(() => {
    if (testMode || !elements || cardElementMounted.current || !cardElementRef.current) {
      return;
    }

    cardElementMounted.current = true;

    try {
      const card = elements.create('card', { hidePostalCode: true });
      card.mount(cardElementRef.current);
      setCardElement(card);

      card.on('change', (event: any) => {
        if (event.error) {
          setError(event.error.message);
        } else {
          setError(null);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to mount card element');
      onPaymentError(err);
    }
  }, [elements, testMode, onPaymentError]);

  // Create payment intent for order
  const createPaymentIntent = async (orderId: number): Promise<string | null> => {
    try {
      const response = await wholesaleApi.createPayment(orderId);
      
      if (response.success && response.data?.stripe?.clientSecret) {
        return response.data.stripe.clientSecret;
      } else {
        throw new Error(response.message || 'Failed to create payment intent');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create payment intent');
      onPaymentError(err);
      return null;
    }
  };

  // Process payment
  const processPayment = async (orderId: number): Promise<boolean> => {
    if (testMode) {
      // Simulate test payment
      setTimeout(() => {
        onPaymentSuccess({
          status: 'succeeded',
          transaction_id: `test_${Math.random().toString(36).substring(2, 15)}`,
          payment_intent_id: `pi_test_${Math.random().toString(36).substring(2, 15)}`,
          amount
        });
      }, 1000);
      return true;
    }

    if (!stripe || !elements || !cardElement) {
      setError('Stripe is not initialized');
      return false;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent for this order and confirm with card element
      const clientSecret = await createPaymentIntent(orderId);
      if (!clientSecret) return false;

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement
        }
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent) {
        // Payment successful
        onPaymentSuccess({
          status: paymentIntent.status,
          transaction_id: paymentIntent.id,
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount
        });
        return true;
      }

      return false;

    } catch (err: any) {
      setError(err.message || 'Payment failed');
      onPaymentError(err);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Expose processPayment method via ref
  React.useImperativeHandle(ref, () => ({
    processPayment
  }));

  if (testMode) {
    return (
      <div className="wholesale-stripe-checkout">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800">Test Mode</h4>
              <p className="text-sm text-yellow-700">Payment processing is in test mode. No real charges will be made.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wholesale-stripe-checkout">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="text-center text-sm text-gray-600 mt-4">
          Loading secure payment form...
        </div>
      </div>
    );
  }

  if (error && !processing) {
    return (
      <div className="wholesale-stripe-checkout">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-red-800">Payment Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wholesale-stripe-checkout">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Information</h3>
        <p className="text-sm text-gray-600">
          Enter your payment details below. All transactions are secure and encrypted.
        </p>
      </div>
      {/* Card fields are always visible */}
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <div ref={cardElementRef} className="min-h-[48px]"></div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processing && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <p className="text-blue-700 text-sm">Processing your payment...</p>
          </div>
        </div>
      )}

      {/* Payment Footer */}
      <div className="mt-4 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Powered by Stripe</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Visa</span>
            <span>•</span>
            <span>Mastercard</span>
            <span>•</span>
            <span>Amex</span>
          </div>
        </div>
      </div>
    </div>
  );
});

WholesaleStripeCheckout.displayName = 'WholesaleStripeCheckout';

export default WholesaleStripeCheckout;