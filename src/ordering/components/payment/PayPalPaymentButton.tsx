import React, { useEffect, useRef } from 'react';

interface PayPalPaymentButtonProps {
  amount: string;
  currency?: string;
  onPaymentSuccess?: (details: {
    status: string;
    transaction_id: string;
    amount: string;
  }) => void;
  onPaymentError?: (error: Error) => void;
  onPaymentCancel?: () => void;
  className?: string;
}

export function PayPalPaymentButton({
  amount,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  className
}: PayPalPaymentButtonProps) {
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const buttonInstance = useRef<any>(null);

  useEffect(() => {
    // Wait for PayPal SDK to be loaded
    if (!window.paypal || !paypalButtonRef.current) {
      return;
    }

    // Clean up any existing button
    if (buttonInstance.current) {
      try {
        buttonInstance.current.close();
      } catch (error) {
        console.error('Error closing PayPal button:', error);
      }
      buttonInstance.current = null;
    }

    try {
      // Create the PayPal button
      buttonInstance.current = window.paypal.Buttons({
        // Button style
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal'
        },
        
        // Create order
        createOrder: () => {
          // In a real implementation, this would call your backend to create an order
          // For this implementation, we'll simulate a successful order creation
          return Promise.resolve(`PAYPAL-ORDER-${Date.now()}`);
        },
        
        // Handle approval
        onApprove: async (data: PayPalApproveData, actions: PayPalActions) => {
          // In a real implementation, this would call your backend to capture the payment
          // For this implementation, we'll simulate a successful payment
          if (onPaymentSuccess) {
            onPaymentSuccess({
              status: 'COMPLETED',
              transaction_id: data.orderID || `PAYPAL-TRANSACTION-${Date.now()}`,
              amount
            });
          }
          return Promise.resolve();
        },
        
        // Handle errors
        onError: (err: any) => {
          console.error('PayPal error:', err);
          if (onPaymentError) {
            onPaymentError(err instanceof Error ? err : new Error(String(err)));
          }
        },
        
        // Handle cancellation
        onCancel: () => {
          console.log('Payment cancelled by user');
          if (onPaymentCancel) {
            onPaymentCancel();
          }
        }
      });
      
      // Render the button
      buttonInstance.current.render(paypalButtonRef.current);
    } catch (error) {
      console.error('Error rendering PayPal button:', error);
      if (onPaymentError) {
        onPaymentError(error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    // Cleanup function
    return () => {
      if (buttonInstance.current) {
        try {
          buttonInstance.current.close();
        } catch (error) {
          console.error('Error closing PayPal button:', error);
        }
      }
    };
  }, [amount, currency, onPaymentSuccess, onPaymentError, onPaymentCancel]);

  return (
    <div 
      ref={paypalButtonRef}
      className={className}
      data-amount={amount}
      data-currency={currency}
    />
  );
}
