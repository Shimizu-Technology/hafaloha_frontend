// src/reservations/hooks/useWaitlist.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

export interface WaitlistEntry {
  id: number;
  name?: string;
  phone?: string;
  partySize?: number;
  check_in_time?: string;
  status?: string;
  restaurant_id?: number;
}

export function useWaitlist() {
  const { get, post } = useReservationsHttp();
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWaitlistEntries = useCallback(async (params?: { date?: string }) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/waitlist_entries';
      if (params?.date) {
        endpoint += `?date=${params.date}`;
      }
      const data = await get(endpoint);
      setWaitlistEntries(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const createWaitlistEntry = useCallback(async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const created = await post('/waitlist_entries', data);
      setWaitlistEntries((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  return {
    waitlistEntries,
    loading,
    error,
    fetchWaitlistEntries,
    createWaitlistEntry,
  };
}
