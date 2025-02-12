// src/reservations/hooks/useReservations.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

export interface Reservation {
  id: number;
  start_time?: string;
  partySize?: number;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  restaurant_id?: number;
  seat_preferences?: string[][];
  duration_minutes?: number;
  // etc.
}

export function useReservations() {
  const { get, post, patch, delete: remove } = useReservationsHttp();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GET /reservations
  const fetchReservations = useCallback(async (params?: { date?: string }) => {
    setLoading(true);
    setError(null);
    try {
      // If you want to handle query params, you can embed them in your endpoint or
      // build a small param string. For simplicity:
      let endpoint = '/reservations';
      if (params?.date) {
        endpoint += `?date=${params.date}`;
      }
      const data = await get(endpoint);
      setReservations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // POST /reservations
  const createReservation = useCallback(async (reservationData: any) => {
    setLoading(true);
    setError(null);
    try {
      const created = await post('/reservations', { reservation: reservationData });
      setReservations((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  // PATCH /reservations/:id
  const updateReservation = useCallback(async (id: number, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patch(`/reservations/${id}`, updates);
      setReservations((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [patch]);

  // DELETE /reservations/:id
  const deleteReservation = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await remove(`/reservations/${id}`);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [remove]);

  return {
    reservations,
    loading,
    error,
    fetchReservations,
    createReservation,
    updateReservation,
    deleteReservation,
  };
}
