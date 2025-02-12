// src/reservations/hooks/useAvailability.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

export interface AvailabilitySlot {
  time: string;
  available: boolean;
  // ...
}

export function useAvailability() {
  const { get } = useReservationsHttp();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async (date: string, partySize: number) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = `/availability?date=${date}&party_size=${partySize}`;
      const data = await get(endpoint);
      setAvailability(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  return {
    availability,
    loading,
    error,
    fetchAvailability,
  };
}
