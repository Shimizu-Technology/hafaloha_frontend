// src/shared/components/restaurant/RestaurantProvider.tsx

import React, { useEffect } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';

interface RestaurantProviderProps {
  children: React.ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const { fetchRestaurant } = useRestaurantStore();
  
  useEffect(() => {
    // Always fetch restaurant data to ensure it's up to date
    fetchRestaurant();
    
    // Set up an interval to refresh restaurant data every 30 seconds
    // This ensures that any changes made in the admin panel are reflected throughout the app
    const intervalId = setInterval(() => {
      fetchRestaurant();
    }, 30000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [fetchRestaurant]);
  
  return <>{children}</>;
}
