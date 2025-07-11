// src/ordering/components/admin/reservations/modals/ReservationFormModal.tsx

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select, { SingleValue } from 'react-select';
// Import date-fns for date manipulation
// Fixed: Removed unused date-fns imports

// Import API services
import { createReservation, fetchAvailability, fetchCapacity } from '../../../../../shared/api/endpoints/reservations';
import { fetchRestaurant } from '../../../../../shared/api/endpoints/restaurants';
import { fetchLayout } from '../../../../../shared/api/endpoints/layouts';
import { locationsApi } from '../../../../../shared/api/endpoints/locations';
import { api } from '../../../../../shared/api';

// Import toast utilities for notifications
import toastUtils from '../../../../../shared/utils/toastUtils';

// Import tenant utilities for restaurant context
import { validateRestaurantContext } from '../../../../../shared/utils/tenantUtils';
import { useRestaurantStore } from '../../../../../shared/store/restaurantStore';

/**
 * Converts Guam time (UTC+10) to UTC time
 * @param dateStr Date string in YYYY-MM-DD format
 * @param timeStr Time string in HH:MM format (24-hour)
 * @returns ISO UTC datetime string
 */
function convertGuamTimeToUTC(dateStr: string, timeStr: string): string {
  // Parse the Guam time
  const [hours, minutes] = timeStr.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Subtract 10 hours to convert from Guam time (UTC+10) to UTC
  const utcHours = hours - 10;
  
  // Handle day boundary changes
  let utcDay = day;
  let utcMonth = month;
  let utcYear = year;
  
  if (utcHours < 0) {
    // If subtracting 10 hours crosses to the previous day
    const prevDate = new Date(year, month - 1, day);
    prevDate.setDate(prevDate.getDate() - 1);
    utcDay = prevDate.getDate();
    utcMonth = prevDate.getMonth() + 1; // getMonth() is 0-based
    utcYear = prevDate.getFullYear();
  }
  
  // Adjust the hours to be 0-23 range
  const adjustedHours = (utcHours < 0) ? utcHours + 24 : utcHours;
  
  // Format the date components with leading zeros
  const formattedMonth = utcMonth.toString().padStart(2, '0');
  const formattedDay = utcDay.toString().padStart(2, '0');
  const formattedHours = adjustedHours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  // Create the ISO string in UTC
  return `${utcYear}-${formattedMonth}-${formattedDay}T${formattedHours}:${formattedMinutes}:00Z`;
}

// Define SeatSectionData inline since we don't have SeatLayoutCanvas imported yet
// This avoids dependency issues until the component is fully integrated
interface SeatSectionData {
  id: number;
  name: string;
  seats: Array<{
    id: number;
    label: string;
    position_x: number;
    position_y: number;
    capacity?: number;
  }>;
}

// Types for our component
interface TimeOption {
  value: string; // e.g. "17:30"
  label: string; // e.g. "5:30 PM"
}

interface DurationOption {
  value: number; // e.g. 60
  label: string; // e.g. "60" or "1 hour"
}



// Specialized types for better type safety

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string; // e.g. "2025-01-26"
  restaurantId?: number; // Required for tenant isolation
}

