// src/reservations/services/api.ts

import axios from 'axios';
import { isTokenExpired, getRestaurantId } from '../../shared/utils/jwt';

// Depending on your environment setup, you might have a VITE_API_URL or fallback to localhost:
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Default restaurant ID from environment (for public endpoints)
const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_RESTAURANT_ID;

// Endpoints that require restaurant_id parameter
const RESTAURANT_CONTEXT_ENDPOINTS = [
  'availability',
  'layouts',
  'reservations',
  'waitlist_entries',
  'seat_allocations'
];

// Create an Axios instance
export const apiClient = axios.create({ baseURL });

// Automatically attach the JWT token from localStorage, if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  // Check token expiration
  if (token) {
    if (isTokenExpired(token)) {
      // Token is expired, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add restaurant_id to params for endpoints that need it
    if (config.url && RESTAURANT_CONTEXT_ENDPOINTS.some(endpoint => config.url?.includes(endpoint))) {
      const restaurantId = getRestaurantId(token) || DEFAULT_RESTAURANT_ID;
      
      if (restaurantId) {
        config.params = config.params || {};
        if (!config.params.restaurant_id) {
          config.params.restaurant_id = restaurantId;
        }
      }
    }
  }
  
  return config;
});

// Add response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Clear auth state and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────
// RESTAURANT
// ─────────────────────────────────────────────────────────────────
export async function fetchRestaurant(id: number) {
  const resp = await apiClient.get(`/restaurants/${id}`);
  return resp.data;
}

