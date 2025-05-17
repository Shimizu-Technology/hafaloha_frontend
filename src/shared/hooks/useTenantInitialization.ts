// src/shared/hooks/useTenantInitialization.ts
import { useEffect, useState } from 'react';
import { useRestaurantStore } from '../store/restaurantStore';
import { config } from '../config';

/**
 * Hook to initialize tenant context for the entire application
 * Sets the restaurantId in localStorage for tenant isolation
 */
export function useTenantInitialization() {
  const { restaurant, fetchRestaurant } = useRestaurantStore();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTenantContext = async () => {
      try {
        // First check if we already have a restaurant ID in localStorage
        const storedId = localStorage.getItem('restaurantId');
        if (storedId) {
          console.log('Tenant context already initialized with ID:', storedId);
          setInitialized(true);
          return;
        }

        // If not, check if we have restaurant in state already
        if (restaurant?.id) {
          localStorage.setItem('restaurantId', restaurant.id.toString());
          console.log('Tenant context initialized from store with ID:', restaurant.id);
          setInitialized(true);
          return;
        }

        // Otherwise fetch the restaurant
        await fetchRestaurant();
        
        // After fetching, check if we have restaurant data
        const { restaurant: fetchedRestaurant } = useRestaurantStore.getState();
        if (fetchedRestaurant?.id) {
          localStorage.setItem('restaurantId', fetchedRestaurant.id.toString());
          console.log('Tenant context initialized after fetch with ID:', fetchedRestaurant.id);
          setInitialized(true);
          return;
        }

        // If still no restaurant, fall back to config
        const configRestaurantId = parseInt(config.restaurantId);
        if (!isNaN(configRestaurantId)) {
          localStorage.setItem('restaurantId', configRestaurantId.toString());
          console.log('Tenant context initialized from config with ID:', configRestaurantId);
          setInitialized(true);
          return;
        }

        // If all else fails, we have an error
        setError('Failed to initialize tenant context. Restaurant context missing.');
        console.error('Failed to initialize tenant context');
      } catch (err) {
        setError('Error initializing tenant context');
        console.error('Error initializing tenant context:', err);
      }
    };

    initializeTenantContext();
  }, [restaurant, fetchRestaurant]);

  return { initialized, error };
}
