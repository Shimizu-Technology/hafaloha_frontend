// src/reservations/hooks/useLayouts.ts
import { useState, useCallback } from 'react';
import { useReservationsHttp } from './useReservationsHttp';

export interface Layout {
  id: number;
  name: string;
  // ... any other fields
}

/**
 * If you have seat data or layout data in the same domain,
 * you can handle seat update logic here as well.
 */
export function useLayouts() {
  const { get, post, patch } = useReservationsHttp();

  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // Fetch all layouts
  // ─────────────────────────────────────────────────────────────────
  const fetchAllLayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get('/layouts');
      setLayouts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // ─────────────────────────────────────────────────────────────────
  // Create a layout
  // ─────────────────────────────────────────────────────────────────
  const createLayout = useCallback(async (layoutData: any) => {
    setLoading(true);
    setError(null);
    try {
      const created = await post('/layouts', { layout: layoutData });
      setLayouts((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  // ─────────────────────────────────────────────────────────────────
  // Update a layout
  // ─────────────────────────────────────────────────────────────────
  const updateLayout = useCallback(async (layoutId: number, layoutData: any) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patch(`/layouts/${layoutId}`, {
        layout: layoutData,
      });
      setLayouts((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [patch]);

  // ─────────────────────────────────────────────────────────────────
  // Activate a layout (optional)
  // ─────────────────────────────────────────────────────────────────
  const activateLayout = useCallback(async (layoutId: number) => {
    setLoading(true);
    setError(null);
    try {
      // If your Rails endpoint is POST /layouts/:id/activate
      const res = await post(`/layouts/${layoutId}/activate`, {});
      // Possibly update local state if needed
      return res;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post]);

  // ─────────────────────────────────────────────────────────────────
  // Update a seat (e.g. rename seat label)
  // ─────────────────────────────────────────────────────────────────
  const updateSeat = useCallback(
    async (
      seatId: number,
      seatData: Partial<{ label: string; capacity?: number }>
    ) => {
      setLoading(true);
      setError(null);
      try {
        // Example: PATCH /seats/:id => { seat: {...} }
        const updatedSeat = await patch(`/seats/${seatId}`, { seat: seatData });
        // You can optionally update local state if you keep seats in the hook
        return updatedSeat; // Return the seat object from the server
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [patch]
  );

  return {
    layouts,
    loading,
    error,
    // Layout actions
    fetchAllLayouts,
    createLayout,
    updateLayout,
    activateLayout,

    // Seat actions
    updateSeat,
  };
}
