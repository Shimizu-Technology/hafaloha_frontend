// src/services/api.ts

import axios from 'axios';

// For Vite or similar bundlers, baseURL comes from an .env variable or defaults to localhost.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create an Axios instance
export const apiClient = axios.create({ baseURL });

// Interceptor: attach JWT on every request (if present in localStorage)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -------------------------------------------------------------------
// 1) Restaurant: fetch & update (for Admin Settings, etc.)
// -------------------------------------------------------------------
export async function fetchRestaurant(id: number) {
  const resp = await apiClient.get(`/restaurants/${id}`);
  return resp.data;
}

/**
 * Update a restaurant's fields by ID.
 * Expects an object like:
 *   {
 *     opening_time: "17:00:00",
 *     closing_time: "21:00:00",
 *     default_reservation_length: 60,
 *     admin_settings: { specialRules: true }
 *     // plus any other fields you permit on the backend
 *   }
 * On the Rails side, make sure `params.require(:restaurant).permit(...)`
 * includes these fields. 
 */
export async function updateRestaurant(id: number, data: any) {
  const resp = await apiClient.patch(`/restaurants/${id}`, {
    restaurant: data,
  });
  return resp.data;
}

// -------------------------------------------------------------------
// 2) Layouts
// -------------------------------------------------------------------
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

// -------------------------------------------------------------------
// 3) Reservations
// -------------------------------------------------------------------
interface UpdateReservationData {
  party_size?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  status?: string;
  seat_preferences?: string[][];
  duration_minutes?: number; // <--- optional field
}

export async function fetchReservations(params?: { date?: string }) {
  const resp = await apiClient.get('/reservations', { params });
  return resp.data;
}

/**
 * Creates a new reservation.
 * Optionally includes seat_preferences and duration_minutes.
 */
export async function createReservation(data: {
  reservation: {
    restaurant_id?: number;
    start_time: string;
    party_size: number;
    status?: string;
    seat_preferences?: string[][];
    duration_minutes?: number;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    // etc
  }
}) {
  const resp = await apiClient.post('/reservations', data);
  return resp.data;
}

/**
 * Patch an existing reservation, optionally including seat_preferences + duration_minutes.
 */
export async function updateReservation(id: number, data: UpdateReservationData) {
  const resp = await apiClient.patch(`/reservations/${id}`, data);
  return resp.data;
}

export async function deleteReservation(id: number) {
  await apiClient.delete(`/reservations/${id}`);
}

// -------------------------------------------------------------------
// 4) Waitlist
// -------------------------------------------------------------------
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
  restaurant_id?: number;
}) {
  const resp = await apiClient.post('/waitlist_entries', data);
  return resp.data;
}

// -------------------------------------------------------------------
// 5) Seat Allocations
// -------------------------------------------------------------------
export async function fetchSeatAllocations(params?: { date?: string }) {
  const resp = await apiClient.get('/seat_allocations', { params });
  return resp.data;
}

/**
 * seatAllocationMultiCreate:
 *  - Typically used for seating multiple seats at once.
 */
export async function seatAllocationMultiCreate(allocationData: any) {
  const resp = await apiClient.post('/seat_allocations/multi_create', {
    seat_allocation: allocationData,
  });
  return resp.data;
}

/**
 * seatAllocationReserve:
 *  - If your backend allows passing seat_labels instead of seat_ids,
 *    you can do so here. Otherwise, do seat label→ID conversion or
 *    use a specialized “assign_from_preference” endpoint.
 */
export async function seatAllocationReserve(allocationData: {
  occupant_type: 'reservation' | 'waitlist';
  occupant_id: number;
  seat_labels?: string[];
  seat_ids?: number[];
  start_time: string;
  end_time?: string; // optional if your backend calculates it
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

// -------------------------------------------------------------------
// 6) Availability
// -------------------------------------------------------------------
export async function fetchAvailability(date: string, partySize: number) {
  const resp = await apiClient.get('/availability', {
    params: { date, party_size: partySize },
  });
  return resp.data;
}

// -------------------------------------------------------------------
// 7) Auth Calls (Signup / Login)
// -------------------------------------------------------------------
export async function signupUser(data: {
  first_name: string;
  last_name: string;
  phone?: string;
  email: string;
  password: string;
  password_confirmation: string;
  restaurant_id?: number;
}) {
  const resp = await apiClient.post('/signup', data);
  return resp.data;
}

export async function loginUser(email: string, password: string) {
  const resp = await apiClient.post('/login', { email, password });
  return resp.data;
}

// -------------------------------------------------------------------
// 8) Seats
// -------------------------------------------------------------------
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

/** Bulk update seats (optional) */
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
