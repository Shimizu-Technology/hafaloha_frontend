// src/shared/components/restaurant/RestaurantProvider.tsx

import React, { useEffect } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { eventService, EVENT_TYPES } from '../../../ordering/services/eventService';

interface RestaurantProviderProps {
  children: React.ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const { fetchRestaurant } = useRestaurantStore();
  
  useEffect(() => {
    // Always fetch restaurant data to ensure it's up to date
    fetchRestaurant();
    
    // Set up WebSocket subscription for restaurant updates
    // This ensures that any changes made in the admin panel are reflected throughout the app
    const restaurantId = '1'; // Assuming the first restaurant (ID 1) is the main restaurant
    
    // Subscribe to restaurant events
    eventService.subscribeToRestaurant(restaurantId);
    
    // Subscribe to restaurant updates
    const restaurantUpdatedSubscription = eventService.subscribe(EVENT_TYPES.RESTAURANT_UPDATED, () => {
      console.log('[RestaurantProvider] WebSocket: Restaurant updated');
      fetchRestaurant();
    });
    
    // Clean up the subscription when the component unmounts
    return () => {
      restaurantUpdatedSubscription.unsubscribe();
      eventService.unsubscribe();
    };
  }, [fetchRestaurant]);
  
  return <>{children}</>;
}
