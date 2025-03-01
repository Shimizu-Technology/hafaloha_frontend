// src/shared/store/restaurantStore.ts

import { create } from 'zustand';
import { fetchRestaurant, updateRestaurant as apiUpdateRestaurant } from '../api/endpoints/restaurants';

export interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone_number: string;
  time_zone: string;
  time_slot_interval: number;
  default_reservation_length: number;
  admin_settings: Record<string, any>;
  allowed_origins: string[];
  frontend_id?: string;
}

interface RestaurantStore {
  restaurant: Restaurant | null;
  loading: boolean;
  error: string | null;
  fetchRestaurant: () => Promise<void>;
  updateRestaurant: (data: Partial<Restaurant>) => Promise<void>;
}

export const useRestaurantStore = create<RestaurantStore>((set, get) => ({
  restaurant: null,
  loading: false,
  error: null,
  fetchRestaurant: async () => {
    set({ loading: true, error: null });
    try {
      // Assuming the first restaurant (ID 1) is the main restaurant
      const data = await fetchRestaurant(1);
      set({ restaurant: data as Restaurant, loading: false });
    } catch (err: any) {
      console.error('Failed to fetch restaurant:', err);
      set({ 
        error: err.message || 'Failed to fetch restaurant', 
        loading: false 
      });
    }
  },
  updateRestaurant: async (data: Partial<Restaurant>) => {
    const { restaurant } = get();
    if (!restaurant) return;

    set({ loading: true, error: null });
    try {
      // Update on the server
      await apiUpdateRestaurant(restaurant.id, data);
      
      // Update in the store
      set({ 
        restaurant: { ...restaurant, ...data },
        loading: false 
      });
    } catch (err: any) {
      console.error('Failed to update restaurant:', err);
      set({ 
        error: err.message || 'Failed to update restaurant', 
        loading: false 
      });
      throw err; // Re-throw to allow the component to handle the error
    }
  },
}));
