// src/ordering/components/admin/reservations/FloorPlanManager.tsx
import React, { useEffect, useState } from 'react';
import { useDateFilter } from '../../../../reservations/context/DateFilterContext';

// Tenant utilities
import { validateRestaurantContext, addRestaurantIdToParams } from '../../../../shared/utils/tenantUtils';

// Re‑use existing, battle‑tested components + APIs from the Reservations module
import FloorManager from '../../../../reservations/components/FloorManager';
import {
  fetchReservations as apiFetchReservations,
  fetchWaitlistEntries as apiFetchWaitlist,
} from '../../../../reservations/services/api';

// Keep local interfaces in‑sync with the Reservations domain
interface Reservation {
  id: number;
  contact_name?: string;
  start_time?: string;
  party_size?: number;
  status?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at?: string;
  seat_labels?: string[];
  seat_preferences?: string[][];
}

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  check_in_time?: string;
  party_size?: number;
  status?: string;
  contact_phone?: string;
}

interface FloorPlanManagerProps {
  restaurantId?: string | number;
}

/**
 * Admin wrapper around the shared <FloorManager> component.
 * It fetches reservations + wait‑list data for the selected date and
 * passes everything down, while also ensuring tenant isolation.
 */
export const FloorPlanManager: React.FC<FloorPlanManagerProps> = ({ restaurantId }) => {
  // 1) Tenant validation – throws if invalid
  useEffect(() => {
    validateRestaurantContext(restaurantId);
  }, [restaurantId]);

  // 2) Global date filter shared across all Reservations sub‑tabs
  const { date, setDate } = useDateFilter();

  // 3) Local state for data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist]         = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading]       = useState(false);

  // 4) Whenever the date changes → reload data
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function fetchData() {
    try {
      setIsLoading(true);

      // Use helper to append restaurant_id for multi‑tenant safety.
      const params = addRestaurantIdToParams({ date }, restaurantId !== undefined ? Number(restaurantId) : undefined);

      // Reservations first ➜ sort earliest → latest for nicer UX
      const resData = await apiFetchReservations(params as any);
      const sorted  = (resData as Reservation[]).slice().sort((a, b) => {
        const aTime = new Date(a.start_time || '').getTime();
        const bTime = new Date(b.start_time || '').getTime();
        return aTime - bTime;
      });
      setReservations(sorted);

      // Wait‑list second (no special ordering needed)
      const wlData = await apiFetchWaitlist(params as any);
      setWaitlist(wlData as WaitlistEntry[]);
    } catch (err) {
      console.error('[FloorPlanManager] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  /** Callback passed to <FloorManager> when it asks for a refresh */
  async function handleRefreshAll() {
    await fetchData();
  }

  /** <FloorManager> can request a tab change (e.g., to “layout”).
   *  For now we simply log; if needed this can be wired to the parent
   *  via context or props. */
  function handleTabChange(tab: string) {
    console.debug('[FloorPlanManager] FloorManager requested tab change:', tab);
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
  }

  return (
    <div className="h-full flex flex-col">
      {isLoading && (
        <div className="text-center py-2 text-sm text-gray-500">Loading seating data…</div>
      )}

      {/* Shared seating UI */}
      <div className="flex-grow overflow-hidden">
        <FloorManager
          date={date}
          onDateChange={handleDateChange}
          reservations={reservations}
          waitlist={waitlist}
          onRefreshData={handleRefreshAll}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
};

export default FloorPlanManager;
