// src/reservations/components/dashboard/SeatingTab.tsx
import React, { useEffect } from 'react';
import FloorManager from '../FloorManager';
import { useDateFilter } from '../../context/DateFilterContext';

// Import your new hooks
import { useReservations } from '../../hooks/useReservations';
import { useWaitlist } from '../../hooks/useWaitlist';

export default function SeatingTab() {
  // Global date from context
  const { date, setDate } = useDateFilter();

  // Hooks for reservations & waitlist
  const {
    reservations,
    fetchReservations,
    loading: reservationsLoading,
    error: reservationsError,
  } = useReservations();

  const {
    waitlistEntries,
    fetchWaitlistEntries,
    loading: waitlistLoading,
    error: waitlistError,
  } = useWaitlist();

  // On mount + whenever date changes => fetch data
  useEffect(() => {
    fetchReservations({ date });
    fetchWaitlistEntries({ date });
  }, [date, fetchReservations, fetchWaitlistEntries]);

  // Refresh all data (called from FloorManager)
  async function handleRefreshAll() {
    await Promise.all([
      fetchReservations({ date }),
      fetchWaitlistEntries({ date }),
    ]);
  }

  // If FloorManager wants to switch tabs (e.g., to “layout”), do it here:
  function handleTabChange(tab: string) {
    console.log('FloorManager asked to switch tab:', tab);
    // e.g. navigate(`/dashboard/${tab}`);
  }

  // The FloorManager’s onDateChange => set the global date
  function handleDateChange(newDate: string) {
    setDate(newDate);
  }

  // Optionally sort reservations or waitlist
  // (like the old code did)
  const sortedReservations = [...reservations].sort((a, b) => {
    const dateA = new Date(a.start_time ?? '').getTime();
    const dateB = new Date(b.start_time ?? '').getTime();
    return dateA - dateB;
  });

  // Then pass them to the FloorManager
  return (
    <div className="bg-white shadow rounded-md">
      {/* Subtle pink top bar with a heading */}
      <div className="border-b border-gray-200 bg-hafaloha-pink/5 rounded-t-md px-4 py-3">
        {/* You can put a heading here if you want */}
      </div>

      <div className="p-4">
        {/* If needed, show loading/error states: */}
        {(reservationsLoading || waitlistLoading) && (
          <p className="text-sm text-gray-500 mb-2">Loading data...</p>
        )}
        {(reservationsError || waitlistError) && (
          <p className="text-sm text-red-600 mb-2">
            Error: {reservationsError || waitlistError}
          </p>
        )}

        <FloorManager
          date={date}
          onDateChange={handleDateChange}
          reservations={sortedReservations}
          waitlist={waitlistEntries}
          onRefreshData={handleRefreshAll}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
