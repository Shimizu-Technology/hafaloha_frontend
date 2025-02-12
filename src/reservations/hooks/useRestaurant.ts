// src/reservations/hooks/useRestaurant.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

// Example shape; adapt to your real fields
export interface Restaurant {
  id: number;
  name: string;
  location?: string;
  // ...
}

export function useRestaurant() {
  const { get, patch } = useReservationsHttp();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await get(`/restaurants/${id}`);
      setRestaurant(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const updateRestaurant = useCallback(async (id: number, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patch(`/restaurants/${id}`, { restaurant: data });
      setRestaurant(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patch]);

  return {
    restaurant,
    loading,
    error,
    fetchRestaurant,
    updateRestaurant,
  };
}
