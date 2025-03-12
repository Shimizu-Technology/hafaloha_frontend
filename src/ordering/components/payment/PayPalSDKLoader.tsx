import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../../../shared/components/ui';

interface PayPalSDKLoaderProps {
  clientId: string;
  currency?: string;
  components?: string[];
  onLoaded?: () => void;
  onError?: (error: Error) => void;
  children: React.ReactNode;
  testMode?: boolean;
}

export function PayPalSDKLoader({
  clientId,
  currency = 'USD',
  components = ['buttons', 'card-fields'],
  onLoaded,
  onError,
  children,
  testMode = false
}: PayPalSDKLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('PayPal SDK attempting to initialize with testMode:', testMode);
    
    // Use test mode when explicitly set or when client ID is missing or default
    const isTestMode = testMode === true || !clientId || clientId === 'sandbox_client_id';
    
    if (isTestMode) {
      console.log('PayPal SDK is in test mode - using mock implementation');
      // Create a mock PayPal object for test mode
      if (!window.paypal) {
        // Create a more robust mock that actually renders something in the container
        window.paypal = {
          Buttons: (options) => ({
            render: (container) => {
              // Create a simple button to display in test mode
              if (typeof container === 'string') {
                const element = document.querySelector(container);
                if (element) {
                  createMockPayPalButton(element as HTMLElement, options);
                }
              } else if (container instanceof HTMLElement) {
                createMockPayPalButton(container, options);
              }
              return Promise.resolve();
            },
            close: () => {}
          }),
          CardNumberField: () => ({
            render: () => Promise.resolve(),
            on: () => {}
          }),
          CardExpiryField: () => ({
            render: () => Promise.resolve(),
            on: () => {}
          }),
          CardCvvField: () => ({
            render: () => Promise.resolve(),
            on: () => {}
          }),
          FUNDING: {
            PAYPAL: 'paypal',
            VENMO: 'venmo',
            PAYLATER: 'paylater',
            CARD: 'card'
          }
        };

        // Helper function to create a mock PayPal button in test mode
        function createMockPayPalButton(container: HTMLElement, options: any) {
          // Clear the container
          container.innerHTML = '';
          
          // Create a PayPal-like button
          const button = document.createElement('button');
          button.className = 'mock-paypal-button';
          button.innerText = 'PayPal (Test Mode)';
          button.style.backgroundColor = '#0070ba';
          button.style.color = 'white';
          button.style.border = 'none';
          button.style.borderRadius = '4px';
          button.style.padding = '10px 15px';
          button.style.cursor = 'pointer';
          button.style.width = '100%';
          button.style.fontWeight = 'bold';
          button.style.marginBottom = '10px';
          
          // Add click handler that simulates the PayPal flow
          button.addEventListener('click', async () => {
            try {
              // Simulate order creation
              const orderId = `TEST-${Date.now()}`;
              
              // Simulate approval
              if (options.onApprove) {
                await options.onApprove({ orderID: orderId }, { order: { status: 'COMPLETED' } });
              }
            } catch (error) {
              if (options.onError) {
                options.onError(error);
              } else {
                console.error('Mock PayPal Error:', error);
              }
            }
          });
          
          container.appendChild(button);
        }
      }
      
      setLoading(false);
      if (onLoaded) onLoaded();
      return;
    }
    
    // If PayPal SDK is already loaded and we're not in test mode
    if (window.paypal) {
      setLoading(false);
      if (onLoaded) onLoaded();
      return;
    }

    // Only load the real SDK if we have a valid client ID
    let scriptElement: HTMLScriptElement | null = null;
    
    try {
      scriptElement = document.createElement('script');
      scriptElement.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&components=${components.join(',')}&currency=${currency}`;
      scriptElement.async = true;
      scriptElement.dataset.sdkIntegrationSource = 'hafaloha-payment-app';
      
      // Set up load handler
      scriptElement.onload = () => {
        setLoading(false);
        if (onLoaded) onLoaded();
      };
      
      // Set up error handler
      scriptElement.onerror = (event) => {
        console.error('Failed to load PayPal SDK with client ID:', clientId);
        const loadError = new Error('Failed to load PayPal SDK');
        setError(loadError);
        setLoading(false);
        if (onError) onError(loadError);
      };
      
      // Add script to document
      document.body.appendChild(scriptElement);
    } catch (err) {
      console.error('Error setting up PayPal SDK:', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading PayPal SDK'));
      setLoading(false);
      if (onError) onError(err instanceof Error ? err : new Error('Unknown error loading PayPal SDK'));
    }
    
    // Clean up
    return () => {
      // Only remove if it's the script we added and it's still in the DOM
      if (scriptElement && document.body.contains(scriptElement)) {
        document.body.removeChild(scriptElement);
      }
    };
  }, [clientId, currency, components, onLoaded, onError, testMode]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2">Loading PayPal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
        <p>Failed to load PayPal SDK: {error.message}</p>
        <p className="text-sm mt-2">Please refresh the page and try again.</p>
      </div>
    );
  }

  return <>{children}</>;
}
