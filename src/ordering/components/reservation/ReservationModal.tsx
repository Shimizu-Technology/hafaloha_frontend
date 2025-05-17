// src/ordering/components/reservation/ReservationModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Share2,
  User,
  Users,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
// DatePicker is used in the JSX for date selection
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
// Using shared API client for all requests with proper tenant isolation
import { locationsApi } from '../../../shared/api/endpoints/locations';
import { validateRestaurantContext, getCurrentRestaurantId } from '../../../shared/utils/tenantUtils';
import { api } from '../../../shared/api';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RestaurantSettings {
  max_party_size: number;
  duration_minutes: number;
  time_slot_interval: number;
  name?: string;
}

interface ReservationData {
  date: Date | null;
  time: string;
  partySize: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  location: string;
  locationId?: number;
  specialRequests?: string;
}

interface ConfirmationData extends ReservationData {
  confirmed: boolean;
  id?: number; // Reservation ID from the database
  reservation_number?: string; // Formatted reservation number
}

/**
 * 3-4 digit “area code” + 7 local digits => total 10-11 digits after the plus.
 * e.g. +16711234567, +9251234567, etc.
 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

export function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  // We've removed the mobile detection since we're using responsive CSS instead
  const [formData, setFormData] = useState<ReservationData>({
    date: null,
    time: '',
    partySize: 0, // Set to 0 to require explicit selection by the user
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    location: '',
    locationId: undefined,
    specialRequests: ''
  });
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);
  const [closedDaysOfWeek, setClosedDaysOfWeek] = useState<number[]>([]);
  const [closedDates, setClosedDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [maxPartySize, setMaxPartySize] = useState(0);
  const [actualCapacity, setActualCapacity] = useState(0);
  const [adminMaxPartySize, setAdminMaxPartySize] = useState(0);
  const [effectiveMaxPartySize, setEffectiveMaxPartySize] = useState(0);
  const [maxAvailableSeats, setMaxAvailableSeats] = useState(0);
  const [locations, setLocations] = useState<Array<{id: number, name: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    max_party_size: 20,
    duration_minutes: 60,
    time_slot_interval: 30
  });
  
  // Track if locations need to be shown in the UI
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);

  // Handle party size selection and capacity management

  // On open, if phone is blank => set +1671 as the default
  // Fetch actual restaurant capacity
  const fetchActualCapacity = useCallback(async () => {
    try {
      const restaurantId = getCurrentRestaurantId();
      if (!restaurantId) return;
      
      const params = {
        restaurant_id: restaurantId
      };
      
      const response = await api.get<{actual_capacity?: number, admin_max_party_size?: number, effective_max_party_size?: number}>('/availability/simple_capacity', params);
      if (response) {
        if (typeof response.actual_capacity === 'number') {
          setActualCapacity(response.actual_capacity);
          // Restaurant capacity is available as response.actual_capacity
        }
        
        if (typeof response.admin_max_party_size === 'number') {
          setAdminMaxPartySize(response.admin_max_party_size);
          // Admin configured max party size is available as response.admin_max_party_size
        }
        
        if (typeof response.effective_max_party_size === 'number') {
          setEffectiveMaxPartySize(response.effective_max_party_size);
          // Effective max party size is available as response.effective_max_party_size
        }
      }
    } catch (error) {
      console.error('Error fetching restaurant capacity:', error);
    }
  }, []);
  
  // Fetch capacity on initial load
  useEffect(() => {
    fetchActualCapacity();
  }, [fetchActualCapacity]);
  
  // This effect fetches available time slots when date/party size changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      
      if (formData.phone.trim() === '') {
        setFormData((prev) => ({ ...prev, phone: '+1671' }));
      }
      
      // Validate tenant context
      const restaurant = { id: getCurrentRestaurantId() };
      if (!validateRestaurantContext(restaurant)) {
        setError('Unable to access reservation system. Restaurant context is missing.');
        return;
      }
      
      // Fetch restaurant settings
      getRestaurantSettings();
      
      // Fetch operating hours and special events to determine closed days
      fetchClosedDays();
      
      // Fetch locations to determine if we should show the selector
      fetchLocations();
    }
  }, [isOpen]);
  
  // Fetch restaurant settings including max_party_size
  const getRestaurantSettings = async () => {
    try {
      const restaurantId = getCurrentRestaurantId();
      if (!restaurantId) {
        setError('Unable to determine restaurant context.');
        return;
      }
      
      // Use the public restaurant endpoint instead of the reservation-specific one
      // This ensures it works for public users without authentication
      const responseData = await api.get<any>(`/restaurants/${restaurantId}`, { params: { include_settings: true } });
      
      // Parse response and apply settings with fallbacks
      const responseObj = responseData || {};
      
      // Get settings from the admin_settings object or use defaults
      const adminSettings = responseObj.admin_settings || {};
      const reservationSettings = adminSettings.reservation_settings || {};
      
      const maxPartySize = reservationSettings.max_party_size || 20;
      const durationMinutes = responseObj.default_reservation_length || 60;
      const timeSlotInterval = responseObj.time_slot_interval || 30;
      
      setRestaurantSettings({
        max_party_size: maxPartySize,
        duration_minutes: durationMinutes,
        time_slot_interval: timeSlotInterval
      });
    } catch (err) {
      console.error('Error fetching restaurant settings:', err);
      setError('Unable to load restaurant settings. Please try again later.');
    }
  };
  
  // Fetch restaurant operating hours and special events to determine closed days
  const fetchClosedDays = async () => {
    try {
      const restaurantId = getCurrentRestaurantId();
      if (!restaurantId) return;
      
      // Use the public endpoint for restaurant schedule data
      try {
        // This endpoint doesn't require authentication and includes both operating hours and special events
        const response = await api.get<any>(`/public/restaurant_schedule/${restaurantId}`);
        
        if (!response) {
          console.error('No restaurant schedule data found');
          return;
        }
        
        // Extract operating hours from schedule data
        const hours = response.operating_hours || [];
        
        // Extract days of week when restaurant is closed
        const closedDays = Array.isArray(hours) ? hours
          .filter(day => day.closed)
          .map(day => day.day_of_week) : [];
        setClosedDaysOfWeek(closedDays);
        
        // Extract special events from schedule data
        const events = response.special_events || [];
        
        // Extract dates when restaurant is closed due to special events
        const closedEventDates = Array.isArray(events) ? events
          .filter(event => event.closed)
          .map(event => new Date(event.event_date)) : [];
        setClosedDates(closedEventDates);
      } catch (scheduleError) {
        console.error('Error fetching from public schedule endpoint:', scheduleError);
      }
    } catch (error) {
      console.error('Error in fetchClosedDays:', error);
    }
  };
  
  // Format Date object to YYYY-MM-DD string
  const formatYYYYMMDD = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  
  // Check if a date is closed based on operating hours and special events
  const isDateClosed = (date: Date | null): boolean => {
    if (!date) return false;
    
    try {
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
    } catch (error) {
      console.error('Error checking if date is closed:', error);
      return false;
    }
  };
  
  // Custom date styling for the date picker to visually indicate closed days
  const datePickerDayClassNames = (date: Date): string => {
    if (isDateClosed(date)) {
      return 'closed-day';
    }
    return '';
  };
  
  // Handle date change with closed day validation using DatePicker
  // Completely avoid layout shifts by not showing loading indicators
  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    
    // Quietly reset state without showing loading indicators
    setFormData({
      ...formData,
      date,
      time: ''
    });
    
    // Reset capacity info without showing spinners
    setMaxPartySize(0);
    
    // Instead of showing a spinner or toggling loading indicators that cause layout shifts,
    // we add a subtle loading indication that doesn't disrupt the layout
    // Using a 300ms delay prevents flashing for very fast responses
    setTimeout(() => {
      if (formData.date === date) { // Only set loading if still on same date
        setIsLoading(true);
      }
    }, 300);
  };
  
  // Handle location selection
  const handleLocationSelect = (id: number, name: string) => {
    setFormData(prev => ({ ...prev, location: name, locationId: id }));

    // If time is already selected, re-fetch capacity with this location
    if (formData.time && formData.date) {
      fetchCapacityForDateTime(formData.date ? formatYYYYMMDD(ensureDate(formData.date)) : '', formData.time, id);
    }
  };
  
  // Fetch active locations
  const fetchLocations = async () => {
    try {
      const restaurant = { id: getCurrentRestaurantId() };
      if (!validateRestaurantContext(restaurant)) {
        setError('Unable to fetch locations. Restaurant context is missing.');
        return;
      }
      
      const locationsList = await locationsApi.getLocations({ active: true });
      setLocations(locationsList);
      // Check if we have multiple locations to show selector
      setHasMultipleLocations(locationsList.length > 1);
      
      // If there's exactly one location, set it as the selected location
      if (locationsList.length === 1) {
        setFormData(prev => ({ 
          ...prev, 
          location: locationsList[0].name,
          locationId: locationsList[0].id
        }));
      }
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError('Unable to load restaurant locations. Please try again later.');
    }
  };

  // Time selection handler
  const handleTimeSelection = (time: string) => {
    setFormData(prev => ({ ...prev, time }));
    
    // Fetch capacity for this time slot
    if (time && formData.date) {
      // Use numeric locationId instead of location name
      fetchCapacityForDateTime(formData.date ? formatYYYYMMDD(ensureDate(formData.date)) : '', time, formData.locationId);
    }
  };
  
  // Helper function to fetch capacity for a date and time
  const fetchCapacityForDateTime = async (date: string, time: string, locationId?: number | string) => {
    const restaurantId = getCurrentRestaurantId();
    if (!date || !time || !restaurantId) return;
    
    // Validate locationId to ensure it's a number or undefined (never a string name)
    const numericLocationId = locationId ? Number(locationId) : undefined;
    if (locationId && isNaN(numericLocationId as number)) {
      console.error('Invalid location ID provided to fetchCapacityForDateTime:', locationId);
      return;
    }
    
    setIsLoadingCapacity(true);
    setError(null);
    
    try {
      // For public access, we'll use the availability endpoint that is already public
      // instead of a separate capacity endpoint
      const params: Record<string, any> = {
        date,
        time,
        party_size: formData.partySize,
        restaurant_id: restaurantId
      };
      
      if (numericLocationId) {
        params.location_id = numericLocationId;
      }
      
      // Use the availability endpoint to check if this time slot is available
      const availabilityResponse = await api.get<{slots?: string[]}>('/availability', params);
      // Process availability response for capacity check
      
      // If slots contains the selected time, it means it's available
      const slots = availabilityResponse?.slots || [];
      const selectedTimeAvailable = Array.isArray(slots) && slots.includes(time);
      
      if (selectedTimeAvailable) {
        // Since the slot is available, we'll assume the max party size is the restaurant's max
        // This is a simplification - in a real implementation, you might get this from a different endpoint
        setMaxPartySize(restaurantSettings.max_party_size);
      } else {
        // If the time slot isn't available, set capacity to 0
        setMaxPartySize(0);
        setError('No capacity available for this time slot');
      }
    } catch (err) {
      console.error('Error fetching capacity:', err);
      setMaxPartySize(0);
    } finally {
      setIsLoadingCapacity(false);
    }
  };

  // Whenever date, party size, or location changes => fetch new time slots
  useEffect(() => {
    // Only fetch time slots when ALL required fields are set: date, party size, AND location
    if (!formData.date || !formData.partySize || !formData.locationId) {
      setTimeSlots([]);
      // Don't change loading state here to avoid layout shifts
      return;
    }
    
    const restaurant = { id: getCurrentRestaurantId() };
    if (!validateRestaurantContext(restaurant)) {
      setError('Unable to check availability. Restaurant context is missing.');
      return;
    }
    
    // No loading indicators - we'll use skeleton loaders that maintain layout
    // This prevents the UI from shifting around
    
    setError(null);
    
    // Validate party size against restaurant settings
    if (formData.partySize > restaurantSettings.max_party_size) {
      setError(`Party size cannot exceed ${restaurantSettings.max_party_size} people. Please adjust your party size.`);
      setTimeSlots([]);
      setIsLoading(false);
      return;
    }

    // Use public availability endpoint with restaurant_id parameter for tenant isolation
    const params: Record<string, any> = {
      date: formData.date ? formatYYYYMMDD(ensureDate(formData.date)) : '',
      party_size: formData.partySize,
      restaurant_id: getCurrentRestaurantId(),
      get_capacity: true // Request actual capacity information
    };
    
    // Add location_id only if it's set and ensure it's a number
    if (formData.locationId) {
      const numericLocationId = Number(formData.locationId);
      if (!isNaN(numericLocationId)) {
        params.location_id = numericLocationId;
      } else {
        console.error('Invalid location ID when fetching timeslots:', formData.locationId);
      }
    }
    
    // Use the public API endpoint
    api.get('/availability', params)
      .then((res: any) => {
        // Process API response for time slots
        if (res && Array.isArray(res.slots)) {
          // For current day reservations, filter out past time slots
          let availableSlots = res.slots;
          
          // Only apply time filtering for the current day
          if (formData.date) {
            // Get current Guam time (UTC+10)
            const now = new Date();
            // Calculate Guam time by adjusting for the timezone offset
            // Guam is UTC+10, so we need to adjust based on local timezone
            const localTimezoneOffset = now.getTimezoneOffset(); // in minutes
            const guamOffsetInMinutes = -600; // UTC+10 in minutes (-600 minutes from UTC)
            
            // Calculate the difference and adjust the time
            const timezoneDifference = localTimezoneOffset - guamOffsetInMinutes;
            const guamTime = new Date(now.getTime() + timezoneDifference * 60000);
            
            // Format selected date to compare with Guam date
            const selectedDate = ensureDate(formData.date);
            const guamDate = new Date(guamTime);
            
            console.log(`Local time: ${now.toLocaleString()}, Guam time: ${guamTime.toLocaleString()}`);
            
            // Check if selected date matches current Guam date
            if (selectedDate.getDate() === guamDate.getDate() && 
                selectedDate.getMonth() === guamDate.getMonth() && 
                selectedDate.getFullYear() === guamDate.getFullYear()) {
              
              // Current Guam time components
              const currentGuamHour = guamTime.getHours();
              const currentGuamMinute = guamTime.getMinutes();
              
              console.log(`Current Guam time: ${currentGuamHour}:${currentGuamMinute}`);
              
              // Filter time slots that are in the future (in Guam time)
              availableSlots = res.slots.filter((slot: string) => {
                // Parse time from HH:MM format
                const [hours, minutes] = slot.split(':').map(Number);
                
                // Compare with current Guam time
                return (hours > currentGuamHour) || 
                       (hours === currentGuamHour && minutes > currentGuamMinute);
              });
              
              console.log(`Filtered ${res.slots.length - availableSlots.length} past time slots`);
            }
          }
          
          setTimeSlots(availableSlots);
        } else {
          console.warn('Unexpected API response format:', res);
          setTimeSlots([]);
        }
        
        // Update capacity information if provided by the backend
        if (res) {
          if (res.actual_capacity !== undefined && typeof res.actual_capacity === 'number') {
            setActualCapacity(res.actual_capacity);
          }
          
          if (res.admin_max_party_size !== undefined && typeof res.admin_max_party_size === 'number') {
            setAdminMaxPartySize(res.admin_max_party_size);
          }
          
          if (res.effective_max_party_size !== undefined && typeof res.effective_max_party_size === 'number') {
            setEffectiveMaxPartySize(res.effective_max_party_size);
          }
          
          if (res.max_available_seats !== undefined && typeof res.max_available_seats === 'number') {
            setMaxAvailableSeats(res.max_available_seats);
            // Maximum available seats data received
          }
        }
        
        // Instead of toggling loading state which causes layout shifts,
        // we just update the data without changing loading indicators
      })
      .catch((err: any) => {
        console.error('Error fetching availability:', err);
        setError('Unable to check availability for the selected date and party size. Please try again later.');
        setTimeSlots([]);
        // Don't toggle loading state here either
      });
  }, [formData.date, formData.partySize, formData.location, restaurantSettings.max_party_size]);

  // Form submit handler
  const handleSubmitReal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.date || !formData.time || !formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Ensure we have a location if the restaurant has multiple locations
    if (hasMultipleLocations && !formData.location) {
      setError('Please select a location');
      return;
    }

    // Validate tenant context
    const restaurant = { id: getCurrentRestaurantId() };
    if (!validateRestaurantContext(restaurant)) {
      setError('Unable to create reservation. Restaurant context is missing.');
      return;
    }

    // Validate party size against restaurant settings
    if (formData.partySize > restaurantSettings.max_party_size) {
      setError(`Party size cannot exceed ${restaurantSettings.max_party_size} people`);
      return;
    }

    const finalPhone = formData.phone.trim();
    if (!isValidPhone(finalPhone)) {
      setError('Phone must be + (3 or 4 digit area code) + 7 digits, e.g. +16711234567');
      return;
    }

    setIsLoading(true);
    try {
      // Create reservation with proper tenant isolation
      const reservationData = {
        reservation: {
          start_time: `${formData.date ? formatYYYYMMDD(ensureDate(formData.date)) : ''}T${formData.time}`,
          party_size: formData.partySize,
          contact_name: `${formData.firstName} ${formData.lastName}`,
          contact_phone: formData.phone,
          contact_email: formData.email,
          special_requests: formData.specialRequests || '',
          duration_minutes: restaurantSettings.duration_minutes, // Use restaurant's configured duration
          location_id: formData.locationId ? Number(formData.locationId) : undefined, // Send numeric location_id instead of location name
          restaurant_id: getCurrentRestaurantId() // Ensure tenant context is passed
        }
      };
      
      // Capture the response which contains the reservation id
      const response = await api.post('/reservations', reservationData);
      
      // Extract the reservation data from the response
      let reservationId: number | undefined = undefined;
      let reservationNumber: string | undefined = undefined;
      
      // Access the response object
      const rawResponse = response as any;
      
      if (rawResponse.data) {
        // Try multiple approaches to find the data
        if (typeof rawResponse.data === 'object') {
          // Attempt 1: Direct access
          if (rawResponse.data.id) {
            reservationId = Number(rawResponse.data.id);
            reservationNumber = rawResponse.data.reservation_number;
          } 
          // Attempt 2: Parse the raw string if it's JSON
          else if (typeof rawResponse.data === 'string') {
            try {
              const parsed = JSON.parse(rawResponse.data);
              if (parsed && parsed.id) {
                reservationId = Number(parsed.id);
                reservationNumber = parsed.reservation_number;
              }
            } catch (e) {
              // Silently handle parsing errors
            }
          }
        }
      }
      
      // Fallback to checking the full response object
      if (!reservationId && rawResponse.id) {
        reservationId = Number(rawResponse.id);
        reservationNumber = rawResponse.reservation_number;
      }

      // If successful => Show confirmation with actual reservation ID and number
      setConfirmation({
        ...formData,
        phone: finalPhone,
        confirmed: true,
        id: reservationId, // Store the actual reservation ID
        reservation_number: reservationNumber, // Store the formatted reservation number
      });
    } catch (err: any) {
      console.error('Failed to create reservation:', err);
      setError(err.message || 'Reservation failed. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  function handleShare() {
    if (!confirmation) return;
    
    // Include location information if the restaurant has multiple locations
    const locationText = hasMultipleLocations && confirmation.location ? `\nLocation: ${confirmation.location}` : '';
    
    const text = `I just made a reservation at Håfaloha!\n\nDate: ${confirmation.date ? formatYYYYMMDD(confirmation.date) : ''}\nTime: ${confirmation.time}${locationText}\nParty Size: ${confirmation.partySize} people`;

    if (navigator.share) {
      navigator.share({ title: 'Håfaloha Reservation', text }).catch(console.error);
    }
  }

  // Helper to ensure a date is not null for formatting
  function ensureDate(date: Date | null): Date {
    return date || new Date();
  }
  
  // Use the formatTime function defined outside the component

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start sm:items-center justify-center p-0 overflow-y-auto">
      {/* CONFIRMATION SCREEN */}
      {confirmation ? (
        <div className="relative bg-white rounded-lg w-full min-h-screen sm:min-h-0 sm:h-auto max-w-2xl sm:max-h-[90vh] overflow-y-auto">
          <button
            type="button"
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 sm:right-6 sm:top-6"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <div className="pt-6 px-4 sm:px-6 pb-6 max-w-md mx-auto">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/30">
                <Check className="h-10 w-10 text-green-500" />
              </div>
            </div>
            
            {/* Heading */}
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mt-4 text-gray-900">Reservation Request Received!</h2>
              <p className="mt-2 text-gray-600 text-center px-4">
                Mahalo for your reservation request! We'll send a confirmation shortly.
              </p>
            </div>

            {/* Reservation Details Card */}
            <div className="mt-6 bg-white rounded-2xl p-5 mx-auto shadow-md border border-gray-100">
              {/* Reservation Number */}
              <div className="mb-2 text-center">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  Reservation {confirmation.reservation_number || `#${confirmation.id}` || 'Processing'}
                </span>
              </div>
              
              <div className="divide-y divide-gray-100">
                {/* Date & Time */}
                <div className="py-3 sm:py-4 flex items-start gap-3">
                  <div className="bg-hafaloha-gold/10 p-2.5 rounded-lg">
                    <Calendar className="h-5 w-5 text-hafaloha-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 mb-0.5">Date & Time</h4>
                    <p className="text-gray-900 font-medium">
                      {confirmation.date && new Date(confirmation.date).toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}
                    </p>
                    <p className="text-gray-700">
                      at {confirmation.time && formatTime(confirmation.time)}
                    </p>
                  </div>
                </div>
                
                {/* Party Size */}
                <div className="py-3 sm:py-4 flex items-start gap-3">
                  <div className="bg-hafaloha-gold/10 p-2.5 rounded-lg">
                    <Users className="h-5 w-5 text-hafaloha-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 mb-0.5">Party Size</h4>
                    <p className="text-gray-700">
                      {confirmation.partySize} {confirmation.partySize === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                </div>
                
                {/* Contact Info */}
                {(confirmation.phone || confirmation.email) && (
                  <div className="py-3 sm:py-4 flex items-start gap-3">
                    <div className="bg-hafaloha-gold/10 p-2.5 rounded-lg">
                      <User className="h-5 w-5 text-hafaloha-gold" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="font-medium text-gray-800 mb-0.5">Contact Information</h4>
                      {confirmation.phone && (
                        <p className="text-gray-700 truncate">{confirmation.phone}</p>
                      )}
                      {confirmation.email && (
                        <p className="text-gray-700 truncate">{confirmation.email}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Location */}
                <div className="py-3 sm:py-4 flex items-start gap-3">
                  <div className="bg-hafaloha-gold/10 p-2.5 rounded-lg">
                    <MapPin className="h-5 w-5 text-hafaloha-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-800 mb-0.5">Location</h4>
                      <a 
                        href="https://maps.google.com/?q=955+Pale+San+Vitores+Rd+Tamuning+Guam+96913" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Directions
                      </a>
                    </div>
                    {hasMultipleLocations && confirmation.location ? (
                      <p className="text-gray-900 font-medium">
                        {confirmation.location}
                      </p>
                    ) : null}
                    <p className="text-gray-700">
                      955 Pale San Vitores Rd
                      <br />
                      Tamuning, Guam 96913
                    </p>
                  </div>
                </div>
                
                {/* Special Requests */}
                {confirmation.specialRequests && (
                  <div className="py-3 sm:py-4 flex items-start gap-3">
                    <div className="bg-hafaloha-gold/10 p-2.5 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-hafaloha-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 mb-0.5">Special Requests</h4>
                      <p className="text-gray-700">
                        {confirmation.specialRequests}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* What's Next */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">What's next?</h4>
                <ol className="text-sm text-gray-600 space-y-1.5 pl-5 list-decimal">
                  <li>We'll review your request and send confirmation via text/email</li>
                  <li>You can add this to your calendar using the share button below</li>
                  <li>Feel free to call us with any questions before your visit</li>
                </ol>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleShare}
                className="flex-1 sm:flex-none order-2 sm:order-1 rounded-full bg-white flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share Details
              </button>
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none order-1 sm:order-2 rounded-full bg-hafaloha-gold flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-hafaloha-gold/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative bg-white rounded-none sm:rounded-lg w-full min-h-screen sm:min-h-0 sm:h-auto max-w-2xl sm:max-h-[90vh] overflow-y-auto">
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
        
        /* Date picker optimizations for all screens */
        .react-datepicker {
          font-size: 0.9rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .react-datepicker__day-name, .react-datepicker__day {
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          margin: 0.15rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          touch-action: manipulation;
        }
        
        .react-datepicker__day:focus, 
        .react-datepicker__day:active {
          outline: none;
          background-color: #f0f9ff;
        }
        
        .react-datepicker__current-month {
          font-size: 1rem;
          padding: 0.5rem 0;
        }
        
        .react-datepicker__header {
          padding-top: 0.5rem;
          border-bottom: 1px solid #f3f4f6;
          background-color: #f9fafb;
        }
        
        .react-datepicker__navigation {
          top: 0.7rem;
          height: 2rem;
          width: 2rem;
        }
        
        .react-datepicker__navigation-icon::before {
          border-width: 2px 2px 0 0;
          height: 8px;
          width: 8px;
        }
        
        .react-datepicker__triangle {
          display: none;
        }
        
        .react-datepicker-popper {
          z-index: 9999 !important;
          padding-top: 4px !important;
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .react-datepicker-popper {
            left: 0 !important;
            right: 0 !important;
            transform: none !important;
            position: fixed !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 100%;
            display: flex;
            justify-content: center;
            max-width: none;
          }
          
          .react-datepicker {
            width: 90%;
            max-width: 320px;
            margin: 0 auto;
          }
          
          .react-datepicker__month-container {
            width: 100%;
            float: none;
          }
          
          .react-datepicker__day-name, .react-datepicker__day {
            width: calc((100% - 1.5rem) / 7);
            margin: 0.1rem;
          }
          
          /* Add a backdrop for the modal on mobile */
          .reservation-datepicker-wrapper::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: -1;
          }
        }
      `}</style>
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="pt-6 sm:pt-8 px-4 sm:px-6 pb-4 text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Make a Reservation</h2>
        <p className="text-gray-600 text-sm sm:text-base">Book your seat for an unforgettable dining experience</p>
        
        {/* Error message display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 text-left">{error}</p>
          </div>
        )}
        
        {/* Loading indicator - removed spinner that caused shifts */}
      </div>

      <div className="px-4 sm:px-6 pb-6 sm:pb-8">
        <form onSubmit={handleSubmitReal} className="space-y-3 sm:space-y-4">
          {/* Date - Enhanced with better visual cues */}
          <div className="form-group mb-6">
            <label className="flex items-center gap-2 mb-2" htmlFor="date">
              <Calendar size={18} className="text-hafaloha-gold" />
              <span className="font-medium">When would you like to dine with us?</span>
            </label>
            <div className="relative">
              <DatePicker
                selected={formData.date}
                onChange={handleDateChange}
                dateFormat="EEEE, MMMM d, yyyy"
                minDate={new Date()}
                dayClassName={datePickerDayClassNames}
                filterDate={(date) => !isDateClosed(date)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:py-3 text-base sm:text-lg
                           focus:border-hafaloha-gold focus:outline-none focus:ring-1 focus:ring-hafaloha-gold"
                popperPlacement="bottom-start"
                calendarClassName="reservation-date-picker"
                inline={false}
                popperContainer={({ children }) => (
                  <div className="reservation-datepicker-wrapper">{children}</div>
                )}
                placeholderText="Click to select a date"
                required
                showPopperArrow={true}
                popperClassName="reservation-datepicker-popper"
              />
              {/* Calendar icon removed for cleaner UI */}
            </div>
            <div className="h-8 text-sm text-gray-600 mt-2 flex items-center">
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-hafaloha-gold rounded-full mr-2"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-gray-300 rounded-full mr-2"></div>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Party Size - Enhanced with visual indicators */}
          <div className="form-group mb-6">
            <label className="flex items-center gap-2 mb-2" htmlFor="partySize">
              <Users size={18} className="text-hafaloha-gold" />
              <span className="font-medium">How many people will be dining?</span>
              {effectiveMaxPartySize > 0 && (
                <span className="ml-2 text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  Max: {effectiveMaxPartySize}
                </span>
              )}
            </label>
            
            {/* No debug logs here - moved to useEffect */}
            
            {/* Mobile-optimized party size selector - grid layout for better touch targets */}
            <div className="mb-2">
              {/* Create a responsive 4x2 grid for party sizes 1-8 */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3">
                {[...Array(8)].map((_, i) => (
                  <button
                    key={i+1}
                    type="button"
                    onClick={() => setFormData({ ...formData, partySize: i+1 })}
                    className={`h-12 sm:h-14 rounded-lg flex items-center justify-center transition-colors touch-manipulation text-lg
                      ${formData.partySize === i+1
                        ? 'bg-hafaloha-gold text-white font-medium shadow-sm' 
                        : 'bg-white text-gray-800 border border-gray-300 hover:border-hafaloha-gold hover:text-hafaloha-gold active:bg-gray-50'}`}
                    disabled={isLoadingCapacity && (i+1 > (effectiveMaxPartySize || Math.min(actualCapacity || 8, maxPartySize || (restaurantSettings?.max_party_size || 8))))}
                    aria-label={`${i+1} ${i === 0 ? 'person' : 'people'}`}
                  >
                    {i+1}
                  </button>
                ))}
              </div>
              
              {/* Seamlessly integrated dropdown for larger party sizes */}
              {(() => {
                // Determine the maximum party size - use admin setting if available
                const adminMaxSize = restaurantSettings?.max_party_size;
                const computedMaxSize = effectiveMaxPartySize || Math.min(actualCapacity || 20, maxPartySize || 20);
                const finalMaxSize = adminMaxSize || computedMaxSize;
                
                // Only show dropdown if max size is greater than 8
                if (finalMaxSize > 8) {
                  // Generate options for party sizes from 9 to max
                  const largePartyOptions = [];
                  for (let i = 9; i <= finalMaxSize; i++) {
                    largePartyOptions.push({
                      value: i.toString(),
                      label: `${i} people`
                    });
                  }
                  
                  return (
                    <div className="relative">
                      <div className="flex items-center">
                        <div className="h-px bg-gray-200 flex-grow mr-4"></div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">Need more than 8 people?</span>
                        <div className="h-px bg-gray-200 flex-grow ml-4"></div>
                      </div>
                      <div className="mt-3">
                        <MobileSelect
                          value={formData.partySize > 8 ? formData.partySize.toString() : ''}
                          onChange={(value) => {
                            if (value) {
                              const parsedValue = parseInt(value, 10);
                              setFormData({ ...formData, partySize: parsedValue });
                            }
                          }}
                          options={largePartyOptions}
                          placeholder="Select larger party size..."
                          className="w-full"
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            {(timeSlots.length > 0 || formData.time) && (
              <div className="px-1 mt-1 text-sm text-slate-500">
                <p className="text-xs">
                  {timeSlots.length > 0 ? (
                    <>Available for groups up to {maxAvailableSeats} {maxAvailableSeats === 1 ? 'person' : 'people'}{adminMaxPartySize > 0 && adminMaxPartySize < actualCapacity ? ` (limited by restaurant policy)` : ``}</>
                  ) : (
                    <>No available times found for the selected party size</>
                  )}
                </p>
              </div>
            )}
            
            <input type="hidden" name="partySize" value={formData.partySize} />
          </div>

          {/* Location Selection */}
          {hasMultipleLocations && (
            <div className="form-group mb-4 relative">
              <label className="flex items-center gap-2 mb-2" htmlFor="location">
                <MapPin size={18} className="text-hafaloha-gold" />
                <span className="font-medium">Location</span>
              </label>
              <MobileSelect
                options={locations.map((location: {id: number, name: string}) => ({
                  value: location.id.toString(), // Use ID as the value, not name
                  label: location.name
                }))}
                value={formData.locationId ? formData.locationId.toString() : ''}
                onChange={(value) => {
                  const selectedLocation = locations.find(loc => loc.id.toString() === value);
                  if (selectedLocation) {
                    handleLocationSelect(selectedLocation.id, selectedLocation.name);
                  }
                }}
                placeholder="Select location"
              />
            </div>
          )}
                      {/* Time Selection - Improved with visual time slots */}
          <div className="form-group mb-6">
            <label className="flex items-center gap-2 mb-2" htmlFor="time">
              <Clock size={18} className="text-hafaloha-gold" />
              <span className="font-medium">What time works best for you?</span>
            </label>
            
            {/* Fixed height container to prevent layout shifts */}
            <div className="min-h-[120px]">
              {timeSlots.length > 0 ? (
                <div>
                  {/* Visual time slot buttons */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 mb-2">
                    {timeSlots.map((slot: string) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          handleTimeSelection(slot);
                        }}
                        className={`py-3 px-1 text-sm sm:text-base rounded-md border text-center transition-colors touch-manipulation
                          ${formData.time === slot
                            ? 'bg-hafaloha-gold text-white border-hafaloha-gold font-medium' 
                            : 'bg-white text-gray-800 border-gray-300 hover:border-hafaloha-gold hover:text-hafaloha-gold active:bg-gray-50'}`}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="hidden" 
                    name="time" 
                    value={formData.time} 
                    required 
                  />
                  {!formData.time && formData.date && (
                    <p className="text-sm text-blue-600 mt-1">Please select a time for your reservation</p>
                  )}
                </div>
              ) : (
              <div className="min-h-[150px] relative flex items-center justify-center overflow-hidden">
                {/* No Date Selected - Only visible when no date is selected */}
                {!formData.date && (
                  <div className="w-full py-6 text-center border border-dashed border-gray-300 rounded-md bg-gray-50">
                    <p className="text-gray-700">Please select a date first</p>
                    <p className="text-sm text-gray-500 mt-1">Available times will appear here</p>
                  </div>
                )}
                
                {/* No Times Available - Only visible when not loading and there are no slots */}
                {formData.date && !isLoading && timeSlots.length === 0 && (
                  <div className="w-full py-6 text-center border border-dashed border-gray-300 rounded-md bg-gray-50">
                    <p className="text-gray-700">No available times found for this date.</p>
                    <p className="text-sm text-gray-500 mt-1">Please try selecting a different date.</p>
                  </div>
                )}
                
                {/* Loading Skeleton - Show skeleton UI with exact same layout as real slots */}
                {formData.date && (
                  <div className="w-full py-2" style={{opacity: isLoading ? 1 : 0, position: isLoading ? 'relative' : 'absolute', top: 0, left: 0, right: 0}}>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 mb-2">
                      {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="py-3 px-1 rounded-md bg-gray-100 animate-pulse h-10"></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
            
            {/* Duration is completely hidden from customers now - using restaurant settings */}
          </div>
              <input type="hidden" name="duration" value={formatDurationFromMinutes(restaurantSettings.duration_minutes)} />

            {/* Contact Information */}
            <div className="mt-8 mb-4">
              <h3 className="text-lg font-medium text-gray-800">Contact Information</h3>
              <p className="text-gray-600 text-sm">We'll use this to confirm your reservation and send important updates</p>
            </div>
            
            {/* FirstName / LastName */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <label className="flex items-center gap-2 mb-2" htmlFor="firstName">
                <User size={18} className="text-hafaloha-gold" />
                <span className="font-medium">First Name</span>
                </label>
                <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-3 sm:py-2 text-gray-800 text-base
                        focus:border-hafaloha-gold focus:outline-none focus:ring-1 focus:ring-hafaloha-gold"
                inputMode="text"
                autoCapitalize="words"
                placeholder="Enter your first name"
                required
                autoComplete="given-name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2" htmlFor="lastName">
                <User size={18} className="text-hafaloha-gold" />
                <span className="font-medium">Last Name</span>
                </label>
                <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-3 sm:py-2 text-gray-800 text-base
                        focus:border-hafaloha-gold focus:outline-none focus:ring-1 focus:ring-hafaloha-gold"
                inputMode="text"
                autoCapitalize="words"
                placeholder="Enter your last name"
                required
                autoComplete="family-name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <label className="flex items-center gap-2 mb-2" htmlFor="phone">
                <Phone size={18} className="text-hafaloha-gold" />
                <span className="font-medium">Phone Number</span>
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="671 123 4567"
                    className="block w-full rounded-md border border-gray-300 px-3 py-3 sm:py-2 pl-8 text-gray-800 text-base
                              focus:border-hafaloha-gold focus:outline-none focus:ring-1 focus:ring-hafaloha-gold"
                    inputMode="tel"
                    pattern="\+?[0-9]{10,13}"
                    title="Please enter a valid phone number"
                    required
                    autoComplete="tel"
                  />
                  {/* Removed the extra +1 prefix since it's already in the input value */}
                </div>
                <p className="mt-1 text-xs text-gray-500">We'll text you your reservation confirmation</p>
              </div>
              
              <div>
                <label className="flex items-center gap-2 mb-2" htmlFor="email">
                <Mail size={18} className="text-hafaloha-gold" />
                <span className="font-medium">Email Address</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="yourname@example.com"
                  className="block w-full rounded-md border border-gray-300 px-3 py-3 sm:py-2 text-gray-800 text-base
                             focus:border-hafaloha-gold focus:outline-none focus:ring-1 focus:ring-hafaloha-gold"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  autoComplete="email"
                />
                <p className="mt-1 text-xs text-gray-500">We'll email your reservation details</p>
              </div>
            </div>

            {/* Special requests - Optional field for better customer service */}
            <div className="form-group mb-8">
              <label className="flex items-center gap-2 mb-2" htmlFor="specialRequests">
                <AlertCircle size={18} className="text-hafaloha-gold" />
                <span className="font-medium">Special Requests</span>
                <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <textarea
                id="specialRequests"
                value={formData.specialRequests || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-3 sm:py-2 h-24 text-gray-800 text-base
                           focus:border-hafaloha-gold focus:outline-none focus:ring-1 focus:ring-hafaloha-gold"
                placeholder="Let us know if you have any special requests or dietary restrictions"
              />
            </div>
            
            {/* Submit Button - Enhanced with clear CTA and loading state */}
            <div className="mt-8 sticky bottom-0 bg-white pt-3 pb-5 px-2 -mx-2 sm:mx-0 sm:px-0 z-10 border-t border-gray-100 sm:border-0 shadow-sm sm:shadow-none">
              <button 
                type="submit" 
                className="w-full rounded-lg bg-hafaloha-gold px-4 sm:px-6 py-4 text-white text-base sm:text-lg font-semibold
                           hover:bg-hafaloha-gold/90 focus:outline-none focus:ring-2 focus:ring-hafaloha-gold focus:ring-offset-2
                           transition-colors duration-200 shadow-md"
                disabled={isLoading}
              >
                Create Reservation
              </button>
              <p className="text-center text-xs sm:text-sm text-gray-600 mt-3">
                By making a reservation, you agree to our reservation policy.
              </p>
            </div>
          </form>
        </div>
      </div>
      )}
    </div>
  );
}

/** Formats "12:00" => "12:00 PM" for displayed slots. */
/// Removed unused function

/** Formats minutes to duration string */
function formatDurationFromMinutes(minutes: number): string {
  if (minutes === 90) return '1.5 hours';
  if (minutes === 120) return '2 hours';
  if (minutes > 60) return `${minutes/60} hours`;
  return '1 hour';
}

/** Formats "12:00" => "12:00 PM" for displayed slots. */
function formatTime(t: string) {
  const [hh, mm] = t.split(':').map(Number);
  if (isNaN(hh)) return t;
  const date = new Date(2020, 0, 1, hh, mm);
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
