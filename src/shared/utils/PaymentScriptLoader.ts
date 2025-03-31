/**
 * PaymentScriptLoader.ts
 * A utility for dynamically loading payment scripts (Stripe, PayPal) based on configuration
 */

// Track script loading status
const scriptStatus: Record<string, 'loading' | 'loaded' | 'error' | undefined> = {};

/**
 * Load a script dynamically
 * @param src Script source URL
 * @param id Optional ID for the script tag
 * @returns Promise that resolves when the script is loaded
 */
function loadScript(src: string, id?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded or loading
    if (scriptStatus[src] === 'loaded') {
      resolve();
      return;
    }

    if (scriptStatus[src] === 'loading') {
      // Wait for script to load
      const checkLoaded = setInterval(() => {
        if (scriptStatus[src] === 'loaded') {
          clearInterval(checkLoaded);
          resolve();
        } else if (scriptStatus[src] === 'error') {
          clearInterval(checkLoaded);
          reject(new Error(`Failed to load script: ${src}`));
        }
      }, 100);
      return;
    }

    // Mark as loading
    scriptStatus[src] = 'loading';

    // Create script element
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (id) script.id = id;

    // Set up load and error handlers
    script.onload = () => {
      scriptStatus[src] = 'loaded';
      resolve();
    };

    script.onerror = () => {
      scriptStatus[src] = 'error';
      document.body.removeChild(script);
      reject(new Error(`Failed to load script: ${src}`));
    };

    // Add to document
    document.body.appendChild(script);
  });
}

/**
 * Load Stripe.js script
 * @returns Promise that resolves when Stripe.js is loaded
 */
export async function loadStripeScript(): Promise<void> {
  try {
    // Check if Stripe is already available
    if ((window as any).Stripe) {
      return;
    }
    
    await loadScript('https://js.stripe.com/v3/', 'stripe-js');
  } catch (error) {
    console.error('Error loading Stripe script:', error);
    throw error;
  }
}

/**
 * Load PayPal script
 * @param clientId PayPal client ID
 * @returns Promise that resolves when PayPal script is loaded
 */
export async function loadPayPalScript(clientId: string): Promise<void> {
  try {
    // Check if PayPal is already available
    if ((window as any).paypal) {
      return;
    }
    
    const paypalScriptUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&components=buttons,card-fields`;
    await loadScript(paypalScriptUrl, 'paypal-js');
  } catch (error) {
    console.error('Error loading PayPal script:', error);
    throw error;
  }
}

/**
 * Initialize the appropriate payment script based on the payment processor
 * @param paymentProcessor The configured payment processor ('stripe' or 'paypal')
 * @param config Configuration options (clientId for PayPal)
 * @returns Promise that resolves when the script is loaded
 */
export async function initPaymentScript(
  paymentProcessor: 'stripe' | 'paypal',
  config?: { clientId?: string }
): Promise<void> {
  try {
    if (paymentProcessor === 'stripe') {
      await loadStripeScript();
    } else if (paymentProcessor === 'paypal' && config?.clientId) {
      await loadPayPalScript(config.clientId);
    } else {
      throw new Error(`Invalid payment processor or missing configuration: ${paymentProcessor}`);
    }
  } catch (error) {
    console.error('Error initializing payment script:', error);
    throw error;
  }
}

/**
 * Get the Stripe instance
 * @param publishableKey Stripe publishable key
 * @returns Stripe instance
 */
export function getStripe(publishableKey: string): any {
  if (!(window as any).Stripe) {
    throw new Error('Stripe.js not loaded');
  }
  return (window as any).Stripe(publishableKey);
}