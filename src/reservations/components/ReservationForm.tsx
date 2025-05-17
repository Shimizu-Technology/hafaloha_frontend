// src/components/ReservationForm.tsx

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select, { SingleValue } from 'react-select';
import { 
  CalendarClock, 
  Check, 
  Clock, 
  Mail, 
  MapPin, 
  Phone, 
  Users
} from 'lucide-react';

import { useAuth } from '../../shared/auth';
import toastUtils from '../../shared/utils/toastUtils';
import { api } from '../../shared/api';
import { Tooltip } from '../../shared/components/ui';
import { formatPhoneNumber } from '../../shared/utils/formatters';
import * as tenantUtils from '../../shared/utils/tenantUtils';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { config } from '../../shared/config';

// Define API types
interface AvailabilityResponse {
  slots: string[];
  date: string;
}

// Define API functions
const fetchAvailability = async (date: string, partySize: number): Promise<AvailabilityResponse> => {
  // Add restaurant_id to query params for tenant isolation
  const restaurantId = tenantUtils.getCurrentRestaurantId();
  const params = tenantUtils.addRestaurantIdToParams({ date, party_size: partySize }, restaurantId);
  return api.get<AvailabilityResponse>('/availability', params);
};

const createReservation = async (data: any): Promise<any> => {
  return api.post<any>('/reservations', data);
};

const fetchRestaurantOperatingHours = async (): Promise<any[]> => {
  // Add restaurant_id to query params for tenant isolation
  const restaurantId = tenantUtils.getCurrentRestaurantId();
  const params = tenantUtils.addRestaurantIdToParams({}, restaurantId);
  return api.get('/operating_hours', params);
};

const fetchRestaurantSpecialEvents = async (): Promise<any[]> => {
  // Add restaurant_id to query params for tenant isolation
  const restaurantId = tenantUtils.getCurrentRestaurantId();
  const params = tenantUtils.addRestaurantIdToParams({}, restaurantId);
  return api.get('/special_events', params);
};

