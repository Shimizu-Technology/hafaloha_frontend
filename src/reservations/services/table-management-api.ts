// src/reservations/services/table-management-api.ts
import { apiClient as axiosInstance } from '../../shared/api/apiClient';
import * as tenantUtils from '../../shared/utils/tenantUtils';
import { useRestaurantStore } from '../../shared/store/restaurantStore';

// Type definitions
export interface BlockedPeriod {
  id?: number;
  restaurant_id: number;
  location_id?: number;
  seat_section_id?: number;
  start_time: string;
  end_time: string;
  reason: string;
  status: 'active' | 'cancelled';
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface LocationCapacity {
  id?: number;
  restaurant_id: number;
  location_id: number;
  total_capacity: number;
  default_table_capacity: number;
  capacity_metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface AvailableCapacity {
  total_capacity: number;
  available_capacity: number;
  datetime: string;
}

// API functions for blocked periods
export const blockedPeriodsApi = {
  // Get all blocked periods with optional filters
  getBlockedPeriods: async (params?: {
    location_id?: number; 
    active?: boolean;
    start_date?: string;
    end_date?: string;
    restaurant_id?: number;
  }) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Use restaurant context from params or store
    const hasRestaurantId = params && 'restaurant_id' in params;
    const contextValid = hasRestaurantId || tenantUtils.validateRestaurantContext(restaurant);
    
    if (!contextValid) {
      console.warn('No valid restaurant context for blocked periods API call');
    }
    
    // Add restaurant_id to params - either from params or from store
    const requestParams = hasRestaurantId ? 
      params : 
      tenantUtils.addRestaurantIdToParams(params || {}, restaurant?.id);
    
    try {
      const response = await axiosInstance.get('/api/v1/blocked_periods', { params: requestParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching blocked periods:', error);
      throw error;
    }
  },
  
  // Get a specific blocked period
  getBlockedPeriod: async (id: number) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      console.warn('No valid restaurant context for blocked period detail API call');
    }
    
    try {
      // Add restaurant_id to query params for tenant validation on server
      const params = restaurant ? { restaurant_id: restaurant.id } : {};
      const response = await axiosInstance.get(`/api/v1/blocked_periods/${id}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching blocked period:', error);
      throw error;
    }
  },
  
  // Create a new blocked period
  createBlockedPeriod: async (blockedPeriod: any) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      throw new Error('Valid restaurant context is required to create a blocked period');
    }
    
    // Use restaurant_id from the object or add it from the store
    // We know restaurant is not null at this point due to the validation check
    const data = blockedPeriod.restaurant_id ? 
      blockedPeriod : 
      {
        ...blockedPeriod,
        restaurant_id: restaurant!.id
      };
    
    try {
      const response = await axiosInstance.post('/api/v1/blocked_periods', data);
      return response.data;
    } catch (error) {
      console.error('Error creating blocked period:', error);
      throw error;
    }
  },
  
  // Update an existing blocked period
  updateBlockedPeriod: async (id: number, blockedPeriod: Partial<BlockedPeriod>) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      throw new Error('Valid restaurant context is required to update a blocked period');
    }
    
    // Ensure restaurant_id is included in the update data
    // We've already validated restaurant is not null above
    const updateData = {
      ...blockedPeriod,
      restaurant_id: blockedPeriod.restaurant_id || restaurant!.id
    };
    
    try {
      const response = await axiosInstance.put(`/api/v1/blocked_periods/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating blocked period:', error);
      throw error;
    }
  },
  
  // Delete a blocked period
  deleteBlockedPeriod: async (id: number) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      throw new Error('Valid restaurant context is required to delete a blocked period');
    }
    
    try {
      // Pass restaurant_id as a query param to ensure tenant validation on server
      const response = await axiosInstance.delete(`/api/v1/blocked_periods/${id}`, {
        params: { restaurant_id: restaurant!.id }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting blocked period:', error);
      throw error;
    }
  }
};

// API functions for location capacities
export const locationCapacitiesApi = {
  // Get all location capacities with optional location filter
  getLocationCapacities: async (params?: { location_id?: number, restaurant_id?: number }) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Use restaurant context from params or store
    const hasRestaurantId = params && 'restaurant_id' in params;
    const contextValid = hasRestaurantId || tenantUtils.validateRestaurantContext(restaurant);
    
    if (!contextValid) {
      console.warn('No valid restaurant context for location capacities API call');
    }
    
    // Add restaurant_id to params - either from params or from store
    const requestParams = hasRestaurantId ? 
      params : 
      tenantUtils.addRestaurantIdToParams(params || {}, restaurant?.id);
    
    try {
      const response = await axiosInstance.get('/api/v1/location_capacities', { params: requestParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching location capacities:', error);
      throw error;
    }
  },
  
  // Get a specific location capacity
  getLocationCapacity: async (id: number) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      console.warn('No valid restaurant context for location capacity detail API call');
    }
    
    try {
      // Add restaurant_id to query params for tenant validation on server
      const params = restaurant ? { restaurant_id: restaurant.id } : {};
      const response = await axiosInstance.get(`/api/v1/location_capacities/${id}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching location capacity:', error);
      throw error;
    }
  },
  
  // Create a new location capacity
  createLocationCapacity: async (locationCapacity: any) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      throw new Error('Valid restaurant context is required to create a location capacity');
    }
    
    // Use restaurant_id from the object or add it from the store
    // We've already validated restaurant is not null above
    const data = locationCapacity.restaurant_id ? 
      locationCapacity : 
      {
        ...locationCapacity,
        restaurant_id: restaurant!.id
      };
    
    try {
      const response = await axiosInstance.post('/api/v1/location_capacities', data);
      return response.data;
    } catch (error) {
      console.error('Error creating location capacity:', error);
      throw error;
    }
  },
  
  // Update an existing location capacity
  updateLocationCapacity: async (id: number, locationCapacity: Partial<LocationCapacity>) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      throw new Error('Valid restaurant context is required to update a location capacity');
    }
    
    // Ensure restaurant_id is included in the update data
    // We've already validated restaurant is not null above
    const updateData = {
      ...locationCapacity,
      restaurant_id: locationCapacity.restaurant_id || restaurant!.id
    };
    
    try {
      const response = await axiosInstance.put(`/api/v1/location_capacities/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating location capacity:', error);
      throw error;
    }
  },
  
  // Get available capacity for a location at a specific date and time
  getAvailableCapacity: async (locationId: number, date: string, time: string): Promise<AvailableCapacity> => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      throw new Error('Valid restaurant context is required to get available capacity');
    }
    
    // Create params with restaurant context
    const params = {
      date,
      time,
      restaurant_id: restaurant!.id
    };
    
    try {
      const response = await axiosInstance.get(`/api/v1/locations/${locationId}/available_capacity`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching available capacity:', error);
      throw error;
    }
  }
};
