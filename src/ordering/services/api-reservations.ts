// src/ordering/services/api-reservations.ts

import { apiClient } from '../../shared/api/apiClient';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import * as tenantUtils from '../../shared/utils/tenantUtils';

// Custom types for API responses
// Removed unused interface

// Interfaces for reservation data
export interface Reservation {
  id: number;
  restaurant_id: number;
  reservation_number?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size: number;
  start_time: string;
  end_time?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'seated' | 'completed' | 'no_show';
  notes?: string;
  special_requests?: string; // Added to match the backend API field
  created_at?: string;
  updated_at?: string;
  seat_labels?: string[];
  seat_preferences?: string[][];
  location_id?: number;
  location?: {
    id: number;
    name: string;
  };
}

export interface WaitlistEntry {
  id: number;
  restaurant_id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size: number;
  check_in_time: string;
  status: 'waiting' | 'cancelled' | 'seated' | 'left';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SeatAllocation {
  id: number;
  seat_id: number;
  occupant_type: 'reservation' | 'waitlist' | null;
  occupant_id: number | null;
  occupant_name?: string;
  occupant_party_size?: number;
  occupant_status?: string;
  start_time?: string;
  end_time?: string;
  released_at?: string | null;
  reservation?: Reservation;
}

// Reservations API service with tenant isolation
export const fetchReservations = async (params?: any): Promise<Reservation[]> => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for fetchReservations');
    return [];
  }
  
  try {
    // Ensure restaurant_id is included in the params
    const requestParams = {
      ...params,
      restaurant_id: restaurant.id
    };
    
    console.log('Fetching reservations with params:', requestParams);
    
    const response = await apiClient.get('/reservations', {
      params: requestParams,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Reservations API response:', response.data);
    
    // Handle various response formats
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        return response.data as Reservation[];
      } else if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data as Reservation[];
      }
    }
    
    console.warn('Unexpected reservation response format');
    return [];
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
};

// Waitlist API service with tenant isolation
export const fetchWaitlistEntries = async (params?: any): Promise<WaitlistEntry[]> => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for fetchWaitlistEntries');
    return [];
  }
  
  try {
    // Ensure restaurant_id is included in the params
    const requestParams = {
      ...params,
      restaurant_id: restaurant.id
    };
    
    console.log('Fetching waitlist entries with params:', requestParams);
    
    // Use the correct API endpoint for waitlist entries
    const response = await apiClient.get('/waitlist_entries', {
      params: requestParams,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Waitlist API response:', response.data);
    
    // Handle various response formats
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        return response.data as WaitlistEntry[];
      } else if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data as WaitlistEntry[];
      }
    }
    
    console.warn('Unexpected waitlist response format');
    return [];
  } catch (error) {
    console.error('Error fetching waitlist entries:', error);
    return [];
  }
};

// Fetch seat allocations
export const fetchSeatAllocations = async (params?: any): Promise<SeatAllocation[]> => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for fetchSeatAllocations');
    return [];
  }
  
  try {
    // Ensure restaurant_id is included in the params
    const requestParams = {
      ...params,
      restaurant_id: restaurant.id
    };
    
    console.log('Fetching seat allocations with params:', requestParams);
    
    const response = await apiClient.get('/seat_allocations', {
      params: requestParams,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Seat allocations API response:', response.data);
    
    // Handle various response formats
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        return response.data as SeatAllocation[];
      } else if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data as SeatAllocation[];
      }
    }
    
    console.warn('Unexpected seat allocations response format');
    return [];
  } catch (error) {
    console.error('Error fetching seat allocations:', error);
    return [];
  }
};

// Create multiple seat allocations
export const seatAllocationMultiCreate = async (data: any) => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for seatAllocationMultiCreate');
    throw new Error('Restaurant context required');
  }
  
  try {
    // Ensure restaurant_id is included in the data
    const requestData = {
      ...data,
      restaurant_id: restaurant.id
    };
    
    const response = await apiClient.post('/seat_allocations/multi_create', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating seat allocations:', error);
    throw error;
  }
};

// Mark seat allocation as arrived
export const seatAllocationArrive = async (data: any) => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for seatAllocationArrive');
    throw new Error('Restaurant context required');
  }
  
  try {
    // Ensure restaurant_id is included in the data
    const requestData = {
      ...data,
      restaurant_id: restaurant.id
    };
    
    const response = await apiClient.post('/seat_allocations/arrive', requestData);
    return response.data;
  } catch (error) {
    console.error('Error marking seat allocation as arrived:', error);
    throw error;
  }
};

// Mark seat allocation as finished
export const seatAllocationFinish = async (data: any) => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for seatAllocationFinish');
    throw new Error('Restaurant context required');
  }
  
  try {
    // Ensure restaurant_id is included in the data
    const requestData = {
      ...data,
      restaurant_id: restaurant.id
    };
    
    const response = await apiClient.post('/seat_allocations/finish', requestData);
    return response.data;
  } catch (error) {
    console.error('Error marking seat allocation as finished:', error);
    throw error;
  }
};

// Mark seat allocation as no-show
export const seatAllocationNoShow = async (data: any) => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for seatAllocationNoShow');
    throw new Error('Restaurant context required');
  }
  
  try {
    // Ensure restaurant_id is included in the data
    const requestData = {
      ...data,
      restaurant_id: restaurant.id
    };
    
    const response = await apiClient.post('/seat_allocations/no_show', requestData);
    return response.data;
  } catch (error) {
    console.error('Error marking seat allocation as no-show:', error);
    throw error;
  }
};

// Cancel seat allocation
export const seatAllocationCancel = async (data: any) => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for seatAllocationCancel');
    throw new Error('Restaurant context required');
  }
  
  try {
    // Ensure restaurant_id is included in the data
    const requestData = {
      ...data,
      restaurant_id: restaurant.id
    };
    
    const response = await apiClient.post('/seat_allocations/cancel', requestData);
    return response.data;
  } catch (error) {
    console.error('Error cancelling seat allocation:', error);
    throw error;
  }
};

// Update a reservation
export const updateReservation = async (id: number, data: any) => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for updateReservation');
    throw new Error('Restaurant context required');
  }
  
  try {
    // Ensure restaurant_id is included in the data
    const requestData = {
      ...data,
      restaurant_id: restaurant.id
    };
    
    const response = await apiClient.patch(`/reservations/${id}`, requestData);
    return response.data;
  } catch (error) {
    console.error('Error updating reservation:', error);
    throw error;
  }
};

// Delete a reservation
export const deleteReservation = async (id: number) => {
  const { restaurant } = useRestaurantStore.getState();
  
  if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
    console.error('Restaurant context required for deleteReservation');
    throw new Error('Restaurant context required');
  }
  
  try {
    const response = await apiClient.delete(`/reservations/${id}`, {
      params: { restaurant_id: restaurant.id }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting reservation:', error);
    throw error;
  }
};

// Export all API services
export default {
  fetchReservations,
  fetchWaitlistEntries,
  fetchSeatAllocations,
  seatAllocationMultiCreate,
  seatAllocationArrive,
  seatAllocationFinish,
  seatAllocationNoShow,
  seatAllocationCancel,
  updateReservation,
  deleteReservation
};