export default function ReservationFormModal({ onClose, onSuccess, defaultDate, restaurantId }: Props) {
  // -- Helpers --
  // Date utility functions
  function parseYYYYMMDD(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }
  
  function formatYYYYMMDD(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  function getPartySize(): number {
    return parseInt(partySizeText, 10) || 1;
  }

  function format12hSlot(slot: string) {
    const [hhStr, mmStr] = slot.split(':');
    const hh = parseInt(hhStr, 10);
    const mins = parseInt(mmStr, 10);
    const d = new Date(2020, 0, 1, hh, mins);
    return d.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // -- State --
  const [date, setDate] = useState(defaultDate || ''); // "YYYY-MM-DD"
  const [time, setTime] = useState('');
  const [partySizeText, setPartySizeText] = useState('2');

  // Contact info
  const [contactName, setContactName]   = useState('');
  const [contactPhone, setContactPhone] = useState('+1671');
  const [contactEmail, setContactEmail] = useState('');

  // Duration (minutes)
  const [duration, setDuration] = useState(60);

  // Timeslots from server
  const [timeslots, setTimeslots] = useState<string[]>([]);
  // If there's exactly 1 timeslot => forcibly set a large duration
  const hideDuration = timeslots.length === 1;

  // Seat preferences
  const [allSets, setAllSets] = useState<string[][]>([[], [], []]);
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (showSeatMapModal) {
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      body.style.position = 'fixed'; // Prevent iOS scroll bounce
      body.style.width = '100%';
    } else {
      body.style.overflow = '';
      html.style.overflow = '';
      body.style.position = '';
      body.style.width = '';
    }

    return () => {
      body.style.overflow = '';
      html.style.overflow = '';
      body.style.position = '';
      body.style.width = '';
    };
  }, [showSeatMapModal]);

  // Layout
  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(false); // Used when fetching layout data
  
  // Locations
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);

  // Error and loading states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Capacity state
  const [maxPartySize, setMaxPartySize] = useState<number>(0);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false); // Used for capacity skeleton loader
  
  // Operating hours and special events for closed day handling
  const [closedDaysOfWeek, setClosedDaysOfWeek] = useState<number[]>([]);
  const [closedDates, setClosedDates] = useState<Date[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Get restaurant from store for tenant validation
  const { restaurant } = useRestaurantStore();
  
  // -- Handler functions --
  // Handle date change in the DatePicker
  function handleDatePickerChange(d: Date | null) {
    if (d && !isDateClosed(d)) {
      setDate(formatYYYYMMDD(d));
      // Clear time when date changes
      setTime('');
      // Clear capacity info
      setMaxPartySize(0);
    } else if (d && isDateClosed(d)) {
      // Alert the user that they can't select a closed date
      toastUtils.error('Cannot select a closed date');
    }
  }
  
  // -- Effects --

  // Validate restaurant context for tenant isolation
  useEffect(() => {
    // If restaurantId is not provided, we need to validate from context
    if (!restaurantId) {
      // Validate the restaurant context from the store
      const result = validateRestaurantContext(restaurant);
      if (!result) {
        setError('Restaurant context is required');
        toastUtils.error("Error: Restaurant context is required");
        return;
      }
    }
  }, [restaurantId, restaurant]);
  
  // Fetch operating hours and special events to determine closed days
  const fetchScheduleData = async (rId: number) => {
    if (!rId) return;
    
    setIsLoadingSchedule(true);
    try {
      // Fetch operating hours to determine which days of week are closed
      const hours = await api.get<any[]>('/operating_hours', { restaurant_id: rId });
      
      // Extract days of week when restaurant is closed
      const closedDays = Array.isArray(hours) ? hours
        .filter(day => day.closed)
        .map(day => day.day_of_week) : [];
      setClosedDaysOfWeek(closedDays);
      
      // Fetch special events to determine specific dates that are closed
      const events = await api.get<any[]>('/special_events', { restaurant_id: rId });
      
      // Extract dates when restaurant is closed due to special events
      const closedEventDates = Array.isArray(events) ? events
        .filter(event => event.closed)
        .map(event => new Date(event.event_date)) : [];
      setClosedDates(closedEventDates);
      
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  };
  
  // Check if a date is closed based on operating hours and special events
  const isDateClosed = (date: Date): boolean => {
    if (!date) return false;
    
    // Check if the day of week is closed (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();
    if (closedDaysOfWeek.includes(dayOfWeek)) {
      return true;
    }
    
    // Check if there's a special event that closes the restaurant on this date
    const dateString = formatYYYYMMDD(date);
    return closedDates.some(closedDate => {
      return formatYYYYMMDD(closedDate) === dateString;
    });
  };
  
  // Custom date styling for the date picker to visually indicate closed days
  const datePickerDayClassNames = (date: Date): string => {
    if (isDateClosed(date)) {
      return 'closed-day';
    }
    return '';
  };

  // 1) Load default reservation length from the restaurant and fetch locations
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Get restaurant data for settings
        const validatedRestaurantId = restaurantId || (restaurant?.id || null);
        if (!validatedRestaurantId) {
          throw new Error('Missing restaurant context');
        }
        
        // Load operating hours and special events to determine closed days
        await fetchScheduleData(validatedRestaurantId);
        
        // Get restaurant data for reservation settings
        const restaurantResp = await fetchRestaurant(validatedRestaurantId);
        const restaurantObj = restaurantResp && typeof restaurantResp === 'object' && 'data' in restaurantResp
          ? restaurantResp.data as { reservation_duration?: number }
          : {};
        
        // Set default duration from restaurant settings
        if (restaurantObj.reservation_duration) {
          setDuration(restaurantObj.reservation_duration);
        }
        
        // Fetch locations if available
        const locationsResponse = await locationsApi.getLocations({ restaurant_id: validatedRestaurantId });
        
        // Handle different API response formats
        let locationsList = [];
        if (locationsResponse) {
          // Check if response is an array directly
          if (Array.isArray(locationsResponse)) {
            locationsList = locationsResponse;
          } 
          // Check if response has a data property that's an array
          else if (typeof locationsResponse === 'object' && 'data' in locationsResponse) {
            const responseWithData = locationsResponse as { data: any };
            if (Array.isArray(responseWithData.data)) {
              locationsList = responseWithData.data;
            }
          }
        }
        
        if (locationsList.length > 0) {
          setLocations(locationsList);
          const hasMultiple = locationsList.length > 1;
          setHasMultipleLocations(hasMultiple);
          
          // Set default location
          if (locationsList.length === 1) {
            setSelectedLocationId(locationsList[0].id);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading restaurant data:', err);
        setError('Could not load restaurant data');
        setLoading(false);
      }
    }
    
    loadData();
  }, [restaurantId]);

  // Function to fetch capacity for a selected date and time
  async function fetchCapacityForDateTime(dateStr: string, timeStr: string, locId?: number) {
    if (!dateStr || !timeStr) return;
    
    // Get restaurant id from context or props for tenant isolation
    const currentRestaurantId = restaurantId || (restaurant && validateRestaurantContext(restaurant) ? restaurant.id : null);
    if (!currentRestaurantId) {
      setError('Restaurant context is required for capacity checking');
      return;
    }
    
    setIsLoadingCapacity(true);
    
    try {
      // Get current party size to check capacity for that number of people
      const currentPartySize = getPartySize() || 2; // Default to 2 if not set
      
      console.log('Fetching capacity with params:', {
        date: dateStr, 
        time: timeStr,
        restaurant_id: currentRestaurantId,
        location_id: locId,
        party_size: currentPartySize
      });
      
      const response = await fetchCapacity({
        date: dateStr, 
        time: timeStr,
        restaurant_id: currentRestaurantId,
        location_id: locId,
        party_size: currentPartySize
      });
      
      console.log('API response for capacity:', response);
      
      // Add more detailed debugging
      if (response && response.success) {
        console.log('Capacity response has success=true');
        console.log('Response data:', response.data);
        if (response.data) {
          console.log('Response data type:', typeof response.data);
          console.log('Response data keys:', Object.keys(response.data));
          console.log('max_party_size value:', response.data.max_party_size);
          console.log('available value:', response.data.available);
          console.log('total_capacity value:', response.data.total_capacity);
        }
      }
      
      if (response && response.success && response.data) {
        const capacity = response.data.max_party_size || 0;
        console.log('Setting max party size to:', capacity);
        setMaxPartySize(capacity);
        
        // If current party size exceeds capacity, adjust it
        if (capacity > 0 && getPartySize() > capacity) {
          setPartySizeText(capacity.toString());
        }
        
        // If no capacity is available, show a toast notification
        if (capacity === 0) {
          toastUtils.error('No capacity available for this time slot');
        }
      } else {
        // Handle case where response isn't as expected
        console.error('Invalid capacity response format:', response);
        setMaxPartySize(0);
      }
    } catch (err) {
      console.error('Error fetching capacity:', err);
      setMaxPartySize(0);
    } finally {
      setIsLoadingCapacity(false);
    }
  }
  
  // 2) When date + party size change, fetch availability
  useEffect(() => {
    async function fetchTimeslots() {
      if (!date) return;
      if (getPartySize() < 1) return;
      
      try {
        setLoading(true);
        
        // Get restaurant id from context or props
        const currentRestaurantId = restaurantId || (restaurant && validateRestaurantContext(restaurant) ? restaurant.id : null);
        if (!currentRestaurantId) {
          setError('Restaurant context is required');
          return;
        }
        
        // Add restaurant_id to the parameters
        const availabilityParams = {
          date, 
          party_size: getPartySize(), 
          location_id: selectedLocationId,
          restaurant_id: currentRestaurantId
        };
        
        console.log('Fetching availability with params:', availabilityParams);
        const result = await fetchAvailability(availabilityParams);
        
        // Log the complete API response for debugging
        console.log('Raw API response for availability:', result);
        console.log('API response type:', typeof result);
        console.log('API response stringified:', JSON.stringify(result));
        
        // Handle different response formats
        if (result) {
          let availableTimes: string[] = [];
          if (Array.isArray(result)) {
            availableTimes = result;
          } else if (result && typeof result === 'object') {
            // Use type assertion to avoid TypeScript errors
            const resultObj = result as Record<string, any>;
            if ('data' in resultObj && Array.isArray(resultObj.data)) {
              availableTimes = resultObj.data;
            } else if ('timeslots' in resultObj && Array.isArray(resultObj.timeslots)) {
              availableTimes = resultObj.timeslots;
            }
          }
          
          // Respect the API response - if no times are returned, we'll show no options
          // This ensures proper tenant isolation and respect for restaurant configuration
          setTimeslots(availableTimes);

          // If we previously had a time selected, but it's no longer available
          if (time && !availableTimes.includes(time)) {
            setTime('');
          }
        } else {
          // If the API doesn't return any response, set empty time slots
          // This ensures we're only showing times the restaurant has actually configured
          setTimeslots([]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching availability:', err);
        // On error, set empty time slots
        // This ensures we don't display availability times that haven't been configured
        setTimeslots([]);
        setLoading(false);
      }
    }

  fetchTimeslots();
}, [date, partySizeText, selectedLocationId]);

// 3) When time + date are selected, fetch layout
useEffect(() => {
  async function fetchLayoutData() {
    if (!time || !date) return;

    try {
      setLayoutLoading(true);

      // Get restaurant id from context or props
      const currentRestaurantId = restaurantId || (restaurant && validateRestaurantContext(restaurant) ? restaurant.id : null);
      if (!currentRestaurantId) {
        setError('Restaurant context is required');
        return;
      }

      // Fetch restaurant to get active layout
      const restaurantResponse = await fetchRestaurant(currentRestaurantId);
      const restaurantData = restaurantResponse && typeof restaurantResponse === 'object' && 'data' in restaurantResponse
        ? restaurantResponse.data as { active_layout_id?: number }
        : {};

      if (restaurantData && restaurantData.active_layout_id) {
        const layoutResponse = await fetchLayout(restaurantData.active_layout_id);
        const layout = layoutResponse && typeof layoutResponse === 'object' && 'data' in layoutResponse
          ? layoutResponse.data as { sections?: SeatSectionData[] }
          : { sections: undefined };

        if (layout && layout.sections && Array.isArray(layout.sections)) {
          setLayoutSections(layout.sections);
        }
      }

      setLayoutLoading(false);
    } catch (err) {
      console.error('Error fetching layout:', err);
      setError('Could not load seating layout');
      setLayoutLoading(false);
    }
  }

  fetchLayoutData();
}, [time, date, restaurantId]);

// -- Form submission --
async function handleSubmit() {
  if (!validateForm()) return undefined;

  try {
    // Set loading state immediately for UI feedback
    setLoading(true);

    // Show an immediate pending toast to improve perceived performance
    const loadingToast = toastUtils.loading('Creating reservation...');

    // Get restaurant id from context or props
    const currentRestaurantId = restaurantId || (restaurant?.id || null);

    if (!currentRestaurantId) {
      loadingToast.dismiss();
      setError('Restaurant context is required');
      setLoading(false);
      return;
    }

    // Prepare reservation data with proper tenant isolation
    // Only include fields allowed by the backend
    const reservationData = {
      reservation: {
        restaurant_id: currentRestaurantId,
        location_id: selectedLocationId,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        party_size: getPartySize(),
        // Convert from Guam time (UTC+10) to UTC by subtracting 10 hours
        start_time: convertGuamTimeToUTC(date, time),
        duration_minutes: duration,
        // When admins create reservations from the admin panel, mark them as 'reserved' (confirmed)
        // This bypasses the need for admins to approve their own reservations
        status: 'reserved',
        // Note: we're omitting seat_preferences as it's not permitted by the backend
        // If needed, we can store seat preferences in a separate table or serialized field
        special_requests: allSets.filter(set => set.length > 0).length > 0 ?
          `Preferred seats: ${JSON.stringify(allSets.filter(set => set.length > 0))}` : ''
      }
    };

    console.log('Creating reservation with data:', reservationData);

    try {
      // Create a separate processing toast after a short delay to improve perceived performance
      const processingToastTimeout = setTimeout(() => {
        if (loading) { // Only show if still loading (hasn't errored)
          loadingToast.dismiss();
          // Replace with a processing message to show progress
          toastUtils.loading('Processing reservation...');
        }
      }, 800); // Show processing message after 800ms

      // Create the reservation through the API
      // Adding a deliberate minimum display time for loading indicators to improve UX
      const [response] = await Promise.all([
        createReservation(reservationData),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms loading time
      ]);

      // Clear the timeout if it hasn't fired yet
      clearTimeout(processingToastTimeout);

      console.log('Reservation created successfully:', response);

      // Dismiss loading toast and show success
      loadingToast.dismiss();
      toastUtils.success('Reservation created successfully!');

      // Close the modal and refresh the list
      onSuccess();
    } catch (apiError: any) {
      // Clear timeout and dismiss loading toast
      loadingToast.dismiss();

      // Check for validation errors from the API
      if (apiError.response?.status === 422) {
        const errorData = apiError.response?.data || {};
        const errorMessage = errorData.message ||
          (errorData.errors ? Object.values(errorData.errors).flat().join(', ') :
            'Validation error in reservation data');
        toastUtils.error(errorMessage);
        console.error('Validation error:', errorData);
      } else {
        throw apiError; // Re-throw for the outer catch block
      }
    }
    
    setLoading(false);
  } catch (err: any) {
    console.error('Error creating reservation:', err);
    toastUtils.error(err.response?.data?.message || 'Failed to create reservation');
    setLoading(false);
  }
}

// Validate individual form fields and return validation state
function getValidationState() {
  const validations = {
    date: !!date,
    time: !!time,
    partySize: !!partySizeText && parseInt(partySizeText, 10) >= 1,
    capacityLimit: maxPartySize === 0 || parseInt(partySizeText, 10) <= maxPartySize,
    contactName: !!contactName.trim(),
    contactPhone: !!contactPhone.trim() && contactPhone !== '+1671',
    restaurant: !!(restaurantId || (restaurant && restaurant.id))
  };
  
  // Get first error message based on validation state
  let errorMessage = null;
  if (!validations.date) errorMessage = 'Please select a date';
  else if (!validations.time) errorMessage = 'Please select a time';
  else if (!validations.partySize) errorMessage = 'Please enter a valid party size';
  else if (!validations.capacityLimit) errorMessage = `Party size exceeds maximum capacity of ${maxPartySize}`;
  else if (!validations.contactName) errorMessage = 'Please enter a contact name';
  else if (!validations.contactPhone) errorMessage = 'Please enter a contact phone number';
  else if (!validations.restaurant) errorMessage = 'Restaurant context is required';
  
  return {
    isValid: Object.values(validations).every(Boolean),
    validations,
    errorMessage
  };
}

// Validate the form fields before submission
function validateForm(): boolean {
  // Clear any existing errors
  setError(null);
  
  const { isValid, errorMessage } = getValidationState();
  
  if (!isValid && errorMessage) {
    setError(errorMessage);
    
    // Show a toast with the error
    toastUtils.error(errorMessage);
    return false;
  }

  // Get restaurant ID from props or context with null check
  const currentRestaurantId = restaurantId || (restaurant && validateRestaurantContext(restaurant) ? restaurant.id : null);

  if (!currentRestaurantId) {
    setError('Restaurant context is required');
    return false;
  }

  return true;
}

// -- Time slot options --
const timeOptions = timeslots.map(slot => ({
  value: slot,
  label: format12hSlot(slot)
}));

// -- Duration options --
const durationOptions = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' }
];

// Time selection handler
function handleTimeChange(option: SingleValue<TimeOption>) {
    const selectedTime = option ? option.value : '';
    setTime(selectedTime);
    fetchCapacityForDateTime(date, selectedTime, selectedLocationId);
}

// -- Render --
// Debug output to help troubleshoot
useEffect(() => {
  console.log('ReservationFormModal render state:', {
    hasMultipleLocations,
    locations: locations.length,
    selectedLocationId
  });
}, [hasMultipleLocations, locations, selectedLocationId]);

// Show error modal if there's an error
if (error) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full">
        <h2 className="text-red-600 text-xl font-bold mb-4">Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Main form render
return (
  <div className="fixed inset-0 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    {/* Modal Backdrop */}
    <div className="fixed inset-0 bg-black opacity-40" />
    
    <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 relative z-10 max-h-[90vh] overflow-y-auto">
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
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Create Reservation</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Content container */}
      <div className="p-6">
      {/* Content with clear sections and improved visual structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Reservation Details */}
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-4 pb-2 border-b border-gray-100">Reservation Details</h3>
          
          {/* Location - first thing to select */}
          {hasMultipleLocations && (
            <div className="mb-4">
              <label className="block text-gray-600 text-sm mb-1.5" htmlFor="location">
                Location <span className="text-hafaloha-gold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <Select
                  options={locations.map((location) => ({
                    value: location.id,
                    label: location.name,
                  }))}
                  onChange={(option) => setSelectedLocationId(option?.value ? Number(option.value) : undefined)}
                  value={locations
                    .filter((loc) => loc.id === selectedLocationId)
                    .map((loc) => ({ value: loc.id, label: loc.name }))[0]}
                  placeholder="Select location"
                  className="w-full"
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      border: '1px solid #e5e7eb',
                      padding: '2px',
                      borderRadius: '0.375rem',
                      paddingLeft: '28px',
                    }),
                    valueContainer: (provided) => ({
                      ...provided,
                      paddingLeft: '8px',
                    }),
                    menu: (provided) => ({
                      ...provided,
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#dbeafe' : 'transparent',
                      color: state.isSelected ? 'white' : 'inherit',
                      cursor: 'pointer',
                    }),
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Date & Time section - grouped together for logical flow */}
          <div className="space-y-4 mb-6">
            {/* Date */}
            <div>
              <label className="block text-gray-600 text-sm mb-1.5" htmlFor="date">
                Date <span className="text-hafaloha-gold">*</span>
              </label>
              <div className="relative">
                {/* Add custom styles for the date picker calendar */}
                <style>
                  {`
                    .react-datepicker__portal {
                      position: fixed;
                      width: 100vw;
                      height: 100vh;
                      background-color: rgba(0, 0, 0, 0.5);
                      left: 0;
                      top: 0;
                      justify-content: center;
                      align-items: center;
                      display: flex;
                      z-index: 2000;
                    }
                    .react-datepicker__current-month {
                      font-weight: bold;
                      font-size: 1rem;
                    }
                    .react-datepicker__day--selected {
                      background-color: #3b82f6 !important;
                      color: white !important;
                    }
                    .react-datepicker__day:hover {
                      background-color: #dbeafe !important;
                    }
                  `}
                </style>
                <DatePicker
                  selected={parseYYYYMMDD(date)}
                  onChange={handleDatePickerChange}
                  dateFormat="MMMM d, yyyy"
                  minDate={new Date()}
                  dayClassName={datePickerDayClassNames}
                  filterDate={(date) => !isDateClosed(date)}
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-hafaloha-gold/40 focus:outline-none transition duration-150"
                  calendarClassName="bg-white shadow-lg rounded-lg"
                  withPortal
                  shouldCloseOnSelect={true}
                />
              </div>
              {/* Legend to explain closed dates */}
              <div className="flex items-center text-xs text-gray-500 mt-1.5">
                <div className="w-3 h-3 bg-gray-100 rounded-full mr-1.5 border border-gray-200"></div>
                <span>{isLoadingSchedule ? 'Loading schedule...' : 'Closed dates are not selectable'}</span>
              </div>
            </div>
            
            {/* Time with improved loading state */}
            <div>
              <label className="block text-gray-600 text-sm mb-1.5" htmlFor="time">
                Time <span className="text-hafaloha-gold">*</span>
              </label>
              {date && timeslots.length === 0 && loading ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 mb-2">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="py-3 px-1 rounded-md bg-gray-100 animate-pulse h-10"></div>
                  ))}
                </div>
              ) : (
                <Select
                  options={timeOptions}
                  onChange={handleTimeChange}
                  isDisabled={!date || timeslots.length === 0}
                  placeholder={!date ? 'Select a date first' : timeslots.length === 0 ? 'No time slots available' : 'Select a time'}
                  className="basic-single"
                  classNamePrefix="select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      padding: '2px',
                      borderColor: '#e5e7eb',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#d1d5db'
                      }
                    }),
                    option: (styles, { isSelected, isFocused }) => ({
                      ...styles,
                      backgroundColor: isSelected
                        ? '#3b82f6' // Blue background for selected item
                        : isFocused
                        ? '#dbeafe' // Light blue background for focused/hovered item
                        : undefined,
                      color: isSelected ? 'white' : 'inherit'
                    }),
                    menuList: (base) => ({
                      ...base,
                      padding: '4px'
                    })
                  }}
                />
              )}
              {date && timeslots.length === 0 && !loading && (
                <div className="flex items-center text-xs text-hafaloha-gold mt-1.5">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>No time slots available for this date. Please select another date.</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Party Size & Duration - grouped as they affect table allocation */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Party Size */}
            <div>
              <label className="block text-gray-600 text-sm mb-1.5" htmlFor="party_size">
                Party Size <span className="text-hafaloha-gold">*</span>
                {time && (
                  <span className="ml-2 text-xs">
                    {isLoadingCapacity ? (
                      <span className="text-gray-400 animate-pulse">Checking capacity...</span>
                    ) : maxPartySize > 0 ? (
                      <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                        Max: {maxPartySize}
                      </span>
                    ) : (
                      <span className="text-hafaloha-gold bg-hafaloha-gold/10 px-1.5 py-0.5 rounded-full">
                        No capacity
                      </span>
                    )}
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                max={maxPartySize > 0 ? maxPartySize : 20}
                value={partySizeText}
                onChange={(e) => {
                  // Ensure party size doesn't exceed capacity if we know the limit
                  const newValue = parseInt(e.target.value, 10);
                  if (maxPartySize > 0 && newValue > maxPartySize) {
                    setPartySizeText(maxPartySize.toString());
                  } else {
                    setPartySizeText(e.target.value);
                  }
                }}
                className="w-full py-2.5 px-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-hafaloha-gold/40 focus:outline-none transition duration-150"
                disabled={isLoadingCapacity}
              />
              {time && maxPartySize > 0 && getPartySize() > maxPartySize && (
                <div className="flex items-center text-xs text-hafaloha-gold mt-1.5">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>This exceeds the maximum recommended party size</span>
                </div>
              )}
            </div>
            
            {/* Duration (Conditionally shown if multiple time slots) */}
            {!hideDuration && (
              <div>
                <label className="block text-gray-600 text-sm mb-1.5" htmlFor="duration">
                  Duration
                </label>
                <Select
                  options={durationOptions}
                  value={durationOptions.find(option => option.value === duration)}
                  onChange={(option: SingleValue<DurationOption>) => {
                    setDuration(option ? option.value : 60);
                  }}
                  className="basic-single"
                  classNamePrefix="select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      padding: '2px',
                      borderColor: '#e5e7eb',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#d1d5db'
                      }
                    }),
                    option: (styles, { isSelected, isFocused }) => ({
                      ...styles,
                      backgroundColor: isSelected
                        ? '#3b82f6' // Blue background for selected item
                        : isFocused
                        ? '#dbeafe' // Light blue background for focused/hovered item
                        : undefined,
                      color: isSelected ? 'white' : 'inherit'
                    }),
                    menuList: (base) => ({
                      ...base,
                      padding: '4px'
                    })
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Location selector moved to the top of the form */}
        </div>
        
        {/* Right Column - Contact Information */}
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-4 pb-2 border-b border-gray-100">Guest Information</h3>
          
          {/* Contact Name */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm mb-1.5" htmlFor="contact_name">
              Contact Name <span className="text-hafaloha-gold">*</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Full name"
              className="w-full py-2.5 px-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-hafaloha-gold/40 focus:outline-none transition duration-150"
            />
          </div>
          
          {/* Contact Phone */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm mb-1.5" htmlFor="contact_phone">
              Contact Phone <span className="text-hafaloha-gold">*</span>
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full py-2.5 px-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-hafaloha-gold/40 focus:outline-none transition duration-150"
            />
          </div>
          
          {/* Contact Email */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm mb-1.5" htmlFor="contact_email">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Email address"
              className="w-full py-2.5 px-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-hafaloha-gold/40 focus:outline-none transition duration-150"
            />
          </div>
          
          {/* Notes */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm mb-1.5" htmlFor="notes">
              Special Requests/Notes
            </label>
            <textarea
              rows={3}
              placeholder="Any special requests or additional information?"
              className="w-full py-2.5 px-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-hafaloha-gold/40 focus:outline-none transition duration-150"
            />
          </div>
        </div>
      </div>
      
      {/* Validation messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md flex items-start">
          <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {/* Form Actions */}
      <div className="flex justify-between mt-6">
        <div>
          <p className="text-xs text-gray-500">
            <span className="text-hafaloha-gold">*</span> Required fields
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-hafaloha-gold text-white rounded-md hover:bg-hafaloha-gold/90 transition-colors flex items-center"
            onClick={handleSubmit}
            disabled={loading || (!!time && maxPartySize === 0)}
            type="button"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : 'Create Reservation'}
          </button>
        </div>
      </div>
    </div>
  </div>
    
    {/* Seat Preference Modal will be implemented and connected later */}
    {showSeatMapModal && (
      <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {/* Modal Backdrop */}
        <div className="fixed inset-0 bg-black opacity-40" />
        
        {/* Modal Content */}
        <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 relative z-10 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800">Create Reservation</h2>
          </div>
          <p className="text-gray-700 mb-4">Seat preference selection will be implemented soon.</p>
          <button
            className="px-4 py-2 bg-hafaloha-gold text-white rounded-md hover:bg-hafaloha-gold/90 transition-colors"
            onClick={() => setShowSeatMapModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    )}
  </div>
);
}
