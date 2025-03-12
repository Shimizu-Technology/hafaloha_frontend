import React, { useState, useCallback } from 'react';
import { LoadingSpinner } from '../../../shared/components/ui';
import { PayPalSDKLoader } from './PayPalSDKLoader';
import { PayPalCardFields } from './PayPalCardFields';
import { PayPalPaymentButton } from './PayPalPaymentButton';

interface PayPalCheckoutProps {
  amount: string;
  clientId: string;
  currency?: string;
  onPaymentSuccess?: (details: {
    status: string;
    transaction_id: string;
    amount: string;
  }) => void;
  onPaymentError?: (error: Error) => void;
  onPaymentCancel?: () => void;
  testMode?: boolean;
}

export function PayPalCheckout({
  amount,
  clientId,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  testMode = false
}: PayPalCheckoutProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [cardFieldsValid, setCardFieldsValid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card'>('card');
  const [loading, setLoading] = useState(false);

  // Handle the card fields validation state
  const handleCardFieldsValidityChange = useCallback((isValid: boolean) => {
    setCardFieldsValid(isValid);
  }, []);

  // Handle SDK loading completion
  const handleSdkLoaded = useCallback(() => {
    setSdkLoaded(true);
  }, []);

  // Handle payment errors
  const handlePaymentError = useCallback((error: Error) => {
    setLoading(false);
    if (onPaymentError) {
      onPaymentError(error);
    }
  }, [onPaymentError]);

  // Handle payment success
  const handlePaymentSuccess = useCallback((details: {
    status: string;
    transaction_id: string;
    amount: string;
  }) => {
    setLoading(false);
    if (onPaymentSuccess) {
      onPaymentSuccess(details);
    }
  }, [onPaymentSuccess]);

  // Handle test mode checkout
  const handleTestCheckout = useCallback(() => {
    setLoading(true);
    // Simulate a processing delay
    setTimeout(() => {
      if (onPaymentSuccess) {
        onPaymentSuccess({
          status: 'COMPLETED',
          transaction_id: `TEST-${Date.now()}`,
          amount
        });
      }
      setLoading(false);
    }, 1500);
  }, [amount, onPaymentSuccess]);

  // Payment method selector
  const renderPaymentMethodSelector = () => (
    <div className="mb-6">
      <div className="flex border rounded-lg overflow-hidden">
        <button
          type="button"
          className={`flex-1 py-2 text-center ${
            paymentMethod === 'paypal'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setPaymentMethod('paypal')}
        >
          PayPal
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-center ${
            paymentMethod === 'card'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setPaymentMethod('card')}
        >
          Credit/Debit Card
        </button>
      </div>
    </div>
  );

  // Test mode indicator banner
  const testModeIndicator = testMode && (
    <div className="p-2 mb-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
      <span className="inline-flex items-center bg-yellow-100 text-yellow-800 font-semibold px-2 py-1 rounded mr-2">
        TEST MODE
      </span>
      <span className="text-yellow-700">Payments will be simulated without processing real cards.</span>
    </div>
  );

  return (
    <PayPalSDKLoader
      clientId={clientId}
      currency={currency}
      components={['buttons', 'card-fields']}
      onLoaded={handleSdkLoaded}
      onError={handlePaymentError}
      testMode={testMode}
    >
      {testModeIndicator}
      
      {sdkLoaded ? (
        <div className="mt-4">
          {renderPaymentMethodSelector()}
          
          {paymentMethod === 'paypal' ? (
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Click the PayPal button below to complete your payment.
              </p>
              <div className="paypal-button-container" style={{ minHeight: '45px' }}>
                {testMode ? (
                  <button
                    type="button"
                    className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    onClick={handleTestCheckout}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner showText={false} className="inline-block mr-2 h-4 w-4" />
                        Processing...
                      </>
                    ) : (
                      'Pay with PayPal'
                    )}
                  </button>
                ) : (
                  <PayPalPaymentButton
                    amount={amount}
                    currency={currency}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                    onPaymentCancel={onPaymentCancel}
                    className="w-full"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Enter your card details to complete your payment.
              </p>
              
              {testMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <div className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                      4111 1111 1111 1111 (Test Card)
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiration Date
                      </label>
                      <div className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                        12/25
                      </div>
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <div className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                        123
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button
                      type="button"
                      className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                      onClick={handleTestCheckout}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner showText={false} className="inline-block mr-2 h-4 w-4" />
                          Processing...
                        </>
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <PayPalCardFields
                    onCardFieldsReady={handleCardFieldsValidityChange}
                    onError={handlePaymentError}
                  />
                  
                  <div className="mt-4">
                    <button
                      type="button"
                      className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                      disabled={!cardFieldsValid || loading}
                      onClick={() => {
                        if (cardFieldsValid) {
                          setLoading(true);
                          // The hosted fields are handled by PayPal - we don't need to collect card data
                          // PayPal will handle the payment and call our callback
                        }
                      }}
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner showText={false} className="inline-block mr-2 h-4 w-4" />
                          Processing...
                        </>
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading payment options...</span>
        </div>
      )}
    </PayPalSDKLoader>
  );
}
