import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../shared/api/apiClient';
import { LoadingSpinner } from '../../../shared/components/ui';

interface StripeCheckoutProps {
  amount: string;
  currency?: string;
  publishableKey: string;
  testMode: boolean;
  onPaymentSuccess: (details: {
    status: string;
    transaction_id: string;
    amount: string;
  }) => void;
  onPaymentError: (error: Error) => void;
}

// Create a ref type for accessing the component from parent
export interface StripeCheckoutRef {
  processPayment: () => Promise<boolean>;
}

export const StripeCheckout = React.forwardRef<StripeCheckoutRef, StripeCheckoutProps>((props, ref) => {
  const {
    amount,
    currency = 'USD',
    publishableKey,
    testMode,
    onPaymentSuccess,
    onPaymentError
  } = props;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);

  // Use refs to track initialization state
  const stripeLoaded = useRef(false);
  const paymentIntentCreated = useRef(false);
  const elementsInitialized = useRef(false);

  // Load Stripe.js - only once
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

  // Create payment intent - only once
  useEffect(() => {
    // For test mode, just create a fake client secret
    if (testMode && !clientSecret) {
      setClientSecret(`test_secret_${Math.random().toString(36).substring(2, 15)}`);
      return;
    }

    // Skip if already created, missing stripe, already have client secret, or have an error
    if (paymentIntentCreated.current || !stripe || clientSecret || error) {
      return;
    }

    paymentIntentCreated.current = true;
    
    const createPaymentIntent = async () => {
      try {
        const response = await api.post<{ client_secret: string }>('/stripe/create_intent', {
          amount,
          currency
        });
        
        if (response && response.client_secret) {
          setClientSecret(response.client_secret);
        } else {
          throw new Error('No client secret returned');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to create payment intent');
        onPaymentError(err);
      }
    };

    createPaymentIntent();
  }, [stripe, testMode, clientSecret, error, amount, currency, onPaymentError]);

  // Initialize Stripe Elements - only once
  useEffect(() => {
    if (elementsInitialized.current || testMode || !stripe || !clientSecret) {
      return;
    }
    
    elementsInitialized.current = true;
    
    const elementsInstance = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#c1902f',
        },
      },
    });
    setElements(elementsInstance);
  }, [stripe, clientSecret, testMode]);

  // Process payment function - exposed to parent via ref
  const processPayment = async (): Promise<boolean> => {
    if (processing) return false;
    
    setProcessing(true);
    
    // Test mode - simulate successful payment
    if (testMode) {
      setTimeout(() => {
        onPaymentSuccess({
          status: 'succeeded',
          transaction_id: `pi_test_${Math.random().toString(36).substring(2, 15)}`,
          amount: amount,
        });
        setProcessing(false);
      }, 1000);
      return true;
    }
    
    // Live mode - need stripe and elements
    if (!stripe || !elements || !clientSecret) {
      setProcessing(false);
      return false;
    }
    
    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/order-confirmation',
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        onPaymentError(new Error(submitError.message || 'Payment failed'));
        return false;
      } 
      
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        onPaymentSuccess({
          status: paymentIntent.status,
          transaction_id: paymentIntent.id,
          amount: (paymentIntent.amount / 100).toString(), // Convert from cents
        });
        return true;
      } 
      
      // Handle other statuses
      if (paymentIntent) {
        const errorMsg = `Payment status: ${paymentIntent.status}`;
        setError(errorMsg);
        onPaymentError(new Error(errorMsg));
      } else {
        setError('Payment failed with unknown error');
        onPaymentError(new Error('Payment failed with unknown error'));
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

  // Expose the processPayment method to parent component
  React.useImperativeHandle(ref, () => ({
    processPayment
  }), [processPayment]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2">Loading Stripe...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <p>Error: {error}</p>
        <p className="mt-2">Please try another payment method or contact support.</p>
      </div>
    );
  }

  return (
    <div className="stripe-checkout-container">
      {/* Test mode view - just show test fields, no submit button */}
      {testMode ? (
        <div>
          <div className="bg-yellow-50 border border-yellow-100 p-3 mb-4 rounded-md">
            <p className="font-bold text-yellow-700 inline-block mr-2">TEST MODE</p>
            <span className="text-yellow-700">Payments will be simulated without processing real cards.</span>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Enter your card details to complete your payment.</h3>
          
            {/* Card Number */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1">Card Number</label>
              <input 
                type="text"
                defaultValue="4111 1111 1111 1111"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="4111 1111 1111 1111 (Test Card)"
                readOnly={processing}
              />
            </div>
            
            {/* Two columns for expiry and CVV */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Expiration Date</label>
                <input
                  type="text"
                  defaultValue="12/25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="MM/YY"
                  readOnly={processing}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">CVV</label>
                <input
                  type="text"
                  defaultValue="123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123"
                  readOnly={processing}
                />
              </div>
            </div>
          </div>
          
          {/* No submit button - parent will call processPayment */}
          
          {/* Processing indicator removed in favor of full-screen overlay */}
        </div>
      ) : (
        // Live mode with actual Stripe Elements
        !elements ? (
          <div className="flex justify-center items-center p-4">
            <LoadingSpinner className="w-8 h-8" />
            <span className="ml-2">Preparing checkout...</span>
          </div>
        ) : (
          <div>
            <div id="payment-element" className="mb-6">
              {stripe && elements && (
                <div>
                  {elements.create('payment').mount('#payment-element')}
                </div>
              )}
            </div>
            
            {/* No submit button - parent will call processPayment */}
            
            {/* Processing indicator removed in favor of full-screen overlay */}
          </div>
        )
      )}
    </div>
  );
});

// Add display name for better debugging
StripeCheckout.displayName = 'StripeCheckout';
