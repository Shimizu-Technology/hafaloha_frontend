// src/components/dashboard/SeatingTab.tsx
import React, { useEffect, useState } from 'react';
import FloorManager from '../FloorManager';
import { useDateFilter } from '../../context/DateFilterContext';

import {
  fetchReservations as apiFetchReservations,
  fetchWaitlistEntries as apiFetchWaitlist,
} from '../../services/api';

export default function SeatingTab() {
  // Use the global date
  const { date, setDate } = useDateFilter();

  // Data arrays for reservations & waitlist
  const [reservations, setReservations] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);

  // On mount + whenever date changes => fetch reservations & waitlist
  useEffect(() => {
    fetchData();
  }, [date]);

  async function fetchData() {
    try {
      // Reservations
      const resData = await apiFetchReservations({ date });
      const sorted = resData.slice().sort((a: any, b: any) => {
        const dateA = new Date(a.start_time || '').getTime();
        const dateB = new Date(b.start_time || '').getTime();
        return dateA - dateB;
      });
      setReservations(sorted);

      // Waitlist
      const wlData = await apiFetchWaitlist({ date });
      setWaitlist(wlData);
    } catch (err) {
      console.error('Error loading data in SeatingTab:', err);
    }
  }

  // The FloorManager’s onRefreshData => refetch everything
  async function handleRefreshAll() {
    await fetchData();
  }

  // If FloorManager wants to switch tabs (e.g. to “layout”), do it here:
  function handleTabChange(tab: string) {
    // Example: you could do `navigate(`/dashboard/${tab}`)` if you like
    console.log('FloorManager asked to switch tab:', tab);
  }

  // The FloorManager’s onDateChange => set the global date
  function handleDateChange(newDate: string) {
    setDate(newDate);
  }

  return (
    <div className="bg-white shadow rounded-md p-4">
      <h2 className="text-xl font-bold mb-4">Seating</h2>

      <FloorManager
        date={date}
        onDateChange={handleDateChange}
        reservations={reservations}
        waitlist={waitlist}
        onRefreshData={handleRefreshAll}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