export async function updateRestaurant(id: number, data: any) {
  const resp = await apiClient.patch(`/restaurants/${id}`, {
    restaurant: data,
  });
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// LAYOUTS
// ─────────────────────────────────────────────────────────────────
export async function fetchAllLayouts() {
  const resp = await apiClient.get('/layouts');
  return resp.data;
}

export async function fetchLayout(layoutId: number) {
  const resp = await apiClient.get(`/layouts/${layoutId}`);
  return resp.data;
}

export async function createLayout(layoutData: any) {
  const resp = await apiClient.post('/layouts', { layout: layoutData });
  return resp.data;
}

export async function updateLayout(layoutId: number, layoutData: any) {
  const resp = await apiClient.patch(`/layouts/${layoutId}`, { layout: layoutData });
  return resp.data;
}

export async function activateLayout(layoutId: number) {
  const resp = await apiClient.post(`/layouts/${layoutId}/activate`);
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// RESERVATIONS
// ─────────────────────────────────────────────────────────────────
interface UpdateReservationData {
  party_size?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  status?: string;
  seat_preferences?: string[][];
  duration_minutes?: number;
}

export async function fetchReservations(params?: { date?: string }) {
  const resp = await apiClient.get('/reservations', { params });
  return resp.data;
}

export async function createReservation(data: {
  reservation: {
    restaurant_id?: number | string;
    start_time: string;
    party_size: number;
    status?: string;
    seat_preferences?: string[][];
    duration_minutes?: number;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
  }
}) {
  // Add restaurant_id if not provided
  if (!data.reservation.restaurant_id) {
    const token = localStorage.getItem('token') || '';
    const restaurantId = getRestaurantId(token) || DEFAULT_RESTAURANT_ID;
    if (restaurantId) {
      data.reservation.restaurant_id = restaurantId;
    }
  }
  const resp = await apiClient.post('/reservations', data);
  return resp.data;
}

export async function updateReservation(id: number, data: UpdateReservationData) {
  const resp = await apiClient.patch(`/reservations/${id}`, data);
  return resp.data;
}

export async function deleteReservation(id: number) {
  await apiClient.delete(`/reservations/${id}`);
}

// ─────────────────────────────────────────────────────────────────
// WAITLIST
// ─────────────────────────────────────────────────────────────────
export async function fetchWaitlistEntries(params?: { date?: string }) {
  const resp = await apiClient.get('/waitlist_entries', { params });
  return resp.data;
}

export async function createWaitlistEntry(data: {
  contact_name: string;
  party_size: number;
  contact_phone?: string;
  check_in_time?: string;
  status?: string;
  restaurant_id?: number | string;
}) {
  // Add restaurant_id if not provided
  if (!data.restaurant_id) {
    const token = localStorage.getItem('token') || '';
    const restaurantId = getRestaurantId(token) || DEFAULT_RESTAURANT_ID;
    if (restaurantId) {
      data.restaurant_id = restaurantId;
    }
  }
  const resp = await apiClient.post('/waitlist_entries', data);
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// SEAT ALLOCATIONS
// ─────────────────────────────────────────────────────────────────
export async function fetchSeatAllocations(params?: { date?: string }) {
  const resp = await apiClient.get('/seat_allocations', { params });
  return resp.data;
}

export async function seatAllocationMultiCreate(allocationData: any) {
  const resp = await apiClient.post('/seat_allocations/multi_create', {
    seat_allocation: allocationData,
  });
  return resp.data;
}

export async function seatAllocationReserve(allocationData: {
  occupant_type: 'reservation' | 'waitlist';
  occupant_id: number;
  seat_labels?: string[];
  seat_ids?: number[];
  start_time: string;
  end_time?: string;
}) {
  const resp = await apiClient.post('/seat_allocations/reserve', {
    seat_allocation: allocationData,
  });
  return resp.data;
}

export async function seatAllocationFinish(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/finish', payload);
  return resp.data;
}

export async function seatAllocationNoShow(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/no_show', payload);
  return resp.data;
}

export async function seatAllocationCancel(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/cancel', payload);
  return resp.data;
}

export async function seatAllocationArrive(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/arrive', payload);
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────────────────────────
export async function fetchAvailability(date: string, partySize: number) {
  const token = localStorage.getItem('token') || '';
  const restaurantId = getRestaurantId(token) || DEFAULT_RESTAURANT_ID;
  
  const resp = await apiClient.get('/availability', {
    params: { 
      date, 
      party_size: partySize,
      restaurant_id: restaurantId
    },
  });
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────
export async function signupUser(data: {
  first_name: string;
  last_name: string;
  phone?: string;
  email: string;
  password: string;
  password_confirmation: string;
  restaurant_id?: number | string;
}) {
  // Add restaurant_id if not provided
  if (!data.restaurant_id) {
    const restaurantId = DEFAULT_RESTAURANT_ID;
    if (restaurantId) {
      data.restaurant_id = restaurantId;
    }
  }
  const resp = await apiClient.post('/signup', data);
  return resp.data;
}

export async function loginUser(email: string, password: string) {
  const resp = await apiClient.post('/login', { email, password });
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// SEATS
// ─────────────────────────────────────────────────────────────────
export async function updateSeat(
  seatId: number,
  updates: Partial<{
    label: string;
    position_x: number;
    position_y: number;
    capacity: number;
  }>
) {
  const resp = await apiClient.patch(`/seats/${seatId}`, { seat: updates });
  return resp.data;
}

export async function bulkUpdateSeats(
  seatUpdates: Array<{
    id: number;
    label?: string;
    position_x?: number;
    position_y?: number;
    capacity?: number;
  }>
) {
  const resp = await apiClient.post('/seats/bulk_update', {
    seats: seatUpdates,
  });
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// OPERATING HOURS
// ─────────────────────────────────────────────────────────────────
export async function fetchOperatingHours() {
  const resp = await apiClient.get('/admin/operating_hours');
  return resp.data;
}

export async function updateOperatingHour(id: number, data: any) {
  const resp = await apiClient.patch(`/admin/operating_hours/${id}`, {
    operating_hour: data,
  });
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────
// SPECIAL EVENTS
// ─────────────────────────────────────────────────────────────────
export async function fetchSpecialEvents() {
  const resp = await apiClient.get('/admin/special_events');
  return resp.data;
}

export async function createSpecialEvent(data: any) {
  const resp = await apiClient.post('/admin/special_events', {
    special_event: data,
  });
  return resp.data;
}

export async function updateSpecialEvent(id: number, data: any) {
  const resp = await apiClient.patch(`/admin/special_events/${id}`, {
    special_event: data,
  });
  return resp.data;
}

export async function deleteSpecialEvent(id: number) {
  await apiClient.delete(`/admin/special_events/${id}`);
}
