import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../shared/api/apiClient';
import { loadStripeScript, getStripe } from '../../../shared/utils/PaymentScriptLoader';

import { Stripe, StripeElements } from '@stripe/stripe-js';

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
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);

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
    console.log('Initializing Stripe, test mode:', testMode);
    
    // Handle test mode differently
    if (testMode) {
      console.log('Test mode enabled, using mock data');
      try {
        // In test mode, we still need to load the Stripe script for the UI
        await loadStripeScript();
        console.log('Stripe script loaded in test mode');
        
        // Use a test publishable key if none provided
        const testKey = publishableKey || 'pk_test_TYooMQauvdEDq54NiTphI7jx';
        console.log('Using test key:', testKey.substring(0, 5) + '...');
        
        // Create a Stripe instance with the test key
        const stripeInstance = getStripe(testKey);
        
        if (isMounted.current) {
          // Set mock client secret and Stripe instance
          const mockSecret = `test_secret_${Math.random().toString(36).substring(2, 15)}`;
          console.log('Setting mock client secret and test Stripe instance');
          setClientSecret(mockSecret);
          setStripe(stripeInstance);
          setStatus('ready');
        }
      } catch (err) {
        console.error('Error in test mode setup:', err);
        if (isMounted.current) {
          setError('Failed to initialize test payment environment');
          setStatus('error');
        }
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
      console.log('Starting Stripe initialization...');
      
      // Load Stripe script and create Stripe instance in parallel with payment intent
      const [stripeInstance, intentResponse] = await Promise.all([
        // Load Stripe script and create instance
        (async () => {
          console.log('Loading Stripe script...');
          await loadStripeScript();
          console.log('Stripe script loaded, creating instance...');
          return getStripe(publishableKey);
        })(),
        
        // Create payment intent if needed
        (async () => {
          if (clientSecret) {
            console.log('Using existing client secret');
            return { client_secret: clientSecret };
          }
          
          console.log('Creating payment intent...');
          try {
            const response = await api.post<{ client_secret: string }>('/stripe/create_intent', {
              amount,
              currency
            });
            console.log('Payment intent created successfully');
            return response;
          } catch (err) {
            console.error('Error creating payment intent:', err);
            throw new Error('Failed to create payment intent');
          }
        })()
      ]);
      
      console.log('Parallel initialization complete');
      
      // Update state if component is still mounted
      if (isMounted.current) {
        if (intentResponse && intentResponse.client_secret) {
          console.log('Setting client secret');
          setClientSecret(intentResponse.client_secret);
        } else if (!clientSecret) {
          throw new Error('No client secret returned');
        }
        
        console.log('Setting Stripe instance and ready status');
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
    console.log('Initializing Stripe with publishable key:', publishableKey ? 'present' : 'missing');
    initializeStripe();
  }, [initializeStripe]);

  // Initialize and mount Stripe Elements when stripe and clientSecret are ready
  useEffect(() => {
    console.log('Elements mount effect triggered:', {
      testMode,
      stripeLoaded: !!stripe,
      clientSecretLoaded: !!clientSecret,
      elementRefExists: !!paymentElementRef.current
    });
    
    if (testMode) {
      console.log('Test mode enabled, skipping Stripe Elements mount');
      return;
    }
    
    if (!stripe) {
      console.log('Stripe not loaded yet, skipping Elements mount');
      return;
    }
    
    if (!clientSecret) {
      console.log('Client secret not available yet, skipping Elements mount');
      return;
    }
    
    // Add a small delay to ensure the DOM has fully rendered
    // Check for the payment element ref and elements instance
    if (!paymentElementRef.current) {
      console.log('Payment element ref not available');
      return;
    }
    
    if (elements) {
      console.log('Elements already mounted, skipping');
      return;
    }
    
    console.log('All conditions met, attempting to mount Stripe Elements');
    
    console.log('Creating Elements instance...');
    
    try {
      // First, ensure the payment element ref exists and is in the DOM
      if (!paymentElementRef.current) {
        console.error('Payment element ref is null');
        throw new Error('Payment element container not found');
      }
      
      // Check if the element is actually in the DOM
      if (!document.body.contains(paymentElementRef.current)) {
        console.error('Payment element ref is not in the DOM');
        throw new Error('Payment element container not in DOM');
      }
      
      console.log('Payment element container found in DOM, creating Elements instance');
      
      // Create Elements instance with improved configuration
      const elementsInstance = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#c1902f',
          },
        }
      });
      
      console.log('Elements instance created, mounting payment element...');
      
      // Create the payment element
      const paymentElement = elementsInstance.create('payment', {
        fields: {
          billingDetails: 'never'
        },
        defaultValues: {
          billingDetails: {
            name: '',
            email: '',
            phone: ''
          }
        },
        paymentMethodOrder: ['card', 'cashapp']
      });
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          // Mount the payment element
          if (paymentElementRef.current) {
            paymentElement.mount(paymentElementRef.current);
          } else {
            throw new Error('Payment element container not found during mount');
          }
          console.log('Payment element mounted successfully');
        } catch (mountError) {
          console.error('Error mounting payment element:', mountError);
          if (isMounted.current) {
            setError('Failed to display payment form: ' + (mountError instanceof Error ? mountError.message : 'Unknown error'));
            setStatus('error');
          }
        }
      }, 100);
      
      // Update state
      if (isMounted.current) {
        setElements(elementsInstance);
        console.log('Elements state updated');
      }
      
      // Cleanup function to unmount element when component unmounts
      return () => {
        console.log('Unmounting payment element');
        try {
          paymentElement.unmount();
        } catch (unmountError) {
          console.error('Error unmounting payment element:', unmountError);
        }
      };
    } catch (err) {
      console.error('Error mounting Stripe Elements:', err);
      setError('Failed to initialize payment form: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setStatus('error');
    }
  }, [stripe, clientSecret, testMode]);

  // Process payment function - exposed to parent via ref
  const processPayment = async (): Promise<boolean> => {
    console.log('processPayment called, current status:', status);
    
    if (status === 'processing') {
      console.log('Payment already processing, ignoring duplicate call');
      return false;
    }
    
    if (isMounted.current) {
      console.log('Setting status to processing');
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
        setError(err instanceof Error ? err.message : 'Payment failed');
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

  // Add a robust check to ensure element exists and is mounted
  useEffect(() => {
    if (!testMode && status === 'ready' && stripe && clientSecret && !elements) {
      console.log('All dependencies ready but elements not mounted yet');
      
      // Check DOM at regular intervals to ensure the element is mounted
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkAndRetryMount = () => {
        if (!isMounted.current) return;
        attempts++;
        
        console.log(`Checking payment element (attempt ${attempts}/${maxAttempts})`);
        
        if (paymentElementRef.current && !elements) {
          console.log('Payment element ref exists but elements not created, forcing re-init');
          // Force re-initialization by toggling status
          initializeStripe();
        }
        
        if (attempts < maxAttempts && isMounted.current && !elements) {
          setTimeout(checkAndRetryMount, 500);
        }
      };
      
      // Start checking after a small delay to ensure DOM is ready
      const initialDelay = setTimeout(checkAndRetryMount, 300);
      
      return () => {
        clearTimeout(initialDelay);
      };
    }
  }, [status, stripe, clientSecret, elements, testMode, initializeStripe]);

  // Render based on status
  // Helper function to check if status is processing - fixes TypeScript errors
  const isProcessing = (): boolean => status === 'processing';

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="w-full px-4 py-3 min-h-[200px] flex items-center justify-center overflow-visible" style={{ position: 'relative', zIndex: 1 }}>
            <div className="text-gray-600">Loading payment form...</div>
          </div>
        );
        
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
          return (
            <div className="w-full px-4 py-3 min-h-[200px] flex items-center justify-center overflow-visible" style={{ position: 'relative', zIndex: 1 }}>
              <div className="text-gray-600">Loading payment form...</div>
            </div>
          );
        } else {
          return (
            <div className="w-full px-4 py-3 overflow-visible" style={{ position: 'relative', zIndex: 1 }}>
              <div id="payment-element" ref={paymentElementRef} className="mb-6 min-h-[200px] overflow-visible stripe-element-container">
                {/* Payment Element will be mounted here by the useEffect hook */}
              </div>
            </div>
          );
        }
    }
  };

  // Add needed CSS to document head for Stripe Elements
  useEffect(() => {
    // Create style element for Stripe Elements if not already present
    if (!document.getElementById('stripe-element-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'stripe-element-styles';
      styleTag.innerHTML = `
        .stripe-element-container iframe {
          z-index: 2 !important;
          position: relative !important;
        }
        .StripeElement {
          display: block !important;
          position: relative !important;
          z-index: 2 !important;
        }
        /* Ensure stripe form is visible */
        .stripe-checkout-container {
          position: relative !important;
          z-index: 1 !important;
        }
        /* Fix any hidden elements */
        .__PrivateStripeElement {
          position: relative !important;
          z-index: 999 !important;
        }
      `;
      document.head.appendChild(styleTag);
      console.log('Added Stripe element styles to document head');
    }
    
    return () => {
      // Cleanup styles on unmount
      const styleTag = document.getElementById('stripe-element-styles');
      if (styleTag) {
        document.head.removeChild(styleTag);
      }
    };
  }, []);

  // Log outside of JSX to avoid TypeScript void errors
  useEffect(() => {
    console.log('StripeCheckout rendered, status:', status, 'ref exists:', !!paymentElementRef.current);
  }, [status]);
  
  // Always render the payment element container to ensure it's in the DOM
  const PaymentElementContainer = () => (
    <div 
      className="absolute inset-0 w-full px-4 py-3 overflow-visible" 
      style={{ 
        zIndex: status !== 'error' ? 10 : -10,
        opacity: status !== 'error' ? 1 : 0,
        pointerEvents: status === 'ready' ? 'auto' : 'none'
      }}
    >
      <div 
        id="payment-element" 
        ref={paymentElementRef} 
        className="mb-6 min-h-[200px] overflow-visible stripe-element-container"
      />
    </div>
  );

  return (
    <div 
      className="stripe-checkout-container w-full mx-auto overflow-visible" 
      style={{ 
        position: 'relative', 
        zIndex: 1,
        minHeight: '300px',
        marginBottom: '30px' // Extra space at bottom to ensure full visibility
      }}
    >
      <div 
        className="w-full max-w-full overflow-visible relative" 
        style={{ 
          position: 'relative',
          zIndex: 1 
        }}
      >
        {/* Always render the payment element container first */}
        <PaymentElementContainer />
        
        {/* Then render the conditional content based on status */}
        {renderContent()}
      </div>
    </div>
  );
});

// Add display name for better debugging
StripeCheckout.displayName = 'StripeCheckout';
