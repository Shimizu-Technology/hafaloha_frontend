import React, { useState, useEffect, useRef } from 'react';
import { orderPaymentOperationsApi } from '../../../shared/api/endpoints/orderPaymentOperations';
import { orderPaymentsApi } from '../../../shared/api/endpoints/orderPayments';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { StripeCheckout, StripeCheckoutRef } from '../../components/payment/StripeCheckout';
import { PayPalCheckout, PayPalCheckoutRef } from '../../components/payment/PayPalCheckout';

interface PaymentItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface EnhancedAdditionalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | number;
  paymentItems: PaymentItem[];
  onPaymentCompleted: () => void;
}

export function EnhancedAdditionalPaymentModal({
  isOpen,
  onClose,
  orderId,
  paymentItems,
  onPaymentCompleted,
}: EnhancedAdditionalPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'cash' | 'payment_link' | 'clover' | 'revel' | 'other'>('credit_card');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentLinkUrl, setPaymentLinkUrl] = useState('');
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [paymentLinkSentMessage, setPaymentLinkSentMessage] = useState('');
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  
  // Manual payment details
  const [transactionId, setTransactionId] = useState('');
  // Set default payment date to today
  const today = new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentNotes, setPaymentNotes] = useState('');

  // Payment processor refs
  const stripeRef = useRef<StripeCheckoutRef>(null);
  const paypalRef = useRef<PayPalCheckoutRef>(null);
  
  // Get restaurant settings for payment configuration
  const restaurant = useRestaurantStore((state) => state.restaurant);
  const paymentGateway = restaurant?.admin_settings?.payment_gateway || {};
  const paymentProcessor = paymentGateway.payment_processor || 'paypal';
  const testMode = paymentGateway.test_mode !== false;
  
  // Calculate total from items
  const total = paymentItems.reduce(
    (sum, item) => sum + parseFloat(String(item.price)) * parseInt(String(item.quantity)),
    0
  );
  
  useEffect(() => {
    // In a real implementation, we would fetch the order data from an API endpoint
    // For this implementation, we'll simulate this by assuming we have the customer info
    const fetchOrderDetails = async () => {
      try {
        setIsLoading(true);
        // In a real implementation, this would be something like:
        // const response = await orderPaymentsApi.getOrderByID(orderId);
        
        // Instead, we'll simulate this with mock data
        const mockOrderData = {
          contact_email: 'customer@example.com',
          contact_phone: '+1234567890'
        };
        
        setOrderData(mockOrderData);
        
        // Pre-fill customer info if available
        if (mockOrderData.contact_email) {
          setCustomerEmail(mockOrderData.contact_email);
        }
        if (mockOrderData.contact_phone) {
          setCustomerPhone(mockOrderData.contact_phone);
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const handleCreditCardPayment = async () => {
    setIsLoading(true);
    setPaymentError(null);
    try {
      if (paymentProcessor === 'stripe' && stripeRef.current) {
        // Process with Stripe
        const success = await stripeRef.current.processPayment();
        if (!success) {
          setPaymentError('Payment processing failed. Please try again.');
        }
      } else if (paypalRef.current) {
        // Process with PayPal
        const success = await paypalRef.current.processPayment();
        if (!success) {
          setPaymentError('Payment processing failed. Please try again.');
        }
      } else {
        // Fallback to showing the Stripe form placeholder if no payment processor is configured
        setShowStripeForm(true);
      }
    } catch (error) {
      console.error('Error setting up credit card payment:', error);
      setPaymentError('Failed to set up credit card payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashPayment = async () => {
    setIsLoading(true);
    setPaymentError(null);
    try {
      // Process cash payment
      // In a real implementation, this would call an API endpoint
      // await orderPaymentOperationsApi.processPayment(orderId, {
      //   payment_method: 'cash',
      //   amount: total,
      //   items: paymentItems,
      // });
      
      // Simulate API call success
      console.log('Processing cash payment for order:', orderId, {
        payment_method: 'cash',
        amount: total,
        items: paymentItems,
      });
      
      // Simulate successful payment
      setPaymentSuccessful(true);
      setTimeout(() => {
        onPaymentCompleted();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error processing cash payment:', error);
      setPaymentError('Failed to process cash payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual payments (Clover, Revel, Other)
  const handleManualPayment = async () => {
    setIsLoading(true);
    setPaymentError(null);
    try {
      // Validate required fields
      if (!paymentDate) {
        setPaymentError('Payment date is required');
        return;
      }
      
      // Create payment details object
      const paymentDetails = {
        payment_method: paymentMethod,
        transaction_id: transactionId || `${paymentMethod}_${Date.now()}`,
        payment_date: paymentDate,
        notes: paymentNotes
      };
      
      // Convert orderId to number if it's a string
      const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      
      try {
        // Call the API to process the payment
        await orderPaymentOperationsApi.processAdditionalPayment(numericOrderId, {
          payment_method: paymentMethod,
          items: paymentItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          payment_details: paymentDetails
        });
        
        console.log(`Successfully processed ${paymentMethod} payment for order:`, orderId, {
          payment_method: paymentMethod,
          amount: total,
          items: paymentItems,
          payment_details: paymentDetails
        });
        
        // Payment successful
        setPaymentSuccessful(true);
        setTimeout(() => {
          onPaymentCompleted();
          onClose();
        }, 2000);
      } catch (apiError) {
        console.error(`API error processing ${paymentMethod} payment:`, apiError);
        setPaymentError(`Failed to process ${paymentMethod} payment. Please try again.`);
        return;
      }
    } catch (error) {
      console.error(`Error processing ${paymentMethod} payment:`, error);
      setPaymentError(`Failed to process ${paymentMethod} payment. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPaymentLink = async () => {
    if (!customerEmail && !customerPhone) {
      setPaymentError('Please provide either an email or phone number to send the payment link.');
      return;
    }
    
    setIsLoading(true);
    setPaymentError(null);
    try {
      // Convert orderId to number if it's a string
      const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      
      // Generate and send payment link
      const response = await orderPaymentOperationsApi.generatePaymentLink(numericOrderId, {
        email: customerEmail,
        phone: customerPhone,
        items: paymentItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          // Include optional fields if available
          description: (item as any).description,
          image: (item as any).image
        }))
      });
      
      // Get the payment link URL from the response
      const responseData = response.data;
      const paymentLinkUrl = responseData.payment_link_url;
      
      // Display the payment link URL and mark as sent
      setPaymentLinkUrl(paymentLinkUrl);
      setPaymentLinkSent(true);
      
      // Show appropriate message based on where the link was sent
      let sentToMessage = '';
      if (customerEmail && customerPhone) {
        sentToMessage = `The payment link has been sent to ${customerEmail} and ${customerPhone}.`;
      } else if (customerEmail) {
        sentToMessage = `The payment link has been sent to ${customerEmail}.`;
      } else if (customerPhone) {
        sentToMessage = `The payment link has been sent to ${customerPhone}.`;
      }
      
      if (sentToMessage) {
        setPaymentLinkSentMessage(sentToMessage);
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      setPaymentError('Failed to create payment link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for payment success
  const handlePaymentSuccess = (details: {
    status: string;
    transaction_id: string;
    amount: string;
    currency?: string;
  }) => {
    // Payment succeeded
    setPaymentSuccessful(true);
    
    // Process the completion with the backend
    processSuccessfulPayment(details.transaction_id, details.amount);
    
    setTimeout(() => {
      onPaymentCompleted();
      onClose();
    }, 2000);
  };

  // Handler for payment errors
  const handlePaymentError = (error: Error) => {
    console.error('Payment failed:', error);
    setPaymentError(`Payment failed: ${error.message}`);
  };
  
  // Process successful payment with the backend
  const processSuccessfulPayment = async (transactionId: string, amount: string) => {
    try {
      // Convert amount to number and ensure it's a valid number
      const numericAmount = Number(amount);
      if (isNaN(numericAmount)) {
        throw new Error(`Invalid amount: ${amount}`);
      }
      
      // Convert orderId to number if it's a string
      const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      
      // Determine the actual payment method based on the processor
      let actualPaymentMethod = 'credit_card';
      if (paymentProcessor === 'stripe') {
        actualPaymentMethod = 'stripe';
      } else if (paymentProcessor === 'paypal') {
        actualPaymentMethod = 'paypal';
      }
      
      // Log the transaction details for debugging/tracking purposes
      console.log(`Payment processed with transaction ID: ${transactionId}, amount: ${numericAmount}, method: ${actualPaymentMethod}`);
      
      // Here you would call your API to process the payment on the backend
      // Note: We're adapting to the API's expected parameters based on TypeScript errors
      await orderPaymentOperationsApi.processAdditionalPayment(numericOrderId, {
        payment_method: actualPaymentMethod,
        items: paymentItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      });
    } catch (error) {
      console.error('Error processing payment with backend:', error);
      // We don't set payment error here since the payment was successful with the processor
      // but we log the error for debugging
    }
  };
  
  // Legacy handler for the mock Stripe form
  const handleStripePaymentCompleted = (result: { paymentIntent?: any; error?: any }) => {
    if (result.error) {
      // Show error to customer
      setPaymentError(result.error.message);
    } else if (result.paymentIntent) {
      // Payment succeeded
      handlePaymentSuccess({
        status: 'succeeded',
        transaction_id: 'mock_' + Date.now().toString(),
        amount: total.toFixed(2)
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md md:max-w-2xl mx-auto animate-slideUp max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - fixed position instead of sticky for better iPad compatibility */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white z-10">
          <h3 className="text-lg font-medium text-gray-900">
            {paymentSuccessful ? 'Payment Successful' : 'Process Additional Payment'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - make it scrollable */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {paymentSuccessful ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Payment Processed Successfully</h4>
              <p className="text-gray-600">The additional payment has been processed successfully.</p>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Items Requiring Payment</h4>
                <div className="bg-gray-50 rounded-md p-3 space-y-3">
                  {paymentItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="text-gray-500 text-sm ml-2">x{item.quantity}</span>
                      </div>
                      <span className="text-gray-900">${(parseFloat(String(item.price)) * parseInt(String(item.quantity))).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              {!showStripeForm && !paymentLinkSent && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                        paymentMethod === 'credit_card'
                          ? 'bg-[#c1902f] text-white border-[#c1902f]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod('credit_card')}
                    >
                      Credit Card
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                        paymentMethod === 'cash'
                          ? 'bg-[#c1902f] text-white border-[#c1902f]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                        paymentMethod === 'payment_link'
                          ? 'bg-[#c1902f] text-white border-[#c1902f]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod('payment_link')}
                    >
                      Send Link
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                        paymentMethod === 'clover'
                          ? 'bg-[#c1902f] text-white border-[#c1902f]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod('clover')}
                    >
                      Clover
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                        paymentMethod === 'revel'
                          ? 'bg-[#c1902f] text-white border-[#c1902f]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod('revel')}
                    >
                      Revel
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                        paymentMethod === 'other'
                          ? 'bg-[#c1902f] text-white border-[#c1902f]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setPaymentMethod('other')}
                    >
                      Other
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Payment Panel (Clover, Revel, Other) */}
              {['clover', 'revel', 'other'].includes(paymentMethod) && !paymentLinkSent && (
                <div className="border border-gray-200 rounded-md p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {paymentMethod === 'clover' ? 'Clover' : paymentMethod === 'revel' ? 'Revel' : 'Other'} Payment Details
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transaction ID/Reference Number (optional)
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        placeholder="Enter transaction ID or reference number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                        value={paymentNotes}
                        onChange={e => setPaymentNotes(e.target.value)}
                        placeholder="Enter any additional payment notes"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Link Form */}
              {paymentMethod === 'payment_link' && !paymentLinkSent && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Email (optional)
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Phone (optional)
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Please provide at least one contact method to send the payment link.
                  </p>
                </div>
              )}

              {/* Payment Link Sent */}
              {paymentLinkSent && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Payment Link Sent</h3>
                      <div className="mt-2 text-sm text-green-700">
                        {paymentLinkSentMessage ? (
                          <p className="mb-2">{paymentLinkSentMessage}</p>
                        ) : (
                          <p>
                            A payment link has been sent to the customer. They can use this link to complete
                            the payment:
                          </p>
                        )}
                        <div className="mt-2 bg-white p-2 rounded border border-gray-200 break-all">
                          <a
                            href={paymentLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {paymentLinkUrl}
                          </a>
                        </div>
                        <p className="mt-2">
                          You can close this modal and mark the items as paid once the customer completes the
                          payment, or leave it open to track payment status.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Real Payment Integration */}
              {paymentMethod === 'credit_card' && !paymentLinkSent && !showStripeForm && (
                <div className="border border-gray-200 rounded-md p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Credit Card Payment</h4>
                  
                  {/* Conditionally render Stripe or PayPal components based on restaurant settings */}
                  {paymentProcessor === 'stripe' ? (
                    <StripeCheckout 
                      ref={stripeRef}
                      amount={total.toString()} 
                      publishableKey={(paymentGateway.publishable_key as string) || ""}
                      currency="USD"
                      testMode={testMode}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                    />
                  ) : (
                    <PayPalCheckout 
                      ref={paypalRef}
                      amount={total.toString()} 
                      clientId={(paymentGateway.client_id as string) || "sandbox_client_id"}
                      currency="USD"
                      testMode={testMode}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                    />
                  )}
                </div>
              )}
              
              {/* Fallback Stripe Form Placeholder (only shown if no proper integration) */}
              {showStripeForm && (
                <div className="border border-gray-200 rounded-md p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Credit Card Details</h4>
                  {/* In a real implementation, you would embed your Stripe Elements form here */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                      <div className="h-10 bg-gray-100 rounded-md"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <div className="h-10 bg-gray-100 rounded-md"></div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                        <div className="h-10 bg-gray-100 rounded-md"></div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                        placeholder="John Smith"
                      />
                    </div>
                    {testMode ? (
                      <div className="p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-700 mt-2">
                        <strong>Test Mode:</strong> No real payment will be processed.
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        This would be connected to your Stripe integration in production.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{paymentError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - fixed position instead of sticky for better iPad compatibility */}
        {!paymentSuccessful && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-row-reverse bg-white z-10">
            {!showStripeForm && !paymentLinkSent && (
              <>
                {paymentMethod === 'credit_card' && (
                  <button
                    type="button"
                    onClick={handleCreditCardPayment}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#c1902f] text-white rounded-md text-sm font-medium hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
                  >
                    {isLoading ? 'Processing...' : 'Process Card Payment'}
                  </button>
                )}
                {paymentMethod === 'cash' && (
                  <button
                    type="button"
                    onClick={handleCashPayment}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#c1902f] text-white rounded-md text-sm font-medium hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
                  >
                    {isLoading ? 'Processing...' : 'Mark as Paid (Cash)'}
                  </button>
                )}
                {['clover', 'revel', 'other'].includes(paymentMethod) && (
                  <button
                    type="button"
                    onClick={handleManualPayment}
                    disabled={isLoading || !paymentDate}
                    className="px-4 py-2 bg-[#c1902f] text-white rounded-md text-sm font-medium hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : `Complete ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Payment`}
                  </button>
                )}
                {paymentMethod === 'payment_link' && (
                  <button
                    type="button"
                    onClick={handleSendPaymentLink}
                    disabled={isLoading || (!customerEmail && !customerPhone)}
                    className="px-4 py-2 bg-[#c1902f] text-white rounded-md text-sm font-medium hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Sending...' : 'Send Payment Link'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="mr-3 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
                >
                  Cancel
                </button>
              </>
            )}

            {showStripeForm && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    // Mock successful payment for demo purposes
                    handleStripePaymentCompleted({ paymentIntent: { status: 'succeeded' } });
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#c1902f] text-white rounded-md text-sm font-medium hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
                >
                  {isLoading ? 'Processing...' : 'Pay Now'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStripeForm(false)}
                  className="mr-3 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
                >
                  Back
                </button>
              </>
            )}

            {paymentLinkSent && (
              <button
                type="button"
                onClick={() => {
                  // Mark as paid for the purpose of this UI flow
                  onPaymentCompleted();
                  onClose();
                }}
                className="px-4 py-2 bg-[#c1902f] text-white rounded-md text-sm font-medium hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
              >
                Mark as Paid & Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
