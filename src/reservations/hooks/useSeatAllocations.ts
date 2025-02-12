// src/reservations/hooks/useSeatAllocations.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

export interface SeatAllocation {
  // shape from your Rails response
}

export function useSeatAllocations() {
  const { get, post } = useReservationsHttp();
  const [allocations, setAllocations] = useState<SeatAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeatAllocations = useCallback(async (params?: { date?: string }) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/seat_allocations';
      if (params?.date) {
        endpoint += `?date=${params.date}`;
      }
      const data = await get(endpoint);
      setAllocations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const seatAllocationMultiCreate = useCallback(async (allocationData: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await post('/seat_allocations/multi_create', {
        seat_allocation: allocationData,
      });
      // Possibly do a refetch or manually merge new data
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  // Similarly for seatAllocationReserve, seatAllocationFinish, noShow, cancel, arrive
  const seatAllocationReserve = useCallback(async (allocationData: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await post('/seat_allocations/reserve', {
        seat_allocation: allocationData,
      });
      // ... update state or refetch
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  // etc. You can define each method similarly

  return {
    allocations,
    loading,
    error,
    fetchSeatAllocations,
    seatAllocationMultiCreate,
    seatAllocationReserve,
    // seatAllocationFinish, seatAllocationNoShow, seatAllocationCancel, seatAllocationArrive, ...
  };
}
