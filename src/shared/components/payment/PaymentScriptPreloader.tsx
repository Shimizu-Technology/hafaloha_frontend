import { useEffect, useState } from 'react';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { initPaymentScript } from '../../utils/PaymentScriptLoader';

/**
 * PaymentScriptPreloader
 * 
 * This component preloads the appropriate payment script (Stripe or PayPal)
 * based on the restaurant's configured payment processor.
 * 
 * It should be mounted early in the application lifecycle to ensure
 * payment scripts are loaded before they're needed.
 */
export function PaymentScriptPreloader() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restaurant = useRestaurantStore((state) => state.restaurant);

  useEffect(() => {
    // Skip if we've already attempted to load or if restaurant data isn't available yet
    if (isLoading || !restaurant) {
      return;
    }

    const loadPaymentScript = async () => {
      try {
        setIsLoading(true);
        
        // Get payment gateway settings from restaurant
        const paymentGateway = restaurant.admin_settings?.payment_gateway || {};
        const paymentProcessor = paymentGateway.payment_processor || 'paypal';
        const testMode = paymentGateway.test_mode !== false;
        
        // Skip actual loading in test mode
        if (testMode) {
          console.log('Payment in test mode, skipping script loading');
          return;
        }
        
        // Initialize the appropriate payment script
        if (paymentProcessor === 'stripe') {
          await initPaymentScript('stripe');
          console.log('Stripe script preloaded successfully');
        } else if (paymentProcessor === 'paypal') {
          const clientId = paymentGateway.client_id as string;
          if (clientId) {
            await initPaymentScript('paypal', { clientId });
            console.log('PayPal script preloaded successfully');
          } else {
            console.warn('PayPal client ID not found, skipping script preload');
          }
        }
      } catch (err) {
        console.error('Error preloading payment script:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadPaymentScript();
  }, [restaurant, isLoading]);

  // This component doesn't render anything
  return null;
}