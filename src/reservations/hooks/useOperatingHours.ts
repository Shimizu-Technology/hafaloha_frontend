// src/reservations/hooks/useOperatingHours.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

export interface OperatingHour {
  id: number;
  dayOfWeek: string;
  opensAt: string;
  closesAt: string;
  // ...
}

export function useOperatingHours() {
  const { get, patch } = useReservationsHttp();
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOperatingHours = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get('/admin/operating_hours');
      setOperatingHours(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const updateOperatingHour = useCallback(async (id: number, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patch(`/admin/operating_hours/${id}`, {
        operating_hour: updates,
      });
      setOperatingHours((prev) =>
        prev.map((oh) => (oh.id === updated.id ? updated : oh))
      );
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [patch]);

  return {
    operatingHours,
    loading,
    error,
    fetchOperatingHours,
    updateOperatingHour,
  };
}
