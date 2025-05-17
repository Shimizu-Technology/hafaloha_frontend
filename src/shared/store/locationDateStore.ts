// src/shared/store/locationDateStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationDateState {
  selectedLocationId: number | null;
  selectedDate: string; // ISO format date string
  setSelectedLocationId: (id: number | null) => void;
  setSelectedDate: (date: string) => void;
}

// Create store with persistence using localStorage
export const useLocationDateStore = create<LocationDateState>()(
  persist(
    (set) => ({
      selectedLocationId: null,
      selectedDate: new Date().toISOString().split('T')[0], // Default to today
      setSelectedLocationId: (id) => set({ selectedLocationId: id }),
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'location-date-storage', // unique name for localStorage
    }
  )
);
