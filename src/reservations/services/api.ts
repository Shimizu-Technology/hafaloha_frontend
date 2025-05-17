// src/reservations/services/api.ts
// This is a proxy file that forwards all API requests to the shared API

import { api as sharedApi } from '../../shared/api';

// Re-export the shared API
export const api = sharedApi;

// For backward compatibility
export const fetchReservations = async (params: Record<string, any> = {}) => {
  // If a string is passed (old usage), convert it to object format
  if (typeof params === 'string') {
    params = { date: params };
  } else if (params.date) {
    // Ensure date parameter is properly formatted
    params = { ...params, date: params.date };
  }
  
  return sharedApi.get('/reservations', params);
};

export const createReservation = async (data: any) => {
  // Ensure location_id is properly passed if present
  return sharedApi.post('/reservations', data);
};

export const updateReservation = async (id: number, data: any) => {
  return sharedApi.patch(`/reservations/${id}`, data);
};

export const deleteReservation = async (id: number) => {
  return sharedApi.delete(`/reservations/${id}`);
};

export const fetchWaitlistEntries = async (date?: string) => {
  const params: any = {};
  if (date) params.date = date;
  return sharedApi.get('/waitlist_entries', params);
};

export const fetchAvailability = async (date: string, partySize: number, locationId?: number) => {
  const params: any = { date, party_size: partySize };
  if (locationId) params.location_id = locationId;
  return sharedApi.get('/availability', params);
};

export const signupUser = async (userData: any) => {
  return sharedApi.post('/signup', { user: userData });
};

export const fetchSeatAllocations = async (params: { date: string, time?: string }) => {
  return sharedApi.get('/seat_allocations', params);
};

export const fetchLayout = async (id: number) => {
  return sharedApi.get(`/layouts/${id}`);
};

export const seatAllocationReserve = async (data: any) => {
  return sharedApi.post('/seat_allocations/reserve', data);
};

export const fetchRestaurant = async (id: number) => {
  return sharedApi.get(`/restaurants/${id}`);
};

export const fetchRestaurantSettings = async () => {
  // Get the restaurantId from localStorage or context
  const restaurantId = localStorage.getItem('restaurantId') || '';
  
  // Use the /restaurants/:id endpoint instead of the non-existent /restaurant_settings
  if (restaurantId) {
    return sharedApi.get(`/restaurants/${restaurantId}`, { params: { include_settings: true } });
  }
  
  throw new Error('Restaurant ID not available for settings request');
};

export const updateRestaurant = async (id: number, data: any) => {
  return sharedApi.patch(`/restaurants/${id}`, data);
};

export const fetchAllLayouts = async () => {
  return sharedApi.get('/layouts');
};

export const seatAllocationMultiCreate = async (data: any) => {
  return sharedApi.post('/seat_allocations/multi_create', data);
};

export const seatAllocationFinish = async (data: any) => {
  return sharedApi.post('/seat_allocations/finish', data);
};

export const seatAllocationNoShow = async (data: any) => {
  return sharedApi.post('/seat_allocations/no_show', data);
};

export const seatAllocationArrive = async (data: any) => {
  return sharedApi.post('/seat_allocations/arrive', data);
};

export const seatAllocationCancel = async (data: any) => {
  return sharedApi.post('/seat_allocations/cancel', data);
};

export const updateSeat = async (id: number, data: any) => {
  return sharedApi.patch(`/seats/${id}`, data);
};

export const createLayout = async (data: any) => {
  return sharedApi.post('/layouts', data);
};

export const updateLayout = async (id: number, data: any) => {
  return sharedApi.patch(`/layouts/${id}`, data);
};

export const activateLayout = async (id: number) => {
  return sharedApi.post(`/layouts/${id}/activate`);
};

export const fetchOperatingHours = async () => {
  return sharedApi.get('/operating_hours');
};

export const updateOperatingHour = async (id: number, data: any) => {
  return sharedApi.patch(`/operating_hours/${id}`, data);
};

export const fetchSpecialEvents = async () => {
  return sharedApi.get('/special_events');
};

export const createSpecialEvent = async (data: any) => {
  return sharedApi.post('/special_events', data);
};

export const updateSpecialEvent = async (id: number, data: any) => {
  return sharedApi.patch(`/special_events/${id}`, data);
};

export const deleteSpecialEvent = async (id: number) => {
  return sharedApi.delete(`/special_events/${id}`);
};
