// src/ordering/components/admin/reservations/SeatingManager.tsx
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { useLocationDateStore } from '../../../../shared/store/locationDateStore';
import { validateRestaurantContext } from '../../../../shared/utils/tenantUtils';
import FloorManager from './FloorManager';
import { format } from 'date-fns';

// Import necessary API services
import { 
  fetchReservations,
  fetchWaitlistEntries
} from '../../../../ordering/services/api-reservations';

/**
 * SeatingManager component - Manages seating for reservations in the admin dashboard
 * 
 * This component integrates the FloorManager for viewing and managing table allocations
 * and provides a UI for assigning reservations to tables.
 */
export function SeatingManager() {
  const { restaurant } = useRestaurantStore();
  const { selectedDate, setSelectedDate } = useLocationDateStore();
  
  // Create a Date object from the shared store's string date
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(
    () => selectedDate ? new Date(selectedDate) : new Date()
  );
  
  // Loading state for schedule data
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  
  // Data arrays for reservations & waitlist
  const [reservations, setReservations] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount and whenever date changes
  useEffect(() => {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      setError('Restaurant context required');
      return;
    }
    
    // Use a small delay to allow the UI to show loading state
    // This makes the transition between dates smoother
    const loadDataTimer = setTimeout(() => {
      fetchData();
    }, 150);
    
    return () => clearTimeout(loadDataTimer);
  }, [restaurant, selectedDate]);
  
  // Load basic scheduling information
  useEffect(() => {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      return;
    }
    
    setIsLoadingSchedule(true);
    // We're loading the schedule but no longer filtering closed dates
    setTimeout(() => {
      setIsLoadingSchedule(false);
    }, 500);
    
  }, [restaurant]);

  // Fetch reservations and waitlist data
  async function fetchData() {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching reservations and waitlist for date:', selectedDate);
      
      // 1) Load reservations
      const resData = await fetchReservations({ 
        date: selectedDate,
        restaurant_id: restaurant.id
      });
      
      // Sort by start time
      const sortedReservations = [...resData].sort((a, b) => {
        const dateA = new Date(a.start_time || '').getTime();
        const dateB = new Date(b.start_time || '').getTime();
        return dateA - dateB;
      });
      
      // 2) Load waitlist
      const waitlistData = await fetchWaitlistEntries({ 
        date: selectedDate,
        restaurant_id: restaurant.id
      });
      
      // Update state with fetched data
      setReservations(sortedReservations);
      setWaitlist(waitlistData);
      setError(null);
    } catch (err) {
      console.error('Error loading seating data:', err);
      setError('Failed to load reservations and waitlist data');
      toast.error('Failed to load seating data');
    } finally {
      // Short delay before removing loading state to allow for smooth transitions
      setTimeout(() => {
        setIsLoading(false);
      }, 50); // Small delay helps with rendering optimization
    }
  }

  

  

  
  // Handle date change from the DatePicker
  function handleDateChange(date: Date | null) {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      // Update the shared store so date persists across tabs
      setSelectedDate(formattedDate);
      // Still update local Date object for display purposes
      setSelectedDateObj(date);
    }
  }
  

  // Handle refresh request from the FloorManager
  async function handleRefreshAll() {
    await fetchData();
  }

  // Function for future tab change implementation
  // Currently not used but preserved for future navigation enhancements
  /* 
  function handleTabChange(tab: string) {
    console.log('Tab change requested:', tab);
    // Implementation will depend on navigation requirements
  }
  */

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={() => fetchData()}
          className="px-4 py-2 bg-hafaloha-gold hover:bg-hafaloha-gold/90 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // We no longer use a full-page loading spinner, instead we pass loading state to FloorManager

  return (
    <div className="flex flex-col w-full">
      <div className="bg-white shadow rounded-md w-full">
        {/* Add custom styles for the DatePicker component */}
        <style>{`
          .react-datepicker__day.closed-day {
            background-color: #f3f4f6;
            color: #9ca3af;
            text-decoration: line-through;
            pointer-events: none;
          }
          .react-datepicker__day.closed-day:hover {
            background-color: #f3f4f6 !important;
            color: #9ca3af !important;
          }
        `}</style>
        
        {/* Page header with title */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-2xl font-bold text-gray-900">Floor Plan</h2>
          <div className="text-sm text-gray-600 mt-1">
            Assign reservations and waitlist to tables
          </div>
        </div>
        


        {/* Main content */}
        <div className="px-6 w-full">
          {/* Integrated FloorManager component - always render it even when data is loading */}
          <FloorManager
            date={selectedDate}
            dateObj={selectedDateObj}
            onDateChange={handleDateChange}
            isLoadingSchedule={isLoading || isLoadingSchedule}
            reservations={isLoading ? [] : reservations}
            waitlist={isLoading ? [] : waitlist}
            onRefreshData={handleRefreshAll}
          />
        </div>
      </div>
    </div>
  );
}

export default SeatingManager;
