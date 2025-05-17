// src/reservations/services/locations-api.ts
import { apiClient as axiosInstance } from '../../shared/api/apiClient';
import * as tenantUtils from '../../shared/utils/tenantUtils';
import { useRestaurantStore } from '../../shared/store/restaurantStore';

// Type definitions
export interface Location {
  id: number;
  restaurant_id: number;
  name: string;
  address?: string;
  phone_number?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
}

// API functions for locations
export const locationsApi = {
  // Get all locations with optional filters
  getLocations: async (params?: {
    is_active?: boolean;
    restaurant_id?: number;
  }) => {
    // Get restaurant context from store - will use provided restaurant_id if available
    const { restaurant } = useRestaurantStore.getState();
    
    // Use restaurant context from params or store
    const hasRestaurantId = params && 'restaurant_id' in params;
    const contextValid = hasRestaurantId || tenantUtils.validateRestaurantContext(restaurant);
    
    if (!contextValid) {
      console.warn('No valid restaurant context for locations API call');
    }
    
    // Add restaurant_id to params - either from params or from store
    const requestParams = hasRestaurantId ? 
      params : 
      tenantUtils.addRestaurantIdToParams(params || {}, restaurant?.id);
    
    try {
      const response = await axiosInstance.get('/locations', { params: requestParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },
  
  // Get a specific location
  getLocation: async (id: number) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      console.warn('No valid restaurant context for location detail API call');
    }
    
    try {
      // Add restaurant_id to query params for tenant validation on server
      const params = restaurant ? { restaurant_id: restaurant.id } : {};
      const response = await axiosInstance.get(`/locations/${id}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching location:', error);
      throw error;
    }
  }
};