/** Helpers */
function formatYYYYMMDD(dateObj: Date): string {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function parseYYYYMMDD(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function format12hSlot(slot: string) {
  const [hhStr, mmStr] = slot.split(':');
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  const d = new Date(2020, 0, 1, hh, mm);
  return d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
function formatDuration(minutes: number) {
  if (minutes === 30) return '30 minutes';
  if (minutes === 60) return '1 hour';
  if (minutes === 90) return '1.5 hours';
  return `${minutes / 60} hours`;
}

/** React Select types */
interface TimeOption {
  value: string;
  label: string;
}
interface DurationOption {
  value: number;
  label: string;
}

/** Form fields */
interface ReservationFormData {
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  specialRequests: string;
}

/** Data for the confirmation UI */
interface ConfirmationData {
  date: string;
  time: string;
  partySize: number;
  duration: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  specialRequests?: string;
}

/** "Reservation Confirmed!" screen */
function ReservationConfirmation({
  reservation,
  onClose,
}: {
  reservation: ConfirmationData;
  onClose: () => void;
}) {
  // No need to access auth context for this component
  
  // Format date for display
  const dateObj = parseYYYYMMDD(reservation.date);
  const dateStr = dateObj
    ? dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : reservation.date;
  
  // Create a unique reservation ID
  const reservationId = `R-${Date.now().toString().slice(-6)}`;
  
  // Current date and time for the confirmation timestamp
  const confirmationTime = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  return (
    <div className="relative p-6 max-w-md sm:max-w-xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Success icon with Shimizu blue color */}
      <div className="absolute left-1/2 -top-8 -translate-x-1/2">
        <div className="bg-[#0078d4] text-white p-3 rounded-full shadow-lg">
          <Check className="h-7 w-7" />
        </div>
      </div>

      <div className="text-center mt-8 mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Reservation Confirmed!</h2>
        <p className="text-gray-600 mt-1">
          {reservation.firstName ? `Thank you, ${reservation.firstName}! ` : 'Thank you! '}
          We're looking forward to your visit.
        </p>
        <div className="mt-2 bg-[#0078d4]/10 text-[#0078d4] text-sm px-4 py-2 rounded-full inline-block">
          Confirmation #: <span className="font-medium">{reservationId}</span>
        </div>
      </div>

      {/* Main reservation details panel */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4">
        <h3 className="font-semibold text-base sm:text-lg mb-4 text-gray-900">
          Reservation Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date & Time */}
          <div className="flex items-start space-x-2">
            <CalendarClock className="h-5 w-5 text-[#0078d4] mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Date &amp; Time</p>
              <p className="text-gray-600">{dateStr}</p>
              <p className="text-gray-600">{reservation.time}</p>
            </div>
          </div>

          {/* Party & Duration */}
          <div className="flex items-start space-x-2">
            <Users className="h-5 w-5 text-[#0078d4] mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Party Size</p>
              <p className="text-gray-600">
                {reservation.partySize}{' '}
                {reservation.partySize === 1 ? 'person' : 'people'}
              </p>
              <p className="text-gray-600">{reservation.duration}</p>
            </div>
          </div>

          {/* Contact Info */}
          {(reservation.phone || reservation.email) && (
            <div className="flex items-start space-x-2 md:col-span-2">
              <Mail className="h-5 w-5 text-[#0078d4] mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Contact Information</p>
                <p className="text-gray-600">
                  {reservation.firstName} {reservation.lastName}
                </p>
                {reservation.phone && (
                  <p className="text-gray-600">{formatPhoneNumber(reservation.phone)}</p>
                )}
                {reservation.email && (
                  <p className="text-gray-600">{reservation.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex items-start space-x-2">
            <MapPin className="h-5 w-5 text-[#0078d4] mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Location</p>
              <p className="text-gray-600">955 Pale San Vitores Rd</p>
              <p className="text-gray-600">Tamuning, Guam 96913</p>
            </div>
          </div>
          
          {/* Special Requests - Only show if provided */}
          {reservation.specialRequests && (
            <div className="flex items-start space-x-2 md:col-span-2 mt-2">
              <div className="bg-white border border-gray-200 rounded-lg p-3 w-full">
                <p className="font-medium text-gray-900 mb-1">Special Requests</p>
                <p className="text-gray-600 text-sm">{reservation.specialRequests}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Confirmation timestamp */}
        <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
          <p>Confirmation sent: {confirmationTime}</p>
        </div>
      </div>

      {/* Important notice */}
      <div className="bg-[#0078d4]/5 border border-[#0078d4]/20 rounded-lg p-3 mb-4 text-sm">
        <p className="font-medium text-gray-800 mb-1">Important Information</p>
        <ul className="text-gray-600 text-xs list-disc list-inside space-y-1">
          <li>Please arrive on time for your reservation.</li>
          <li>Your table may be released after 15 minutes if you're late.</li>
          <li>To modify or cancel, please call us at least 2 hours in advance.</li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onClose}
          className="w-full sm:w-auto flex-1 bg-[#0078d4] hover:bg-[#50a3d9] text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors"
        >
          Done
        </button>
        <button
          onClick={() => {
            // Create a calendar event URL
            const eventTitle = `Reservation for ${reservation.partySize} at Shimizu Restaurant`;
            const eventDetails = `Reservation details:\nTime: ${reservation.time}\nParty: ${reservation.partySize} people\nDuration: ${reservation.duration}\nConfirmation #: ${reservationId}`;
            const eventStart = encodeURIComponent(`${reservation.date}T${reservation.time}`);
            
            // Create a Google Calendar URL
            const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDetails)}&dates=${eventStart}/${eventStart}`;
            window.open(googleCalUrl, '_blank');
          }}
          className="w-full sm:w-auto flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 sm:py-3 px-4 rounded-lg border border-gray-300 transition-colors inline-flex items-center justify-center"
        >
          <CalendarClock className="h-5 w-5 mr-2" />
          Add to Calendar
        </button>
      </div>
    </div>
  );
}

/** Main ReservationForm */
export default function ReservationForm({
  onClose,                // Parent can close the modal
  onToggleConfirmation,   // Tells parent if we're confirming
}: {
  onClose?: () => void;
  onToggleConfirmation?: (confirming: boolean) => void;
}) {
  const { user } = useAuth();
  const [tenantError, setTenantError] = useState<string | null>(null);
  const { restaurant, fetchRestaurant } = useRestaurantStore();
  // Basic form data
  const [formData, setFormData] = useState<ReservationFormData>({
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    phone: user?.phone?.trim() || '+1671',
    email: '',
    specialRequests: '',
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ReservationFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ReservationFormData, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [partySizeText, setPartySizeText] = useState('1');
  const [duration, setDuration] = useState(60);
  const [timeslots, setTimeslots] = useState<string[]>([]);
  
  // Operating hours and special events for closed day handling
  const [closedDaysOfWeek, setClosedDaysOfWeek] = useState<number[]>([]);
  const [closedDates, setClosedDates] = useState<Date[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // For confirmation screen
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reservationDetails, setReservationDetails] = useState<ConfirmationData | null>(null);

  // Initialize restaurant context and set in localStorage for tenant validation
  useEffect(() => {
    const setupRestaurantContext = async () => {
      try {
        // First try to use the restaurant from the store if already loaded
        if (restaurant?.id) {
          // Store in localStorage for tenant validation
          localStorage.setItem('restaurantId', restaurant.id.toString());
          setTenantError(null);
          return;
        }
        
        // If restaurant is not loaded, try to fetch it
        await fetchRestaurant();
        
        // Fallback to config if store fails
        if (!restaurant?.id) {
          const configRestaurantId = parseInt(config.restaurantId);
          if (!isNaN(configRestaurantId)) {
            localStorage.setItem('restaurantId', configRestaurantId.toString());
            setTenantError(null);
            return;
          }
        }
        
        // If we still don't have a restaurant ID, show error
        const storedId = localStorage.getItem('restaurantId');
        if (!storedId) {
          setTenantError('Unable to access reservation system. Restaurant context is missing.');
        }
      } catch (error) {
        console.error('Error setting up restaurant context:', error);
        setTenantError('Unable to access reservation system. Restaurant context is missing.');
      }
    };
    
    setupRestaurantContext();
  }, [restaurant, fetchRestaurant]);
  
  // Fetch operating hours and special events to determine closed days
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (!tenantUtils.getCurrentRestaurantId()) return;
      
      setIsLoadingSchedule(true);
      try {
        // Fetch operating hours to determine which days of week are closed
        const hours = await fetchRestaurantOperatingHours();
        
        // Extract days of week when restaurant is closed
        const closedDays = hours
          .filter((day: any) => day.closed)
          .map((day: any) => day.day_of_week);
        setClosedDaysOfWeek(closedDays);
        
        // Fetch special events to determine specific dates that are closed
        const events = await fetchRestaurantSpecialEvents();
        
        // Extract dates when restaurant is closed due to special events
        const closedEventDates = events
          .filter((event: any) => event.closed)
          .map((event: any) => new Date(event.event_date));
        setClosedDates(closedEventDates);
        
      } catch (error) {
        console.error('Error fetching schedule data:', error);
      } finally {
        setIsLoadingSchedule(false);
      }
    };
    
    fetchScheduleData();
  }, []);

  /** Convert typed partySize => number */
  function getPartySize(): number {
    return parseInt(partySizeText, 10) || 1;
  }

  /** Fetch timeslots on date or partySize changes */
  useEffect(() => {
    async function loadTimes() {
      if (!formData.date || !getPartySize()) {
        setTimeslots([]);
        return;
      }
      
      try {
        const data = await fetchAvailability(formData.date, getPartySize());
        setTimeslots(data.slots || []);
        // Clear any previous tenant error
        setTenantError(null);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setTimeslots([]);
      }
    }
    loadTimes();
  }, [formData.date, partySizeText]);

  /** Build time options for react-select */
  const timeOptions: TimeOption[] = timeslots.map((slot) => ({
    value: slot,
    label: format12hSlot(slot),
  }));

  /** Duration (minutes) options */
  const durations = [30, 60, 90, 120, 180, 240];
  const durationOptions: DurationOption[] = durations.map((val) => {
    if (val === 30) return { value: val, label: '30 minutes' };
    if (val === 60) return { value: val, label: '1 hour' };
    if (val === 90) return { value: val, label: '1.5 hours' };
    return { value: val, label: `${val / 60} hours` };
  });

  /** Sync the selectedDate with formData.date */
  function handleDateChange(date: Date | null) {
    // Make sure we don't allow selection of closed dates
    if (date && !isDateClosed(date)) {
      setSelectedDate(date);
      setFormData({ ...formData, date: date ? formatYYYYMMDD(date) : '' });
    }
  }
  
  /** Check if a date is closed based on operating hours and special events */
  function isDateClosed(date: Date): boolean {
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
  }
  
  /** Custom date styling for the date picker, to visually indicate closed days */
  const datePickerDayClassNames = (date: Date): string => {
    if (isDateClosed(date)) {
      return 'closed-day';
    }
    return '';
  };

  useEffect(() => {
    if (formData.date) {
      setSelectedDate(parseYYYYMMDD(formData.date));
    } else {
      setSelectedDate(null);
    }
  }, [formData.date]);

  /** Validate the form and return any errors */
  function validateForm(): Partial<Record<keyof ReservationFormData, string>> {
    const errors: Partial<Record<keyof ReservationFormData, string>> = {};
    
    // Required fields validation
    if (!formData.date) {
      errors.date = 'Please select a date';
    }
    
    if (!formData.time) {
      errors.time = 'Please select a time';
    }
    
    // At least one contact method is required
    const hasEmail = !!formData.email.trim() || !!user?.email;
    const hasPhone = !!formData.phone.trim().replace(/[-()+\s]+/g, '') && formData.phone.trim() !== '+1671';
    
    if (!hasEmail && !hasPhone) {
      errors.email = 'Please provide either an email or phone number';
      errors.phone = 'Please provide either an email or phone number';
    }
    
    // Name validation
    if (!formData.firstName.trim() && !user?.name?.split(' ')[0]) {
      errors.firstName = 'First name is required';
    }
    
    // Email format validation (if provided)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (if provided)
    if (hasPhone && formData.phone.trim().replace(/[-()+\s]+/g, '').length < 7) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    // Party size validation
    const partySize = getPartySize();
    if (partySize < 1) {
      errors.firstName = 'Party size must be at least 1 person'; // Using firstName as a proxy since we don't have partySize in formData
    } else if (partySize > 20) { // Assuming 20 is a reasonable upper limit
      errors.firstName = 'Please call for large party reservations'; // Using firstName as a proxy
    }
    
    return errors;
  }

  /** On form submit => create reservation => show confirmation */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate restaurant context
    const restaurantId = tenantUtils.getCurrentRestaurantId();
    if (!restaurantId || !tenantUtils.validateRestaurantContext({ id: restaurantId }, false)) {
      setTenantError('Unable to access reservation system. Restaurant context is missing.');
      setIsSubmitting(false);
      return;
    }
    // Clear any previous tenant error
    setTenantError(null);
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched as Partial<Record<keyof ReservationFormData, boolean>>);
    
    // Validate the form
    const validationErrors = validateForm();
    setFormErrors(validationErrors);
    
    // If there are errors, don't proceed
    if (Object.keys(validationErrors).length > 0) {
      setIsSubmitting(false);
      toastUtils.error('Please fix the errors in the form');
      return;
    }

    const start_time = `${formData.date}T${formData.time}:00`;

    // fallback contact info
    const contactFirstName =
      formData.firstName.trim() || user?.name?.split(' ')[0] || '';
    const contactLastName =
      formData.lastName.trim() || user?.name?.split(' ')[1] || '';
    let contactPhone = formData.phone.trim();
    const contactEmail = formData.email.trim() || user?.email || '';

    if (!contactFirstName) {
      toastUtils.error('First name is required.');
      return;
    }

    const finalPartySize = getPartySize();
    // phone cleanup
    const cleanedPhone = contactPhone.replace(/[-()\s]+/g, '');
    if (cleanedPhone === '+1671') {
      contactPhone = '';
    }

    try {
      // Get restaurant ID from tenant context
      const restaurantId = tenantUtils.getCurrentRestaurantId();
      
      await createReservation({
        start_time,
        party_size: finalPartySize,
        contact_name: [contactFirstName, contactLastName].filter(Boolean).join(' '),
        contact_phone: contactPhone,
        contact_email: contactEmail,
        restaurant_id: restaurantId,
        duration_minutes: duration,
        special_requests: formData.specialRequests.trim(),
        location_id: 1, // Use the default location ID for this restaurant
      });
      toastUtils.success('Reservation created successfully!');

      // Build data for the Confirmation UI
      const confirmData: ConfirmationData = {
        date: formData.date,
        time: format12hSlot(formData.time),
        partySize: finalPartySize,
        duration: formatDuration(duration),
        firstName: contactFirstName || undefined,
        lastName: contactLastName || undefined,
        phone: contactPhone || undefined,
        email: contactEmail || undefined,
        specialRequests: formData.specialRequests.trim() || undefined,
      };
      setReservationDetails(confirmData);
      setShowConfirmation(true);
      onToggleConfirmation?.(true);
    } catch (err) {
      console.error('Error creating reservation:', err);
      toastUtils.error('Failed to create reservation. Please try again.');
    }
  }

  /** Filter out non-numeric for partySize */
  function handlePartySizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPartySizeText(digitsOnly);
  }

  /** Mark a field as touched when it's interacted with */
  const handleBlur = (field: keyof ReservationFormData) => {
    setTouched({ ...touched, [field]: true });
  };

  /** Get error message for a field if it has been touched */
  const getErrorMessage = (field: keyof ReservationFormData): string | undefined => {
    return touched[field] ? formErrors[field] : undefined;
  };

  /** Custom React-Select styles */
  const reactSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      minHeight: '2.25rem',
      borderColor: state.isFocused ? '#0078d4' : '#D1D5DB',
      fontSize: '0.875rem',
      boxShadow: 'none',
      paddingLeft: '2rem',
      '&:hover': { borderColor: '#50a3d9' },
    }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '0.875rem',
      color: state.isSelected ? 'white' : '#374151',
      backgroundColor: state.isSelected ? '#0078d4' : 'white',
      '&:hover': { backgroundColor: '#50a3d9' },
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  /** If we are showing the Confirmation screen */
  if (showConfirmation && reservationDetails) {
    return (
      <div className="w-full max-w-md mx-auto">
        <ReservationConfirmation
          reservation={reservationDetails}
          onClose={() => {
            onClose?.();
            setShowConfirmation(false);
            setReservationDetails(null);
            onToggleConfirmation?.(false);
          }}
        />
      </div>
    );
  }

  /** Otherwise, render the narrower form with two columns */
  return (
    <div className="w-full max-w-md mx-auto">
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
      {tenantError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <div className="text-red-500 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-red-600">{tenantError}</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Date */}
          <div className="space-y-1">
            <label className="block text-sm sm:text-base font-medium text-gray-700">
              Date
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              onBlur={() => handleBlur('date')}
              dateFormat="MM/dd/yyyy"
              minDate={new Date()}
              className="
                w-full
                px-3 py-2
                border border-gray-300
                rounded-md
                focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]
                text-sm sm:text-base
              "
              placeholderText="Select date"
              required
              shouldCloseOnSelect
              dayClassName={datePickerDayClassNames}
              filterDate={(date) => !isDateClosed(date)}
              renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                <div className="flex justify-between items-center px-3 py-2">
                  <button
                    onClick={decreaseMonth}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-gray-700 font-medium">
                    {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)}
                  </div>
                  <button
                    onClick={increaseMonth}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            />
            {/* Add a small legend to explain closed dates */}
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <div className="w-3 h-3 bg-gray-200 rounded-full mr-1"></div>
              <span>{isLoadingSchedule ? 'Loading schedule...' : 'Closed dates are not selectable'}</span>
            </div>
            {getErrorMessage('date') && (
              <p className="text-red-600 text-xs mt-1">{getErrorMessage('date')}</p>
            )}
          </div>

          {/* Time => React Select */}
          <div className="space-y-1">
            <label className="block text-sm sm:text-base font-medium text-gray-700">
              Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Select<TimeOption>
                options={timeOptions}
                placeholder="Select a time"
                value={
                  formData.time
                    ? timeOptions.find((opt) => opt.value === formData.time)
                    : null
                }
                onChange={(opt: SingleValue<TimeOption>) => {
                  setFormData({ ...formData, time: opt?.value || '' });
                  handleBlur('time');
                }}
                styles={reactSelectStyles}
              />
            </div>
            {getErrorMessage('time') && (
              <p className="text-red-600 text-xs mt-1">{getErrorMessage('time')}</p>
            )}
          </div>

          {/* Party Size */}
          <div className="space-y-1">
            <div className="flex items-center">
              <label
                htmlFor="partySize"
                className="block text-sm sm:text-base font-medium text-gray-700"
              >
                Party Size
              </label>
              <Tooltip 
                content="Enter the number of people in your party. This helps us allocate the right table size for your group."
                position="top"
                icon
                iconClassName="ml-1 h-4 w-4"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="partySize"
                inputMode="numeric"
                pattern="[0-9]*"
                value={partySizeText}
                onChange={handlePartySizeChange}
                onBlur={() => handleBlur('firstName')}
                placeholder="1"
                required
                className="
                  w-full
                  pl-10 pr-3
                  py-2
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]
                  text-sm sm:text-base
                "
              />
            </div>
            {getErrorMessage('firstName') && (
              <p className="text-red-600 text-xs mt-1">{getErrorMessage('firstName')}</p>
            )}
          </div>

          {/* Duration => React Select */}
          <div className="space-y-1">
            <div className="flex items-center">
              <label className="block text-sm sm:text-base font-medium text-gray-700">
                Duration
              </label>
              <Tooltip 
                content="Select how long you expect to need the table. This helps us manage reservations efficiently."
                position="top"
                icon
                iconClassName="ml-1 h-4 w-4"
              />
            </div>
            <Select<DurationOption>
              options={durationOptions}
              placeholder="Select duration"
              value={durationOptions.find((opt) => opt.value === duration) || null}
              onChange={(opt) => setDuration(opt?.value || 60)}
              onBlur={() => handleBlur('time')}
              styles={reactSelectStyles}
            />
          </div>

          {/* First Name */}
          <div className="space-y-1">
            <label
              htmlFor="firstName"
              className="block text-sm sm:text-base font-medium text-gray-700"
            >
              {user ? 'First Name (Optional)' : 'First Name (Required)'}
            </label>
            <input
              type="text"
              id="firstName"
              placeholder={
                user ? user.name?.split(' ')[0] || '' : 'Enter your first name'
              }
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              onBlur={() => handleBlur('firstName')}
              className="
                w-full
                px-3 py-2
                border border-gray-300
                rounded-md
                focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]
                text-sm sm:text-base
              "
            />
            {getErrorMessage('firstName') && (
              <p className="text-red-600 text-xs mt-1">{getErrorMessage('firstName')}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label
              htmlFor="lastName"
              className="block text-sm sm:text-base font-medium text-gray-700"
            >
              Last Name (Optional)
            </label>
            <input
              type="text"
              id="lastName"
              placeholder={user ? user.name?.split(' ')[1] || '' : 'Last name (optional)'}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              onBlur={() => handleBlur('lastName')}
              className="
                w-full
                px-3 py-2
                border border-gray-300
                rounded-md
                focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]
                text-sm sm:text-base
              "
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <div className="flex items-center">
              <label
                htmlFor="phone"
                className="block text-sm sm:text-base font-medium text-gray-700"
              >
                Phone {user ? '(Optional)' : '(Required)'}
              </label>
              <Tooltip 
                content="We may contact you about your reservation. Include country code (e.g., +1671 for Guam)."
                position="top"
                icon
                iconClassName="ml-1 h-4 w-4"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                id="phone"
                placeholder={user ? user.phone ?? '' : '+1671'}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onBlur={() => handleBlur('phone')}
                className="
                  w-full
                  pl-10 pr-3
                  py-2
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]
                  text-sm sm:text-base
                "
              />
            </div>
            {getErrorMessage('phone') && (
              <p className="text-red-600 text-xs mt-1">{getErrorMessage('phone')}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm sm:text-base font-medium text-gray-700"
            >
              Email {user ? '(Optional)' : '(Required)'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                placeholder={user ? user.email ?? '' : 'Enter your email'}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => handleBlur('email')}
                className="
                  w-full
                  pl-10 pr-3
                  py-2
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]
                  text-sm sm:text-base
                "
              />
            </div>
            {getErrorMessage('email') && (
              <p className="text-red-600 text-xs mt-1">{getErrorMessage('email')}</p>
            )}
          </div>

          {/* Special Requests */}
          <div className="md:col-span-2 space-y-1">
            <label
              htmlFor="specialRequests"
              className="block text-sm sm:text-base font-medium text-gray-700"
            >
              Special Requests (Optional)
            </label>
            <textarea
              id="specialRequests"
              placeholder="Any special requests or preferences?"
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              onBlur={() => handleBlur('specialRequests')}
              className="
                w-full
                px-3 py-2
                border border-gray-300
                rounded-md
                focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]
                text-sm sm:text-base
                min-h-[80px]
              "
            />
            <p className="text-xs text-gray-500">
              Let us know if you have any dietary requirements, seating preferences, or special occasions.
            </p>
          </div>
        </div>

        {/* Submit button */}
        <div className="mt-4 sm:mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="
              w-full
              bg-[#0078d4]
              hover:bg-[#50a3d9]
              text-white
              py-2 sm:py-3
              px-4 sm:px-6
              rounded-md
              font-semibold
              transition-colors
              duration-200
              text-sm sm:text-base
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            Reserve Now
          </button>
        </div>
      </form>
    </div>
  );
}
