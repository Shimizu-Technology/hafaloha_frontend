// src/ordering/types/reservation.ts

/**
 * BlockedPeriod interface for reservation system
 * Represents a time period where reservations are blocked
 */
export interface BlockedPeriod {
  id?: number;
  restaurant_id: number;
  location_id?: number;
  start_time: string;
  end_time: string;
  reason: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Location interface for reservation system
 */
export interface Location {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}
