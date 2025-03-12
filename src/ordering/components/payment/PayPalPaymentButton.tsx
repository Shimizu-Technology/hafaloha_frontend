import React, { useEffect, useRef } from 'react';
import { createOrder, captureOrder } from '../../../shared/api/endpoints/paypal';
import toast from 'react-hot-toast';

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
  const isRendered = useRef(false);

  useEffect(() => {
    // Ensure PayPal SDK is loaded and the DOM element exists
    if (!window.paypal || !paypalButtonRef.current || isRendered.current) {
      return;
    }

    console.log('Rendering PayPal buttons...', window.paypal);

    try {
      // Make sure the container is empty before rendering
      if (paypalButtonRef.current) {
        paypalButtonRef.current.innerHTML = '';
      }
      
      const paypalButtons = window.paypal.Buttons({
        // Set the style for the button
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay'
        },
        
        // Create a PayPal order when the button is clicked
        createOrder: async () => {
          try {
            const response = await createOrder(amount);
            return response.orderId;
          } catch (error) {
            console.error('Error creating PayPal order:', error);
            toast.error('Failed to create payment. Please try again.');
            if (onPaymentError) {
              onPaymentError(error instanceof Error ? error : new Error('Failed to create order'));
            }
            throw error;
          }
        },
        
        // Called when the buyer approves the order
        onApprove: async (data) => {
          try {
            const { status, transaction_id, amount } = await captureOrder(data.orderID);
            
            if (status === 'COMPLETED') {
              toast.success('Payment completed successfully!');
              if (onPaymentSuccess) {
                onPaymentSuccess({ status, transaction_id, amount });
              }
            } else {
              toast.error(`Payment not completed. Status: ${status}`);
              if (onPaymentError) {
                onPaymentError(new Error(`Payment not completed. Status: ${status}`));
              }
            }
          } catch (error) {
            console.error('Error capturing PayPal payment:', error);
            toast.error('Payment processing failed. Please try again.');
            if (onPaymentError) {
              onPaymentError(error instanceof Error ? error : new Error('Failed to capture payment'));
            }
          }
        },
        
        // Called if the buyer cancels the payment
        onCancel: () => {
          toast('Payment was canceled.', { icon: 'ℹ️' });
          if (onPaymentCancel) {
            onPaymentCancel();
          }
        },
        
        // Called if there is an error during processing
        onError: (err: Error) => {
          console.error('PayPal error:', err);
          toast.error('There was an error processing your payment.');
          if (onPaymentError) {
            onPaymentError(err);
          }
        }
      });

      // Render the buttons into the container element
      paypalButtons.render(paypalButtonRef.current);
      isRendered.current = true;
      
    } catch (error) {
      console.error('Error rendering PayPal buttons:', error);
      if (onPaymentError) {
        onPaymentError(error instanceof Error ? error : new Error('Failed to render PayPal buttons'));
      }
    }
    
    // Cleanup
    return () => {
      isRendered.current = false;
    };
  }, [amount, currency, onPaymentSuccess, onPaymentError, onPaymentCancel]);

  return (
    <div 
      ref={paypalButtonRef} 
      className={className || 'w-full min-h-[45px]'}
      data-testid="paypal-button-container"
    />
  );
}
