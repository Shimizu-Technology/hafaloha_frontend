// src/reservations/hooks/useSpecialEvents.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

export interface SpecialEvent {
  id: number;
  name: string;
  date: string;   // e.g. "2025-12-31"
  // ...
}

export function useSpecialEvents() {
  const { get, post, patch, delete: remove } = useReservationsHttp();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecialEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get('/admin/special_events');
      setEvents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const createSpecialEvent = useCallback(async (eventData: any) => {
    setLoading(true);
    setError(null);
    try {
      const created = await post('/admin/special_events', {
        special_event: eventData,
      });
      setEvents((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  const updateSpecialEvent = useCallback(async (id: number, eventData: any) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patch(`/admin/special_events/${id}`, {
        special_event: eventData,
      });
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [patch]);

  const deleteSpecialEvent = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await remove(`/admin/special_events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [remove]);

  return {
    events,
    loading,
    error,
    fetchSpecialEvents,
    createSpecialEvent,
    updateSpecialEvent,
    deleteSpecialEvent,
  };
}
