import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../shared/api/apiClient';
import { loadStripeScript, getStripe } from '../../../shared/utils/PaymentScriptLoader';
import { StripeFieldsSkeleton } from './StripeFieldsSkeleton';

interface StripeCheckoutProps {
  amount: string;
  currency?: string;
  publishableKey: string;
  testMode: boolean;
  onPaymentSuccess: (details: {
    status: string;
    transaction_id: string;
    payment_id?: string; // Added for webhook lookups
    payment_intent_id?: string; // Added to explicitly track the payment intent ID
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

  // Simplified state management
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'processing'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);

  // Single ref for payment element
  const paymentElementRef = useRef<HTMLDivElement>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Setup cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Create a memoized function to initialize Stripe and create payment intent
  const initializeStripe = useCallback(async () => {
    // Skip if in test mode
    if (testMode) {
      if (isMounted.current) {
        setClientSecret(`test_secret_${Math.random().toString(36).substring(2, 15)}`);
        setStatus('ready');
      }
      return;
    }
    
    // Validate publishable key
    if (!publishableKey) {
      if (isMounted.current) {
        setError('Stripe publishable key is missing');
        setStatus('error');
      }
      return;
    }

    try {
      // Start both processes in parallel using Promise.all for better performance
      const [_, stripeInstance] = await Promise.all([
        // Create payment intent
        !clientSecret ? api.post<{ client_secret: string }>('/stripe/create_intent', {
          amount,
          currency
        }).then(response => {
          if (response && response.client_secret && isMounted.current) {
            setClientSecret(response.client_secret);
          } else if (!response || !response.client_secret) {
            throw new Error('No client secret returned');
          }
        }) : Promise.resolve(),
        
        // Load Stripe.js and initialize
        loadStripeScript().then(() => getStripe(publishableKey))
      ]);
      
      // Update state if component is still mounted
      if (isMounted.current) {
        setStripe(stripeInstance);
        setStatus('ready');
      }
    } catch (err: any) {
      console.error('Error initializing Stripe:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to initialize payment');
        setStatus('error');
        onPaymentError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      }
    }
  }, [publishableKey, testMode, clientSecret, amount, currency, onPaymentError]);

  // Initialize Stripe and create payment intent
  useEffect(() => {
    initializeStripe();
  }, [initializeStripe]);

  // Initialize and mount Stripe Elements when stripe and clientSecret are ready
  useEffect(() => {
    if (testMode || !stripe || !clientSecret || !paymentElementRef.current) {
      return;
    }
    
    // Create Elements instance with improved configuration
    const elementsInstance = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#c1902f',
        },
      },
      // Disable save payment method option
      paymentMethodCreation: 'manual',
      // Minimize billing address collection
      billingAddressCollection: 'never'
    });
    
    // Create and mount the payment element
    const paymentElement = elementsInstance.create('payment');
    paymentElement.mount(paymentElementRef.current);
    
    // Update state
    if (isMounted.current) {
      setElements(elementsInstance);
    }
    
    // Cleanup function to unmount element when component unmounts
    return () => {
      paymentElement.unmount();
    };
  }, [stripe, clientSecret, testMode]);

  // Process payment function - exposed to parent via ref
  const processPayment = async (): Promise<boolean> => {
    if (status === 'processing') return false;
    
    if (isMounted.current) {
      setStatus('processing');
    }
    
    // Application test mode - simulate successful payment
    if (testMode) {
      // Generate a Stripe-like test payment intent ID
      const testId = `pi_test_${Math.random().toString(36).substring(2, 15)}`;
      
      // Use a shorter timeout for test mode to improve UX
      setTimeout(() => {
        if (isMounted.current) {
          onPaymentSuccess({
            status: 'succeeded',
            transaction_id: testId,
            payment_id: testId,
            payment_intent_id: testId,
            amount: amount,
          });
          setStatus('ready');
        }
      }, 800);
      return true;
    }
    
    // Live mode - need stripe and elements
    if (!stripe || !elements || !clientSecret) {
      if (isMounted.current) {
        setError('Payment system not fully initialized');
        setStatus('error');
      }
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
        if (isMounted.current) {
          setError(submitError.message || 'Payment failed');
          setStatus('error');
        }
        onPaymentError(new Error(submitError.message || 'Payment failed'));
        return false;
      } 
      
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        onPaymentSuccess({
          status: paymentIntent.status,
          transaction_id: paymentIntent.id,
          payment_id: paymentIntent.id,
          payment_intent_id: paymentIntent.id,
          amount: (paymentIntent.amount / 100).toString(), // Convert from cents
        });
        return true;
      } 
      
      // Handle other statuses
      if (paymentIntent) {
        const errorMsg = `Payment status: ${paymentIntent.status}`;
        if (isMounted.current) {
          setError(errorMsg);
          setStatus('error');
        }
        onPaymentError(new Error(errorMsg));
      } else {
        if (isMounted.current) {
          setError('Payment failed with unknown error');
          setStatus('error');
        }
        onPaymentError(new Error('Payment failed with unknown error'));
      }
      
      return false;
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'Payment failed');
        setStatus('error');
      }
      onPaymentError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      return false;
    }
  };

  // Expose the processPayment method to parent component
  React.useImperativeHandle(ref, () => ({
    processPayment
  }), [processPayment]);

  // Render based on status
  // Helper function to check if status is processing - fixes TypeScript errors
  const isProcessing = (): boolean => status === 'processing';

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <div className="min-h-[200px] flex items-center justify-center"><StripeFieldsSkeleton /></div>;
        
      case 'error':
        return (
          <div className="w-full px-4 py-3">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p>Error: {error}</p>
              <p className="mt-2">Please try another payment method or contact support.</p>
            </div>
          </div>
        );
        
      case 'processing':
        return (
          <div className="w-full px-4 py-3">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="rounded-full bg-gray-300 h-10 w-10 mb-2"></div>
                <p className="text-gray-700">Processing payment...</p>
              </div>
            </div>
          </div>
        );
        
      case 'ready':
        if (testMode) {
          return (
            <div className="w-full px-4 py-3">
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
                    readOnly={isProcessing()}
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
                      readOnly={isProcessing()}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">CVV</label>
                    <input
                      type="text"
                      defaultValue="123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123"
                      readOnly={isProcessing()}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (!elements) {
          return <div className="min-h-[200px] flex items-center justify-center"><StripeFieldsSkeleton /></div>;
        } else {
          return (
            <div className="w-full px-4 py-3">
              <div id="payment-element" ref={paymentElementRef} className="mb-6 min-h-[200px]">
                {/* Payment Element will be mounted here by the useEffect hook */}
              </div>
            </div>
          );
        }
    }
  };

  return (
    <div className="stripe-checkout-container w-full mx-auto">
      {renderContent()}
    </div>
  );
});

// Add display name for better debugging
StripeCheckout.displayName = 'StripeCheckout';
